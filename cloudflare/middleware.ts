import type { Context, Next } from 'hono';
import type { Env } from './supabase';
import { createSupabaseAdminClient, createSupabaseAnonClient } from './supabase';
import { adapterError } from '../src/shared/api/adapters';

export interface AuthenticatedUser { id: string; email: string; role: string; name?: string }
type AppContext = Context<{ Bindings: Env; Variables: { user?: AuthenticatedUser } }>;

export const authenticateToken = async (c: AppContext, next: Next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return adapterError(c, 'UNAUTHENTICATED', 'Não autenticado', 401);
  const token = authHeader.slice(7).trim();
  const supabase = createSupabaseAnonClient(c.env);
  const { data: { user }, error } = (await supabase.auth.getUser(token)) as any;
  if (error || !user) return adapterError(c, 'UNAUTHENTICATED', 'Não autenticado', 401);

  // Authorization comes from the server-owned user_profiles table, never from
  // user_metadata, which is user-editable and therefore unsafe for access control.
  const admin = createSupabaseAdminClient(c.env);
  const { data: profile, error: profileError } = await admin
    .from('user_profiles')
    .select('user_id,name,email,role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return adapterError(c, 'FORBIDDEN', 'Perfil de acesso não encontrado', 403);
  }

  c.set('user', {
    id: user.id,
    email: profile.email || user.email || '',
    role: profile.role,
    name: profile.name,
  });
  await next();
};

export const requireAdmin = async (c: AppContext, next: Next) => {
  const user = c.get('user') as AuthenticatedUser | undefined;
  if (!user || user.role !== 'admin') return adapterError(c, 'FORBIDDEN', 'Acesso restrito a administradores', 403);
  await next();
};

/**
 * Middleware to log requests to the request_logs table.
 * Logs method, path, status, user_id, user_agent, ip, latency.
 * Does not log request/response bodies to avoid excessive storage.
 */
export const logRequest = async (c: AppContext, next: Next) => {
  const start = Date.now();
  const path = c.req.path;
  const method = c.req.method;
  const userAgent = c.req.header('user-agent') ?? null;
  const ipAddress = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? null;

  // We'll try to get user id after authentication (may be undefined if not yet set)
  let userId: string | null = null;
  try {
    const user = c.get('user');
    if (user && typeof user === 'object' && 'id' in user) {
      userId = (user as { id: string }).id;
    }
  } catch (_) {
    // ignore
  }

  let res: Response;
  let error: string | null = null;
  let status: number = 500; // default error
  try {
    res = await next();
    status = res.status;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    // re-throw after logging
    throw err;
  } finally {
    const latencyMs = Date.now() - start;

    // Attempt to log; swallow any logging errors to not affect the main response
    try {
      const supabase = createSupabaseAdminClient(c.env);
      await supabase
        .from('request_logs')
        .insert({
          method,
          path,
          status,
          user_id: userId,
          user_agent: userAgent,
          ip_address: ipAddress,
          latency_ms,
          // optionally we could store limited bodies, but omitted for simplicity
          request_body: null,
          response_body: null,
          error,
        });
    } catch (logErr) {
      // Log to console as fallback
      console.error('[request logging failed]', logErr);
    }
  }

  return res;
};
