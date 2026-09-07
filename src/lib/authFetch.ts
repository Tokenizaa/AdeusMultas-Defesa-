import { supabase } from './supabase';

/**
 * authFetch — wrapper do fetch nativo.
 *
 * Em produção, a identidade é exclusivamente o access token da sessão
 * Supabase. Nenhum header x-user-* ou token local sintético é aceito/enviado.
 * Sem sessão, o comportamento permanece anônimo.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);

  try {
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers.set('Authorization', `Bearer ${session.access_token}`);
      }
    }
  } catch {
    // Best-effort: sem sessão válida, a requisição segue anônima.
  }

  return fetch(url, { ...options, headers });
}
