import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  caseRow: { id: '00000000-0000-0000-0000-000000000001', user_id: 'user-1', is_paid: false, service_type: 'defesa_previa' } as any,
  coupon: {
    code: 'E2E100-TEST', is_active: true,
    valid_from: '2026-01-01T00:00:00.000Z', valid_until: '2030-01-01T00:00:00.000Z',
    applicable_services: ['all'], min_order_value: 0, total_limit: 5, used_count: 0, user_limit: 1,
  } as any,
  rpc: vi.fn(),
}));

vi.mock('../supabase', () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => table === 'cases'
            ? { data: state.caseRow, error: null }
            : { data: state.coupon, error: null },
        }),
      }),
    }),
    rpc: state.rpc,
  })),
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
    offer: {
      serviceType: input.serviceType, name: 'Defesa Prévia',
      baseAmount: 100, promotionDiscount: 0, firstDocumentsDiscount: 0,
      couponDiscount: input.couponCode === 'E2E100-TEST' ? 100 : 50,
      finalAmount: input.couponCode === 'E2E100-TEST' ? 0 : 50,
    },
  })),
}));

import { Hono } from 'hono';
import { paymentsRoutes } from './payments';
import type { Env } from '../supabase';

function app() {
  const instance = new Hono<{ Bindings: Env }>();
  instance.route('/api', paymentsRoutes);
  return instance;
}

describe('free coupon redemption', () => {
  beforeEach(() => {
    state.caseRow = { id: '00000000-0000-0000-0000-000000000001', user_id: 'user-1', is_paid: false, service_type: 'defesa_previa' };
    state.coupon = {
      code: 'E2E100-TEST', is_active: true,
      valid_from: '2026-01-01T00:00:00.000Z', valid_until: '2030-01-01T00:00:00.000Z',
      applicable_services: ['all'], min_order_value: 0, total_limit: 5, used_count: 0, user_limit: 1,
    };
    state.rpc.mockReset().mockResolvedValue({
      data: { success: true, entitlement: 'FREE_COUPON', amount: 0 },
      error: null,
    });
  });

  it('records an atomic free entitlement for a valid 100% coupon', async () => {
    const response = await app().request('/api/payments/coupon/redeem-free', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId: '00000000-0000-0000-0000-000000000001',
        serviceType: 'defesa_previa',
        couponCode: 'E2E100-TEST',
      }),
    }, {} as any);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true, entitlement: 'FREE_COUPON', amount: 0 });
    expect(state.rpc).toHaveBeenCalledWith('redeem_free_coupon', expect.objectContaining({
      p_user_id: 'user-1', p_coupon_code: 'E2E100-TEST', p_pre_coupon_amount: 100, p_coupon_discount: 100,
    }));
  });

  it('rejects a coupon that does not reduce the total to zero', async () => {
    const response = await app().request('/api/payments/coupon/redeem-free', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId: '00000000-0000-0000-0000-000000000001',
        serviceType: 'defesa_previa',
        couponCode: 'PARTIAL',
      }),
    }, {} as any);

    expect(response.status).toBe(422);
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it('rejects a case owned by another user before redeeming', async () => {
    state.caseRow = { ...state.caseRow, user_id: 'someone-else' };
    const response = await app().request('/api/payments/coupon/redeem-free', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId: '00000000-0000-0000-0000-000000000001',
        serviceType: 'defesa_previa',
        couponCode: 'E2E100-TEST',
      }),
    }, {} as any);

    expect(response.status).toBe(403);
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it('rejects a disabled coupon', async () => {
    state.coupon = { ...state.coupon, is_active: false };
    const response = await app().request('/api/payments/coupon/redeem-free', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId: '00000000-0000-0000-0000-000000000001',
        serviceType: 'defesa_previa',
        couponCode: 'E2E100-TEST',
      }),
    }, {} as any);

    expect(response.status).toBe(422);
    expect(state.rpc).not.toHaveBeenCalled();
  });
});
