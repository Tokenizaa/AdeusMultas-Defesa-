import type { Context, Next } from 'hono';
import type { Env } from './supabase';
import { createSupabaseAnonClient } from './supabase';
import { adapterError } from '../src/shared/api/adapters';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  name?: string;
}

type AppContext = Context<{ Bindings: Env; Variables: { user?: AuthenticatedUser } }>;

/**
 * Middleware de autenticação — valida JWT do Supabase via anon client
 * (getUser), rejeita sem token ou com token inválido (401).
 */
export const authenticateToken = async (c: AppContext, next: Next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return adapterError(c, 'UNAUTHENTICATED', 'Não autenticado', 401);
  }

  const token = authHeader.slice(7).trim();
  const supabase = createSupabaseAnonClient(c.env);

  const { data: { user }, error } = (await supabase.auth.getUser(token)) as any;

  if (error || !user) {
    return adapterError(c, 'UNAUTHENTICATED', 'Não autenticado', 401);
  }

  c.set('user', {
    id: user.id,
    email: user.email || '',
    role: user.user_metadata?.role || 'citizen',
    name: user.user_metadata?.name,
  });

  await next();
};

/** Restringe rota a administradores (403). */
export const requireAdmin = async (c: AppContext, next: Next) => {
  const user = c.get('user') as AuthenticatedUser | undefined;
  if (!user || user.role !== 'admin') {
    return adapterError(c, 'FORBIDDEN', 'Acesso restrito a administradores', 403);
  }
  await next();
};