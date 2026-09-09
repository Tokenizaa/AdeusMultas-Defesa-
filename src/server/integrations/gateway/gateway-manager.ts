/**
 * @file gateway/gateway-manager.ts
 * GatewayManager — autoridade única para seleção do gateway ativo.
 *
 * Produção: somente PagBank ou GGPIXAPI.
 * Sandbox/testes: PagBank sandbox ou test adapter.
 * A seleção administrativa é persistida no ConfigService e não altera
 * pagamentos já criados.
 */
import { randomUUID } from 'node:crypto';
import { PaymentGateway, GatewayId, GatewayStatus, GatewayCreatePixInput, GatewayPixResult, GatewayPaymentStatusResult } from './types';
import { pagbankAdapter } from './pagbank-adapter';
import { ggpixAdapter } from './ggpix-adapter';
import { testAdapter } from './test-adapter';
import { logger } from '../../observability/logger';
import { configService } from '../../config/config-service';
import { assertProductionGateway } from '../../domain/payment/payment-invariants';
import {
  paymentOrderAttemptRepository,
  PaymentAttemptStatus,
  PaymentGatewayEnvironment,
} from '../../db/payment-order-attempt-repository';

function isProductionEnvironment(): boolean {
  return (
    (process.env.VERCEL_ENV || '').toLowerCase().trim() === 'production' ||
    (process.env.NODE_ENV || '').toLowerCase().trim() === 'production' ||
    (process.env.PAYMENT_MODE || '').toLowerCase().trim() === 'production'
  );
}

function currentPaymentEnvironment(): PaymentGatewayEnvironment {
  return isProductionEnvironment() ? 'production' : 'sandbox';
}

function normalizeGatewayId(value: unknown): GatewayId | undefined {
  const normalized = String(value || '').toLowerCase().trim();
  if (normalized === 'ggpix' || normalized === 'ggpixapi') return 'ggpixapi';
  if (normalized === 'pagbank') return 'pagbank';
  if (normalized === 'test') return 'test';
  return undefined;
}

function resolveActiveGatewayIdFromEnv(): GatewayId {
  const production = isProductionEnvironment();
  const configOverride = normalizeGatewayId(configService.get('PAYMENT_ACTIVE_GATEWAY_OVERRIDE'));
  const envValue = normalizeGatewayId(process.env.PAYMENT_ACTIVE_GATEWAY);
  const configured = configOverride ?? envValue;

  if (configured) {
    if (production) assertProductionGateway(configured);
    return configured;
  }

  if (production) {
    throw new Error('PAYMENT_GATEWAY_NOT_SELECTED: configure PAYMENT_ACTIVE_GATEWAY_OVERRIDE to pagbank or ggpixapi');
  }

  return 'pagbank';
}

function normalizeAttemptStatus(status: string): PaymentAttemptStatus {
  const normalized = status.toLowerCase();
  if (normalized === 'paid') return 'paid';
  if (normalized === 'authorized') return 'authorized';
  if (normalized === 'declined') return 'declined';
  if (normalized === 'canceled' || normalized === 'cancelled') return 'canceled';
  if (normalized === 'refunded') return 'refunded';
  if (normalized === 'waiting') return 'waiting';
  return 'pending';
}

export interface GatewayInfo {
  id: GatewayId;
  displayName: string;
  status: GatewayStatus;
  isActive: boolean;
  supportsCreditCard: boolean;
  notConfiguredReason?: string;
}

export class GatewayManager {
  private gateways: Map<GatewayId, PaymentGateway> = new Map();

  constructor() {
    this.gateways.set('pagbank', pagbankAdapter);
    this.gateways.set('ggpixapi', ggpixAdapter);
    if (testAdapter) this.gateways.set('test', testAdapter);
    logger.info('payments', 'gateway_manager', 'init', 'Gateway manager initialized', {
      availableGateways: Array.from(this.gateways.keys()),
    });
  }

  private resolveActiveGatewayId(): GatewayId {
    return resolveActiveGatewayIdFromEnv();
  }

  private assertGatewayAllowedForEnvironment(id: GatewayId): void {
    if (isProductionEnvironment()) {
      assertProductionGateway(id);
      return;
    }

    if (id !== 'pagbank' && id !== 'test') {
      throw new Error('PAYMENT_GATEWAY_SANDBOX_UNSUPPORTED: only pagbank sandbox or test adapter is allowed');
    }
  }

  private decorateGateway(active: PaymentGateway): PaymentGateway {
    const manager = this;

    const decorated: PaymentGateway = {
      id: active.id,
      displayName: active.displayName,
      isConfigured: () => active.isConfigured(),

      createPix: async (input: GatewayCreatePixInput): Promise<GatewayPixResult> => {
        // Persist the financial identity BEFORE contacting the provider. If the
        // provider fails after this point, the pending attempt remains auditable
        // and can be reconciled later instead of becoming an invisible charge.
        const persistence = await paymentOrderAttemptRepository.createOrderAndAttempt(
          {
            caseId: input.caseId,
            gateway: active.id,
            amountInCents: input.amountInCents,
            currency: 'BRL',
            paymentMethod: 'pix',
          },
          {
            gateway: active.id,
            gatewayEnvironment: currentPaymentEnvironment(),
            idempotencyKey: `pix:${active.id}:${randomUUID()}`,
            referenceId: input.referenceId,
            status: 'pending',
          },
        );

        try {
          const result = await active.createPix(input);
          await paymentOrderAttemptRepository.updatePaymentOrder(persistence.paymentOrderId, {
            providerOrderId: result.gatewayTransactionId,
            referenceId: result.referenceId || input.referenceId,
            status: result.status,
            paidAt: result.status === 'PAID' ? new Date().toISOString() : undefined,
          });
          await paymentOrderAttemptRepository.updateAttemptProviderData(persistence.attemptId, {
            providerTransactionId: result.gatewayTransactionId,
            referenceId: result.referenceId || input.referenceId,
            status: normalizeAttemptStatus(result.status),
          });

          logger.info('payments', 'gateway_manager', 'payment_attempt_provider_bound', 'Provider identity bound to PaymentAttempt', {
            paymentOrderId: persistence.paymentOrderId,
            attemptId: persistence.attemptId,
            gateway: active.id,
            gatewayTransactionId: result.gatewayTransactionId,
            caseId: input.caseId,
          });
          return result;
        } catch (error) {
          logger.error('payments', 'gateway_manager', 'payment_provider_error', 'Provider call failed after durable payment identity creation', {
            paymentOrderId: persistence.paymentOrderId,
            attemptId: persistence.attemptId,
            gateway: active.id,
            caseId: input.caseId,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },

      createCreditCard: active.createCreditCard
        ? (input) => active.createCreditCard!(input)
        : undefined,

      getPaymentStatus: async (gatewayTransactionId: string): Promise<GatewayPaymentStatusResult> => {
        const persisted = await paymentOrderAttemptRepository.findAttemptByProviderTransactionId(gatewayTransactionId);

        // New transactions are always resolved through the gateway captured on
        // their PaymentAttempt. Changing the active gateway cannot redirect
        // polling for an existing payment.
        const provider = persisted ? manager.gateways.get(persisted.gateway) : active;
        if (!provider) throw new Error(`Gateway '${persisted?.gateway}' não está registrado.`);

        const result = await provider.getPaymentStatus(gatewayTransactionId);

        if (persisted) {
          await paymentOrderAttemptRepository.updateAttemptProviderData(persisted.id, {
            providerTransactionId: result.gatewayTransactionId,
            status: normalizeAttemptStatus(result.status),
          });
          await paymentOrderAttemptRepository.updatePaymentOrder(persisted.paymentOrderId, {
            status: result.status,
            paidAt: result.paidAt,
          });
        } else {
          logger.warn('payments', 'gateway_manager', 'legacy_payment_status', 'PaymentAttempt not found; using active gateway for legacy transaction', {
            gatewayTransactionId,
            activeGateway: active.id,
          });
        }

        return result;
      },

      processWebhook: (rawBody, headers, body) => active.processWebhook(rawBody, headers, body),
    };

    return decorated;
  }

  getActiveGateway(): PaymentGateway {
    const currentId = this.resolveActiveGatewayId();
    this.assertGatewayAllowedForEnvironment(currentId);
    const active = this.gateways.get(currentId);
    if (!active) throw new Error(`Gateway '${currentId}' not found.`);
    if (!active.isConfigured()) {
      throw new Error(`Gateway '${active.displayName}' não está configurado. Configure as credenciais.`);
    }
    return this.decorateGateway(active);
  }

  getGateway(id: GatewayId): PaymentGateway | undefined {
    return this.gateways.get(id);
  }

  registerGateway(gateway: PaymentGateway): void {
    this.gateways.set(gateway.id, gateway);
    logger.info('payments', 'gateway_manager', 'register', `Gateway registered: ${gateway.id}`);
  }

  getGatewayStatus(): GatewayInfo[] {
    let activeId: GatewayId | undefined;
    try {
      activeId = this.resolveActiveGatewayId();
    } catch {
      activeId = undefined;
    }

    return Array.from(this.gateways.values()).map(gw => {
      const isConfigured = gw.isConfigured();
      let notConfiguredReason: string | undefined;
      if (!isConfigured) {
        if (gw.id === 'pagbank') notConfiguredReason = 'PAGBANK_TOKEN não configurado';
        else if (gw.id === 'ggpixapi') notConfiguredReason = 'GGPIX_API_KEY ou GGPIX_ENABLED não configurado';
        else if (gw.id === 'test') notConfiguredReason = 'Apenas para desenvolvimento/teste';
      }
      return {
        id: gw.id,
        displayName: gw.displayName,
        status: isConfigured ? 'configured' : 'not_configured',
        isActive: gw.id === activeId,
        supportsCreditCard: gw.id === 'pagbank',
        notConfiguredReason,
      };
    });
  }

  getActiveGatewayId(): GatewayId {
    return this.resolveActiveGatewayId();
  }

  isProductionGateway(id: GatewayId): boolean {
    return id === 'ggpixapi' || id === 'pagbank';
  }

  async setActiveGateway(id: GatewayId, updatedBy: string = 'admin'): Promise<{ success: boolean; message: string }> {
    const gateway = this.gateways.get(id);
    if (!gateway) return { success: false, message: `Gateway '${id}' não encontrado.` };

    try {
      this.assertGatewayAllowedForEnvironment(id);
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : String(error) };
    }

    if (!gateway.isConfigured()) {
      return {
        success: false,
        message: `Gateway '${gateway.displayName}' não está configurado. Configure as credenciais antes de ativá-lo.`,
      };
    }

    const previousId = this.resolveActiveGatewayId();
    const updateResult = await configService.update({
      key: 'PAYMENT_ACTIVE_GATEWAY_OVERRIDE',
      value: id,
      updatedBy,
    });

    if (!updateResult.success) {
      return { success: false, message: `Falha ao persistir override: ${updateResult.message}` };
    }

    logger.info('payments', 'gateway_manager', 'set_active', `Gateway changed: ${previousId} → ${id} (persisted to ConfigService)`, {
      previousGateway: previousId,
      newGateway: id,
      updatedBy,
    });

    return {
      success: true,
      message: `Gateway alterado para '${gateway.displayName}'. Novos pagamentos usarão este gateway.`,
    };
  }

  supportsCreditCard(gatewayId?: GatewayId): boolean {
    const id = gatewayId || this.resolveActiveGatewayId();
    const gateway = this.gateways.get(id);
    return gateway?.createCreditCard !== undefined;
  }
}

export const gatewayManager = new GatewayManager();
