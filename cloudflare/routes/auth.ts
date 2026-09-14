import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../supabase';
import { createSupabaseAdminClient } from '../supabase';
import { authenticateToken, type AuthenticatedUser } from '../middleware';

export const authRoutes = new Hono<{ Bindings: Env; Variables: { user?: AuthenticatedUser } }>();

// GET /api/auth/me — retorna usuário autenticado com role real do user_profiles
authRoutes.get('/auth/me', authenticateToken, async (c) => {
  const user = c.get('user')!;

  let roleFromProfile: string | undefined;
  const supabaseAdmin = createSupabaseAdminClient(c.env);
  try {
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('email', user.email)
      .maybeSingle();

    if (!profileError && profileData?.role) {
      roleFromProfile = profileData.role;
    }
  } catch {
    // continua com role do token (fail-soft no perfil, nunca falha o /me)
  }

  const role = roleFromProfile || user.role || 'citizen';

  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role,
  });
});

export default authRoutes;