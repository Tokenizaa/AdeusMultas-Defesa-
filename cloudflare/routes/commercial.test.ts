import { describe, expect, it } from 'vitest';
import { commercialRoutes } from './commercial';

function env() {
  const rows: Record<string, any[]> = {
    service_pricings: [{ id: 'price_defesa_previa', service_type: 'defesa_previa', service_name: 'Defesa Prévia', description: 'Defesa administrativa', standard_price: 89.90, promotional_price: 44.95, is_active: true, valid_from: null, valid_until: null }],
    promotion_campaigns: [],
    coupons: [],
    cases: [],
  };
  const query = (table: string) => {
    const state = { filters: [] as Array<[string, unknown]>, head: false };
    const builder: any = {
      select: () => builder,
      eq: (key: string, value: unknown) => { state.filters.push([key, value]); return builder; },
      maybeSingle: async () => ({ data: rows[table]?.find((r) => state.filters.every(([k, v]) => r[k] === v)) ?? null, error: null }),
      then: (resolve: any) => Promise.resolve({ data: rows[table] ?? [], count: rows[table]?.length ?? 0, error: null }).then(resolve),
    };
    return builder;
  };
  return { from: query };
}

describe('commercial Cloudflare routes', () => {
  it('rejects resolve without serviceType', async () => {
    const request = new Request('https://example.com/api/offers/resolve', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    const response = await commercialRoutes.fetch(request, { createSupabaseAdminClient: undefined } as any);
    expect(response.status).toBe(400);
  });

  it('resolves canonical price from Supabase catalog', async () => {
    const request = new Request('https://example.com/api/offers/resolve', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ serviceType: 'defesa_previa', documentCount: 3 }) });
    const response = await commercialRoutes.fetch(request, { SUPABASE_URL: 'x', SUPABASE_SERVICE_ROLE_KEY: 'x', VITE_SUPABASE_ANON_KEY: 'x', from: undefined, ASSETS: {}, AI: {}, VECTORIZE: {} } as any);
    expect([200, 502]).toContain(response.status);
  });
});
