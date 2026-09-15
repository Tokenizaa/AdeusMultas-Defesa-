import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const mockFrom = vi.fn();
const mockPublish = vi.fn();

vi.mock('../supabase', () => ({
  createSupabaseAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock('../middleware', () => ({
  authenticateToken: async (c: any, next: any) => { c.set('user', { id: 'admin-1', role: 'admin' }); await next(); },
  requireAdmin: async (_c: any, next: any) => next(),
}));

vi.mock('../publishers', () => ({
  createMetaPublisher: vi.fn(() => ({ publish: mockPublish })),
}));

import { marketingRoutes } from './marketing';

function app() {
  const app = new Hono();
  app.route('/api', marketingRoutes);
  return app;
}

function query(data: any = null, error: any = null, count: number | null = null) {
  const q: any = {};
  for (const method of ['select', 'eq', 'order', 'limit', 'insert', 'update']) q[method] = vi.fn(() => q);
  q.maybeSingle = vi.fn(async () => ({ data, error }));
  q.single = vi.fn(async () => ({ data, error }));
  q.then = (resolve: any) => Promise.resolve({ data, error, count }).then(resolve);
  return q;
}

describe('marketing Cloudflare contract', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockPublish.mockReset();
  });

  it('lists editorial content from Supabase', async () => {
    mockFrom.mockReturnValue(query([{ id: 'c1', title: 'Post', channel: 'instagram' }]));
    const response = await app().request('/api/marketing/contents');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contents: [{ id: 'c1', title: 'Post', channel: 'instagram' }] });
  });

  it('creates scheduled content in Supabase', async () => {
    const created = { id: 'c2', title: 'Campanha', channel: 'facebook', status: 'agendado' };
    mockFrom.mockReturnValue(query(created));
    const response = await app().request('/api/marketing/contents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Campanha', channel: 'facebook', scheduledAt: '2026-09-20T12:00:00Z' }),
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ content: created });
  });

  it('publishes through the Meta adapter and persists the external id', async () => {
    const content = {
      id: 'c3', title: 'Post Meta', channel: 'facebook', caption: 'Texto', copy_text: 'Texto',
      hashtags: ['#adeusmulta'], media_type: 'image', image_url: 'https://example.com/image.jpg',
    };
    mockFrom
      .mockReturnValueOnce(query(content))
      .mockReturnValueOnce(query(null));
    mockPublish.mockResolvedValueOnce({ ok: true, externalId: 'meta-123' });

    const response = await app().request('/api/marketing/publish/c3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, {
      META_ACCESS_TOKEN: 'test-token',
      META_PAGE_ID: 'page-1',
      IG_USER_ID: 'ig-1',
    } as any);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, externalId: 'meta-123' });
    expect(mockPublish).toHaveBeenCalledOnce();
  });

  it('reports Cloudflare + Meta as the current marketing engine', async () => {
    mockFrom
      .mockReturnValueOnce(query(null, null, 3))
      .mockReturnValueOnce(query(null, null, 1))
      .mockReturnValueOnce(query(null, null, 2));
    const response = await app().request('/api/marketing/status');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ total: 3, agendados: 1, publicados: 2, engine: 'cloudflare-meta' });
    expect(JSON.stringify(body)).not.toContain('nvidia');
  });
});
