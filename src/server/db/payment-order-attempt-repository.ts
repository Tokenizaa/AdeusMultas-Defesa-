import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServerClient } from './supabase-server';
import { domainIdToUuid } from './uuid-v5';

export type PaymentGatewayId = 'pagbank' | 'ggpixapi' | 'test';
export type PaymentGatewayEnvironment = 'production' | 'sandbox';
export type PaymentAttemptStatus =
  | 'pending'
  | 'waiting'
  | 'authorized'
  | 'paid'
  | 'declined'
  | 'canceled'
  | 'refunded';

export interface CreatePaymentOrderInput {
  caseId: string;
  userId?: string;
  amountInCents: number;
  currency?: string;
  paymentMethod?: 'pix' | 'credit_card' | 'boleto';
  serviceType?: string;
  commercialOfferId?: string;
  baseAmountInCents?: number;
  discountAmountInCents?: number;
  couponCode?: string;
  expiresAt?: string;
}

export interface CreatePaymentAttemptInput {
  paymentOrderId: string;
  caseId: string;
  gateway: PaymentGatewayId;
  gatewayEnvironment: PaymentGatewayEnvironment;
  amountInCents: number;
  currency?: string;
  commercialOfferId?: string;
  idempotencyKey: string;
  referenceId?: string;
  providerOrderId?: string;
  providerTransactionId?: string;
  status?: PaymentAttemptStatus;
}

export interface PaymentOrderAttemptResult {
  paymentOrderId: string;
  attemptId: string;
}

/**
 * Durable persistence boundary for the PaymentOrder -> PaymentAttempt model.
 *
 * Payment state is never kept only in process memory here. The caller receives
 * the database-generated identities and must retain them when creating provider
 * transactions. Provider gateway/environment are copied into each attempt and
 * are therefore immutable historical facts of that attempt.
 */
export class PaymentOrderAttemptRepository {
  private readonly client: SupabaseClient<any> | null = getSupabaseServerClient() as SupabaseClient<any> | null;

  private requireClient(): SupabaseClient<any> {
    if (!this.client) throw new Error('Supabase server client is not configured.');
    return this.client;
  }

  private caseUuid(caseId: string): string {
    const uuid = domainIdToUuid(caseId);
    if (!uuid) throw new Error(`Case '${caseId}' não possui identidade persistível.`);
    return uuid;
  }

  async createPaymentOrder(input: CreatePaymentOrderInput): Promise<string> {
    if (!Number.isInteger(input.amountInCents) || input.amountInCents <= 0) {
      throw new Error('PaymentOrder amountInCents deve ser inteiro positivo.');
    }

    const caseId = this.caseUuid(input.caseId);
    const amount = input.amountInCents / 100;
    const client = this.requireClient();

    const { data, error } = await client
      .from('payment_orders')
      .insert({
        case_id: caseId,
        user_id: input.userId || null,
        amount,
        final_amount: amount,
        base_amount: input.baseAmountInCents != null ? input.baseAmountInCents / 100 : null,
        discount_amount: input.discountAmountInCents != null ? input.discountAmountInCents / 100 : 0,
        currency: input.currency || 'BRL',
        currency_code: input.currency || 'BRL',
        payment_method: input.paymentMethod || null,
        status: 'pending',
        coupon_code: input.couponCode || null,
        expires_at: input.expiresAt || null,
      })
      .select('id')
      .single();

    if (error || !data?.id) {
      throw new Error(`Falha ao persistir PaymentOrder: ${error?.message || 'ID não retornado.'}`);
    }

    return data.id as string;
  }

  async createPaymentAttempt(input: CreatePaymentAttemptInput): Promise<string> {
    if (!Number.isInteger(input.amountInCents) || input.amountInCents <= 0) {
      throw new Error('PaymentAttempt amountInCents deve ser inteiro positivo.');
    }
    if (!input.idempotencyKey.trim()) throw new Error('PaymentAttempt idempotencyKey é obrigatório.');
    if (input.gatewayEnvironment === 'production' && input.gateway === 'test') {
      throw new Error('testAdapter é proibido em PaymentAttempt de produção.');
    }
    if (input.gatewayEnvironment === 'sandbox' && input.gateway === 'ggpixapi') {
      throw new Error('GGPIXAPI não é gateway sandbox suportado.');
    }

    const client = this.requireClient();
    const caseId = this.caseUuid(input.caseId);

    const { data, error } = await client
      .from('payment_attempts')
      .insert({
        payment_order_id: input.paymentOrderId,
        case_id: caseId,
        gateway: input.gateway,
        gateway_environment: input.gatewayEnvironment,
        provider_order_id: input.providerOrderId || null,
        provider_transaction_id: input.providerTransactionId || null,
        reference_id: input.referenceId || null,
        amount_in_cents: input.amountInCents,
        currency: input.currency || 'BRL',
        commercial_offer_id: input.commercialOfferId || null,
        status: input.status || 'pending',
        idempotency_key: input.idempotencyKey,
      })
      .select('id')
      .single();

    if (error || !data?.id) {
      throw new Error(`Falha ao persistir PaymentAttempt: ${error?.message || 'ID não retornado.'}`);
    }

    return data.id as string;
  }

  async createOrderAndAttempt(
    order: CreatePaymentOrderInput,
    attempt: Omit<CreatePaymentAttemptInput, 'paymentOrderId' | 'caseId' | 'amountInCents' | 'currency' | 'commercialOfferId'> & {
      amountInCents?: number;
      currency?: string;
      commercialOfferId?: string;
    },
  ): Promise<PaymentOrderAttemptResult> {
    const paymentOrderId = await this.createPaymentOrder(order);
    try {
      const attemptId = await this.createPaymentAttempt({
        ...attempt,
        paymentOrderId,
        caseId: order.caseId,
        amountInCents: attempt.amountInCents ?? order.amountInCents,
        currency: attempt.currency ?? order.currency ?? 'BRL',
        commercialOfferId: attempt.commercialOfferId ?? order.commercialOfferId,
      });
      return { paymentOrderId, attemptId };
    } catch (error) {
      // The order is deliberately retained as an auditable failed creation.
      // No provider state exists yet, so deleting history would hide the failure.
      throw error;
    }
  }
}

export const paymentOrderAttemptRepository = new PaymentOrderAttemptRepository();
