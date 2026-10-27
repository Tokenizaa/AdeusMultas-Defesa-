import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const mockFrom = vi.fn();

vi.mock('../supabase', () => ({ createSupabaseAdminClient: () => ({ from: mockFrom }) }));
vi.mock('../middleware', () => ({
  authenticateToken: async (_c: any, next: any) => next(),
  requireAdmin: async (_c: any, next: any) => next(),
}));

import { auditRoutes } from './audit';

function query(data: any, error: any = null) {
  const q: any = {};
  for (const method of ['select', 'order', 'limit']) q[method] = vi.fn(() => q);
  q.then = (resolve: any) => Promise.resolve({ data, error }).then(resolve);
  return q;
}

function app() {
  const instance = new Hono();
  instance.route('/api', auditRoutes);
  return instance;
}

describe('Cloudflare audit API contract', () => {
  beforeEach(() => mockFrom.mockReset());

  it('returns persisted audit rows in the envelope consumed by the admin view', async () => {
    const rows = [{
      id: 'audit-1',
      action: 'admin.user_role.updated',
      actor: 'admin@example.com',
      actor_role: 'admin',
      target_resource: 'user_profiles',
      target_id: 'user-1',
      details: { previousRole: 'citizen', newRole: 'admin' },
      timestamp: '2026-10-26T12:00:00.000Z',
      gdpr_compliant: true,
    }];
    mockFrom.mockReturnValue(query(rows));

    const response = await app().request('/api/audit/logs?limit=200');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ logs: rows });
    expect(mockFrom).toHaveBeenCalledWith('audit_logs');
  });

  it('returns an explicit server error when audit persistence cannot be read', async () => {
    mockFrom.mockReturnValue(query(null, { message: 'database unavailable' }));

    const response = await app().request('/api/audit/logs?limit=200');
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ logs: [], error: 'database unavailable' });
  });
});
