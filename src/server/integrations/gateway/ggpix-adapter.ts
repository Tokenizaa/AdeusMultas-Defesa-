/**
 * @file gateway/ggpix-adapter.ts
 * GGPIXAPI Adapter — Implementa PaymentGateway para o gateway GGPIXAPI.
 *
 * Integra PIX In via API REST do GGPIXAPI (https://ggpixapi.com/api/v1).
 * Credenciais ficam APENAS no backend (X-API-Key header), conforme orientação
 * oficial da GGPIXAPI: https://ggpixapi.com/docs/
 *
 * O GGPIXAPI suporta apenas PIX In (não tem cartão de crédito).
 * createCreditCard lança Error — o Checkout deve desabilitar a aba Cartão
 * quando o gateway ativo for GGPIXAPI.
 *
 * Webhooks do GGPIXAPI:
 * - Enviamos X-API-Key no header
 * - Payload: { transactionId, externalId, status, type, amount, netAmount, gatewayFee, paidAt, ... }
 * - Não há assinatura HMAC — identificação por externalId e idempotência
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

const GGRAPI_BASE_URL = 'https://ggpixapi.com/api/v1';
const GGRAPI_BACKUP_URL = 'https://ggatepixapi.com/api/v1';

function getConfig() {
  const allowedIpsRaw = process.env.GGPIX_WEBHOOK_ALLOWED_IPS || '';
  const allowedIps = allowedIpsRaw.split(',').map(ip => ip.trim()).filter(Boolean);
  return {
    apiKey: process.env.GGPIX_API_KEY || '',
    appUrl: process.env.APP_URL || 'https://defesai.com.br',
    enabled: process.env.GGPIX_ENABLED === 'true',
    webhookAllowedIps: allowedIps.length > 0 ? allowedIps : undefined,
  };
}

function isProductionMode(): boolean {
  return (process.env.PAYMENT_MODE || 'sandbox').toLowerCase() === 'production';
}

// ============================================================================
// IP Validation for Webhook Security (GGPIXAPI não tem HMAC)
// ============================================================================

function validateWebhookSourceIp(headers: Record<string, string | undefined>, allowedIps?: string[]): boolean {
  if (!allowedIps || allowedIps.length === 0) {
    // Se não configurado, permite em dev, bloqueia em prod com warning
    if (isProductionMode()) {
      logger.warn('payments', 'ggpix', 'webhook_ip', 'GGPIX_WEBHOOK_ALLOWED_IPS não configurado — webhook aceito mas configurar em produção');
    }
    return true;
  }

  // Extrair IP do cliente (considerando proxies)
  const forwardedFor = headers['x-forwarded-for'] as string | undefined;
  const realIp = headers['x-real-ip'] as string | undefined;
  const clientIp = forwardedFor?.split(',')[0]?.trim() || realIp || '';

  if (!clientIp) {
    logger.warn('payments', 'ggpix', 'webhook_ip', 'Não foi possível determinar IP do cliente');
    return false;
  }

  const isAllowed = allowedIps.some(allowed => {
    // Suporte a CIDR simples (ex: 192.168.1.0/24) e IP exato
    if (allowed.includes('/')) {
      const [baseIp, prefixStr] = allowed.split('/');
      const prefix = parseInt(prefixStr, 10);
      if (isNaN(prefix) || prefix < 0 || prefix > 32) return false;
      const mask = ~((1 << (32 - prefix)) - 1);
      const clientNum = ipToNumber(clientIp);
      const baseNum = ipToNumber(baseIp);
      return (clientNum & mask) === (baseNum & mask);
    }
    return allowed === clientIp;
  });

  if (!isAllowed) {
    logger.warn('payments', 'ggpix', 'webhook_ip', 'Webhook GGPIXAPI rejeitado — IP não permitido', { clientIp, allowedIps });
  }

  return isAllowed;
}

function ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

// ============================================================================
// Tipos internos do GGPIXAPI (baseado na documentação GGpixpay.md)
// ============================================================================

interface GGPixInResponse {
  id: string;
  status: 'PENDING' | 'COMPLETE' | 'FAILED' | 'CANCELED';
  amount: number;
  pixCode: string;
  pixCopyPaste: string;
  externalId?: string;
  createdAt: string;
  fees?: {
    total: number;
    netAmount: number;
  };
  splits?: unknown[];
}

interface GGWebhookPayload {
  transactionId: string;
  externalId?: string;
  status: 'COMPLETE' | 'FAILED' | 'CANCELED' | 'PENDING';
  type: string;
  amount: number;
  netAmount?: number;
  gatewayFee?: number;
  paidAt?: string;
  createdAt?: string;
  merchantId?: string;
}

// ============================================================================
// Mapeamento de Status
// ============================================================================

function mapGGPixStatus(status: string): GatewayPaymentStatus {
  const map: Record<string, GatewayPaymentStatus> = {
    PENDING: 'PENDING',
    COMPLETE: 'PAID',
    FAILED: 'DECLINED',
    CANCELED: 'CANCELED',
  };
  return map[status] || 'PENDING';
}

// ============================================================================
// HTTP Client (resiliente com fallback de domínio)
// ============================================================================

async function ggFetch(
  path: string,
  options: RequestInit = {},
  config: ReturnType<typeof getConfig> = getConfig()
): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': config.apiKey,
    ...options.headers,
  };

  // Tentar host principal primeiro
  try {
    const res = await fetch(`${GGRAPI_BASE_URL}${path}`, { ...options, headers });
    if (res.ok || res.status < 500) return res;
    // 5xx → tentar contingência
    throw new Error(`Server error ${res.status}`);
  } catch (err) {
    logger.warn('payments', 'ggpix', 'gg_fetch', 'Primary host failed, trying contingency', {
      error: String(err),
    });
    const res = await fetch(`${GGRAPI_BACKUP_URL}${path}`, { ...options, headers });
    return res;
  }
}

// ============================================================================
// Adapter
// ============================================================================

export class GGPIXAdapter implements PaymentGateway {
  readonly id: GatewayId = 'ggpixapi';
  readonly displayName = 'GGPIXAPI (PIX)';

  isConfigured(): boolean {
    const config = getConfig();
    return config.enabled && Boolean(config.apiKey);
  }

  async createPix(input: GatewayCreatePixInput): Promise<GatewayPixResult> {
    const config = getConfig();
    const cleanDoc = (input.payer.document || '12345678909').replace(/\D/g, '');
    const referenceId = input.referenceId || `defesai_case_${input.caseId}_${Date.now()}`;
    if (!input.amountInCents || typeof input.amountInCents !== 'number' || input.amountInCents <= 0) {
      throw new Error('amountInCents inválido: deve ser um número maior que zero.');
    }
    const amountInCents = input.amountInCents;

    let transactionId = `ggpix_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let pixCopyPaste = `00020126580014br.gov.bcb.pix0136${referenceId}520400005303986540${(amountInCents / 100).toFixed(2)}5802BR5916DEFESAI TECNOLOG6009SAO PAULO62070503***6304`;
    let status: GatewayPaymentStatus = 'PENDING';
    let feeInCents: number | undefined = undefined;
    let netAmountInCents: number | undefined = undefined;

    if (this.isConfigured()) {
      const webhookUrl = input.webhookUrl || `${config.appUrl.replace(/\/$/, '')}/api/webhooks/ggpix`;

      try {
        const response = await ggFetch('/pix/in', {
          method: 'POST',
          body: JSON.stringify({
            amountCents: input.amountInCents,
            description: input.description,
            payerName: input.payer.name || 'Condutor DefesAi',
            payerDocument: cleanDoc,
            externalId: referenceId,
            webhookUrl,
            payerEmail: input.payer.email,
            payerPhone: input.payer.phone,
          }),
        }, config);

        if (response.ok) {
          const data: GGPixInResponse = await response.json();
          transactionId = data.id || transactionId;
          pixCopyPaste = data.pixCopyPaste || data.pixCode || pixCopyPaste;
          status = mapGGPixStatus(data.status);
          feeInCents = data.fees?.total;
          netAmountInCents = data.fees?.netAmount;
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
          // [PRODUCTION] Não retornar dados locais como se fossem reais
          if (isProductionMode()) {
            logger.error('payments', 'ggpix', 'create_pix', 'GGPIXAPI retornou erro em produção — transação NÃO criada', {
              httpStatus: response.status,
              error: errorData,
            });
            throw new Error(`GGPIXAPI retornou erro HTTP ${response.status}. Pagamento não processado.`);
          }
          logger.warn('payments', 'ggpix', 'create_pix', 'GGPIXAPI PIX In returned non-200 — modo dev: usando dados locais', {
            httpStatus: response.status,
            error: errorData,
          });
        }
      } catch (err: any) {
        // [PRODUCTION] Não retornar dados locais como se fossem reais
        if (isProductionMode()) {
          logger.error('payments', 'ggpix', 'create_pix', 'GGPIXAPI falhou em produção — transação NÃO criada', { error: err.message });
          throw new Error('Falha ao conectar com GGPIXAPI. Pagamento não processado.');
        }
        logger.warn('payments', 'ggpix', 'create_pix', 'GGPIXAPI request failed — modo dev: usando dados locais', { error: err.message });
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
      logger.warn('payments', 'ggpix', 'qr_generation', 'QR Code generation error', { error: String(err) });
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    return {
      gatewayTransactionId: transactionId,
      referenceId,
      gateway: 'ggpixapi',
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
      'GGPIXAPI não suporta pagamento com cartão de crédito. ' +
      'Para usar cartão, altere o gateway ativo para PagBank nas configurações.'
    );
  }

  async getPaymentStatus(gatewayTransactionId: string): Promise<GatewayPaymentStatusResult> {
    const config = getConfig();

    const response = await ggFetch(`/transactions/${gatewayTransactionId}`, {
      method: 'GET',
    }, config);

    if (!response.ok) {
      logger.warn('payments', 'ggpix', 'get_status', 'Transaction query failed', {
        transactionId: gatewayTransactionId,
        httpStatus: response.status,
      });
      return {
        gatewayTransactionId,
        gateway: 'ggpixapi',
        status: 'PENDING',
      };
    }

    const data = await response.json() as {
      id: string;
      status: string;
      paidAt?: string;
    };

    return {
      gatewayTransactionId,
      gateway: 'ggpixapi',
      status: mapGGPixStatus(data.status),
      paidAt: data.paidAt,
    };
  }

  processWebhook(
    _rawBody: string,
    headers: Record<string, string | undefined>,
    body: unknown
  ): NormalizedWebhookEvent {
    const config = getConfig();
    
    // Validar IP de origem do webhook (segurança já que não há HMAC)
    if (!validateWebhookSourceIp(headers, config.webhookAllowedIps)) {
      throw new Error('Webhook GGPIXAPI rejeitado: IP de origem não autorizado');
    }

    const payload = body as GGWebhookPayload;

    return {
      gatewayEventId: `ggpix_${payload.transactionId}_${payload.status}_${Date.now()}`,
      gateway: 'ggpixapi',
      gatewayTransactionId: payload.transactionId,
      referenceId: payload.externalId || undefined,
      status: mapGGPixStatus(payload.status),
      transactionType: payload.type || 'PIX_IN',
      amountInCents: payload.amount,
      netAmountInCents: payload.netAmount,
      gatewayFeeInCents: payload.gatewayFee,
      paidAt: payload.paidAt,
      rawPayload: body,
      isDuplicate: false, // GGPIXAPI não tem HMAC, idempotência por externalId
    };
  }
}

export const ggpixAdapter = new GGPIXAdapter();
