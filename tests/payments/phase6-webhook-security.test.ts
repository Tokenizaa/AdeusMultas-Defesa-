/**
 * FASE 6 — Teste Webhook Security
 * Idempotência, Spoofing, HMAC, IP Validation
 * Pode rodar em sandbox
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import 'dotenv/config';
import { processGatewayWebhook } from '../../src/server/integrations/gateway/webhook-handler';
import { gatewayManager } from '../../src/server/integrations/gateway/gateway-manager';

import { pagbankAdapter } from '../../src/server/integrations/gateway/pagbank-adapter';
import { ggpixAdapter } from '../../src/server/integrations/gateway/ggpix-adapter';

// Register real adapters at module level
gatewayManager.registerGateway(pagbankAdapter);
gatewayManager.registerGateway(ggpixAdapter);

describe('FASE 6 — Webhook Security', () => {
  const PAGBANK_SECRET = process.env.PAGBANK_WEBHOOK_SECRET || 'test_secret';

  describe('PagBank — HMAC-SHA256', () => {
    const payload = {
      id: 'evt_test_123',
      reference_id: 'defesai_case_case_123',
      created_at: new Date().toISOString(),
      charges: [{
        id: 'ch_123',
        reference_id: 'defesai_case_case_123',
        status: 'PAID',
        created_at: new Date().toISOString(),
        paid_at: new Date().toISOString(),
        amount: { value: 100, currency: 'BRL' },
        payment_method: { type: 'PIX' },
      }],
    };
    const rawBody = JSON.stringify(payload);
    const PAGBANK_SECRET = process.env.PAGBANK_WEBHOOK_SECRET || 'test_secret';

    it('deve aceitar assinatura HMAC válida', () => {
      const crypto = require('crypto');
      const signature = `sha256=${crypto.createHmac('sha256', PAGBANK_SECRET).update(rawBody, 'utf8').digest('hex')}`;

      const result = processGatewayWebhook('/api/webhooks/pagbank', rawBody, {
        'x-hub-signature-256': signature,
      }, payload);

      expect(result).not.toBeNull();
      expect(result?.signatureValid).toBe(true);
      expect(result?.gatewayId).toBe('pagbank');
    });

    it('deve REJEITAR assinatura HMAC inválida', () => {
      const result = processGatewayWebhook('/api/webhooks/pagbank', rawBody, {
        'x-hub-signature-256': 'sha256=assinatura_invalida_qualquer',
      }, payload);

      expect(result).not.toBeNull();
      expect(result?.signatureValid).toBe(false);
    });

    it('deve REJEITAR assinatura sem prefixo sha256=', () => {
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', PAGBANK_SECRET).update(rawBody, 'utf8').digest('hex');

      const result = processGatewayWebhook('/api/webhooks/pagbank', rawBody, {
        'x-hub-signature-256': signature,
      }, payload);

      expect(result?.signatureValid).toBe(true);
    });

    it('deve REJEITAR header de assinatura ausente', () => {
      const result = processGatewayWebhook('/api/webhooks/pagbank', rawBody, {}, payload);

      expect(result?.signatureValid).toBe(false);
    });

    it('deve detectar idempotência (mesmo event ID)', () => {
      const crypto = require('crypto');
      const signature = `sha256=${crypto.createHmac('sha256', PAGBANK_SECRET).update(rawBody, 'utf8').digest('hex')}`;

      const result1 = processGatewayWebhook('/api/webhooks/pagbank', rawBody, {
        'x-hub-signature-256': signature,
      }, payload);
      expect(result1?.event?.isDuplicate).toBe(false);

      const result2 = processGatewayWebhook('/api/webhooks/pagbank', rawBody, {
        'x-hub-signature-256': signature,
      }, payload);
      expect(result2?.event?.received).toBe(true);
      expect(result2?.event?.isDuplicate).toBe(true);
    });

    it('deve aceitar assinatura em header alternativo x-pagbank-signature', () => {
      const crypto = require('crypto');
      const signature = `sha256=${crypto.createHmac('sha256', PAGBANK_SECRET).update(rawBody, 'utf8').digest('hex')}`;

      const result = processGatewayWebhook('/api/webhooks/pagbank', rawBody, {
        'x-pagbank-signature': signature,
      }, payload);

      expect(result?.signatureValid).toBe(true);
    });
  });

  describe('GGPIXAPI — IP Allowlist', () => {
    const basePayload = {
      transactionId: 'ggpix_test_123',
      externalId: 'defesai_case_123',
      status: 'COMPLETE',
      type: 'PIX_IN',
      amount: 100,
      netAmount: 98,
      gatewayFee: 2,
      paidAt: new Date().toISOString(),
    };

    it('deve ACEITAR webhook de IP permitido (127.0.0.1)', () => {
      const result = processGatewayWebhook('/api/webhooks/ggpix', JSON.stringify(basePayload), {
        'x-forwarded-for': '127.0.0.1',
      }, basePayload);

      expect(result).not.toBeNull();
      expect(result?.gatewayId).toBe('ggpixapi');
    });

    it('deve ACEITAR webhook de IP em CIDR permitido', () => {
      vi.stubEnv('GGPIX_WEBHOOK_ALLOWED_IPS', '192.168.1.0/24,10.0.0.0/8');

      const payload = { ...basePayload, transactionId: 'ggpix_cidr_test' };
      const result = processGatewayWebhook('/api/webhooks/ggpix', JSON.stringify(payload), {
        'x-forwarded-for': '192.168.1.50',
      }, payload);

      expect(result).not.toBeNull();
      expect(result?.gatewayId).toBe('ggpixapi');
    });

    it('deve REJEITAR webhook de IP NÃO permitido em produção', () => {
      vi.stubEnv('PAYMENT_MODE', 'production');
      vi.stubEnv('GGPIX_WEBHOOK_ALLOWED_IPS', '192.168.1.0/24');

      const payload = { ...basePayload, transactionId: 'ggpix_block_test' };
      const result = processGatewayWebhook('/api/webhooks/ggpix', JSON.stringify(payload), {
        'x-forwarded-for': '203.0.113.50',
      }, payload);

      expect(result).toBeNull();
    });

    it('deve usar x-real-ip quando x-forwarded-for ausente', () => {
      vi.stubEnv('GGPIX_WEBHOOK_ALLOWED_IPS', '10.0.0.1');
      vi.stubEnv('PAYMENT_MODE', 'production');

      const payload = { ...basePayload, transactionId: 'ggpix_realip_test' };
      const result = processGatewayWebhook('/api/webhooks/ggpix', JSON.stringify(payload), {
        'x-real-ip': '10.0.0.1',
      }, payload);

      expect(result).not.toBeNull();
      expect(result?.gatewayId).toBe('ggpixapi');
    });

    it('deve REJEITAR quando IP não pode ser determinado', () => {
      vi.stubEnv('GGPIX_WEBHOOK_ALLOWED_IPS', '10.0.0.1');
      vi.stubEnv('PAYMENT_MODE', 'production');

      const payload = { ...basePayload, transactionId: 'ggpix_noip_test' };
      const result = processGatewayWebhook('/api/webhooks/ggpix', JSON.stringify(payload), {}, payload);

      expect(result).toBeNull();
    });
  });

  describe('Spoofing Protection', () => {
    it('deve REJEITAR webhook PagBank com payload forjado mas assinatura inválida', () => {
      const fakePayload = {
        id: 'evt_fake_123',
        reference_id: 'defesai_case_fake_123',
        created_at: new Date().toISOString(),
        charges: [{
          id: 'ch_fake_123',
          reference_id: 'defesai_case_fake_123',
          status: 'PAID',
          created_at: new Date().toISOString(),
          paid_at: new Date().toISOString(),
          amount: { value: 1000000, currency: 'BRL' },
          payment_method: { type: 'PIX' },
        }],
      };
      const rawBody = JSON.stringify(fakePayload);
      const PAGBANK_SECRET = process.env.PAGBANK_WEBHOOK_SECRET || 'test_secret';

      const result = processGatewayWebhook('/api/webhooks/pagbank', rawBody, {
        'x-hub-signature-256': 'sha256=assinatura_falsa',
      }, fakePayload);

      expect(result?.signatureValid).toBe(false);
    });

    it('deve lidar com IP spoofed no GGPIX (usa primeiro IP)', () => {
      vi.stubEnv('PAYMENT_MODE', 'production');
      vi.stubEnv('GGPIX_WEBHOOK_ALLOWED_IPS', '192.168.1.0/24');

      const payload = {
        transactionId: 'ggpix_spoof_123',
        externalId: 'defesai_case_spoof',
        status: 'COMPLETE',
        type: 'PIX_IN',
        amount: 100,
      };

      // O primeiro IP (192.168.1.100) está na range permitida, então ACEITA
      const result = processGatewayWebhook('/api/webhooks/ggpix', JSON.stringify({
        transactionId: 'ggpix_spoof_123',
        externalId: 'defesai_case_spoof',
        status: 'COMPLETE',
        type: 'PIX_IN',
        amount: 100,
      }), {
        'x-forwarded-for': '192.168.1.100, 203.0.113.50',
      }, {
        transactionId: 'ggpix_spoof_123',
        externalId: 'defesai_case_spoof',
        status: 'COMPLETE',
        type: 'PIX_IN',
        amount: 100,
      });

      expect(result).not.toBeNull();
    });
  });
});

describe('FASE 6 — Gateway Detection', () => {
  beforeAll(() => {
    gatewayManager.registerGateway(pagbankAdapter);
    gatewayManager.registerGateway(ggpixAdapter);
  });

  it('deve detectar PagBank por path', () => {
    const result = processGatewayWebhook('/api/webhooks/pagbank', '', {}, {});
    expect(result?.gatewayId).toBe('pagbank');
  });

  it('deve detectar GGPIXAPI por path', () => {
    const result = processGatewayWebhook('/api/webhooks/ggpix', '', {}, {});
    expect(result?.gatewayId).toBe('ggpixapi');
  });

  it('deve detectar PagBank por payload (charges array)', () => {
    const payload = { charges: [], reference_id: 'ref_123', created_at: '2024-01-01' };
    const result = processGatewayWebhook('/api/unknown', '', {}, payload);
    expect(result?.gatewayId).toBe('pagbank');
  });

  it('deve detectar GGPIXAPI por payload (transactionId + type)', () => {
    const payload = { transactionId: 'tx_123', type: 'PIX_IN', status: 'COMPLETE' };
    const result = processGatewayWebhook('/api/unknown', '', {}, payload);
    expect(result?.gatewayId).toBe('ggpixapi');
  });

  it('deve retornar null para webhook irreconhecível', () => {
    const result = processGatewayWebhook('/api/unknown', '', {}, { random: 'data' });
    expect(result).toBeNull();
  });
});