import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../supabase';
import { authenticateToken, requireAdmin, type AuthenticatedUser } from '../middleware';

export const communicationRoutes = new Hono<{ Bindings: Env; Variables: { user?: AuthenticatedUser } }>();

const digits = (value: string) => value.replace(/\D/g, '');

function evolutionConfig(env: Env) {
  const apiUrl = env.EVOLUTION_API_URL?.replace(/\/$/, '');
  const apiKey = env.EVOLUTION_API_KEY;
  const instance = env.EVOLUTION_INSTANCE_NAME || 'defesai';
  if (!apiUrl || !apiKey || apiKey.startsWith('PLACEHOLDER')) {
    throw new HTTPException(503, { message: 'WhatsApp Evolution não configurado no Cloudflare' });
  }
  return { apiUrl, apiKey, instance };
}

async function evolutionRequest(env: Env, path: string, method = 'GET', body?: Record<string, unknown>) {
  const { apiUrl, apiKey } = evolutionConfig(env);
  const doFetch = env.FETCH || fetch;
  const response = await doFetch(`${apiUrl}${path}`, {
    method,
    headers: { apikey: apiKey, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) throw new HTTPException(502, { message: `Evolution API ${response.status}: ${data?.message || response.statusText}` });
  return data;
}

communicationRoutes.use('/communication/whatsapp/*', authenticateToken);

communicationRoutes.post('/communication/whatsapp/send', async (c) => {
  const body = await c.req.json<any>().catch(() => ({}));
  if (!body.phone || !body.message) throw new HTTPException(400, { message: 'phone e message são obrigatórios' });
  const { instance } = evolutionConfig(c.env);
  const destination = digits(String(body.phone));
  if (destination.length < 10) throw new HTTPException(400, { message: 'Número de telefone inválido' });
  const result = await evolutionRequest(c.env, `/message/sendText/${encodeURIComponent(instance)}`, 'POST', {
    number: destination.length <= 11 ? `55${destination}` : destination,
    text: String(body.message),
  });
  return c.json({ success: true, messageId: result?.key?.id || result?.id || null, status: 'sent', destination: destination.length <= 11 ? `55${destination}` : destination, timestamp: new Date().toISOString() });
});

communicationRoutes.post('/communication/whatsapp/send-media', async (c) => {
  const body = await c.req.json<any>().catch(() => ({}));
  if (!body.phone || !body.mediaUrl) throw new HTTPException(400, { message: 'phone e mediaUrl são obrigatórios' });
  const { instance } = evolutionConfig(c.env);
  const destination = digits(String(body.phone));
  const mediaType = body.mediaType || (body.asDocument ? 'document' : 'image');
  const result = await evolutionRequest(c.env, `/message/sendMedia/${encodeURIComponent(instance)}`, 'POST', {
    number: destination.length <= 11 ? `55${destination}` : destination,
    mediatype: mediaType,
    mimetype: body.mimeType || (mediaType === 'document' ? 'application/pdf' : undefined),
    media: String(body.mediaUrl),
    caption: body.caption || '',
  });
  return c.json({ success: true, messageId: result?.key?.id || result?.id || null, destination: destination.length <= 11 ? `55${destination}` : destination });
});

communicationRoutes.post('/communication/whatsapp/send-document', async (c) => {
  const body = await c.req.json<any>().catch(() => ({}));
  if (!body.phone || !body.pdfUrl) throw new HTTPException(400, { message: 'phone e pdfUrl são obrigatórios' });
  const { instance } = evolutionConfig(c.env);
  const destination = digits(String(body.phone));
  const result = await evolutionRequest(c.env, `/message/sendMedia/${encodeURIComponent(instance)}`, 'POST', {
    number: destination.length <= 11 ? `55${destination}` : destination,
    mediatype: 'document',
    mimetype: 'application/pdf',
    media: String(body.pdfUrl),
    caption: body.message || `Documento do caso #${body.caseId || ''}`,
  });
  return c.json({ success: true, messageId: result?.key?.id || result?.id || null, destination: destination.length <= 11 ? `55${destination}` : destination });
});

communicationRoutes.get('/communication/whatsapp/status', async (c) => {
  const { instance } = evolutionConfig(c.env);
  const result = await evolutionRequest(c.env, `/instance/connectionState/${encodeURIComponent(instance)}`);
  const state = result?.state || result?.instance?.state || 'close';
  return c.json({ connected: state === 'open', status: state, instance });
});

communicationRoutes.get('/communication/whatsapp/qrcode', requireAdmin, async (c) => {
  const { instance } = evolutionConfig(c.env);
  const result = await evolutionRequest(c.env, `/instance/connect/${encodeURIComponent(instance)}`);
  const qrcode = result?.base64 || result?.qrcode || null;
  if (!qrcode) throw new HTTPException(404, { message: 'QR code não disponível' });
  return c.json({ success: true, qrcode });
});

communicationRoutes.get('/communication/whatsapp/webhook-config', async (c) => {
  const { instance } = evolutionConfig(c.env);
  const result = await evolutionRequest(c.env, `/webhook/find/${encodeURIComponent(instance)}`);
  return c.json({ success: true, currentConfig: result, recommendedUrl: `${new URL(c.req.url).origin}/api/webhooks/whatsapp` });
});

communicationRoutes.post('/communication/whatsapp/webhook-config', requireAdmin, async (c) => {
  const body = await c.req.json<any>().catch(() => ({}));
  const { instance } = evolutionConfig(c.env);
  const targetUrl = body.webhookUrl || `${new URL(c.req.url).origin}/api/webhooks/whatsapp`;
  const webhookSecret = c.env.EVOLUTION_WEBHOOK_SECRET;
  await evolutionRequest(c.env, `/webhook/set/${encodeURIComponent(body.instanceName || instance)}`, 'POST', {
    webhook: {
      enabled: true,
      url: targetUrl,
      byEvents: false,
      base64: false,
      ...(webhookSecret ? { headers: { 'X-Webhook-Secret': webhookSecret } } : {}),
      events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'SEND_MESSAGE', 'CONNECTION_UPDATE'],
    },
  });
  return c.json({ success: true, url: targetUrl });
});

communicationRoutes.get('/webhooks/whatsapp', (c) => c.json({ status: 'active', endpoint: '/api/webhooks/whatsapp' }));

communicationRoutes.post('/webhooks/whatsapp', async (c) => {
  const expected = c.env.EVOLUTION_WEBHOOK_SECRET;
  if (expected) {
    const received = c.req.header('X-Webhook-Secret');
    if (!received || received !== expected) throw new HTTPException(401, { message: 'Unauthorized webhook source' });
  }
  // Evolution/Chatwoot remains the communication system of record. The Worker
  // acknowledges the webhook without duplicating conversations/messages in Supabase.
  return c.json({ received: true, success: true, timestamp: new Date().toISOString() });
});

export default communicationRoutes;
