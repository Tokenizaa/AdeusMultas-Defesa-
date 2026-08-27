/**
 * @file gateway/pagbank-adapter.ts
 * PagBank Adapter — Implementa PaymentGateway usando o PagBankIntegrationService existente.
 *
 * PRESERVA TODO O FUNCIONAMENTO ATUAL: delega para o PagBankIntegrationService
 * que já funciona, sem modificar seu comportamento interno. Apenas adapta
 * os inputs/outputs para o contrato comum do PaymentGateway.
 *
 * REGRA: Este adapter é o queProcessa pagamentos criados ANTES da troca de gateway.
 * Mesmo que o admin mude para GGPIXAPI, pagamentos existentes continuam aqui.
 */

import QRCode from 'qrcode';
import { eventBus, EventTopics } from '../../../core/events/topics';
import { pagBankIntegration, PagBankOrderResult } from '../pagbank';
import { logger } from '../../observability/logger';
import {
  PaymentGateway,
  GatewayId,
  GatewayCreatePixInput,
  GatewayCreateCreditCardInput,
  GatewayPixResult,
  GatewayCreditCardResult,
  GatewayPaymentStatus,
  GatewayPaymentStatusResult,
  NormalizedWebhookEvent,
  GatewayCreatePixInput as _GCI,
} from './types';

/** Mapeamento de status PagBank → status normalizado. */
function mapPagBankStatus(status: string): GatewayPaymentStatus {
  const map: Record<string, GatewayPaymentStatus> = {
    PENDING: 'PENDING',
    WAITING: 'WAITING',
    AUTHORIZED: 'AUTHORIZED',
    PAID: 'PAID',
    DECLINED: 'DECLINED',
    CANCELED: 'CANCELED',
    CANCELLED: 'CANCELED',
    REFUNDED: 'REFUNDED',
    PROCESSING: 'WAITING',
    INITIAL: 'PENDING',
  };
  return map[status] || 'PENDING';
}

/**
 * Converte resultado interno do PagBank para o formato normalizado do gateway.
 */
function toGatewayPixResult(order: PagBankOrderResult, gateway: GatewayId): GatewayPixResult {
  return {
    gatewayTransactionId: order.orderId,
    referenceId: order.referenceId,
    gateway,
    status: mapPagBankStatus(order.status),
    amountInCents: Math.round(order.amount * 100),
    pixCopyPaste: order.qrCodeText || '',
    qrCodeUrl: order.qrCodeUrl,
    qrCodeDataUrl: order.qrCodeDataUrl,
    expiresAt: order.expiresAt,
    createdAt: order.createdAt,
  };
}

export class PagBankAdapter implements PaymentGateway {
  readonly id: GatewayId = 'pagbank';
  readonly displayName = 'PagBank / PagSeguro';

  isConfigured(): boolean {
    const token = process.env.PAGBANK_TOKEN || process.env.PAGSEGURO_TOKEN || '';
    return Boolean(token && !token.startsWith('mock_'));
  }

  async createPix(input: GatewayCreatePixInput): Promise<GatewayPixResult> {
    const order = await pagBankIntegration.createPixOrder({
      caseId: input.caseId,
      referenceId: input.referenceId,
      customer: {
        name: input.payer.name || 'Condutor DefesAi',
        email: input.payer.email || 'contato@defesai.com.br',
        taxId: input.payer.document || '12345678909',
        phone: input.payer.phone ? {
          area: input.payer.phone.substring(0, 2),
          number: input.payer.phone.substring(2),
        } : undefined,
      },
      amount: input.amountInCents / 100, // PagBank recebe em float BRL
      description: input.description,
      notificationUrls: input.webhookUrl ? [input.webhookUrl] : undefined,
    });

    return toGatewayPixResult(order, 'pagbank');
  }

  async createCreditCard(input: GatewayCreateCreditCardInput): Promise<GatewayCreditCardResult> {
    const order = await pagBankIntegration.createCreditCardOrder({
      caseId: input.caseId,
      referenceId: input.referenceId,
      customer: {
        name: input.payer.name || 'Condutor DefesAi',
        email: input.payer.email || 'contato@defesai.com.br',
        taxId: input.payer.document || '12345678909',
      },
      amount: input.amountInCents / 100,
      installments: input.installments,
      cardToken: input.cardToken,
      authenticationMethod: input.authenticationMethod,
      softDescriptor: input.softDescriptor,
      notificationUrls: input.webhookUrl ? [input.webhookUrl] : undefined,
    });

    return {
      gatewayTransactionId: order.orderId,
      referenceId: order.referenceId,
      gateway: 'pagbank',
      status: mapPagBankStatus(order.status),
      amountInCents: Math.round(order.amount * 100),
      createdAt: order.createdAt,
      threeDsUrl: order.threeDsUrl,
      threeDsChallengeRequired: order.threeDsChallengeRequired,
    };
  }

  async getPaymentStatus(gatewayTransactionId: string): Promise<GatewayPaymentStatusResult> {
    const order = pagBankIntegration.getOrder(gatewayTransactionId);
    return {
      gatewayTransactionId,
      gateway: 'pagbank',
      status: order ? mapPagBankStatus(order.status) : 'PENDING',
      paidAt: order?.status === 'PAID' ? new Date().toISOString() : undefined,
    };
  }

  processWebhook(
    rawBody: string,
    headers: Record<string, string | undefined>,
    body: unknown
  ): NormalizedWebhookEvent {
    const payload = body as {
      id?: string;
      reference_id?: string;
      charges?: Array<{
        id?: string;
        reference_id?: string;
        status?: string;
        amount?: { value?: number };
        payment_method?: { type?: string };
        paid_at?: string;
      }>;
    };

    const signature = headers['x-hub-signature-256'] ||
                      headers['x-pagbank-signature'] ||
                      headers['x-authenticity-token'];

    // Delegar verificação de assinatura para o service existente
    const result = pagBankIntegration.processWebhook(rawBody, signature, payload as any);

    const firstCharge = payload.charges?.[0];
    const amountValue = firstCharge?.amount?.value || 0;

    return {
      gatewayEventId: payload.id || `wh_pagbank_${Date.now()}`,
      gateway: 'pagbank',
      gatewayTransactionId: result.orderId || payload.id || '',
      referenceId: payload.reference_id || firstCharge?.reference_id || undefined,
      status: mapPagBankStatus(firstCharge?.status || 'PENDING'),
      transactionType: firstCharge?.payment_method?.type || 'PIX',
      amountInCents: amountValue,
      paidAt: firstCharge?.paid_at || undefined,
      rawPayload: body,
      isDuplicate: result.isDuplicate,
    };
  }
}

export const pagbankAdapter = new PagBankAdapter();
