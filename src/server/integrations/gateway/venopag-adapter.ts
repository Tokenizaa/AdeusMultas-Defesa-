/**
 * @file gateway/venopag-adapter.ts
 * VenoPag Adapter — Implementa PaymentGateway para o gateway VenoPag.
 *
 * Integra PIX In via API REST do VenoPag (https://venopagments.com/api).
 * Credenciais ficam APENAS no backend (X-Client-Id / X-Client-Secret headers).
 *
 * O VenoPag suporta apenas PIX In (não tem cartão de crédito).
 * createCreditCard lança Error — o Checkout deve desabilitar a aba Cartão
 * quando o gateway ativo for VenoPag.
 *
 * Webhooks do VenoPag:
 * - Assinatura HMAC-SHA256 no header `X-Veno-Signature`: t=<timestamp>,v1=<hex>
 * - Payload: { request_number, transaction_id, status, amount, ... }
 * - Validação de assinatura + client_id obrigatória
 */

import QRCode from 'qrcode';
import { eventBus, EventTopics } from '../../../core/events/topics';
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
} from './types';

// ============================================================================
// Configuração
// ============================================================================

const VENOPAG_API_BASE = 'https://venopagments.com/api';

function getConfig(env?: Record<string, string | undefined>) {
  const e = env || process.env;
  return {
    clientId: e.VENO_CLIENT_ID || '',
    clientSecret: e.VENO_CLIENT_SECRET || '',
    webhookSecret: e.VENO_WEBHOOK_SECRET || '',
    appUrl: e.APP_URL || 'https://adeusmulta.defesai.com.br',
    enabled: e.VENO_ENABLED === 'true',
  };
}

function isProductionMode(env?: Record<string, string | undefined>): boolean {
  const e = env || process.env;
  return (e.PAYMENT_MODE || 'sandbox').toLowerCase() === 'production';
}

// ============================================================================
// Tipos internos do VenoPag
// ============================================================================

interface VenoCashInResponse {
  request_number: string;
  transaction_id?: string;
  status: 'PENDING' | 'COMPLETE' | 'FAILED' | 'CANCELED' | 'EXPIRED';
  amount: number;
  copyPaste: string;
  qr_url?: string;
  qr_img?: string;
  checkout_url?: string;
  expire_minutes?: number;
}

interface VenoWebhookPayload {
  request_number: string;
  transaction_id?: string;
  status: 'COMPLETE' | 'FAILED' | 'CANCELED' | 'PENDING' | 'EXPIRED';
  type: string;
  amount: number;
  client_id?: string;
  created_at?: string;
  paid_at?: string;
}

// ============================================================================
// Mapeamento de Status
// ============================================================================

function mapVenoStatus(status: string): GatewayPaymentStatus {
  const map: Record<string, GatewayPaymentStatus> = {
    PENDING: 'PENDING',
    COMPLETE: 'PAID',
    FAILED: 'DECLINED',
    CANCELED: 'CANCELED',
    EXPIRED: 'CANCELED',
  };
  return map[status] || 'PENDING';
}

// ============================================================================
// HTTP Client
// ============================================================================

async function venoFetch(
  path: string,
  options: RequestInit = {},
  config: ReturnType<typeof getConfig> = getConfig()
): Promise<VenoCashInResponse & { ok?: boolean; error?: string }> {
  const { clientId, clientSecret } = config;
  if (!clientId || !clientSecret) {
    throw new Error('VenoPag indisponível: credenciais não configuradas (VENO_CLIENT_ID, VENO_CLIENT_SECRET).');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(`${VENOPAG_API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': clientId,
        'X-Client-Secret': clientSecret,
        ...options.headers,
      },
    });

    const data = await response.json() as VenoCashInResponse & { ok?: boolean; error?: string };
    // VenoPag business errors usually arrive with HTTP 200; inspect both.
    if (!response.ok || data?.ok === false) {
      throw new Error(typeof data?.error === 'string' ? data.error : 'Falha ao processar pagamento VenoPag.');
    }
    return data;
  } catch (err: any) {
    if (isProductionMode()) {
      logger.error('payments', 'venopag', 'veno_fetch', 'VenoPag request failed in production', { error: err.message });
      throw new Error('Falha ao conectar com VenoPag. Pagamento não processado.');
    }
    logger.warn('payments', 'venopag', 'veno_fetch', 'VenoPag request failed — modo dev', { error: err.message });
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================================
// HMAC Verification for Webhooks
// ============================================================================

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

async function verifyVenoSignature(
  rawBody: string,
  signature: string | null | undefined,
  clientId: string | null | undefined,
  webhookSecret: string,
  expectedClientId: string
): Promise<boolean> {
  if (!webhookSecret || !expectedClientId || !signature || clientId !== expectedClientId) return false;

  const match = /^t=(\d+),v1=([a-f0-9]{64})$/i.exec(signature.trim());
  if (!match) return false;

  const timestamp = Number(match[1]);
  if (Math.abs(Date.now() / 1000 - timestamp) > 300) return false; // 5 min tolerance

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${match[1]}.${rawBody}`));
  const expected = Array.from(new Uint8Array(mac), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return constantTimeEqual(expected, match[2].toLowerCase());
}

// ============================================================================
// Adapter
// ============================================================================

export class VenoPagAdapter implements PaymentGateway {
  readonly id: GatewayId = 'venopag';
  readonly displayName = 'VenoPag (PIX)';
  private config: ReturnType<typeof getConfig>;

  constructor(customEnv?: Record<string, string | undefined>) {
    this.config = getConfig(customEnv);
  }

  isConfigured(): boolean {
    return this.config.enabled && Boolean(this.config.clientId) && Boolean(this.config.clientSecret);
  }

  async createPix(input: GatewayCreatePixInput): Promise<GatewayPixResult> {
    const cleanDoc = (input.payer.document || '12345678909').replace(/\D/g, '');
    const referenceId = input.referenceId || `defesai_case_${input.caseId}_${Date.now()}`;

    if (!input.amountInCents || typeof input.amountInCents !== 'number' || input.amountInCents <= 0) {
      throw new Error('amountInCents inválido: deve ser um número maior que zero.');
    }
    const amountInCents = input.amountInCents;

    let transactionId = `venopag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let pixCopyPaste = `00020126580014br.gov.bcb.pix0136${referenceId}520400005303986540${(amountInCents / 100).toFixed(2)}5802BR5916DEFESAI TECNOLOG6009SAO PAULO62070503***6304`;
    let status: GatewayPaymentStatus = 'PENDING';
    let feeInCents: number | undefined = undefined;
    let netAmountInCents: number | undefined = undefined;

    if (this.isConfigured()) {
      const webhookUrl = input.webhookUrl || `${this.config.appUrl.replace(/\/$/, '')}/api/webhooks/venopag`;

      try {
        const response = await venoFetch(
          '/cashin',
          {
            method: 'POST',
            body: JSON.stringify({
              amount: input.amountInCents / 100,
              description: input.description.slice(0, 120),
              name: input.payer.name || 'Condutor DefesAi',
              document: cleanDoc,
              external_id: referenceId,
              webhook_url: webhookUrl,
              payer_email: input.payer.email,
              payer_phone: input.payer.phone,
            }),
          },
          this.config
        );

        transactionId = response.request_number || response.transaction_id || transactionId;
        pixCopyPaste = response.copyPaste || pixCopyPaste;
        status = mapVenoStatus(response.status);
        // VenoPag não retorna fee/netAmount no cashin; calcular se necessário
      } catch (err: any) {
        if (isProductionMode()) {
          logger.error('payments', 'venopag', 'create_pix', 'VenoPag falhou em produção — transação NÃO criada', { error: err.message });
          throw new Error('Falha ao conectar com VenoPag. Pagamento não processado.');
        }
        logger.warn('payments', 'venopag', 'create_pix', 'VenoPag request failed — modo dev', { error: err.message });
        throw err;
      }
    }

    // Gerar QR Code localmente a partir do pixCopyPaste
    let qrCodeDataUrl = '';
    try {
      qrCodeDataUrl = await QRCode.toDataURL(pixCopyPaste, {
        width: 280,
        margin: 2,
        color: { dark: '#071D41', light: '#ffffff' },
      });
    } catch (err) {
      logger.warn('payments', 'venopag', 'qr_generation', 'QR Code generation error', { error: String(err) });
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    return {
      gatewayTransactionId: transactionId,
      referenceId,
      gateway: 'venopag',
      status,
      amountInCents,
      pixCopyPaste,
      qrCodeDataUrl,
      qrCodeUrl: undefined,
      expiresAt,
      createdAt: new Date().toISOString(),
      feeInCents,
      netAmountInCents,
    };
  }

  async createCreditCard(_input: GatewayCreateCreditCardInput): Promise<GatewayCreditCardResult> {
    throw new Error(
      'VenoPag não suporta pagamento com cartão de crédito. ' +
      'Apenas PIX está disponível neste gateway.'
    );
  }

  async getPaymentStatus(gatewayTransactionId: string): Promise<GatewayPaymentStatusResult> {
    if (!this.isConfigured()) {
      return { gatewayTransactionId, gateway: 'venopag', status: 'PENDING' };
    }

    let response: VenoCashInResponse & { ok?: boolean; error?: string };
    try {
      response = await venoFetch(
        `/consult-transaction?request_number=${encodeURIComponent(gatewayTransactionId)}`,
        { method: 'GET' },
        this.config
      );
    } catch (error) {
      if (process.env.PAYMENT_MODE !== 'production') {
        logger.warn('payments', 'venopag', 'get_status', 'Transaction query unavailable in non-production', {
          transactionId: gatewayTransactionId,
        });
        return { gatewayTransactionId, gateway: 'venopag', status: 'PENDING' };
      }
      throw error;
    }

    const data = response as { status: string; paid_at?: string };

    return {
      gatewayTransactionId,
      gateway: 'venopag',
      status: mapVenoStatus(data.status),
      paidAt: data.paid_at,
    };
  }

  processWebhook(
    rawBody: string,
    headers: Record<string, string | undefined>,
    body: unknown
  ): NormalizedWebhookEvent {
    // Validar assinatura HMAC
    const signature = headers['x-veno-signature'] as string | undefined;
    const clientId = headers['x-veno-client-id'] as string | undefined;
    const webhookSecret = this.config.webhookSecret;
    const expectedClientId = this.config.clientId;

    // Em produção, assinatura é obrigatória
    if (isProductionMode()) {
      const isValid = verifyVenoSignature(rawBody, signature, clientId, webhookSecret, expectedClientId);
      if (!isValid) {
        throw new Error('Webhook VenoPag rejeitado: assinatura HMAC inválida ou client_id não confere');
      }
    }

    const payload = (body && typeof body === 'object' ? body : {}) as Partial<VenoWebhookPayload>;

    // gatewayEventId deve ser ESTÁVEL entre entregas duplicadas do mesmo webhook:
    // baseado em request_number + status (sem Date.now(), que tornaria cada
    // entrega única e inviabilizaria a dedup). A verificação real de evento já
    // processado é feita pelo handler via webhookRepository.acceptEvent().
    const stableEventId = `venopag_${payload.request_number || 'unknown'}_${payload.status || 'unknown'}`;

    return {
      gatewayEventId: stableEventId,
      gateway: 'venopag',
      gatewayTransactionId: payload.request_number || payload.transaction_id || '',
      referenceId: undefined,
      status: mapVenoStatus(payload.status || 'PENDING'),
      transactionType: payload.type || 'PIX_IN',
      amountInCents: Math.round((payload.amount || 0) * 100), // VenoPag envia em reais
      netAmountInCents: undefined,
      gatewayFeeInCents: undefined,
      paidAt: payload.paid_at,
      rawPayload: body,
      isDuplicate: false, // Preenchido pelo handler via webhookRepository.acceptEvent (durável)
      received: true,
    };
  }
}

// Backward-compatible default instance (uses process.env)
export const venopagAdapter = new VenoPagAdapter();