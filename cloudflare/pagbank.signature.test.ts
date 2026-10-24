import { describe, expect, it } from 'vitest';
import { verifyWebhookSignature } from './pagbank';

const payload = '{"id":"evt-1","status":"PAID"}';
const validSignature = 'd850804d3657236097affcce7e0b5ecaa388c6b44d0e76f5c673e61dfa22502c';

describe('PagBank webhook authenticity', () => {
  it('accepts the official SHA-256 token-payload signature', async () => {
    const valid = await verifyWebhookSignature(
      { PAGBANK_TOKEN: 'token', PAYMENT_MODE: 'production' },
      payload,
      validSignature,
    );
    expect(valid).toBe(true);
  });

  it('accepts the x-authenticity-token value without a sha256 prefix', async () => {
    const valid = await verifyWebhookSignature(
      { PAGBANK_TOKEN: 'token', PAYMENT_MODE: 'production' },
      payload,
      `sha256=${validSignature}`,
    );
    expect(valid).toBe(true);
  });

  it('rejects a forged signature in production', async () => {
    const valid = await verifyWebhookSignature(
      { PAGBANK_TOKEN: 'token', PAYMENT_MODE: 'production' },
      payload,
      '00'.repeat(32),
    );
    expect(valid).toBe(false);
  });

  it('does not silently accept a missing signature in production', async () => {
    const valid = await verifyWebhookSignature(
      { PAGBANK_TOKEN: 'token', PAYMENT_MODE: 'production' },
      payload,
      null,
    );
    expect(valid).toBe(false);
  });

  it('rejects any webhook when no token is configured (sandbox)', async () => {
    const valid = await verifyWebhookSignature(
      { PAGBANK_TOKEN: '', PAYMENT_MODE: 'sandbox' },
      payload,
      validSignature,
    );
    expect(valid).toBe(false);
  });

  it('rejects any webhook when no token is configured (production)', async () => {
    const valid = await verifyWebhookSignature(
      { PAGBANK_TOKEN: '', PAYMENT_MODE: 'production' },
      payload,
      validSignature,
    );
    expect(valid).toBe(false);
  });

  it('rejects any webhook when no signature header is sent and no token', async () => {
    const valid = await verifyWebhookSignature(
      { PAGBANK_TOKEN: '', PAYMENT_MODE: 'sandbox' },
      payload,
      null,
    );
    expect(valid).toBe(false);
  });
});
