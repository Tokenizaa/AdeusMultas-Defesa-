import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { aiRoutes } from './ai';

vi.mock('../supabase', () => {
  return {
    createSupabaseAnonClient: vi.fn(() => ({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@example.com' } }, error: null })
      }
    })),
    createSupabaseAdminClient: vi.fn(() => ({
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: 'user-1', name: 'Test', email: 'test@example.com', role: 'user' }, error: null })
    }))
  };
});

describe('Cloudflare AI routes', () => {
  function app() {
    const app = new Hono<any>();
    app.use('/api/ai/*', async (c, next) => {
      c.set('user', { id: 'user-1', role: 'user' });
      await next();
    });
    app.route('/api', aiRoutes);
    return app;
  }

  it('rejects analysis without case data', async () => {
    const response = await app().request('/api/ai/analyze-infraction', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer test' },
      body: JSON.stringify({}),
    }, {
      AI: { run: vi.fn() },
      VECTORIZE: { query: vi.fn(), upsert: vi.fn() },
    } as any);

    expect(response.status).toBe(400);
    expect((await response.json() as any).ok).toBe(false);
  });

  it('uses Cloudflare AI and Vectorize for analysis', async () => {
    const run = vi.fn()
      .mockResolvedValueOnce({ data: [[0.1, 0.2, 0.3]] })
      .mockResolvedValueOnce({ response: '{"summary":"ok","formalFlaws":[],"recommendedArguments":[],"recommendedProcedure":"defesa_previa","confidence":"medium","limitations":[]}' });
    const query = vi.fn().mockResolvedValue({ matches: [] });

    const response = await app().request('/api/ai/analyze-infraction', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer test' },
      body: JSON.stringify({ case: { infraction: { aitNumber: '123' } } }),
    }, {
      AI: { run },
      VECTORIZE: { query, upsert: vi.fn() },
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body.ok).toBe(true);
    expect(body.data.provider).toBe('cloudflare-workers-ai');
    expect(query).toHaveBeenCalledOnce();
    expect(run).toHaveBeenCalledTimes(2);
  });
});
