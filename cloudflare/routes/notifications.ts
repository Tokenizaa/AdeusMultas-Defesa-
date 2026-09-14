import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../supabase';
import { authenticateToken, type AuthenticatedUser } from '../middleware';
import { createSupabaseAdminClient } from '../supabase';

export const notificationsRoutes = new Hono<{ Bindings: Env; Variables: { user?: AuthenticatedUser } }>();

notificationsRoutes.post('/notifications/subscribe', authenticateToken, async (c) => {
  const user = c.get('user');
  if (!user?.id) throw new HTTPException(401, { message: 'Usuário não autenticado' });
  const body = await c.req.json<any>().catch(() => ({}));
  if (!body.endpoint && !body.fcmToken) throw new HTTPException(400, { message: 'Endpoint ou fcmToken é obrigatório' });
  const supabase = createSupabaseAdminClient(c.env);
  const payload = {
    user_id: user.id,
    endpoint: body.endpoint || null,
    fcm_token: body.fcmToken || null,
    user_agent: body.userAgent || c.req.header('user-agent') || null,
    updated_at: new Date().toISOString(),
  };
  const query = body.endpoint
    ? supabase.from('notification_subscriptions').upsert(payload, { onConflict: 'endpoint' })
    : supabase.from('notification_subscriptions').upsert(payload, { onConflict: 'user_id,fcm_token' });
  const { data, error } = await query.select('id,endpoint,fcm_token,created_at,updated_at').single();
  if (error) throw new HTTPException(400, { message: error.message });
  return c.json({ success: true, subscription: data });
});

notificationsRoutes.post('/notifications/unsubscribe', authenticateToken, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<any>().catch(() => ({}));
  if (!body.endpoint && !body.fcmToken) throw new HTTPException(400, { message: 'Endpoint ou fcmToken é obrigatório' });
  const supabase = createSupabaseAdminClient(c.env);
  let query = supabase.from('notification_subscriptions').delete().eq('user_id', user?.id);
  query = body.endpoint ? query.eq('endpoint', body.endpoint) : query.eq('fcm_token', body.fcmToken);
  const { error } = await query;
  if (error) throw new HTTPException(400, { message: error.message });
  return c.json({ success: true });
});

notificationsRoutes.get('/notifications/history', authenticateToken, async (c) => {
  const user = c.get('user');
  if (!user?.id) throw new HTTPException(401, { message: 'Usuário não autenticado' });
  const limit = Math.min(Number(c.req.query('limit') || 100), 200);
  const supabase = createSupabaseAdminClient(c.env);
  const { data, error, count } = await supabase.from('notifications').select('*', { count: 'exact' }).eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit);
  if (error) throw new HTTPException(500, { message: error.message });
  return c.json({ notifications: data || [], total: count ?? (data?.length || 0) });
});

notificationsRoutes.post('/notifications/mark-read', authenticateToken, async (c) => {
  const user = c.get('user');
  if (!user?.id) throw new HTTPException(401, { message: 'Usuário não autenticado' });
  const body = await c.req.json<any>().catch(() => ({}));
  const supabase = createSupabaseAdminClient(c.env);
  let query = supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null);
  if (body.id) query = query.eq('id', body.id);
  const { error } = await query;
  if (error) throw new HTTPException(400, { message: error.message });
  return c.json({ success: true });
});

notificationsRoutes.post('/notifications/send-test', authenticateToken, async (c) => {
  const user = c.get('user');
  if (!user?.id) throw new HTTPException(401, { message: 'Usuário não autenticado' });
  const supabase = createSupabaseAdminClient(c.env);
  const { data, error } = await supabase.from('notifications').insert({
    user_id: user.id,
    type: 'system',
    title: 'Notificação de teste',
    body: 'Notificação criada pelo Worker Cloudflare.',
    data: {},
    created_at: new Date().toISOString(),
  }).select().single();
  if (error) throw new HTTPException(400, { message: error.message });
  return c.json({ success: true, notification: data });
});

notificationsRoutes.get('/notifications/vapid-key', (c) => {
  const key = (c.env as any).VAPID_PUBLIC_KEY;
  if (!key) throw new HTTPException(501, { message: 'VAPID key não configurada' });
  return c.json({ key });
});

export default notificationsRoutes;
