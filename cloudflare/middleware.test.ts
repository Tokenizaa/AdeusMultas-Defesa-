import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const mockGetUser = vi.fn();
const mockProfileQuery = vi.fn();

vi.mock('./supabase', () => ({
  createSupabaseAnonClient: vi.fn(() => ({ auth: { getUser: mockGetUser } })),
  createSupabaseAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: mockProfileQuery }))
      }))
    }))
  }))
}));

import { authenticateToken, requireAdmin } from './middleware';

type TestEnv = any;

function app() {
  const app = new Hono<{ Bindings: TestEnv }>();
  app.get('/admin', authenticateToken, requireAdmin, (c) => c.json({ ok: true }));
  return app;
}

describe('admin authorization boundary', () => {
  it('returns 401 without bearer token', async () => {
    const response = await app().request('/admin', {}, {} as TestEnv);
    expect(response.status).toBe(401);
  });

  it('returns 401 for an invalid token', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('invalid') });
    const response = await app().request('/admin', {
      headers: { Authorization: 'Bearer invalid-token' },
    }, {} as TestEnv);
    expect(response.status).toBe(401);
  });

  it('returns 403 when the authenticated user has no server profile', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u1', email: 'citizen@example.com' } }, error: null });
    mockProfileQuery.mockResolvedValueOnce({ data: null, error: null });
    const response = await app().request('/admin', {
      headers: { Authorization: 'Bearer citizen-token' },
    }, {} as TestEnv);
    expect(response.status).toBe(403);
  });

  it('returns 403 for a citizen profile', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u2', email: 'citizen@example.com' } }, error: null });
    mockProfileQuery.mockResolvedValueOnce({ data: { user_id: 'u2', email: 'citizen@example.com', name: 'Citizen', role: 'citizen' }, error: null });
    const response = await app().request('/admin', {
      headers: { Authorization: 'Bearer citizen-token' },
    }, {} as TestEnv);
    expect(response.status).toBe(403);
  });

  it('allows an admin profile', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u3', email: 'admin@example.com' } }, error: null });
    mockProfileQuery.mockResolvedValueOnce({ data: { user_id: 'u3', email: 'admin@example.com', name: 'Admin', role: 'admin' }, error: null });
    const response = await app().request('/admin', {
      headers: { Authorization: 'Bearer admin-token' },
    }, {} as TestEnv);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});
