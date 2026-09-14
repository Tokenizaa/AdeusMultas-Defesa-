import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const paymentRow = {
  id: 'payment-1',
  reference_id: 'defesai_case_case-1',
  status: 'aguardando_pagamento',
  paid_at: null,
};

const transitioned = vi.fn().mockResolvedValue({ data: { id: 'payment-1' }, error: null });
const updateNeq = vi.fn(() => ({ select: vi.fn(() => ({ maybeSingle: transitioned })) }));
const eq = vi.fn(() => ({ eq, maybeSingle, neq: updateNeq }));
const maybeSingle = vi.fn().mockResolvedValue({ data: paymentRow, error: null });
const select = vi.fn(() => ({ eq }));
const update = vi.fn(() => ({ eq: vi.fn(() => ({ neq: updateNeq })) }));
const from = vi.fn(() => ({ select, update }));

vi.mock('../supabase', () => ({
  createSupabaseAdminClient: vi.fn(() => ({ from })),
}));

vi.mock('../pagbank', async () => {
  const actual = await vi.importActual<any>('../pagbank');
  return { ...actual, verifyWebhookSignature: vi.fn().mockResolvedValue(true) };
});

import { paymentsRoutes } from './payments';

describe('Cloudflare payment webhook', () => {
  it('persists PAID and treats a repeated PAID webhook as duplicate', async () => {
    const app = new Hono<any>();
    app.route('/api', paymentsRoutes);
    const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test' } as any;
    const payload = JSON.stringify({ id: 'evt-1', reference_id: 'defesai_case_case-1', charges: [{ status: 'PAID' }] });

    const first = await app.request('/api/webhooks/pagbank', { method: 'POST', headers: { 'content-type': 'application/json', 'x-authenticity-token': 'valid' }, body: payload }, env);
    expect(first.status).toBe(200);
    expect((await first.json() as any).isDuplicate).toBe(false);
    expect(update).toHaveBeenCalled();
    expect(updateNeq).toHaveBeenCalledWith('status', 'PAID');
    expect(transitioned).toHaveBeenCalled();

    paymentRow.status = 'PAID';
    paymentRow.paid_at = new Date().toISOString();
    const second = await app.request('/api/webhooks/pagbank', { method: 'POST', headers: { 'content-type': 'application/json', 'x-authenticity-token': 'valid' }, body: payload }, env);
    expect(second.status).toBe(200);
    expect((await second.json() as any).isDuplicate).toBe(true);
  });
});
