/**
 * Meta Graph API Router (Facebook & Instagram)
 * Unified endpoint layer implementing OAuth, Publishing, Insights, Webhooks, and Testing.
 */

import { Router } from 'express';
import { metaAdapter } from '../../integrations/meta/adapters/meta-adapter';
import { metaAuthService } from '../../integrations/meta/auth/meta-auth-service';
import { metaWebhookService } from '../../integrations/meta/webhooks/meta-webhook-service';
import { runMetaIntegrationTests } from '../../integrations/meta/tests/meta-integration-suite';
import { eventBus, EventTopics } from '../../core/events/topics';
import { logger } from '../observability/logger';
import { authenticateToken, requireAdmin } from '../middleware/auth-middleware';

const router = Router();

// ==========================================
// 1. Connection Status & Safe DTO
// ==========================================
router.get(['/integrations/meta/status', '/marketing/meta/status', '/meta/status', '/meta-status'], authenticateToken, (req, res) => {
  const status = metaAdapter.getSafeStatus();
  res.json(status);
});

// ==========================================
// 2. OAuth Authentication Flow
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
// 3. Publishing Engine
// ==========================================
router.post(['/integrations/meta/publish', '/meta/publish'], requireAdmin, async (req, res) => {
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
// 4. Insights & Analytics
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
// 5. Webhook Ingestion & Subscriptions
// ==========================================
router.get(['/integrations/meta/webhooks', '/meta/webhooks', '/webhooks/meta'], (req, res) => {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  const result = metaWebhookService.verifyChallenge(mode, token, challenge);
  if (result) {
    return res.status(200).send(result);
  }
  return res.status(403).send('Forbidden: Webhook challenge failed');
});

router.post(['/integrations/meta/webhooks', '/meta/webhooks', '/webhooks/meta'], async (req, res) => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    const rawPayload = JSON.stringify(req.body);

    const result = await metaWebhookService.handleWebhookPayload(rawPayload, signature, req.body);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

router.get(['/integrations/meta/webhooks/history', '/meta/webhooks/history'], (req, res) => {
  const history = metaWebhookService.getRecentWebhooks();
  res.json({ history });
});

// ==========================================
// 6. Automated Diagnostic & Test Runner
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
