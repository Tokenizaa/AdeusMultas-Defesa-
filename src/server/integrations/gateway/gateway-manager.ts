/**
 * @file gateway/gateway-manager.ts
 * GatewayManager — Resolvedor central do gateway de pagamento ativo.
 *
 * Responsabilidades:
 * 1. Manter registro de todos os gateways disponíveis (PagBank, GGPIXAPI, etc.)
 * 2. Resolver qual gateway está ativo com base na configuração (env / runtime)
 * 3. Fornecer acesso ao gateway ativo via getActiveGateway()
 * 4. Fornecer acesso a qualquer adapter por ID via getGateway(id)
 * 5. Prover informação para o Admin UI (status de cada gateway)
 *
 * REGRA FUNDAMENTAL:
 * - Trocar o gateway NÃO modifica pagamentos existentes
 * - Cada pagamento registra qual gateway o criou
 * - O GatewayManager NÃO persiste estado — a configuração vive em env/ConfigService
 *
 * FLUXO:
 *   Checkout → GatewayManager.getActiveGateway() → adapter.createPix(...)
 *   Admin UI → GatewayManager.getGatewayStatus() → exibe status dos gateways
 *   Webhook → GatewayManager.resolveByGatewayId(id) → adapter.processWebhook(...)
 */

import { PaymentGateway, GatewayId, GatewayStatus } from './types';
import { pagbankAdapter } from './pagbank-adapter';
import { ggpixAdapter } from './ggpix-adapter';
import { logger } from '../../observability/logger';

// ============================================================================
// Configuração do gateway ativo
// ============================================================================

/**
 * Determina o gateway ativo a partir de variáveis de ambiente.
 *
 * Prioridade:
 * 1. PAYMENT_ACTIVE_GATEWAY (env explicitamente definido)
 * 2. Fallback para 'pagbank' (comportamento atual preservado)
 *
 * O Admin UI pode alterar este valor via /gateway/switch (override em runtime),
 * mas a configuração padrão vive no environment.
 */
function resolveActiveGatewayIdFromEnv(): GatewayId {
  const envValue = (process.env.PAYMENT_ACTIVE_GATEWAY || '').toLowerCase().trim();
  if (envValue === 'ggpixapi' || envValue === 'ggpix') return 'ggpixapi';
  if (envValue === 'pagbank') {
    if (process.env.NODE_ENV === 'production') {
      // Em produção, NUNCA permitir PagBank como gateway ativo
      return 'ggpixapi';
    }
    return 'pagbank';
  }
  // Em dev/teste, manter fallback PagBank para compatibilidade
  if (process.env.NODE_ENV === 'production') {
    // Em produção, fallback é GGPIXAPI
    return 'ggpixapi';
  }
  return 'pagbank';
}

// ============================================================================
// Manager
// ============================================================================

export interface GatewayInfo {
  id: GatewayId;
  displayName: string;
  status: GatewayStatus;
  isActive: boolean;
  /** Se o gateway suporta cartão de crédito. */
  supportsCreditCard: boolean;
  /** Razão pela qual não está configurado (se aplicável). */
  notConfiguredReason?: string;
}

export class GatewayManager {
  private gateways: Map<GatewayId, PaymentGateway> = new Map();
  /**
   * Override explícito feito em runtime (Admin UI). Quando null, o gateway
   * ativo é resolvido do ambiente a cada leitura.
   *
   * IMPORTANTE: a resolução é LAZY de propósito. O singleton é construído na
   * avaliação do módulo, que ocorre ANTES de dotenv.config() rodar no
   * server.ts (ordem de imports ES). Resolver eager no construtor lia envs
   * vazias e caía silenciosamente no fallback PagBank, desativando o GGPix.
   */
  private activeOverride: GatewayId | null = null;

  constructor() {
    // Registrar todos os gateways conhecidos
    this.gateways.set('pagbank', pagbankAdapter);
    this.gateways.set('ggpixapi', ggpixAdapter);

    logger.info('payments', 'gateway_manager', 'init', `Gateway manager initialized`, {
      availableGateways: Array.from(this.gateways.keys()),
    });
  }

  /** Gateway ativo efetivo: override runtime > variável de ambiente. */
  private resolveActiveGatewayId(): GatewayId {
    if (this.activeOverride) return this.activeOverride;
    return resolveActiveGatewayIdFromEnv();
  }

  /**
   * Retorna o adapter do gateway ativo.
   * Lança erro se o gateway configurado não estiver configurado.
   */
  getActiveGateway(): PaymentGateway {
    const currentId = this.resolveActiveGatewayId();
    const active = this.gateways.get(currentId);
    if (!active) {
      throw new Error(`Gateway '${currentId}' not found.`);
    }
    if (!active.isConfigured()) {
      throw new Error(`Gateway '${active.displayName}' não está configurado. Configure as credenciais.`);
    }
    return active;
  }

  /**
   * Retorna um adapter específico por ID.
   * Usado pelo webhook handler quando o payload indica o gateway.
   */
  getGateway(id: GatewayId): PaymentGateway | undefined {
    return this.gateways.get(id);
  }

  /**
   * Registra um novo gateway (extensível para futuros gateways).
   */
  registerGateway(gateway: PaymentGateway): void {
    this.gateways.set(gateway.id, gateway);
    logger.info('payments', 'gateway_manager', 'register', `Gateway registered: ${gateway.id}`);
  }

  /**
   * Retorna informações sobre todos os gateways registrados.
   * Usado pelo Admin UI para exibir status e permitir alternância.
   */
  getGatewayStatus(): GatewayInfo[] {
    return Array.from(this.gateways.values()).map(gw => {
      const isConfigured = gw.isConfigured();
      let notConfiguredReason: string | undefined;
      if (!isConfigured) {
        if (gw.id === 'pagbank') {
          notConfiguredReason = 'PAGBANK_TOKEN não configurado';
        } else if (gw.id === 'ggpixapi') {
          notConfiguredReason = 'GGPIX_API_KEY ou GGPIX_ENABLED não configurado';
        }
      }

      return {
        id: gw.id,
        displayName: gw.displayName,
        status: isConfigured ? 'configured' : 'not_configured',
        isActive: gw.id === this.resolveActiveGatewayId(),
        supportsCreditCard: gw.id === 'pagbank', // Apenas PagBank suporta cartão
        notConfiguredReason,
      };
    });
  }

  /**
   * Retorna o ID do gateway ativo (override runtime tem prioridade sobre env).
   */
  getActiveGatewayId(): GatewayId {
    return this.resolveActiveGatewayId();
  }

  /**
   * Verifica se o gateway é de produção.
   * Apenas GGPIXAPI é considerado gateway de produção (PagBank é sandbox/teste).
   */
  isProductionGateway(id: GatewayId): boolean {
    return id === 'ggpixapi';
  }

  /**
   * Altera o gateway ativo (usado pelo Admin UI).
   * NÃO migra pagamentos existentes — apenas afeta novos pagamentos.
   *
   * IMPORTANTE: Em produção, esta alteração deve ser persistida em env
   * ou no ConfigService e refletir em todos os workers/instâncias.
   * Em memória, a alteração é imediata mas não persiste entre reinícios.
   */
  setActiveGateway(id: GatewayId): { success: boolean; message: string } {
    const gateway = this.gateways.get(id);
    if (!gateway) {
      return { success: false, message: `Gateway '${id}' não encontrado.` };
    }

    if (!gateway.isConfigured()) {
      return {
        success: false,
        message: `Gateway '${gateway.displayName}' não está configurado. Configure as credenciais antes de ativá-lo.`,
      };
    }

    const previousId = this.resolveActiveGatewayId();
    this.activeOverride = id;

    logger.info('payments', 'gateway_manager', 'set_active',
      `Gateway changed: ${previousId} → ${id}`,
      { previousGateway: previousId, newGateway: id }
    );

    return {
      success: true,
      message: `Gateway alterado para '${gateway.displayName}'. Novos pagamentos usarão este gateway.`,
    };
  }

  /**
   * Verifica se um gateway suporta cartão de crédito.
   * Usado pelo Checkout para decidir se exibe a aba Cartão.
   */
  supportsCreditCard(gatewayId?: GatewayId): boolean {
    const id = gatewayId || this.resolveActiveGatewayId();
    const gateway = this.gateways.get(id);
    return gateway?.createCreditCard !== undefined;
  }
}

// Singleton — uma única instância por processo
export const gatewayManager = new GatewayManager();