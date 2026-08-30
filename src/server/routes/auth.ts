import { Router } from 'express';
import { authenticateToken } from '../middleware/auth-middleware';
import { getSupabaseServerClient } from '../db/supabase-server';
import { logger } from '../observability/logger';

const router = Router();

/**
 * GET /api/auth/me
 * Returns authenticated user info with role from user_profiles (using service_role)
 * Frontend uses this instead of direct Supabase query to avoid RLS issues
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    // Fetch role from user_profiles using service_role (bypasses RLS)
    let roleFromProfile: string | undefined;
    const supabase = getSupabaseServerClient();

    if (supabase && user.id) {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (!profileError && profileData?.role) {
          roleFromProfile = profileData.role;
        }
      } catch (profileErr) {
        logger.warn('auth', 'routes', 'profile_fetch_fail', `Falha ao buscar perfil: ${profileErr}`);
      }
    }

    const role = roleFromProfile || user.role || 'citizen';

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role,
    });
  } catch (err: any) {
    logger.error('auth', 'routes', 'me_error', err.message);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

export default router;