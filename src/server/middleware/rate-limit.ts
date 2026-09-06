import rateLimit from 'express-rate-limit';
import { authenticateToken, requireAuth } from './auth-middleware';

/**
 * Global rate limiter: disabled in DEV mode, 200 requests per IP per 15-minute window in production.
 */
export const globalLimiter = process.env.NODE_ENV !== 'production'
  ? (_req: any, _res: any, next: any) => next() // no-op in dev
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 200,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' },
    });

/**
 * Strict rate limiter: 20 requests per IP per 15-minute window.
 * Applied to /api/ai and /api/auth endpoints.
 *
 * The /api/ai mount is legacy and does not declare authentication itself.
 * Require a real authenticated session only for that mount, while leaving
 * /api/auth public so login/refresh endpoints keep their existing behavior.
 */
const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de requisições excedido para este serviço.' },
});

export const strictLimiter = (req: any, res: any, next: any) => {
  strictRateLimiter(req, res, (rateLimitError?: any) => {
    if (rateLimitError) {
      next(rateLimitError);
      return;
    }

    // app.ts mounts the same limiter under /api/ai and /api/auth.
    // Authenticate only the AI mount so authentication routes remain public.
    if (req.baseUrl === '/api/ai') {
      authenticateToken(req, res, (authError?: any) => {
        if (authError) {
          next(authError);
          return;
        }
        requireAuth(req, res, next);
      });
      return;
    }

    next();
  });
};
