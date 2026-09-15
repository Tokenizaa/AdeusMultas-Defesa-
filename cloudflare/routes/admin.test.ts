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
  for (const method of ['select', 'eq', 'order', 'limit', 'update', 'not', 'or']) q[method] = vi.fn(() => q);
  q.maybeSingle = vi.fn(async () => ({ data, error }));
  q.single = vi.fn(async () => ({ data, error }));
  q.then = (resolve: any) => Promise.resolve({ data, error }).then(resolve);
  return q;
}

describe('admin users contract', () => {
  beforeEach(() => mockFrom.mockReset());

  it('exposes factual Cloudflare AI architecture without legacy providers', async () => {
    const response = await app().request('/api/admin/ai/overview');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.provider).toMatchObject({
      name: 'Cloudflare Workers AI',
      runtime: 'cloudflare',
      model: '@cf/openai/gpt-oss-20b',
      fallback: null,
    });
    expect(body.rag).toMatchObject({
      provider: 'Cloudflare Vectorize',
      index: 'adeusmulta-knowledge',
      embeddingModel: '@cf/baai/bge-base-en-v1.5',
      dimensions: 768,
      status: 'configured',
    });
    expect(body.observability).toEqual({ historicalMetrics: false, metricsPhase: 13 });
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
