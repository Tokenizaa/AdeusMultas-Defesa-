import { Hono } from 'hono';
import type { Env } from '../supabase';
import { authenticateToken, requireAdmin, type AuthenticatedUser } from '../middleware';
import { createSupabaseAdminClient } from '../supabase';

export const auditRoutes = new Hono<{ Bindings: Env; Variables: { user?: AuthenticatedUser } }>();

auditRoutes.use('/audit-logs', authenticateToken, requireAdmin);
auditRoutes.use('/audit/logs', authenticateToken, requireAdmin);

auditRoutes.get('/audit-logs', async (c) => {
  const limit = Math.min(Number(c.req.query('limit') || 200), 500);
  const supabase = createSupabaseAdminClient(c.env);
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return c.json({ logs: [], error: error.message }, 500);
  return c.json(data || []);
});

auditRoutes.get('/audit/logs', async (c) => {
  const limit = Math.min(Number(c.req.query('limit') || 50), 500);
  const supabase = createSupabaseAdminClient(c.env);
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return c.json({ logs: [], error: error.message }, 500);
  return c.json({ logs: data || [] });
});

export async function recordAuditLog(
  env: Env,
  entry: {
    userId?: string | null;
    action: string;
    resource?: string | null;
    resourceId?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const supabase = createSupabaseAdminClient(env);
  const { error } = await supabase.from('audit_logs').insert({
    user_id: entry.userId ?? null,
    action: entry.action,
    resource: entry.resource ?? null,
    resource_id: entry.resourceId ?? null,
    metadata: entry.metadata ?? {},
    created_at: new Date().toISOString(),
  });
  if (error) console.error('[audit] failed to persist audit log', error.message);
}

export default auditRoutes;
