/**
 * @file topics.ts
 * Shared Kernel Event Topics for Adeus Multa (ADR 012)
 * Decoupled bus connecting Cases, Knowledge, OCR, Payments, WhatsApp, and Marketing OS.
 */

export const EventTopics = {
  // Case Lifecycle
  CASE_CREATED: 'case.created',
  CASE_UPDATED: 'case.updated',
  CASE_CLAIMED: 'case.claimed',
  CASE_STAGE_CHANGED: 'case.stage_changed',

  // OCR & Analysis
  OCR_UPLOADED: 'ocr.uploaded',
  OCR_PROCESSING: 'ocr.processing',
  OCR_COMPLETED: 'ocr.completed',
  ANALYSIS_GENERATED: 'analysis.generated',

  // Defense Drafting
  DEFENSE_DRAFT_INITIATED: 'defense.draft_initiated',
  DEFENSE_ARGUMENTS_SELECTED: 'defense.arguments_selected',
  DEFENSE_DRAFT_FINALIZED: 'defense.draft_finalized',
  DEFENSE_PDF_EXPORTED: 'defense.pdf_exported',

  // Protocol & Timeline
  PROTOCOL_FILED: 'protocol.filed',
  STATUS_UPDATED: 'status.updated',
  DEADLINE_ALERT_TRIGGERED: 'deadline.alert_triggered',

  // Payments & Checkout
  PAYMENT_INTENT_CREATED: 'payment.intent_created',
  PAYMENT_PIX_GENERATED: 'payment.pix_generated',
  PAYMENT_CONFIRMED: 'payment.confirmed',
  PAYMENT_REFUNDED: 'payment.refunded',

  // Communication & WhatsApp (Evolution API)
  WHATSAPP_MESSAGE_QUEUED: 'whatsapp.message_queued',
  WHATSAPP_MESSAGE_SENT: 'whatsapp.message_sent',
  WHATSAPP_WEBHOOK_RECEIVED: 'whatsapp.webhook_received',

  // Omnichannel Messaging (WhatsApp, Meta Messenger, Instagram Direct)
  MESSAGING_MESSAGE_RECEIVED: 'messaging.message_received',
  MESSAGING_MESSAGE_SENT: 'messaging.message_sent',
  MESSAGING_LEAD_QUALIFIED: 'messaging.lead_qualified',

  // Marketing OS 7-Agent Organism
  MARKETING_CYCLE_TICK: 'marketing.cycle_tick',
  MARKETING_STRATEGY_UPDATED: 'marketing.strategy_updated',
  MARKETING_CONTENT_DRAFTED: 'marketing.content_drafted',
  MARKETING_QUALITY_APPROVED: 'marketing.quality_approved',
  MARKETING_CONTENT_PUBLISHED: 'marketing.content_published',
  MARKETING_METRICS_COLLECTED: 'marketing.metrics_collected',
  MARKETING_LEARNING_UPDATE: 'marketing.learning_update',
  MARKETING_KNOWLEDGE_BASE_UPDATED: 'marketing.knowledge_base_updated',
  MARKETING_EDITORIAL_CALENDAR_UPDATED: 'marketing.editorial_calendar_updated',
  MARKETING_DISTRIBUTION_PLAN_UPDATED: 'marketing.distribution_plan_updated',

  // Audit & Security
  AUDIT_LOG_RECORDED: 'audit.log_recorded',
  SECURITY_OVERRIDE_TRIGGERED: 'security.override_triggered',
} as const;

export type EventTopic = typeof EventTopics[keyof typeof EventTopics];

export interface AppEvent<T = unknown> {
  topic: EventTopic;
  payload: T;
  timestamp: string;
  correlationId?: string;
  sourceModule: string;
}

type EventListener<T = unknown> = (event: AppEvent<T>) => void;

class EventBus {
  private listeners: Map<string, Set<EventListener<any>>> = new Map();
  private history: AppEvent<any>[] = [];

  public subscribe<T = unknown>(topic: EventTopic | '*', listener: EventListener<T>): () => void {
    if (!this.listeners.has(topic)) {
      this.listeners.set(topic, new Set());
    }
    this.listeners.get(topic)!.add(listener);

    return () => {
      this.listeners.get(topic)?.delete(listener);
    };
  }

  public publish<T = unknown>(topic: EventTopic, payload: T, sourceModule = 'system'): AppEvent<T> {
    const event: AppEvent<T> = {
      topic,
      payload,
      timestamp: new Date().toISOString(),
      correlationId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sourceModule,
    };

    // Store bounded history
    this.history.unshift(event);
    if (this.history.length > 200) {
      this.history.pop();
    }

    // Notify specific listeners
    const specific = this.listeners.get(topic);
    if (specific) {
      specific.forEach((fn) => {
        try {
          fn(event);
        } catch (err) {
          console.error(`[EventBus] Error in listener for topic ${topic}:`, err);
        }
      });
    }

    // Notify wildcard listeners
    const wildcard = this.listeners.get('*');
    if (wildcard) {
      wildcard.forEach((fn) => {
        try {
          fn(event);
        } catch (err) {
          console.error(`[EventBus] Error in wildcard listener for topic ${topic}:`, err);
        }
      });
    }

    return event;
  }

  public getHistory(): AppEvent<any>[] {
    return [...this.history];
  }
}

export const eventBus = new EventBus();
