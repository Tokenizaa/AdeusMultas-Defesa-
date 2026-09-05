/**
 * @file auth-middleware.ts
 * Express JWT Authentication & Authorization Middleware
 * Validates Supabase JWTs, enforces auth on protected routes, and provides admin guard.
 *
 * P0 hardening: identidade/role NUNCA são derivadas de headers de cliente
 * (x-user-id / x-user-role / x-user-email / x-user-name) nem de tokens
 * sintáticos `local_*` — todos forjáveis. Em produção, somente um token
 * validado pelo Supabase preenche req.user. Bypasses de desenvolvimento
 * são explicitamente condicionados a NODE_ENV !== 'production'.
 */

import { Request, Response, NextFunction } from 'express';
import { getSupabaseServerClient } from '../db/supabase-server';
import { logger } from '../observability/logger';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  name?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Middleware that validates the Supabase JWT from the Authorization header.
 * - Missing token → 401 via requireAuth (req.user undefined)
 * - Invalid/expired token → 401 via requireAuth (req.user undefined)
 * - Valid token → populates req.user and calls next()
 * - Dev/test only, never in production: mock fallback without Supabase or auto-login via ADMIN_TEST_LOGIN
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const token =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : null;

    // P0: headers x-user-* são forjáveis e NUNCA estabelecem identidade.
    // Tokens `local_*` idem — são descartados como fonte de identidade.
    // O único caminho para req.user é um token validado pelo Supabase
    // (ou, em ambiente NÃO produtivo, um bypass explícito abaixo).
    const isProduction = process.env.NODE_ENV === 'production';

    // 1. Supabase verification — mecanismo real de autenticação.
    const supabase = getSupabaseServerClient();

    if (token && supabase) {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser(token);

        if (user && !error) {
          const role = (user.user_metadata?.role as string) || 'citizen';
          req.user = {
            id: user.id,
            email: user.email || '',
            role,
            name: user.user_metadata?.name,
          };
          return next();
        }
      } catch (err: any) {
        logger.warn(
          'auth',
          'middleware',
          'token_verify_fail',
          `Falha ao validar token: ${err.message}`
        );
      }
    }

    // 2. Bypasses de desenvolvimento/teste — NUNCA executados em produção.
    //    Preservados apenas para os fluxos locais/E2E existentes.
    //    REMOVIDO EM FASE 6: fallback de dev que criava usuário mock em produção.
    //    Em produção, somente token Supabase válido preenche req.user.
    if (!isProduction) {
      // 2a. Fallback local quando Supabase não está configurado (dev).
      if (!supabase) {
        req.user = {
          id: 'usr_admin_defesai',
          email: 'admin@www.defesai.shop',
          role: 'admin',
          name: 'Administrador DefesAi',
        };
        return next();
      }

      // 2b. Auto-login explícito via ADMIN_TEST_LOGIN/ADMIN_TEST_PASSWORD do .env (E2E).
      if (process.env.ADMIN_TEST_LOGIN && !req.user) {
        req.user = {
          id: 'usr_admin_e2e',
          email: process.env.ADMIN_TEST_LOGIN,
          role: 'admin',
          name: 'Admin Teste (E2E)',
        };
        return next();
      }
    }

    // 3. Não autenticado — req.user permanece undefined.
    req.user = undefined;
    return next();
  } catch (err: any) {
    logger.error('auth', 'middleware', 'unexpected_error', `Erro no auth: ${err.message}`);
    req.user = undefined;
    return next();
  }
}

/**
 * Middleware that enforces the request has a valid authenticated session.
 * Must be used AFTER authenticateToken.
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Não autorizado. Faça login para continuar.' });
    return;
  }
  next();
}

/**
 * Middleware that enforces the request was made by an admin user.
 * Must be used AFTER authenticateToken.
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const user = req.user;

  if (!user) {
    res.status(401).json({ error: 'Não autorizado. Faça login como administrador.' });
    return;
  }

  if (user.role !== 'admin') {
    logger.warn(
      'auth',
      'middleware',
      'admin_access_denied',
      `Tentativa de acesso admin por usuário não autorizado (${user.email})`
    );
    res.status(403).json({ error: 'Acesso restrito a administradores' });
    return;
  }

  next();
}
