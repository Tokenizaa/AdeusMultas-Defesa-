import { Hono } from 'hono';
import type { Env } from '../supabase';
import { createSupabaseAdminClient } from '../supabase';
import { authenticateToken, type AuthenticatedUser } from '../middleware';
import { rowToDomain } from '../canonical-mapper';

const BUCKET = 'case-documents';
const MAX_PDF_BYTES = 10 * 1024 * 1024;

function pdfEscape(value: string): string {
  const ascii = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[—–]/g, '-').replace(/[^\x20-\x7E\n\r]/g, '?');
  return ascii.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrap(text: string, max = 92): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    if (!paragraph.trim()) { lines.push(''); continue; }
    const words = paragraph.trim().split(/\s+/);
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > max && line) { lines.push(line); line = word; } else line = next;
    }
    if (line) lines.push(line);
  }
  return lines;
}

function buildPdf(title: string, body: string): Uint8Array {
  const lines = wrap(body);
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += 48) pages.push(lines.slice(i, i + 48));
  if (!pages.length) pages.push([]);
  const objects: string[] = [];
  const add = (value: string) => { objects.push(value); return objects.length; };
  const catalogId = add('');
  const pagesId = add('');
  const fontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageIds: number[] = [];
  for (const pageLines of pages) {
    const content = ['BT','/F1 16 Tf','50 770 Td',`(${pdfEscape(title)}) Tj`,'/F1 10 Tf','0 -24 Td',...pageLines.map((line) => `(${pdfEscape(line)}) Tj 0 -14 Td`),'ET'].join('\n');
    const contentId = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`));
  }
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

function canAccess(user: AuthenticatedUser, row: any): boolean {
  return user.role === 'admin' || row?.user_id === user.id;
}

export const documentsRoutes = new Hono<{ Bindings: Env; Variables: { user?: AuthenticatedUser } }>();

documentsRoutes.post('/documents/:caseId/generate', authenticateToken, async (c) => {
  const user = c.get('user')!;
  const caseId = c.req.param('caseId');
  const supabase = createSupabaseAdminClient(c.env);
  const { data: caseRow, error: caseError } = await supabase.from('cases').select('*').eq('id', caseId).maybeSingle();
  if (caseError) return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: caseError.message } }, 500);
  if (!caseRow) return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Caso não encontrado' } }, 404);
  if (!canAccess(user, caseRow)) return c.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Você não tem permissão para este caso' } }, 403);
  if (!caseRow.is_paid) return c.json({ ok: false, error: { code: 'CONFLICT', message: 'O pagamento do caso ainda não foi confirmado' } }, 409);
  const domain = rowToDomain(caseRow) as any;
  const draft = domain.defenseDraft as any;
  if (!draft?.fullDraftText) return c.json({ ok: false, error: { code: 'CONFLICT', message: 'A defesa ainda não foi gerada' } }, 409);

  const title = `Adeus Multa — ${domain.serviceType || 'Defesa de trânsito'}`;
  const pdf = buildPdf(title, draft.fullDraftText);
  if (pdf.byteLength > MAX_PDF_BYTES) return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Documento excede o limite de armazenamento' } }, 500);
  const hashBuffer = await crypto.subtle.digest('SHA-256', pdf);
  const contentHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
  const storagePath = `${caseId}/${contentHash}.pdf`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, pdf, { contentType: 'application/pdf', upsert: true });
  if (uploadError) return c.json({ ok: false, error: { code: 'UPSTREAM_ERROR', message: `Falha ao armazenar PDF: ${uploadError.message}` } }, 502);

  const { data: payment } = await supabase.from('payment_orders').select('id').eq('case_id', caseId).eq('status', 'PAID').maybeSingle();
  const now = new Date().toISOString();
  const { data: existing } = await supabase.from('documents').select('id').eq('case_id', caseId).maybeSingle();
  let documentId: string;
  const payload = { order_id: payment?.id ?? null, service_type: domain.serviceType || 'recurso_jari', status: 'uploaded', storage_path: storagePath, mime_type: 'application/pdf', size_bytes: pdf.byteLength, content_hash: contentHash, generated_at: now };
  if (existing?.id) {
    documentId = existing.id;
    const { error } = await supabase.from('documents').update(payload).eq('id', documentId);
    if (error) return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: error.message } }, 500);
  } else {
    const { data, error } = await supabase.from('documents').insert({ case_id: caseId, ...payload }).select('id').single();
    if (error) return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: error.message } }, 500);
    documentId = data.id;
  }

  await supabase.from('cases').update({ status: 'defesa_pronta', updated_at: now }).eq('id', caseId);
  await supabase.from('platform_events').insert({ event_type: 'case.document.generated', aggregate_type: 'case', aggregate_id: caseId, user_id: caseRow.user_id, payload: { documentId, storagePath, contentHash, sizeBytes: pdf.byteLength } });
  const { data: signed, error: signedError } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600);
  if (signedError) return c.json({ ok: false, error: { code: 'UPSTREAM_ERROR', message: signedError.message } }, 502);
  return c.json({ ok: true, document: { id: documentId, caseId, status: 'uploaded', storagePath, mimeType: 'application/pdf', sizeBytes: pdf.byteLength, contentHash, generatedAt: now, downloadUrl: signed.signedUrl } }, 201);
});

documentsRoutes.get('/documents/:id', authenticateToken, async (c) => {
  const user = c.get('user')!;
  const supabase = createSupabaseAdminClient(c.env);
  const { data: document, error } = await supabase.from('documents').select('*').eq('id', c.req.param('id')).maybeSingle();
  if (error) return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: error.message } }, 500);
  if (!document) return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Documento não encontrado' } }, 404);
  const { data: caseRow } = await supabase.from('cases').select('user_id').eq('id', document.case_id).maybeSingle();
  if (!caseRow || !canAccess(user, caseRow)) return c.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Você não tem permissão para este documento' } }, 403);
  if (!document.storage_path) return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Arquivo não encontrado' } }, 404);
  const { data: signed, error: signedError } = await supabase.storage.from(BUCKET).createSignedUrl(document.storage_path, 3600);
  if (signedError) return c.json({ ok: false, error: { code: 'UPSTREAM_ERROR', message: signedError.message } }, 502);
  return c.json({ ok: true, document: { ...document, downloadUrl: signed.signedUrl } });
});
