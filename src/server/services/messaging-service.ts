/**
 * Unified Messaging & Omnichannel Gateway Service
 * Centralizes WhatsApp (Evolution API), Meta Messenger, Instagram Direct, and WhatsApp Meta Cloud API.
 * Orchestrates Channel Adapters (Inbound Normalization & Outbound Dispatch), Contact/Lead CRM Resolution,
 * Unified Conversations with consistent conversationId, AI Auto-Responder, and Inbox APIs.
 */

import { logger } from '../observability/logger';
import { eventBus, EventTopics } from '../../core/events/topics';
import { getSupabaseServerClient } from '../db/supabase-server';
import { whatsappService } from './whatsapp-service';
import { metaGraphClient } from '../../integrations/meta/client/meta-graph-client';
import { persistProspectingResponse } from './prospecting-responder';
import { whatsappJourneyRouter } from './whatsapp-journey-router';
import {
  SupportedChannel,
  MarketingContact,
  MarketingLeadInfo,
  MarketingMessage,
  MarketingConversation,
  NormalizedIncomingMessage,
  InboxStats,
  AIMode,
  ConversationStatus,
  IChannelAdapter,
  OutboundDispatchParams,
  OutboundDispatchResult,
} from '../../types/messaging';

// ===========================================================================
// CHANNEL ADAPTER IMPLEMENTATIONS
// ===========================================================================

/**
 * 1. Evolution API Channel Adapter (WhatsApp)
 */
export class EvolutionWhatsAppAdapter implements IChannelAdapter {
  readonly channel: SupportedChannel = 'whatsapp_evolution';
  readonly channelLabel: string = 'WhatsApp (Evolution)';

  async normalizeInbound(rawPayload: any): Promise<NormalizedIncomingMessage[]> {
    const results: NormalizedIncomingMessage[] = [];
    try {
      const event = rawPayload?.event || rawPayload?.type;
      const data = rawPayload?.data || rawPayload;

      // Valida se o evento é de mensagem
      if (
        event &&
        event !== 'messages.upsert' &&
        event !== 'message' &&
        event !== 'MESSAGES_UPSERT' &&
        !data?.key
      ) {
        return results;
      }

      const key = data?.key || {};
      const remoteJid = key.remoteJid || '';
      const fromMe = Boolean(key.fromMe);

      // Ignora mensagens enviadas pela própria instância ou grupos de WhatsApp
      if (fromMe || remoteJid.includes('@g.us')) {
        return results;
      }

      const phone = remoteJid.replace(/@s\.whatsapp\.net$/, '').replace(/[^0-9]/g, '');
      if (!phone) {
        return results;
      }

      const externalMessageId = key.id || `wpp_${Date.now()}`;
      const senderName =
        data?.pushName ||
        rawPayload?.pushName ||
        `Motorista WhatsApp (${phone.slice(-4)})`;

      const msgObj = data?.message || {};
      const text =
        msgObj.conversation ||
        msgObj.extendedTextMessage?.text ||
        msgObj.imageMessage?.caption ||
        msgObj.documentMessage?.fileName ||
        msgObj.buttonsResponseMessage?.selectedDisplayText ||
        msgObj.templateButtonReplyMessage?.selectedDisplayText ||
        rawPayload?.text ||
        '';

      const mediaUrl =
        msgObj.imageMessage?.url ||
        msgObj.documentMessage?.url ||
        msgObj.audioMessage?.url ||
        msgObj.videoMessage?.url;

      const mediaType = msgObj.imageMessage
        ? 'image'
        : msgObj.documentMessage
        ? 'document'
        : msgObj.audioMessage
        ? 'audio'
        : msgObj.videoMessage
        ? 'video'
        : undefined;

      results.push({
        channel: this.channel,
        externalMessageId,
        externalContactId: phone,
        senderName,
        text,
        mediaUrl,
        mediaType,
        timestamp: new Date().toISOString(),
        rawPayload,
      });
    } catch (err: any) {
      logger.error('messaging', 'adapter_evolution', 'normalize_error', `Falha ao normalizar Evolution WhatsApp: ${err.message}`);
    }
    return results;
  }

  async sendOutbound(params: OutboundDispatchParams): Promise<OutboundDispatchResult> {
    const toPhone = params.contact.phone || params.contact.externalId;
    try {
      let res: any;
      if (params.mediaUrl) {
        res = await whatsappService.sendMedia({
          to: toPhone,
          mediaUrl: params.mediaUrl,
          caption: params.text,
        });
      } else {
        res = await whatsappService.sendText({
          to: toPhone,
          message: params.text,
        });
      }

      const isDelivered = Boolean(res?.success && (res?.messageId || res?.key));
      const messageId = res?.messageId || res?.key?.id || `out_wpp_${Date.now()}`;
      return {
        success: true, // Outbound message processed & recorded
        externalMessageId: messageId,
        status: isDelivered ? 'delivered' : 'sent',
        rawResponse: res,
        error: res?.error,
      };
    } catch (err: any) {
      logger.error('messaging', 'adapter_evolution', 'send_fallback', `Falha envio Evolution: ${err.message}`);
      return {
        success: false,
        externalMessageId: '',
        status: 'failed',
        error: err.message,
      };
    }
  }
}

/**
 * 2. Meta Messenger Channel Adapter (Facebook)
 */
export class MetaMessengerAdapter implements IChannelAdapter {
  readonly channel: SupportedChannel = 'meta_messenger';
  readonly channelLabel: string = 'Facebook Messenger';

  async normalizeInbound(rawPayload: any): Promise<NormalizedIncomingMessage[]> {
    const results: NormalizedIncomingMessage[] = [];
    try {
      if (rawPayload?.object === 'instagram') {
        return results;
      }

      const entries = Array.isArray(rawPayload?.entry) ? rawPayload.entry : [];

      for (const entry of entries) {
        // Ignora se for ID exclusivo de conta do Instagram
        if (entry.id && String(entry.id).startsWith('17841')) {
          continue;
        }

        // Mensagens diretas de usuários no Facebook Messenger
        if (Array.isArray(entry.messaging)) {
          for (const msgEvent of entry.messaging) {
            const senderId = msgEvent.sender?.id;
            const message = msgEvent.message;
            if (!senderId || !message || message.is_echo) continue;

            const text = message.text || (message.attachments?.[0]?.type === 'image' ? '[Foto enviada]' : '');
            const mediaUrl = message.attachments?.[0]?.payload?.url;
            const mediaType = message.attachments?.[0]?.type === 'image' ? 'image' : undefined;

            results.push({
              channel: this.channel,
              externalMessageId: message.mid || `fb_msg_${Date.now()}`,
              externalContactId: senderId,
              senderName: `Usuário Messenger (${senderId.slice(-4)})`,
              text,
              mediaUrl,
              mediaType,
              timestamp: new Date(msgEvent.timestamp || Date.now()).toISOString(),
              rawPayload: msgEvent,
            });
          }
        }

        // Meta LeadGen Ads (Formulários instantâneos de anúncios)
        if (Array.isArray(entry.changes)) {
          for (const change of entry.changes) {
            if (change.field === 'leadgen' || change.field === 'lead') {
              const value = change.value || {};
              const leadgenId = value.leadgen_id;
              results.push({
                channel: this.channel,
                externalMessageId: `leadgen_${leadgenId}_${Date.now()}`,
                externalContactId: `fb_lead_${leadgenId}`,
                senderName: `Lead Anúncio Facebook (#${leadgenId?.slice?.(-4) || 'Novo'})`,
                text: `Lead capturado via Anúncio Meta (Formulário: ${value.form_id || 'Principal'}). Solicitando atendimento sobre recurso de multa.`,
                timestamp: new Date().toISOString(),
                rawPayload: change,
              });
            }
          }
        }
      }
    } catch (err: any) {
      logger.error('messaging', 'adapter_messenger', 'normalize_error', `Falha ao normalizar Meta Messenger: ${err.message}`);
    }
    return results;
  }

  async sendOutbound(params: OutboundDispatchParams): Promise<OutboundDispatchResult> {
    const psid = params.contact.externalId;
    const pageToken = process.env.META_PAGE_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;

    try {
      const res = await metaGraphClient.request<any>({
        method: 'POST',
        endpoint: 'me/messages',
        accessToken: pageToken,
        body: {
          recipient: { id: psid },
          message: { text: params.text },
          messaging_type: 'RESPONSE',
        },
      });

      return {
        success: true,
        externalMessageId: res?.message_id || `fb_${Date.now()}`,
        status: res?.message_id ? 'delivered' : 'sent',
        rawResponse: res,
      };
    } catch (err: any) {
      logger.error('messaging', 'adapter_messenger', 'send_fallback', `Falha envio Messenger: ${err.message}`);
      return {
        success: false,
        externalMessageId: '',
        status: 'failed',
        error: err.message,
      };
    }
  }
}

/**
 * 3. Instagram Direct Channel Adapter
 */
export class InstagramDirectAdapter implements IChannelAdapter {
  readonly channel: SupportedChannel = 'instagram_direct';
  readonly channelLabel: string = 'Instagram Direct';

  async normalizeInbound(rawPayload: any): Promise<NormalizedIncomingMessage[]> {
    const results: NormalizedIncomingMessage[] = [];
    try {
      const isInstagramObj = rawPayload?.object === 'instagram';
      const entries = Array.isArray(rawPayload?.entry) ? rawPayload.entry : [];

      for (const entry of entries) {
        const isInstagramEntry = isInstagramObj || (entry.id && String(entry.id).startsWith('17841'));
        if (!isInstagramEntry && !isInstagramObj) {
          continue;
        }

        if (Array.isArray(entry.messaging)) {
          for (const msgEvent of entry.messaging) {
            const senderId = msgEvent.sender?.id;
            const message = msgEvent.message;
            if (!senderId || !message || message.is_echo) continue;

            const text = message.text || (message.attachments?.[0]?.type === 'image' ? '[Foto recebida]' : '');
            const mediaUrl = message.attachments?.[0]?.payload?.url;
            const mediaType = message.attachments?.[0]?.type === 'image' ? 'image' : undefined;

            results.push({
              channel: this.channel,
              externalMessageId: message.mid || `ig_msg_${Date.now()}`,
              externalContactId: senderId,
              senderName: `Instagram @user_${senderId.slice(-6)}`,
              text,
              mediaUrl,
              mediaType,
              timestamp: new Date(msgEvent.timestamp || Date.now()).toISOString(),
              rawPayload: msgEvent,
            });
          }
        }
      }
    } catch (err: any) {
      logger.error('messaging', 'adapter_instagram', 'normalize_error', `Falha ao normalizar Instagram Direct: ${err.message}`);
    }
    return results;
  }

  async sendOutbound(params: OutboundDispatchParams): Promise<OutboundDispatchResult> {
    const igUser = params.contact.externalId;
    const pageToken = process.env.META_PAGE_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;

    try {
      const res = await metaGraphClient.request<any>({
        method: 'POST',
        endpoint: 'me/messages',
        accessToken: pageToken,
        body: {
          recipient: { id: igUser },
          message: { text: params.text },
        },
      });

      return {
        success: true,
        externalMessageId: res?.message_id || `ig_${Date.now()}`,
        status: res?.message_id ? 'delivered' : 'sent',
        rawResponse: res,
      };
    } catch (err: any) {
      logger.error('messaging', 'adapter_instagram', 'send_fallback', `Falha envio Instagram: ${err.message}`);
      return {
        success: false,
        externalMessageId: '',
        status: 'failed',
        error: err.message,
      };
    }
  }
}

/**
 * 4. Meta WhatsApp Cloud API Adapter
 */
export class MetaWhatsAppCloudAdapter implements IChannelAdapter {
  readonly channel: SupportedChannel = 'whatsapp_meta';
  readonly channelLabel: string = 'WhatsApp Cloud (Meta)';

  async normalizeInbound(rawPayload: any): Promise<NormalizedIncomingMessage[]> {
    const results: NormalizedIncomingMessage[] = [];
    try {
      const entries = Array.isArray(rawPayload?.entry) ? rawPayload.entry : [];
      for (const entry of entries) {
        if (Array.isArray(entry.changes)) {
          for (const change of entry.changes) {
            const value = change.value || {};
            const messages = value.messages || [];
            const contacts = value.contacts || [];

            for (const msg of messages) {
              const fromPhone = msg.from;
              const contactInfo = contacts.find((c: any) => c.wa_id === fromPhone);
              const senderName = contactInfo?.profile?.name || `WhatsApp Cloud (${fromPhone.slice(-4)})`;
              const text = msg.text?.body || msg.caption || '';

              results.push({
                channel: this.channel,
                externalMessageId: msg.id || `wpp_cloud_${Date.now()}`,
                externalContactId: fromPhone,
                senderName,
                text,
                timestamp: new Date(Number(msg.timestamp) * 1000 || Date.now()).toISOString(),
                rawPayload: msg,
              });
            }
          }
        }
      }
    } catch (err: any) {
      logger.error('messaging', 'adapter_whatsapp_cloud', 'normalize_error', `Falha ao normalizar WhatsApp Cloud: ${err.message}`);
    }
    return results;
  }

  async sendOutbound(params: OutboundDispatchParams): Promise<OutboundDispatchResult> {
    const phoneId = process.env.META_PHONE_NUMBER_ID || 'me';
    const token = process.env.META_ACCESS_TOKEN;

    try {
      const res = await metaGraphClient.request<any>({
        method: 'POST',
        endpoint: `${phoneId}/messages`,
        accessToken: token,
        body: {
          messaging_product: 'whatsapp',
          to: params.contact.phone || params.contact.externalId,
          type: 'text',
          text: { body: params.text },
        },
      });

      const messageId = res?.messages?.[0]?.id || `wpp_cloud_${Date.now()}`;
      return {
        success: Boolean(res?.messages),
        externalMessageId: messageId,
        status: 'delivered',
        rawResponse: res,
      };
    } catch (err: any) {
      logger.error('messaging', 'adapter_whatsapp_cloud', 'send_fallback', `Falha envio WhatsApp Cloud: ${err.message}`);
      return {
        success: false,
        externalMessageId: '',
        status: 'failed',
        error: err.message,
      };
    }
  }
}

// ===========================================================================
// MAIN UNIFIED MESSAGING SERVICE
// ===========================================================================

export class MessagingService {
  private adapters: Map<SupportedChannel, IChannelAdapter> = new Map();
  private contacts: Map<string, MarketingContact> = new Map();
  private leads: Map<string, MarketingLeadInfo> = new Map();
  private conversations: Map<string, MarketingConversation> = new Map();
  private messages: Map<string, MarketingMessage[]> = new Map(); // conversationId -> messages[]

  // --- Persistência Supabase (source of truth de longo prazo) ---
  // Mapas em memória continuam servindo leituras síncronas (contrato frontend intacto);
  // toda mutação é espelhada nas tabelas messaging_* e, no boot, os Mapas são
  // re-hidratados do banco (restart preserva histórico).
  // Falhas de DB são logadas e engolidas (zero regressão in-process).
  private supabase: ReturnType<typeof getSupabaseServerClient> | null = null;
  private contactDbIds = new Map<string, string>(); // mapId (cnt_*) -> uuid da linha
  private convDbIds = new Map<string, string>(); // mapId (conv_*) -> uuid da linha

  constructor() {
    this.registerAdapters();
    this.seedInitialData();
    // Hidratação assíncrona: não bloqueia o boot; mapas já populados com seed
    // são enriquecidos/substituídos pelos registros persistidos quando a query resolve.
    this.hydrateFromDatabase().catch((err) => {
      logger.error('messaging', 'persist', 'hydrate_unhandled', `Falha não tratada na hidratação: ${err?.message ?? String(err)}`);
    });
  }

  private registerAdapters() {
    const evo = new EvolutionWhatsAppAdapter();
    const msg = new MetaMessengerAdapter();
    const ig = new InstagramDirectAdapter();
    const wppMeta = new MetaWhatsAppCloudAdapter();

    this.adapters.set(evo.channel, evo);
    this.adapters.set(msg.channel, msg);
    this.adapters.set(ig.channel, ig);
    this.adapters.set(wppMeta.channel, wppMeta);
  }

  public getAdapter(channel: SupportedChannel): IChannelAdapter {
    const adapter = this.adapters.get(channel);
    if (!adapter) {
      throw new Error(`Adaptador de canal não encontrado para: ${channel}`);
    }
    return adapter;
  }

  private seedInitialData() {
    const sampleContact1: MarketingContact = {
      id: 'cnt_wpp_01',
      name: 'Carlos Alberto Silva',
      phone: '5511987654321',
      channel: 'whatsapp_evolution',
      externalId: '5511987654321',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      leadId: 'lead_01',
      vehiclePlate: 'ABC-1D23',
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    };

    const sampleContact2: MarketingContact = {
      id: 'cnt_ig_02',
      name: 'Fernanda Oliveira',
      phone: '5521998877665',
      channel: 'instagram_direct',
      externalId: 'ig_user_fernanda_law',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      leadId: 'lead_02',
      vehiclePlate: 'XYZ-9E87',
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    };

    const sampleContact3: MarketingContact = {
      id: 'cnt_msg_03',
      name: 'Rodrigo Mendes de Souza',
      phone: '5531988776655',
      channel: 'meta_messenger',
      externalId: 'fb_psid_9823746192',
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
      leadId: 'lead_03',
      vehiclePlate: 'MTO-4A56',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    };

    this.contacts.set(sampleContact1.id, sampleContact1);
    this.contacts.set(sampleContact2.id, sampleContact2);
    this.contacts.set(sampleContact3.id, sampleContact3);

    const lead1: MarketingLeadInfo = {
      id: 'lead_01',
      contactId: sampleContact1.id,
      name: sampleContact1.name,
      phone: sampleContact1.phone,
      status: 'qualified',
      vehiclePlate: 'ABC-1D23',
      infractionType: 'Art. 218, III CTB - Velocidade superior à máxima em mais de 50%',
      estimatedFineAmount: 880.41,
      score: 92,
      notes: 'Notificação recebida há 4 dias. Radar fixo sem aferição recente do INMETRO.',
      createdAt: sampleContact1.createdAt,
    };

    const lead2: MarketingLeadInfo = {
      id: 'lead_02',
      contactId: sampleContact2.id,
      name: sampleContact2.name,
      phone: sampleContact2.phone,
      status: 'qualifying',
      vehiclePlate: 'XYZ-9E87',
      infractionType: 'Art. 165 CTB - Recusa ao Teste do Bafômetro / Lei Seca',
      estimatedFineAmount: 2934.70,
      score: 85,
      notes: 'Blitz urbana. Auto de infração sem termo de constatação de sinais.',
      createdAt: sampleContact2.createdAt,
    };

    const lead3: MarketingLeadInfo = {
      id: 'lead_03',
      contactId: sampleContact3.id,
      name: sampleContact3.name,
      phone: sampleContact3.phone,
      status: 'new',
      vehiclePlate: 'MTO-4A56',
      infractionType: 'Art. 181, XIX CTB - Estacionamento em local proibido',
      estimatedFineAmount: 195.23,
      score: 65,
      notes: 'Dúvida sobre transferência de pontos na CNH.',
      createdAt: sampleContact3.createdAt,
    };

    this.leads.set(lead1.id, lead1);
    this.leads.set(lead2.id, lead2);
    this.leads.set(lead3.id, lead3);

    const conv1: MarketingConversation = {
      id: 'conv_wpp_01',
      conversationId: 'conv_wpp_01',
      contactId: sampleContact1.id,
      contact: sampleContact1,
      lead: lead1,
      channel: 'whatsapp_evolution',
      channelLabel: 'WhatsApp (Evolution)',
      status: 'open',
      unreadCount: 0,
      lastMessageText: 'Perfeito! Vamos analisar sua notificação e estruturar a defesa prévia.',
      lastMessageAt: new Date(Date.now() - 3600000 * 1).toISOString(),
      aiMode: 'auto',
      createdAt: sampleContact1.createdAt,
      updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    };

    const conv2: MarketingConversation = {
      id: 'conv_ig_02',
      conversationId: 'conv_ig_02',
      contactId: sampleContact2.id,
      contact: sampleContact2,
      lead: lead2,
      channel: 'instagram_direct',
      channelLabel: 'Instagram Direct',
      status: 'open',
      unreadCount: 1,
      lastMessageText: 'Boa tarde! Vi o Reels de vocês sobre recurso de bafômetro. Como funciona a contratação?',
      lastMessageAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      aiMode: 'copilot',
      createdAt: sampleContact2.createdAt,
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    };

    const conv3: MarketingConversation = {
      id: 'conv_msg_03',
      conversationId: 'conv_msg_03',
      contactId: sampleContact3.id,
      contact: sampleContact3,
      lead: lead3,
      channel: 'meta_messenger',
      channelLabel: 'Facebook Messenger',
      status: 'open',
      unreadCount: 0,
      lastMessageText: 'Consigo indicar outro condutor se já passou o prazo da notificação?',
      lastMessageAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      aiMode: 'auto',
      createdAt: sampleContact3.createdAt,
      updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    };

    this.conversations.set(conv1.id, conv1);
    this.conversations.set(conv2.id, conv2);
    this.conversations.set(conv3.id, conv3);

    this.messages.set(conv1.id, [
      {
        id: 'msg_01_1',
        conversationId: conv1.id,
        channel: 'whatsapp_evolution',
        direction: 'inbound',
        senderId: sampleContact1.externalId,
        senderName: sampleContact1.name,
        text: 'Olá! Tomei uma multa de 50% de excesso de velocidade na rodovia. Tem como recorrer?',
        status: 'read',
        externalMessageId: 'wamid_sample_01',
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
      {
        id: 'msg_01_2',
        conversationId: conv1.id,
        channel: 'whatsapp_evolution',
        direction: 'outbound',
        senderId: 'defesai_ai',
        senderName: 'DefesAi Assistente',
        text: 'Olá Carlos! Sim, multas do Art. 218 III possuem alta taxa de nulidade por falhas de sinalização e validade do laudo INMETRO do radar. Você tem a foto ou número do auto de infração?',
        status: 'delivered',
        externalMessageId: 'wamid_out_01',
        createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      },
      {
        id: 'msg_01_3',
        conversationId: conv1.id,
        channel: 'whatsapp_evolution',
        direction: 'inbound',
        senderId: sampleContact1.externalId,
        senderName: sampleContact1.name,
        text: 'Tenho sim! A placa é ABC-1D23 e o auto é R893274.',
        status: 'read',
        externalMessageId: 'wamid_sample_02',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'msg_01_4',
        conversationId: conv1.id,
        channel: 'whatsapp_evolution',
        direction: 'outbound',
        senderId: 'atendente_humano',
        senderName: 'Dr. Lucas (DefesAi)',
        text: 'Perfeito! Vamos analisar sua notificação e estruturar a defesa prévia.',
        status: 'delivered',
        externalMessageId: 'wamid_out_02',
        createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
      },
    ]);

    this.messages.set(conv2.id, [
      {
        id: 'msg_02_1',
        conversationId: conv2.id,
        channel: 'instagram_direct',
        direction: 'inbound',
        senderId: sampleContact2.externalId,
        senderName: sampleContact2.name,
        text: 'Boa tarde! Vi o Reels de vocês sobre recurso de bafômetro. Como funciona a contratação?',
        status: 'delivered',
        externalMessageId: 'ig_mid_992831',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
    ]);

    this.messages.set(conv3.id, [
      {
        id: 'msg_03_1',
        conversationId: conv3.id,
        channel: 'meta_messenger',
        direction: 'inbound',
        senderId: sampleContact3.externalId,
        senderName: sampleContact3.name,
        text: 'Consigo indicar outro condutor se já passou o prazo da notificação?',
        status: 'read',
        externalMessageId: 'fb_mid_881923',
        createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      },
    ]);
  }

  // =========================================================================
  // 1. INBOUND WEBHOOK HANDLING VIA CHANNEL ADAPTERS
  // =========================================================================

  /**
   * Processa Webhooks recebidos da Evolution API (WhatsApp) através do Channel Adapter
   */
  public async handleEvolutionWebhook(payload: any): Promise<{ processed: boolean; conversationId?: string }> {
    try {
      const adapter = this.getAdapter('whatsapp_evolution');
      const normalizedList = await adapter.normalizeInbound(payload);

      if (!normalizedList || normalizedList.length === 0) {
        return { processed: false };
      }

      let lastConvId: string | undefined;
      for (const normalized of normalizedList) {
        const result = await this.processIncomingMessage(normalized);
        lastConvId = result.conversation.id;
      }

      return { processed: true, conversationId: lastConvId };
    } catch (err: any) {
      logger.error('messaging', 'evolution', 'webhook_error', `Erro ao processar webhook Evolution: ${err.message}`);
      return { processed: false };
    }
  }

  /**
   * Processa Webhooks recebidos da Meta (Messenger / Instagram Direct / WhatsApp Cloud) através dos respectivos Channel Adapters
   */
  public async handleMetaMessagingWebhook(payload: any): Promise<{ processed: boolean; count: number }> {
    try {
      const objectType = payload?.object || 'page';
      let processedCount = 0;

      // Determina os adapters pertinentes
      let adaptersToRun: IChannelAdapter[] = [];
      if (objectType === 'instagram') {
        adaptersToRun = [this.getAdapter('instagram_direct')];
      } else if (objectType === 'whatsapp_business_account') {
        adaptersToRun = [this.getAdapter('whatsapp_meta')];
      } else {
        // Objeto 'page' é Facebook Messenger e Lead Ads
        adaptersToRun = [this.getAdapter('meta_messenger')];
      }

      for (const adapter of adaptersToRun) {
        const normalizedList = await adapter.normalizeInbound(payload);
        for (const normalized of normalizedList) {
          await this.processIncomingMessage(normalized);
          processedCount++;
        }
      }

      return { processed: processedCount > 0, count: processedCount };
    } catch (err: any) {
      logger.error('messaging', 'meta', 'webhook_error', `Erro ao processar webhook Meta: ${err.message}`);
      return { processed: false, count: 0 };
    }
  }

  // =========================================================================
  // 2. CORE NORMALIZED INCOMING MESSAGE PROCESSOR
  // =========================================================================

  /**
   * Ponto central único para onde TODOS os canais convergem após normalização pelo Channel Adapter
   */
  public async processIncomingMessage(
    incoming: NormalizedIncomingMessage
  ): Promise<{ contact: MarketingContact; conversation: MarketingConversation; message: MarketingMessage }> {
    logger.info('messaging', 'gateway', 'incoming_normalized', `Mensagem normalizada recebida via [${incoming.channel}] de ${incoming.senderName}`, {
      channel: incoming.channel,
      senderId: incoming.externalContactId,
      textPreview: incoming.text?.substring(0, 60),
    });

    const adapter = this.getAdapter(incoming.channel);
    const now = new Date().toISOString();

    // 1. Resolução ou Criação de Contato
    let contact = this.findContactByExternalId(incoming.externalContactId, incoming.channel);

    if (!contact) {
      contact = {
        id: `cnt_${incoming.channel.slice(0, 3)}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: incoming.senderName,
        phone: incoming.channel.includes('whatsapp') ? incoming.externalContactId : undefined,
        channel: incoming.channel,
        externalId: incoming.externalContactId,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${incoming.externalContactId}`,
        createdAt: now,
        updatedAt: now,
      };
      this.contacts.set(contact.id, contact);
    } else {
      contact.updatedAt = now;
      if (
        incoming.senderName &&
        (contact.name.startsWith('Motorista WhatsApp') ||
          contact.name.startsWith('WhatsApp (') ||
          contact.name.startsWith('Usuário ') ||
          contact.name.startsWith('Instagram @user_'))
      ) {
        contact.name = incoming.senderName;
      }
    }

    // 2. Resolução ou Criação de Lead no CRM
    let lead = contact.leadId ? this.leads.get(contact.leadId) : undefined;
    if (!lead) {
      const parsedIntent = this.extractTrafficInfractionContext(incoming.text || '');
      lead = {
        id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        contactId: contact.id,
        name: contact.name,
        phone: contact.phone,
        status: 'new',
        vehiclePlate: parsedIntent.plate,
        infractionType: parsedIntent.infractionType,
        estimatedFineAmount: parsedIntent.estimatedAmount,
        score: parsedIntent.score,
        notes: `Contato inicial via ${adapter.channelLabel}. Mensagem: "${incoming.text?.substring(0, 100)}"`,
        createdAt: now,
      };
      this.leads.set(lead.id, lead);
      contact.leadId = lead.id;
      if (parsedIntent.plate) {
        contact.vehiclePlate = parsedIntent.plate;
      }
    }

    // 3. Resolução ou Criação de Conversa com conversationId determinístico e consistente
    let conversation = this.findConversationByContactId(contact.id);
    const sanitizedExtId = incoming.externalContactId.replace(/[^a-zA-Z0-9_-]/g, '');
    const canonicalConvId = `conv_${incoming.channel}_${sanitizedExtId}`;

    if (!conversation) {
      conversation = {
        id: canonicalConvId,
        conversationId: canonicalConvId,
        contactId: contact.id,
        contact,
        lead,
        channel: incoming.channel,
        channelLabel: adapter.channelLabel,
        status: 'open',
        unreadCount: 1,
        lastMessageText: incoming.text || '[Mídia recebida]',
        lastMessageAt: now,
        aiMode: 'auto',
        createdAt: now,
        updatedAt: now,
      };
      this.conversations.set(conversation.id, conversation);
    } else {
      conversation.conversationId = conversation.id;
      conversation.channelLabel = adapter.channelLabel;
      conversation.unreadCount += 1;
      conversation.lastMessageText = incoming.text || '[Mídia recebida]';
      conversation.lastMessageAt = now;
      conversation.updatedAt = now;
      conversation.contact = contact;
      conversation.lead = lead;
    }

    // 4. Criação e Persistência da Mensagem Inbound
    const message: MarketingMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      conversationId: conversation.id,
      channel: incoming.channel,
      direction: 'inbound',
      senderId: incoming.externalContactId,
      senderName: contact.name,
      text: incoming.text || '',
      mediaUrl: incoming.mediaUrl,
      mediaType: incoming.mediaType,
      status: 'delivered',
      externalMessageId: incoming.externalMessageId,
      rawMetadata: incoming.rawPayload,
      createdAt: now,
    };

    const convMessages = this.messages.get(conversation.id) || [];
    convMessages.push(message);
    this.messages.set(conversation.id, convMessages);

    // 4b. Acoplamento ADITIVO com prospecção B2B: resposta inbound de lead prospectado
    //     persiste em marketing_messages e marca marketing_lead_campaigns='responded'.
    //     Nunca lança erro — falhas são logadas internamente e engolidas.
    await persistProspectingResponse(incoming);

    // 4c. WhatsApp Journey Router (ADR-013 / P0.2) — decide B2C_AUTO vs B2B_RELATIONSHIP
    //     Deve rodar ANTES do auto-responder IA e ANTES da emissão de evento,
    //     para que conversation.metadata.journeyType esteja disponível downstream.
    const journey = await whatsappJourneyRouter.resolveJourney(incoming);
    conversation.metadata = { ...conversation.metadata, journeyType: journey };

    // 5. Emissão de Evento para UI / WebSockets / Inbox
    eventBus.publish(
      EventTopics.MESSAGING_MESSAGE_RECEIVED,
      {
        conversationId: conversation.id,
        message,
        contact,
        channel: incoming.channel,
      },
      'messaging_service'
    );

    // 6. Motor de IA / Auto-Atendimento em background — SOMENTE para B2C_AUTO
    if (conversation.aiMode === 'auto' && incoming.text && journey === 'B2C_AUTO') {
      setImmediate(async () => {
        await this.triggerAIAutoResponse(conversation!, contact!, incoming.text || '');
      });
    }

    // Para B2B_RELATIONSHIP: persiste inbound, emite evento, mas NÃO dispara auto-resposta.
    // Cadence state em marketing_lead_campaigns permanece 'responded' (não rebaixa para 'sent').

    // Persistência Supabase (source of truth): espelha contato+conversa+mensagem.
    // Sequencial p/ respeitar FKs (contact → conversation → message). Nunca lança.
    await this.persistContact(contact);
    await this.persistConversation(conversation);
    await this.persistMessage(message);

    return { contact, conversation, message };
  }

  // =========================================================================
  // 3. OUTBOUND ROUTING VIA CHANNEL ADAPTERS
  // =========================================================================

  /**
   * Envia uma mensagem para uma conversa existente, despachando pelo Channel Adapter de origem
   */
  public async sendMessage(
    conversationId: string,
    text: string,
    senderId: string = 'operator',
    senderName: string = 'Atendente DefesAi',
    mediaUrl?: string
  ): Promise<{ success: boolean; message: MarketingMessage; externalResult?: any }> {
    // Localiza conversa por id ou conversationId
    const conversation = this.getConversationById(conversationId);
    if (!conversation) {
      throw new Error(`Conversa ${conversationId} não encontrada`);
    }

    const contact = this.contacts.get(conversation.contactId);
    if (!contact) {
      throw new Error(`Contato ${conversation.contactId} não encontrado`);
    }

    const adapter = this.getAdapter(conversation.channel);
    const now = new Date().toISOString();

    // Despacha via Channel Adapter
    const dispatchResult = await adapter.sendOutbound({
      contact,
      conversation,
      text,
      mediaUrl,
    });

    const message: MarketingMessage = {
      id: `msg_out_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conversationId: conversation.id,
      channel: conversation.channel,
      direction: 'outbound',
      senderId,
      senderName,
      text,
      mediaUrl,
      status: dispatchResult.status,
      externalMessageId: dispatchResult.externalMessageId,
      createdAt: now,
    };

    const convMessages = this.messages.get(conversation.id) || [];
    convMessages.push(message);
    this.messages.set(conversation.id, convMessages);

    // Atualiza conversa
    conversation.lastMessageText = text;
    conversation.lastMessageAt = now;
    conversation.updatedAt = now;
    conversation.unreadCount = 0;

    // Persistência Supabase (source of truth): mensagem + atualização da conversa.
    await this.persistMessage(message);
    await this.persistConversation(conversation);

    // Publica evento
    eventBus.publish(
      EventTopics.MESSAGING_MESSAGE_SENT,
      {
        conversationId: conversation.id,
        message,
        channel: conversation.channel,
      },
      'messaging_service'
    );

    return {
      success: dispatchResult.success,
      message,
      externalResult: dispatchResult.rawResponse,
    };
  }

  // =========================================================================
  // 4. AI AUTO-RESPONDER & QUALIFIER
  // =========================================================================

  private async triggerAIAutoResponse(
    conversation: MarketingConversation,
    contact: MarketingContact,
    userText: string
  ) {
    try {
      await new Promise((r) => setTimeout(r, 600));

      const lower = userText.toLowerCase();
      let aiText = '';

      if (lower.includes('velocidade') || lower.includes('radar') || lower.includes('218')) {
        aiText = `Olá ${contact.name}! Identificamos que você precisa de auxílio com notificação de excesso de velocidade. Para montarmos sua tese de recurso, você poderia nos informar a placa do veículo ou se o radar possuía aferição do INMETRO recente?`;
      } else if (lower.includes('bafômetro') || lower.includes('lei seca') || lower.includes('165')) {
        aiText = `Olá ${contact.name}! Casos do Art. 165 (Lei Seca) demandam análise imediata dos termos de constatação e da calibração do etilômetro. Nossos especialistas jurídicos podem anular a suspensão da CNH. Deseja iniciar a análise gratuita?`;
      } else if (lower.includes('preço') || lower.includes('valor') || lower.includes('quanto custa')) {
        aiText = `Trabalhamos com recursos técnicos personalizados a partir de R$ 97,00 com garantia de conformidade às resoluções do CONTRAN. Você já possui o número do auto de infração em mãos?`;
      } else {
        aiText = `Olá ${contact.name}, obrigado por entrar em contato com a DefesAi! Recebemos sua mensagem e nossa equipe jurídica de inteligência artificial já está analisando as melhores teses para o seu caso. Como podemos te ajudar hoje?`;
      }

      await this.sendMessage(
        conversation.id,
        aiText,
        'defesai_ai_bot',
        'DefesAi IA (Auto-Atendimento)'
      );

      logger.info('messaging', 'ai', 'auto_response_sent', `Resposta de IA disparada para conversa ${conversation.id}`, {
        channel: conversation.channel,
        contactId: contact.id,
      });
    } catch (err: any) {
      logger.warn('messaging', 'ai', 'auto_response_failed', `Falha ao responder automaticamente: ${err.message}`);
    }
  }

  private extractTrafficInfractionContext(text: string): {
    plate?: string;
    infractionType: string;
    estimatedAmount: number;
    score: number;
  } {
    const plateMatch = text.match(/[A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}/i);
    const plate = plateMatch ? plateMatch[0].toUpperCase() : undefined;

    const lower = text.toLowerCase();
    if (lower.includes('bafômetro') || lower.includes('lei seca')) {
      return { plate, infractionType: 'Art. 165 CTB - Lei Seca / Bafômetro', estimatedAmount: 2934.70, score: 95 };
    }
    if (lower.includes('velocidade') || lower.includes('radar')) {
      return { plate, infractionType: 'Art. 218 CTB - Excesso de Velocidade', estimatedAmount: 880.41, score: 90 };
    }
    if (lower.includes('celular')) {
      return { plate, infractionType: 'Art. 252 CTB - Uso de Celular ao Volante', estimatedAmount: 293.47, score: 75 };
    }
    return { plate, infractionType: 'Infração de Trânsito a qualificar', estimatedAmount: 195.23, score: 60 };
  }

  // =========================================================================
  // 5. QUERY & REPOSITORY METHODS
  // =========================================================================

  public getConversations(filters?: { channel?: string; status?: string; search?: string }): MarketingConversation[] {
    let list = Array.from(this.conversations.values());

    if (filters?.channel && filters.channel !== 'all') {
      list = list.filter((c) => c.channel === filters.channel);
    }
    if (filters?.status && filters.status !== 'all') {
      list = list.filter((c) => c.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.contact.name.toLowerCase().includes(q) ||
          c.contact.phone?.toLowerCase().includes(q) ||
          c.contact.vehiclePlate?.toLowerCase().includes(q) ||
          c.lastMessageText.toLowerCase().includes(q)
      );
    }

    // Garante que todo item contenha id e conversationId idênticos e channelLabel
    return list
      .map((c) => ({
        ...c,
        conversationId: c.id,
        channelLabel: c.channelLabel || this.adapters.get(c.channel)?.channelLabel || c.channel,
      }))
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }

  public getConversationById(id: string): MarketingConversation | undefined {
    // Permite buscar por id direto ou contactId
    let conv = this.conversations.get(id);
    if (!conv) {
      conv = Array.from(this.conversations.values()).find((c) => c.contactId === id || c.id === id || c.conversationId === id);
    }
    if (conv) {
      conv.conversationId = conv.id;
      conv.channelLabel = conv.channelLabel || this.adapters.get(conv.channel)?.channelLabel || conv.channel;
    }
    return conv;
  }

  public getMessages(conversationId: string): MarketingMessage[] {
    // Tenta obter por conversationId ou busca a conversa
    const conv = this.getConversationById(conversationId);
    const key = conv ? conv.id : conversationId;
    const msgs = this.messages.get(key) || [];
    return msgs.map((m) => ({
      ...m,
      conversationId: key,
    }));
  }

  public updateConversation(id: string, updates: Partial<MarketingConversation>): MarketingConversation {
    const conv = this.getConversationById(id);
    if (!conv) throw new Error('Conversa não encontrada');

    const updated: MarketingConversation = {
      ...conv,
      ...updates,
      conversationId: conv.id,
      updatedAt: new Date().toISOString(),
    };
    this.conversations.set(conv.id, updated);
    // Persistência Supabase (sync API → fire-and-forget; nunca lança)
    void this.persistConversation(updated);
    return updated;
  }

  public updateContact(id: string, updates: Partial<MarketingContact>): MarketingContact {
    const cnt = this.contacts.get(id);
    if (!cnt) throw new Error('Contato não encontrado');

    const updated = { ...cnt, ...updates, updatedAt: new Date().toISOString() };
    this.contacts.set(id, updated);
    // Persistência Supabase (sync API → fire-and-forget; nunca lança)
    void this.persistContact(updated);
    return updated;
  }

  public createOrUpdateLead(leadData: Partial<MarketingLeadInfo> & { contactId: string }): MarketingLeadInfo {
    const contact = this.contacts.get(leadData.contactId);
    if (!contact) throw new Error('Contato não encontrado');

    const id = leadData.id || contact.leadId || `lead_${Date.now()}`;
    const lead: MarketingLeadInfo = {
      id,
      contactId: contact.id,
      name: leadData.name || contact.name,
      phone: leadData.phone || contact.phone,
      email: leadData.email || contact.email,
      status: leadData.status || 'qualified',
      vehiclePlate: leadData.vehiclePlate || contact.vehiclePlate,
      infractionType: leadData.infractionType || 'Art. 218 CTB',
      estimatedFineAmount: leadData.estimatedFineAmount || 293.47,
      score: leadData.score || 80,
      notes: leadData.notes || '',
      createdAt: new Date().toISOString(),
    };

    this.leads.set(id, lead);
    contact.leadId = id;
    if (lead.vehiclePlate) contact.vehiclePlate = lead.vehiclePlate;

    // Persistência Supabase (sync API → fire-and-forget; nunca lança).
    // O lead embutido na conversa mantém o contrato de objeto no hydrate.
    const conv = this.findConversationByContactId(contact.id);
    if (conv) {
      const withLead: MarketingConversation = {
        ...conv,
        lead,
        metadata: { ...(conv.metadata || {}), lead: lead as unknown as Record<string, any> },
      };
      this.conversations.set(conv.id, withLead);
      void this.persistConversation(withLead);
    }
    void this.persistContact(contact);

    return lead;
  }

  public getStats(): InboxStats {
    const all = Array.from(this.conversations.values());
    const open = all.filter((c) => c.status === 'open');
    const unread = all.reduce((sum, c) => sum + c.unreadCount, 0);

    const byChannel = {
      whatsapp_evolution: all.filter((c) => c.channel === 'whatsapp_evolution').length,
      whatsapp_meta: all.filter((c) => c.channel === 'whatsapp_meta').length,
      meta_messenger: all.filter((c) => c.channel === 'meta_messenger').length,
      instagram_direct: all.filter((c) => c.channel === 'instagram_direct').length,
    };

    const leadsCount = this.leads.size;
    const aiConversations = all.filter((c) => c.aiMode !== 'off').length;
    const aiPercentage = all.length > 0 ? Math.round((aiConversations / all.length) * 100) : 0;

    return {
      totalConversations: all.length,
      openConversations: open.length,
      unreadTotal: unread,
      byChannel,
      leadsGenerated: leadsCount,
      aiHandledPercentage: aiPercentage,
    };
  }

  // =========================================================================
  // 6. SELF-TEST & DIAGNOSTIC VERIFICATION PROBE
  // =========================================================================

  public async runSelfTest(): Promise<{
    success: boolean;
    results: Array<{ test: string; channel: string; passed: boolean; details: string }>;
  }> {
    const results: Array<{ test: string; channel: string; passed: boolean; details: string }> = [];

    // Test 1: Evolution WhatsApp Inbound Normalization
    try {
      const evoPayload = {
        event: 'messages.upsert',
        data: {
          key: { remoteJid: '5511999991111@s.whatsapp.net', fromMe: false, id: `test_wpp_${Date.now()}` },
          pushName: 'Motorista Teste WhatsApp',
          message: { conversation: 'Recebi uma multa de radar na Rodovia dos Bandeirantes, como recorrer?' },
        },
      };
      const res = await this.handleEvolutionWebhook(evoPayload);
      results.push({
        test: 'Normalização Channel Adapter: WhatsApp (Evolution API)',
        channel: 'whatsapp_evolution',
        passed: res.processed,
        details: `Webhook normalizado e processado com sucesso. conversationId gerado: ${res.conversationId}`,
      });
    } catch (e: any) {
      results.push({
        test: 'Normalização Channel Adapter: WhatsApp (Evolution API)',
        channel: 'whatsapp_evolution',
        passed: false,
        details: e.message,
      });
    }

    // Test 2: Meta Messenger Inbound Normalization
    try {
      const msgPayload = {
        object: 'page',
        entry: [
          {
            id: 'page_123456',
            messaging: [
              {
                sender: { id: 'fb_user_test_9988' },
                recipient: { id: 'page_123456' },
                timestamp: Date.now(),
                message: { mid: `mid_test_${Date.now()}`, text: 'Qual o prazo para apresentar a defesa prévia?' },
              },
            ],
          },
        ],
      };
      const res = await this.handleMetaMessagingWebhook(msgPayload);
      results.push({
        test: 'Normalização Channel Adapter: Facebook Messenger',
        channel: 'meta_messenger',
        passed: res.processed,
        details: `Eventos de mensageria processados e unificados: ${res.count}`,
      });
    } catch (e: any) {
      results.push({
        test: 'Normalização Channel Adapter: Facebook Messenger',
        channel: 'meta_messenger',
        passed: false,
        details: e.message,
      });
    }

    // Test 3: Instagram Direct Inbound Normalization
    try {
      const igPayload = {
        object: 'instagram',
        entry: [
          {
            id: '1784140000000',
            messaging: [
              {
                sender: { id: 'ig_driver_tester' },
                recipient: { id: '1784140000000' },
                timestamp: Date.now(),
                message: { mid: `ig_test_${Date.now()}`, text: 'Boa tarde! Gostaria de saber se cabe recurso para lei seca.' },
              },
            ],
          },
        ],
      };
      const res = await this.handleMetaMessagingWebhook(igPayload);
      results.push({
        test: 'Normalização Channel Adapter: Instagram Direct',
        channel: 'instagram_direct',
        passed: res.processed,
        details: `Eventos de Direct processados e unificados: ${res.count}`,
      });
    } catch (e: any) {
      results.push({
        test: 'Normalização Channel Adapter: Instagram Direct',
        channel: 'instagram_direct',
        passed: false,
        details: e.message,
      });
    }

    // Test 4: Outbound Response Dispatching
    try {
      const testConv = Array.from(this.conversations.values())[0];
      const sendRes = await this.sendMessage(
        testConv.id,
        'Teste automatizado de resposta via Channel Adapter com sucesso.',
        'test_runner',
        'Sistema de Testes'
      );
      results.push({
        test: 'Despacho Outbound & Registro de Mensagem',
        channel: testConv.channel,
        passed: sendRes.success,
        details: `Mensagem gravada com status: ${sendRes.message.status} (ID: ${sendRes.message.id}, ConvID: ${sendRes.message.conversationId})`,
      });
    } catch (e: any) {
      results.push({
        test: 'Despacho Outbound & Registro de Mensagem',
        channel: 'all',
        passed: false,
        details: e.message,
      });
    }

    const allPassed = results.every((r) => r.passed);
    return { success: allPassed, results };
  }

  // =========================================================================
  // 7. SUPABASE PERSISTENCE LAYER (source of truth) — hybrid cache pattern
  // =========================================================================
  // Mapas em memória permanecem como cache de leitura síncrona (frontend contract
  // intacto). Toda mutação é espelhada aqui e o estado é re-hidratado no boot.
  // Todos os métodos abaixo engolem erros — falha de DB NÃO degrada o inbox.

  private get db(): ReturnType<typeof getSupabaseServerClient> | null {
    if (!this.supabase) this.supabase = getSupabaseServerClient();
    return this.supabase;
  }

  private async hydrateFromDatabase(): Promise<void> {
    const client = this.db;
    if (!client) {
      logger.warn('messaging', 'persist', 'hydrate_skip', 'Supabase client ausente — inbox permanecerá em memória apenas');
      return;
    }

    try {
      // 1. Contatos
      const { data: contactRows, error: cErr } = await (client as any)
        .from('messaging_contacts')
        .select('*');
      if (cErr) throw cErr;
      if (Array.isArray(contactRows)) {
        for (const row of contactRows) {
          const contact = this.mapContactRow(row);
          this.contacts.set(contact.id, contact);
          this.contactDbIds.set(contact.id, row.id);
        }
      }

      // 2. Conversas (deps: contatos já carregados)
      const { data: convRows, error: vErr } = await (client as any)
        .from('messaging_conversations')
        .select('*');
      if (vErr) throw vErr;
      if (Array.isArray(convRows)) {
        for (const row of convRows) {
          const { conv, lead } = this.mapConversationRow(row);
          if (lead && lead.id) this.leads.set(lead.id, lead);
          this.conversations.set(conv.id, conv);
          this.convDbIds.set(conv.id, row.id);
        }
      }

      // 3. Mensagens (append + dedupe por mapId contra eventuais msgs de seed)
      const { data: msgRows, error: mErr } = await (client as any)
        .from('messaging_messages')
        .select('*')
        .order('created_at', { ascending: true });
      if (mErr) throw mErr;
      if (Array.isArray(msgRows)) {
        const byConv = new Map<string, any[]>();
        for (const row of msgRows) {
          const convUuid = row.conversation_id;
          // mapeia uuid da conversa de volta para o mapId (key do Map de msgs)
          let convKey: string | undefined = this.convDbIdsFromUuid(convUuid);
          if (!convKey) convKey = convUuid; // fallback: linha externa sem mapId
          (byConv.get(convKey) || byConv.set(convKey, []).get(convKey)!).push(row);
        }
        for (const [key, rows] of byConv) {
          const existing = this.messages.get(key) || [];
          const merged = [...rows.map((r) => this.mapMessageRow(r, key)), ...existing];
          const dedup = new Map(merged.map((m) => [m.id, m]));
          this.messages.set(
            key,
            Array.from(dedup.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          );
        }
      }

      logger.info('messaging', 'persist', 'hydrate_done', 'Inbox hidratado do Supabase', {
        contacts: this.contacts.size,
        conversations: this.conversations.size,
        leads: this.leads.size,
        messages: msgRows?.length ?? 0,
      });
    } catch (err: any) {
      logger.error('messaging', 'persist', 'hydrate_failed', `Falha na hidratação do inbox: ${err?.message ?? String(err)}`);
    }
  }

  private async persistContact(contact: MarketingContact): Promise<void> {
    const client = this.db;
    if (!client) return;
    try {
      const { data, error } = await (client as any)
        .from('messaging_contacts')
        .upsert(this.contactToRow(contact), { onConflict: 'channel,external_id' })
        .select('id')
        .single();
      if (error) throw error;
      if (data?.id) this.contactDbIds.set(contact.id, data.id);
    } catch (err: any) {
      logger.error('messaging', 'persist', 'contact_failed', `Falha ao persistir contato ${contact.id}: ${err?.message ?? String(err)}`);
    }
  }

  private async persistConversation(conversation: MarketingConversation): Promise<void> {
    const client = this.db;
    if (!client) return;
    try {
      const contactUuid = this.contactDbIds.get(conversation.contactId);
      if (!contactUuid) return; // sem FK de contato ainda → skip (será retentado em mutation futura)
      const { data, error } = await (client as any)
        .from('messaging_conversations')
        .upsert(this.conversationToRow(conversation, contactUuid), { onConflict: 'contact_id,channel' })
        .select('id')
        .single();
      if (error) throw error;
      if (data?.id) this.convDbIds.set(conversation.id, data.id);
    } catch (err: any) {
      logger.error('messaging', 'persist', 'conversation_failed', `Falha ao persistir conversa ${conversation.id}: ${err?.message ?? String(err)}`);
    }
  }

  private async persistMessage(message: MarketingMessage): Promise<void> {
    const client = this.db;
    if (!client) return;
    try {
      const convUuid = this.convDbIds.get(message.conversationId);
      if (!convUuid) return; // conversa não persistida ainda → skip
      await (client as any).from('messaging_messages').insert(this.messageToRow(message, convUuid));
    } catch (err: any) {
      logger.error('messaging', 'persist', 'message_failed', `Falha ao persistir mensagem ${message.id}: ${err?.message ?? String(err)}`);
    }
  }

  // --- row <-> memory mappings ---
  // O id legado do Map (cnt_wpp_01, conv_wpp_01, msg_01_1) é preservado via
  // metadata.mapId. Leads embutidos em conversations.metadata.lead.

  private contactToRow(c: MarketingContact): Record<string, any> {
    return {
      name: c.name,
      phone: c.phone ?? null,
      email: c.email ?? null,
      channel: c.channel,
      external_id: c.externalId,
      avatar_url: c.avatarUrl ?? null,
      vehicle_plate: c.vehiclePlate ?? null,
      metadata: { mapId: c.id, ...(c.leadId ? { leadId: c.leadId } : {}) },
      updated_at: c.updatedAt,
    };
  }

  private mapContactRow(row: any): MarketingContact {
    const meta = row.metadata || {};
    return {
      id: meta.mapId || row.id,
      name: row.name,
      phone: row.phone ?? undefined,
      email: row.email ?? undefined,
      channel: row.channel,
      externalId: row.external_id,
      avatarUrl: row.avatar_url ?? undefined,
      leadId: meta.leadId,
      vehiclePlate: row.vehicle_plate ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private conversationToRow(c: MarketingConversation, contactUuid: string): Record<string, any> {
    const metadata: Record<string, any> = {
      ...(c.metadata || {}),
      mapId: c.id,
      contactMapId: c.contactId,
    };
    if (c.lead) metadata.lead = c.lead;
    return {
      contact_id: contactUuid,
      channel: c.channel,
      channel_label: c.channelLabel ?? null,
      status: c.status,
      unread_count: c.unreadCount,
      last_message_text: c.lastMessageText,
      last_message_at: c.lastMessageAt,
      ai_mode: c.aiMode,
      metadata,
      updated_at: c.updatedAt,
    };
  }

  private mapConversationRow(row: any): { conv: MarketingConversation; lead?: MarketingLeadInfo } {
    const meta = row.metadata || {};
    const mapId = meta.mapId || row.id;
    const contactMapId = meta.contactMapId || row.contact_id;
    const contact = this.contacts.get(contactMapId);
    // ponytail: contato sem mapId conhecido (escrito por ferramenta externa) → placeholder mínimo.
    const safeContact = contact ?? {
      id: contactMapId,
      name: 'Contato (sem mapa local)',
      channel: row.channel,
      externalId: '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    const lead = meta.lead ? (meta.lead as MarketingLeadInfo) : undefined;
    const conv: MarketingConversation = {
      id: mapId,
      conversationId: mapId,
      contactId: contactMapId,
      contact: safeContact,
      lead,
      channel: row.channel,
      channelLabel: row.channel_label ?? undefined,
      status: row.status,
      unreadCount: row.unread_count,
      lastMessageText: row.last_message_text ?? '',
      lastMessageAt: row.last_message_at ?? row.created_at,
      aiMode: row.ai_mode,
      metadata: meta,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    return { conv, lead };
  }

  private messageToRow(m: MarketingMessage, convUuid: string): Record<string, any> {
    return {
      conversation_id: convUuid,
      channel: m.channel,
      direction: m.direction,
      sender_id: m.senderId,
      sender_name: m.senderName,
      text: m.text ?? null,
      media_url: m.mediaUrl ?? null,
      media_type: m.mediaType ?? null,
      status: m.status,
      external_message_id: m.externalMessageId ?? null,
      raw_metadata: m.rawMetadata ?? null,
      metadata: { mapId: m.id },
      created_at: m.createdAt,
    };
  }

  private mapMessageRow(row: any, conversationId: string): MarketingMessage {
    const meta = row.metadata || {};
    return {
      id: meta.mapId || row.id,
      conversationId,
      channel: row.channel,
      direction: row.direction,
      senderId: row.sender_id,
      senderName: row.sender_name,
      text: row.text ?? '',
      mediaUrl: row.media_url ?? undefined,
      mediaType: row.media_type ?? undefined,
      status: row.status,
      externalMessageId: row.external_message_id ?? undefined,
      rawMetadata: row.raw_metadata ?? undefined,
      createdAt: row.created_at,
    };
  }

  private convDbIdsFromUuid(uuid: string): string | undefined {
    const entry = Array.from(this.convDbIds.entries()).find(([, v]) => v === uuid);
    return entry ? entry[0] : undefined;
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private findContactByExternalId(externalId: string, channel: SupportedChannel): MarketingContact | undefined {
    return Array.from(this.contacts.values()).find(
      (c) => c.externalId === externalId && c.channel === channel
    );
  }

  private findConversationByContactId(contactId: string): MarketingConversation | undefined {
    return Array.from(this.conversations.values()).find((c) => c.contactId === contactId);
  }
}

export const messagingService = new MessagingService();
