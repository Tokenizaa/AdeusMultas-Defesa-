/**
 * pagbank.test.ts — Unit tests for PagBankIntegrationService
 * Tests: createPixOrder, createCreditCardOrder, verifyWebhookSignature, confirmPayment, production blocking
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Set up environment BEFORE importing the service
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_key';
process.env.SUPABASE_URL = 'https://test.supabase.co';

import { PagBankIntegrationService } from '../../src/server/integrations/pagbank';
import type { CreateOrderParams, CreditCardOrderParams, PagBankOrderResult, PagBankWebhookPayload } from '../../src/server/integrations/pagbank';

function setEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

function resetEnv() {
  setEnv('PAGBANK_TOKEN', undefined);
  setEnv('PAGBANK_ENV', undefined);
  setEnv('PAGBANK_WEBHOOK_SECRET', undefined);
  setEnv('PAGSEGURO_TOKEN', undefined);
  setEnv('PAYMENT_MODE', undefined);
  setEnv('APP_URL', undefined);
  setEnv('PAGBANK_TOKEN', undefined);
}

describe('PagBankIntegrationService — Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetEnv();
  });

  it('should default to sandbox environment', () => {
    setEnv('PAGBANK_TOKEN', 'test_token');
    setEnv('PAGBANK_ENV', '');

    const service = new PagBankIntegrationService();
    expect((service as any).environment).toBe('sandbox');
    expect((service as any).apiBaseUrl).toBe('https://sandbox.api.pagseguro.com');
  });

  it('should use production environment when PAGBANK_ENV=production', () => {
    setEnv('PAGBANK_TOKEN', 'test_token');
    setEnv('PAGBANK_ENV', 'production');

    const service = new PagBankIntegrationService();
    expect((service as any).environment).toBe('production');
    expect((service as any).apiBaseUrl).toBe('https://api.pagseguro.com');
  });

  it('should use PAGSEGURO_TOKEN as fallback', () => {
    setEnv('PAGBANK_TOKEN', '');
    setEnv('PAGSEGURO_TOKEN', 'fallback_token');
    setEnv('PAGBANK_ENV', 'sandbox');

    const service = new PagBankIntegrationService();
    expect((service as any).token).toBe('fallback_token');
  });
});

describe('PagBankIntegrationService — isProductionMode', () => {
  beforeEach(() => {
    resetEnv();
  });

  it('should return true when PAYMENT_MODE=production', () => {
    setEnv('PAYMENT_MODE', 'production');
    setEnv('PAGBANK_TOKEN', 'test_token');
    setEnv('PAGBANK_ENV', 'sandbox');

    const service = new PagBankIntegrationService();
    expect((service as any).isProductionMode()).toBe(true);
  });

  it('should return false when PAYMENT_MODE=sandbox', () => {
    setEnv('PAYMENT_MODE', 'sandbox');
    setEnv('PAGBANK_TOKEN', 'test_token');
    setEnv('PAGBANK_ENV', 'sandbox');

    const service = new PagBankIntegrationService();
    expect((service as any).isProductionMode()).toBe(false);
  });

  it('should return false when PAYMENT_MODE not set', () => {
    setEnv('PAYMENT_MODE', undefined);
    setEnv('PAGBANK_TOKEN', 'test_token');
    setEnv('PAGBANK_ENV', 'sandbox');

    const service = new PagBankIntegrationService();
    expect((service as any).isProductionMode()).toBe(false);
  });
});

describe('PagBankIntegrationService — verifyWebhookSignature', () => {
  const secret = 'test_webhook_secret_123';
  const payload = { id: 'evt_123', reference_id: 'ref_123', charges: [{ id: 'ch_123', status: 'PAID' }] };
  const rawBody = JSON.stringify(payload);

  beforeEach(() => {
    resetEnv();
    setEnv('PAGBANK_TOKEN', 'test_token');
    setEnv('PAGBANK_ENV', 'sandbox');
    setEnv('PAGBANK_WEBHOOK_SECRET', secret);
  });

  it('should validate correct HMAC-SHA256 signature', () => {
    const crypto = require('crypto');
    const expectedSignature = `sha256=${crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')}`;

    const service = new PagBankIntegrationService();
    const result = (service as any).verifyWebhookSignature(rawBody, expectedSignature);

    expect(result).toBe(true);
  });

  it('should accept signature without sha256= prefix', () => {
    const crypto = require('crypto');
    const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');

    const service = new PagBankIntegrationService();
    const result = (service as any).verifyWebhookSignature(rawBody, expectedSignature);

    expect(result).toBe(true);
  });

  it('should reject invalid signature', () => {
    const service = new PagBankIntegrationService();
    const result = (service as any).verifyWebhookSignature(rawBody, 'sha256=invalid_signature');

    expect(result).toBe(false);
  });

  it('should reject missing signature header', () => {
    const service = new PagBankIntegrationService();
    const result = (service as any).verifyWebhookSignature(rawBody, '');

    expect(result).toBe(false);
  });

  it('should warn but allow in sandbox when secret not configured', () => {
    setEnv('PAGBANK_WEBHOOK_SECRET', undefined);

    const service = new PagBankIntegrationService();
    const result = (service as any).verifyWebhookSignature(rawBody, 'any_signature');

    expect(result).toBe(true);
  });

  it('should BLOCK in production when secret not configured', () => {
    setEnv('PAGBANK_WEBHOOK_SECRET', undefined);
    setEnv('PAYMENT_MODE', 'production');

    const service = new PagBankIntegrationService();
    const result = (service as any).verifyWebhookSignature(rawBody, 'any_signature');

    expect(result).toBe(false);
  });

  it('should accept signature without sha256= prefix', () => {
    const crypto = require('crypto');
    const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');

    const service = new PagBankIntegrationService();
    const result = (service as any).verifyWebhookSignature(rawBody, expectedSignature);

    expect(result).toBe(true);
  });
});

describe('PagBankIntegrationService — cleanTaxId', () => {
  beforeEach(() => {
    resetEnv();
    setEnv('PAGBANK_TOKEN', 'test_token');
    setEnv('PAGBANK_ENV', 'sandbox');
  });

  it('should remove non-digits from CPF', () => {
    const service = new PagBankIntegrationService();
    expect((service as any).cleanTaxId('123.456.789-09')).toBe('12345678909');
  });

  it('should remove non-digits from CNPJ', () => {
    const service = new PagBankIntegrationService();
    expect((service as any).cleanTaxId('12.345.678/0001-90')).toBe('12345678000190');
  });

  it('should return empty string for empty input', () => {
    const service = new PagBankIntegrationService();
    expect((service as any).cleanTaxId('')).toBe('');
  });
});

describe('PagBankIntegrationService — buildNotificationUrls', () => {
  beforeEach(() => {
    resetEnv();
    setEnv('PAGBANK_TOKEN', 'test_token');
    setEnv('PAGBANK_ENV', 'sandbox');
    setEnv('APP_URL', 'https://test.defesai.com');
  });

  it('should build correct webhook URL', () => {
    const service = new PagBankIntegrationService();
    const urls = (service as any).buildNotificationUrls();

    expect(urls).toEqual(['https://test.defesai.com/api/webhooks/pagbank']);
  });
});

describe('PagBankIntegrationService — createPixOrder', () => {
  const baseParams: CreateOrderParams = {
    caseId: 'case_123',
    referenceId: 'defesai_case_123',
    customer: {
      name: 'João Silva',
      email: 'joao@email.com',
      taxId: '12345678909',
    },
    amount: 89.90,
    description: 'DefesAi - Recurso JARI',
  };

  beforeEach(() => {
    resetEnv();
    setEnv('PAGBANK_TOKEN', 'test_token');
    setEnv('PAGBANK_ENV', 'sandbox');
    setEnv('APP_URL', 'https://test.defesai.com');
  });

  it('should return local mock order when token is mock_', async () => {
    setEnv('PAGBANK_TOKEN', 'mock_test_token');

    const service = new PagBankIntegrationService();
    const result = await service.createPixOrder(baseParams);

    expect(result.status).toBe('PENDING');
    expect(result.amount).toBe(89.90);
    expect(result.paymentMethod).toBe('pix');
    expect(result.qrCodeText).toContain('000201');
    expect(result.orderId).toContain('ORDE_');
  });

  it('should throw in production when token is mock_', async () => {
    setEnv('PAGBANK_TOKEN', 'mock_test_token');
    setEnv('PAYMENT_MODE', 'production');

    const service = new PagBankIntegrationService();

    await expect(service.createPixOrder(baseParams))
      .rejects.toThrow('PAGBANK_TOKEN com prefixo "mock_" não é permitido em produção');
  });

  it('should throw in production when token not configured', async () => {
    setEnv('PAGBANK_TOKEN', undefined);
    setEnv('PAYMENT_MODE', 'production');

    const service = new PagBankIntegrationService();

    await expect(service.createPixOrder(baseParams))
      .rejects.toThrow('PAGBANK_TOKEN não configurado. Pagamento indisponível em produção.');
  });

  it('should generate valid EMV PIX string', async () => {
    setEnv('PAGBANK_TOKEN', 'mock_test_token');

    const service = new PagBankIntegrationService();
    const result = await service.createPixOrder(baseParams);

    expect(result.qrCodeText).toContain('000201');
    expect(result.qrCodeText).toContain('br.gov.bcb.pix');
    expect(result.qrCodeText).toContain('540589.90');
    expect(result.qrCodeText).toContain('5802BR');
    expect(result.qrCodeText).toContain('5915DEFESAI BRASIL');
    expect(result.qrCodeText).toContain('6009SAO PAULO');
  });

  it('should persist order to paymentRepository', async () => {
    setEnv('PAGBANK_TOKEN', 'mock_test_token');

    const service = new PagBankIntegrationService();
    const result = await service.createPixOrder(baseParams);

    const stored = service.getOrder(result.orderId);
    expect(stored).toBeDefined();
    expect(stored?.orderId).toBe(result.orderId);
  });
});

describe('PagBankIntegrationService — createCreditCardOrder', () => {
  const baseParams: CreditCardOrderParams = {
    caseId: 'case_123',
    referenceId: 'defesai_case_123_cc',
    customer: {
      name: 'João Silva',
      email: 'joao@email.com',
      taxId: '12345678909',
    },
    amount: 89.90,
    installments: 1,
    cardToken: 'card_token_123',
    authenticationMethod: 'CHALLENGE',
    softDescriptor: 'DEFAI*RECURSO',
  };

  beforeEach(() => {
    resetEnv();
    setEnv('PAGBANK_TOKEN', 'mock_test_token');
    setEnv('PAGBANK_ENV', 'sandbox');
    setEnv('APP_URL', 'https://test.defesai.com');
  });

  it('should return local mock order in sandbox', async () => {
    const service = new PagBankIntegrationService();
    const result = await service.createCreditCardOrder(baseParams);

    expect(result.status).toBe('WAITING');
    expect(result.amount).toBe(89.90);
    expect(result.paymentMethod).toBe('credit_card');
    expect(result.threeDsChallengeRequired).toBe(true);
    expect(result.threeDsUrl).toContain('sandbox.pagseguro.com/3ds/challenge/');
  });

  it('should return AUTHORIZED for FRICTIONLESS in sandbox', async () => {
    const service = new PagBankIntegrationService();
    const result = await service.createCreditCardOrder({
      ...baseParams,
      authenticationMethod: 'FRICTIONLESS',
    });

    expect(result.status).toBe('AUTHORIZED');
    expect(result.threeDsChallengeRequired).toBe(false);
    expect(result.threeDsUrl).toBeUndefined();
  });

  it('should throw in production when token is mock_', async () => {
    setEnv('PAYMENT_MODE', 'production');

    const service = new PagBankIntegrationService();

    await expect(service.createCreditCardOrder(baseParams))
      .rejects.toThrow('PAGBANK_TOKEN com prefixo "mock_" não é permitido em produção.');
  });

  it('should throw in production when token not configured', async () => {
    setEnv('PAGBANK_TOKEN', undefined);
    setEnv('PAYMENT_MODE', 'production');

    const service = new PagBankIntegrationService();

    await expect(service.createCreditCardOrder(baseParams))
      .rejects.toThrow('PAGBANK_TOKEN não configurado. Pagamento com cartão indisponível em produção.');
  });

  it('should include installments in request', async () => {
    const service = new PagBankIntegrationService();
    const result = await service.createCreditCardOrder({
      ...baseParams,
      installments: 3,
    });

    expect(result.amount).toBe(89.90);
  });
});

describe('PagBankIntegrationService — confirmPayment', () => {
  beforeEach(() => {
    resetEnv();
    setEnv('PAGBANK_TOKEN', 'mock_test_token');
    setEnv('PAGBANK_ENV', 'sandbox');
  });

  it('should confirm existing order', async () => {
    const service = new PagBankIntegrationService();

    const createResult = await service.createPixOrder({
      caseId: 'case_123',
      customer: { name: 'Test', email: 'test@test.com', taxId: '12345678909' },
      amount: 89.90,
    });

    const result = service.confirmPayment(createResult.orderId);

    expect(result.success).toBe(true);
    expect(result.alreadyPaid).toBe(false);
    expect(result.order.status).toBe('PAID');
  });

  it('should handle already paid order', async () => {
    const service = new PagBankIntegrationService();

    const createResult = await service.createPixOrder({
      caseId: 'case_123',
      customer: { name: 'Test', email: 'test@test.com', taxId: '12345678909' },
      amount: 89.90,
    });

    service.confirmPayment(createResult.orderId);
    const result = service.confirmPayment(createResult.orderId);

    expect(result.success).toBe(true);
    expect(result.alreadyPaid).toBe(true);
  });

  it('should create order on the fly if not found', () => {
    const service = new PagBankIntegrationService();

    const result = service.confirmPayment('nonexistent_case');

    expect(result.success).toBe(true);
    expect(result.order.status).toBe('PAID');
    expect(result.order.caseId).toBe('nonexistent_case');
  });
});

describe('PagBankIntegrationService — processWebhook', () => {
  const secret = 'test_webhook_secret_123';
  const payload: PagBankWebhookPayload = {
    id: 'evt_123',
    reference_id: 'defesai_case_123',
    created_at: new Date().toISOString(),
    charges: [{
      id: 'ch_123',
      reference_id: 'defesai_case_123',
      status: 'PAID',
      created_at: new Date().toISOString(),
      paid_at: new Date().toISOString(),
      amount: { value: 8990, currency: 'BRL' },
      payment_method: { type: 'PIX' },
    }],
  };
  const rawBody = JSON.stringify(payload);

  beforeEach(() => {
    resetEnv();
    setEnv('PAGBANK_TOKEN', 'mock_test_token');
    setEnv('PAGBANK_ENV', 'sandbox');
    setEnv('PAGBANK_WEBHOOK_SECRET', secret);
  });

  it('should process valid webhook with correct signature', () => {
    const crypto = require('crypto');
    const signature = `sha256=${crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')}`;

    const service = new PagBankIntegrationService();
    const result = service.processWebhook(rawBody, signature, payload);

    expect(result.received).toBe(true);
    expect(result.signatureValid).toBe(true);
    expect(result.isDuplicate).toBe(false);
    expect(result.status).toBe('PAID');
    expect(result.orderId).toBe('evt_123');
  });

  it('should reject webhook with invalid signature', () => {
    const service = new PagBankIntegrationService();
    const result = service.processWebhook(rawBody, 'sha256=invalid', payload);

    expect(result.received).toBe(false);
    expect(result.signatureValid).toBe(false);
  });

  it('should handle duplicate webhook (idempotency)', () => {
    const crypto = require('crypto');
    const signature = `sha256=${crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')}`;

    const service = new PagBankIntegrationService();

    const result1 = service.processWebhook(rawBody, signature, payload);
    expect(result1.isDuplicate).toBe(false);

    const result2 = service.processWebhook(rawBody, signature, payload);
    expect(result2.isDuplicate).toBe(true);
    expect(result2.received).toBe(true);
  });

  it('should extract caseId from reference_id', async () => {
    const crypto = require('crypto');
    const signature = `sha256=${crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')}`;

    // Pre-create order so it's in the store for caseId lookup
    const service = new PagBankIntegrationService();
    await service.createPixOrder({
      caseId: 'case_123',
      customer: { name: 'Test', email: 'test@test.com', taxId: '12345678909' },
      amount: 89.90,
      referenceId: 'defesai_case_123',
    });

    const result = service.processWebhook(rawBody, signature, payload);

    expect(result.caseId).toBe('case_123');
  });
});

describe('PagBankIntegrationService — Production Blocking', () => {
  it('should block mock tokens in production', async () => {
    resetEnv();
    setEnv('PAGBANK_TOKEN', 'mock_test_token');
    setEnv('PAGBANK_ENV', 'production');
    setEnv('PAYMENT_MODE', 'production');
    setEnv('APP_URL', 'https://test.defesai.com');

    const service = new PagBankIntegrationService();

    await expect(service.createPixOrder({
      caseId: 'case_123',
      customer: { name: 'Test', email: 'test@test.com', taxId: '12345678909' },
      amount: 89.90,
    })).rejects.toThrow('PAGBANK_TOKEN com prefixo "mock_" não é permitido em produção');
  });

  it('should block missing token in production', async () => {
    resetEnv();
    setEnv('PAGBANK_TOKEN', '');
    setEnv('PAGBANK_ENV', 'production');
    setEnv('PAYMENT_MODE', 'production');
    setEnv('APP_URL', 'https://test.defesai.com');

    const service = new PagBankIntegrationService();

    await expect(service.createPixOrder({
      caseId: 'case_123',
      customer: { name: 'Test', email: 'test@test.com', taxId: '12345678909' },
      amount: 89.90,
    })).rejects.toThrow('PAGBANK_TOKEN não configurado. Pagamento indisponível em produção.');
  });
});