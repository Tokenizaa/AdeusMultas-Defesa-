import { describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const transitioned = vi.fn().mockResolvedValue({ data: { id: 'payment-1' }, error: null });
  const updateNeq = vi.fn(() => ({ select: vi.fn(() => ({ maybeSingle: transitioned })) }));
  const eq = vi.fn(() => ({ eq, maybeSingle, neq: updateNeq }));
  const maybeSingle = vi.fn().mockResolvedValue({ data: { reference_id: 'defesai_case_case-1', status: 'aguardando_pagamento', paid_at: null }, error: null });
  const single = vi.fn().mockResolvedValue({ data: { id: 'order-1' }, error: null });
  const insertChain = vi.fn(() => ({ select: vi.fn(() => ({ single })) }));
  const select = vi.fn(() => ({ eq }));
  const update = vi.fn(() => ({ eq: vi.fn(() => ({ neq: updateNeq })) }));
  const from = vi.fn(() => ({ select, update, insert: insertChain }));
  return {
    transitioned, updateNeq, eq, maybeSingle, single, insertChain, select, update, from,
    config: {
      createSupabaseAdminClient: vi.fn(() => ({ from })),
    },
    pixOrder: { orderId: 'order-pix-1', gatewayTransactionId: 'tx-pix-1', status: 'aguardando_pagamento', pixCopyPaste: '000201...', qrCodeUrl: 'https://qr.example/pix.png', simulated: false },
    cardOrder: { orderId: 'order-card-1', referenceId: 'defesai_case_case-1', status: 'aguardando_pagamento', simulated: false },
  };
});

vi.mock('../supabase', () => ({ createSupabaseAdminClient: h.config.createSupabaseAdminClient }));

vi.mock('../pagbank', async () => {
  const actual = await vi.importActual<any>('../pagbank');
  return {
    ...actual,
    createPixOrder: vi.fn().mockResolvedValue(h.pixOrder),
    createCreditCardOrder: vi.fn().mockResolvedValue(h.cardOrder),
    verifyWebhookSignature: vi.fn().mockResolvedValue(true),
  };
});

vi.mock('../middleware', () => ({
  authenticateToken: async (c: any, next: any) => {
    c.set('user', { id: 'user-1', email: 'user@example.com', role: 'citizen', name: 'User' });
    await next();
  },
  requireAdmin: async (_c: any, next: any) => next(),
}));

vi.mock('./commercial', () => ({
  commercialRoutes: {
    fetch: vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      data: { offer: { serviceType: 'defesa_previa', name: 'Defesa Prévia', finalAmount: 100, baseAmount: 100 } },
    }), { status: 200, headers: { 'content-type': 'application/json' } })),
  },
}));

import { Hono } from 'hono';
import { paymentsRoutes } from './payments';

function app() {
  const app = new Hono<any>();
  app.route('/api', paymentsRoutes);
  return app;
}

describe('Phase 12 — payment contracts (Cloudflare)', () => {
  it('rejects resolve-price without serviceType', async () => {
    const response = await app().request('/api/payments/resolve-price');
    expect(response.status).toBe(400);
  });

  it('requires caseId before creating a PIX order', async () => {
    const response = await app().request('/api/payments/pix/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceType: 'defesa_previa' }),
    });
    expect(response.status).toBe(400);
  });

  it('requires cardToken before creating a credit-card order', async () => {
    const response = await app().request('/api/payments/credit-card/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceType: 'defesa_previa', caseId: 'case-1' }),
    });
    expect(response.status).toBe(400);
  });

  it('rejects a client-supplied amount that diverges from the server offer', async () => {
    const response = await app().request('/api/payments/credit-card/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceType: 'defesa_previa', caseId: 'case-1', cardToken: 'tok-1', amount: 50 }),
    });
    expect(response.status).toBe(400);
  });

  it('creates a PIX order and persists the payment_order', async () => {
    const response = await app().request('/api/payments/pix/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceType: 'defesa_previa', caseId: 'case-1', customerCpf: '12345678909' }),
    }, { APP_URL: 'https://adeusmulta.defesai.com.br' } as any);
    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body.success).toBe(true);
    expect(body.gateway).toBe('pagbank');
    expect(body.amount).toBe(100);
    expect(h.insertChain).toHaveBeenCalled();
  });

  it('persists PAID and treats a repeated PAID webhook as duplicate', async () => {
    h.maybeSingle.mockResolvedValueOnce({ data: { reference_id: 'defesai_case_case-1', status: 'aguardando_pagamento', paid_at: null }, error: null });
    h.maybeSingle.mockResolvedValueOnce({ data: { reference_id: 'defesai_case_case-1', status: 'PAID', paid_at: new Date().toISOString() }, error: null });
    const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test' } as any;
    const payload = JSON.stringify({ id: 'evt-1', reference_id: 'defesai_case_case-1', charges: [{ status: 'PAID' }] });

    const first = await app().request('/api/webhooks/pagbank', { method: 'POST', headers: { 'content-type': 'application/json', 'x-authenticity-token': 'valid' }, body: payload }, env);
    expect(first.status).toBe(200);
    expect((await first.json() as any).isDuplicate).toBe(false);
    expect(h.updateNeq).toHaveBeenCalledWith('status', 'PAID');

    const second = await app().request('/api/webhooks/pagbank', { method: 'POST', headers: { 'content-type': 'application/json', 'x-authenticity-token': 'valid' }, body: payload }, env);
    expect(second.status).toBe(200);
    expect((await second.json() as any).isDuplicate).toBe(true);
  });
});