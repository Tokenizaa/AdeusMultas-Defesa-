import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — padrão idêntico ao de cloudflare/routes/cases.test.ts (que passa).
// ---------------------------------------------------------------------------

const { mockFrom, mockAnalyze } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockAnalyze: vi.fn(),
}));

vi.mock('../supabase', () => ({
  createSupabaseAdminClient: vi.fn(() => ({ from: mockFrom })),
  createSupabaseUserClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock('../middleware', () => ({
  authenticateToken: async (c: any, next: () => Promise<void>) => {
    const auth = c.req.header('authorization') || '';
    const isOtherUser = auth.includes('token-outro');
    c.set('user', { id: isOtherUser ? '00000000-0000-4000-8000-000000000002' : '00000000-0000-4000-8000-000000000001', email: isOtherUser ? 'outro@example.com' : 'dono@example.com', role: 'citizen' });
    await next();
  },
  requireAdmin: async (_c: unknown, next: () => Promise<void>) => next(),
}));

vi.mock('../rag-adapter', () => ({
  analyzeInfractionCompat: mockAnalyze,
  generateDefenseDraftCompat: vi.fn(),
}));

vi.mock('./audit', () => ({
  recordAuditLog: vi.fn(async () => undefined),
}));

import { casesRoutes } from './cases';
import { recordAuditLog } from './audit';

const OWNER_ID = '00000000-0000-4000-8000-000000000001';
const CASE_ID = '11111111-1111-4111-8111-111111111111';
const TOKEN = 'd'.repeat(64);

const fullCaseRow = {
  id: CASE_ID,
  user_id: OWNER_ID,
  is_anonymous: false,
  is_paid: true,
  client_name: 'João da Silva',
  client_email: 'joao@example.com',
  client_phone: '11999999999',
  client_cpf: '12345678909',
  vehicle_plate: 'ABC1234',
  vehicle_brand_model: 'Fiat Mobi',
  vehicle_renavam: '12345678901',
  ait_number: 'AIT-2024-0001',
  infraction_code: '745-50',
  location: 'Av. Paulista, São Paulo/SP',
  service_type: 'defesa_previa',
  status: 'defesa_pronta',
  created_at: '2026-01-10T10:00:00Z',
  updated_at: '2026-01-10T10:00:00Z',
  claim_token: null,
}

// ---------------------------------------------------------------------------
// GET /cases/:id/export (DSAR)
// ---------------------------------------------------------------------------

describe('GET /cases/:id/export (DSAR)', () => {
  let query: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAnalyze.mockReset().mockResolvedValue({ recommendedArguments: [] });
    (recordAuditLog as any).mockReset();
    query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      is: vi.fn(() => query),
      order: vi.fn(() => query),
      delete: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({ data: fullCaseRow, error: null })),
    };
    mockFrom.mockReset().mockReturnValue(query);
  });

  it('exporta todos os dados pessoais do caso para o dono autenticado', async () => {
    const response = await casesRoutes.request(
      `/cases/${CASE_ID}/export`,
      { method: 'GET', headers: { Authorization: 'Bearer token-dono' } },
      {} as any,
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.caseId).toBe(CASE_ID);
    expect(body.case.clientName).toBe('João da Silva');
    expect(body.case.clientCpf).toBe('12345678909');
    expect(body.case.vehicle.plate).toBe('ABC1234');
    expect(body.case.infraction.aitNumber).toBe('AIT-2024-0001');
    expect(body.legalBasis).toContain('LGPD Art. 18, II');
    expect(body.paymentOrders).toEqual([]);
    expect(body.documents).toEqual([]);
    expect(response.headers.get('content-disposition')).toContain(`dados-caso-${CASE_ID}.json`);

    expect(recordAuditLog).toHaveBeenCalledTimes(1);
    const audit = (recordAuditLog as any).mock.calls[0][0];
    expect(audit.action).toBe('case.exported');
    expect(audit.actor).toBe(OWNER_ID);
    expect(audit.targetId).toBe(CASE_ID);
    expect(audit.gdprCompliant).toBe(true);
  });

  it('rejeita exportação para usuário que não é o dono', async () => {
    const response = await casesRoutes.request(
      `/cases/${CASE_ID}/export`,
      { method: 'GET', headers: { Authorization: 'Bearer token-outro' } },
      {} as any,
    );

    expect(response.status).toBe(403);
    expect(recordAuditLog).not.toHaveBeenCalled();
  });

  it('retorna 404 quando o caso não existe', async () => {
    query.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const response = await casesRoutes.request(
      `/cases/${CASE_ID}/export`,
      { method: 'GET', headers: { Authorization: 'Bearer token-dono' } },
      {} as any,
    );

    expect(response.status).toBe(404);
    expect(recordAuditLog).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// DELETE /cases/:id — exclusão real
// ---------------------------------------------------------------------------

describe('DELETE /cases/:id — exclusão real', () => {
  let query: any;
  let casesMaybeCalls: number;

  beforeEach(() => {
    casesMaybeCalls = 0;
    (recordAuditLog as any).mockReset();
    query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => {
        casesMaybeCalls += 1;
        return casesMaybeCalls === 1 ? { data: fullCaseRow, error: null } : { data: null, error: null };
      }),
    };
    mockFrom.mockReset().mockReturnValue(query);
  });

  it('exclui o caso, documentos e payment_orders, verifica eliminação e grava auditoria', async () => {
    // documents.select → data = [] (sem documentos); payment_orders via delete.
    query.data = [];

    const response = await casesRoutes.request(
      `/cases/${CASE_ID}`,
      { method: 'DELETE', headers: { Authorization: 'Bearer token-dono' } },
      {} as any,
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('excluídos completamente');
    expect(body.caseId).toBe(CASE_ID);

    // delete foi chamado para documents, payment_orders e cases
    expect(query.delete).toHaveBeenCalled();
    expect(casesMaybeCalls).toBe(2);

    expect(recordAuditLog).toHaveBeenCalledTimes(1);
    const audit = (recordAuditLog as any).mock.calls[0][0];
    expect(audit.action).toBe('case.deleted');
    expect(audit.actor).toBe(OWNER_ID);
    expect(audit.targetId).toBe(CASE_ID);
    expect(audit.details.scope).toBe('full_deletion');
    expect(audit.gdprCompliant).toBe(true);
  });

  it('não revela se o caso existe para quem não tem permissão (403)', async () => {
    query.maybeSingle.mockImplementation(async () => ({ data: { ...fullCaseRow, user_id: 'outro-usuario' }, error: null }));

    const response = await casesRoutes.request(
      `/cases/${CASE_ID}`,
      { method: 'DELETE', headers: { Authorization: 'Bearer token-dono' } },
      {} as any,
    );

    expect(response.status).toBe(403);
    expect(query.delete).not.toHaveBeenCalled();
    expect(recordAuditLog).not.toHaveBeenCalled();
  });

  it('retorna 404 quando o caso não existe', async () => {
    query.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const response = await casesRoutes.request(
      `/cases/${CASE_ID}`,
      { method: 'DELETE', headers: { Authorization: 'Bearer token-dono' } },
      {} as any,
    );

    expect(response.status).toBe(404);
    expect(query.delete).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// DELETE /cases/anonymous/:id — exclusão via claim_token
// ---------------------------------------------------------------------------

describe('DELETE /cases/anonymous/:id — exclusão via claim_token', () => {
  let query: any;
  let casesMaybeCalls: number;
  const ANON_LIMITER = { limit: vi.fn().mockResolvedValue({ success: true }) };

  beforeEach(() => {
    casesMaybeCalls = 0;
    (recordAuditLog as any).mockReset();
    query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => {
        casesMaybeCalls += 1;
        return casesMaybeCalls === 1 ? { data: { ...fullCaseRow, id: CASE_ID, user_id: null, is_anonymous: true, claim_token: TOKEN }, error: null } : { data: null, error: null };
      }),
    };
    mockFrom.mockReset().mockReturnValue(query);
  });

  it('exclui caso anônimo apenas com claim_token válido, sem autenticação', async () => {
    const response = await casesRoutes.request(
      `/cases/anonymous/${CASE_ID}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.50' },
        body: JSON.stringify({ claimToken: TOKEN }),
      },
      { ANONYMOUS_CASE_LIMITER: ANON_LIMITER } as any,
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('excluídos completamente');
    expect(query.delete).toHaveBeenCalled();
    expect(casesMaybeCalls).toBe(2);

    expect(recordAuditLog).toHaveBeenCalledTimes(1);
    const audit = (recordAuditLog as any).mock.calls[0][0];
    expect(audit.action).toBe('case.deleted.anonymous');
    expect(audit.actor).toBe('anonymous:claim_token');
  });

  it('retorna 404 para claim_token inválido (indistinguível de não encontrado)', async () => {
    const response = await casesRoutes.request(
      `/cases/anonymous/${CASE_ID}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.51' },
        body: JSON.stringify({ claimToken: 'e'.repeat(64) }),
      },
      { ANONYMOUS_CASE_LIMITER: ANON_LIMITER } as any,
    );

    expect(response.status).toBe(404);
    expect(query.delete).not.toHaveBeenCalled();
    expect(recordAuditLog).not.toHaveBeenCalled();
  });

  it('retorna 404 quando o token não tem formato de 64 hex (sem revelar existência)', async () => {
    const response = await casesRoutes.request(
      `/cases/anonymous/${CASE_ID}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.52' },
        body: JSON.stringify({ claimToken: 'curto' }),
      },
      { ANONYMOUS_CASE_LIMITER: ANON_LIMITER } as any,
    );

    expect(response.status).toBe(404);
    expect(query.delete).not.toHaveBeenCalled();
  });

  it('aplica rate limit por IP na exclusão anônima', async () => {
    const limiterMock = { limit: vi.fn().mockResolvedValue({ success: false }) };
    const response = await casesRoutes.request(
      `/cases/anonymous/${CASE_ID}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.53' },
        body: JSON.stringify({ claimToken: TOKEN }),
      },
      { ANONYMOUS_CASE_LIMITER: limiterMock } as any,
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('60');
    expect(limiterMock.limit).toHaveBeenCalled();
    expect(query.delete).not.toHaveBeenCalled();
  });

  it('falha fechado quando o limiter ou IP está indisponível', async () => {
    const response = await casesRoutes.request(
      `/cases/anonymous/${CASE_ID}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimToken: TOKEN }),
      },
      {} as any,
    );

    expect(response.status).toBe(503);
    expect(query.delete).not.toHaveBeenCalled();
  });
});