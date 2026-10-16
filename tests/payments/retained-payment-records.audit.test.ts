import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

/**
 * Read-only regression audit for the three payment records that must be retained.
 * Opt-in only: this test never creates, updates, or deletes payment data.
 */
const enabled =
  process.env.PAYMENT_AUDIT_ALLOW_READ_ONLY === 'true' &&
  Boolean(process.env.SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

const retainedPayments = [
  {
    id: 'fba1ea21-77fa-4b8a-b76e-18035c2c84ee',
    case_id: 'cc0f746b-22e5-4247-abc5-d1228b9400c9',
    expectedPaid: true,
  },
  {
    id: 'bc59cca3-d334-4135-884e-2e37fc83c23e',
    case_id: '606820f0-3dfe-43db-a99a-94bd40b27dee',
    expectedPaid: false,
  },
  {
    id: '89035a7e-1d44-4b77-aa80-1ccba1207a2a',
    case_id: '4e60e137-b963-49de-a0b2-8f0b16bff8e4',
    expectedPaid: true,
  },
] as const;

describe.skipIf(!enabled)('read-only payment retention audit', () => {
  it('keeps all three identified PIX payment records and their case links', async () => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data, error } = await supabase
      .from('payment_orders')
      .select('id, case_id, amount, currency, payment_method, gateway, status, paid_at')
      .in('id', retainedPayments.map((payment) => payment.id));

    expect(error, 'The audit query must succeed').toBeNull();
    expect(data, 'The query must return rows').not.toBeNull();

    const rows = data ?? [];
    expect(
      rows.map((row) => row.id).sort(),
      'No identified payment record may be deleted by test cleanup',
    ).toEqual(retainedPayments.map((payment) => payment.id).sort());

    for (const expected of retainedPayments) {
      const row = rows.find((item) => item.id === expected.id);
      expect(row, `Missing payment order ${expected.id}`).toBeDefined();
      expect(row?.case_id).toBe(expected.case_id);
      expect(Number(row?.amount)).toBe(2);
      expect(row?.currency).toBe('BRL');
      expect(row?.payment_method).toBe('pix');
      expect(row?.gateway).toBe('venopag');

      if (expected.expectedPaid) {
        expect(row?.status).toBe('PAID');
        expect(row?.paid_at, `Paid order ${expected.id} must retain paid_at`).toBeTruthy();
      } else {
        expect(['PENDING', 'PAID', 'CANCELED', 'DECLINED', 'REFUNDED']).toContain(row?.status);
        if (row?.status === 'PAID') {
          expect(row.paid_at, 'A pending order may become paid, but must have paid_at').toBeTruthy();
        }
      }
    }
  });
});
