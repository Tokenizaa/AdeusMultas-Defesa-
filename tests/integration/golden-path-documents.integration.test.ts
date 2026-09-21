/**
 * @file golden-path-documents.integration.test.ts
 * Golden Path E2E (FASE 19) — API-level contra o Supabase CANÔNICO.
 *
 * Fluxo: auth real (signIn) → cria caso via POST /api/cases (persiste em
 * public.cases, RLS FASE 18) → análise (RagPipeline determinístico) →
 * upload de documento (storage case-documents + public.documents) →
 * list → download (URL assinada) → isolamento (outro usuário 403) → delete.
 *
 * Limpeza total ao final: usuário temp, caso, documento e objeto apagados
 * (nenhum dado fake persistido no canônico).
 *
 * Requer: .env com SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY do canônico
 * llmxnpgjpxcvyrqjkfwb (gitignored; não commitado).
 */
import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'http';
import { createApp } from '../../src/server/app';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function requiredEnv(name: string, value: string) {
  if (!value) throw new Error(`${name} ausente — teste requer Supabase canônico configurado (não commitado).`);
  return value;
}

const skip = !SUPABASE_URL || !SERVICE_ROLE;

describe.skipIf(skip)('Golden Path FASE 19 (canônico)', () => {
  let server: Server;
  let baseUrl: string;
  let adminClient: ReturnType<typeof createClient>;
  let testUser: { id: string; email: string; password: string } | null = null;
  let citizenToken: string | null = null;
  let createdCaseId: string | null = null;
  let otherUser: { id: string; email: string; password: string } | null = null;
  let otherToken: string | null = null;

  const url = requiredEnv('SUPABASE_URL', SUPABASE_URL);
  const serviceRole = requiredEnv('SUPABASE_SERVICE_ROLE_KEY', SERVICE_ROLE);

  async function api(path: string, token: string | null, init: RequestInit = {}) {
    const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (init.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${baseUrl}${path}`, { ...init, headers });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* empty body */
    }
    return { status: res.status, body };
  }

  async function cleanupUser(userId: string) {
    try {
      await adminClient.auth.admin.deleteUser(userId);
    } catch {
      /* best effort */
    }
  }

  beforeAll(async () => {
    adminClient = createClient(url, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } });

    const appServer = createApp();
    await new Promise<void>((resolve) => {
      server = appServer.listen(0, () => resolve());
    });
    const address = server.address();
    baseUrl = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;

    // Usuário temp 1 (dono do caso) — email confirmado via admin API.
    const suffix = Date.now().toString(36);
    const email = `fase19-golden-${suffix}@example.com`;
    const password = `Fase19#${suffix}A!`;
    const { data: created, error: signupError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'citizen' },
    });
    if (signupError || !created.user) throw new Error(`createUser falhou: ${signupError?.message}`);
    testUser = { id: created.user.id, email, password };

    const { data: session, error: loginError } = await adminClient.auth.signInWithPassword({ email, password });
    if (loginError || !session.session) throw new Error(`signIn falhou: ${loginError?.message}`);
    citizenToken = session.session.access_token;

    // Usuário temp 2 (isolamento: NÃO pode acessar o caso do user 1).
    const email2 = `fase19-other-${suffix}@example.com`;
    const { data: created2 } = await adminClient.auth.admin.createUser({
      email: email2,
      password: `Fase19#${suffix}B!`,
      email_confirm: true,
      user_metadata: { role: 'citizen' },
    });
    if (created2.user) {
      otherUser = { id: created2.user.id, email: email2, password: `Fase19#${suffix}B!` };
      const { data: s2 } = await adminClient.auth.signInWithPassword({ email: email2, password: otherUser.password });
      if (s2.session) otherToken = s2.session.access_token;
    }
  }, 60000);

  afterAll(async () => {
    // Limpeza: documento/objeto já removidos no teste; remove caso + usuários.
    if (createdCaseId && adminClient) {
      await adminClient.from('documents').delete().eq('case_id', createdCaseId);
      await adminClient.from('cases').delete().eq('id', createdCaseId);
    }
    if (testUser) await cleanupUser(testUser.id);
    if (otherUser) await cleanupUser(otherUser.id);
    await new Promise<void>((resolve) => server?.close(() => resolve()));
  }, 30000);

  it('cria caso autenticado, persiste no Supabase e gera análise determinística', async () => {
    const payload = {
      title: 'FASE 19 Golden Path — caso de teste com rollback',
      clientName: 'Cliente Golden Path',
      clientEmail: testUser!.email,
      serviceType: 'defesa_previa',
      status: 'em_analise',
      currentStage: 1,
      isPaid: false,
      isAnonymous: false,
      vehicle: {
        plate: 'GP19000',
        brandModel: 'Teste/GP19',
        renavam: '99999999999',
        year: '2020',
        color: 'PRETO',
      },
      infraction: {
        aitNumber: `GP19-${Date.now().toString().slice(-6)}`,
        infractionCode: '74560',
        description: 'Excesso de velocidade',
        ctbArticle: '218',
        severity: 'media',
        points: 4,
        fineAmount: 130.16,
        autuadorBody: 'DETRAN-SP',
      },
      timeline: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any;

    const { status, body } = await api('/api/cases', citizenToken!, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    expect(status).toBe(201);
    const caseDomain = body as any;
    expect(caseDomain.id).toBeTruthy();
    expect(caseDomain.userId).toBe(testUser!.id);
    // Análise determinística gerada server-side (RagPipeline.analyzeInfraction).
    expect(Array.isArray(caseDomain.analysis?.recommendedArguments)).toBe(true);
    createdCaseId = caseDomain.id;
  }, 60000);

  it('upload documento em case-documents + registro em public.documents', async () => {
    const fileContent = Buffer.from(`%PDF-1.4\nEvidência Golden Path ${Date.now()}\n%%EOF`).toString('base64');
    const { status, body } = await api(`/api/cases/${createdCaseId}/documents`, citizenToken!, {
      method: 'POST',
      body: JSON.stringify({
        fileName: 'evidencia-multa.pdf',
        contentType: 'application/pdf',
        content: fileContent,
      }),
    });
    expect(status).toBe(201);
    const doc = (body as any).document;
    // Path = <case_id uuid real>/<arquivo> (convenção RLS FASE 18).
    expect(doc.storage_path).toBe(`${doc.case_id}/evidencia-multa.pdf`);
    expect(doc.status).toBe('uploaded');
    expect(doc.size_bytes).toBeGreaterThan(0);
    expect(doc.content_hash).toMatch(/^[0-9a-f]{64}$/);
  }, 60000);

  it('lista documentos do próprio caso', async () => {
    const { status, body } = await api(`/api/cases/${createdCaseId}/documents`, citizenToken!);
    expect(status).toBe(200);
    expect((body as any).documents.length).toBeGreaterThanOrEqual(1);
  });

  it('gera URL assinada para download', async () => {
    const { body } = await api(`/api/cases/${createdCaseId}/documents`, citizenToken!);
    const docId = (body as any).documents[0].id as string;
    const { status, body: dl } = await api(`/api/cases/${createdCaseId}/documents/${docId}/download`, citizenToken!);
    expect(status).toBe(200);
    expect((dl as any).signedUrl).toMatch(/^https:\/\//);
  });

  it('isola documento: outro usuário recebe 403 (RLS + guard server-side)', async () => {
    const { body } = await api(`/api/cases/${createdCaseId}/documents`, citizenToken!);
    const docId = (body as any).documents[0].id as string;
    const { status } = await api(`/api/cases/${createdCaseId}/documents`, otherToken!);
    expect(status).toBe(403);
    const { status: dlStatus } = await api(`/api/cases/${createdCaseId}/documents/${docId}/download`, otherToken!);
    expect(dlStatus).toBe(403);
    const { status: delStatus } = await api(`/api/cases/${createdCaseId}/documents/${docId}`, otherToken!, { method: 'DELETE' });
    expect(delStatus).toBe(403);
  });

  it('remove documento (objeto + registro) pelo dono', async () => {
    const { body } = await api(`/api/cases/${createdCaseId}/documents`, citizenToken!);
    const docId = (body as any).documents[0].id as string;
    const { status } = await api(`/api/cases/${createdCaseId}/documents/${docId}`, citizenToken!, { method: 'DELETE' });
    expect(status).toBe(200);
    const { body: after } = await api(`/api/cases/${createdCaseId}/documents`, citizenToken!);
    expect((after as any).documents).toHaveLength(0);
    // Objeto removido do storage (fora do alcance RLS de leitura pública).
    const { data: objs } = await adminClient.storage.from('case-documents').list(createdCaseId!, { limit: 100 });
    expect(objs).toHaveLength(0);
  }, 60000);
});