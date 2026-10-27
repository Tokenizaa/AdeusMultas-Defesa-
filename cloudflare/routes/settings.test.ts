import { describe, expect, it, vi } from 'vitest';

const mockQuery = (result: any = { data: [], error: null, count: 0 }) => {
  const q: any = {};
  for (const method of ['select', 'eq', 'order', 'limit', 'insert', 'update', 'delete', 'upsert']) {
    q[method] = vi.fn(() => q);
  }
  q.single = vi.fn(async () => result);
  q.maybeSingle = vi.fn(async () => result);
  q.then = (resolve: any) => Promise.resolve(result).then(resolve);
  return q;
};

const supabase = { from: vi.fn() };
const auditWriter = vi.fn().mockResolvedValue(undefined);

vi.mock('../supabase', () => ({ createSupabaseAdminClient: () => supabase }));
vi.mock('../middleware', () => ({
  authenticateToken: async (c: any, next: any) => {
    c.set('user', { id: '00000000-0000-0000-0000-000000000001', email: 'admin@example.com', role: 'admin' });
    await next();
  },
  requireAdmin: async (_c: any, next: any) => next(),
}));
vi.mock('./audit', () => ({ recordAuditLog: (...args: any[]) => auditWriter(...args) }));

import { settingsRoutes } from './settings';

const env: any = {
  SUPABASE_URL: 'https://project.example.supabase.co',
  SUPABASE_SECRET_KEY: 'server-secret-must-not-be-returned',
  VITE_SUPABASE_ANON_KEY: 'public-anon-key',
  AI: { run: vi.fn().mockResolvedValue({ response: 'OK' }) },
  VECTORIZE: { query: vi.fn(), upsert: vi.fn() },
  VENO_PRIMARY_GATEWAY: 'venopag',
  VENO_CLIENT_ID: 'client-id',
  VENO_CLIENT_SECRET: 'client-secret',
  VENO_WEBHOOK_SECRET: 'webhook-secret',
  PAYMENT_MODE: 'production',
  APP_URL: 'https://adeusmulta.defesai.com.br',
};

describe('Cloudflare runtime settings contract', () => {
  it('returns actual runtime bindings as read-only and masks secret values', async () => {
    const q = mockQuery({ data: [], error: null });
    supabase.from.mockReturnValue(q);

    const response = await settingsRoutes.request('/settings', { method: 'GET' }, env);
    const body = await response.json() as any;

    expect(response.status).toBe(200);
    expect(body.readOnly).toBe(true);
    expect(body.environment).toBe('cloudflare');
    expect(body.settings.some((setting: any) => setting.key === 'AI_RUNTIME' && setting.currentValue === 'Cloudflare Workers AI')).toBe(true);
    const secret = body.settings.find((setting: any) => setting.key === 'SUPABASE_SECRET_KEY');
    expect(secret.currentValue).toBe('••••••••••••••••');
    expect(secret.isConfigured).toBe(true);
    expect(secret.isEditable).toBe(false);
    expect(JSON.stringify(body)).not.toContain('server-secret-must-not-be-returned');
  });

  it('does not claim a database write changed Cloudflare runtime bindings', async () => {
    const response = await settingsRoutes.request('/settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: 'NVIDIA_API_KEY', value: 'fake-value', updatedBy: 'spoofed@example.com' }),
    }, env);
    const body = await response.json() as any;

    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('RUNTIME_BINDINGS_READ_ONLY');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('does not pretend a runtime binding can be reset from app_settings', async () => {
    const response = await settingsRoutes.request('/settings/reset-default', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: 'AI_MODEL' }),
    }, env);
    expect(response.status).toBe(409);
    expect((await response.json() as any).error.code).toBe('RUNTIME_BINDINGS_READ_ONLY');
  });

  it('executes a real minimal Cloudflare AI inference for the integration test', async () => {
    const response = await settingsRoutes.request('/settings/test-integration', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ serviceId: 'cloudflare-ai' }),
    }, env);
    const body = await response.json() as any;

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.serviceName).toBe('Cloudflare Workers AI');
    expect(env.AI.run).toHaveBeenCalledWith('@cf/openai/gpt-oss-20b', expect.objectContaining({ messages: expect.any(Array) }));
    expect(auditWriter).toHaveBeenCalledWith(env, expect.objectContaining({
      actor: 'admin@example.com',
      action: 'settings.integration_tested',
      targetResource: 'runtime-settings',
    }));
  });

  it('checks Supabase without reading user records', async () => {
    const q = mockQuery({ data: null, error: null });
    supabase.from.mockReturnValue(q);
    const response = await settingsRoutes.request('/settings/test-integration', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ serviceId: 'supabase' }),
    }, env);
    const body = await response.json() as any;

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('cases');
    expect(q.select).toHaveBeenCalledWith('id', { head: true });
    expect(q.limit).toHaveBeenCalledWith(0);
  });

  it('reports VenoPag credential presence without creating a transaction', async () => {
    const response = await settingsRoutes.request('/settings/test-integration', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ serviceId: 'venopag' }),
    }, env);
    const body = await response.json() as any;

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toContain('nenhuma transação foi criada');
  });
});
