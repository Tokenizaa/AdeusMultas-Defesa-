import { Router } from 'express';
import { authenticateToken } from '../middleware/auth-middleware';
import { logger } from '../observability/logger';

const router = Router();

/**
 * GET /api/auth/me
 * Returns authenticated user info with role from user_profiles (using service_role)
 * Frontend uses this instead of direct Supabase query to avoid RLS issues.
 */
router.get('/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    // authenticateToken já validou o JWT e resolveu a role persistida em user_profiles.
    // Não repetir a consulta sem JWT: isso usa contexto anon e pode falhar por RLS.
    const role = user.role || 'citizen';

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
