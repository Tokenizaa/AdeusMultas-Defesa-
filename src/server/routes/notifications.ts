import { Router } from 'express';
import { notificationService } from '../services/notification-service';
import { pushService } from '../services/push-service';
import { authenticateToken, requireAdmin } from '../middleware/auth-middleware';

const router = Router();

// POST /api/notifications/subscribe - Register device for Push
router.post('/subscribe', (req, res) => {
  try {
    const { endpoint, keys, userId, userEmail, userAgent, fcmToken } = req.body;
    if (!endpoint && !fcmToken) {
      return res.status(400).json({ error: 'Endpoint ou fcmToken é obrigatório' });
    }

    const result = notificationService.registerSubscription({
      endpoint: endpoint || `fcm:${fcmToken}`,
      keys,
      userId,
      userEmail,
      fcmToken,
      userAgent: userAgent || req.headers['user-agent'],
      createdAt: new Date().toISOString(),
    });

    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao registrar push subscription' });
  }
});

// POST /api/notifications/unsubscribe - Unregister device
router.post('/unsubscribe', (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint é obrigatório' });
    }
    notificationService.removeSubscription(endpoint);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/notifications/history - Get notifications for active user
router.get('/history', authenticateToken, (req, res) => {
  try {
    const userEmail = (req.query.email as string) || (req.query.userEmail as string);
    const user = req.user;

    // Only allow users to see their own notifications (or admin can see any)
    if (user && user.role !== 'admin' && userEmail && userEmail !== user.email) {
      return res.status(403).json({ error: 'Você não tem permissão para acessar notificações de outro usuário' });
    }

    // If no email provided, use the authenticated user's email
    const effectiveEmail = userEmail || user?.email;
    if (!effectiveEmail) {
      return res.status(400).json({ error: 'Email do usuário é obrigatório' });
    }

    const notifications = notificationService.getHistory(effectiveEmail);
    res.json({ notifications, total: notifications.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notifications/mark-read - Mark all as read
router.post('/mark-read', (req, res) => {
  try {
    const userEmail = req.body.email || req.body.userEmail;
    notificationService.markAllAsRead(userEmail);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notifications/notify-status-change - Trigger status change push
router.post('/notify-status-change', async (req, res) => {
  try {
    const { caseId, newStatus, oldStatus, autoInfracao, userId, userEmail, fcmToken } = req.body;

    if (!caseId || !newStatus) {
      return res.status(400).json({ error: 'caseId e newStatus são obrigatórios' });
    }

    // Store notification in history
    const notification = notificationService.broadcastCaseStatusChange({
      caseId,
      newStatus,
      oldStatus,
      autoInfracao,
      userId,
      userEmail,
    });

    // Send real push notification via FCM if token provided
    let pushResult = null;
    if (fcmToken) {
      pushResult = await pushService.sendStatusUpdate(fcmToken, caseId, newStatus);
    }

    res.json({
      success: true,
      notification,
      pushSent: pushResult?.success || false,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notifications/send-push - Send real push notification via FCM
router.post('/send-push', async (req, res) => {
  try {
    const { fcmToken, title, body, url, tag } = req.body;

    if (!fcmToken || !title || !body) {
      return res.status(400).json({ error: 'fcmToken, title e body são obrigatórios' });
    }

    const result = await pushService.sendToDevice({
      token: fcmToken,
      notification: {
        title,
        body,
        url,
        tag,
      },
    });

    res.json({
      success: result.success,
      messageId: result.messageId,
      error: result.errors?.[0],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notifications/send-test - Send test push
router.post('/send-test', async (req, res) => {
  try {
    const { title, body, userEmail, fcmToken } = req.body;

    // Store in notification history
    const notification = notificationService.broadcastCaseStatusChange({
      caseId: 'case_demo_745',
      newStatus: 'defesa_pronta',
      autoInfracao: 'DET2026SP984712',
      userEmail,
    });

    // Send real push if FCM token provided
    let pushResult = null;
    if (fcmToken) {
      pushResult = await pushService.sendToDevice({
        token: fcmToken,
        notification: {
          title: title || '🧪 Teste DefesAi',
          body: body || 'Esta é uma notificação de teste do DefesAi.',
          tag: 'test-notification',
        },
      });
    }

    res.json({
      success: true,
      message: 'Notificação de teste processada.',
      notification: {
        ...notification,
        title: title || notification.title,
        body: body || notification.body,
      },
      pushSent: pushResult?.success || false,
      pushMessageId: pushResult?.messageId,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/notifications/vapid-key - Get VAPID public key for frontend
router.get('/vapid-key', (req, res) => {
  const vapidKey = pushService.getVapidPublicKey();
  res.json({ vapidKey });
});

// ============================================================================
// Notification Simulators (dev only — production requires FCM/SMTP/EvolutionAPI)
// ============================================================================

// POST /api/notifications/push — Push Notification Simulation
router.post('/push', authenticateToken, (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(501).json({
      error: 'Serviço de push notification não configurado',
      message: 'Configure FCM/VAPID para push notifications.',
    });
  }
  const { title, body, caseId } = req.body;
  res.json({
    success: true,
    deliveredAt: new Date().toISOString(),
    channel: 'WebPush / ServiceWorker',
    payload: { title, body, caseId },
  });
});

// POST /api/notifications/email — Email Digest Simulation
router.post('/email', authenticateToken, (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(501).json({
      error: 'Serviço de email não configurado',
      message: 'Configure SMTP/Resend para envio de emails.',
    });
  }
  const { email, caseId, template } = req.body;
  res.json({
    success: true,
    recipient: email || 'fariasnetto01@gmail.com',
    template: template || 'DEFESA_GERADA_COM_SUCESSO',
    status: 'SENT (250 OK)',
    sentAt: new Date().toISOString(),
  });
});

// POST /api/notifications/whatsapp/simulate — WhatsApp Notification Simulator
router.post('/whatsapp/simulate', requireAdmin, (req, res) => {
  const { phone, eventType, caseId } = req.body;
  let messageText = '';

  if (eventType === 'triagem_concluida') {
    messageText = `🚗 *Adeus Multa Informa*: Seu diagnóstico pericial está pronto! Identificamos 94% de probabilidade de deferimento por falha de aferição do radar (Res. 798 CONTRAN). Acesse seu painel para visualizar o parecer.`;
  } else if (eventType === 'pagamento_confirmado') {
    messageText = `✅ *Pagamento Confirmado!* Sua minuta jurídica oficial para o caso ${caseId || 'DET2026'} já foi gerada e está liberada para download e assinatura.`;
  } else if (eventType === 'alerta_prazo') {
    messageText = `⚠️ *Alerta de Prazo*: Faltam poucos dias para o término do prazo de defesa prévia da sua notificação. Protocole hoje mesmo para garantir efeito suspensivo.`;
  } else {
    messageText = `📋 *Status do Recurso*: Seu protocolo junto ao órgão autuador foi atualizado. Acesse seu painel no Adeus Multa para acompanhar.`;
  }

  res.json({
    success: true,
    phone: phone || '(11) 98765-4321',
    eventType,
    caseId,
    status: 'ENTREGUE (200 OK)',
    timestamp: new Date().toISOString(),
    messagePayload: messageText,
  });
});

export default router;
