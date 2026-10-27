import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const mockFrom = vi.fn();

vi.mock('../supabase', () => ({
  createSupabaseAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock('../middleware', () => ({
  authenticateToken: async (c: any, next: any) => { c.set('user', { id: 'admin-1', email: 'admin@example.com', role: 'admin' }); await next(); },
  requireAdmin: async (_c: any, next: any) => next(),
}));

vi.mock('./audit', () => ({ recordAuditLog: vi.fn().mockResolvedValue(undefined) }));

import { adminRoutes } from './admin';
import { recordAuditLog } from './audit';

function app() {
  const app = new Hono();
  app.route('/api', adminRoutes);
  return app;
}

function query(data: any, error: any = null) {
  const q: any = {};
  for (const method of ['select', 'eq', 'order', 'limit', 'update', 'not', 'or', 'gte', 'in', 'range']) q[method] = vi.fn(() => q);
  q.maybeSingle = vi.fn(async () => ({ data, error }));
  q.single = vi.fn(async () => ({ data, error }));
  q.then = (resolve: any) => Promise.resolve({ data, error }).then(resolve);
  return q;
}

describe('admin Cloudflare contract', () => {
  beforeEach(() => mockFrom.mockReset());

  it('exposes factual Cloudflare AI architecture without legacy providers', async () => {
    const response = await app().request('/api/admin/ai/overview', {}, { AI: {}, VECTORIZE: {} } as any);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.provider).toMatchObject({
      name: 'Cloudflare Workers AI',
      runtime: 'cloudflare',
      model: '@cf/openai/gpt-oss-20b',
      fallback: null,
      status: 'configured',
      statusMeaning: expect.stringContaining('não comprova disponibilidade'),
    });
    expect(body.rag).toMatchObject({
      provider: 'Cloudflare Vectorize',
      index: 'adeusmulta-knowledge',
      embeddingModel: '@cf/baai/bge-base-en-v1.5',
      dimensions: 768,
      status: 'configured',
      statusMeaning: expect.stringContaining('não consulta o índice'),
    });
    expect(body.observability).toMatchObject({
      historicalMetrics: true,
      metricsEndpoint: '/api/admin/ai/metrics',
      metricsScope: expect.stringContaining('24 horas'),
    });
  });

  it('returns persisted AI execution metrics for the last 24 hours', async () => {
    mockFrom.mockReturnValue(query([
      { operation: 'analyze-infraction', status: 'success', latency_ms: 100 },
      { operation: 'generate-defense', status: 'error', latency_ms: 200 },
    ]));

    const response = await app().request('/api/admin/ai/metrics');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      available: true,
      windowHours: 24,
      totalCalls: 2,
      errorRatePercent: 50,
      avgLatencyMs: 150,
      p95LatencyMs: 200,
      byOperation: { 'analyze-infraction': 1, 'generate-defense': 1 },
    });
    expect(mockFrom).toHaveBeenCalledWith('ai_execution_logs');
  });

  it('returns only factual overview KPIs and defers observability to Phase 13', async () => {
    mockFrom.mockImplementation(() => query(null));
    const response = await app().request('/api/admin/overview');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.metrics).toMatchObject({
      totalUsers: 0,
      totalCases: 0,
      analyzedCases: 0,
      defenseReadyCases: 0,
      paidCases: 0,
      totalRevenue: 0,
      conversionRate: 0,
      analysisToDocRate: 0,
    });
    expect(body.observability).toEqual({ historicalMetrics: true, metricsEndpoint: "/api/admin/ai/metrics" });
    expect(body).not.toHaveProperty('aiStatus');
    expect(JSON.stringify(body)).not.toContain('nvidia');
    expect(JSON.stringify(body)).not.toContain('9router');
    expect(JSON.stringify(body)).not.toContain('systemUptimePercent');
  });

  it('calculates revenue across all paid-order pages, not only a fixed first page', async () => {
    const firstPage = Array.from({ length: 1000 }, (_, i) => ({ id: `paid-${i}`, amount: 1 }));
    const secondPage = [{ id: 'paid-1000', amount: 123.45 }];
    let paymentOrderCalls = 0;

    mockFrom.mockImplementation((table: string) => {
      const q = query(null);
      if (table === 'payment_orders') {
        const callIndex = paymentOrderCalls++;
        const data = callIndex === 5 ? firstPage : callIndex === 6 ? secondPage : [];
        q.then = (resolve: any) => Promise.resolve({ data, error: null, count: 0 }).then(resolve);
      }
      return q;
    });

    const response = await app().request('/api/admin/payments', {}, { VENO_PRIMARY_GATEWAY: 'venopag' } as any);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.summary.revenue).toBe(1123.45);
    expect(paymentOrderCalls).toBe(7);
  });

  it('returns recent case rows for the authenticated admin dashboard', async () => {
    const row = {
      id: 'case-1', title: 'Defesa Prévia', client_name: 'Ana', service_type: 'defesa_previa',
      status: 'defesa_pronta', is_paid: true, ait_number: 'AIT-123',
      infraction_description: 'Excesso de velocidade', vehicle_plate: 'ABC1D23',
      autuador_body: 'DETRAN/RS', created_at: '2026-10-26T10:00:00.000Z',
    };
    mockFrom.mockImplementation((table: string) => table === 'cases' ? query([row]) : query(null));

    const response = await app().request('/api/admin/overview');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.recentCases[0]).toMatchObject({
      id: 'case-1',
      clientName: 'Ana',
      isPaid: true,
      payment: { status: 'paid' },
      infraction: { aitNumber: 'AIT-123', description: 'Excesso de velocidade', autuadorBody: 'DETRAN/RS' },
      vehicle: { plate: 'ABC1D23' },
    });
    expect(body.metrics.totalRevenue).toBe(0);
  });

  it('returns complete document fields used by the admin document repository', async () => {
    const row = {
      id: 'case-doc-1', title: 'Recurso JARI', client_name: 'Ana', client_cpf: '12345678901',
      service_type: 'recurso_jari', status: 'defesa_pronta', is_paid: true,
      ait_number: 'AIT-987', infraction_code: '745-5', infraction_description: 'Excesso de velocidade',
      autuador_body: 'DETRAN/RS', vehicle_plate: 'XYZ9A99',
      defense_draft_json: JSON.stringify({ version: '2', engineVersion: 'deterministic-v2', canonicalDraft: 'Texto integral da minuta' }),
      analysis_json: JSON.stringify({ recommendedArguments: [{ id: 'a' }, { id: 'b' }] }),
      created_at: '2026-10-26T11:00:00.000Z',
    };
    mockFrom.mockImplementation((table: string) => table === 'cases' ? query([row]) : query(null));

    const response = await app().request('/api/admin/documents');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.documents[0]).toMatchObject({
      id: 'case-doc-1',
      caseId: 'case-doc-1',
      clientName: 'Ana',
      clientCpf: '12345678901',
      aitNumber: 'AIT-987',
      infractionCode: '745-5',
      infractionDescription: 'Excesso de velocidade',
      organ: 'DETRAN/RS',
      procedureType: 'recurso_jari',
      procedureLabel: 'Recurso JARI',
      status: 'LIBERADO_PAGO',
      version: '2',
      thesesCount: 2,
      engine: 'deterministic-v2',
      draftText: 'Texto integral da minuta',
      vehiclePlate: 'XYZ9A99',
    });
  });

  it('maps user_profiles to the AuthUser frontend contract', async () => {
    mockFrom.mockReturnValueOnce(query([{
      user_id: 'u1', name: 'Maria', email: 'maria@example.com', role: 'citizen',
      cpf: '123', phone: '999', cnh: 'ABC', city_state: 'Porto Alegre/RS',
      avatar_url: null, created_at: '2026-09-15T00:00:00Z'
    }]));

    const response = await app().request('/api/admin/users');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ users: [{
      id: 'u1', name: 'Maria', email: 'maria@example.com', role: 'citizen',
      cpf: '123', phone: '999', cnh: 'ABC', cityState: 'Porto Alegre/RS',
      avatarUrl: undefined, createdAt: '2026-09-15T00:00:00Z'
    }] });
  });

  it('returns a real user profile, only that user\'s cases, and complete confirmed spend', async () => {
    const userId = '00000000-0000-4000-8000-000000000123';
    const profileQuery = query({
      user_id: userId, name: 'Ana', email: 'ana@example.com', role: 'citizen',
      cpf: '12345678901', phone: '51999999999', created_at: '2026-09-20T00:00:00Z',
    });
    const caseQuery = query([{
      id: 'case-uuid', app_ref: 'case_app_1', title: 'Recurso JARI',
      user_id: userId, is_paid: true, ait_number: 'AIT-123', vehicle_plate: 'ABC1D23',
      autuador_body: 'DETRAN/RS', created_at: '2026-09-21T00:00:00Z',
    }]);
    const paymentQuery = query([
      { id: 'pay-1', amount: 20 },
      { id: 'pay-2', amount: 15.5 },
    ]);
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_profiles') return profileQuery;
      if (table === 'cases') return caseQuery;
      if (table === 'payment_orders') return paymentQuery;
      return query(null);
    });

    const response = await app().request(`/api/admin/users/${userId}`);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.user).toMatchObject({ id: userId, name: 'Ana', email: 'ana@example.com', role: 'citizen' });
    expect(body.cases).toEqual([expect.objectContaining({
      id: 'case-uuid', title: 'Recurso JARI', isPaid: true,
      infraction: { aitNumber: 'AIT-123', autuadorBody: 'DETRAN/RS' },
      vehicle: { plate: 'ABC1D23' },
    })]);
    expect(body.totalSpent).toBe(35.5);
    expect(caseQuery.eq).toHaveBeenCalledWith('user_id', userId);
    expect(paymentQuery.eq).toHaveBeenCalledWith('user_id', userId);
    expect(recordAuditLog).toHaveBeenCalledWith(undefined, expect.objectContaining({
      actor: 'admin@example.com',
      action: 'admin.user_profile.viewed',
      targetId: userId,
    }));
  });

  it('returns 404 rather than fabricating a missing user profile', async () => {
    mockFrom.mockReturnValue(query(null));
    const response = await app().request('/api/admin/users/00000000-0000-4000-8000-000000000999');
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe('NOT_FOUND');
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it('accepts the existing frontend PUT contract { email, role }', async () => {
    const target = {
      user_id: 'u1', name: 'Maria', email: 'maria@example.com', role: 'citizen',
      cpf: null, phone: null, cnh: null, city_state: null, avatar_url: null,
      created_at: '2026-09-15T00:00:00Z'
    };
    const updated = { ...target, role: 'admin' };
    mockFrom.mockReturnValueOnce(query(target)).mockReturnValueOnce(query(updated));

    const response = await app().request('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'Maria@Example.com', role: 'admin' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      user: { id: 'u1', email: 'maria@example.com', role: 'admin' },
    });
    expect(recordAuditLog).toHaveBeenCalledWith(undefined, expect.objectContaining({
      action: 'admin.user_role.updated',
      targetId: 'u1',
      details: { previousRole: 'citizen', newRole: 'admin' },
    }));
  });

  it('rejects an invalid role before touching persistence', async () => {
    const response = await app().request('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'maria@example.com', role: 'superadmin' }),
    });
    expect(response.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
