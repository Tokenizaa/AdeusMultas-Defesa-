/**
 * @file gateway/gateway-manager.ts
 * GatewayManager — Resolvedor central do gateway de pagamento ativo.
 *
 * Trocar o gateway NÃO modifica pagamentos existentes. Cada pagamento registra
 * qual gateway o criou. A configuração vive em env/ConfigService.
 */
import { PaymentGateway, GatewayId, GatewayStatus } from './types';
import { pagbankAdapter } from './pagbank-adapter';
import { ggpixAdapter } from './ggpix-adapter';
import { testAdapter } from './test-adapter';
import { logger } from '../../observability/logger';
import { configService } from '../../config/config-service';

function isProductionEnvironment(): boolean {
  return (
    (process.env.VERCEL_ENV || '').toLowerCase().trim() === 'production' ||
    (process.env.NODE_ENV || '').toLowerCase().trim() === 'production' ||
    (process.env.PAYMENT_MODE || '').toLowerCase().trim() === 'production'
  );
}

function resolveActiveGatewayIdFromEnv(): GatewayId {
  const configOverride = configService.get('PAYMENT_ACTIVE_GATEWAY_OVERRIDE');
  if (configOverride && (configOverride === 'ggpixapi' || configOverride === 'pagbank' || configOverride === 'test')) return configOverride;
  const envValue = (process.env.PAYMENT_ACTIVE_GATEWAY || '').toLowerCase().trim();
  if (envValue === 'ggpixapi' || envValue === 'ggpix') return 'ggpixapi';
  if (envValue === 'pagbank') return 'pagbank';
  if (envValue === 'test') return 'test';
  if (isProductionEnvironment()) return pagbankAdapter.isConfigured() ? 'pagbank' : 'ggpixapi';
  return 'pagbank';
}

export interface GatewayInfo { id: GatewayId; displayName: string; status: GatewayStatus; isActive: boolean; supportsCreditCard: boolean; notConfiguredReason?: string; }

export class GatewayManager {
  private gateways: Map<GatewayId, PaymentGateway> = new Map();
  constructor() {
    this.gateways.set('pagbank', pagbankAdapter);
    this.gateways.set('ggpixapi', ggpixAdapter);
    if (testAdapter) this.gateways.set('test', testAdapter);
    logger.info('payments', 'gateway_manager', 'init', 'Gateway manager initialized', { availableGateways: Array.from(this.gateways.keys()) });
  }
  private resolveActiveGatewayId(): GatewayId { return resolveActiveGatewayIdFromEnv(); }
  getActiveGateway(): PaymentGateway {
    const currentId = this.resolveActiveGatewayId(); const active = this.gateways.get(currentId);
    if (!active) throw new Error(`Gateway '${currentId}' not found.`);
    if (!active.isConfigured()) throw new Error(`Gateway '${active.displayName}' não está configurado. Configure as credenciais.`);
    return active;
  }
  getGateway(id: GatewayId): PaymentGateway | undefined { return this.gateways.get(id); }
  registerGateway(gateway: PaymentGateway): void { this.gateways.set(gateway.id, gateway); logger.info('payments', 'gateway_manager', 'register', `Gateway registered: ${gateway.id}`); }
  getGatewayStatus(): GatewayInfo[] {
    return Array.from(this.gateways.values()).map(gw => {
      const isConfigured = gw.isConfigured(); let notConfiguredReason: string | undefined;
      if (!isConfigured) {
        if (gw.id === 'pagbank') notConfiguredReason = 'PAGBANK_TOKEN não configurado';
        else if (gw.id === 'ggpixapi') notConfiguredReason = 'GGPIX_API_KEY ou GGPIX_ENABLED não configurado';
        else if (gw.id === 'test') notConfiguredReason = 'Apenas para desenvolvimento/teste (NODE_ENV !== production)';
      }
      return { id: gw.id, displayName: gw.displayName, status: isConfigured ? 'configured' : 'not_configured', isActive: gw.id === this.resolveActiveGatewayId(), supportsCreditCard: gw.id === 'pagbank', notConfiguredReason };
    });
  }
  getActiveGatewayId(): GatewayId { return this.resolveActiveGatewayId(); }
  isProductionGateway(id: GatewayId): boolean { return id === 'ggpixapi' || id === 'pagbank'; }
  async setActiveGateway(id: GatewayId, updatedBy: string = 'admin'): Promise<{ success: boolean; message: string }> {
    const gateway = this.gateways.get(id);
    if (!gateway) return { success: false, message: `Gateway '${id}' não encontrado.` };
    if (!gateway.isConfigured()) return { success: false, message: `Gateway '${gateway.displayName}' não está configurado. Configure as credenciais antes de ativá-lo.` };
    const previousId = this.resolveActiveGatewayId();
    const updateResult = await configService.update({ key: 'PAYMENT_ACTIVE_GATEWAY_OVERRIDE', value: id, updatedBy });
    if (!updateResult.success) return { success: false, message: `Falha ao persistir override: ${updateResult.message}` };
    logger.info('payments', 'gateway_manager', 'set_active', `Gateway changed: ${previousId} → ${id} (persisted to ConfigService)`, { previousGateway: previousId, newGateway: id, updatedBy });
    return { success: true, message: `Gateway alterado para '${gateway.displayName}'. Novos pagamentos usarão este gateway.` };
  }
  supportsCreditCard(gatewayId?: GatewayId): boolean { const id = gatewayId || this.resolveActiveGatewayId(); const gateway = this.gateways.get(id); return gateway?.createCreditCard !== undefined; }
}
export const gatewayManager = new GatewayManager();
