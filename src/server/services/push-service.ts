/**
 * Push Notification Service — Firebase Cloud Messaging (FCM)
 *
 * FCM is COMPLETELY FREE: no per-notification cost, unlimited sends
 * Supports: Web (via service worker), Android, iOS
 *
 * Setup:
 * 1. Create Firebase project at https://console.firebase.google.com
 * 2. Generate Service Account key (Settings → Service Accounts → Generate new private key)
 * 3. For web: add Web Push certificate (Settings → Cloud Messaging → Web Push certificates)
 * 4. Create public/firebase-messaging-sw.js service worker
 */

import { logger } from '../observability/logger';
import { notificationService } from './notification-service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string; // Deep link URL
  tag?: string; // Deduplication tag
  ttl?: number; // Time-to-live in seconds (default 86400 = 24h)
}

export interface SendPushParams {
  token: string; // FCM device token
  notification: PushNotificationPayload;
  data?: Record<string, string>;
}

export interface SendBulkPushParams {
  tokens: string[];
  notification: PushNotificationPayload;
  data?: Record<string, string>;
}

export interface PushResult {
  success: boolean;
  messageId?: string;
  successCount?: number;
  failureCount?: number;
  errors?: string[];
}

// ---------------------------------------------------------------------------
// Firebase Admin SDK wrapper
// ---------------------------------------------------------------------------

let firebaseAdmin: any = null;

async function getFirebaseAdmin(): Promise<any> {
  if (firebaseAdmin) return firebaseAdmin;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !privateKey || !clientEmail) {
    throw new Error(
      'Firebase not configured. Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL.'
    );
  }

  try {
    // Dynamic import to avoid hard dependency at build time
    const adminModule = await import('firebase-admin');
    // firebase-admin exports at top level: initializeApp, getApps, cert, etc.
    const admin = adminModule as any;

    if (!admin.getApps?.()?.length) {
      admin.initializeApp({
        credential: admin.cert({
          projectId,
          privateKey,
          clientEmail,
        }),
      });
    }

    firebaseAdmin = admin;
    return firebaseAdmin;
  } catch (err) {
    throw new Error(
      `Firebase Admin SDK not installed. Run: npm install firebase-admin\nError: ${err}`
    );
  }
}

// ---------------------------------------------------------------------------
// Push Service
// ---------------------------------------------------------------------------

class PushNotificationService {
  private vapidKey: string;

  constructor() {
    this.vapidKey = process.env.FIREBASE_VAPID_KEY || '';
  }

  private get isConfigured(): boolean {
    return Boolean(
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_PRIVATE_KEY &&
      process.env.FIREBASE_CLIENT_EMAIL
    );
  }

  /**
   * Send push notification to a single device
   */
  async sendToDevice(params: SendPushParams): Promise<PushResult> {
    if (!this.isConfigured) {
      logger.warn('push', 'push-service', 'send_to_device', 'Firebase not configured — skipping push', {
        token: params.token.substring(0, 20) + '...',
      });
      return { success: false, errors: ['Firebase not configured'] };
    }

    try {
      const admin = await getFirebaseAdmin();
      const messaging = admin.messaging();

      const message: Record<string, any> = {
        token: params.token,
        notification: {
          title: params.notification.title,
          body: params.notification.body,
          ...(params.notification.image && { image: params.notification.image }),
        },
        data: {
          ...(params.data || {}),
          ...(params.notification.url && { url: params.notification.url }),
        },
        webpush: {
          headers: {
            TTL: String(params.notification.ttl || 86400),
          },
          notification: {
            title: params.notification.title,
            body: params.notification.body,
            icon: params.notification.icon || '/icons/icon-192.png',
            badge: params.notification.badge || '/icons/badge-72.png',
            ...(params.notification.image && { image: params.notification.image }),
            ...(params.notification.tag && { tag: params.notification.tag }),
            ...(params.notification.url && {
              actions: [{ action: 'open', title: 'Abrir' }],
            }),
          },
        },
      };

      const result = await messaging.send(message);

      logger.info('push', 'push-service', 'send_to_device', 'Push notification sent', {
        messageId: result,
        tokenPrefix: params.token.substring(0, 20),
      });

      return { success: true, messageId: result };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error('push', 'push-service', 'send_to_device', 'Push notification failed', {
        error: errMsg,
        tokenPrefix: params.token.substring(0, 20),
      });
      return { success: false, errors: [errMsg] };
    }
  }

  /**
   * Send push notification to multiple devices (batch)
   */
  async sendToMultiple(params: SendBulkPushParams): Promise<PushResult> {
    if (!this.isConfigured) {
      return { success: false, errors: ['Firebase not configured'] };
    }

    try {
      const admin = await getFirebaseAdmin();
      const messaging = admin.messaging();

      const message: Record<string, any> = {
        tokens: params.tokens,
        notification: {
          title: params.notification.title,
          body: params.notification.body,
          ...(params.notification.image && { image: params.notification.image }),
        },
        data: {
          ...(params.data || {}),
          ...(params.notification.url && { url: params.notification.url }),
        },
        webpush: {
          headers: {
            TTL: String(params.notification.ttl || 86400),
          },
          notification: {
            title: params.notification.title,
            body: params.notification.body,
            icon: params.notification.icon || '/icons/icon-192.png',
            badge: params.notification.badge || '/icons/badge-72.png',
            ...(params.notification.tag && { tag: params.notification.tag }),
          },
        },
      };

      const response = await messaging.sendEachForMulticast(message);

      logger.info('push', 'push-service', 'send_bulk', 'Bulk push notifications sent', {
        successCount: response.successCount,
        failureCount: response.failureCount,
        total: params.tokens.length,
      });

      return {
        success: response.failureCount === 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors: response.responses
          .filter((r: any) => !r.success)
          .map((r: any) => r.error?.message || 'Unknown error'),
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error('push', 'push-service', 'send_bulk', 'Bulk push failed', { error: errMsg });
      return { success: false, errors: [errMsg] };
    }
  }

  /**
   * Send defense ready notification
   */
  async sendDefenseReady(
    token: string,
    caseId: string,
    userName: string
  ): Promise<PushResult> {
    return this.sendToDevice({
      token,
      notification: {
        title: '🛡️ Sua defesa está pronta!',
        body: `Olá ${userName}! A minuta jurídica do caso #${caseId} foi gerada. Clique para visualizar.`,
        url: `/cases/${caseId}`,
        tag: `defense-${caseId}`,
        icon: '/icons/icon-192.png',
      },
      data: { caseId, type: 'defense_ready' },
    });
  }

  /**
   * Send payment confirmation notification
   */
  async sendPaymentConfirmed(
    token: string,
    caseId: string,
    amount: number
  ): Promise<PushResult> {
    return this.sendToDevice({
      token,
      notification: {
        title: '✅ Pagamento confirmado',
        body: `Seu pagamento de R$ ${amount.toFixed(2)} foi confirmado. Caso #${caseId} em processamento.`,
        url: `/cases/${caseId}`,
        tag: `payment-${caseId}`,
      },
      data: { caseId, type: 'payment_confirmed', amount: String(amount) },
    });
  }

  /**
   * Send case status update notification
   */
  async sendStatusUpdate(
    token: string,
    caseId: string,
    newStatus: string,
    description?: string
  ): Promise<PushResult> {
    const statusLabels: Record<string, string> = {
      analise: 'em análise',
      defesa_pronta: 'defesa pronta',
      enviado: 'enviado ao DETRAN',
      deferido: 'deferido ✅',
      indeferido: 'indeferido',
      recurso: 'em recurso',
    };

    return this.sendToDevice({
      token,
      notification: {
        title: '📋 Atualização do caso',
        body: description || `Caso #${caseId} agora está ${statusLabels[newStatus] || newStatus}.`,
        url: `/cases/${caseId}`,
        tag: `status-${caseId}`,
      },
      data: { caseId, type: 'status_update', status: newStatus },
    });
  }

  /**
   * Send push notification by user email (resolves device token automatically)
   */
  async sendPushToUser(
    userEmail: string,
    notification: { title: string; body: string; url?: string; tag?: string; image?: string; data?: Record<string, any> },
  ): Promise<PushResult> {
    if (!userEmail) {
      return { success: false, errors: ['Email do destinatário é obrigatório para envio de push.'] };
    }

    const subscriptions = notificationService.getSubscriptions(userEmail);
    const token = subscriptions[0]?.fcmToken || subscriptions[0]?.endpoint;

    if (!token) {
      logger.warn('push', 'push-service', 'send_push_to_user', 'Nenhum device token encontrado para o email', { userEmail });
      return { success: false, errors: ['Nenhum dispositivo registrado para push notifications (user sem subscription).'] };
    }

    return this.sendToDevice({
      token,
      notification: {
        title: notification.title,
        body: notification.body,
        url: notification.url,
        tag: notification.tag,
        icon: '/icons/icon-192.png',
        ...(notification.image ? { image: notification.image } : {}),
      },
      data: notification.data || {},
    });
  }

  /**
   * Get VAPID public key for frontend subscription
   */
  getVapidPublicKey(): string | null {
    return this.vapidKey || null;
  }
}

export const pushService = new PushNotificationService();
