import { describe, expect, it, vi } from 'vitest';

const mockQuery = (result: any = { data: [], error: null, count: 0 }) => {
  const q: any = {};
  for (const method of ['select', 'eq', 'is', 'order', 'limit', 'insert', 'update', 'delete', 'upsert']) q[method] = vi.fn(() => q);
  q.then = (resolve: any) => Promise.resolve(result).then(resolve);
  q.single = vi.fn(async () => result);
  return q;
};

const supabase = { from: vi.fn() };
vi.mock('../supabase', () => ({ createSupabaseAdminClient: () => supabase }));
vi.mock('../middleware', () => ({
  authenticateToken: async (c: any, next: any) => { c.set('user', { id: '00000000-0000-0000-0000-000000000001', role: 'user' }); await next(); },
  requireAdmin: async (_c: any, next: any) => next(),
}));

import { notificationsRoutes } from './notifications';
import { auditRoutes, recordAuditLog } from './audit';

describe('Cloudflare notifications persistence', () => {
  it('writes subscription to Supabase instead of process memory', async () => {
    const q = mockQuery({ data: { id: 'sub-1' }, error: null });
    supabase.from.mockReturnValue(q);
    const res = await notificationsRoutes.request('/notifications/subscribe', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint: 'https://push.example/sub', userAgent: 'test' }),
    }, {} as any);
    expect(res.status).toBe(200);
    expect(supabase.from).toHaveBeenCalledWith('notification_subscriptions');
    expect(q.upsert).toHaveBeenCalled();
  });

  it('reads notification history from Supabase', async () => {
    const q = mockQuery({ data: [{ id: 'n1', title: 'Teste' }], error: null, count: 1 });
    supabase.from.mockReturnValue(q);
    const res = await notificationsRoutes.request('/notifications/history', { method: 'GET' }, {} as any);
    expect(res.status).toBe(200);
    expect((await res.json()).total).toBe(1);
    expect(q.eq).toHaveBeenCalledWith('user_id', '00000000-0000-0000-0000-000000000001');
  });

  it('marks unread notifications as read in Supabase', async () => {
    const q = mockQuery({ data: null, error: null });
    supabase.from.mockReturnValue(q);
    const res = await notificationsRoutes.request('/notifications/mark-read', { method: 'POST', body: '{}' }, {} as any);
    expect(res.status).toBe(200);
    expect(q.update).toHaveBeenCalledWith(expect.objectContaining({ read_at: expect.any(String) }));
    expect(q.is).toHaveBeenCalledWith('read_at', null);
  });
});

describe('Cloudflare audit persistence', () => {
  it('writes audit entries to audit_logs', async () => {
    const q = mockQuery({ data: null, error: null });
    supabase.from.mockReturnValue(q);
    await recordAuditLog({} as any, { actor: 'user-1', action: 'case.updated', targetResource: 'case', targetId: 'case-1' });
    expect(supabase.from).toHaveBeenCalledWith('audit_logs');
    expect(q.insert).toHaveBeenCalledWith(expect.objectContaining({ action: 'case.updated', target_resource: 'case', target_id: 'case-1' }));
  });

  it('serves persisted audit entries', async () => {
    const q = mockQuery({ data: [{ action: 'case.updated' }], error: null });
    supabase.from.mockReturnValue(q);
    const res = await auditRoutes.request('/audit-logs', { method: 'GET' }, {} as any);
    expect(res.status).toBe(200);
    expect((await res.json())[0].action).toBe('case.updated');
  });
});
