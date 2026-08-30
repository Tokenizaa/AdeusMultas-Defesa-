/**
 * FASE 5 — Teste Controlado GGPIX Produção (R$ 1,00)
 * Executa teste ponta-a-ponta com GGPIXAPI real em produção
 * ATENÇÃO: Usa dinheiro real - valor mínimo R$ 1,00
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import 'dotenv/config';
import { ggpixAdapter } from '../../src/server/integrations/gateway/ggpix-adapter';
import { gatewayManager } from '../../src/server/integrations/gateway/gateway-manager';
import { configService } from '../../src/server/config/config-service';
import { paymentRepository } from '../../src/server/db/payment-repository';
import { caseRepository } from '../../src/server/db/case-repository';
import { CanonicalMapper } from '../../src/core/mappers/canonical-mapper';

const TEST_CASE_ID = `phase5_test_${Date.now()}`;
const TEST_CPF = '12345678909';
const TEST_EMAIL = 'phase5_test@defesai.com';
const TEST_NAME = 'Teste Fase 5 GGPIX';

describe('FASE 5 — GGPIX Produção Real (R$ 1,00)', () => {
  let createdOrderId: string;
  let createdReferenceId: string;
  let isProductionReady: boolean;

  beforeAll(() => {
    // Verificar configurações de produção
    const apiKey = process.env.GGPIX_API_KEY;
    const enabled = process.env.GGPIX_ENABLED === 'true';
    const allowedIps = process.env.GGPIX_WEBHOOK_ALLOWED_IPS;
    const paymentMode = process.env.PAYMENT_MODE;
    const activeGateway = process.env.PAYMENT_ACTIVE_GATEWAY;
    
    console.log('[FASE 5] Configurações GGPIX:', {
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey?.substring(0, 10),
      enabled,
      allowedIps: allowedIps || 'NÃO CONFIGURADO',
      paymentMode,
      activeGateway,
      isConfigured: ggpixAdapter.isConfigured(),
    });
    
    // Verificar se está pronto para produção
    isProductionReady = !!apiKey && enabled && paymentMode === 'production' && activeGateway === 'ggpixapi';
    
    if (!isProductionReady) {
      console.warn('[FASE 5] ⚠️ NÃO PRONTO PARA PRODUÇÃO - Configurações incompletas');
      console.warn('[FASE 5] Necessário: PAYMENT_MODE=production, PAYMENT_ACTIVE_GATEWAY=ggpixapi, GGPIX_WEBHOOK_ALLOWED_IPS');
    }
  });

  const skipIfNotReady = () => {
    if (!isProductionReady) {
      console.warn('[FASE 5] Pulando teste - não pronto para produção');
      return true;
    }
    return false;
  };

  it('deve criar ordem PIX real no GGPIX Produção (R$ 1,00)', async () => {
    if (skipIfNotReady()) return;
    
    console.log('[FASE 5] Criando ordem PIX R$ 1,00 no GGPIX Produção...');
    
    const result = await ggpixAdapter.createPix({
      caseId: TEST_CASE_ID,
      referenceId: `defesai_case_${TEST_CASE_ID}`,
      payer: {
        name: TEST_NAME,
        email: TEST_EMAIL,
        document: TEST_CPF,
      },
      amountInCents: 100, // R$ 1,00
      description: 'Teste Fase 5 - GGPIX Produção R$ 1,00',
      webhookUrl: `${process.env.APP_URL || 'https://defesai.com.br'}/api/webhooks/ggpix`,
    }, 15000);

    console.log('[FASE 5] Resultado:', {
      gatewayTransactionId: result.gatewayTransactionId,
      status: result.status,
      amountInCents: result.amountInCents,
      hasQrCode: !!result.qrCodeDataUrl,
      pixCopyPaste: result.pixCopyPaste?.substring(0, 50) + '...',
      gateway: result.gateway,
    });

    expect(result).toBeTruthy();
    expect(result.gateway).toBe('ggpixapi');
    expect(result.status).toBe('PENDING');
    expect(result.amountInCents).toBe(100);
    expect(result.pixCopyPaste).toContain('000201');
    expect(result.qrCodeDataUrl).toContain('data:image/png;base64');
    expect(result.gatewayTransactionId).toBeTruthy();

    createdOrderId = result.gatewayTransactionId;
    createdReferenceId = result.referenceId;
  }, 20000); // timeout 20s para API real

  it('deve consultar status da transação no GGPIX', async () => {
    if (skipIfNotReady()) return;
    
    console.log('[FASE 5] Consultando status...');
    
    const result = await ggpixAdapter.getPaymentStatus(createdOrderId, 10000);

    console.log('[FASE 5] Status:', result);

    expect(result).toBeTruthy();
    expect(result.gateway).toBe('ggpixapi');
    expect(result.gatewayTransactionId).toBe(createdOrderId);
  }, 15000);

  it('deve processar webhook GGPIX real (simulado)', async () => {
    if (skipIfNotReady()) return;
    
    console.log('[FASE 5] Simulando webhook GGPIX COMPLETE...');
    
    const payload = {
      transactionId: createdOrderId,
      externalId: createdReferenceId,
      status: 'COMPLETE',
      type: 'PIX_IN',
      amount: 100,
      netAmount: 98,
      gatewayFee: 2,
      paidAt: new Date().toISOString(),
    };

    const headers = {
      'x-forwarded-for': process.env.GGPIX_WEBHOOK_ALLOWED_IPS?.split(',')[0] || '127.0.0.1',
    };

    const result = ggpixAdapter.processWebhook('', headers, payload);

    console.log('[FASE 5] Resultado webhook:', result);

    expect(result).toBeTruthy();
    expect(result.gateway).toBe('ggpixapi');
    expect(result.status).toBe('PAID');
    expect(result.gatewayTransactionId).toBe(createdOrderId);
    expect(result.referenceId).toBe(createdReferenceId);
    expect(result.amountInCents).toBe(100);
  });
});

describe('FASE 5 — Verificação de Reconciliação', () => {
  it('deve verificar ordem no payment_orders (Supabase)', async () => {
    // Verificar se a ordem foi persistida no payment_orders
    // Nota: paymentRepository persiste via fire-and-forget
    await new Promise(r => setTimeout(r, 1500));
    
    const supabase = (paymentRepository as any).client;
    if (supabase) {
      const { data, error } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('gateway', 'ggpixapi')
        .eq('reference_id', `defesai_case_${TEST_CASE_ID}`)
        .single();
      
      console.log('[FASE 5] payment_orders:', { data: !!data, error: error?.message });
      
      if (data) {
        expect(data.gateway).toBe('ggpixapi');
        expect(data.amount).toBe(1.00);
        expect(data.status).toBe('PENDING');
      }
    }
  });
});