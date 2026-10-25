import { describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const transitioned = vi.fn().mockResolvedValue({ data: { id: 'payment-1' }, error: null });
  const updateNeq = vi.fn(() => ({ select: vi.fn(() => ({ maybeSingle: transitioned })) }));
  const eq = vi.fn(() => ({ eq, maybeSingle, limit: vi.fn(() => ({ maybeSingle })), neq: updateNeq }));
  const maybeSingle = vi.fn().mockResolvedValue({ data: { reference_id: 'defesai_case_case-1', status: 'aguardando_pagamento', paid_at: null }, error: null });
  const caseMaybeSingle = vi.fn().mockResolvedValue({ data: { id: 'case-1', user_id: 'user-1', is_paid: false }, error: null });
  const single = vi.fn().mockResolvedValue({ data: { id: 'order-1' }, error: null });
  const insertChain = vi.fn(() => ({ select: vi.fn(() => ({ single })) }));
  const select = vi.fn(() => ({ eq }));
  const update = vi.fn(() => ({
    eq: vi.fn(() => ({
      neq: updateNeq,
      select: vi.fn(() => ({ single })),
    })),
  }));
  const from = vi.fn((table) => {
    if (table === 'cases') {
      return {
        select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: caseMaybeSingle })) })),
        update,
      };
    }
    if (table === 'webhook_events') {
      return {
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockResolvedValue({ data: null, error: null }),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }
    return { select, update, insert: insertChain };
  });
  const rpc = vi.fn().mockResolvedValue({ data: { ok: true, status: 'confirmed', payment_id: 'order-1' }, error: null });
  return {
    transitioned, updateNeq, eq, maybeSingle, caseMaybeSingle, single, insertChain, select, update, from, rpc,
    config: {
      createSupabaseAdminClient: vi.fn(() => ({ from, rpc })),
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

vi.mock('../venopag', async () => {
  const actual = await vi.importActual<any>('../venopag');
  return {
    ...actual,
    createVenoCashIn: vi.fn().mockResolvedValue({
      ok: true, status: 'pending', amount: 100, request_number: 'veo_test_123',
      transaction_id: 'tx_123', copyPaste: '000201venopag', qr_url: 'https://venopagments.com/qr', qr_img: 'cG5n',
    }),
    getVenoCashInStatus: vi.fn(),
    verifyVenoWebhook: vi.fn(),
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
  resolveOffer: vi.fn(async (_env: any, input: any) => ({
    offer: { serviceType: input.serviceType, name: 'Defesa Prévia', finalAmount: 100, baseAmount: 100 },
  })),
}));

import { Hono } from 'hono';
import { paymentsRoutes } from './payments';
import { createVenoCashIn, getVenoCashInStatus, verifyVenoWebhook } from '../venopag';
import type { Env } from '../supabase';

function app() {
  const app = new Hono<{ Bindings: Env }>();
  app.route('/api', paymentsRoutes);
  return app;
}

describe('Phase 12 — payment contracts (Cloudflare)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects resolve-price without serviceType', async () => {
    const response = await app().request('/api/payments/resolve-price');
    expect(response.status).toBe(400);
  });

  it('resolves the offer through the domain service using the authenticated user', async () => {
    const response = await app().request('/api/payments/resolve-price?serviceType=defesa_previa&userId=attacker', {}, {} as any);
    expect(response.status).toBe(200);
    const resolver = (await import('./commercial')).resolveOffer;
    expect(vi.mocked(resolver)).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ serviceType: 'defesa_previa', userId: 'user-1' }));
  });

  it('reports the configured primary gateway without exposing credentials', async () => {
    const response = await app().request('/api/payments/gateway/status', {}, {
      VENO_PRIMARY_GATEWAY: 'venopag',
      VENO_CLIENT_ID: 'client-test',
      VENO_CLIENT_SECRET: 'secret-test',
      VENO_WEBHOOK_SECRET: 'webhook-secret',
    } as any);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true, configured: true, gateway: 'venopag', environment: 'production', simulated: false, testMode: false,
    });
  });

  it('advertises admin test mode only when sandbox is explicitly configured', async () => {
    const response = await app().request('/api/payments/gateway/status', {}, {
      PAYMENT_MODE: 'sandbox',
      VENO_PRIMARY_GATEWAY: 'venopag',
      VENO_CLIENT_ID: 'client-test',
      VENO_CLIENT_SECRET: 'secret-test',
      VENO_WEBHOOK_SECRET: 'webhook-secret',
    } as any);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ testMode: true, gateway: 'venopag' });
  });

  it('blocks admin payment simulation unless PAYMENT_MODE is explicitly sandbox', async () => {
    const response = await app().request('/api/payments/simulate-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId: 'case-test', amount: 100 }),
    }, { PAYMENT_MODE: 'production' } as any);
    expect(response.status).toBe(501);
    expect(h.config.createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it('persists a simulated payment for an existing case in sandbox', async () => {
    h.caseMaybeSingle.mockResolvedValueOnce({
      data: {
        id: 'case-1', title: 'Caso sintético', user_id: 'user-1', status: 'analisado', current_stage: 2,
        service_type: 'defesa_previa', is_paid: false, is_anonymous: false, paid_at: null,
        vehicle_plate: 'BRA2E19', vehicle_brand_model: 'Veículo de teste', ait_number: 'AIT-TEST-1',
        infraction_code: '745-50', infraction_description: 'Excesso de velocidade', ctb_article: 'Art. 218',
        severity: 'media', points: 4, fine_amount: 130.16, autuador_body: 'DETRAN-SP',
        date_time: '2026-10-20', location: 'Rua de teste, 10 - São Paulo/SP',
        timeline_json: '[]', formal_flaws_json: '[]',
      },
      error: null,
    });
    const response = await app().request('/api/payments/simulate-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId: 'case-1', amount: 100, paymentMethod: 'pix', gateway: 'pagbank' }),
    }, { PAYMENT_MODE: 'sandbox' } as any);
    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body.success).toBe(true);
    expect(body.simulated).toBe(true);
    expect(body.case.isPaid).toBe(true);
    expect(body.case.status).toBe('defesa_pronta');
    expect(h.update).toHaveBeenCalled();
  });

  it('requires caseId before attempting an admin payment simulation', async () => {
    const response = await app().request('/api/payments/simulate-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 100 }),
    }, { PAYMENT_MODE: 'sandbox' } as any);
    expect(response.status).toBe(400);
    expect(h.config.createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it('blocks PIX creation when the authenticated user does not own the case', async () => {
    h.caseMaybeSingle.mockResolvedValueOnce({
      data: { id: 'case-1', user_id: 'another-user', is_paid: false }, error: null,
    });
    const response = await app().request('/api/payments/pix/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.50' },
      body: JSON.stringify({ serviceType: 'defesa_previa', caseId: 'case-1', customerCpf: '12345678909' }),
    }, {
      VENO_PRIMARY_GATEWAY: 'venopag',
      VENO_CLIENT_ID: 'client-test',
      VENO_CLIENT_SECRET: 'secret-test',
      VENO_WEBHOOK_SECRET: 'webhook-secret',
      ANONYMOUS_CASE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) },
    } as any);
    expect(response.status).toBe(403);
    expect(createVenoCashIn).not.toHaveBeenCalled();
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

  it('fails closed when production payment credentials are absent', async () => {
    const pix = await app().request('/api/payments/pix/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceType: 'defesa_previa', caseId: 'case-no-gateway' }),
    }, { PAYMENT_MODE: 'production', PAGBANK_ENV: 'production' } as any);
    const card = await app().request('/api/payments/credit-card/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceType: 'defesa_previa', caseId: 'case-no-gateway', cardToken: 'tok-test' }),
    }, { PAYMENT_MODE: 'production', PAGBANK_ENV: 'production' } as any);

    expect(pix.status).toBe(503);
    expect(card.status).toBe(503);
    expect(h.insertChain).not.toHaveBeenCalled();
  });

  it('rejects a client-supplied amount that diverges from the server offer', async () => {
    const response = await app().request('/api/payments/credit-card/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.52' },
      body: JSON.stringify({ serviceType: 'defesa_previa', caseId: 'case-1', cardToken: 'tok-1', amount: 50 }),
    }, { ANONYMOUS_CASE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) } } as any);
    expect(response.status).toBe(400);
  });

  it('keeps legacy PagBank disabled for new PIX charges while VenoPag is primary', async () => {
    const response = await app().request('/api/payments/pix/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.50' },
      body: JSON.stringify({ serviceType: 'defesa_previa', caseId: 'case-1', customerCpf: '12345678909' }),
    }, { APP_URL: 'https://adeusmulta.defesai.com.br', PAGBANK_TOKEN: 'test-token', PAYMENT_MODE: 'production', PAGBANK_ENV: 'production', VENO_PRIMARY_GATEWAY: 'pagbank', ANONYMOUS_CASE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) } } as any);
    expect(response.status).toBe(503);
    expect(await response.text()).toContain('PagBank permanece desativado');
    expect(h.insertChain).not.toHaveBeenCalled();
  });

  it('rejects PIX creation when the rate limit is reached', async () => {
    const response = await app().request('/api/payments/pix/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.60' },
      body: JSON.stringify({ serviceType: 'defesa_previa', caseId: 'case-rl', customerCpf: '12345678909' }),
    }, { ANONYMOUS_CASE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: false }) } } as any);
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('60');
  });

  it('fails closed when rate-limit binding is unavailable for PIX creation', async () => {
    const response = await app().request('/api/payments/pix/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.61' },
      body: JSON.stringify({ serviceType: 'defesa_previa', caseId: 'case-nolimit', customerCpf: '12345678909' }),
    }, {} as any);
    expect(response.status).toBe(503);
  });

  it('hard-blocks PIX creation in the safe preview before contacting any gateway', async () => {
    h.insertChain.mockClear();
    const providerFetch = vi.fn();
    vi.stubGlobal('fetch', providerFetch);
    try {
      const response = await app().request('/api/payments/pix/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceType: 'defesa_previa', caseId: 'preview-case', customerName: 'Preview', customerCpf: '12345678909' }),
      }, {
        E2E_SAFE_PREVIEW: 'true',
        VENO_PRIMARY_GATEWAY: 'venopag',
        VENO_CLIENT_ID: 'must-not-be-used',
        VENO_CLIENT_SECRET: 'must-not-be-used',
        VENO_WEBHOOK_SECRET: 'must-not-be-used',
      } as any);
      expect(response.status).toBe(503);
      expect(await response.text()).toContain('Cobranças estão desativadas no preview de testes');
      expect(providerFetch).not.toHaveBeenCalled();
      expect(h.insertChain).not.toHaveBeenCalled();

      const cardResponse = await app().request('/api/payments/credit-card/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceType: 'defesa_previa', caseId: 'preview-card-case', cardToken: 'token-only-for-test' }),
      }, { E2E_SAFE_PREVIEW: 'true', VENO_PRIMARY_GATEWAY: 'venopag' } as any);
      expect(cardResponse.status).toBe(503);
      expect(await cardResponse.text()).toContain('Cobranças estão desativadas no preview de testes');
      expect(providerFetch).not.toHaveBeenCalled();
      expect(h.insertChain).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('uses VenoPag as the primary PIX provider and persists its request number', async () => {
    const providerFetch = vi.fn(async (_input: string | URL | Request) => Response.json({
      ok: true, status: 'pending', amount: 100, request_number: 'veo_test_123',
      transaction_id: 'tx_123', copyPaste: '000201venopag', qr_url: 'https://venopagments.com/qr', qr_img: 'cG5n',
    }));
    vi.stubGlobal('fetch', providerFetch);
    try {
      const response = await app().request('/api/payments/pix/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.51' },
        body: JSON.stringify({ serviceType: 'defesa_previa', caseId: 'case-veno', customerName: 'Cliente', customerCpf: '12345678909' }),
      }, {
        APP_URL: 'https://adeusmulta.defesai.com.br', VENO_CLIENT_ID: 'client-test',
        VENO_CLIENT_SECRET: 'secret-test', VENO_WEBHOOK_SECRET: 'webhook-secret',
        ANONYMOUS_CASE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) },
      } as any);
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.gateway).toBe('venopag');
      expect(body.txId).toBe('veo_test_123');
      expect(body.pixCopyPasteString).toBe('000201venopag');
      expect(body.qrCodeDataUrl).toBe('data:image/png;base64,cG5n');
      expect(providerFetch).toHaveBeenCalledOnce();
      expect(h.insertChain).toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('rejects VenoPag webhooks without a valid signature before database access', async () => {
    const response = await app().request('/api/webhooks/venopag', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'cashin', status: 'confirmed', request_number: 'veo_fake' }),
    }, { VENO_CLIENT_ID: 'client-test', VENO_WEBHOOK_SECRET: 'webhook-secret' } as any);
    expect(response.status).toBe(401);
  });

  it('persists PAID and treats a repeated PAID webhook as duplicate', async () => {
    h.maybeSingle.mockResolvedValueOnce({ data: { reference_id: 'defesai_case_case-1', status: 'aguardando_pagamento', paid_at: null }, error: null });
    h.maybeSingle.mockResolvedValueOnce({ data: { reference_id: 'defesai_case_case-1', status: 'PAID', paid_at: new Date().toISOString() }, error: null });
    const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test' } as any;
    const payload = JSON.stringify({ id: 'evt-1', reference_id: 'defesai_case_case-1', charges: [{ status: 'PAID', amount: 100 }] });

    const first = await app().request('/api/webhooks/pagbank', { method: 'POST', headers: { 'content-type': 'application/json', 'x-authenticity-token': 'valid' }, body: payload }, env);
    expect(first.status).toBe(200);
    expect((await first.json() as any).isDuplicate).toBe(false);
    expect(h.updateNeq).toHaveBeenCalledWith('status', 'PAID');

    const second = await app().request('/api/webhooks/pagbank', { method: 'POST', headers: { 'content-type': 'application/json', 'x-authenticity-token': 'valid' }, body: payload }, env);
    expect(second.status).toBe(200);
    expect((await second.json() as any).isDuplicate).toBe(true);
  });

  it('accepts valid VenoPag webhook and marks payment as paid', async () => {
    h.maybeSingle.mockResolvedValueOnce({ data: { reference_id: 'defesai_case_veno-1', status: 'aguardando_pagamento', paid_at: null, id: 'order-veno-1', amount: 150, gateway_transaction_id: 'tx_veno_1', gateway: 'venopag' }, error: null });
    const updated = vi.fn().mockResolvedValue({ data: { id: 'order-veno-1' }, error: null });
    h.updateNeq = vi.fn(() => ({ select: vi.fn(() => ({ maybeSingle: updated })) }));

    vi.mocked(getVenoCashInStatus).mockResolvedValue({ ok: true, status: 'confirmed', request_number: 'tx_veno_1', amount: 150 });
    vi.mocked(verifyVenoWebhook).mockResolvedValue(true);

    const env = {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test',
      VENO_CLIENT_ID: 'test-client',
      VENO_CLIENT_SECRET: 'test-secret',
      VENO_WEBHOOK_SECRET: 'test-webhook-secret',
    } as any;
    const payload = JSON.stringify({
      type: 'cashin',
      status: 'confirmed',
      request_number: 'tx_veno_1',
      transaction_id: 'txn_123',
      amount: 150.0,
    });

    const response = await app().request('/api/webhooks/venopag', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-veno-signature': 'valid_signature',
        'x-veno-client-id': 'test-client',
      },
      body: payload,
    }, env);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.received).toBe(true);
    expect(body.isDuplicate).toBe(false);
    expect(body.matched).toBe(true);
  });

  it('rejects VenoPag webhook with invalid signature', async () => {
    vi.mocked(verifyVenoWebhook).mockResolvedValue(false);

    const env = {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test',
      VENO_CLIENT_ID: 'test-client',
      VENO_CLIENT_SECRET: 'test-secret',
      VENO_WEBHOOK_SECRET: 'test-webhook-secret',
    } as any;
    const payload = JSON.stringify({
      type: 'cashin',
      status: 'confirmed',
      request_number: 'tx_veno_2',
      transaction_id: 'txn_456',
      amount: 150.0,
    });

    const response = await app().request('/api/webhooks/venopag', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-veno-signature': 'invalid_signature',
        'x-veno-client-id': 'test-client',
      },
      body: payload,
    }, env);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('Assinatura inv');
  });

  it('ignores non-cashin VenoPag events', async () => {
    vi.mocked(verifyVenoWebhook).mockResolvedValue(true);

    const env = {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test',
      VENO_CLIENT_ID: 'test-client',
      VENO_CLIENT_SECRET: 'test-secret',
      VENO_WEBHOOK_SECRET: 'test-webhook-secret',
    } as any;
    const payload = JSON.stringify({
      type: 'refund',
      status: 'completed',
      request_number: 'tx_veno_3',
      amount: 100.0,
    });

    const response = await app().request('/api/webhooks/venopag', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-veno-signature': 'valid_signature',
        'x-veno-client-id': 'test-client',
      },
      body: payload,
    }, env);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.received).toBe(true);
    expect(body.ignored).toBe(true);
  });
});
