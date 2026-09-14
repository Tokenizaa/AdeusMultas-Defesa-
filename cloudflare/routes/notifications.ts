import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../supabase';
import { authenticateToken, type AuthenticatedUser } from '../middleware';

// Registro de subscriptions e histórico em memória (volátil no worker).
// ponytail: FCM push real (Workers API) e persistência em Supabase na Fase 3.
const subscriptions = new Map<string, { endpoint: string; userEmail?: string; createdAt: string }>();
const notificationHistory = new Map<string, any[]>();

export const notificationsRoutes = new Hono<{ Bindings: Env; Variables: { user?: AuthenticatedUser } }>();

// POST /api/notifications/subscribe
notificationsRoutes.post('/notifications/subscribe', async (c) => {
  const { endpoint, keys, userId, userEmail, userAgent, fcmToken } = await c.req.json<any>().catch(() => ({}));
  if (!endpoint && !fcmToken) {
    throw new HTTPException(400, { message: 'Endpoint ou fcmToken é obrigatório' });
  }
  const ep = endpoint || `fcm:${fcmToken}`;
  subscriptions.set(ep, {
    endpoint: ep,
    userEmail,
    createdAt: new Date().toISOString(),
  });
  return c.json({ success: true, subscriptionId: `sub_${Date.now()}` });
});

// POST /api/notifications/unsubscribe
notificationsRoutes.post('/notifications/unsubscribe', async (c) => {
  const { endpoint } = await c.req.json<any>().catch(() => ({}));
  if (!endpoint) throw new HTTPException(400, { message: 'Endpoint é obrigatório' });
  subscriptions.delete(endpoint);
  return c.json({ success: true });
});

// GET /api/notifications/history (auth)
notificationsRoutes.get('/notifications/history', authenticateToken, async (c) => {
  const user = c.get('user');
  if (!user?.email) throw new HTTPException(400, { message: 'Email do usuário é obrigatório' });
  const notifications = notificationHistory.get(user.email) || [];
  return c.json({ notifications, total: notifications.length });
});

// POST /api/notifications/mark-read
notificationsRoutes.post('/notifications/mark-read', async (c) => {
  const { email } = await c.req.json<any>().catch(() => ({}));
  if (email) {
    const list = notificationHistory.get(email) || [];
    notificationHistory.set(email, list.map((n) => ({ ...n, read: true })));
  }
  return c.json({ success: true });
});

// POST /api/notifications/send-test — push real exige FCM (Fase 3)
notificationsRoutes.post('/notifications/send-test', async (c) => {
  throw new HTTPException(501, { message: 'Envio real de push (FCM) ainda não disponível no worker. (Fase 3)' });
});

// GET /api/notifications/vapid-key
notificationsRoutes.get('/notifications/vapid-key', (c) => {
  const key = (c.env as any).VAPID_PUBLIC_KEY;
  if (!key) throw new HTTPException(501, { message: 'VAPID key não configurada. (Fase 3)' });
  return c.json({ key });
});

export default notificationsRoutes;