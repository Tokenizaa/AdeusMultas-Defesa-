/**
 * Fase 3 — P0: Controle de Autoridade Jurídica e Teses.
 *
 * O servidor deve ser a única autoridade sobre quais teses/procedimentos entram na defesa.
 * selectedArgumentIds / procedureType / analysis do body NÃO controlam a fundamentação.
 * A fonte autoritativa é domain.analysis.recommendedArguments / recommendedProcedure.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

// ─── mocks (hoisted) ───
const db = vi.hoisted(() => new Map());
const getClientMock = vi.hoisted(() => vi.fn());
const getUserMock = vi.hoisted(() => vi.fn());
const analyzeMock = vi.hoisted(() => vi.fn(() => ({})));
const generateDraftMock = vi.hoisted(() =>
  vi.fn((...args: unknown[]) => {
    // args: caseId, infraction, plate, model, applicant, selectedArguments, procedureType
    const selectedArguments = args[5] as Array<{ id: string }>;
    return {
      selectedArgumentIds: selectedArguments.map((a) => a.id),
      fullDraftText: `Minuta com ${selectedArguments.length} teses: ${selectedArguments.map((a) => a.id).join(', ')}`,
      protocolInfo: { orgao: 'JARI' },
    };
  })
);
const runPipelineMock = vi.hoisted(() =>
  vi.fn(async (input: any) => ({
    draft: {
      ...input.draft,
      fullDraftText: input.draft.fullDraftText,
      selectedArgumentIds: (input.analysis.recommendedArguments || []).map((a: any) => a.id),
    },
    controlled: { reason: 'PROVIDER_UNAVAILABLE' },
    validationReport: { valid: true, issues: [] },
  }))
);
const permittedThesesMock = vi.hoisted(() => vi.fn((analysis: any) => analysis?.recommendedArguments || []));

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

// ─── imports após mocks ───
import { authenticateToken } from '@/server/middleware/auth-middleware';
import casesRouter from '@/server/routes/cases';

const USER_A = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  email: 'a@example.com',
  user_metadata: { role: 'citizen', name: 'Usuário A' },
};

const TOKEN_A = 'TOKEN_A';

const ARG_001 = { id: 'ARG-001', name: 'Tese Canônica 1', description: '...' };
const ARG_002 = { id: 'ARG-002', name: 'Tese Canônica 2', description: '...' };
const ARG_999 = { id: 'ARG-999', name: 'Tese Inexistente/Forjada', description: '...' };

const CANONICAL_ANALYSIS = {
  id: 'anl_1',
  caseId: 'case_a',
  recommendedArguments: [ARG_001, ARG_002],
  recommendedProcedure: 'recurso_jari',
  detectedInconsistencies: [],
  overallSuccessRate: 70,
  competentBody: 'PRF',
  summaryReasoning: 'Análise canônica do servidor',
  createdAt: new Date().toISOString(),
};

function makeRes() {
  const res: any = { statusCode: 0, body: null };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (body: unknown) => { if (res.statusCode === 0) res.statusCode = 200; res.body = body; return res; };
  return res as Response;
}

const noopNext = (() => undefined) as NextFunction;

function makeReq(overrides: Record<string, unknown> = {}): Request {
  return { headers: {}, body: {}, params: {}, query: {}, ...overrides } as Request;
}

function row(id: string, userId: string, analysis: any = CANONICAL_ANALYSIS) {
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
    is_anonymous: false,
    claim_token: undefined,
    is_paid: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: userId,
    analysis_json: JSON.stringify(analysis),
  };
}

const generateDefenseHandler = (() => {
  const stack: any[] = (casesRouter as any).stack;
  const layer = stack.find((l) => l.route && l.route.path === '/cases/:id/generate-defense' && l.route.methods.post);
  if (!layer) throw new Error('rota generate-defense não encontrada');
  return layer.route.stack[layer.route.stack.length - 1].handle;
})();

async function authenticate(req: Request, tokenKey: string | null) {
  getUserMock.mockImplementation((token: string) => {
    const user = token === TOKEN_A ? USER_A : null;
    if (user) return { data: { user }, error: null };
    return { data: { user: null }, error: { message: 'invalid token' } };
  });
  getClientMock.mockReturnValue({ auth: { getUser: getUserMock } });

  if (tokenKey) req.headers = { ...req.headers, authorization: `Bearer ${tokenKey}` };
  await authenticateToken(req, makeRes(), noopNext);
}

describe('Fase 3 — Autoridade Jurídica Canônica (produção)', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ADMIN_TEST_LOGIN', '');
    db.clear();
    getUserMock.mockReset();
    generateDraftMock.mockClear();
    runPipelineMock.mockClear();
    permittedThesesMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('1. body não consegue escolher tese (ARG-999 não aparece na defesa)', async () => {
    db.set('case_a', row('case_a', USER_A.id));
    const req = makeReq({
      params: { id: 'case_a' },
      body: {
        procedureType: 'recurso_jari',
        selectedArgumentIds: ['ARG-999'], // forjado pelo cliente
        applicantData: { name: 'A', cpf: '000', cnh: '111', address: 'Rua X', cityState: 'SP' },
      },
    });
    await authenticate(req, TOKEN_A);

    const res = makeRes();
    await generateDefenseHandler(req, res, noopNext);

    expect(res.statusCode).toBe(200);
    // generateDefenseDraft deve ter sido chamado SOMENTE com teses canônicas (ARG-001, ARG-002)
    const callArgs = generateDraftMock.mock.calls[0];
    const selectedArguments = callArgs[5] as Array<{ id: string }>;
    expect(selectedArguments.map((a) => a.id)).toEqual(['ARG-001', 'ARG-002']);
    expect(selectedArguments.map((a) => a.id)).not.toContain('ARG-999');
  });

  it('2. body não consegue adicionar tese (ARG-002 não recomendado não entra)', async () => {
    // Caso recomenda só ARG-001
    const analysisOnly001 = { ...CANONICAL_ANALYSIS, recommendedArguments: [ARG_001] };
    db.set('case_a', row('case_a', USER_A.id, analysisOnly001));
    const req = makeReq({
      params: { id: 'case_a' },
      body: {
        selectedArgumentIds: ['ARG-001', 'ARG-002'], // tenta adicionar ARG-002
        applicantData: { name: 'A', cpf: '000', cnh: '111', address: 'Rua X', cityState: 'SP' },
      },
    });
    await authenticate(req, TOKEN_A);

    const res = makeRes();
    await generateDefenseHandler(req, res, noopNext);

    const callArgs = generateDraftMock.mock.calls[0];
    const selectedArguments = callArgs[5] as Array<{ id: string }>;
    expect(selectedArguments.map((a) => a.id)).toEqual(['ARG-001']);
    expect(selectedArguments.map((a) => a.id)).not.toContain('ARG-002');
  });

  it('3. body não consegue remover tese recomendada (lista vazia não apaga ARG-001)', async () => {
    db.set('case_a', row('case_a', USER_A.id));
    const req = makeReq({
      params: { id: 'case_a' },
      body: {
        selectedArgumentIds: [], // cliente tenta zerar
        applicantData: { name: 'A', cpf: '000', cnh: '111', address: 'Rua X', cityState: 'SP' },
      },
    });
    await authenticate(req, TOKEN_A);

    const res = makeRes();
    await generateDefenseHandler(req, res, noopNext);

    const callArgs = generateDraftMock.mock.calls[0];
    const selectedArguments = callArgs[5] as Array<{ id: string }>;
    expect(selectedArguments.map((a) => a.id)).toEqual(['ARG-001', 'ARG-002']);
  });

  it('4. body não consegue substituir tese recomendada (ARG-999 no lugar de ARG-001)', async () => {
    db.set('case_a', row('case_a', USER_A.id));
    const req = makeReq({
      params: { id: 'case_a' },
      body: {
        selectedArgumentIds: ['ARG-999'], // substituição maliciosa
        applicantData: { name: 'A', cpf: '000', cnh: '111', address: 'Rua X', cityState: 'SP' },
      },
    });
    await authenticate(req, TOKEN_A);

    const res = makeRes();
    await generateDefenseHandler(req, res, noopNext);

    const callArgs = generateDraftMock.mock.calls[0];
    const selectedArguments = callArgs[5] as Array<{ id: string }>;
    expect(selectedArguments.map((a) => a.id)).toEqual(['ARG-001', 'ARG-002']);
  });

  it('5. body não consegue fornecer objeto jurídico arbitrário (ignorado)', async () => {
    db.set('case_a', row('case_a', USER_A.id));
    const req = makeReq({
      params: { id: 'case_a' },
      body: {
        // cliente envia objetos completos de argumentos tentando injetar
        selectedArguments: [{ id: 'ARG-FAKE', name: 'Fake', description: 'injected' }],
        applicantData: { name: 'A', cpf: '000', cnh: '111', address: 'Rua X', cityState: 'SP' },
      },
    });
    await authenticate(req, TOKEN_A);

    const res = makeRes();
    await generateDefenseHandler(req, res, noopNext);

    const callArgs = generateDraftMock.mock.calls[0];
    const selectedArguments = callArgs[5] as Array<{ id: string }>;
    expect(selectedArguments.map((a) => a.id)).toEqual(['ARG-001', 'ARG-002']);
  });

  it('6. procedimento arbitrário não substitui procedimento canônico (recommendedProcedure prevalece)', async () => {
    const analysisWithProc = { ...CANONICAL_ANALYSIS, recommendedProcedure: 'recurso_cetran' };
    db.set('case_a', row('case_a', USER_A.id, analysisWithProc));
    const req = makeReq({
      params: { id: 'case_a' },
      body: {
        procedureType: 'recurso_jari', // cliente tenta forçar JARI quando canônico é CETRAN
        applicantData: { name: 'A', cpf: '000', cnh: '111', address: 'Rua X', cityState: 'SP' },
      },
    });
    await authenticate(req, TOKEN_A);

    const res = makeRes();
    await generateDefenseHandler(req, res, noopNext);

    const callArgs = generateDraftMock.mock.calls[0];
    const procedureType = callArgs[6] as string;
    expect(procedureType).toBe('recurso_cetran'); // procedimento canônico prevalece
  });

  it('7. análise enviada pelo cliente é ignorada (pipeline recebe análise canônica)', async () => {
    db.set('case_a', row('case_a', USER_A.id));
    const req = makeReq({
      params: { id: 'case_a' },
      body: {
        // cliente tenta injetar análise forjada
        analysis: {
          recommendedArguments: [{ id: 'ARG-FAKE', name: 'Fake' }],
          recommendedProcedure: 'conversao_advertencia',
        },
        applicantData: { name: 'A', cpf: '000', cnh: '111', address: 'Rua X', cityState: 'SP' },
      },
    });
    await authenticate(req, TOKEN_A);

    const res = makeRes();
    await generateDefenseHandler(req, res, noopNext);

    // runControlledPipeline deve receber a análise CANÔNICA do domínio
    const pipelineInput = runPipelineMock.mock.calls[0][0];
    expect(pipelineInput.analysis.recommendedArguments.map((a: any) => a.id)).toEqual(['ARG-001', 'ARG-002']);
    expect(pipelineInput.analysis.recommendedProcedure).toBe('recurso_jari');
  });

  it('8. generateDefenseDraft recebe somente argumentos canônicos', async () => {
    db.set('case_a', row('case_a', USER_A.id));
    const req = makeReq({
      params: { id: 'case_a' },
      body: {
        selectedArgumentIds: ['ARG-999', 'ARG-FAKE'],
        applicantData: { name: 'A', cpf: '000', cnh: '111', address: 'Rua X', cityState: 'SP' },
      },
    });
    await authenticate(req, TOKEN_A);

    const res = makeRes();
    await generateDefenseHandler(req, res, noopNext);

    const callArgs = generateDraftMock.mock.calls[0];
    const selectedArguments = callArgs[5] as Array<{ id: string }>;
    const ids = selectedArguments.map((a) => a.id);
    expect(ids).toEqual(['ARG-001', 'ARG-002']);
    expect(ids).not.toContain('ARG-999');
    expect(ids).not.toContain('ARG-FAKE');
  });

  it('9. pipeline final preserva analysis.recommendedArguments', async () => {
    db.set('case_a', row('case_a', USER_A.id));
    const req = makeReq({
      params: { id: 'case_a' },
      body: {
        selectedArgumentIds: ['ARG-999'],
        applicantData: { name: 'A', cpf: '000', cnh: '111', address: 'Rua X', cityState: 'SP' },
      },
    });
    await authenticate(req, TOKEN_A);

    const res = makeRes();
    await generateDefenseHandler(req, res, noopNext);

    const pipelineInput = runPipelineMock.mock.calls[0][0];
    // analysis passada ao pipeline deve ter as teses canônicas
    expect(pipelineInput.analysis.recommendedArguments.map((a: any) => a.id)).toEqual(['ARG-001', 'ARG-002']);
  });

  it('10. IA não recebe autoridade para decidir teses (permittedTheses usa análise canônica)', async () => {
    db.set('case_a', row('case_a', USER_A.id));
    const req = makeReq({
      params: { id: 'case_a' },
      body: {
        selectedArgumentIds: ['ARG-999'],
        applicantData: { name: 'A', cpf: '000', cnh: '111', address: 'Rua X', cityState: 'SP' },
      },
    });
    await authenticate(req, TOKEN_A);

    const res = makeRes();
    await generateDefenseHandler(req, res, noopNext);

    // permittedTheses deve ter sido chamado com a análise canônica
    const permittedCall = permittedThesesMock.mock.calls[0][0];
    expect(permittedCall.recommendedArguments.map((a: any) => a.id)).toEqual(['ARG-001', 'ARG-002']);
  });

  it('11. response selectedArgumentIds reflete seleção canônica (não a do body)', async () => {
    db.set('case_a', row('case_a', USER_A.id));
    const req = makeReq({
      params: { id: 'case_a' },
      body: {
        selectedArgumentIds: ['ARG-999'],
        applicantData: { name: 'A', cpf: '000', cnh: '111', address: 'Rua X', cityState: 'SP' },
      },
    });
    await authenticate(req, TOKEN_A);

    const res = makeRes();
    await generateDefenseHandler(req, res, noopNext);

    expect(res.body.defenseDraft.selectedArgumentIds).toEqual(['ARG-001', 'ARG-002']);
  });

  it('12. caso sem análise canônica usa fallback seguro (vazio, não body)', async () => {
    const rowNoAnalysis = row('case_a', USER_A.id);
    delete (rowNoAnalysis as any).analysis_json; // sem análise
    db.set('case_a', rowNoAnalysis);

    const req = makeReq({
      params: { id: 'case_a' },
      body: {
        selectedArgumentIds: ['ARG-999'],
        applicantData: { name: 'A', cpf: '000', cnh: '111', address: 'Rua X', cityState: 'SP' },
      },
    });
    await authenticate(req, TOKEN_A);

    const res = makeRes();
    await generateDefenseHandler(req, res, noopNext);

    const callArgs = generateDraftMock.mock.calls[0];
    const selectedArguments = callArgs[5] as Array<{ id: string }>;
    // Sem análise canônica → array vazio (FAIL CLOSED), NÃO o body do cliente
    expect(selectedArguments).toEqual([]);
  });
});