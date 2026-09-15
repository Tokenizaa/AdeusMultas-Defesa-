import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const h = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const q: any = { select: vi.fn(() => q), eq: vi.fn(() => q), gte: vi.fn(() => q) };
  q.maybeSingle = maybeSingle;
  q.then = (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve);
  const from = vi.fn(() => q);
  return { from, q, maybeSingle };
});

vi.mock('../supabase', () => ({
  createSupabaseAdminClient: vi.fn(() => ({ from: h.from })),
}));

vi.mock('../middleware', () => ({
  authenticateToken: async (c: any, next: any) => { c.set('user', { id: 'admin-1', role: 'admin' }); await next(); },
  requireAdmin: async (_c: any, next: any) => next(),
}));

import { adminRoutes } from './admin';

function app() {
  const app = new Hono();
  app.route('/api', adminRoutes);
  return app;
}

describe('Phase 13 — AI observability metrics (real, not fabricated)', () => {
  it('returns zero-based metrics when the log is empty', async () => {
    h.q.then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve);
    const response = await app().request('/api/admin/ai/metrics');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      available: true,
      windowHours: 24,
      totalCalls: 0,
      errorRatePercent: 0,
      avgLatencyMs: 0,
      p50LatencyMs: 0,
      p95LatencyMs: 0,
      p99LatencyMs: 0,
      byOperation: {},
    });
  });

  it('aggregates real logs into latency percentiles and error rate', async () => {
    const rows = [
      { operation: 'analyze-infraction', status: 'ok', latency_ms: 100 },
      { operation: 'analyze-infraction', status: 'ok', latency_ms: 200 },
      { operation: 'generate-defense', status: 'error', latency_ms: 300 },
      { operation: 'generate-defense', status: 'ok', latency_ms: 900 },
    ];
    h.q.then = (resolve: any) => Promise.resolve({ data: rows, error: null }).then(resolve);
    const response = await app().request('/api/admin/ai/metrics');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.totalCalls).toBe(4);
    expect(body.errorRatePercent).toBe(25);
    expect(body.avgLatencyMs).toBe(375);
    expect(body.byOperation).toEqual({ 'analyze-infraction': 2, 'generate-defense': 2 });
    expect(body.p50LatencyMs).toBeGreaterThanOrEqual(100);
    expect(body.p95LatencyMs).toBeGreaterThanOrEqual(900);
    expect(JSON.stringify(body)).not.toContain('nvidia');
    expect(JSON.stringify(body)).not.toContain('9router');
  });

  it('never returns fabricated providers or metrics', async () => {
    h.q.then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve);
    const overview = await (await app().request('/api/admin/ai/overview')).json();
    expect(JSON.stringify(overview)).not.toContain('nvidia');
    expect(JSON.stringify(overview)).not.toContain('9router');
    expect(overview.observability).toEqual({ historicalMetrics: true, metricsEndpoint: '/api/admin/ai/metrics' });
  });
});