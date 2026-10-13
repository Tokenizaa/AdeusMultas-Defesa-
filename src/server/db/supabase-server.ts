/**
 * @file supabase-server.ts
 * Supabase Server-Side Client (Dual-Engine)
 *
 * Client único reutilizável para a camada de dados do servidor.
 * Segue o padrão do vector-store.ts:
 *  - Usa o projeto Supabase canônico definido pelo runtime.
 *  - Usa exclusivamente SUPABASE_SERVICE_ROLE_KEY para operações server-side.
 *    O cliente anon deve ser criado separadamente apenas para validação de JWT.
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
 */
function ensureClient(): SupabaseClient<Database> | null {
  if (clientInstance) return clientInstance;

  // O projeto de dados é único e canônico; não aceitar URLs históricas do ambiente.
  const url =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    configService.get('SUPABASE_URL') ||
    configService.get('VITE_SUPABASE_URL');
  const serviceRoleKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    configService.get('SUPABASE_SECRET_KEY') ||
    configService.get('SUPABASE_SERVICE_ROLE_KEY');
  const serviceKey = serviceRoleKey;

  if (url && serviceKey) {
    try {
      clientInstance = createClient<Database>(url, serviceKey);
      logger.info('supabase', 'db_server', 'init', 'Supabase server client conectado.');
    } catch (err: any) {
      logger.error('supabase', 'db_server', 'init', `Falha ao inicializar Supabase: ${err.message}.`);
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
