import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSupabaseServerClient: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../db/supabase-server', () => ({
  getSupabaseServerClient: mocks.getSupabaseServerClient,
}));

vi.mock('../observability/logger', () => ({
  logger: { warn: mocks.warn, error: mocks.error },
}));

import { authenticateToken, requireAdmin } from './auth-middleware';

function createRequest() {
  return {
    headers: { authorization: 'Bearer valid-test-token' },
    method: 'GET',
    baseUrl: '/api/admin',
    path: '/overview',
    body: {},
  } as any;
}

function createResponse() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return res;
}

function configureSupabase(role: string | null, profileError: unknown = null) {
  const authClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'person@example.com',
            user_metadata: { role: 'admin', name: 'Metadata Name' },
          },
        },
        error: null,
      }),
    },
  };

  const profileQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: role ? { role, name: 'Persisted Name' } : null,
      error: profileError,
    }),
  };

  mocks.getSupabaseServerClient.mockImplementation((token?: string) =>
    token ? { from: vi.fn(() => profileQuery) } : authClient
  );

  return { authClient, profileQuery };
}

describe('authenticateToken admin role resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'production';
    delete process.env.ENABLE_DEV_AUTH_BYPASS;
  });

  it('uses the persisted admin role, not user_metadata', async () => {
    const { profileQuery } = configureSupabase('admin');
    const req = createRequest();
    const res = createResponse();
    const next = vi.fn();

    await authenticateToken(req, res, next);

    expect(profileQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
    expect(req.user).toMatchObject({
      id: 'user-123',
      role: 'admin',
      name: 'Persisted Name',
    });
    expect(next).toHaveBeenCalledOnce();
  });

  it('does not grant admin when the persisted profile is a citizen', async () => {
    configureSupabase('citizen');
    const req = createRequest();
    const res = createResponse();
    const next = vi.fn();

    await authenticateToken(req, res, next);
    requireAdmin(req, res, vi.fn());

    expect(req.user.role).toBe('citizen');
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'Acesso restrito a administradores' });
    expect(next).toHaveBeenCalledOnce();
  });

  it('fails closed to citizen when the profile lookup fails', async () => {
    configureSupabase(null, new Error('profile lookup failed'));
    const req = createRequest();
    const res = createResponse();
    const next = vi.fn();

    await authenticateToken(req, res, next);

    expect(req.user.role).toBe('citizen');
    expect(mocks.warn).toHaveBeenCalledWith(
      'auth',
      'middleware',
      'profile_role_fetch_fail',
      'Falha ao consultar a role persistida; aplicando privilégio mínimo.'
    );
    expect(next).toHaveBeenCalledOnce();
  });
});
