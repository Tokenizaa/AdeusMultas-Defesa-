import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GatewayManager } from '../../src/server/integrations/gateway/gateway-manager';
import { PaymentGateway, GatewayId } from '../../src/server/integrations/gateway/types';
import { configService } from '../../src/server/config/config-service';

const createMockAdapter = (id: GatewayId, configured = true): PaymentGateway => ({
  id,
  displayName: id,
  isConfigured: () => configured,
  createPix: vi.fn(),
  getPaymentStatus: vi.fn(),
  processWebhook: vi.fn(),
  ...(id === 'pagbank' ? { createCreditCard: vi.fn() } : {}),
});

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubEnv('VERCEL_ENV', '');
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('PAYMENT_MODE', 'sandbox');
  vi.stubEnv('PAYMENT_ACTIVE_GATEWAY', '');
  vi.spyOn(configService, 'get').mockImplementation((key: string) =>
    key === 'PAYMENT_ACTIVE_GATEWAY_OVERRIDE' ? '' : undefined,
  );
  vi.spyOn(configService, 'update').mockResolvedValue({ success: true, message: 'OK' });
});

describe('GatewayManager — deterministic selection', () => {
  it('defaults non-production to PagBank sandbox', () => {
    const manager = new GatewayManager();
    manager.registerGateway(createMockAdapter('pagbank'));
    manager.registerGateway(createMockAdapter('ggpixapi'));
    expect(manager.getActiveGatewayId()).toBe('pagbank');
  });

  it('uses an explicit PagBank selection outside production', () => {
    vi.stubEnv('PAYMENT_ACTIVE_GATEWAY', 'pagbank');
    const manager = new GatewayManager();
    manager.registerGateway(createMockAdapter('pagbank'));
    expect(manager.getActiveGatewayId()).toBe('pagbank');
  });

  it('rejects GGPIXAPI as a sandbox provider', () => {
    vi.stubEnv('PAYMENT_ACTIVE_GATEWAY', 'ggpixapi');
    const manager = new GatewayManager();
    manager.registerGateway(createMockAdapter('pagbank'));
    manager.registerGateway(createMockAdapter('ggpixapi'));
    expect(() => manager.getActiveGateway()).toThrow('PAYMENT_GATEWAY_SANDBOX_UNSUPPORTED');
  });

  it('rejects test adapter in production', () => {
    vi.stubEnv('PAYMENT_MODE', 'production');
    vi.stubEnv('PAYMENT_ACTIVE_GATEWAY', 'test');
    const manager = new GatewayManager();
    manager.registerGateway(createMockAdapter('pagbank'));
    manager.registerGateway(createMockAdapter('ggpixapi'));
    manager.registerGateway(createMockAdapter('test'));
    expect(() => manager.getActiveGatewayId()).toThrow('PAYMENT_INVARIANT:test_gateway_forbidden_in_production');
  });

  it('allows PagBank in production when explicitly selected', () => {
    vi.stubEnv('PAYMENT_MODE', 'production');
    vi.stubEnv('PAYMENT_ACTIVE_GATEWAY', 'pagbank');
    const manager = new GatewayManager();
    manager.registerGateway(createMockAdapter('pagbank'));
    expect(manager.getActiveGatewayId()).toBe('pagbank');
  });

  it('allows GGPIXAPI in production when explicitly selected', () => {
    vi.stubEnv('PAYMENT_MODE', 'production');
    vi.stubEnv('PAYMENT_ACTIVE_GATEWAY', 'ggpixapi');
    const manager = new GatewayManager();
    manager.registerGateway(createMockAdapter('ggpixapi'));
    expect(manager.getActiveGatewayId()).toBe('ggpixapi');
  });

  it('fails closed in production when no gateway is explicitly selected', () => {
    vi.stubEnv('PAYMENT_MODE', 'production');
    const manager = new GatewayManager();
    manager.registerGateway(createMockAdapter('pagbank'));
    manager.registerGateway(createMockAdapter('ggpixapi'));
    expect(() => manager.getActiveGatewayId()).toThrow('PAYMENT_GATEWAY_NOT_SELECTED');
  });

  it('gives persisted ConfigService selection precedence over env', () => {
    vi.stubEnv('PAYMENT_MODE', 'production');
    vi.stubEnv('PAYMENT_ACTIVE_GATEWAY', 'ggpixapi');
    vi.mocked(configService.get).mockReturnValue('pagbank');
    const manager = new GatewayManager();
    manager.registerGateway(createMockAdapter('pagbank'));
    manager.registerGateway(createMockAdapter('ggpixapi'));
    expect(manager.getActiveGatewayId()).toBe('pagbank');
  });

  it('persists an allowed administrative switch', async () => {
    vi.stubEnv('PAYMENT_MODE', 'production');
    vi.stubEnv('PAYMENT_ACTIVE_GATEWAY', 'pagbank');
    const manager = new GatewayManager();
    manager.registerGateway(createMockAdapter('pagbank'));
    manager.registerGateway(createMockAdapter('ggpixapi'));

    const result = await manager.setActiveGateway('ggpixapi', 'admin@test');
    expect(result.success).toBe(true);
    expect(configService.update).toHaveBeenCalledWith(expect.objectContaining({
      key: 'PAYMENT_ACTIVE_GATEWAY_OVERRIDE',
      value: 'ggpixapi',
      updatedBy: 'admin@test',
    }));
  });

  it('refuses test adapter switch in production without persisting it', async () => {
    vi.stubEnv('PAYMENT_MODE', 'production');
    vi.stubEnv('PAYMENT_ACTIVE_GATEWAY', 'pagbank');
    const manager = new GatewayManager();
    manager.registerGateway(createMockAdapter('pagbank'));
    manager.registerGateway(createMockAdapter('test'));

    const result = await manager.setActiveGateway('test', 'admin@test');
    expect(result.success).toBe(false);
    expect(result.message).toContain('PAYMENT_INVARIANT:test_gateway_forbidden_in_production');
    expect(configService.update).not.toHaveBeenCalled();
  });

  it('does not consider PagBank unavailable merely because GGPIX is configured', () => {
    vi.stubEnv('PAYMENT_MODE', 'production');
    vi.stubEnv('PAYMENT_ACTIVE_GATEWAY', 'pagbank');
    const manager = new GatewayManager();
    manager.registerGateway(createMockAdapter('pagbank', true));
    manager.registerGateway(createMockAdapter('ggpixapi', false));
    expect(manager.getActiveGatewayId()).toBe('pagbank');
  });
});
