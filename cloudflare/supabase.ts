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

export interface RateLimitBinding {
  limit: (options: { key: string }) => Promise<{ success: boolean }>;
}

export interface Env {
  ASSETS: AssetsBinding;
  AI: WorkersAI;
  VECTORIZE: VectorizeBinding;
  ANONYMOUS_CASE_LIMITER?: RateLimitBinding;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  PAGBANK_TOKEN?: string;
  PAGBANK_ENV?: 'sandbox' | 'production';
  PAGBANK_WEBHOOK_SECRET?: string;
  VENO_CLIENT_ID?: string;
  VENO_CLIENT_SECRET?: string;
  VENO_WEBHOOK_SECRET?: string;
  VENO_PRIMARY_GATEWAY?: 'venopag' | 'pagbank';
  APP_URL?: string;
  PAYMENT_MODE?: 'sandbox' | 'production';
  /** Explicit hard stop for payment creation in non-production preview Workers. */
  E2E_SAFE_PREVIEW?: 'true' | 'false';
  VITE_SUPABASE_ANON_KEY?: string;
  EVOLUTION_API_URL?: string;
  EVOLUTION_API_KEY?: string;
  EVOLUTION_INSTANCE_NAME?: string;
  EVOLUTION_WEBHOOK_SECRET?: string;
  FIRECRAWL_API_KEY?: string;
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

function requireBinding(value: string | undefined, name: string): string {
  if (!value?.trim()) throw new Error(`${name} binding is required`);
  return value.trim();
}

/** Cliente privilegiado de backend; a chave secret moderna tem precedência. */
export function createSupabaseAdminClient(cEnv: Env | undefined = undefined) {
  const url = requireBinding(getEnvBinding(cEnv, 'SUPABASE_URL'), 'SUPABASE_URL');
  const key = requireBinding(
    getEnvBinding(cEnv, 'SUPABASE_SECRET_KEY') || getEnvBinding(cEnv, 'SUPABASE_SERVICE_ROLE_KEY'),
    'SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY',
  );
  return createClient<any>(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Cliente com chave anônima — usado para verificar tokens JWT do Supabase. */
export function createSupabaseAnonClient(cEnv: Env | undefined = undefined) {
  const url = requireBinding(getEnvBinding(cEnv, 'SUPABASE_URL'), 'SUPABASE_URL');
  const key = requireBinding(
    getEnvBinding(cEnv, 'VITE_SUPABASE_ANON_KEY') || getEnvBinding(cEnv, 'SUPABASE_ANON_KEY'),
    'VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY',
  );
  return createClient<any>(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
