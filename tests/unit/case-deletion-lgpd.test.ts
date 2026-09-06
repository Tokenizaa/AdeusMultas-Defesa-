/**
 * FASE 4.1 — LGPD Art. 18: DELETE /cases/:id endpoint tests.
 *
 * Tests the full HTTP request path:
 *   HTTP DELETE
 *     → authenticateToken middleware
 *     → canAccessCase (ownership check)
 *     → anonymization logic
 *     → databaseRows.set()
 *     → eventBus.publish(CASE_DELETED)
 *     → auditLogs.push()
 *     → 200 response
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

// ── hoisted mocks (must precede imports) ──────────────────────────────────

const mockDb = vi.hoisted(() => new Map<string, any>());
const getClientMock = vi.hoisted(() => vi.fn());
const getUserMock = vi.hoisted(() => vi.fn());

// eventBus is imported directly by cases.ts from topics.ts
const publishMock = vi.hoisted(() => vi.fn());

vi.mock('@/server/app', () => ({
  databaseRows: mockDb,
  auditLogs: [],
}));

vi.mock('@/core/events/topics', () => ({
  eventBus: { publish: publishMock },
  EventTopics: {
    CASE_CREATED: 'case.created',
    CASE_UPDATED: 'case.updated',
    CASE_DELETED: 'case.deleted',
    CASE_CLAIMED: 'case.claimed',
    CASE_STAGE_CHANGED: 'case.stage_changed',
    DEFENSE_DRAFT_FINALIZED: 'defense.draft_finalized',
  },
}));

vi.mock('@/server/db/supabase-server', () => ({
  getSupabaseServerClient: (..._args: unknown[]) => getClientMock(..._args),
}));

vi.mock('@/server/observability/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/core/rag/rag-pipeline', () => ({
  RagPipeline: {
    analyzeInfraction: vi.fn(),
    generateDefenseDraft: vi.fn(),
  },
}));

vi.mock('@/core/ai/ai-orchestrator', () => ({
  registerRefinementProvider: vi.fn(),
  runControlledPipeline: vi.fn(),
  permittedTheses: vi.fn(() => []),
}));

vi.mock('@/server/gemini', () => ({
  enrichDefenseWithGemini: async (x: unknown) => x,
}));

// ── imports reais após mocks ───────────────────────────────────────────────

import { authenticateToken } from '@/server/middleware/auth-middleware';
import casesRouter from '@/server/routes/cases';

// ── test fixtures ─────────────────────────────────────────────────────────

const USER_OWNER = {
  id: 'owner-uuid-0000-0000-000000000001',
  email: 'owner@example.com',
  user_metadata: { role: 'citizen' as const, name: 'Owner' },
};

const USER_OTHER = {
  id: 'other-uuid-0000-0000-000000000002',
  email: 'other@example.com',
  user_metadata: { role: 'citizen' as const, name: 'Other' },
};

const USER_ADMIN = {
  id: 'admin-uuid-0000-0000-000000000003',
  email: 'admin@example.com',
  user_metadata: { role: 'admin' as const, name: 'Admin' },
};

const TOKEN_MAP: Record<string, unknown> = {
  TOKEN_OWNER: USER_OWNER,
  TOKEN_OTHER: USER_OTHER,
  TOKEN_ADMIN: USER_ADMIN,
};

// ── helpers (same pattern as routes-cases-authz-p0.test.ts) ────────────────

function makeRes() {
  const res: any = { statusCode: 0, body: null };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (body: unknown) => { if (res.statusCode === 0) res.statusCode = 200; res.body = body; return res; };
  return res as Response;
}

const noopNext = (() => undefined) as NextFunction;

function routeHandler(method: 'delete' | 'get' | 'put' | 'post', path: string): Function {
  const stack: any[] = (casesRouter as any).stack;
  const layer = stack.find((l: any) =>
    l.route && l.route.path === path && l.route.methods[method]
  );
  if (!layer) throw new Error(`route not found: ${method.toUpperCase()} ${path}`);
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

function makeReq(overrides: Record<string, unknown> = {}): Request {
  return { headers: {}, body: {}, params: {}, query: {}, ...overrides } as Request;
}

async function authenticate(req: Request, tokenKey: string | null) {
  getUserMock.mockImplementation((token: string) => {
    const user = TOKEN_MAP[token];
    if (user) return { data: { user }, error: null };
    return { data: { user: null }, error: { message: 'invalid token' } };
  });
  getClientMock.mockReturnValue({ auth: { getUser: getUserMock } });
  if (tokenKey) req.headers = { ...req.headers, authorization: `Bearer ${tokenKey}` };
  await authenticateToken(req, makeRes(), noopNext);
}

function makeRow(id: string, userId: string) {
  return {
    id,
    title: `Caso ${id}`,
    client_name: 'João da Silva',
    client_email: 'joao@example.com',
    client_phone: '11999999999',
    client_cpf: '123.456.789-00',
    user_id: userId,
    status: 'novo',
    current_stage: 1,
    service_type: 'recurso_jari',
    vehicle_plate: 'ABC-1D23',
    vehicle_brand_model: 'Honda Civic',
    vehicle_renavam: '12345678901',
    vehicle_chassis: '9BD19224564000000',
    vehicle_year: '2020',
    vehicle_color: 'Preto',
    ait_number: 'AIT-TEST',
    infraction_code: '745-50',
    infraction_description: 'Excesso de velocidade',
    ctb_article: '218',
    severity: 'grave',
    points: 7,
    fine_amount: 1300,
    autuador_body: 'DETRAN-SP',
    date_time: '2024-01-15T10:30:00Z',
    location: 'Via Expressa',
    analysis_json: JSON.stringify({ id: 'anl_test', recommendedArguments: [] }),
    applicant_json: JSON.stringify({ name: 'João', cpf: '123.456.789-00' }),
    defense_draft_json: JSON.stringify({ selectedArgumentIds: ['ARG-001'] }),
    evidence_json: JSON.stringify({}),
    ocr_auxiliary_json: JSON.stringify({}),
    timeline_json: JSON.stringify([{ action: 'CASE_CREATED' }]),
    claim_token: 'token_abc123',
    commercial_offer_id: 'offer_xyz',
    formal_flaws_json: JSON.stringify({}),
    protocol_info_json: JSON.stringify({}),
    real_driver_name: 'Motorista Real',
    real_driver_cpf: '000.000.000-00',
    real_driver_cnh: '00123456789AB',
    cellphone_circumstance: 'usado para comunicação',
    is_anonymous: false,
    is_paid: false,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  };
}

const deleteHandler = routeHandler('delete', '/cases/:id');

// ── tests ───────────────────────────────────────────────────────────────────

describe('FASE 4.1 — DELETE /cases/:id — LGPD Art. 18', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ADMIN_TEST_LOGIN', '');
    mockDb.clear();
    getUserMock.mockReset();
    publishMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  // ── Authorization ─────────────────────────────────────────────────────────

  it('returns 404 for non-existent case', async () => {
    const req = makeReq({ params: { id: 'case_nonexistent' } });
    await authenticate(req, 'TOKEN_OWNER');
    const res = makeRes();
    await deleteHandler(req, res, noopNext);
    expect(res.statusCode).toBe(404);
  });

  it('returns 403 when non-owner citizen calls DELETE', async () => {
    mockDb.set('case_403', makeRow('case_403', USER_OWNER.id));

    const req = makeReq({ params: { id: 'case_403' } });
    await authenticate(req, 'TOKEN_OTHER'); // USER_OTHER is not the owner
    const res = makeRes();
    await deleteHandler(req, res, noopNext);

    expect(res.statusCode).toBe(403);
    // Row must NOT be modified
    const stored = mockDb.get('case_403') as any;
    expect(stored.client_name).toBe('João da Silva');
    expect(stored.client_email).toBe('joao@example.com');
  });

  it('owner returns 200 and all PII is removed from persistence', async () => {
    mockDb.set('case_owner', makeRow('case_owner', USER_OWNER.id));

    const req = makeReq({ params: { id: 'case_owner' } });
    await authenticate(req, 'TOKEN_OWNER');
    const res = makeRes();
    await deleteHandler(req, res, noopNext);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // All PII fields must be removed / replaced
    const stored = mockDb.get('case_owner') as any;
    expect(stored.client_name).toBe('[REMOVIDO]');
    expect(stored.client_email).toBeUndefined();
    expect(stored.client_phone).toBeUndefined();
    expect(stored.client_cpf).toBeUndefined();
    expect(stored.user_id).toBeUndefined();
    expect(stored.applicant_json).toBeUndefined();
    expect(stored.defense_draft_json).toBeUndefined();
    expect(stored.analysis_json).toBeUndefined();
    expect(stored.evidence_json).toBeUndefined();
    expect(stored.ocr_auxiliary_json).toBeUndefined();
    expect(stored.timeline_json).toBeUndefined();
    expect(stored.claim_token).toBeUndefined();
    expect(stored.commercial_offer_id).toBeUndefined();
    expect(stored.formal_flaws_json).toBeUndefined();
    expect(stored.protocol_info_json).toBeUndefined();
    expect(stored.real_driver_name).toBeUndefined();
    expect(stored.real_driver_cpf).toBeUndefined();
    expect(stored.real_driver_cnh).toBeUndefined();
    expect(stored.cellphone_circumstance).toBeUndefined();

    // Case structure preserved for compliance
    expect(stored.id).toBe('case_owner');
    expect(stored.service_type).toBe('recurso_jari');
    expect(stored.ait_number).toBe('AIT-TEST');
    expect(stored.vehicle_plate).toBe('ABC-1D23');
    expect(stored.infraction_code).toBe('745-50');
    expect(stored.status).toBe('novo');
  });

  it('admin returns 200 for any case (admin override)', async () => {
    mockDb.set('case_admin', makeRow('case_admin', 'some-other-user-id'));

    const req = makeReq({ params: { id: 'case_admin' } });
    await authenticate(req, 'TOKEN_ADMIN');
    const res = makeRes();
    await deleteHandler(req, res, noopNext);

    expect(res.statusCode).toBe(200);
    const stored = mockDb.get('case_admin') as any;
    expect(stored.client_name).toBe('[REMOVIDO]');
    expect(stored.client_email).toBeUndefined();
  });

  // ── Event published ────────────────────────────────────────────────────────

  it('publishes CASE_DELETED event after successful anonymization', async () => {
    mockDb.set('case_event', makeRow('case_event', USER_OWNER.id));

    const req = makeReq({ params: { id: 'case_event' } });
    await authenticate(req, 'TOKEN_OWNER');
    const res = makeRes();
    await deleteHandler(req, res, noopNext);

    expect(res.statusCode).toBe(200);
    expect(publishMock).toHaveBeenCalledWith(
      'case.deleted',
      { caseId: 'case_event' },
      'case_engine'
    );
  });

  // ── Audit log ─────────────────────────────────────────────────────────────

  it('records CASE_ANONYMIZED in auditLogs', async () => {
    // Re-import to get the mock's auditLogs reference
    const { auditLogs } = await import('@/server/app');

    mockDb.set('case_audit', makeRow('case_audit', USER_OWNER.id));

    const req = makeReq({ params: { id: 'case_audit' } });
    await authenticate(req, 'TOKEN_OWNER');
    const res = makeRes();
    await deleteHandler(req, res, noopNext);

    expect(res.statusCode).toBe(200);
    const entry = auditLogs.find((l: any) => l.action === 'CASE_ANONYMIZED');
    expect(entry).toBeDefined();
    expect(entry.targetResource).toBe('case_audit');
    expect(entry.gdprCompliant).toBe(true);
  });
});
