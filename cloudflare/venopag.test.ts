import { afterEach, describe, expect, it, vi } from 'vitest';
import { createVenoCashIn, getVenoCashInStatus, verifyVenoWebhook } from './venopag';

const env = { VENO_CLIENT_ID: 'client-test', VENO_CLIENT_SECRET: 'secret-test', VENO_WEBHOOK_SECRET: 'webhook-test' };

afterEach(() => vi.unstubAllGlobals());

describe('VenoPag Worker client', () => {
  it('creates PIX Cash In using reais and canonical response fields', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(new Headers(init?.headers).get('X-Client-Id')).toBe(env.VENO_CLIENT_ID);
      expect(new Headers(init?.headers).get('X-Client-Secret')).toBe(env.VENO_CLIENT_SECRET);
      expect(JSON.parse(String(init?.body))).toMatchObject({ amount: 89.9, document: '12345678909' });
      return Response.json({ ok: true, status: 'pending', amount: 89.9, request_number: 'veo_test', copyPaste: '000201...' });
    });
    vi.stubGlobal('fetch', fetchMock);
    const result = await createVenoCashIn(env, {
      amountInCents: 8990, payerName: 'Pagador', payerDocument: '123.456.789-09',
      description: 'Pedido', webhookUrl: 'https://example.test/webhooks/venopag',
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

  it('verifies raw-body HMAC, client ID, and a five-minute timestamp window', async () => {
    const rawBody = '{"type":"cashin","amount":100.00}';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.VENO_WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${rawBody}`))), (byte) => byte.toString(16).padStart(2, '0')).join('');
    const header = `t=${timestamp},v1=${signature}`;

    expect(await verifyVenoWebhook(env, rawBody, header, env.VENO_CLIENT_ID)).toBe(true);
    expect(await verifyVenoWebhook(env, `${rawBody} `, header, env.VENO_CLIENT_ID)).toBe(false);
    expect(await verifyVenoWebhook(env, rawBody, header, 'another-client')).toBe(false);
    expect(await verifyVenoWebhook(env, rawBody, `t=1,v1=${signature}`, env.VENO_CLIENT_ID)).toBe(false);
  });
});
