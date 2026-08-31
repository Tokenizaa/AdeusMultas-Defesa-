/**
 * @file gateway/test-adapter.ts
 * Test/Development Payment Gateway Adapter
 *
 * This adapter is ONLY for development and testing environments.
 * It simulates successful PIX payments without requiring external credentials.
 * 
 * NEVER enable this in production!
 */

import {
  PaymentGateway,
  GatewayId,
  GatewayCreatePixInput,
  GatewayPixResult,
  GatewayPaymentStatusResult,
  GatewayPaymentStatus,
  NormalizedWebhookEvent,
} from './types';
import { logger } from '../../observability/logger';

// Only allow in development/test mode
const IS_DEV = process.env.NODE_ENV !== 'production' || process.env.PAYMENT_MODE === 'sandbox';

export class TestGatewayAdapter implements PaymentGateway {
  readonly id: GatewayId = 'test';
  readonly displayName = 'Test Gateway (Dev Only)';

  isConfigured(): boolean {
    if (!IS_DEV) {
      logger.warn('payments', 'test_gateway', 'isConfigured', 'Test gateway disabled in production');
      return false;
    }
    return true;
  }

  async createPix(input: GatewayCreatePixInput): Promise<GatewayPixResult> {
    if (!IS_DEV) {
      throw new Error('Test gateway only available in development/sandbox mode');
    }

    const gatewayTransactionId = `test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const referenceId = input.referenceId || input.caseId;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes

    // Generate a fake PIX copy-paste string (EMV format)
    const pixCopyPaste = this.generateFakePixCopyPaste(input.amountInCents, referenceId);

    logger.info('payments', 'test_gateway', 'createPix', 'Test PIX created', {
      gatewayTransactionId,
      amountInCents: input.amountInCents,
      referenceId,
    });

    return {
      gatewayTransactionId,
      referenceId,
      gateway: this.id,
      status: 'PENDING',
      amountInCents: input.amountInCents,
      pixCopyPaste,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCopyPaste)}`,
      qrCodeDataUrl: await this.generateQrCodeDataUrl(pixCopyPaste),
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
      feeInCents: 0,
      netAmountInCents: input.amountInCents,
    };
  }

  async getPaymentStatus(gatewayTransactionId: string): Promise<GatewayPaymentStatusResult> {
    if (!IS_DEV) {
      throw new Error('Test gateway only available in development/sandbox mode');
    }

    // Simulate payment confirmation after 1 second
    // In tests, the frontend polls this endpoint
    return {
      gatewayTransactionId,
      gateway: this.id,
      status: 'PAID',
      paidAt: new Date().toISOString(),
    };
  }

  processWebhook(rawBody: string, headers: Record<string, string | undefined>, body: unknown): NormalizedWebhookEvent {
    const parsed = typeof body === 'object' && body !== null ? body : {};
    const gatewayTransactionId = (parsed as any).gatewayTransactionId || `test_${Date.now()}`;

    return {
      gatewayEventId: `test_evt_${Date.now()}`,
      gateway: this.id,
      gatewayTransactionId,
      referenceId: (parsed as any).referenceId,
      status: 'PAID',
      transactionType: 'PIX_IN',
      amountInCents: (parsed as any).amountInCents || 0,
      netAmountInCents: (parsed as any).amountInCents || 0,
      gatewayFeeInCents: 0,
      paidAt: new Date().toISOString(),
      rawPayload: body,
      isDuplicate: false,
    };
  }

  private generateFakePixCopyPaste(amountInCents: number, referenceId: string): string {
    // EMV PIX format (simplified for testing)
    const amount = (amountInCents / 100).toFixed(2);
    return `00020126580014br.gov.bcb.pix0136test@defesai0204MULT520400005303986540${amount.padStart(10, '0')}5802BR5916DEFESAI TECNOLOG6009SAO PAULO62070503***6304`;
  }

  private async generateQrCodeDataUrl(text: string): Promise<string> {
    // Return a simple base64 encoded SVG QR code placeholder
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="white"/><text x="100" y="100" font-family="monospace" font-size="10" text-anchor="middle" dominant-baseline="middle" fill="black">${text.substring(0, 50)}</text></svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }
}

// Export singleton only if in dev mode
export const testAdapter = IS_DEV ? new TestGatewayAdapter() : null;