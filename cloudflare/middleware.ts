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
