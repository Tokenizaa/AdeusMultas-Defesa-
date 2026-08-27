/**
 * @file meta-token-renewal.worker.ts
 * Worker de renovação automática de Meta Page Access Tokens.
 *
 * Executa a cada 24h, buscando tokens que expiram em até 7 dias e
 * renovando-os via endpoint OAuth do Meta Graph.
 */

import { getSupabaseServerClient } from '../../../server/db/supabase-server';
import { logger } from '../../../server/observability/logger';

const META_GRAPH_VERSION = 'v26.0';
const RENEWAL_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h
const RENEWAL_THRESHOLD_DAYS = 7;

let intervalHandle: ReturnType<typeof setInterval> | null = null;

async function runRenewal(): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    logger.warn('meta', 'token-renewal', 'missing-client', 'Supabase server client indisponível. Renovação pulada.');
    return;
  }

  const cutoff = new Date(Date.now() + RENEWAL_THRESHOLD_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: tokens, error: fetchError } = await supabase
    .from('meta_tokens')
    .select('id, page_id, page_name, access_token, token_type, expires_at')
    .lte('expires_at', cutoff);

  if (fetchError) {
    logger.error('meta', 'token-renewal', 'fetch-failed', 'Erro ao listar tokens Meta expirando.', {
      error: fetchError.message,
    });
    return;
  }

  if (!tokens || tokens.length === 0) {
    logger.info('meta', 'token-renewal', 'idle', 'Nenhum token Meta expirando dentro do limite de 7 dias.');
    return;
  }

  for (const token of tokens) {
    try {
      const appId = process.env.META_APP_ID;
      const appSecret = process.env.META_APP_SECRET;

      if (!appId || !appSecret) {
        logger.warn('meta', 'token-renewal', 'missing-env', 'Credenciais Meta ausentes. Pulando renovação.');
        continue;
      }

      const endpoint = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token`);
      endpoint.searchParams.set('grant_type', 'fb_exchange_token');
      endpoint.searchParams.set('client_id', appId);
      endpoint.searchParams.set('client_secret', appSecret);
      endpoint.searchParams.set('fb_exchange_token', token.access_token);

      const response = await fetch(endpoint.toString());
      if (!response.ok) {
        const raw = await response.text();
        logger.warn('meta', 'token-renewal', 'exchange-failed', `Falha ao renovar token da página ${token.page_name}`, {
          page_id: token.page_id,
          status: response.status,
          body: raw.slice(0, 500),
        });
        continue;
      }

      const payload = await response.json();
      const renewedToken = payload.access_token as string | undefined;
      const expiresIn = payload.expires_in as number | undefined;

      if (!renewedToken) {
        logger.warn('meta', 'token-renewal', 'empty-token', `Renovação retornou sem access_token para ${token.page_name}`, {
          page_id: token.page_id,
          payload,
        });
        continue;
      }

      const update: Record<string, any> = {
        access_token: renewedToken,
      };

      if (typeof expiresIn === 'number') {
        update.expires_at = new Date(Date.now() + expiresIn * 1000).toISOString();
      }

      const { error: updateError } = await supabase
        .from('meta_tokens')
        .update(update)
        .eq('page_id', token.page_id);

      if (updateError) {
        logger.error('meta', 'token-renewal', 'update-failed', `Erro ao persistir token renovado de ${token.page_name}`, {
          page_id: token.page_id,
          error: updateError.message,
        });
        continue;
      }

      logger.info('meta', 'token-renewal', 'renewed', `Token Meta renovado com sucesso para ${token.page_name}`, {
        page_id: token.page_id,
        expires_at: (update as Record<string, string | null>).expires_at ?? null,
      });
    } catch (err: any) {
      logger.error('meta', 'token-renewal', 'unexpected', `Erro inesperado ao renovar token de ${token.page_name}`, {
        page_id: token.page_id,
        error: err.message,
      });
    }
  }
}

export function startMetaTokenRenewal(): void {
  if (intervalHandle) return;

  runRenewal().catch(() => {
    // Erros já são logados por token; o worker não deve quebrar o bootstrap.
  });

  intervalHandle = setInterval(() => {
    runRenewal().catch(() => {
      // Mantém o worker vivo mesmo com falhas pontuais.
    });
  }, RENEWAL_INTERVAL_MS);

  logger.info('meta', 'token-renewal', 'started', 'Worker de renovação de tokens Meta iniciado.', {
    intervalMs: RENEWAL_INTERVAL_MS,
  });
}