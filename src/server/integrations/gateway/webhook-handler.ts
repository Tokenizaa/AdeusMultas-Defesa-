/**
 * @file gateway/webhook-handler.ts
 * Webhook Handler — Ponto de entrada único para webhooks de todos os gateways.
 *
 * Detecta automaticamente qual gateway originou o webhook com base no path
 * da requisição ou no conteúdo do payload, e delega para o adapter correto.
 *
 * O resultado é sempre um NormalizedWebhookEvent — o restante do sistema
 * (processamento de pagamento, atualização de case, auditoria) opera
 * contra este formato único.
 *
 * REGRA: Webhooks de PagBank continuam no path /api/webhooks/pagbank.
 * Webhooks de GGPIXAPI ficam em /api/webhooks/ggpix.
 * Ambos são normalizados para o mesmo evento interno.
 */

import { GatewayId, NormalizedWebhookEvent } from './types';
import { gatewayManager } from './gateway-manager';
import { logger } from '../../observability/logger';

// ============================================================================
// Detecção de Gateway
// ============================================================================

/**
 * Detecta qual gateway enviou o webhook pelo path da requisição.
 *
 * Mapeamento:
 *   /api/webhooks/pagbank → PagBank
 *   /api/webhooks/ggpix   → GGPIXAPI
 *   /api/payments/webhooks/pagbank → PagBank (alias legado)
 */
export function detectGatewayFromPath(path: string): GatewayId | null {
  const normalized = path.toLowerCase();
  if (normalized.includes('pagbank')) return 'pagbank';
  if (normalized.includes('ggpix')) return 'ggpixapi';
  return null;
}

/**
 * Tenta detectar o gateway pelo conteúdo do payload.
 * Usado como fallback quando o path não é informativo.
 */
export function detectGatewayFromPayload(body: unknown): GatewayId | null {
  if (!body || typeof body !== 'object') return null;
  const obj = body as Record<string, unknown>;

  // PagBank: tem 'charges' array e 'reference_id'
  if (Array.isArray(obj.charges) || ('reference_id' in obj && 'created_at' in obj)) {
    return 'pagbank';
  }

  // GGPIXAPI: tem 'transactionId' e 'type' (PIX_IN, etc.)
  if ('transactionId' in obj && 'type' in obj && 'status' in obj) {
    return 'ggpixapi';
  }

  return null;
}

// ============================================================================
// Processamento Normalizado
// ============================================================================

export interface WebhookProcessResult {
  /** Evento normalizado para processamento downstream. */
  event: NormalizedWebhookEvent;
  /** Qual gateway foi identificado. */
  gatewayId: GatewayId;
  /** Se a assinatura é válida (true para GGPIXAPI que não usa HMAC). */
  signatureValid: boolean;
}

/**
 * Processa um webhook recebido de qualquer gateway.
 *
 * 1. Detecta o gateway (por path ou payload)
 * 2. Delega para o adapter correto
 * 3. Retorna evento normalizado
 *
 * @param requestPath - Path da requisição (ex: '/api/webhooks/pagbank')
 * @param rawBody - Body bruto como string (para verificação de assinatura)
 * @param headers - Headers da requisição
 * @param body - Body parsed como objeto
 */
export function processGatewayWebhook(
  requestPath: string,
  rawBody: string,
  headers: Record<string, string | undefined>,
  body: unknown
): WebhookProcessResult | null {
  // 1. Detectar gateway pelo path
  let gatewayId = detectGatewayFromPath(requestPath);

  // 2. Fallback: detectar pelo payload
  if (!gatewayId) {
    gatewayId = detectGatewayFromPayload(body);
  }

  if (!gatewayId) {
    logger.warn('payments', 'webhook_handler', 'detect', 'Could not identify gateway from webhook', {
      path: requestPath,
    });
    return null;
  }

  // 3. Obter adapter
  const gateway = gatewayManager.getGateway(gatewayId);
  if (!gateway) {
    logger.error('payments', 'webhook_handler', 'process', `Gateway '${gatewayId}' not registered`, {
      path: requestPath,
    });
    return null;
  }

  // 4. Delegar processamento
  try {
    const event = gateway.processWebhook(rawBody, headers, body);

    logger.info('payments', 'webhook_handler', 'process', `Webhook processed from ${gatewayId}`, {
      gatewayEventId: event.gatewayEventId,
      gatewayTransactionId: event.gatewayTransactionId,
      paymentStatus: event.status,
      isDuplicate: event.isDuplicate,
    });

    return {
      event,
      gatewayId,
      signatureValid: true, // Assinatura validada pelo adapter
    };
  } catch (err: any) {
    logger.error('payments', 'webhook_handler', 'process', `Webhook processing failed for ${gatewayId}`, {
      error: err.message,
      path: requestPath,
    });
    return null;
  }
}

/**
 * Verifica se o gateway aceita cartão de crédito.
 * Usado pelo Checkout para decidir se exibe a aba Cartão.
 */
export function gatewaySupportsCreditCard(): boolean {
  try {
    const activeGateway = gatewayManager.getActiveGateway();
    return activeGateway.createCreditCard !== undefined;
  } catch {
    return false;
  }
}
