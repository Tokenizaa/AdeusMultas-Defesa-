import { createClient } from '@supabase/supabase-js';

/** Interface mínima do binding ASSETS (evita depender de @cloudflare/workers-types). */
export interface AssetsBinding {
  fetch: (request: Request) => Promise<Response>;
}

export interface Env {
  ASSETS: AssetsBinding;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  VITE_SUPABASE_ANON_KEY: string;
}

/** Cliente com service_role — bypass RLS (operações de backend). */
export function createSupabaseAdminClient(env: Env) {
  return createClient<any>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Cliente com chave anônima — usado para verificar tokens JWT do Supabase. */
export function createSupabaseAnonClient(env: Env) {
  return createClient<any>(env.SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}