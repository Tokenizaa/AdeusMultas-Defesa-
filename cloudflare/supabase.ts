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
  EVOLUTION_API_URL?: string;
  EVOLUTION_API_KEY?: string;
  EVOLUTION_INSTANCE_NAME?: string;
  EVOLUTION_WEBHOOK_SECRET?: string;
  GGPIX_API_KEY?: string;
  GGPIX_ENABLED?: string;
  GGPIX_WEBHOOK_ALLOWED_IPS?: string;
  FETCH?: typeof fetch;
}

/** Helper to get env binding with fallback to process.env for testing. */
function getEnvBinding<T extends keyof Env>(cEnv: Env | undefined, key: T): Env[T] {
  if (cEnv && (cEnv as any)[key] !== undefined) return (cEnv as any)[key];
  // @ts-ignore - process.env values are strings
  return process.env[key] as any;
}

/** Cliente com service_role — bypass RLS (operações de backend). */
export function createSupabaseAdminClient(cEnv: Env | undefined = undefined) {
  const url = getEnvBinding(cEnv, 'SUPABASE_URL');
  const key = getEnvBinding(cEnv, 'SUPABASE_SERVICE_ROLE_KEY');
  return createClient<any>(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Cliente com chave anônima — usado para verificar tokens JWT do Supabase. */
export function createSupabaseAnonClient(cEnv: Env | undefined = undefined) {
  const url = getEnvBinding(cEnv, 'SUPABASE_URL');
  const key = getEnvBinding(cEnv, 'VITE_SUPABASE_ANON_KEY');
  return createClient<any>(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
