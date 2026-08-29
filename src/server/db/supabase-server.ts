/**
 * @file supabase-server.ts
 * Supabase Server-Side Client (Dual-Engine)
 *
 * Client único reutilizável para a camada de dados do servidor.
 * Segue o padrão do vector-store.ts:
 *  - Usa configService (process.env) para resolver URL + chave.
 *  - Prefere SUPABASE_SERVICE_ROLE_KEY (backend), com fallback para anon.
 *  - Fallback anon é LOUCO-LOGADO como erro: com RLS deny-all nas 14 tabelas
 *    internas (marketing_*, orders, payments, documents, commissions,
 *    collection_runs, commercial_*), backend sem service_role operaria às cegas.
 *    Uso legítimo do fallback: auth-middleware (supabase.auth.getUser/JWT).
 *  - Se não configurado ou inválido, retorna null — os repositories
 *    operam via store local (memória) sem quebrar o fluxo.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { configService } from '../config/config-service';
import { logger } from '../observability/logger';
import { Database } from '../../types/supabase';

let clientInstance: SupabaseClient<Database> | null = null;

/**
 * Inicializa (ou reinicializa) o client Supabase server-side.
 * Se a primeira chamada ocorre antes do dotenv injetar envs,
 * clientInstance fica null — a próxima chamada re-tenta automaticamente.
 *
 * Usa process.env diretamente porque o configService pode ter
 * cacheado valores vazios durante init (antes do dotenv injetar).
 */
function ensureClient(): SupabaseClient<Database> | null {
  if (clientInstance) return clientInstance;

  // Prefer process.env (sempre atualizado) sobre configService (pode ter cache stale)
  const url =
    process.env.VITE_SUPABASE_URL ||
    configService.get('VITE_SUPABASE_URL') ||
    process.env.SUPABASE_URL ||
    configService.get('SUPABASE_URL');
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    configService.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    configService.get('VITE_SUPABASE_ANON_KEY');
  const serviceKey = serviceRoleKey || anonKey;

  if (url && serviceKey && url.startsWith('https://')) {
    if (!serviceRoleKey) {
      // Fallback anon é intencional (auth-middleware usa getUser/JWT), mas com
      // RLS deny-all nas tabelas internas qualquer escrita/leitura do backend
      // via anon falha silenciosamente. Logar erro alto p/ não mascarar setup quebrado.
      logger.error(
        'supabase',
        'db_server',
        'init',
        'SUPABASE_SERVICE_ROLE_KEY ausente: client do servidor usando chave anon. ' +
          'RLS deny-all (14 tabelas internas) bloqueará operações do backend. ' +
          'Configure SUPABASE_SERVICE_ROLE_KEY no .env.',
        { status: 'fallback' }
      );
    }
    try {
      clientInstance = createClient<Database>(url, serviceKey);
      logger.info('supabase', 'db_server', 'init', 'Supabase server client conectado.');
    } catch (err: any) {
      logger.warn('supabase', 'db_server', 'init', `Falha ao conectar Supabase: ${err.message}. Operando via Store local.`);
      clientInstance = null;
    }
  } else {
    clientInstance = null;
  }

  return clientInstance;
}

export function getSupabaseServerClient(): SupabaseClient<Database> | null {
  return ensureClient();
}
