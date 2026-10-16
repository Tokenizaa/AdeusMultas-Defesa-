/**
 * Canonical payment-domain invariants.
 *
 * Phase 1 deliberately contains domain rules only. Persistence/retry modeling
 * belongs to Phase 3 and reconciliation belongs to Phase 4.
 */

export type PaymentGatewayId = 'pagbank' | 'ggpixapi' | 'test';
export type PaymentGatewayEnvironment = 'production' | 'sandbox';

export type PaymentStatus =
  | 'pending'
  | 'authorized'
  | 'paid'
  | 'declined'
  | 'canceled'
  | 'refunded';

export interface PaymentDomainRecord {
  id: string;
  caseId: string;
  gateway: PaymentGatewayId;
  gatewayEnvironment: PaymentGatewayEnvironment;
  amountInCents: number;
  currency: string;
  commercialOfferId: string;
  status: PaymentStatus;
  providerTransactionId?: string;
  providerOrderId?: string;
  providerReferenceId?: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  webhookProviderEventId?: string;
}

const PRODUCTION_GATEWAYS: ReadonlySet<PaymentGatewayId> = new Set([
  'pagbank',
  'ggpixapi',
]);

const ALLOWED_STATUSES: ReadonlySet<PaymentStatus> = new Set([
  'pending',
  'authorized',
  'paid',
  'declined',
  'canceled',
  'refunded',
]);

const ISO_CURRENCY = /^[A-Z]{3}$/;

function required(value: unknown, field: string): asserts value {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`PAYMENT_INVARIANT:${field}_REQUIRED`);
  }
}

function isoDate(value: string, field: string): void {
  required(value, field);
  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`PAYMENT_INVARIANT:${field}_INVALID`);
  }
}

/**
 * Validates immutable identity and structural financial invariants.
 * Throws a stable, machine-readable error when a rule is violated.
 */
export function assertPaymentDomainInvariants(payment: PaymentDomainRecord): void {
  required(payment.id, 'id');
  required(payment.caseId, 'caseId');
  required(payment.commercialOfferId, 'commercialOfferId');

  if (!Number.isSafeInteger(payment.amountInCents) || payment.amountInCents <= 0) {
    throw new Error('PAYMENT_INVARIANT:amountInCents_INVALID');
  }

  if (!ISO_CURRENCY.test(payment.currency)) {
    throw new Error('PAYMENT_INVARIANT:currency_INVALID');
  }

  if (!ALLOWED_STATUSES.has(payment.status)) {
    throw new Error('PAYMENT_INVARIANT:status_INVALID');
  }

  if (payment.gatewayEnvironment === 'production') {
    if (!PRODUCTION_GATEWAYS.has(payment.gateway)) {
      throw new Error('PAYMENT_INVARIANT:test_gateway_forbidden_in_production');
    }
  } else if (payment.gateway !== 'pagbank' && payment.gateway !== 'test') {
    throw new Error('PAYMENT_INVARIANT:gateway_environment_INCOMPATIBLE');
  }

  isoDate(payment.createdAt, 'createdAt');
  isoDate(payment.updatedAt, 'updatedAt');

  if (payment.status === 'paid') {
    required(payment.providerTransactionId, 'providerTransactionId');
    required(payment.confirmedAt ?? '', 'confirmedAt');
    isoDate(payment.confirmedAt!, 'confirmedAt');
  }

  if (payment.webhookProviderEventId !== undefined) {
    required(payment.webhookProviderEventId, 'webhookProviderEventId');
  }
}

/**
 * Structural rule for a transition. Financial reconciliation is intentionally
 * outside this function and is implemented in Phase 4.
 */
export function assertPaymentStatusTransition(
  from: PaymentStatus,
  to: PaymentStatus,
): void {
  if (from === to) return;

  const allowed: Record<PaymentStatus, readonly PaymentStatus[]> = {
    pending: ['authorized', 'paid', 'declined', 'canceled'],
    authorized: ['paid', 'declined', 'canceled'],
    paid: ['refunded'],
    declined: [],
    canceled: [],
    refunded: [],
  };

  if (!allowed[from].includes(to)) {
    throw new Error(`PAYMENT_INVARIANT:invalid_status_transition:${from}->${to}`);
  }
}

/**
 * Production selection rule used by gateway configuration boundaries.
 */
export function assertProductionGateway(gateway: PaymentGatewayId): void {
  if (!PRODUCTION_GATEWAYS.has(gateway)) {
    throw new Error('PAYMENT_INVARIANT:test_gateway_forbidden_in_production');
  }
}
