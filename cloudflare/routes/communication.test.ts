import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const fetchMock = vi.fn();

vi.mock('../middleware', () => ({
  authenticateToken: async (c: any, next: any) => { c.set('user', { id: 'admin-1', role: 'admin' }); await next(); },
  requireAdmin: async (_c: any, next: any) => next(),
}));

import { communicationRoutes } from './communication';

function app() {
  const app = new Hono();
  app.route('/api', communicationRoutes);
  return app;
}

const env = {
  EVOLUTION_API_URL: 'https://evolution.example',
  EVOLUTION_API_KEY: 'test-key',
  EVOLUTION_INSTANCE_NAME: 'defesai',
  EVOLUTION_WEBHOOK_SECRET: 'secret',
  FETCH: fetchMock,
} as any;

function response(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('WhatsApp Cloudflare contract', () => {
  beforeEach(() => fetchMock.mockReset());

  it('sends text through Evolution without persistence in Supabase', async () => {
    fetchMock.mockResolvedValueOnce(response({ key: { id: 'wamid-1' } }));
    const res = await app().request('/api/communication/whatsapp/send', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone: '(11) 98765-4321', message: 'Olá' }),
    }, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, messageId: 'wamid-1', destination: '5511987654321' });
    expect(fetchMock).toHaveBeenCalledWith('https://evolution.example/message/sendText/defesai', expect.objectContaining({ method: 'POST' }));
  });

  it('sends a defense PDF through Evolution media endpoint', async () => {
    fetchMock.mockResolvedValueOnce(response({ key: { id: 'doc-1' } }));
    const res = await app().request('/api/communication/whatsapp/send-document', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone: '11987654321', pdfUrl: 'https://storage.example/case.pdf', caseId: 'case-1' }),
    }, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, messageId: 'doc-1' });
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toMatchObject({ mediatype: 'document', media: 'https://storage.example/case.pdf' });
  });

  it('reads Evolution connection state', async () => {
    fetchMock.mockResolvedValueOnce(response({ state: 'open' }));
    const res = await app().request('/api/communication/whatsapp/status', { method: 'GET' }, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ connected: true, status: 'open', instance: 'defesai' });
  });

  it('rejects webhook without the configured secret', async () => {
    const res = await app().request('/api/webhooks/whatsapp', { method: 'POST', body: JSON.stringify({ event: 'MESSAGES_UPSERT' }) }, env);
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts an authenticated webhook without copying messages to Supabase', async () => {
    const res = await app().request('/api/webhooks/whatsapp', {
      method: 'POST', headers: { 'X-Webhook-Secret': 'secret', 'content-type': 'application/json' },
      body: JSON.stringify({ event: 'MESSAGES_UPSERT', data: { key: { id: 'm1' } } }),
    }, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ received: true, success: true });
  });

  it('fails closed when Evolution credentials are absent', async () => {
    const res = await app().request('/api/communication/whatsapp/status', { method: 'GET' }, { EVOLUTION_INSTANCE_NAME: 'defesai' } as any);
    expect(res.status).toBe(503);
  });
});
