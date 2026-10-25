import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

/* ------------------------------------------------------------------ */
/*  Mocks de infra (factories inline — vi.mock é hoisted)            */
/* ------------------------------------------------------------------ */

let adminClient: any;
adminClient = { from: vi.fn(), rpc: vi.fn() };

vi.mock('../supabase', () => ({
  createSupabaseAdminClient: vi.fn(() => adminClient),
}));

vi.mock('../venopag', () => ({
  createVenoCashIn: vi.fn(),
  getVenoCashInStatus: vi.fn(),
  verifyVenoWebhook: vi.fn(),
}));

vi.mock('../pagbank', () => ({
  createPixOrder: vi.fn(),
  verifyWebhookSignature: vi.fn(),
}));

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
import { createSupabaseAdminClient } from '../supabase';
import { createVenoCashIn, getVenoCashInStatus, verifyVenoWebhook } from '../venopag';
import { verifyWebhookSignature } from '../pagbank';
import type { Env } from '../supabase';

function app() {
  const hono = new Hono<{ Bindings: Env }>();
  hono.onError((err, c) => {
    return c.json({ error: 'Internal Server Error', detail: String(err?.message || err) }, 500);
  });
  hono.route('/api', paymentsRoutes);
  return hono;
}

function makeChain(data: any = null): any {
  const result = { data, error: null };
  return {
    eq: vi.fn(() => makeChain(data)),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    limit: vi.fn(() => makeChain(data)),
    neq: vi.fn(() => ({
      select: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue(result),
      })),
    })),
    select: vi.fn(() => makeChain(data)),
    order: vi.fn(() => makeChain(data)),
    insert: vi.fn().mockResolvedValue(result),
    update: vi.fn(() => makeChain(data)),
    delete: vi.fn().mockResolvedValue(result),
    upsert: vi.fn().mockResolvedValue(result),
    then: vi.fn(async (resolve: any) => resolve(result)),
  };
}

function resetAdminClient() {
  const baseChain = makeChain(null);
  adminClient.from = vi.fn((table: string) => makeChain(null));
  adminClient.rpc = vi.fn().mockResolvedValue({ data: { ok: true }, error: null });
}

function setPaymentOrderExisting(order: any) {
  adminClient.from = vi.fn((table: string) => {
    if (table === 'payment_orders') {
      return makeChain(order);
    }
    if (table === 'webhook_events') {
      return {
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockResolvedValue({ data: null, error: null }),
        select: vi.fn(() => makeChain(null)),
        eq: vi.fn(() => makeChain(null)),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: vi.fn(async (resolve: any) => resolve({ data: null, error: null })),
      };
    }
    return makeChain(null);
  });
  adminClient.rpc = vi.fn().mockResolvedValue({ data: { ok: true }, error: null });
}

beforeEach(() => {
  resetAdminClient();
  vi.clearAllMocks();
  verifyVenoWebhook.mockResolvedValue(true);
  verifyWebhookSignature.mockResolvedValue(true);
});
afterEach(() => vi.unstubAllGlobals());

describe('Regressão — pagamentos e ciclo financeiro', () => {
  const envBase = {
    APP_URL: 'https://adeusmulta.defesai.com.br',
    VENO_CLIENT_ID: 'client-test',
    VENO_CLIENT_SECRET: 'secret-test',
    VENO_WEBHOOK_SECRET: 'webhook-secret',
    VENO_PRIMARY_GATEWAY: 'venopag',
    ANONYMOUS_CASE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) },
  } as any;

  describe('Idempotência de criação PIX (mesmo caseId+userId+gateway)', () => {
    it('chama o gateway uma única vez e reutiliza a cobrança pendente na segunda requisição', async () => {
      const chain = () => ({
        eq: vi.fn(() => chain()),
        maybeSingle: vi.fn().mockResolvedValueOnce({ data: null, error: null }),
      });
      // Primeira requisição: não existe pagamento pendente → reserva e chama gateway.
      adminClient.from = vi.fn((table: string) => {
        if (table === 'payment_orders') {
          return {
            select: vi.fn(() => chain()),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'res-1', case_id: 'case-1', status: 'PENDING', gateway_transaction_id: null },
                  error: null,
                }),
              })),
            })),
            update: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return { select: vi.fn(), insert: vi.fn(), update: vi.fn() };
      });

      createVenoCashIn.mockResolvedValue({
        status: 'pending',
        amount: 100,
        request_number: 'veo_1',
        transaction_id: 'tx_1',
        copyPaste: '000201venopag',
        qr_url: 'https://venopagments.com/qr',
        qr_img: 'cG5n',
      });

      const res1 = await app().request('/api/payments/pix/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.50' },
        body: JSON.stringify({ serviceType: 'defesa_previa', caseId: 'case-1', customerCpf: '12345678909' }),
      }, envBase);
      expect(res1.status).toBe(200);
      expect(createVenoCashIn).toHaveBeenCalledTimes(1);

      // Segunda requisição: já existe pagamento PENDING com dados do gateway → reutiliza, não chama o gateway.
      const chain2 = () => ({
        eq: vi.fn(() => chain2()),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 'res-1', case_id: 'case-1', user_id: 'user-1',
            status: 'PENDING', amount: 100, gateway: 'venopag', payment_method: 'pix',
            gateway_transaction_id: 'veo_1', qr_code_text: '000201venopag', qr_code_url: 'https://venopagments.com/qr',
          },
          error: null,
        }),
      });
      adminClient.from = vi.fn((table: string) => {
        if (table === 'payment_orders') {
          return {
            select: vi.fn(() => chain2()),
            insert: vi.fn(),
            update: vi.fn(),
          };
        }
        return { select: vi.fn(), insert: vi.fn(), update: vi.fn() };
      });

      const res2 = await app().request('/api/payments/pix/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.50' },
        body: JSON.stringify({ serviceType: 'defesa_previa', caseId: 'case-1', customerCpf: '12345678909' }),
      }, envBase);
      expect(res2.status).toBe(200);
      const body2 = await res2.json() as any;
      expect(body2.reused).toBe(true);
      expect(createVenoCashIn).toHaveBeenCalledTimes(1); // gateway não chamado novamente
    });
  });

  describe('Dedup durável de webhook (tabela webhook_events)', () => {
    it('PagBank: mesma event_id processada apenas uma vez; segunda entrega é duplicate', async () => {
      setPaymentOrderExisting({
        id: 'order-1', reference_id: 'defesai_case_case-1', status: 'aguardando_pagamento',
        paid_at: null, amount: 100, gateway: 'pagbank', case_id: 'case-1',
      });

      const payload = JSON.stringify({
        id: 'evt-paid-1', reference_id: 'defesai_case_case-1',
        charges: [{ status: 'PAID', amount: 100 }],
      });

      const paymentChain = () => ({
        eq: vi.fn(() => paymentChain()),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'order-1', reference_id: 'defesai_case_case-1', status: 'aguardando_pagamento', paid_at: null, amount: 100, gateway: 'pagbank', case_id: 'case-1' },
          error: null,
        }),
      });
      const transitionChain = () => ({
        eq: vi.fn(() => transitionChain()),
        neq: vi.fn(() => ({
          select: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'order-1' }, error: null }),
          })),
        })),
      });
      // Primeira entrega: inserido em webhook_events, processado.
      adminClient.from = vi.fn((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            update: vi.fn().mockResolvedValue({ data: null, error: null }),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        if (table === 'payment_orders') {
          return {
            select: vi.fn(() => paymentChain()),
            update: vi.fn(() => transitionChain()),
          };
        }
        return { select: vi.fn(), insert: vi.fn(), update: vi.fn() };
      });

      const res1 = await app().request('/api/webhooks/pagbank', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-authenticity-token': 'valid' },
        body: payload,
      }, { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test', PAGBANK_TOKEN: 'tok' } as any);
      expect(res1.status).toBe(200);
      expect((await res1.json() as any).isDuplicate).toBe(false);

      // Segunda entrega com mesmo event_id: detectado como duplicado (unique violation em webhook_events).
      adminClient.from = vi.fn((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: { code: '23505' } }),
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: { status: 'processed' }, error: null }),
              })),
            })),
            update: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return { select: vi.fn(), insert: vi.fn(), update: vi.fn() };
      });

      const res2 = await app().request('/api/webhooks/pagbank', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-authenticity-token': 'valid' },
        body: payload,
      }, { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test', PAGBANK_TOKEN: 'tok' } as any);
      expect(res2.status).toBe(200);
      expect((await res2.json() as any).isDuplicate).toBe(true);
    });
  });

  describe('Validação de amount no webhook PagBank', () => {
    it('rejeita webhook PAID cujo valor da transação diverge do valor do pedido (409)', async () => {
      adminClient.from = vi.fn((table: string) => {
        if (table === 'webhook_events') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            update: vi.fn().mockResolvedValue({ data: null, error: null }),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        const amountChain = () => ({
          eq: vi.fn(() => amountChain()),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'order-1', reference_id: 'defesai_case_case-1', status: 'aguardando_pagamento', paid_at: null, amount: 100, gateway: 'pagbank', case_id: 'case-1' },
            error: null,
          }),
        });
        if (table === 'payment_orders') {
          return {
            select: vi.fn(() => amountChain()),
            update: vi.fn(),
          };
        }
        return { select: vi.fn(), insert: vi.fn(), update: vi.fn() };
      });

      const payload = JSON.stringify({
        id: 'evt-paid-amt', reference_id: 'defesai_case_case-1',
        charges: [{ status: 'PAID', amount: 250 }], // diverge de 100
      });

      const res = await app().request('/api/webhooks/pagbank', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-authenticity-token': 'valid' },
        body: payload,
      }, { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test', PAGBANK_TOKEN: 'tok' } as any);
      expect(res.status).toBe(409);
      expect((await res.json() as any).error).toContain('não confere');
    });
  });

  describe('Webhook VenoPag — transação e reversões', () => {
    it('contested → DISPUTED (sem reversão de ledger)', async () => {
      const order = {
        id: 'order-veno-1', case_id: 'case-1', status: 'PENDING', paid_at: null,
        amount: 150, gateway: 'venopag', gateway_transaction_id: 'tx_veno_1', payment_method: 'pix',
      };
      setPaymentOrderExisting(order);

      getVenoCashInStatus.mockResolvedValue({ ok: true, status: 'contested', request_number: 'tx_veno_1', amount: 150 });

      const res = await app().request('/api/webhooks/venopag', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-veno-signature': 't=1,v1=deadbeef',
          'x-veno-client-id': 'client-test',
        },
        body: JSON.stringify({ type: 'cashin', status: 'contested', request_number: 'tx_veno_1', amount: 150 }),
      }, envBase);
      if (res.status !== 200) {
        // eslint-disable-next-line no-console
        console.log('RESPONSE BODY:', await res.text());
      }
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.status).toBe('DISPUTED');
      expect(adminClient.rpc).toHaveBeenCalledTimes(1);
      const rpcArgs = adminClient.rpc.mock.calls[0];
      expect(rpcArgs[0]).toBe('apply_venopag_webhook');
      expect(rpcArgs[1].p_payment_id).toBe('order-veno-1');
      expect(rpcArgs[1].p_status).toBe('contested');
    });

    it('chargedback → REFUNDED com reversão', async () => {
      const order = {
        id: 'order-veno-2', case_id: 'case-2', status: 'PAID', paid_at: '2026-10-01T00:00:00Z',
        amount: 150, gateway: 'venopag', gateway_transaction_id: 'tx_veno_2', payment_method: 'pix',
      };
      setPaymentOrderExisting(order);

      getVenoCashInStatus.mockResolvedValue({ ok: true, status: 'chargedback', request_number: 'tx_veno_2', amount: 150 });

      const res = await app().request('/api/webhooks/venopag', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-veno-signature': 't=1,v1=deadbeef',
          'x-veno-client-id': 'client-test',
        },
        body: JSON.stringify({ type: 'cashin', status: 'chargedback', request_number: 'tx_veno_2', amount: 150 }),
      }, envBase);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.status).toBe('REFUNDED');
      const rpcArgs = adminClient.rpc.mock.calls[0];
      expect(rpcArgs[0]).toBe('apply_venopag_webhook');
      expect(rpcArgs[1].p_status).toBe('chargedback');
      expect(rpcArgs[1].p_reversal_reason).toBe('chargedback');
    });
  });
});
