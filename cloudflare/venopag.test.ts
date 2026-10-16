import { afterEach, describe, expect, it, vi } from 'vitest';
import { createVenoCashIn, getVenoCashInStatus, verifyVenoWebhook } from './venopag';

const env = { VENO_CLIENT_ID: 'client-test', VENO_CLIENT_SECRET: 'secret-test', VENO_WEBHOOK_SECRET: 'webhook-test' };

afterEach(() => vi.unstubAllGlobals());

describe('VenoPag Worker client', () => {
  it('creates PIX Cash In using reais and canonical response fields', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(new Headers(init?.headers).get('X-Client-Id')).toBe(env.VENO_CLIENT_ID);
      expect(new Headers(init?.headers).get('X-Client-Secret')).toBe(env.VENO_CLIENT_SECRET);
      expect(JSON.parse(String(init?.body))).toMatchObject({
        amount: 89.9, document: '12345678909',
        splits: [{ username: 'affiliate_store', percentage: 7.5 }],
      });
      return Response.json({ ok: true, status: 'pending', amount: 89.9, request_number: 'veo_test', copyPaste: '000201...' });
    });
    vi.stubGlobal('fetch', fetchMock);
    const result = await createVenoCashIn(env, {
      amountInCents: 8990, payerName: 'Pagador', payerDocument: '123.456.789-09',
      description: 'Pedido', webhookUrl: 'https://example.test/webhooks/venopag',
      splits: [{ username: 'affiliate_store', percentage: 7.5 }],
    });
    expect(result.request_number).toBe('veo_test');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('fails closed on business errors even when provider returns HTTP 200', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ ok: false, error: 'Conta não verificada' })));
    await expect(getVenoCashInStatus(env, 'veo_test')).rejects.toThrow('Conta não verificada');
  });

  it('requires a valid payer document before creating any request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(createVenoCashIn(env, {
      amountInCents: 100, payerName: 'Pagador', payerDocument: '', description: 'x', webhookUrl: 'https://example.test/hook',
    })).rejects.toThrow('CPF/CNPJ válidos');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('validates the non-guessable URL token required for unsigned VenoPag webhooks', () => {
    expect(verifyVenoWebhook(env, env.VENO_WEBHOOK_SECRET)).toBe(true);
    expect(verifyVenoWebhook(env, 'wrong-token')).toBe(false);
    expect(verifyVenoWebhook(env, null)).toBe(false);
    expect(verifyVenoWebhook({ ...env, VENO_WEBHOOK_SECRET: '' }, env.VENO_WEBHOOK_SECRET)).toBe(false);
  });
});
