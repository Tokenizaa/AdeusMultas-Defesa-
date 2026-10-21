/**
 * @file supabase-server.ts
 * Supabase Server-Side Client (Dual-Engine)
 *
 * Dois clientes server-side com papéis estritamente separados:
 *
 * 1. getSupabaseServerClient(accessToken?)
 *    - Usa SUPABASE_ANON_KEY + JWT opcional do usuário.
 *    - Quando accessToken é informado, o JWT é enviado no cabeçalho Authorization
 *      para que a RLS (Row Level Security) seja aplicada no contexto do usuário.
 *    - Sem accessToken, opera com permissões anon (sem contexto de usuário).
 *    - Destinado a operações de usuário final (requests autenticadas via API).
 *
 * 2. getSupabaseAdminClient()
 *    - Usa SUPABASE_SERVICE_ROLE_KEY (bypassa RLS).
 *    - Cliente em cache (service role é estático).
 *    - Reservado a tarefas administrativas server-side: webhooks, jobs assíncronos,
 *      tarefas de manutenção e migrações.
 *    - NUNCA usar para atender requisições diretas de usuário final.
 *
 * Regra de ouro: serviço role só no backend, never exposto ao frontend, e nunca
 * usado para resolver requests de usuário onde RLS deve ser respeitada.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { configService } from '../config/config-service';
import { logger } from '../observability/logger';
import { Database } from '../../types/supabase';

let adminClientInstance: SupabaseClient<Database> | null = null;

/**
 * Resolve a URL do Supabase a partir do ambiente / config service.
 */
function resolveSupabaseUrl(): string | null {
  return (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    configService.get('SUPABASE_URL') ||
    configService.get('VITE_SUPABASE_URL') ||
    null
  );
}

/**
 * Resolve a chave anon (pública) do Supabase.
 */
function resolveAnonKey(): string | null {
  return process.env.SUPABASE_ANON_KEY || configService.get('SUPABASE_ANON_KEY') || null;
}

/**
 * Resolve a chave de service role (administrativa, bypassa RLS).
 */
function resolveServiceRoleKey(): string | null {
  return (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    configService.get('SUPABASE_SECRET_KEY') ||
    configService.get('SUPABASE_SERVICE_ROLE_KEY') ||
    null
  );
}

/**
 * Cria um client Supabase com a chave informada. Quando accessToken é fornecido,
 * define o cabeçalho Authorization: Bearer <token> para que RLS seja aplicada.
 */
function buildClient(url: string, key: string, accessToken?: string): SupabaseClient<Database> | null {
  try {
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return createClient<Database>(url, key, {
      global: { headers },
    });
  } catch (err: any) {
    logger.error('supabase', 'db_server', 'init', `Falha ao inicializar Supabase: ${err.message}.`);
    return null;
  }
}

/**
 * Cliente server-side para operações de usuário.
 * Usa SUPABASE_ANON_KEY e, quando informado, o JWT do usuário para que a RLS seja aplicada.
 * Não é armazenado em cache por token: clientes de usuário diferente nunca devem
 * compartilhar a mesma instância com Authorization de outro usuário.
 */
export function getSupabaseServerClient(accessToken?: string): SupabaseClient<Database> | null {
  const url = resolveSupabaseUrl();
  const key = resolveAnonKey();
  if (!url || !key) return null;
  return buildClient(url, key, accessToken);
}

/**
 * Cliente administrativo server-side.
 * Usa SUPABASE_SERVICE_ROLE_KEY e ignora RLS.
 * Reservado a webhooks, jobs assíncronos e outras tarefas admin server-side.
 * Nunca usar para atender requisições diretas de usuário final.
 */
export function getSupabaseAdminClient(): SupabaseClient<Database> | null {
  if (adminClientInstance) return adminClientInstance;
  const url = resolveSupabaseUrl();
  const key = resolveServiceRoleKey();
  if (!url || !key) {
    adminClientInstance = null;
    return null;
  }
  const client = buildClient(url, key);
  if (client) adminClientInstance = client;
  return adminClientInstance;
}
