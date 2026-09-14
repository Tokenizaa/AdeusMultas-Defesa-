import { describe, expect, it } from 'vitest';
import { commercialRoutes } from './commercial';

describe('commercial Cloudflare routes', () => {
  it('rejects resolve without serviceType', async () => {
    const request = new Request('https://example.com/api/offers/resolve', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
    });
    const response = await commercialRoutes.fetch(request, {} as any);
    expect(response.status).toBe(400);
    const body = await response.json() as any;
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('exposes a health route without requiring Vercel', async () => {
    const request = new Request('https://example.com/api/offers/health');
    const response = await commercialRoutes.fetch(request, {} as any);
    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body.ok).toBe(true);
    expect(body.data.provider).toBe('cloudflare-supabase');
  });
});
