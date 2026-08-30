import { Router } from 'express';
import { eventBus, EventTopics } from '../../core/events/topics';
import { whatsappService } from '../services/whatsapp-service';
import { messagingService } from '../services/messaging-service';
import { authenticateToken, requireAdmin } from '../middleware/auth-middleware';
import { authorizeEvolutionWebhook } from '../shared/webhook/evolution-webhook-auth';

const router = Router();

/**
 * POST /api/communication/whatsapp/send
 * Send a WhatsApp message via Evolution API
 */
router.post('/communication/whatsapp/send', authenticateToken, async (req, res) => {
  try {
    const { phone, message, caseId, notificationType } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: ' phone e message são obrigatórios' });
    }

    // Format phone: remove spaces, dashes, parentheses
    const formattedPhone = phone.replace(/\D/g, '');

    const result = await whatsappService.sendText({
      to: formattedPhone,
      message,
    });

    if (result.success) {
      eventBus.publish(EventTopics.WHATSAPP_MESSAGE_SENT, {
        phone: formattedPhone,
        caseId,
        notificationType,
        delivered: true,
        messageId: result.messageId,
      }, 'whatsapp_service');

      return res.json({
        success: true,
        messageId: result.messageId,
        status: 'delivered',
        destination: formattedPhone,
        timestamp: new Date().toISOString(),
      });
    }

    // -------------------------------------------------------------------------
    // Integração não configurada de verdade (EVOLUTION_API_URL/API_KEY ausentes
    // ou placeholder). NUNCA fabricamos entrega real neste caminho.
    // -------------------------------------------------------------------------
    const evolutionConfigured = whatsappService['isConfigured'];

    if (!evolutionConfigured) {
      // SIMULAÇÃO DEV EXPLÍCITA (apenas fora de produção): permite testar o
      // fluxo/eventBus sem Evolution. A resposta é marcada como simulated e o
      // evento NÃO declara delivered:true — nenhum falso-verde é propagado.
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          '[WhatsApp] ⚠️ SIMULAÇÃO DEV: Evolution API NÃO configurada. ' +
          `Nenhuma mensagem real foi enviada para ${formattedPhone}. ` +
          'Configure EVOLUTION_API_URL/EVOLUTION_API_KEY para envio real.'
        );

        eventBus.publish(EventTopics.WHATSAPP_MESSAGE_SENT, {
          phone: formattedPhone,
          caseId,
          notificationType,
          delivered: false,
          simulated: true,
        }, 'whatsapp_service_dev_simulation');

        return res.json({
          success: true,
          simulated: true,
          messageId: `sim_${Date.now()}`,
          status: 'simulated',
          destination: formattedPhone,
          timestamp: new Date().toISOString(),
        });
      }

      // Produção sem integração configurada: erro claro, nunca "delivered".
      return res.status(503).json({
        error: 'Serviço WhatsApp não configurado',
        message: 'Evolution API não está configurada (EVOLUTION_API_URL/EVOLUTION_API_KEY ausentes ou placeholder). Configure a integração antes de enviar mensagens.',
        hint: 'Configure as variáveis EVOLUTION_API_URL e EVOLUTION_API_KEY (sem prefixo PLACEHOLDER).',
      });
    }

    // Configurado, mas a Evolution API falhou de verdade ao enviar.
    res.status(502).json({
      error: 'Falha no envio via WhatsApp',
      message: result.error || 'Serviço indisponível',
    });
  } catch (error: any) {
    console.error('[WhatsApp] Send error:', error);
    res.status(500).json({ error: error.message || 'Erro ao enviar mensagem WhatsApp' });
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
      return res.status(400).json({ error: ' phone e pdfUrl são obrigatórios' });
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

    res.status(502).json({
      error: 'Falha no envio do documento',
      message: result.error,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao enviar documento' });
  }
});

/**
 * GET /api/communication/whatsapp/status
 * Check WhatsApp instance connection status
 */
router.get('/communication/whatsapp/status', authenticateToken, async (req, res) => {
  try {
    const status = await whatsappService.getInstanceStatus();

    res.json({
      connected: status?.status === 'open',
      status: status?.status || 'unknown',
      phone: status?.phone,
      instance: status?.instanceName,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/communication/whatsapp/qrcode
 * Get QR code for connecting WhatsApp instance (admin only)
 */
router.get('/communication/whatsapp/qrcode', requireAdmin, async (req, res) => {
  try {
    const qrCode = await whatsappService.getQrCode();

    if (qrCode) {
      return res.json({ success: true, qrcode: qrCode });
    }

    res.status(404).json({ error: 'QR code não disponível — instância pode já estar conectada' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/webhooks/whatsapp & aliases
 * Webhook endpoint for Evolution API incoming messages — Publicly accessible (no auth middleware)
 */
const handleWebhook = async (req: any, res: any) => {
  try {
    // Validacao de origem (aditiva/retrocompativel): so rejeita com 401 quando
    // EVOLUTION_WEBHOOK_SECRET estiver setado e o custom header X-Webhook-Secret
    // nao corresponder. Sem a env var, o comportamento atual e preservado (dev).
    // 401 e NON-RETRYABLE na Evolution API — nao ha loop de retries.
    const auth = authorizeEvolutionWebhook(req.headers);
    if (!auth.ok) {
      logger?.warn?.('whatsapp', 'webhook', 'auth_rejected', 'Webhook Evolution rejeitado: origem nao autorizada', {
        reason: auth.reason,
        host: req.headers?.host,
      });
      return res.status(401).json({ error: 'Unauthorized webhook request', received: false });
    }

    const payload = req.body;

    // Responde 200 OK imediatamente para evitar retries da Evolution API
    res.status(200).json({ received: true, success: true, timestamp: new Date().toISOString() });

    if (!payload || (!payload.event && !payload.type && !payload.data)) {
      return;
    }

    const parsed = whatsappService.parseWebhook(payload);

    logger?.info?.('whatsapp', 'webhook', 'incoming', 'WhatsApp message received via Evolution API', {
      from: parsed.from,
      type: parsed.type,
      instance: parsed.instance,
    });

    // Processa pelo Channel Adapter unificado (normalização, contato, conversa, lead CRM e IA)
    await messagingService.handleEvolutionWebhook(payload);

    // Emite evento para downstream
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
    console.error('[WhatsApp Webhook] Erro ao processar webhook:', error);
    // Não retornar 500 para o webhook da Evolution API para evitar retries infinitos
  }
};

// Aliases para cobrir todas as convenções de URL possíveis na Evolution API
router.post('/webhooks/whatsapp', handleWebhook);
router.post('/whatsapp/webhook', handleWebhook);
router.post('/webhook', handleWebhook);
router.post('/webhook/whatsapp', handleWebhook);

// Verificação GET (Health check / Probes de webhook)
router.get('/webhooks/whatsapp', (req, res) => {
  res.json({
    status: 'active',
    endpoint: '/api/webhooks/whatsapp',
    description: 'DefesAi Evolution API Webhook Receiver',
    timestamp: new Date().toISOString(),
  });
});

router.get('/whatsapp/webhook', (req, res) => {
  res.json({
    status: 'active',
    endpoint: '/api/webhooks/whatsapp',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/communication/whatsapp/webhook-config
 * Retorna o status de configuração do Webhook na Evolution API
 */
router.get('/communication/whatsapp/webhook-config', authenticateToken, async (req, res) => {
  try {
    const config = await whatsappService.getWebhookConfig();
    res.json({
      success: true,
      currentConfig: config,
      recommendedUrl: `${process.env.APP_URL || ''}/api/webhooks/whatsapp`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Lazy import logger to avoid circular dependency
let logger: any;
import('../observability/logger').then(m => { logger = m; }).catch(() => {});

export default router;