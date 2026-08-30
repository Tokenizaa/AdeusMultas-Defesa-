import { Router } from 'express';
import { eventBus, EventTopics } from '../../core/events/topics';
import { whatsappService } from '../services/whatsapp-service';
import { messagingService } from '../services/messaging-service';
import { authenticateToken, requireAdmin } from '../middleware/auth-middleware';
import { authorizeEvolutionWebhook, verifyEvolutionSignature, resolveWebhookSecret } from '../shared/webhook/evolution-webhook-auth';
import { logger } from '../observability/logger';

const router = Router();

/**
 * POST /api/communication/whatsapp/send
 * Send a WhatsApp message via Evolution API
 */
router.post('/communication/whatsapp/send', authenticateToken, async (req, res) => {
  try {
    const { phone, message, caseId, notificationType } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: 'phone e message são obrigatórios' });
    }

    // Format phone: remove spaces, dashes, parentheses
    const formattedPhone = phone.replace(/\D/g, '');

    const result = await whatsappService.sendText({
      to: formattedPhone,
      message,
    });

    if (result.success) {
      eventBus.publish(
        EventTopics.WHATSAPP_MESSAGE_SENT,
        {
          phone: formattedPhone,
          caseId,
          notificationType,
          delivered: true,
          messageId: result.messageId,
        },
        'whatsapp_service'
      );

      return res.json({
        success: true,
        messageId: result.messageId,
        status: 'delivered',
        destination: formattedPhone,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(502).json({
      error: 'Falha no envio via WhatsApp',
      message: result.error || 'Serviço indisponível',
    });
  } catch (error: any) {
    logger.error('whatsapp', 'whatsapp-route', 'send_error', 'Erro ao enviar mensagem WhatsApp', {
      error: error.message,
    });
    return res.status(500).json({ error: error.message || 'Erro ao enviar mensagem WhatsApp' });
  }
});

/**
 * POST /api/communication/whatsapp/send-document
 * Send a defense document (PDF) via WhatsApp
 */
router.post('/communication/whatsapp/send-document', authenticateToken, async (req, res) => {
  try {
    const { phone, pdfUrl, caseId, message } = req.body;

    if (!phone || !pdfUrl) {
      return res.status(400).json({ error: 'phone e pdfUrl são obrigatórios' });
    }

    const formattedPhone = phone.replace(/\D/g, '');

    const result = await whatsappService.sendDefenseDocument(
      formattedPhone,
      pdfUrl,
      caseId || 'unknown',
      message
    );

    if (result.success) {
      return res.json({
        success: true,
        messageId: result.messageId,
        destination: formattedPhone,
      });
    }

    return res.status(502).json({
      error: 'Falha no envio do documento',
      message: result.error,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao enviar documento' });
  }
});

/**
 * GET /api/communication/whatsapp/status
 * Check WhatsApp instance connection status
 */
router.get('/communication/whatsapp/status', authenticateToken, async (_req, res) => {
  try {
    const status = await whatsappService.getInstanceStatus();

    return res.json({
      connected: status?.status === 'open',
      status: status?.status || 'disconnected',
      phone: status?.phone || null,
      instance: status?.instanceName || process.env.EVOLUTION_INSTANCE_NAME || 'defesai',
      instanceId: status?.instanceId || null,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/communication/whatsapp/qrcode
 * Get QR code for connecting WhatsApp instance (admin only)
 */
router.get('/communication/whatsapp/qrcode', requireAdmin, async (_req, res) => {
  try {
    const qrCode = await whatsappService.getQrCode();

    if (qrCode) {
      return res.json({ success: true, qrcode: qrCode });
    }

    return res.status(404).json({ error: 'QR code não disponível — instância pode já estar conectada' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/webhooks/whatsapp
 * Manipulador canônico e único de webhook para mensagens da Evolution API
 */
const handleWebhook = async (req: any, res: any) => {
  try {
    // 1. Validação de autenticidade / origem (X-Webhook-Secret).
    // `sha256=<hmac>` é deferido pelo gate 1 para o gate 1b (HMAC) decidir —
    // comparar hex vs segredo puro jamais casaria e mataria o HMAC antes de rodar.
    const authDecision = authorizeEvolutionWebhook(req.headers);
    if (authDecision.ok === false) {
      const reason = authDecision.reason;
      logger.warn(
        'whatsapp',
        'whatsapp_webhook',
        'auth_rejected',
        'Rejeitando webhook Evolution API por falha de autenticação',
        { reason }
      );
      return res.status(401).json({
        error: 'Unauthorized webhook source',
        reason,
      });
    }

    // 1b. Verificação HMAC-SHA-256 (anti-spoofing criptográfico).
    // Headers no formato `sha256=<hmac>` são assinaturas do body bruto: com o
    // segredo definido, a assinatura é OBRIGATÓRIA — verifica ou rejeita (rawBody
    // ausente = impossível verificar = rejeita, 401). Remetentes legados (header =
    // segredo puro, gate 1 acima) continuam válidos — mudança aditiva.
    const webhookSecret = resolveWebhookSecret();
    const sigHeaderRaw = req.headers['x-webhook-secret'];
    const sigHeader = Array.isArray(sigHeaderRaw) ? sigHeaderRaw[0] : sigHeaderRaw;
    if (webhookSecret && sigHeader?.startsWith('sha256=')) {
      const rawBody = (req as any).rawBody;
      if (!rawBody || !verifyEvolutionSignature(rawBody, sigHeader, webhookSecret)) {
        logger.warn(
          'whatsapp',
          'whatsapp_webhook',
          'hmac_rejected',
          'Rejeitando webhook Evolution API por assinatura HMAC inválida',
          {}
        );
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // 2. Responde 200 OK imediatamente para evitar retries da Evolution API
    res.status(200).json({ received: true, success: true, timestamp: new Date().toISOString() });

    const payload = req.body;
    if (!payload || (!payload.event && !payload.type && !payload.data)) {
      return;
    }

    const parsed = whatsappService.parseWebhook(payload);

    logger.info('whatsapp', 'whatsapp_webhook', 'incoming', 'WhatsApp message received via Evolution API', {
      from: parsed.from,
      type: parsed.type,
      instance: parsed.instance,
    });

    // 3. Processamento canônico unificado via messagingService
    await messagingService.handleEvolutionWebhook(payload);

    // 4. Publicação downstream no barramento de eventos
    eventBus.publish(
      EventTopics.WHATSAPP_WEBHOOK_RECEIVED || ('whatsapp.webhook_received' as any),
      {
        from: parsed.from,
        text: parsed.text,
        type: parsed.type,
        instance: parsed.instance,
        messageId: parsed.messageId,
        rawPayload: payload,
      },
      'whatsapp_webhook'
    );
  } catch (error: any) {
    logger.error('whatsapp', 'whatsapp_webhook', 'process_error', 'Erro ao processar webhook da Evolution API', {
      error: error.message,
    });
  }
};

// Rota Canônica Única de Webhook
router.post('/webhooks/whatsapp', handleWebhook);

// Verificação GET (Health check / Probes de webhook)
router.get('/webhooks/whatsapp', (_req, res) => {
  res.json({
    status: 'active',
    endpoint: '/api/webhooks/whatsapp',
    description: 'DefesAi Evolution API Webhook Receiver',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/communication/whatsapp/webhook-config
 * Retorna o status de configuração do Webhook na Evolution API
 */
router.get('/communication/whatsapp/webhook-config', authenticateToken, async (_req, res) => {
  try {
    const config = await whatsappService.getWebhookConfig();
    return res.json({
      success: true,
      currentConfig: config,
      recommendedUrl: `${process.env.APP_URL || ''}/api/webhooks/whatsapp`,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/communication/whatsapp/webhook-config
 * Registra a URL do Webhook na Evolution API apontando para /api/webhooks/whatsapp
 */
router.post('/communication/whatsapp/webhook-config', requireAdmin, async (req, res) => {
  try {
    const { webhookUrl, instanceName } = req.body;
    const result = await whatsappService.configureWebhook(webhookUrl, instanceName);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;