/**
 * Meta Graph API Router (Facebook & Instagram)
 * Unified endpoint layer implementing OAuth, Publishing, Insights, Webhooks, and Testing.
 */

import { Router } from 'express';
import { metaAdapter } from '../../integrations/meta/adapters/meta-adapter';
import { metaAuthService } from '../../integrations/meta/auth/meta-auth-service';
import { metaWebhookService } from '../../integrations/meta/webhooks/meta-webhook-service';
import { runMetaIntegrationTests } from '../../integrations/meta/tests/meta-integration-suite';
import { validateMetaAppConnection } from '../integrations/meta';
import { messagingService } from '../services/messaging-service';
import { eventBus, EventTopics } from '../../core/events/topics';
import { logger } from '../observability/logger';
import { requireAdmin } from '../middleware/auth-middleware';

const router = Router();

// ==========================================
// 1. Connection Status & Safe DTO
// ==========================================
router.get(
  [
    '/integrations/meta/status',
    '/marketing/meta/status',
    '/meta/status',
    '/meta-status',
  ],
  (req, res) => {
    const safeStatus = metaAdapter.getSafeStatus();
    const isTokenValid = safeStatus.status === 'connected' && safeStatus.health.tokenValid;
    const verifyTokenConfigured = Boolean(process.env.META_WEBHOOK_VERIFY_TOKEN);
    const appIdConfigured = Boolean(process.env.META_APP_ID || process.env.FACEBOOK_APP_ID);
    const secretConfigured = Boolean(process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET);

    const enrichedStatus = {
      ...safeStatus,
      // Status explícito do Token
      tokenStatus: {
        isValid: isTokenValid,
        status: isTokenValid ? 'VALID' : safeStatus.status === 'disconnected' ? 'DISCONNECTED' : 'EXPIRED_OR_INVALID',
        label: isTokenValid ? 'Token Válido (60 dias)' : 'Token Inválido ou Ausente',
        expiresAt: safeStatus.tokenExpiresAt,
        daysRemaining: safeStatus.health.tokenDaysRemaining ?? (isTokenValid ? 60 : 0),
        lastValidatedAt: safeStatus.lastValidatedAt,
      },
      // Status dos Webhooks
      webhooks: {
        active: true,
        endpoint: '/api/meta/webhook',
        verifyTokenConfigured,
        verifyTokenHeader: 'hub.verify_token',
        secretSignatureValidation: secretConfigured,
        supportedEvents: ['leadgen', 'feed', 'status', 'messages', 'instagram_mentions'],
        recentEventsCount: metaWebhookService.getRecentWebhooks().length,
        recentEvents: metaWebhookService.getRecentWebhooks().slice(0, 5),
      },
      // Permissões Concedidas (Scopes)
      permissions: {
        granted: safeStatus.scopes && safeStatus.scopes.length > 0
          ? safeStatus.scopes
          : [
              'pages_show_list',
              'pages_read_engagement',
              'pages_manage_posts',
              'instagram_basic',
              'instagram_content_publish',
              'instagram_manage_insights',
            ],
        canPublishFacebook: safeStatus.health.hasPublishPermissions,
        canPublishInstagram: safeStatus.health.hasInstagramLinked,
      },
      // Configurações do App Meta
      app: {
        appIdConfigured,
        secretConfigured,
        graphApiVersion: process.env.META_GRAPH_API_VERSION || 'v20.0',
        liveMode: safeStatus.isLiveMode,
      },
    };

    res.json(enrichedStatus);
  }
);

// ==========================================
// 2. App Diagnostics & /debug_token Validation
// ==========================================
router.all(
  [
    '/integrations/meta/debug-app',
    '/meta/debug-app',
    '/integrations/meta/debug-token',
    '/meta/debug-token',
  ],
  async (req, res) => {
    try {
      const customToken = (req.body?.token || req.query?.token) as string | undefined;
      const result = await validateMetaAppConnection(customToken);
      res.json(result);
    } catch (err: any) {
      logger.error('meta', 'routes', 'debug_app_error', err.message);
      res.status(500).json({
        success: false,
        isValid: false,
        message: `Erro interno ao executar debug_token: ${err.message}`,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// ==========================================
// 3. OAuth Authentication Flow
// ==========================================
router.get(['/integrations/meta/auth-url', '/meta/auth-url'], (req, res) => {
  const redirectUri =
    (req.query.redirectUri as string) ||
    `${req.protocol}://${req.get('host')}/api/integrations/meta/callback`;
  const url = metaAuthService.generateOAuthUrl(redirectUri, req.query.state as string);
  res.json({ authUrl: url });
});

router.get(['/integrations/meta/callback', '/meta/callback'], async (req, res) => {
  const code = req.query.code as string;
  const error = req.query.error_description || req.query.error;

  if (error) {
    logger.warn('meta', 'routes', 'oauth_denied', `OAuth negado pelo usuário: ${error}`);
    return res.redirect('/admin/marketing?meta_error=' + encodeURIComponent(String(error)));
  }

  if (!code) {
    return res.redirect('/admin/marketing?meta_error=missing_code');
  }

  try {
    const redirectUri = `${req.protocol}://${req.get('host')}/api/integrations/meta/callback`;
    await metaAdapter.handleOAuthCallback(code, redirectUri);
    return res.redirect('/admin/marketing?meta_connected=true');
  } catch (err: any) {
    logger.error('meta', 'routes', 'oauth_callback_error', err.message);
    return res.redirect('/admin/marketing?meta_error=' + encodeURIComponent(err.message));
  }
});

router.post(['/integrations/meta/callback', '/meta/callback'], async (req, res) => {
  try {
    const { code, redirectUri } = req.body;
    const finalRedirectUri =
      redirectUri || `${req.protocol}://${req.get('host')}/api/integrations/meta/callback`;
    const connection = await metaAdapter.handleOAuthCallback(code, finalRedirectUri);
    res.json({ success: true, connection });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post(['/integrations/meta/connect', '/meta/connect'], requireAdmin, async (req, res) => {
  try {
    const { accessToken, pageId, instagramAccountId } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: 'Token de acesso da Meta é obrigatório' });
    }
    const connection = await metaAdapter.connectWithToken(accessToken, pageId, instagramAccountId);
    res.json({ success: true, connection });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post(['/integrations/meta/select-targets', '/meta/select-targets'], (req, res) => {
  try {
    const { pageId, instagramAccountId } = req.body;
    const updated = metaAdapter.selectActiveTargets(pageId, instagramAccountId);
    res.json({ success: true, connection: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post(['/integrations/meta/disconnect', '/meta/disconnect'], requireAdmin, async (req, res) => {
  try {
    await metaAdapter.disconnect();
    res.json({ success: true, message: 'Conta Meta desconectada e permissões revogadas' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. Publishing Engine
// ==========================================
// Publicacao Meta simplificada (sem requireAdmin): token/configuracao residem no backend/.env
router.post(['/integrations/meta/publish', '/meta/publish'], async (req, res) => {
  try {
    const { destination, message, mediaUrl, linkUrl, pageId, instagramAccountId, contentId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Mensagem/Legenda é obrigatória para publicação.' });
    }

    const publishResult = await metaAdapter.publishContent({
      destination: destination || 'both',
      message,
      mediaUrl,
      linkUrl,
      pageId,
      instagramAccountId,
      contentId,
    });

    if (publishResult.success) {
      eventBus.publish(
        EventTopics.MARKETING_CONTENT_PUBLISHED,
        {
          channel: destination,
          publishedAt: publishResult.publishedAt,
          facebookPostId: publishResult.facebookPostId,
          instagramMediaId: publishResult.instagramMediaId,
          contentId,
        },
        'meta_integration_router'
      );
    }

    res.json(publishResult);
  } catch (error: any) {
    logger.error('meta', 'routes', 'publish_failed', `Erro ao publicar: ${error.message}`);
    res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao publicar no Facebook/Instagram' });
  }
});

// ==========================================
// 5. Insights & Analytics
// ==========================================
router.post(['/integrations/meta/insights', '/meta/insights'], async (req, res) => {
  try {
    const { targetId, targetType } = req.body;
    if (!targetId) {
      return res.status(400).json({ error: 'targetId é obrigatório para consulta de insights.' });
    }
    const metrics = await metaAdapter.getInsights({
      targetId,
      targetType: targetType || 'post',
    });
    res.json(metrics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. Webhook Ingestion & Subscriptions
// ==========================================
const webhookRoutePaths = [
  '/integrations/meta/webhooks',
  '/meta/webhooks',
  '/webhooks/meta',
  '/integrations/meta/webhook',
  '/meta/webhook',
  '/webhooks/facebook',
];

router.get(webhookRoutePaths, (req, res) => {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  const result = metaWebhookService.verifyChallenge(mode, token, challenge);
  if (result) {
    logger.info('meta', 'webhook', 'challenge_verified', 'Desafio hub.challenge do Webhook Meta respondido com sucesso', {
      mode,
      hubVerifyTokenConfigured: Boolean(process.env.META_WEBHOOK_VERIFY_TOKEN),
    });
    return res.status(200).type('text/plain').send(result);
  }

  logger.warn('meta', 'webhook', 'challenge_rejected', 'Falha na verificação do Webhook Meta: token inválido ou modo incorreto', {
    mode,
    receivedTokenPresent: Boolean(token),
  });
  return res.status(403).send('Forbidden: Webhook challenge failed');
});

router.post(webhookRoutePaths, async (req, res) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const rawPayload = JSON.stringify(req.body);
  const payload = req.body || {};

  try {
    // 1. Log estruturado por tipo de notificação
    const objectType = payload.object || 'page';
    const entries = Array.isArray(payload.entry) ? payload.entry : [];

    logger.info('meta', 'webhook', 'payload_received', `Notificação de Webhook Meta recebida [${objectType}]`, {
      object: objectType,
      entryCount: entries.length,
      hasSignature: Boolean(signature),
      timestamp: new Date().toISOString(),
    });

    // 2. Análise e log detalhado para cada entrada recebida
    for (const entry of entries) {
      const entryId = entry.id;

      // Eventos de mudanças de campo (feed, status, leadgen, etc.)
      if (Array.isArray(entry.changes)) {
        for (const change of entry.changes) {
          const field = change.field;
          const value = change.value || {};

          if (field === 'leadgen' || field === 'lead') {
            logger.info('meta', 'webhook', 'leadgen_received', 'Novo LEAD recebido via Meta Lead Ads', {
              pageId: entryId,
              leadgenId: value.leadgen_id,
              formId: value.form_id,
              createdTime: value.created_time,
            });
          } else if (field === 'status' || field === 'feed' || field === 'posts') {
            logger.info('meta', 'webhook', 'status_feed_received', `Atualização de status/feed na página Meta [${entryId}]`, {
              pageId: entryId,
              item: value.item,
              verb: value.verb,
              postId: value.post_id,
            });
          } else {
            logger.info('meta', 'webhook', 'field_change', `Evento de campo [${field}] na página ${entryId}`, {
              pageId: entryId,
              field,
            });
          }
        }
      }

      // Eventos de Mensagens diretas (Messenger / Instagram Direct)
      if (Array.isArray(entry.messaging)) {
        for (const msg of entry.messaging) {
          logger.info('meta', 'webhook', 'messaging_event', 'Evento de mensageria recebido da Meta', {
            senderId: msg.sender?.id,
            recipientId: msg.recipient?.id,
            timestamp: msg.timestamp,
            hasMessageText: Boolean(msg.message?.text),
          });
        }
      }
    }

    // 3. Processamento no serviço de webhook com verificação de assinatura
    const result = await metaWebhookService.handleWebhookPayload(rawPayload, signature, payload);

    // 4. Ingestão no Gateway de Mensageria Unificada (Messenger, Instagram Direct e Lead Ads)
    await messagingService.handleMetaMessagingWebhook(payload);

    res.status(200).json({
      success: true,
      processed: true,
      eventId: result.eventId,
      entriesCount: entries.length,
    });
  } catch (err: any) {
    logger.error('meta', 'webhook', 'processing_error', `Erro ao processar payload do webhook Meta: ${err.message}`, {
      error: err.message,
    });
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

router.get(
  [
    '/integrations/meta/webhooks/history',
    '/meta/webhooks/history',
    '/meta/webhook/history',
  ],
  (req, res) => {
    const history = metaWebhookService.getRecentWebhooks();
    res.json({
      success: true,
      count: history.length,
      history,
    });
  }
);

// ==========================================
// 7. Automated Diagnostic & Test Runner
// ==========================================
router.get(['/integrations/meta/tests', '/marketing/meta/tests', '/meta/tests'], async (req, res) => {
  try {
    const report = await runMetaIntegrationTests();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

