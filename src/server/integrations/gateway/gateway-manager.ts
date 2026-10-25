/**
 * @file gateway/gateway-manager.ts
 * GatewayManager — Resolvedor central do gateway de pagamento ativo.
 *
 * O VenoPag é o ÚNICO gateway suportado (PIX only).
 * Trocar o gateway NÃO modifica pagamentos existentes. Cada pagamento registra
 * qual gateway o criou. A configuração vive em env/ConfigService.
 */
import { PaymentGateway, GatewayId, GatewayStatus } from './types';
import { venopagAdapter } from './venopag-adapter';
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
  const envGateway = process.env.PAYMENT_ACTIVE_GATEWAY;
  const validGateways = ['venopag'];
  if (envGateway && validGateways.includes(envGateway)) {
    return envGateway;
  }
  // Fallback para VenoPag quando não configurado ou inválido
  return 'venopag';
}

export interface GatewayInfo { id: GatewayId; displayName: string; status: GatewayStatus; isActive: boolean; supportsCreditCard: boolean; notConfiguredReason?: string; }

export class GatewayManager {
  private gateways: Map<GatewayId, PaymentGateway> = new Map();
  constructor() {
    this.gateways.set('venopag', venopagAdapter);
    logger.info('payments', 'gateway_manager', 'init', 'Gateway manager initialized', { availableGateways: Array.from(this.gateways.keys()) });
  }
  private resolveActiveGatewayId(): GatewayId { return resolveActiveGatewayIdFromEnv(); }
  getActiveGateway(): PaymentGateway {
    const currentId = this.resolveActiveGatewayId(); const active = this.gateways.get(currentId);
    if (!active) throw new Error(`Gateway '${currentId}' not found.`);
    if (!active.isConfigured()) throw new Error(`Gateway '${active.displayName}' não está configurado. Configure as credenciais (VENO_CLIENT_ID, VENO_CLIENT_SECRET).`);
    return active;
  }
  getGateway(id: GatewayId): PaymentGateway | undefined { return this.gateways.get(id); }
  registerGateway(gateway: PaymentGateway): void { this.gateways.set(gateway.id, gateway); logger.info('payments', 'gateway_manager', 'register', `Gateway registered: ${gateway.id}`); }
  getGatewayStatus(): GatewayInfo[] {
    return Array.from(this.gateways.values()).map(gw => {
      const isConfigured = gw.isConfigured(); let notConfiguredReason: string | undefined;
      if (!isConfigured) {
        notConfiguredReason = 'VENO_CLIENT_ID / VENO_CLIENT_SECRET / VENO_ENABLED não configurados';
      }
      return { id: gw.id, displayName: gw.displayName, status: isConfigured ? 'configured' : 'not_configured', isActive: true, supportsCreditCard: false, notConfiguredReason };
    });
  }
  getActiveGatewayId(): GatewayId { return this.resolveActiveGatewayId(); }
  isProductionGateway(_id: GatewayId): boolean { return true; }
  async setActiveGateway(id: GatewayId, updatedBy: string = 'admin'): Promise<{ success: boolean; message: string }> {
    // VenoPag é o único gateway — não permite troca
    if (id !== 'venopag') return { success: false, message: `Gateway '${id}' não suportado. Apenas VenoPag está disponível.` };
    const gateway = this.gateways.get(id);
    if (!gateway || !gateway.isConfigured()) return { success: false, message: `Gateway VenoPag não está configurado. Configure as credenciais.` };
    logger.info('payments', 'gateway_manager', 'set_active', `Gateway VenoPag confirmado como ativo`, { gateway: id, updatedBy });
    return { success: true, message: `Gateway VenoPag ativo.` };
  }
  supportsCreditCard(_gatewayId?: GatewayId): boolean { return false; }
}
export const gatewayManager = new GatewayManager();