/**
 * @file gateway/index.ts
 * Barrel export para o Payment Gateway Abstraction Layer.
 *
 * Uso:
 *   import { gatewayManager, GatewayId } from '../integrations/gateway';
 *   const gateway = gatewayManager.getActiveGateway();
 *   const result = await gateway.createPix(input);
 */

export { gatewayManager, GatewayManager } from './gateway-manager';
export type { GatewayInfo } from './gateway-manager';

export type {
  PaymentGateway,
  GatewayId,
  GatewayStatus,
  GatewayPaymentStatus,
  GatewayCreatePixInput,
  GatewayCreateCreditCardInput,
  GatewayPixResult,
  GatewayCreditCardResult,
  GatewayPaymentStatusResult,
  GatewayRefundResult,
  NormalizedWebhookEvent,
  GatewayPayerInput,
} from './types';

export { pagbankAdapter, PagBankAdapter } from './pagbank-adapter';
export { ggpixAdapter, GGPIXAdapter } from './ggpix-adapter';

export {
  processGatewayWebhook,
  detectGatewayFromPath,
  detectGatewayFromPayload,
  gatewaySupportsCreditCard,
} from './webhook-handler';
export type { WebhookProcessResult } from './webhook-handler';
