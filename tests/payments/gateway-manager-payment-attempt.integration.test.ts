import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const repo = {
    createOrderAndAttempt: vi.fn().mockResolvedValue({ paymentOrderId: 'order-1', attemptId: 'attempt-1' }),
    updatePaymentOrder: vi.fn().mockResolvedValue(undefined),
    updateAttemptProviderData: vi.fn().mockResolvedValue(undefined),
    findAttemptByProviderTransactionId: vi.fn(),
  };

  const pagbankAdapter = {
    id: 'pagbank',
    displayName: 'PagBank',
    isConfigured: vi.fn(() => true),
    createPix: vi.fn(async () => ({
      gatewayTransactionId: 'pag-tx-1',
      referenceId: 'ref-pag-1',
      gateway: 'pagbank',
      status: 'PENDING',
      amountInCents: 1000,
      pixCopyPaste: 'pix-pag',
      expiresAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    })),
    getPaymentStatus: vi.fn(async () => ({
      gatewayTransactionId: 'pag-tx-1',
      gateway: 'pagbank',
      status: 'PENDING',
    })),
    processWebhook: vi.fn(),
  };

  const ggpixAdapter = {
    id: 'ggpixapi',
    displayName: 'GGPIXAPI',
    isConfigured: vi.fn(() => true),
    createPix: vi.fn(),
    getPaymentStatus: vi.fn(async () => ({
      gatewayTransactionId: 'gg-tx-1',
      gateway: 'ggpixapi',
      status: 'PAID',
      paidAt: '2026-09-09T00:00:00.000Z',
    })),
    processWebhook: vi.fn(),
  };

  const testAdapter = {
    id: 'test',
    displayName: 'Test',
    isConfigured: vi.fn(() => true),
    createPix: vi.fn(),
    getPaymentStatus: vi.fn(),
    processWebhook: vi.fn(),
  };

  return { repo, pagbankAdapter, ggpixAdapter, testAdapter };
});

vi.mock('../../src/server/db/payment-order-attempt-repository', () => ({
  paymentOrderAttemptRepository: mocks.repo,
}));
vi.mock('../../src/server/integrations/gateway/pagbank-adapter', () => ({
  pagbankAdapter: mocks.pagbankAdapter,
}));
vi.mock('../../src/server/integrations/gateway/ggpix-adapter', () => ({
  ggpixAdapter: mocks.ggpixAdapter,
}));
vi.mock('../../src/server/integrations/gateway/test-adapter', () => ({
  testAdapter: mocks.testAdapter,
}));
vi.mock('../../src/server/config/config-service', () => ({
  configService: {
    get: vi.fn(() => 'pagbank'),
    update: vi.fn(async () => ({ success: true, message: 'ok' })),
  },
}));
vi.mock('../../src/server/domain/payment/payment-invariants', () => ({
  assertProductionGateway: vi.fn(),
}));
vi.mock('../../src/server/observability/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { GatewayManager } from '../../src/server/integrations/gateway/gateway-manager';

describe('GatewayManager ↔ PaymentOrder/PaymentAttempt integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAYMENT_MODE = 'sandbox';
    mocks.repo.findAttemptByProviderTransactionId.mockReset();
    mocks.repo.createOrderAndAttempt.mockResolvedValue({ paymentOrderId: 'order-1', attemptId: 'attempt-1' });
    mocks.repo.updatePaymentOrder.mockResolvedValue(undefined);
    mocks.repo.updateAttemptProviderData.mockResolvedValue(undefined);
  });

  it('persists PaymentOrder/PaymentAttempt before creating the provider PIX', async () => {
    const manager = new GatewayManager();
    const gateway = manager.getActiveGateway();

    const result = await gateway.createPix({
      caseId: '11111111-1111-4111-8111-111111111111',
      referenceId: 'ref-pag-1',
      payer: { name: 'Cliente', email: 'cliente@example.com', document: '12345678901' },
      amountInCents: 1000,
      description: 'Teste',
    });

    expect(result.gatewayTransactionId).toBe('pag-tx-1');
    expect(mocks.repo.createOrderAndAttempt).toHaveBeenCalledTimes(1);
    expect(mocks.repo.updatePaymentOrder).toHaveBeenCalledWith('order-1', expect.objectContaining({
      providerOrderId: 'pag-tx-1',
    }));
    expect(mocks.repo.updateAttemptProviderData).toHaveBeenCalledWith('attempt-1', expect.objectContaining({
      providerTransactionId: 'pag-tx-1',
    }));
    expect(mocks.repo.createOrderAndAttempt.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.pagbankAdapter.createPix.mock.invocationCallOrder[0],
    );
  });

  it('resolves status through the gateway captured by PaymentAttempt, not the active gateway', async () => {
    mocks.repo.findAttemptByProviderTransactionId.mockResolvedValue({
      id: 'attempt-gg',
      paymentOrderId: 'order-gg',
      caseId: '11111111-1111-4111-8111-111111111111',
      gateway: 'ggpixapi',
      gatewayEnvironment: 'production',
      amountInCents: 1000,
      currency: 'BRL',
      status: 'pending',
      providerOrderId: null,
      providerTransactionId: 'gg-tx-1',
      referenceId: 'ref-gg-1',
    });

    const manager = new GatewayManager();
    const gateway = manager.getActiveGateway();
    const result = await gateway.getPaymentStatus('gg-tx-1');

    expect(result.gateway).toBe('ggpixapi');
    expect(result.status).toBe('PAID');
    expect(mocks.ggpixAdapter.getPaymentStatus).toHaveBeenCalledWith('gg-tx-1');
    expect(mocks.pagbankAdapter.getPaymentStatus).not.toHaveBeenCalled();
    expect(mocks.repo.updateAttemptProviderData).toHaveBeenCalledWith('attempt-gg', expect.objectContaining({ status: 'paid' }));
    expect(mocks.repo.updatePaymentOrder).toHaveBeenCalledWith('order-gg', expect.objectContaining({ status: 'PAID' }));
  });
});
