/**
 * Integration test — ordenação gate 1 → gate 1b no handler POST /api/webhooks/whatsapp.
 *
 * Cobre o wiring que os testes unitários de `verifyEvolutionSignature` não veem:
 * gate 1 (authorizeEvolutionWebhook) NÃO pode matar headers `sha256=<hmac>`
 * antes do gate 1b (HMAC) rodar.
 *
 * Falha antes do fix (gate 1 comparava `sha256=<hex>` vs segredo puro → HMAC inalcançável).
 *
 * Run (repo config exclui src/server):
 *   npx vitest run -c /tmp/task5-vitest.config.ts src/server/routes/whatsapp-webhook.integration.test.ts
 * ou via tsx:
 *   npx tsx --test src/server/routes/whatsapp-webhook.integration.test.ts
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';
import express, { Express } from 'express';
import type { AddressInfo } from 'node:net';
import whatsappRouter from './whatsapp';

const SECRET = 'integration-test-secret';
const SAVED_SECRET = process.env.EVOLUTION_WEBHOOK_SECRET;
const SAVED_NODE_ENV = process.env.NODE_ENV;

function hmc(payload: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
}

function buildApp(): Express {
  const app = express();
  // Mesmo rawBody capture do app.ts (requisito do HMAC: bytes exatos).
  app.use(
    express.json({
      verify: (req: any, _res: Buffer, buf: Buffer) => {
        req.rawBody = buf.toString('utf8');
      },
    })
  );
  app.use(whatsappRouter);
  return app;
}

describe('POST /webhooks/whatsapp — gate 1 → gate 1b ordering', () => {
  let app: Express;
  let server: ReturnType<Express['listen']>;
  let base: string;

  beforeAll(async () => {
    app = buildApp();
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  afterEach(() => {
    if (SAVED_SECRET === undefined) delete process.env.EVOLUTION_WEBHOOK_SECRET;
    else process.env.EVOLUTION_WEBHOOK_SECRET = SAVED_SECRET;
    if (SAVED_NODE_ENV === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = SAVED_NODE_ENV;
  });

  async function post(path: string, headers: Record<string, string>, body?: string) {
    const hasBody = body !== undefined;
    const res = await fetch(base + path, {
      method: 'POST',
      headers: {
        'Content-Type': hasBody ? 'application/json' : 'text/plain',
        ...headers,
      },
      body: hasBody ? body : 'not-json',
    });
    return res;
  }

  it('legacy sender (header = raw secret, sem sha256=) → 200 (gate 1 validado, 1b pulado)', async () => {
    process.env.EVOLUTION_WEBHOOK_SECRET = SECRET;
    const res = await post('/webhooks/whatsapp', { 'X-Webhook-Secret': SECRET }, '{}');
    expect(res.status).toBe(200);
  });

  it('HMAC sender com sha256=<correto> → 200 (gate 1 defere, 1b valida)', async () => {
    process.env.EVOLUTION_WEBHOOK_SECRET = SECRET;
    const payload = '{}';
    const res = await post('/webhooks/whatsapp', { 'X-Webhook-Secret': hmc(payload, SECRET) }, payload);
    expect(res.status).toBe(200);
  });

  it('HMAC sender com sha256=<errado> → 401', async () => {
    process.env.EVOLUTION_WEBHOOK_SECRET = SECRET;
    const res = await post('/webhooks/whatsapp', { 'X-Webhook-Secret': `sha256=${'0'.repeat(64)}` }, '{}');
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('Invalid signature');
  });

  it('sha256= sem rawBody (body não-JSON) → 401 (assinatura declarada impossível de verificar)', async () => {
    process.env.EVOLUTION_WEBHOOK_SECRET = SECRET;
    const res = await post('/webhooks/whatsapp', { 'X-Webhook-Secret': `sha256=${'0'.repeat(64)}` });
    expect(res.status).toBe(401);
  });

  it('sem segredo + produção → 200 (modo disabled original preservado, sem gate de produção)', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.EVOLUTION_WEBHOOK_SECRET;
    const res = await post('/webhooks/whatsapp', {}, '{}');
    expect(res.status).toBe(200);
  });

  it('segredo errado (legacy, sem sha256=) → 401', async () => {
    process.env.EVOLUTION_WEBHOOK_SECRET = SECRET;
    const res = await post('/webhooks/whatsapp', { 'X-Webhook-Secret': 'forged' }, '{}');
    expect(res.status).toBe(401);
  });
});