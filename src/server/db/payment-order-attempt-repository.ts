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
  gateway: PaymentGatewayId;
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

export interface PaymentAttemptRecord {
  id: string;
  paymentOrderId: string;
  caseId: string;
  gateway: PaymentGatewayId;
  gatewayEnvironment: PaymentGatewayEnvironment;
  amountInCents: number;
  currency: string;
  status: PaymentAttemptStatus;
  providerOrderId: string | null;
  providerTransactionId: string | null;
  referenceId: string | null;
}

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

  private validateAmount(amountInCents: number): void {
    if (!Number.isInteger(amountInCents) || amountInCents <= 0) {
      throw new Error('Pagamento amountInCents deve ser inteiro positivo.');
    }
  }

  private validateGateway(gateway: PaymentGatewayId, environment: PaymentGatewayEnvironment): void {
    if (environment === 'production' && gateway === 'test') {
      throw new Error('testAdapter é proibido em pagamentos de produção.');
    }
    if (environment === 'sandbox' && gateway === 'ggpixapi') {
      throw new Error('GGPIXAPI não é gateway sandbox suportado.');
    }
  }

  async createPaymentOrder(input: CreatePaymentOrderInput): Promise<string> {
    this.validateAmount(input.amountInCents);
    const caseId = this.caseUuid(input.caseId);
    const client = this.requireClient();

    const { data, error } = await client
      .from('payment_orders')
      .insert({
        case_id: caseId,
        user_id: input.userId || null,
        gateway: input.gateway,
        amount: input.amountInCents / 100,
        final_amount: input.amountInCents / 100,
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
    this.validateAmount(input.amountInCents);
    if (!input.idempotencyKey.trim()) throw new Error('PaymentAttempt idempotencyKey é obrigatório.');
    this.validateGateway(input.gateway, input.gatewayEnvironment);

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

  async findAttemptByProviderTransactionId(providerTransactionId: string): Promise<PaymentAttemptRecord | null> {
    if (!providerTransactionId.trim()) return null;
    const client = this.requireClient();
    const { data, error } = await client
      .from('payment_attempts')
      .select('id,payment_order_id,case_id,gateway,gateway_environment,amount_in_cents,currency,status,provider_order_id,provider_transaction_id,reference_id')
      .eq('provider_transaction_id', providerTransactionId)
      .maybeSingle();

    if (error) throw new Error(`Falha ao localizar PaymentAttempt: ${error.message}`);
    if (!data) return null;
    return data as PaymentAttemptRecord;
  }

  async updateAttemptProviderData(
    attemptId: string,
    input: {
      providerOrderId?: string;
      providerTransactionId?: string;
      referenceId?: string;
      status?: PaymentAttemptStatus;
    },
  ): Promise<void> {
    const client = this.requireClient();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.providerOrderId !== undefined) patch.provider_order_id = input.providerOrderId;
    if (input.providerTransactionId !== undefined) patch.provider_transaction_id = input.providerTransactionId;
    if (input.referenceId !== undefined) patch.reference_id = input.referenceId;
    if (input.status !== undefined) {
      patch.status = input.status;
      if (input.status === 'paid') patch.paid_at = new Date().toISOString();
    }

    const { error } = await client.from('payment_attempts').update(patch).eq('id', attemptId);
    if (error) throw new Error(`Falha ao atualizar PaymentAttempt: ${error.message}`);
  }

  async updatePaymentOrder(
    paymentOrderId: string,
    input: {
      providerOrderId?: string;
      referenceId?: string;
      status?: string;
      paidAt?: string;
    },
  ): Promise<void> {
    const client = this.requireClient();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.providerOrderId !== undefined) patch.pagbank_order_id = input.providerOrderId;
    if (input.referenceId !== undefined) patch.reference_id = input.referenceId;
    if (input.status !== undefined) patch.status = input.status;
    if (input.paidAt !== undefined) patch.paid_at = input.paidAt;

    const { error } = await client.from('payment_orders').update(patch).eq('id', paymentOrderId);
    if (error) throw new Error(`Falha ao atualizar PaymentOrder: ${error.message}`);
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
    const attemptId = await this.createPaymentAttempt({
      ...attempt,
      paymentOrderId,
      caseId: order.caseId,
      gateway: attempt.gateway || order.gateway,
      amountInCents: attempt.amountInCents ?? order.amountInCents,
      currency: attempt.currency ?? order.currency ?? 'BRL',
      commercialOfferId: attempt.commercialOfferId ?? order.commercialOfferId,
    });
    return { paymentOrderId, attemptId };
  }
}

export interface PaymentOrderAttemptResult {
  paymentOrderId: string;
  attemptId: string;
}

export const paymentOrderAttemptRepository = new PaymentOrderAttemptRepository();
