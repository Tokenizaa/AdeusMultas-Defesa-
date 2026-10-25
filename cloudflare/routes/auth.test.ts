import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const mockGetUser = vi.fn();
const mockProfileQuery = vi.fn();

// Apenas o Supabase é mocado. O middleware authenticateToken é o REAL, de modo
// que /api/auth/me é exercido pelo boundary de autenticação genuíno (401 sem
// token/token inválido; 200 com perfil do servidor).
vi.mock('../supabase', () => ({
  createSupabaseAnonClient: vi.fn(() => ({ auth: { getUser: mockGetUser } })),
  createSupabaseAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: mockProfileQuery }))
      }))
    }))
  }))
}));

import { authRoutes } from './auth';
import type { AuthenticatedUser } from '../middleware';

function app() {
  const app = new Hono<{ Bindings: any }>();
  app.route('/api', authRoutes);
  return app;
}

function profile(data: any, error: any = null) {
  const q: any = {};
  for (const method of ['select', 'eq', 'maybeSingle']) q[method] = vi.fn(() => q);
  q.maybeSingle = vi.fn(async () => ({ data, error }));
  q.single = vi.fn(async () => ({ data, error }));
  q.then = (resolve: any) => Promise.resolve({ data, error }).then(resolve);
  return q;
}

describe('auth Cloudflare contract (GET /api/auth/me)', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockProfileQuery.mockReset();
  });

  it('returns 401 without bearer token', async () => {
    const response = await app().request('/api/auth/me', {}, {} as any);
    expect(response.status).toBe(401);
  });

  it('returns 401 for an invalid token (rejeição oficial do Supabase)', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('invalid token') });
    const response = await app().request('/api/auth/me', {
      headers: { Authorization: 'Bearer invalid-token' },
    }, {} as any);
    expect(response.status).toBe(401);
  });

  it('returns 200 with the role from server-owned user_profiles (never user_metadata)', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u1', email: 'ana@example.com' } }, error: null });
    mockProfileQuery.mockResolvedValueOnce({ data: { user_id: 'u1', email: 'ana@example.com', name: 'Ana', role: 'admin' }, error: null });

    const response = await app().request('/api/auth/me', {
      headers: { Authorization: 'Bearer valid-token' },
    }, {} as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe('u1');
    expect(body.email).toBe('ana@example.com');
    expect(body.role).toBe('admin');
    expect(body.name).toBe('Ana');
  });

  it('returns 200 and falls back to citizen when the user has no profile', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u2', email: 'cid@example.com' } }, error: null });
    mockProfileQuery.mockResolvedValueOnce({ data: null, error: null });

    // authenticateToken exige perfil em user_profiles; sem perfil -> 403 (fail-closed).
    // O fallback "citizen" do handler é atingível apenas quando o middleware já passou.
    const response = await app().request('/api/auth/me', {
      headers: { Authorization: 'Bearer valid-token' },
    }, {} as any);

    expect(response.status).toBe(403);
  });

  it('does not expose sensitive fields (password, token) in the /me response', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u3', email: 'd@example.com' } }, error: null });
    mockProfileQuery.mockResolvedValueOnce({ data: { user_id: 'u3', email: 'd@example.com', name: 'D', role: 'citizen' }, error: null });

    const response = await app().request('/api/auth/me', {
      headers: { Authorization: 'Bearer valid-token' },
    }, {} as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).not.toHaveProperty('password');
    expect(body).not.toHaveProperty('access_token');
    expect(body).not.toHaveProperty('refresh_token');
    expect(Object.keys(body)).toEqual(expect.arrayContaining(['id', 'email', 'name', 'role']));
  });

  it('returns 403 when the profile lookup fails (authenticateToken is fail-closed)', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u4', email: 'e@example.com' } }, error: null });
    mockProfileQuery.mockResolvedValueOnce({ data: null, error: new Error('db down') });

    const response = await app().request('/api/auth/me', {
      headers: { Authorization: 'Bearer valid-token' },
    }, {} as any);

    expect(response.status).toBe(403);
  });
});
