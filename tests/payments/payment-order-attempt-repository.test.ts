import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PaymentOrderAttemptRepository } from '../../src/server/db/payment-order-attempt-repository';

const insertResult = (data: any) => ({
  insert: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data, error: null }),
});

const makeClient = (orderId = '11111111-1111-4111-8111-111111111111', attemptId = '22222222-2222-4222-8222-222222222222') => {
  const order = insertResult({ id: orderId });
  const attempt = insertResult({ id: attemptId });
  return {
    from: vi.fn((table: string) => table === 'payment_orders' ? order : attempt),
  };
};

describe('PaymentOrderAttemptRepository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a PaymentOrder and a distinct PaymentAttempt identity', async () => {
    const repo = new PaymentOrderAttemptRepository();
    (repo as any).client = makeClient();

    const result = await repo.createOrderAndAttempt(
      {
        caseId: '11111111-1111-4111-8111-111111111111',
        amountInCents: 12990,
        commercialOfferId: '33333333-3333-4333-8333-333333333333',
      },
      {
        gateway: 'pagbank',
        gatewayEnvironment: 'sandbox',
        idempotencyKey: 'case-1-attempt-1',
      },
    );

    expect(result.paymentOrderId).toBe('11111111-1111-4111-8111-111111111111');
    expect(result.attemptId).toBe('22222222-2222-4222-8222-222222222222');
  });

  it('rejects test gateway in production', async () => {
    const repo = new PaymentOrderAttemptRepository();
    (repo as any).client = makeClient();

    await expect(repo.createPaymentAttempt({
      paymentOrderId: '11111111-1111-4111-8111-111111111111',
      caseId: '11111111-1111-4111-8111-111111111111',
      gateway: 'test',
      gatewayEnvironment: 'production',
      amountInCents: 1000,
      idempotencyKey: 'test-prod',
    })).rejects.toThrow('testAdapter é proibido');
  });

  it('rejects unsupported GGPIXAPI sandbox attempts', async () => {
    const repo = new PaymentOrderAttemptRepository();
    (repo as any).client = makeClient();

    await expect(repo.createPaymentAttempt({
      paymentOrderId: '11111111-1111-4111-8111-111111111111',
      caseId: '11111111-1111-4111-8111-111111111111',
      gateway: 'ggpixapi',
      gatewayEnvironment: 'sandbox',
      amountInCents: 1000,
      idempotencyKey: 'ggpix-sandbox',
    })).rejects.toThrow('GGPIXAPI não é gateway sandbox');
  });

  it('requires a positive integer amount', async () => {
    const repo = new PaymentOrderAttemptRepository();
    (repo as any).client = makeClient();

    await expect(repo.createPaymentOrder({
      caseId: '11111111-1111-4111-8111-111111111111',
      amountInCents: 10.5,
    })).rejects.toThrow('inteiro positivo');
  });

  it('requires durable idempotency key', async () => {
    const repo = new PaymentOrderAttemptRepository();
    (repo as any).client = makeClient();

    await expect(repo.createPaymentAttempt({
      paymentOrderId: '11111111-1111-4111-8111-111111111111',
      caseId: '11111111-1111-4111-8111-111111111111',
      gateway: 'pagbank',
      gatewayEnvironment: 'production',
      amountInCents: 1000,
      idempotencyKey: ' ',
    })).rejects.toThrow('idempotencyKey é obrigatório');
  });
});
