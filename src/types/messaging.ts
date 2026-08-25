export type SupportedChannel =
  | 'whatsapp_evolution'
  | 'whatsapp_meta'
  | 'meta_messenger'
  | 'instagram_direct';

export type ConversationStatus = 'open' | 'closed' | 'snoozed';
export type AIMode = 'auto' | 'copilot' | 'off';
export type MessageDirection = 'inbound' | 'outbound';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
export type MediaType = 'image' | 'video' | 'audio' | 'document';

export interface MarketingContact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  channel: SupportedChannel;
  externalId: string; // Phone number or Facebook PSID or Instagram IGID
  avatarUrl?: string;
  leadId?: string;
  vehiclePlate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingLeadInfo {
  id: string;
  contactId: string;
  name: string;
  phone?: string;
  email?: string;
  status: 'new' | 'qualifying' | 'qualified' | 'proposal' | 'won' | 'lost';
  vehiclePlate?: string;
  infractionType?: string;
  estimatedFineAmount?: number;
  score?: number; // 0-100 score de conversão jurídica
  notes?: string;
  createdAt: string;
}

export interface MarketingMessage {
  id: string;
  conversationId: string;
  channel: SupportedChannel;
  direction: MessageDirection;
  senderId: string;
  senderName: string;
  text: string;
  mediaUrl?: string;
  mediaType?: MediaType;
  status: MessageStatus;
  externalMessageId?: string;
  rawMetadata?: Record<string, any>;
  createdAt: string;
}

export interface MarketingConversation {
  id: string;
  conversationId?: string; // Canonical alias for cross-system consistency
  contactId: string;
  contact: MarketingContact;
  lead?: MarketingLeadInfo;
  channel: SupportedChannel;
  channelLabel?: string;
  status: ConversationStatus;
  unreadCount: number;
  lastMessageText: string;
  lastMessageAt: string;
  aiMode: AIMode;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface NormalizedIncomingMessage {
  channel: SupportedChannel;
  externalMessageId: string;
  externalContactId: string;
  senderName: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: MediaType;
  timestamp?: string;
  rawPayload?: any;
}

export interface OutboundDispatchParams {
  contact: MarketingContact;
  conversation: MarketingConversation;
  text: string;
  mediaUrl?: string;
}

export interface OutboundDispatchResult {
  success: boolean;
  externalMessageId?: string;
  status: MessageStatus;
  rawResponse?: any;
  error?: string;
}

export interface IChannelAdapter {
  readonly channel: SupportedChannel;
  readonly channelLabel: string;
  normalizeInbound(rawPayload: any): Promise<NormalizedIncomingMessage[]>;
  sendOutbound(params: OutboundDispatchParams): Promise<OutboundDispatchResult>;
}

export interface InboxStats {
  totalConversations: number;
  openConversations: number;
  unreadTotal: number;
  byChannel: {
    whatsapp_evolution: number;
    whatsapp_meta: number;
    meta_messenger: number;
    instagram_direct: number;
  };
  leadsGenerated: number;
  aiHandledPercentage: number;
}
