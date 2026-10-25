import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { authenticateToken, requireAdmin } from '../middleware';

const { mockGetUser, mockProfile } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockProfile: vi.fn(),
}));

vi.mock('../supabase', () => ({
  createSupabaseAnonClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
  createSupabaseAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table !== 'user_profiles') throw new Error(`Unexpected table: ${table}`);
      const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        maybeSingle: mockProfile,
      };
      return query;
    }),
  })),
}));

function app() {
  const app = new Hono<{ Bindings: any; Variables: { user?: { id: string; role: string; email: string; name?: string }; rawToken?: string } }>();
  app.get('/private', authenticateToken, (c) => c.json({ user: c.get('user') }));
  app.get('/admin', authenticateToken, requireAdmin, (c) => c.json({ ok: true }));
  return app;
}

describe('security middleware — real implementation, Supabase boundary mocked', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockProfile.mockReset();
  });

  it('rejects requests without a bearer token', async () => {
    const response = await app().request('/private', {}, {} as any);
    expect(response.status).toBe(401);
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('rejects invalid or expired Supabase tokens', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('invalid token') });
    const response = await app().request('/private', {
      headers: { Authorization: 'Bearer invalid-token' },
    }, {} as any);
    expect(response.status).toBe(401);
  });

  it('fails closed when the server-owned profile is missing or unreadable', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1', email: 'user@example.com' } }, error: null });
    mockProfile.mockResolvedValueOnce({ data: null, error: null });
    const response = await app().request('/private', {
      headers: { Authorization: 'Bearer valid-token' },
    }, {} as any);
    expect(response.status).toBe(403);
  });

  it('uses the server-owned profile role, not user-editable metadata', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1', email: 'user@example.com', user_metadata: { role: 'admin' }, app_metadata: { role: 'admin' } } },
      error: null,
    });
    mockProfile.mockResolvedValueOnce({
      data: { user_id: 'user-1', email: 'user@example.com', name: 'Test User', role: 'citizen' },
      error: null,
    });

    const response = await app().request('/admin', {
      headers: { Authorization: 'Bearer valid-token' },
    }, {} as any);
    expect(response.status).toBe(403);
  });

  it('allows admin access only when user_profiles.role is admin', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'admin-1', email: 'admin@example.com' } }, error: null });
    mockProfile.mockResolvedValueOnce({
      data: { user_id: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'admin' },
      error: null,
    });

    const response = await app().request('/admin', {
      headers: { Authorization: 'Bearer valid-token' },
    }, {} as any);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
