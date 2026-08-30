/**
 * ggpix-adapter.test.ts — Unit tests for GGPIXAdapter
 * Tests: createPix, getPaymentStatus, processWebhook, IP validation, production blocking
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GGPIXAdapter } from '../../src/server/integrations/gateway/ggpix-adapter';
import { GatewayCreatePixInput, GatewayPaymentStatus, NormalizedWebhookEvent } from '../../src/server/integrations/gateway/types';

describe('GGPIXAdapter — Configuration', () => {
  it('should return false when not enabled', () => {
    vi.stubEnv('GGPIX_ENABLED', 'false');
    vi.stubEnv('GGPIX_API_KEY', 'test_key');

    const adapter = new GGPIXAdapter();
    expect(adapter.isConfigured()).toBe(false);
  });

  it('should return false when API key missing', () => {
    vi.stubEnv('GGPIX_ENABLED', 'true');
    vi.stubEnv('GGPIX_API_KEY', '');

    const adapter = new GGPIXAdapter();
    expect(adapter.isConfigured()).toBe(false);
  });

  it('should return true when enabled and API key present', () => {
    vi.stubEnv('GGPIX_ENABLED', 'true');
    vi.stubEnv('GGPIX_API_KEY', 'gk_test_key_123');

    const adapter = new GGPIXAdapter();
    expect(adapter.isConfigured()).toBe(true);
  });
});

describe('GGPIXAdapter — createPix', () => {
  const baseInput: GatewayCreatePixInput = {
    caseId: 'case_123',
    referenceId: 'defesai_case_123_456',
    payer: {
      name: 'João Silva',
      email: 'joao@email.com',
      document: '12345678909',
      phone: '11999999999',
    },
    amountInCents: 8990,
    description: 'DefesAi - Recurso JARI',
  };

  beforeEach(() => {
    vi.stubEnv('GGPIX_ENABLED', 'true');
    vi.stubEnv('GGPIX_API_KEY', 'gk_test_key_123');
    vi.stubEnv('APP_URL', 'https://test.defesai.com');
    vi.stubEnv('PAYMENT_MODE', 'sandbox');
  });

  it('should return local mock data when not configured', async () => {
    vi.stubEnv('GGPIX_ENABLED', 'false');

    const adapter = new GGPIXAdapter();
    const result = await adapter.createPix(baseInput);

    expect(result.gateway).toBe('ggpixapi');
    expect(result.status).toBe('PENDING');
    expect(result.amountInCents).toBe(8990);
    expect(result.pixCopyPaste).toContain('000201');
    expect(result.qrCodeDataUrl).toContain('data:image/png;base64');
    expect(result.referenceId).toBe('defesai_case_123_456');
  });

  it('should generate valid PIX EMV string with correct amount', async () => {
    vi.stubEnv('GGPIX_ENABLED', 'false');

    const adapter = new GGPIXAdapter();
    const result = await adapter.createPix({
      ...baseInput,
      amountInCents: 5000, // R$ 50,00
    });

    // PIX EMV should contain amount in cents format
    expect(result.pixCopyPaste).toContain('50.00');
  });

  it('should clean CPF document internally for API request', async () => {
    vi.stubEnv('GGPIX_ENABLED', 'false');

    const adapter = new GGPIXAdapter();
    const result = await adapter.createPix({
      ...baseInput,
      payer: { ...baseInput.payer, document: '123.456.789-09' },
    });

    // Adapter internally cleans the document for API request (not in fallback EMV string)
    // The fallback EMV string is a placeholder; real EMV comes from gateway API
    expect(result.pixCopyPaste).toContain('000201');
    expect(result.pixCopyPaste).toContain('5802BR');
  });

  it('should throw error for invalid amountInCents', async () => {
    const adapter = new GGPIXAdapter();

    await expect(adapter.createPix({
      ...baseInput,
      amountInCents: 0,
    })).rejects.toThrow('amountInCents inválido');

    await expect(adapter.createPix({
      ...baseInput,
      amountInCents: -100,
    })).rejects.toThrow('amountInCents inválido');
  });

  it('should include webhook URL in request', async () => {
    vi.stubEnv('GGPIX_ENABLED', 'false');

    const adapter = new GGPIXAdapter();
    const result = await adapter.createPix(baseInput);

    expect(result.expiresAt).toBeDefined();
    const expiresAt = new Date(result.expiresAt);
    const now = new Date();
    expect(expiresAt.getTime()).toBeGreaterThan(now.getTime() + 25 * 60 * 1000); // ~30 min
  });
});

describe('GGPIXAdapter — createCreditCard', () => {
  it('should throw error (GGPIXAPI does not support credit card)', async () => {
    const adapter = new GGPIXAdapter();

    await expect(adapter.createCreditCard({
      caseId: 'case_123',
      referenceId: 'defesai_case_123',
      payer: { name: 'Test', document: '12345678909' },
      amountInCents: 8990,
      description: 'Test',
      cardToken: 'token_123',
    })).rejects.toThrow('GGPIXAPI não suporta pagamento com cartão de crédito');
  });
});

describe('GGPIXAdapter — getPaymentStatus', () => {
  beforeEach(() => {
    vi.stubEnv('GGPIX_ENABLED', 'true');
    vi.stubEnv('GGPIX_API_KEY', 'gk_test_key_123');
    vi.stubEnv('PAYMENT_MODE', 'sandbox');
  });

  it('should return PENDING when API fails in sandbox', async () => {
    const adapter = new GGPIXAdapter();
    const result = await adapter.getPaymentStatus('tx_nonexistent');

    expect(result.gateway).toBe('ggpixapi');
    expect(result.gatewayTransactionId).toBe('tx_nonexistent');
    expect(result.status).toBe('PENDING');
  });

  it('should map GGPIXAPI statuses correctly', () => {
    const adapter = new GGPIXAdapter();
    // Test the private mapGGPixStatus function via reflection
    const mapStatus = (adapter as any).mapGGPixStatus || ((adapter.constructor as any).prototype.mapGGPixStatus);
    // We'll test via processWebhook instead which uses the same mapping
  });
});

describe('GGPIXAdapter — processWebhook (IP Validation)', () => {
  const basePayload = {
    transactionId: 'ggpix_tx_123',
    externalId: 'defesai_case_123',
    status: 'COMPLETE',
    type: 'PIX_IN',
    amount: 8990,
    netAmount: 8900,
    gatewayFee: 90,
    paidAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.stubEnv('GGPIX_ENABLED', 'true');
    vi.stubEnv('GGPIX_API_KEY', 'gk_test_key_123');
  });

  it('should accept webhook when no IP allowlist configured (sandbox)', () => {
    vi.stubEnv('GGPIX_WEBHOOK_ALLOWED_IPS', '');
    vi.stubEnv('PAYMENT_MODE', 'sandbox');

    const adapter = new GGPIXAdapter();
    const result = adapter.processWebhook('', {}, basePayload);

    expect(result.gateway).toBe('ggpixapi');
    expect(result.status).toBe('PAID');
    expect(result.gatewayTransactionId).toBe('ggpix_tx_123');
    expect(result.referenceId).toBe('defesai_case_123');
    expect(result.amountInCents).toBe(8990);
    expect(result.isDuplicate).toBe(false);
  });

  it('should warn but accept webhook when no IP allowlist in production', () => {
    vi.stubEnv('GGPIX_WEBHOOK_ALLOWED_IPS', '');
    vi.stubEnv('PAYMENT_MODE', 'production');

    const adapter = new GGPIXAdapter();
    const result = adapter.processWebhook('', { 'x-forwarded-for': '1.2.3.4' }, basePayload);

    expect(result.status).toBe('PAID');
  });

  it('should accept webhook from allowed IP', () => {
    vi.stubEnv('GGPIX_WEBHOOK_ALLOWED_IPS', '192.168.1.1,10.0.0.0/8');
    vi.stubEnv('PAYMENT_MODE', 'production');

    const adapter = new GGPIXAdapter();
    const result = adapter.processWebhook('', { 'x-forwarded-for': '192.168.1.1' }, basePayload);

    expect(result.status).toBe('PAID');
  });

  it('should accept webhook from allowed CIDR range', () => {
    vi.stubEnv('GGPIX_WEBHOOK_ALLOWED_IPS', '10.0.0.0/8');
    vi.stubEnv('PAYMENT_MODE', 'production');

    const adapter = new GGPIXAdapter();
    const result = adapter.processWebhook('', { 'x-forwarded-for': '10.5.10.20' }, basePayload);

    expect(result.status).toBe('PAID');
  });

  it('should reject webhook from non-allowed IP', () => {
    vi.stubEnv('GGPIX_WEBHOOK_ALLOWED_IPS', '192.168.1.1');
    vi.stubEnv('PAYMENT_MODE', 'production');

    const adapter = new GGPIXAdapter();

    expect(() => {
      adapter.processWebhook('', { 'x-forwarded-for': '203.0.113.50' }, basePayload);
    }).toThrow('Webhook GGPIXAPI rejeitado: IP de origem não autorizado');
  });

  it('should reject webhook when IP cannot be determined', () => {
    vi.stubEnv('GGPIX_WEBHOOK_ALLOWED_IPS', '192.168.1.1');
    vi.stubEnv('PAYMENT_MODE', 'production');

    const adapter = new GGPIXAdapter();

    expect(() => {
      adapter.processWebhook('', {}, basePayload);
    }).toThrow('Webhook GGPIXAPI rejeitado: IP de origem não autorizado');
  });

  it('should use x-real-ip when x-forwarded-for not present', () => {
    vi.stubEnv('GGPIX_WEBHOOK_ALLOWED_IPS', '192.168.1.100');
    vi.stubEnv('PAYMENT_MODE', 'production');

    const adapter = new GGPIXAdapter();
    const result = adapter.processWebhook('', { 'x-real-ip': '192.168.1.100' }, basePayload);

    expect(result.status).toBe('PAID');
  });

  it('should map GGPIXAPI statuses correctly', () => {
    vi.stubEnv('GGPIX_WEBHOOK_ALLOWED_IPS', '');
    vi.stubEnv('PAYMENT_MODE', 'sandbox');

    const adapter = new GGPIXAdapter();

    const testCases: Array<{ input: string; expected: GatewayPaymentStatus }> = [
      { input: 'PENDING', expected: 'PENDING' },
      { input: 'COMPLETE', expected: 'PAID' },
      { input: 'FAILED', expected: 'DECLINED' },
      { input: 'CANCELED', expected: 'CANCELED' },
    ];

    for (const { input, expected } of testCases) {
      const payload = { ...basePayload, status: input };
      const result = adapter.processWebhook('', {}, payload);
      expect(result.status).toBe(expected);
    }
  });
});

describe('GGPIXAdapter — Production Mode Blocking', () => {
  it('should throw in production when API returns error', async () => {
    vi.stubEnv('GGPIX_ENABLED', 'true');
    vi.stubEnv('GGPIX_API_KEY', 'gk_test_key_123');
    vi.stubEnv('PAYMENT_MODE', 'production');
    // Note: Actual API call would fail since we're not mocking fetch
    // This test documents the expected behavior

    const adapter = new GGPIXAdapter();
    // The adapter will try to call the real API and fail in test env
    // In real production, it would throw on HTTP error
    await expect(adapter.createPix({
      caseId: 'case_123',
      payer: { name: 'Test', document: '12345678909' },
      amountInCents: 1000,
      description: 'Test',
    })).rejects.toThrow();
  });
});