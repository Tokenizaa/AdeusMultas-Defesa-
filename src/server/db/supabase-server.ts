/**
 * @file supabase-server.ts
 * Supabase Server-Side Client (Dual-Engine)
 *
 * Client único reutilizável para a camada de dados do servidor.
 * Segue o padrão do vector-store.ts:
 *  - Usa configService (process.env) para resolver URL + chave.
 *  - Prefere SUPABASE_SERVICE_ROLE_KEY (backend), com fallback para anon.
 *  - Se não configurado ou inválido, retorna null — os repositories
 *    operam via store local (memória) sem quebrar o fluxo.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { configService } from '../config/config-service.ts';
import { logger } from '../observability/logger.ts';
import { Database } from '../../types/supabase.ts';

let clientInstance: SupabaseClient<Database> | null = null;
let initialized = false;

export function getSupabaseServerClient(): SupabaseClient<Database> | null {
  if (initialized) return clientInstance;
  initialized = true;

  const url = configService.get('VITE_SUPABASE_URL');
  const serviceKey =
    configService.get('SUPABASE_SERVICE_ROLE_KEY') ||
    configService.get('VITE_SUPABASE_ANON_KEY');

  if (url && serviceKey && url.startsWith('https://')) {
    try {
      clientInstance = createClient<Database>(url, serviceKey);
      logger.info('supabase', 'db_server', 'init', 'Supabase server client conectado.');
    } catch (err: any) {
      logger.warn('supabase', 'db_server', 'init', `Falha ao conectar Supabase: ${err.message}. Operando via Store local.`);
      clientInstance = null;
    }
  } else {
    logger.info('supabase', 'db_server', 'init', 'Supabase não configurado. Operando via Store local (memória).');
    clientInstance = null;
  }

  return clientInstance;
}
