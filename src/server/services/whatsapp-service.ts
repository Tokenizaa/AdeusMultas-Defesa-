/**
 * WhatsApp Service — Evolution API Client
 *
 * Self-hosted WhatsApp Business via Docker (Evolution API)
 * Requires: docker-compose with evolution-api, postgres, redis
 * Docs: https://doc.evolution-api.com/
 *
 * Features: send text, media, documents; receive webhooks;
 * manage instances; template messages
 */

import { logger } from '../observability/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WhatsAppConfig {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
}

export interface SendMessageParams {
  to: string; // Phone number with country code: "5511999998888"
  message: string;
  instanceName?: string;
}

export interface SendMediaParams {
  to: string;
  mediaUrl: string;
  caption?: string;
  mimeType?: string;
  asDocument?: boolean;
  instanceName?: string;
}

export interface WhatsAppMessageResult {
  success: boolean;
  messageId?: string;
  key?: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  error?: string;
  instance?: string;
}

export interface WhatsAppInstance {
  instanceName: string;
  instanceId: string;
  status: 'open' | 'close' | 'connecting';
  owner?: string;
  phone?: string;
  qrcode?: string;
}

export interface WebhookPayload {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: { text?: string };
      imageMessage?: { caption?: string };
      documentMessage?: { fileName?: string };
    };
    messageType?: string;
    messageTimestamp?: number;
  };
}

// ---------------------------------------------------------------------------
// Evolution API Client
// ---------------------------------------------------------------------------

class WhatsAppService {
  private config: WhatsAppConfig;

  constructor() {
    this.config = {
      apiUrl: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
      apiKey: process.env.EVOLUTION_API_KEY || '',
      instanceName: process.env.EVOLUTION_INSTANCE_NAME || 'defesai',
    };
  }

  private get isConfigured(): boolean {
    return Boolean(
      this.config.apiUrl &&
      this.config.apiKey &&
      !this.config.apiKey.startsWith('PLACEHOLDER')
    );
  }

  private async makeRequest<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    if (!this.isConfigured) {
      throw new Error('WhatsApp service not configured. Set EVOLUTION_API_URL and EVOLUTION_API_KEY.');
    }

    const url = `${this.config.apiUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: this.config.apiKey,
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errText = await response.text();
      let errData: Record<string, unknown> = {};
      try {
        errData = JSON.parse(errText);
      } catch {}
      throw new Error(
        `Evolution API error ${response.status}: ${(errData as any).message || errText}`
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Send a text message via WhatsApp
   */
  async sendText(params: SendMessageParams): Promise<WhatsAppMessageResult> {
    const instance = params.instanceName || this.config.instanceName;

    try {
      logger.info('whatsapp', 'whatsapp-service', 'send_text', 'Sending WhatsApp message', {
        to: params.to,
        instance,
      });

      const result = await this.makeRequest<any>('POST', `/message/sendText/${instance}`, {
        number: params.to,
        text: params.message,
      });

      const messageId = result.key?.id || result.id || `wamid_${Date.now()}`;

      logger.info('whatsapp', 'whatsapp-service', 'send_text', 'WhatsApp message sent', {
        messageId,
        to: params.to,
        instance,
      });

      return {
        success: true,
        messageId,
        key: result.key,
        instance,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error('whatsapp', 'whatsapp-service', 'send_text', 'WhatsApp send failed', {
        error: errMsg,
        to: params.to,
      });
      return { success: false, error: errMsg };
    }
  }

  /**
   * Send a media message (image, document, audio)
   */
  async sendMedia(params: SendMediaParams): Promise<WhatsAppMessageResult> {
    const instance = params.instanceName || this.config.instanceName;

    try {
      logger.info('whatsapp', 'whatsapp-service', 'send_media', 'Sending WhatsApp media', {
        to: params.to,
        instance,
        mimeType: params.mimeType,
      });

      const result = await this.makeRequest<any>('POST', `/message/sendMedia/${instance}`, {
        number: params.to,
        mediatype: params.asDocument ? 'document' : 'image',
        mimetype: params.mimeType || 'application/pdf',
        media: params.mediaUrl,
        caption: params.caption || '',
      });

      const messageId = result.key?.id || result.id || `wamid_${Date.now()}`;

      return {
        success: true,
        messageId,
        key: result.key,
        instance,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error('whatsapp', 'whatsapp-service', 'send_media', 'WhatsApp media send failed', {
        error: errMsg,
        to: params.to,
      });
      return { success: false, error: errMsg };
    }
  }

  /**
   * Send a defense document (PDF) to a client
   */
  async sendDefenseDocument(
    to: string,
    pdfUrl: string,
    caseId: string,
    message?: string
  ): Promise<WhatsAppMessageResult> {
    const caption = message || `📄 Sua minuta jurídica do caso #${caseId} está pronta! Abra o documento para visualizar.`;

    return this.sendMedia({
      to,
      mediaUrl: pdfUrl,
      caption,
      mimeType: 'application/pdf',
      asDocument: true,
    });
  }

  /**
   * Get instance connection status
   */
  async getInstanceStatus(instanceName?: string): Promise<WhatsAppInstance | null> {
    const instance = instanceName || this.config.instanceName;

    try {
      const result = await this.makeRequest<any>('GET', `/instance/connectionState/${instance}`);
      const rawState = result?.state || result?.instance?.state || 'close';
      const status: 'open' | 'close' | 'connecting' =
        rawState === 'open' ? 'open' : rawState === 'connecting' ? 'connecting' : 'close';
      const rawPhone = result?.instance?.owner || result?.owner || result?.instance?.phone;
      const phone = rawPhone ? String(rawPhone).replace(/@s\.whatsapp\.net$/, '') : undefined;

      return {
        instanceName: result?.instance?.instanceName || instance,
        instanceId: result?.instance?.instanceId || instance,
        status,
        owner: result?.instance?.profileName || result?.profileName || undefined,
        phone,
      };
    } catch (err) {
      logger.warn('whatsapp', 'whatsapp-service', 'get_instance_status', 'Failed to get instance status', {
        error: String(err),
        instance,
      });
      return null;
    }
  }

  /**
   * Get QR code for connecting the instance
   */
  async getQrCode(instanceName?: string): Promise<string | null> {
    const instance = instanceName || this.config.instanceName;

    try {
      const result = await this.makeRequest<any>('GET', `/instance/connect/${instance}`);
      return result.base64 || result.qrcode || null;
    } catch (err) {
      logger.warn('whatsapp', 'whatsapp-service', 'get_qrcode', 'Failed to get QR code', {
        error: String(err),
        instance,
      });
      return null;
    }
  }

  /**
   * Configure/Register Webhook in Evolution API pointing to our app
   * Endpoint: POST /webhook/set/:instance
   */
  async configureWebhook(
    webhookUrl?: string,
    instanceName?: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    const instance = instanceName || this.config.instanceName;
    const targetUrl =
      webhookUrl ||
      process.env.EVOLUTION_WEBHOOK_URL ||
      `${process.env.APP_URL || ''}/api/webhooks/whatsapp`;

    if (!targetUrl) {
      return { success: false, error: 'URL do webhook não informada' };
    }

    try {
      logger.info('whatsapp', 'whatsapp-service', 'config_webhook', `Configurando webhook Evolution API para ${targetUrl}`, {
        instance,
        targetUrl,
      });

      const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET;

      const result = await this.makeRequest<any>('POST', `/webhook/set/${instance}`, {
        webhook: {
          enabled: true,
          url: targetUrl,
          byEvents: false,
          base64: false,
          // Envia o segredo de validacao de origem como custom header
          // (suportado pela Evolution API v2; exigido pelo receiver quando
          // EVOLUTION_WEBHOOK_SECRET estiver setado). Nunca loga o valor.
          ...(webhookSecret ? { headers: { 'X-Webhook-Secret': webhookSecret } } : {}),
          events: [
            'MESSAGES_UPSERT',
            'MESSAGES_UPDATE',
            'SEND_MESSAGE',
            'CONNECTION_UPDATE',
          ],
        },
      });

      return {
        success: true,
        url: targetUrl,
      };
    } catch (err: any) {
      logger.warn('whatsapp', 'whatsapp-service', 'config_webhook_error', `Falha ao registrar webhook Evolution API: ${err.message}`, {
        instance,
        targetUrl,
      });
      return {
        success: false,
        error: err.message,
        url: targetUrl,
      };
    }
  }

  /**
   * Get Webhook configuration for instance in Evolution API
   */
  async getWebhookConfig(instanceName?: string): Promise<any> {
    const instance = instanceName || this.config.instanceName;
    try {
      const result = await this.makeRequest<any>('GET', `/webhook/find/${instance}`);
      return result;
    } catch (err: any) {
      return {
        enabled: false,
        url: `${process.env.APP_URL || ''}/api/webhooks/whatsapp`,
        configured: this.isConfigured,
      };
    }
  }

  /**
   * Parse incoming webhook payload from Evolution API
   */
  parseWebhook(payload: WebhookPayload): {
    type: 'text' | 'image' | 'document' | 'audio' | 'unknown';
    from: string;
    text: string;
    instance: string;
    messageId: string;
  } {
    const { data, instance } = payload;
    const jid = data?.key?.remoteJid || '';
    const from = jid.replace(/@s\.whatsapp\.net$/, '').replace(/@g\.us$/, '');

    let text = '';
    let type: 'text' | 'image' | 'document' | 'audio' | 'unknown' = 'unknown';

    if (data?.message?.conversation) {
      text = data.message.conversation;
      type = 'text';
    } else if (data?.message?.extendedTextMessage?.text) {
      text = data.message.extendedTextMessage.text;
      type = 'text';
    } else if (data?.message?.imageMessage?.caption) {
      text = data.message.imageMessage.caption;
      type = 'image';
    } else if (data?.message?.documentMessage?.fileName) {
      text = data.message.documentMessage.fileName;
      type = 'document';
    }

    return {
      type,
      from,
      text,
      instance,
      messageId: data?.key?.id || `msg_${Date.now()}`,
    };
  }
}

export const whatsappService = new WhatsAppService();
export const whatsAppService = whatsappService;
