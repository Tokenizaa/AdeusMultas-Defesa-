import { Router } from 'express';
import { eventBus, EventTopics } from '../../core/events/topics';
import { whatsappService } from '../services/whatsapp-service';
import { authenticateToken, requireAdmin } from '../middleware/auth-middleware';

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

    // Fallback: if Evolution API not configured, return demo response in dev
    if (!whatsappService['isConfigured'] && process.env.NODE_ENV !== 'production') {
      eventBus.publish(EventTopics.WHATSAPP_MESSAGE_SENT, {
        phone: formattedPhone,
        caseId,
        notificationType,
        delivered: true,
      }, 'evolution_api');

      return res.json({
        success: true,
        messageId: `wamid_${Date.now()}`,
        status: 'delivered',
        destination: formattedPhone,
        timestamp: new Date().toISOString(),
      });
    }

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
 * POST /api/webhooks/whatsapp
 * Webhook endpoint for Evolution API incoming messages
 */
router.post('/webhooks/whatsapp', async (req, res) => {
  try {
    const payload = req.body;

    // Acknowledge receipt immediately
    res.json({ received: true });

    if (!payload?.event || !payload?.data) {
      return;
    }

    const parsed = whatsappService.parseWebhook(payload);

    logger?.info?.('whatsapp', 'webhook', 'incoming', 'WhatsApp message received', {
      from: parsed.from,
      type: parsed.type,
      instance: parsed.instance,
    });

    // Emit event for downstream processing (chatbot, notifications, etc.)
    eventBus.publish('whatsapp.message.received' as any, {
      from: parsed.from,
      text: parsed.text,
      type: parsed.type,
      instance: parsed.instance,
      messageId: parsed.messageId,
    }, 'whatsapp_webhook');

  } catch (error: any) {
    console.error('[WhatsApp Webhook] Error:', error);
    // Don't return error to Evolution API — it will retry
  }
});

// Lazy import logger to avoid circular dependency
let logger: any;
import('../observability/logger').then(m => { logger = m; }).catch(() => {});

export default router;