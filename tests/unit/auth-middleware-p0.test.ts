/**
 * P0 — Autenticação: identidade/autorização não podem ser definidas ou forjadas
 * pelo cliente via headers (x-user-*) ou tokens sintáticos (local_*).
 *
 * Cobre os 8 cenários obrigatórios da Fase 1 + regressão dos bypasses de dev.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { authenticateToken, requireAuth, requireAdmin } from '@/server/middleware/auth-middleware';

const getClientMock = vi.fn();
const getUserMock = vi.fn();

// Controla getSupabaseServerClient: null = Sem Supabase configurado,
// objeto = client fake cujo auth.getUser é controlado por getUserMock.
vi.mock('@/server/db/supabase-server', () => ({
  getSupabaseServerClient: (...args: unknown[]) => getClientMock(...args),
}));

vi.mock('@/server/observability/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

function makeReq(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

function makeRes() {
  const res: any = { statusCode: 0, body: null };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body: unknown) => {
    res.body = body;
    return res;
  };
  return res as Response;
}

const noopNext = (() => undefined) as NextFunction;

function fakeSupabaseWith(user: unknown, error: unknown = null) {
  return {
    auth: {
      getUser: getUserMock.mockResolvedValue({ data: { user }, error }),
    },
  };
}

function validSupabaseUser(overrides: Record<string, unknown> = {}) {
  return {
    id: '014635c5-66c1-4d80-94b3-37a3d5059d3c',
    email: 'motorista@example.com',
    user_metadata: { role: 'citizen', name: 'Carlos Eduardo Silveira' },
    ...overrides,
  };
}

const VALID_TOKEN = 'jwt.supabase.valid';
const LOCAL_ADMIN_TOKEN = 'local_admin_defesai';

describe('P0 autenticação — produção', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ADMIN_TEST_LOGIN', '');
    getClientMock.mockReset();
    getUserMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('1. produção + x-user-id sem Bearer válido → NÃO autentica', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    getClientMock.mockReturnValue(null);
    const req = makeReq({ 'x-user-id': 'usr_forjado', 'x-user-role': 'admin' });

    await authenticateToken(req, makeRes(), noopNext);

    expect(req.user).toBeUndefined();
  });

  it('2. produção + x-user-role: admin sem autenticação válida → NÃO vira admin', async () => {
    getClientMock.mockReturnValue(null);
    const req = makeReq({ 'x-user-role': 'admin' });

    await authenticateToken(req, makeRes(), noopNext);

    expect(req.user).toBeUndefined();

    const res = makeRes();
    let reached = false;
    requireAuth(req, res, (() => {
      reached = true;
    }) as NextFunction);

    // requireAuth: sem req.user → 401
    expect(res.statusCode).toBe(401);
    expect(reached).toBe(false);
  });

  it('3. produção + x-user-email sem autenticação válida → NÃO autentica', async () => {
    getClientMock.mockReturnValue(null);
    const req = makeReq({ 'x-user-email': 'forjado@example.com' });

    await authenticateToken(req, makeRes(), noopNext);

    expect(req.user).toBeUndefined();
  });

  it('4. produção + Authorization: Bearer local_admin_* → NÃO autentica', async () => {
    // Sem Supabase configurado: token local_* é ignorado, sem fallback em produção.
    getClientMock.mockReturnValue(null);
    const req = makeReq({ authorization: `Bearer ${LOCAL_ADMIN_TOKEN}` });

    await authenticateToken(req, makeRes(), noopNext);

    expect(req.user).toBeUndefined();

    // Com Supabase configurado: getUser é chamado com o token e o rejeita.
    getClientMock.mockReturnValue(fakeSupabaseWith(null, { message: 'invalid token' }));
    const req2 = makeReq({ authorization: `Bearer ${LOCAL_ADMIN_TOKEN}` });

    await authenticateToken(req2, makeRes(), noopNext);

    expect(req2.user).toBeUndefined();
  });

  it('5. produção + token Supabase válido → autentica', async () => {
    getClientMock.mockReturnValue(fakeSupabaseWith(validSupabaseUser()));
    const req = makeReq({ authorization: `Bearer ${VALID_TOKEN}` });

    await authenticateToken(req, makeRes(), noopNext);

    expect(req.user).toBeDefined();
    expect(req.user!.id).toBe('014635c5-66c1-4d80-94b3-37a3d5059d3c');
    expect(req.user!.email).toBe('motorista@example.com');
    expect(req.user!.role).toBe('citizen');
  });

  it('6. token inválido/expirado → 401 quando protegido por requireAuth', async () => {
    getClientMock.mockReturnValue(fakeSupabaseWith(null, { message: 'expired' }));
    const req = makeReq({ authorization: `Bearer jwt.expirado.invalido` });

    await authenticateToken(req, makeRes(), noopNext);

    expect(req.user).toBeUndefined();

    const res = makeRes();
    let reached = false;
    requireAuth(req, res, (() => {
      reached = true;
    }) as NextFunction);

    expect(res.statusCode).toBe(401);
    expect(reached).toBe(false);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  it('7. cidadão autenticado NÃO vira admin alterando header x-user-role', async () => {
    getClientMock.mockReturnValue(fakeSupabaseWith(validSupabaseUser()));
    const req = makeReq({
      authorization: `Bearer ${VALID_TOKEN}`,
      'x-user-role': 'admin',
      'x-user-id': 'usr_forjado',
    });

    await authenticateToken(req, makeRes(), noopNext);

    expect(req.user).toBeDefined();
    expect(req.user!.id).toBe('014635c5-66c1-4d80-94b3-37a3d5059d3c');
    expect(req.user!.role).toBe('citizen');
  });

  it('8. requireAdmin bloqueia usuário não-admin com 403', async () => {
    getClientMock.mockReturnValue(fakeSupabaseWith(validSupabaseUser()));
    const req = makeReq({ authorization: `Bearer ${VALID_TOKEN}` });

    await authenticateToken(req, makeRes(), noopNext);

    const res = makeRes();
    let reached = false;
    requireAdmin(req, res, (() => {
      reached = true;
    }) as NextFunction);

    expect(res.statusCode).toBe(403);
    expect(reached).toBe(false);
  });

  it('produção + token ausente sem Supabase → req.user undefined (sem fallback admin)', async () => {
    getClientMock.mockReturnValue(null);
    const req = makeReq({});

    await authenticateToken(req, makeRes(), noopNext);

    expect(req.user).toBeUndefined();
  });

  it('produção + token válido mas getUser falha com erro inesperado → 401', async () => {
    getClientMock.mockReturnValue({
      auth: { getUser: getUserMock.mockRejectedValue(new Error('network')) },
    });
    const req = makeReq({ authorization: `Bearer ${VALID_TOKEN}` });

    await authenticateToken(req, makeRes(), noopNext);

    expect(req.user).toBeUndefined();

    const res = makeRes();
    requireAuth(req, res, noopNext);
    expect(res.statusCode).toBe(401);
  });
});

describe('P0 autenticação — bypasses de desenvolvimento preservados (nunca em produção)', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test');
    getClientMock.mockReset();
    getUserMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('dev sem Supabase configurado → mock admin local preservado', async () => {
    getClientMock.mockReturnValue(null);
    const req = makeReq({});

    await authenticateToken(req, makeRes(), noopNext);

    expect(req.user).toBeDefined();
    expect(req.user!.role).toBe('admin');
  });

  it('dev com token local_* → ainda NÃO autentica via token sintático', async () => {
    getClientMock.mockReturnValue(fakeSupabaseWith(null, { message: 'invalid' }));
    const req = makeReq({ authorization: `Bearer ${LOCAL_ADMIN_TOKEN}` });

    await authenticateToken(req, makeRes(), noopNext);

    expect(req.user).toBeUndefined();
  });
});