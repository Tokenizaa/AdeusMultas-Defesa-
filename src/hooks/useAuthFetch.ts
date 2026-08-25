import { useCallback } from 'react';
import { supabase, getStoredSession } from '../lib/supabase';

/**
 * useAuthFetch — wrapper aditivo em torno do fetch nativo que injeta os
 * cabeçalhos de identidade da sessão atual, quando existirem:
 *
 *  - Sessão Supabase ativa  → `Authorization: Bearer <access_token>`
 *  - Sessão local (fallback)→ `x-user-id`, `x-user-role`, `x-user-email`,
 *    `x-user-name` + token sintático `Bearer local_<id>_<role>`
 *    (mesmo contrato aceito por src/server/middleware/auth-middleware.ts)
 *
 * Comportamento anônimo PRESERVADO: sem sessão, nenhum header é adicionado
 * e a chamada é idêntica a um fetch normal (sem retry/timeout extras).
 */
export function useAuthFetch() {
  return useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers);
    try {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers.set('Authorization', `Bearer ${session.access_token}`);
        }
      }

      const stored = getStoredSession();
      if (stored) {
        if (stored.id) headers.set('x-user-id', stored.id);
        if (stored.role) headers.set('x-user-role', stored.role);
        if (stored.email) headers.set('x-user-email', stored.email);
        if (stored.name) headers.set('x-user-name', encodeURIComponent(stored.name));
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer local_${stored.id}_${stored.role}`);
        }
      }
    } catch {
      // Best-effort: falha ao montar identidade não deve bloquear a requisição.
    }
    return fetch(url, { ...options, headers });
  }, []);
}
