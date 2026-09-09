/**
 * @file gateway/webhook-handler.ts
 * Webhook Handler — Ponto de entrada único para webhooks de todos os gateways.
 *
 * Detecta automaticamente qual gateway originou o webhook, delega para o
 * adapter correto e sincroniza a PaymentAttempt persistida sem assumir que o
 * gateway atualmente ativo é o gateway que criou a cobrança.
 */

import { GatewayId, NormalizedWebhookEvent } from './types';
import { gatewayManager } from './gateway-manager';
import { logger } from '../../observability/logger';
import { paymentOrderAttemptRepository } from '../../db/payment-order-attempt-repository';

export function detectGatewayFromPath(path: string): GatewayId | null {
  const normalized = path.toLowerCase();
  if (normalized.includes('pagbank')) return 'pagbank';
  if (normalized.includes('ggpix')) return 'ggpixapi';
  return null;
}

export function detectGatewayFromPayload(body: unknown): GatewayId | null {
  if (!body || typeof body !== 'object') return null;
  const obj = body as Record<string, unknown>;

  if (Array.isArray(obj.charges) || ('reference_id' in obj && 'created_at' in obj)) {
    return 'pagbank';
  }

  if ('transactionId' in obj && 'type' in obj && 'status' in obj) {
    return 'ggpixapi';
  }

  return null;
}

export interface WebhookProcessResult {
  event: NormalizedWebhookEvent;
  gatewayId: GatewayId;
  signatureValid: boolean;
}

function normalizeAttemptStatus(status: string): 'pending' | 'waiting' | 'authorized' | 'paid' | 'declined' | 'canceled' | 'refunded' {
  const normalized = status.toLowerCase();
  if (normalized === 'paid') return 'paid';
  if (normalized === 'authorized') return 'authorized';
  if (normalized === 'declined') return 'declined';
  if (normalized === 'canceled' || normalized === 'cancelled') return 'canceled';
  if (normalized === 'refunded') return 'refunded';
  if (normalized === 'waiting') return 'waiting';
  return 'pending';
}

async function persistWebhookAttempt(event: NormalizedWebhookEvent): Promise<void> {
  if (!event.gatewayTransactionId) return;

  const attempt = await paymentOrderAttemptRepository.findAttemptByProviderTransactionId(event.gatewayTransactionId);
  if (!attempt) {
    logger.warn('payments', 'webhook_handler', 'attempt_not_found', 'Webhook received without a persisted PaymentAttempt', {
      gateway: event.gateway,
      gatewayTransactionId: event.gatewayTransactionId,
      gatewayEventId: event.gatewayEventId,
    });
    return;
  }

  // Do not allow a webhook from another provider to mutate this attempt.
  if (attempt.gateway !== event.gateway) {
    throw new Error(
      `Webhook gateway mismatch: attempt=${attempt.gateway} event=${event.gateway} transaction=${event.gatewayTransactionId}`
    );
  }

  await paymentOrderAttemptRepository.updateAttemptProviderData(attempt.id, {
    providerTransactionId: event.gatewayTransactionId,
    referenceId: event.referenceId,
    status: normalizeAttemptStatus(event.status),
  });

  await paymentOrderAttemptRepository.updatePaymentOrder(attempt.paymentOrderId, {
    providerOrderId: event.gatewayTransactionId,
    referenceId: event.referenceId,
    status: event.status,
    paidAt: event.paidAt,
  });
}

export function processGatewayWebhook(
  requestPath: string,
  rawBody: string,
  headers: Record<string, string | undefined>,
  body: unknown
): WebhookProcessResult | null {
  let gatewayId = detectGatewayFromPath(requestPath);

  if (!gatewayId) {
    gatewayId = detectGatewayFromPayload(body);
  }

  if (!gatewayId) {
    logger.warn('payments', 'webhook_handler', 'detect', 'Could not identify gateway from webhook', {
      path: requestPath,
    });
    return null;
  }

  const gateway = gatewayManager.getGateway(gatewayId);
  if (!gateway) {
    logger.error('payments', 'webhook_handler', 'process', `Gateway '${gatewayId}' not registered`, {
      path: requestPath,
    });
    return null;
  }

  try {
    const event = gateway.processWebhook(rawBody, headers, body);

    // Phase 3 persistence boundary: webhook state is attached to the durable
    // attempt identified by provider transaction, never to the active gateway.
    // This is deliberately limited to payment persistence; case reconciliation
    // remains the responsibility of the ordered Phase 4 reconciliation layer.
    void persistWebhookAttempt(event).catch((error) => {
      logger.error('payments', 'webhook_handler', 'attempt_persistence', 'Failed to persist webhook state on PaymentAttempt', {
        gateway: gatewayId,
        gatewayTransactionId: event.gatewayTransactionId,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    logger.info('payments', 'webhook_handler', 'process', `Webhook processed from ${gatewayId}`, {
      gatewayEventId: event.gatewayEventId,
      gatewayTransactionId: event.gatewayTransactionId,
      paymentStatus: event.status,
      isDuplicate: event.isDuplicate,
    });

    return {
      event,
      gatewayId,
      signatureValid: true,
    };
  } catch (err: any) {
    const errorMsg = err?.message || '';
    const isSignatureError =
      errorMsg.includes('Assinatura') ||
      errorMsg.includes('signature') ||
      errorMsg.includes('HMAC') ||
      errorMsg.includes('inválida') ||
      errorMsg.includes('ausente') ||
      errorMsg.includes('obrigatório');

    if (isSignatureError) {
      logger.warn('payments', 'webhook_handler', 'signature_invalid', `Invalid webhook signature for ${gatewayId}`, {
        error: errorMsg,
        path: requestPath,
      });
      return {
        event: null as any,
        gatewayId,
        signatureValid: false,
      };
    }

    logger.error('payments', 'webhook_handler', 'process', `Webhook processing failed for ${gatewayId}`, {
      error: errorMsg,
      path: requestPath,
    });
    return null;
  }
}

export function gatewaySupportsCreditCard(): boolean {
  try {
    const activeGateway = gatewayManager.getActiveGateway();
    return activeGateway.createCreditCard !== undefined;
  } catch {
    return false;
  }
}
