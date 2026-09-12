/**
 * @file messaging.worker.ts
 * WhatsApp Messaging Worker — handles outbound messages, media, documents
 */

import { createWorker, getQueue, QUEUE_NAMES } from '../config/redis';
import { whatsappService } from '../services/whatsapp-service';

const QUEUE = QUEUE_NAMES.MESSAGING;

// ==========================================
// Job Types
// ==========================================

interface SendMessageJobData {
  to: string;
  type: 'text' | 'image' | 'document' | 'list' | 'buttons' | 'location' | 'contact';
  content: {
    body?: string;
    caption?: string;
    mediaUrl?: string;
    filename?: string;
    mimetype?: string;
    headerText?: string;
    footerText?: string;
    buttons?: Array<{ id: string; title: string }>;
    sections?: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>;
  };
  caseId?: string;
  templateName?: string;
  templateParams?: string[];
}

interface MessageStatusJobData {
  messageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
}

// ==========================================
// Send Message Worker
// ==========================================

export const messagingWorker = createWorker<SendMessageJobData>(QUEUE, async ({ data, attemptsMade }) => {
  console.log(`[Messaging Worker] Sending ${data.type} to ${data.to} (attempt ${attemptsMade + 1})`);
  
  let result;
  
  switch (data.type) {
    case 'text':
      result = await whatsappService.sendText(data.to, data.content.body || '');
      break;
    case 'image':
      result = await whatsappService.sendImage(data.to, data.content.mediaUrl!, data.content.caption);
      break;
    case 'document':
      result = await whatsappService.sendDocument(data.to, data.content.mediaUrl!, data.content.filename || 'document.pdf');
      break;
    case 'list':
      result = await whatsappService.sendList(
        data.to,
        data.content.headerText || '',
        data.content.body || '',
        data.content.footerText || '',
        data.content.sections || []
      );
      break;
    case 'buttons':
      result = await whatsappService.sendButtons(
        data.to,
        data.content.headerText || '',
        data.content.body || '',
        data.content.footerText || '',
        data.content.buttons || []
      );
      break;
    default:
      throw new Error(`Unsupported message type: ${data.type}`);
  }
  
  console.log(`[Messaging Worker] Message sent: ${result.messageId}`);
  
  return { messageId: result.messageId, status: 'sent' };
}, {
  concurrency: 5,
  limiter: { max: 30, duration: 60000 }, // 30 messages/min
});

// ==========================================
// Template Message Worker (HSM)
// ==========================================

export const templateMessageWorker = createWorker<SendMessageJobData>(`${QUEUE}-template`, async ({ data }) => {
  if (!data.templateName) throw new Error('Template name required for HSM');
  
  const result = await whatsappService.sendTemplate(
    data.to,
    data.templateName,
    data.templateParams || []
  );
  
  return { messageId: result.messageId, status: 'sent' };
}, {
  concurrency: 10,
});

// ==========================================
// Status Update Worker (from webhooks)
// ==========================================

export const messageStatusWorker = createWorker<MessageStatusJobData>(`${QUEUE}-status`, async ({ data }) => {
  console.log(`[Messaging Worker] Status update: ${data.messageId} -> ${data.status}`);
  // Update message status in database (handled by service)
  return { messageId: data.messageId, status: data.status };
}, {
  concurrency: 20,
});

// ==========================================
// Scheduler
// ==========================================

const messagingScheduler = getQueue(QUEUE);

// Retry failed messages every 5 minutes
messagingScheduler.add('retry-failed', { action: 'retry-failed' }, {
  repeat: { pattern: '*/5 * * * *' },
});

export { QUEUE as MESSAGING_QUEUE };