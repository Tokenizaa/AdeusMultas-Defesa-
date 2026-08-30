/**
 * gateway-manager.test.ts — Unit tests for GatewayManager
 * Tests: active gateway resolution, production blocking, runtime switch persistence, status reporting
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GatewayManager } from '../../src/server/integrations/gateway/gateway-manager';
import { PaymentGateway, GatewayId, GatewayCreatePixInput, GatewayPixResult, GatewayPaymentStatusResult } from '../../src/server/integrations/gateway/types';
import { configService } from '../../src/server/config/config-service';

// Mock adapters
const createMockAdapter = (id: GatewayId, configured: boolean = true): PaymentGateway => {
  const base = {
    id,
    displayName: id === 'pagbank' ? 'PagBank (PIX + Cartão)' : 'GGPIXAPI (PIX)',
    isConfigured: () => configured,
    createPix: vi.fn().mockResolvedValue({
      gatewayTransactionId: `tx_${id}_123`,
      referenceId: 'ref_123',
      gateway: id,
      status: 'PENDING',
      amountInCents: 10000,
      pixCopyPaste: '000201...',
      qrCodeDataUrl: 'data:image/png;base64,...',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    }),
    getPaymentStatus: vi.fn().mockResolvedValue({
      gatewayTransactionId: `tx_${id}_123`,
      gateway: id,
      status: 'PENDING',
    }),
    processWebhook: vi.fn().mockReturnValue({
      gatewayEventId: `evt_${id}_123`,
      gateway: id,
      gatewayTransactionId: `tx_${id}_123`,
      referenceId: 'ref_123',
      status: 'PAID',
      transactionType: 'PIX_IN',
      amountInCents: 10000,
      rawPayload: {},
      isDuplicate: false,
    }),
  };

  // Only pagbank supports credit card
  if (id === 'pagbank') {
    return {
      ...base,
      createCreditCard: vi.fn().mockResolvedValue({
        gatewayTransactionId: `tx_${id}_cc_123`,
        referenceId: 'ref_123_cc',
        gateway: id,
        status: 'AUTHORIZED',
        amountInCents: 10000,
        createdAt: new Date().toISOString(),
        threeDsUrl: 'https://test.com/3ds',
        threeDsChallengeRequired: true,
      }),
    };
  }

  return base;
};

// Mock configService
const originalConfigGet = configService.get;
const originalConfigUpdate = configService.update;

beforeEach(() => {
  vi.clearAllMocks();
  // Reset configService mocks
  configService.get = vi.fn().mockImplementation((key: string) => {
    if (key === 'PAYMENT_ACTIVE_GATEWAY_OVERRIDE') return '';
    return originalConfigGet.call(configService, key);
  });
  configService.update = vi.fn().mockResolvedValue({ success: true, message: 'OK' });
});

afterEach(() => {
  configService.get = originalConfigGet;
  configService.update = originalConfigUpdate;
});

describe('GatewayManager — Active Gateway Resolution', () => {
  it('should default to ggpixapi when PAYMENT_MODE=production', () => {
    vi.stubEnv('PAYMENT_MODE', 'production');
    vi.stubEnv('PAYMENT_ACTIVE_GATEWAY', '');

    const manager = new GatewayManager();
    // Register mock adapters
    manager.registerGateway(createMockAdapter('pagbank'));
    manager.registerGateway(createMockAdapter('ggpixapi'));

    const active = manager.getActiveGateway();
    expect(active.id).toBe('ggpixapi');
  });

  it('should default to pagbank when PAYMENT_MODE=sandbox', () => {
    vi.stubEnv('PAYMENT_MODE', 'sandbox');
    vi.stubEnv('PAYMENT_ACTIVE_GATEWAY', '');

    const manager = new GatewayManager();
    manager.registerGateway(createMockAdapter('pagbank'));
    manager.registerGateway(createMockAdapter('ggpixapi'));

    const active = manager.getActiveGateway();
    expect(active.id).toBe('pagbank');
  });

  it('should respect explicit PAYMENT_ACTIVE_GATEWAY=ggpixapi in sandbox', () => {
    vi.stubEnv('PAYMENT_MODE', 'sandbox');
    vi.stubEnv('PAYMENT_ACTIVE_GATEWAY', 'ggpixapi');

    const manager = new GatewayManager();
    manager.registerGateway(createMockAdapter('pagbank'));
    manager.registerGateway(createMockAdapter('ggpixapi'));

    const active = manager.getActiveGateway();
    expect(active.id).toBe('ggpixapi');
  });

  it('should respect explicit PAYMENT_ACTIVE_GATEWAY=pagbank in sandbox', () => {
    vi.stubEnv('PAYMENT_MODE', 'sandbox');
    vi.stubEnv('PAYMENT_ACTIVE_GATEWAY', 'pagbank');

    const manager = new GatewayManager();
    manager.registerGateway(createMockAdapter('pagbank'));
    manager.registerGateway(createMockAdapter('ggpixapi'));

    const active = manager.getActiveGateway();
    expect(active.id).toBe('pagbank');
  });

  it('should BLOCK pagbank when PAYMENT_ACTIVE_GATEWAY=pagbank but PAYMENT_MODE=production', () => {
    vi.stubEnv('PAYMENT_MODE', 'production');
    vi.stubEnv('PAYMENT_ACTIVE_GATEWAY', 'pagbank');

    const manager = new GatewayManager();
    manager.registerGateway(createMockAdapter('pagbank'));
    manager.registerGateway(createMockAdapter('ggpixapi'));

    const active = manager.getActiveGateway();
    expect(active.id).toBe('ggpixapi'); // Forced to ggpixapi
  });

  it('should use ConfigService override when set', () => {
    vi.stubEnv('PAYMENT_MODE', 'production');
    vi.stubEnv('PAYMENT_ACTIVE_GATEWAY', 'ggpixapi');
    configService.get = vi.fn().mockImplementation((key: string) => {
      if (key === 'PAYMENT_ACTIVE_GATEWAY_OVERRIDE') return 'pagbank';
      return '';
    });

    const manager = new GatewayManager();
    manager.registerGateway(createMockAdapter('pagbank'));
    manager.registerGateway(createMockAdapter('ggpixapi'));

    const active = manager.getActiveGateway();
    expect(active.id).toBe('pagbank'); // Override takes precedence
  });

  it('should use ConfigService override for ggpixapi in sandbox', () => {
    vi.stubEnv('PAYMENT_MODE', 'sandbox');
    vi.stubEnv('PAYMENT_ACTIVE_GATEWAY', 'pagbank');
    configService.get = vi.fn().mockImplementation((key: string) => {
      if (key === 'PAYMENT_ACTIVE_GATEWAY_OVERRIDE') return 'ggpixapi';
      return '';
    });

    const manager = new GatewayManager();
    manager.registerGateway(createMockAdapter('pagbank'));
    manager.registerGateway(createMockAdapter('ggpixapi'));

    const active = manager.getActiveGateway();
    expect(active.id).toBe('ggpixapi'); // Override takes precedence
  });
});

describe('GatewayManager — Gateway Status Reporting', () => {
  it('should report correct status for configured gateways', () => {
    vi.stubEnv('PAYMENT_MODE', 'sandbox');
    vi.stubEnv('PAYMENT_ACTIVE_GATEWAY', 'pagbank');

    const manager = new GatewayManager();
    manager.registerGateway(createMockAdapter('pagbank', true));
    manager.registerGateway(createMockAdapter('ggpixapi', true));

    const status = manager.getGatewayStatus();
    const pagbank = status.find(g => g.id === 'pagbank');
    const ggpix = status.find(g => g.id === 'ggpixapi');

    expect(pagbank?.status).toBe('configured');
    expect(pagbank?.isActive).toBe(true);
    expect(ggpix?.status).toBe('configured');
    expect(ggpix?.isActive).toBe(false);
  });

  it('should report not_configured for unconfigured gateways', () => {
    vi.stubEnv('PAYMENT_MODE', 'sandbox');
    vi.stubEnv('PAYMENT_ACTIVE_GATEWAY', 'pagbank');

    const manager = new GatewayManager();
    manager.registerGateway(createMockAdapter('pagbank', false));
    manager.registerGateway(createMockAdapter('ggpixapi', true));

    const status = manager.getGatewayStatus();
    const pagbank = status.find(g => g.id === 'pagbank');
    const ggpix = status.find(g => g.id === 'ggpixapi');

    expect(pagbank?.status).toBe('not_configured');
    expect(pagbank?.notConfiguredReason).toContain('PAGBANK_TOKEN');
    expect(ggpix?.status).toBe('configured');
  });

  it('should report supportsCreditCard only for pagbank', () => {
    vi.stubEnv('PAYMENT_MODE', 'sandbox');
    vi.stubEnv('PAYMENT_ACTIVE_GATEWAY', 'pagbank');

    const manager = new GatewayManager();
    manager.registerGateway(createMockAdapter('pagbank'));
    manager.registerGateway(createMockAdapter('ggpixapi'));

    expect(manager.supportsCreditCard('pagbank')).toBe(true);
    expect(manager.supportsCreditCard('ggpixapi')).toBe(false);
  });
});

describe('GatewayManager — Runtime Switch (setActiveGateway)', () => {
  it('should persist override to ConfigService on switch', async () => {
    vi.stubEnv('PAYMENT_MODE', 'sandbox');
    vi.stubEnv('PAYMENT_ACTIVE_GATEWAY', 'pagbank');

    const manager = new GatewayManager();
    manager.registerGateway(createMockAdapter('pagbank'));
    manager.registerGateway(createMockAdapter('ggpixapi'));

    const result = await manager.setActiveGateway('ggpixapi', 'admin@test.com');

    expect(result.success).toBe(true);
    expect(configService.update).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'PAYMENT_ACTIVE_GATEWAY_OVERRIDE',
        value: 'ggpixapi',
        updatedBy: 'admin@test.com',
      })
    );
  });

  it('should reject switch to unconfigured gateway', async () => {
    vi.stubEnv('PAYMENT_MODE', 'sandbox');
    vi.stubEnv('PAYMENT_ACTIVE_GATEWAY', 'pagbank');

    const manager = new GatewayManager();
    manager.registerGateway(createMockAdapter('pagbank', true));
    manager.registerGateway(createMockAdapter('ggpixapi', false));

    const result = await manager.setActiveGateway('ggpixapi', 'admin@test.com');

    expect(result.success).toBe(false);
    expect(result.message).toContain('não está configurado');
    expect(configService.update).not.toHaveBeenCalled();
  });

  it('should reject switch to unknown gateway', async () => {
    vi.stubEnv('PAYMENT_MODE', 'sandbox');
    vi.stubEnv('PAYMENT_ACTIVE_GATEWAY', 'pagbank');

    const manager = new GatewayManager();
    manager.registerGateway(createMockAdapter('pagbank'));
    manager.registerGateway(createMockAdapter('ggpixapi'));

    const result = await manager.setActiveGateway('unknown' as GatewayId, 'admin@test.com');

    expect(result.success).toBe(false);
    expect(result.message).toContain('não encontrado');
  });
});

describe('GatewayManager — isProductionGateway', () => {
  it('should return true only for ggpixapi', () => {
    const manager = new GatewayManager();
    expect(manager.isProductionGateway('ggpixapi')).toBe(true);
    expect(manager.isProductionGateway('pagbank')).toBe(false);
  });
});

describe('GatewayManager — getActiveGateway throws when gateway not configured', () => {
  it('should throw when active gateway is not configured', () => {
    vi.stubEnv('PAYMENT_MODE', 'sandbox');
    vi.stubEnv('PAYMENT_ACTIVE_GATEWAY', 'ggpixapi');

    const manager = new GatewayManager();
    manager.registerGateway(createMockAdapter('pagbank', true));
    manager.registerGateway(createMockAdapter('ggpixapi', false));

    expect(() => manager.getActiveGateway()).toThrow('não está configurado');
  });
});