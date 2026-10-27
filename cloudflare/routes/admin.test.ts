import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const mockFrom = vi.fn();

vi.mock('../supabase', () => ({
  createSupabaseAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock('../middleware', () => ({
  authenticateToken: async (_c: any, next: any) => next(),
  requireAdmin: async (_c: any, next: any) => next(),
}));

import { adminRoutes } from './admin';

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

    const response = await app().request('/api/admin/payments');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.summary.revenue).toBe(1123.45);
    expect(paymentOrderCalls).toBe(7);
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
