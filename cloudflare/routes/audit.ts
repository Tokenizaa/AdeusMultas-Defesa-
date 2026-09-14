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
  const { data, error } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(limit);
  if (error) return c.json({ logs: [], error: error.message }, 500);
  return c.json(data || []);
});

auditRoutes.get('/audit/logs', async (c) => {
  const limit = Math.min(Number(c.req.query('limit') || 50), 500);
  const supabase = createSupabaseAdminClient(c.env);
  const { data, error } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(limit);
  if (error) return c.json({ logs: [], error: error.message }, 500);
  return c.json({ logs: data || [] });
});

export async function recordAuditLog(
  env: Env,
  entry: {
    actor: string;
    actorRole?: string | null;
    action: string;
    targetResource: string;
    targetId?: string | null;
    details?: Record<string, unknown>;
    correlationId?: string | null;
    gdprCompliant?: boolean;
  },
): Promise<void> {
  const supabase = createSupabaseAdminClient(env);
  const { error } = await supabase.from('audit_logs').insert({
    actor: entry.actor,
    actor_role: entry.actorRole ?? null,
    action: entry.action,
    target_resource: entry.targetResource,
    target_id: entry.targetId ?? null,
    details: entry.details ?? {},
    correlation_id: entry.correlationId ?? null,
    gdpr_compliant: entry.gdprCompliant ?? true,
    timestamp: new Date().toISOString(),
  });
  if (error) console.error('[audit] failed to persist audit log', error.message);
}

export default auditRoutes;
