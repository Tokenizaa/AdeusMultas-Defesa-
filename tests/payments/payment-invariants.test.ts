import { describe, expect, it } from 'vitest';
import {
  assertPaymentDomainInvariants,
  assertPaymentStatusTransition,
  assertProductionGateway,
  type PaymentDomainRecord,
} from '../../src/server/domain/payment/payment-invariants';

const basePayment: PaymentDomainRecord = {
  id: 'payment-1',
  caseId: 'case-1',
  gateway: 'pagbank',
  gatewayEnvironment: 'production',
  amountInCents: 1990,
  currency: 'BRL',
  commercialOfferId: 'offer-1',
  status: 'pending',
  providerTransactionId: 'provider-tx-1',
  createdAt: '2026-09-08T12:00:00.000Z',
  updatedAt: '2026-09-08T12:00:00.000Z',
};

describe('payment domain invariants', () => {
  it('accepts a structurally valid production payment', () => {
    expect(() => assertPaymentDomainInvariants(basePayment)).not.toThrow();
  });

  it('rejects zero, negative, fractional and unsafe amounts', () => {
    for (const amount of [0, -1, 10.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => assertPaymentDomainInvariants({ ...basePayment, amountInCents: amount })).toThrow(
        'PAYMENT_INVARIANT:amountInCents_INVALID',
      );
    }
  });

  it('rejects test gateway in production', () => {
    expect(() => assertPaymentDomainInvariants({
      ...basePayment,
      gateway: 'test',
      gatewayEnvironment: 'production',
    })).toThrow('PAYMENT_INVARIANT:test_gateway_forbidden_in_production');
  });

  it('allows PagBank sandbox but rejects GGPIX sandbox', () => {
    expect(() => assertPaymentDomainInvariants({
      ...basePayment,
      gateway: 'pagbank',
      gatewayEnvironment: 'sandbox',
    })).not.toThrow();

    expect(() => assertPaymentDomainInvariants({
      ...basePayment,
      gateway: 'ggpixapi',
      gatewayEnvironment: 'sandbox',
    })).toThrow('PAYMENT_INVARIANT:gateway_environment_INCOMPATIBLE');
  });

  it('requires provider confirmation data for PAID', () => {
    expect(() => assertPaymentDomainInvariants({
      ...basePayment,
      status: 'paid',
      providerTransactionId: undefined,
      confirmedAt: undefined,
    })).toThrow('PAYMENT_INVARIANT:providerTransactionId_REQUIRED');

    expect(() => assertPaymentDomainInvariants({
      ...basePayment,
      status: 'paid',
      confirmedAt: undefined,
    })).toThrow('PAYMENT_INVARIANT:confirmedAt_REQUIRED');
  });

  it('accepts the canonical status transitions and rejects regressions', () => {
    expect(() => assertPaymentStatusTransition('pending', 'paid')).not.toThrow();
    expect(() => assertPaymentStatusTransition('paid', 'refunded')).not.toThrow();
    expect(() => assertPaymentStatusTransition('paid', 'pending')).toThrow(
      'PAYMENT_INVARIANT:invalid_status_transition:paid->pending',
    );
    expect(() => assertPaymentStatusTransition('declined', 'paid')).toThrow(
      'PAYMENT_INVARIANT:invalid_status_transition:declined->paid',
    );
  });

  it('exposes the production gateway allow-list explicitly', () => {
    expect(() => assertProductionGateway('pagbank')).not.toThrow();
    expect(() => assertProductionGateway('ggpixapi')).not.toThrow();
    expect(() => assertProductionGateway('test')).toThrow(
      'PAYMENT_INVARIANT:test_gateway_forbidden_in_production',
    );
  });
});
