/**
 * Fase 2 — P0 IDOR / Isolamento de casos.
 *
 * Autorização central em src/server/routes/cases.ts:
 * - usuário autenticado só acessa casos próprios (user_id === req.user.id/email);
 * - caso sem user_id é inacessível a não-admins (FAIL CLOSED);
 * - admin tem acesso total;
 * - nenhuma autorização depende de headers controlados pelo cliente (x-user-*);
 * - PUT preserva dono; POST ignora userId do body; claim exige claim_token.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

// ─── mocks (hoisted para interceptar imports do módulo em teste) ───
const db = vi.hoisted(() => new Map());
const getClientMock = vi.hoisted(() => vi.fn());
const getUserMock = vi.hoisted(() => vi.fn());
const analyzeMock = vi.hoisted(() => vi.fn(() => ({})));
const generateDraftMock = vi.hoisted(() => vi.fn(() => ({ selectedArgumentIds: [] })));
const runPipelineMock = vi.hoisted(() =>
  vi.fn(async () => ({
    draft: { fullDraftText: 'minuta gerada' },
    controlled: { reason: 'PROVIDER_UNAVAILABLE' },
  }))
);
const permittedThesesMock = vi.hoisted(() => vi.fn(() => []));

vi.mock('@/server/app', () => ({
  databaseRows: db,
  auditLogs: [],
}));

vi.mock('@/server/db/supabase-server', () => ({
  getSupabaseServerClient: (...args: unknown[]) => getClientMock(...args),
}));

vi.mock('@/server/observability/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/core/rag/rag-pipeline', () => ({
  RagPipeline: {
    analyzeInfraction: analyzeMock,
    generateDefenseDraft: generateDraftMock,
  },
}));

vi.mock('@/core/ai/ai-orchestrator', () => ({
  registerRefinementProvider: vi.fn(),
  runControlledPipeline: runPipelineMock,
  permittedTheses: permittedThesesMock,
}));

vi.mock('@/server/gemini', () => ({
  enrichDefenseWithGemini: async (x: unknown) => x,
}));

// ─── imports reais após mocks ───
import { authenticateToken } from '@/server/middleware/auth-middleware';
import casesRouter from '@/server/routes/cases';

const USER_A = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  email: 'a@example.com',
  user_metadata: { role: 'citizen', name: 'Usuário A' },
};
const USER_B = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  email: 'b@example.com',
  user_metadata: { role: 'citizen', name: 'Usuário B' },
};
const USER_ADMIN = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  email: 'admin@example.com',
  user_metadata: { role: 'admin', name: 'Admin' },
};

const TOKEN: Record<string, unknown> = {
  TOKEN_A: USER_A,
  TOKEN_B: USER_B,
  TOKEN_ADMIN: USER_ADMIN,
};

function makeRes() {
  const res: any = { statusCode: 0, body: null, _json: null };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body: unknown) => {
    if (res.statusCode === 0) res.statusCode = 200; // json sem status explícito = 200
    res.body = body;
    res._json = body;
    return res;
  };
  return res as Response;
}

const noopNext = (() => undefined) as NextFunction;

// Extrai o handler final de uma rota do Router (express 4)
// route.stack = [authenticateToken, handler, ...] — pegamos o ÚLTIMO.
function routeHandler(method: 'get' | 'put' | 'post', path: string): Function {
  const stack: any[] = (casesRouter as any).stack;
  const layer = stack.find((l) => l.route && l.route.path === path && l.route.methods[method]);
  if (!layer) throw new Error(`rota não encontrada: ${method.toUpperCase()} ${path}`);
  const handlers = layer.route.stack;
  return handlers[handlers.length - 1].handle;
}

function makeReq(overrides: Record<string, unknown> = {}): Request {
  const req: any = {
    headers: {},
    body: {},
    params: {},
    query: {},
    ...overrides,
  };
  return req as Request;
}

function row(id: string, userId?: string, claimToken?: string) {
  return {
    id,
    title: `Caso ${id}`,
    client_name: 'Condutor Teste',
    status: 'novo',
    current_stage: 1,
    service_type: 'recurso_jari',
    vehicle_plate: 'ABC-1I23',
    vehicle_brand_model: 'Teste',
    ait_number: 'AIT1',
    infraction_code: '745',
    infraction_description: 'Excesso de velocidade',
    ctb_article: '218',
    severity: 'grave',
    points: 5,
    fine_amount: 130,
    autuador_body: 'PRF',
    date_time: new Date().toISOString(),
    location: 'BR-101',
    is_anonymous: !userId,
    claim_token: claimToken,
    is_paid: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: userId,
  };
}

const getHandler = routeHandler('get', '/cases/:id');
const putHandler = routeHandler('put', '/cases/:id');
const postHandler = routeHandler('post', '/cases');
const claimHandler = routeHandler('post', '/cases/:id/claim');
const generateDefenseHandler = routeHandler('post', '/cases/:id/generate-defense');

async function authenticate(req: Request, tokenKey: string | null) {
  getUserMock.mockImplementation((token: string) => {
    const user = TOKEN[token];
    if (user) return { data: { user }, error: null };
    return { data: { user: null }, error: { message: 'invalid token' } };
  });
  getClientMock.mockReturnValue({ auth: { getUser: getUserMock } });

  if (tokenKey) {
    req.headers = { ...req.headers, authorization: `Bearer ${tokenKey}` };
  }
  await authenticateToken(req, makeRes(), noopNext);
}

describe('Fase 2 — autorização de casos (produção)', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ADMIN_TEST_LOGIN', '');
    db.clear();
    getUserMock.mockReset();
    analyzeMock.mockClear();
    generateDraftMock.mockClear();
    runPipelineMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('A. usuário A consegue GET do próprio caso', async () => {
    db.set('case_a', row('case_a', USER_A.id));
    const req = makeReq({ params: { id: 'case_a' } });
    await authenticate(req, 'TOKEN_A');

    const res = makeRes();
    await getHandler(req, res, noopNext);

    expect(res.statusCode).toBe(200);
    expect((res.body as any).id).toBe('case_a');
  });

  it('B. usuário A recebe 403 no GET do caso de B', async () => {
    db.set('case_b', row('case_b', USER_B.id));
    const req = makeReq({ params: { id: 'case_b' } });
    await authenticate(req, 'TOKEN_A');

    const res = makeRes();
    await getHandler(req, res, noopNext);

    expect(res.statusCode).toBe(403);
  });

  it('C. usuário A não consegue PUT no caso de B', async () => {
    db.set('case_b', row('case_b', USER_B.id));
    const req = makeReq({ params: { id: 'case_b' }, body: { title: 'hack' } });
    await authenticate(req, 'TOKEN_A');

    const res = makeRes();
    await putHandler(req, res, noopNext);

    expect(res.statusCode).toBe(403);
    expect(db.get('case_b').title).toBe('Caso case_b'); // sem alteração
  });

  it('D. usuário A não consegue generate-defense no caso de B (sem processamento)', async () => {
    db.set('case_b', row('case_b', USER_B.id));
    const req = makeReq({
      params: { id: 'case_b' },
      body: {
        procedureType: 'recurso_jari',
        selectedArgumentIds: [],
        applicantData: {
          name: 'X', cpf: '000', cnh: '111',
          address: 'Rua X', cityState: 'SP',
        },
      },
    });
    await authenticate(req, 'TOKEN_A');

    const res = makeRes();
    await generateDefenseHandler(req, res, noopNext);

    expect(res.statusCode).toBe(403);
    expect(generateDraftMock).not.toHaveBeenCalled(); // nada de RAG/IA
    expect(runPipelineMock).not.toHaveBeenCalled();
  });

  it('E. usuário A não altera userId do próprio caso enviando userId de B', async () => {
    db.set('case_a', row('case_a', USER_A.id));
    const req = makeReq({
      params: { id: 'case_a' },
      body: { title: 'Atualizado', userId: USER_B.id, user_id: USER_B.id },
    });
    await authenticate(req, 'TOKEN_A');

    const res = makeRes();
    await putHandler(req, res, noopNext);

    expect(res.statusCode).toBe(200);
    expect(db.get('case_a').user_id).toBe(USER_A.id); // dono preservado
    expect(db.get('case_a').title).toBe('Atualizado');
  });

  it('F. usuário A criando caso não consegue definir userId de B', async () => {
    const req = makeReq({
      body: { id: 'case_new', title: 'Novo', userId: USER_B.id, user_id: USER_B.id },
    });
    await authenticate(req, 'TOKEN_A');

    const res = makeRes();
    await postHandler(req, res, noopNext);

    expect(res.statusCode).toBe(201);
    const created = db.get('case_new');
    expect(created).toBeDefined();
    expect(created.user_id).toBe(USER_A.id); // dono derivado de req.user
  });

  it('F2. criação anônima (sem auth) não aceita userId do body', async () => {
    const req = makeReq({ body: { id: 'case_anon', title: 'Anon', userId: USER_B.id } });
    await authenticate(req, null);

    const res = makeRes();
    await postHandler(req, res, noopNext);

    expect(res.statusCode).toBe(201);
    const created = db.get('case_anon');
    expect(created).toBeDefined();
    expect(created.user_id).toBeUndefined(); // identidade do body ignorada
  });

  it('G. claim arbitrário do caso anônimo sem claim token → 403; com token válido → OK', async () => {
    db.set('case_anon', row('case_anon', undefined, 'tok_secreto'));

    // Sem token de claim
    const req1 = makeReq({ params: { id: 'case_anon' }, body: { name: 'A' } });
    await authenticate(req1, 'TOKEN_A');
    const res1 = makeRes();
    await claimHandler(req1, res1, noopNext);
    expect(res1.statusCode).toBe(403);

    // Com token de claim válido
    const req2 = makeReq({
      params: { id: 'case_anon' },
      body: { name: 'A', claimToken: 'tok_secreto' },
    });
    await authenticate(req2, 'TOKEN_A');
    const res2 = makeRes();
    await claimHandler(req2, res2, noopNext);

    expect(res2.statusCode).toBe(200);
    expect(db.get('case_anon').user_id).toBe(USER_A.id);
    expect(db.get('case_anon').is_anonymous).toBe(false);
  });

  it('G2. claim não autenticado → 401', async () => {
    db.set('case_anon', row('case_anon', undefined, 'tok_secreto'));
    const req = makeReq({ params: { id: 'case_anon' }, body: { claimToken: 'tok_secreto' } });
    await authenticate(req, null);

    const res = makeRes();
    await claimHandler(req, res, noopNext);

    expect(res.statusCode).toBe(401);
  });

  it('G3. claim de caso já vinculado a outro usuário → 403', async () => {
    db.set('case_b', row('case_b', USER_B.id));
    const req = makeReq({ params: { id: 'case_b' }, body: { claimToken: 'qualquer' } });
    await authenticate(req, 'TOKEN_A');

    const res = makeRes();
    await claimHandler(req, res, noopNext);

    expect(res.statusCode).toBe(403);
  });

  it('H. admin consegue acessar caso de outro usuário (GET e PUT)', async () => {
    db.set('case_b', row('case_b', USER_B.id));

    const reqGet = makeReq({ params: { id: 'case_b' } });
    await authenticate(reqGet, 'TOKEN_ADMIN');
    const resGet = makeRes();
    await getHandler(reqGet, resGet, noopNext);
    expect(resGet.statusCode).toBe(200);

    const reqPut = makeReq({ params: { id: 'case_b' }, body: { title: 'admin editou' } });
    await authenticate(reqPut, 'TOKEN_ADMIN');
    const resPut = makeRes();
    await putHandler(reqPut, resPut, noopNext);
    expect(resPut.statusCode).toBe(200);
    expect(db.get('case_b').title).toBe('admin editou');
  });

  it('H2. admin consegue generate-defense em caso de outro usuário', async () => {
    db.set('case_b', row('case_b', USER_B.id));
    const req = makeReq({
      params: { id: 'case_b' },
      body: {
        procedureType: 'recurso_jari',
        selectedArgumentIds: [],
        applicantData: {
          name: 'X', cpf: '000', cnh: '111',
          address: 'Rua X', cityState: 'SP',
        },
      },
    });
    await authenticate(req, 'TOKEN_ADMIN');

    const res = makeRes();
    await generateDefenseHandler(req, res, noopNext);

    expect(res.statusCode).toBe(200);
    expect(generateDraftMock).toHaveBeenCalled();
  });

  it('I. caso sem user_id não fica acessível a usuário normal (FAIL CLOSED)', async () => {
    db.set('case_semdono', row('case_semdono', undefined));
    const req = makeReq({ params: { id: 'case_semdono' } });
    await authenticate(req, 'TOKEN_A');

    const res = makeRes();
    await getHandler(req, res, noopNext);

    expect(res.statusCode).toBe(403);
  });

  it('J. nenhuma autorização depende de headers x-user-* (cliente não forja admin)', async () => {
    db.set('case_b', row('case_b', USER_B.id));
    // Cidadão autenticado + header x-user-role: admin → ainda 403 no caso de B
    const req = makeReq({
      params: { id: 'case_b' },
      headers: { 'x-user-id': USER_B.id, 'x-user-role': 'admin', 'x-user-email': USER_B.email },
    });
    await authenticate(req, 'TOKEN_A');

    const res = makeRes();
    await getHandler(req, res, noopNext);
    expect(res.statusCode).toBe(403);
  });

  it('J2. headers x-user-* sozinhos (sem Bearer) não autenticam em produção', async () => {
    db.set('case_b', row('case_b', USER_B.id));
    const req = makeReq({
      params: { id: 'case_b' },
      headers: { 'x-user-id': USER_B.id, 'x-user-role': 'admin' },
    });
    await authenticate(req, null);

    expect(req.user).toBeUndefined();

    const res = makeRes();
    await getHandler(req, res, noopNext);
    expect(res.statusCode).toBe(401);
  });

  it('404 para caso inexistente (GET / cases/:id)', async () => {
    const req = makeReq({ params: { id: 'nao_existe' } });
    await authenticate(req, 'TOKEN_A');

    const res = makeRes();
    await getHandler(req, res, noopNext);

    expect(res.statusCode).toBe(404);
  });

  it('GET /cases: cidadão vê somente casos próprios; visitante sem claimToken vê nada', async () => {
    db.set('case_a', row('case_a', USER_A.id));
    db.set('case_b', row('case_b', USER_B.id));

    const listHandler = routeHandler('get', '/cases');

    const reqA = makeReq({});
    await authenticate(reqA, 'TOKEN_A');
    const resA = makeRes();
    await listHandler(reqA, resA, noopNext);
    const idsA = (resA.body as any[]).map((c) => c.id);
    expect(idsA).toEqual(['case_a']);

    const reqAnon = makeReq({});
    await authenticate(reqAnon, null);
    const resAnon = makeRes();
    await listHandler(reqAnon, resAnon, noopNext);
    expect(resAnon.body).toEqual([]);

    // Visitante com claimToken legítimo recupera o próprio caso anônimo
    db.set('case_anon', row('case_anon', undefined, 'tok_ok'));
    const reqTok = makeReq({ query: { claimToken: 'tok_ok' } });
    await authenticate(reqTok, null);
    const resTok = makeRes();
    await listHandler(reqTok, resTok, noopNext);
    expect((resTok.body as any[]).map((c) => c.id)).toEqual(['case_anon']);
  });
});