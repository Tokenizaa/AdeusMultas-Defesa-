import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../supabase';
import { createSupabaseAdminClient } from '../supabase';
import { authenticateToken, requireAdmin, type AuthenticatedUser } from '../middleware';

export const settingsRoutes = new Hono<{ Bindings: Env; Variables: { user?: AuthenticatedUser } }>();

settingsRoutes.get('/settings/health', (c) =>
  c.json({ status: 'ok', service: 'settings', timestamp: new Date().toISOString() })
);

// GET /api/settings ou /api/settings/settings — lê app_settings do Supabase
settingsRoutes.get('/settings', authenticateToken, requireAdmin, async (c) => {
  const category = c.req.query().category;
  const supabase = createSupabaseAdminClient(c.env);
  try {
    let q = supabase.from('app_settings').select('*');
    if (category) q = q.eq('category', category);
    const { data, error } = await q.order('key', { ascending: true });
    // tabela ausente → lista vazia (fail-safe), nunca 500
    return c.json({ settings: error ? [] : (data || []) });
  } catch (err: any) {
    if (err instanceof HTTPException) throw err;
    return c.json({ settings: [], warning: 'app_settings indisponível' });
  }
});

// PUT /api/settings ou /api/settings/settings — upsert app_settings
settingsRoutes.put('/settings', authenticateToken, requireAdmin, async (c) => {
  const { key, category, value, updatedBy } = await c.req.json<any>().catch(() => ({}));
  if (!key) throw new HTTPException(400, { message: 'key é obrigatória' });

  const supabase = createSupabaseAdminClient(c.env);
  const { data, error } = await supabase
    .from('app_settings')
    .upsert(
      {
        key,
        category: category || 'geral',
        value: typeof value === 'string' ? value : JSON.stringify(value),
        updated_by: updatedBy || 'admin',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    )
    .select()
    .single();

  if (error) throw new HTTPException(500, { message: error.message });
  return c.json({ success: true, setting: data });
});

export default settingsRoutes;