/**
 * @file payment-repository.ts
 * PaymentRepository — Dual-Engine Persistence Layer (DefesAi / PagBank / GGPIXAPI)
 *
 * Espelha as estruturas em memória dos gateways de pagamento (orders e
 * webhook events) na camada Supabase com write-through best-effort.
 *
 * Padrão (idêntico ao case-repository.ts e commercial-repository.ts): a memória
 * continua sendo a fonte de leitura síncrona do serviço; cada escrita é
 * persistida de forma assíncrona (fire-and-forget) quando o Supabase está
 * configurado. Nunca lança erros do banco para o fluxo HTTP.
 *
 * Regras de mapeamento:
 *  - `payment_orders`: upsert por `case_id` (UNIQUE natural; 1 pedido/caso).
 *    O PK é gerado pelo banco (uuid default) — nunca enviamos id sintético.
 *    `case_id` é FK NOT NULL para `public.cases(id)`: ids já-UUID passam
 *    intactos; ids sintéticos (`case_*`) são mapeados para o MESMO UUID v5
 *    determinístico usado pelo case-repository (ver uuid-v5.ts), garantindo
 *    que o pedido aponte para a linha correta do caso em qualquer instância.
 *    Se o caso ainda não foi persistido, a violação de FK é engolida pelo
 *    padrão best-effort (`fire`) — igual às demais falhas de persistência.
 *    Campo `gateway` registra qual provedor criou o pagamento.
 *  - `payment_webhook_events`: insert/upsert append-only com idempotência por
 *    `pagbank_event_id` (coluna UNIQUE TEXT).
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Json } from '../../types/supabase';
import { logger } from '../observability/logger';
import { getSupabaseServerClient } from './supabase-server';
import { domainIdToUuid } from './uuid-v5';
import { PagBankOrderResult, PagBankWebhookPayload } from '../integrations/pagbank';
import { GatewayId } from '../integrations/gateway/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PaymentOrderStatus = 'PENDING' | 'PAID' | 'CANCELED' | 'DECLINED' | 'REFUNDED';

export class PaymentRepository {
  private client: SupabaseClient<Database> | null = getSupabaseServerClient();

  // ==========================================
  // Helpers
  // ==========================================

  private isUuid(value: string): boolean {
    return UUID_RE.test(value);
  }

  private toJson(value: unknown): Json {
    return JSON.parse(JSON.stringify(value ?? null)) as Json;
  }

  private warn(domain: string, operation: string, message: string, extra?: Record<string, unknown>) {
    logger.warn('supabase', 'payment_repository', operation, `[${domain}] ${message}`, extra);
  }

  /**
   * Executa uma query Supabase de forma aguardada (await), propagando erros
   * em vez de os engolir silenciosamente. Use este método para escritas
   * financeiras críticas onde a integridade dos dados é essencial.
   */
  private async persistSafely(
    domain: string,
    query: PromiseLike<{ error: { message: string } | null }>,
    meta?: Record<string, unknown>
  ): Promise<{ error: { message: string } | null }> {
    if (!this.client) {
      throw new Error(`[${domain}] Supabase client não disponível — escrita financeira bloqueada.`);
    }
    const { error } = await Promise.resolve(query);
    if (error) this.warn(domain, 'persist', error.message, meta);
    return { error };
  }

  // ==========================================
  // 1. Payment Orders → payment_orders
  // ==========================================

  /**
   * Upsert por `case_id` (1 pedido por caso). `case_id` é FK NOT NULL para
   * public.cases(id): ids sintéticos são convertidos para o UUID v5
   * determinístico correspondente (mesma tabela de casos), mantendo a
   * integridade referencial e a idempotência entre restarts/instâncias.
   *
   * Suporta tanto PagBankOrderResult (compat) quanto GatewayPixResult (novo).
   * Campo `gateway` registra qual provedor criou o pagamento — essencial
   * para a regra de que trocar gateway não migra pagamentos existentes.
   */
  async persistOrder(
    order: PagBankOrderResult | {
      caseId: string;
      orderId?: string;
      gatewayTransactionId?: string;
      referenceId?: string;
      status: string;
      amount?: number;
      amountInCents?: number;
      qrCodeUrl?: string;
      qrCodeText?: string;
      pixCopyPaste?: string;
      qrCodeDataUrl?: string;
      expiresAt?: string;
      createdAt?: string;
    },
    extras: {
      paymentMethod?: 'pix' | 'credit_card' | 'boleto';
      userId?: string;
      gateway?: GatewayId;
    } = {}
  ): Promise<void> {
    if (!this.client) return;

    // Mesmo mapeamento do case-repository: id sintético (`case_*`) → UUID v5
    // determinístico; id já-UUID passa intacto. Logs/metas preservam o id original.
    const caseIdUuid = domainIdToUuid(order.caseId);
    if (!caseIdUuid) {
      return;
    }

    // Normalizar valores — suportar tanto PagBank (amount float) quanto Gateway (amountInCents int)
    const amount = 'amount' in order && typeof order.amount === 'number'
      ? order.amount
      : 'amountInCents' in order && typeof order.amountInCents === 'number'
        ? order.amountInCents / 100
        : 0;

    const orderId = ('orderId' in order ? order.orderId : undefined)
      || ('gatewayTransactionId' in order ? (order as any).gatewayTransactionId : undefined)
      || null;

    const pixText = ('qrCodeText' in order ? order.qrCodeText : undefined)
      || ('pixCopyPaste' in order ? (order as any).pixCopyPaste : undefined)
      || null;

    const payload: Database['public']['Tables']['payment_orders']['Insert'] = {
      case_id: caseIdUuid,
      user_id: extras.userId && this.isUuid(extras.userId) ? extras.userId : null,
      reference_id: order.referenceId ?? null,
      pagbank_order_id: orderId,
      status: order.status,
      amount,
      currency: 'BRL',
      payment_method: extras.paymentMethod ?? null,
      qr_code_url: order.qrCodeUrl ?? null,
      qr_code_text: pixText,
      qr_code_data_url: order.qrCodeDataUrl ?? null,
      final_amount: amount,
      expires_at: order.expiresAt ?? null,
      paid_at: order.status === 'PAID' ? new Date().toISOString() : null,
      created_at: order.createdAt ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Campo gateway — registra qual provedor criou este pagamento
      ...(extras.gateway ? { gateway: extras.gateway } : {}),
    };
    await this.persistSafely('payment_orders', this.client.from('payment_orders').upsert(payload, { onConflict: 'case_id' }), {
      caseId: order.caseId,
      orderId,
      gateway: extras.gateway,
    });
  }

  // ==========================================
  // 2. Payment Webhook Events → payment_webhook_events
  // ==========================================

  /**
   * Upsert append-only com idempotência por `pagbank_event_id`
   * (coluna UNIQUE TEXT) — o mesmo evento do PagBank nunca duplica.
   */
  async persistWebhookEvent(params: {
    pagbankEventId: string;
    eventType: string;
    payload: PagBankWebhookPayload;
    processed: boolean;
    processingError?: string;
  }): Promise<void> {
    if (!this.client) return;
    if (!params.pagbankEventId) return;
    const payload: Database['public']['Tables']['payment_webhook_events']['Insert'] = {
      pagbank_event_id: params.pagbankEventId,
      event_type: params.eventType,
      payload: this.toJson(params.payload),
      processed: params.processed,
      processing_error: params.processingError ?? null,
      attempts: 1,
      processed_at: params.processed ? new Date().toISOString() : null,
    };
    await this.persistSafely('payment_webhook_events', this.client.from('payment_webhook_events').upsert(payload, { onConflict: 'pagbank_event_id' }), {
      pagbankEventId: params.pagbankEventId
    });
  }

  // ==========================================
  // Warm-up (opcional, não utilizado no boot)
  // ==========================================

  /**
   * Carrega do Supabase os pedidos de pagamento persistidos (warm-up futuro).
   */
  async loadAllOrdersFromSupabase(): Promise<void> {
    if (!this.client) return;
    const { data: orders, error } = await this.client
      .from('payment_orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      this.warn('payment_orders', 'loadAll', error.message);
    } else if (orders) {
      logger.info('supabase', 'payment_repository', 'loadAll', `Payment orders carregados: ${orders.length}`, {
        count: orders.length,
      });
    }
  }
}

export const paymentRepository = new PaymentRepository();
