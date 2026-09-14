import { createClient } from '@supabase/supabase-js';

/** Interface mínima do binding ASSETS (evita depender de @cloudflare/workers-types). */
export interface AssetsBinding {
  fetch: (request: Request) => Promise<Response>;
}

export interface WorkersAI {
  run: (model: string, input: Record<string, unknown>) => Promise<unknown>;
}

export interface VectorizeBinding {
  query: (vector: number[], options?: Record<string, unknown>) => Promise<{ matches?: unknown[] }>;
  upsert: (vectors: Array<{ id: string; values: number[]; metadata?: Record<string, unknown> }>) => Promise<unknown>;
}

export interface Env {
  ASSETS: AssetsBinding;
  AI: WorkersAI;
  VECTORIZE: VectorizeBinding;
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
