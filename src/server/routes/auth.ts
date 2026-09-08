import { Router } from 'express';
import { authenticateToken } from '../middleware/auth-middleware';
import { getSupabaseServerClient } from '../db/supabase-server';
import { logger } from '../observability/logger';

const router = Router();

/**
 * GET /api/auth/me
 * Returns authenticated user info with role from user_profiles.
 */
router.get('/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

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

    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role,
    });
  } catch (err: any) {
    logger.error('auth', 'routes', 'me_error', err.message);
    return res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

export default router;
