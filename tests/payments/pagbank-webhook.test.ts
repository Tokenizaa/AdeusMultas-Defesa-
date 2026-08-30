/**
 * pagbank-webhook.test.ts — Unit tests for PagBankIntegrationService webhook processing
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set up environment BEFORE importing the service
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_key';
process.env.SUPABASE_URL = 'https://test.supabase.co';

import { PagBankIntegrationService } from '../../src/server/integrations/pagbank';
import type { PagBankWebhookPayload } from '../../src/server/integrations/pagbank';

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
}

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
    const order = await service.createPixOrder({
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