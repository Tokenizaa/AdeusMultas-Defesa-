/**
 * @file documents.ts
 * Case Documents — Golden Path FASE 19.
 *
 * Persistência de documentos de um caso no bucket privado `case-documents`
 * (convenção de path `case-documents/<case_id>/<arquivo>`, policies RLS FASE 18:
 * read/insert own por cadeia case→user + admin all) com registro em
 * `public.documents` (storage_path/mime_type/size_bytes/content_hash).
 *
 * Server-side exclusivamente (service_role) — NENHUM service_role no frontend.
 * Ownership revalidada no servidor (mesmo padrão de defense.ts).
 */
import { Router, Response } from 'express';
import crypto from 'crypto';
import path from 'path';
import { getSupabaseServerClient } from '../db/supabase-server';
import { authenticateToken, AuthenticatedUser } from '../middleware/auth-middleware';
import { logger } from '../observability/logger';

const router = Router();
const BUCKET = 'case-documents';

function denyCaseAccess(user: AuthenticatedUser | undefined, res: Response): boolean {
  if (!user) {
    res.status(401).json({ error: 'Não autenticado' });
    return true;
  }
  res.status(403).json({ error: 'Você não tem permissão para acessar este caso' });
  return true;
}

/** Resolve caso por app_ref (formato legado `case_*`) ou id uuid real. */
async function findCaseByRef(caseRef: string): Promise<{ id: string; user_id: string | null; service_type: string | null } | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  const { data: byRef } = await supabase
    .from('cases')
    .select('id, user_id, service_type')
    .eq('app_ref', caseRef)
    .maybeSingle();
  if (byRef) return byRef;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(caseRef)) {
    const { data: byId } = await supabase
      .from('cases')
      .select('id, user_id, service_type')
      .eq('id', caseRef)
      .maybeSingle();
    if (byId) return byId;
  }
  return null;
}

function safeFileName(name: string): string | null {
  const base = path.basename(name || '').replace(/[^\w.\-]+/g, '_');
  if (!base || base.length > 120) return null;
  return base;
}

/** Lista documentos do caso (ownership já checada pelo caller). */
router.get('/cases/:caseId/documents', authenticateToken, async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) return res.status(500).json({ error: 'Supabase não configurado no servidor' });
    const caseRow = await findCaseByRef(req.params.caseId);
    if (!caseRow) return res.status(404).json({ error: 'Caso não encontrado' });
    if (req.user?.role !== 'admin' && caseRow.user_id !== req.user?.id) {
      return denyCaseAccess(req.user, res);
    }
    const { data, error } = await supabase
      .from('documents')
      .select('id, case_id, service_type, status, storage_path, mime_type, size_bytes, content_hash, created_at, generated_at')
      .eq('case_id', caseRow.id)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ documents: data });
  } catch (err: any) {
    logger.error('system', 'documents_list_failed', 'documents_list_failed', err.message, { caseId: req.params.caseId });
    res.status(500).json({ error: err.message || 'Erro ao listar documentos' });
  }
});

/** Upload de documento para o caso (JSON: fileName + base64 content). */
router.post('/cases/:caseId/documents', authenticateToken, async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) return res.status(500).json({ error: 'Supabase não configurado no servidor' });
    const caseRow = await findCaseByRef(req.params.caseId);
    if (!caseRow) return res.status(404).json({ error: 'Caso não encontrado' });
    if (req.user?.role !== 'admin' && caseRow.user_id !== req.user?.id) {
      return denyCaseAccess(req.user, res);
    }

    const fileName = safeFileName(typeof req.body?.fileName === 'string' ? req.body.fileName : '');
    const contentBase64 = typeof req.body?.content === 'string' ? req.body.content : '';
    const mimeType = typeof req.body?.contentType === 'string' && req.body.contentType.length <= 100 ? req.body.contentType : 'application/octet-stream';
    if (!fileName) return res.status(400).json({ error: 'fileName inválido' });
    if (!contentBase64) return res.status(400).json({ error: 'content ausente (base64)' });

    let buffer: Buffer;
    try {
      buffer = Buffer.from(contentBase64, 'base64');
    } catch {
      return res.status(400).json({ error: 'content base64 inválido' });
    }
    if (buffer.length === 0) return res.status(400).json({ error: 'content vazio' });
    if (buffer.length > 8 * 1024 * 1024) return res.status(413).json({ error: 'arquivo excede 8MB' });

    const objectPath = `${caseRow.id}/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, buffer, { contentType: mimeType, upsert: false });
    if (uploadError) {
      return res.status(500).json({ error: `Falha no upload: ${uploadError.message}` });
    }

    const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const { data: doc, error: insertError } = await supabase
      .from('documents')
      .insert({
        case_id: caseRow.id,
        service_type: caseRow.service_type || 'defesa',
        status: 'uploaded',
        storage_path: objectPath,
        mime_type: mimeType,
        size_bytes: buffer.length,
        content_hash: contentHash,
      })
      .select('id, case_id, service_type, status, storage_path, mime_type, size_bytes, content_hash, created_at, generated_at')
      .single();
    if (insertError) {
      // Rollback do objeto se o registro falhar (anti-sujo).
      await supabase.storage.from(BUCKET).remove([objectPath]);
      return res.status(500).json({ error: `Falha ao registrar documento: ${insertError.message}` });
    }

    logger.info('system', 'document_uploaded', 'document_uploaded', `Documento ${fileName} enviado para o caso ${caseRow.id}.`, {
      caseId: caseRow.id,
      storage_path: objectPath,
      size_bytes: buffer.length,
    });

    res.status(201).json({ document: doc });
  } catch (err: any) {
    logger.error('system', 'document_upload_failed', 'document_upload_failed', err.message, { caseId: req.params.caseId });
    res.status(500).json({ error: err.message || 'Erro ao enviar documento' });
  }
});

/** Gera URL assinada (download) — server-side, sem expor service_role. */
router.get('/cases/:caseId/documents/:documentId/download', authenticateToken, async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) return res.status(500).json({ error: 'Supabase não configurado no servidor' });
    const { data: doc } = await supabase
      .from('documents')
      .select('id, case_id, storage_path, mime_type')
      .eq('id', req.params.documentId)
      .maybeSingle();
    if (!doc || !doc.storage_path) return res.status(404).json({ error: 'Documento não encontrado' });
    if (req.user?.role !== 'admin') {
      const { data: caseRow } = await supabase.from('cases').select('user_id').eq('id', doc.case_id).maybeSingle();
      if (!caseRow || caseRow.user_id !== req.user?.id) return denyCaseAccess(req.user, res);
    }
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.storage_path, 3600);
    if (error || !data?.signedUrl) return res.status(500).json({ error: error?.message || 'Falha ao gerar URL assinada' });
    res.json({ signedUrl: data.signedUrl, fileName: path.basename(doc.storage_path), mimeType: doc.mime_type });
  } catch (err: any) {
    logger.error('system', 'document_download_failed', 'document_download_failed', err.message, { documentId: req.params.documentId });
    res.status(500).json({ error: err.message || 'Erro ao gerar download' });
  }
});

/** Remove documento (objeto + registro). Dono ou admin. */
router.delete('/cases/:caseId/documents/:documentId', authenticateToken, async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) return res.status(500).json({ error: 'Supabase não configurado no servidor' });
    const { data: doc } = await supabase
      .from('documents')
      .select('id, case_id, storage_path')
      .eq('id', req.params.documentId)
      .maybeSingle();
    if (!doc) return res.status(404).json({ error: 'Documento não encontrado' });
    if (req.user?.role !== 'admin') {
      const { data: caseRow } = await supabase.from('cases').select('user_id').eq('id', doc.case_id).maybeSingle();
      if (!caseRow || caseRow.user_id !== req.user?.id) return denyCaseAccess(req.user, res);
    }
    if (doc.storage_path) await supabase.storage.from(BUCKET).remove([doc.storage_path]);
    const { error } = await supabase.from('documents').delete().eq('id', doc.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err: any) {
    logger.error('system', 'document_delete_failed', 'document_delete_failed', err.message, { documentId: req.params.documentId });
    res.status(500).json({ error: err.message || 'Erro ao remover documento' });
  }
});

export default router;