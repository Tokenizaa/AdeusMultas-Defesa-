import { Router } from 'express';
import { logger } from '../observability/logger';
import { marketingService } from '../services/marketing-service';
import { marketingOrchestrator } from '../workers/marketing-orchestrator.worker';
import { marketingMetricsCollector } from '../workers/marketing-metrics.worker';
import { metaPublisher } from '../workers/meta-publisher.worker';
import { messagingService } from '../services/messaging-service';
import { eventBus, EventTopics } from '../../core/events/topics';

const router = Router();

// Marketing OS (7 Autonomous Agents Organism) — estado REAL do orquestrador
router.get('/status', async (req, res) => {
  const agents = await marketingService.getMarketingAgents();
  const contents = await marketingService.getEditorialContents();
  const metrics = marketingMetricsCollector.getMetrics();
  const orchestratorStatus = marketingOrchestrator.getStatus();
  const published = contents.filter((c) => c.status === 'publicado').length;
  const scheduled = contents.filter((c) => c.status === 'agendado').length;

  res.json({
    organismHealth: orchestratorStatus.running ? 'running' : 'idle',
    activeAgentsCount: agents.filter((a) => a.status === 'running').length,
    cycleCount: orchestratorStatus.cycleCount,
    lastCycleAt: orchestratorStatus.lastCycleAt,
    agents,
    contents,
    brandIdentity: marketingService.getBrandIdentity(),
    overallMetrics: {
      monthlyReach: metrics.monthlyReach,
      newCasesGenerated: metrics.newCasesGenerated,
      conversionRate: metrics.conversionRate,
      publishedPosts: published,
      scheduledPosts: scheduled,
    },
    publisherQueue: metaPublisher.getQueue(),
    publisherJobs: metaPublisher.getJobHistory(),
  });
});

router.post('/cycle-tick', async (req, res) => {
  const result = await marketingOrchestrator.runCycle();
  const agents = await marketingService.getMarketingAgents();
  res.json({
    success: result.success,
    cycle: result.cycle,
    agents,
  });
});

router.post('/generate-content', async (req, res) => {
  const { theme, channel, format } = req.body;
  const result = await marketingService.generateContent(theme, channel, format);
  marketingMetricsCollector.collect().catch(() => {});
  res.json(result);
});

// Publish: enfileira no MetaPublisher (não bloqueia com chamada manual "Publicar")
router.post('/publish', async (req, res) => {
  const { contentId, destination } = req.body as { contentId: string; destination: 'facebook' | 'instagram' | 'both' };
  const contents = await marketingService.getEditorialContents();
  const content = contents.find((c) => c.id === contentId);
  if (!content) {
    res.status(404).json({ success: false, message: 'Conteúdo não encontrado' });
    return;
  }
  const result = metaPublisher.enqueue({
    destination: destination || 'both',
    message: `${content.copyText}\n\n${(content.hashtags || []).join(' ')}`,
    linkUrl: 'https://www.defesai.shop',
  }, contentId);
  eventBus.publish(EventTopics.MARKETING_CONTENT_PUBLISHED, { contentId }, 'marketing_os');
  res.json(result);
});

// Criar novo conteúdo manualmente ou via assistente
router.post('/contents', async (req, res) => {
  try {
    const { title, channel, format, copyText, scheduledDate, hashtags, imageUrl, mediaUrl, visualPrompt, status, legalTheme } = req.body ?? {};
    const created = await marketingService.createManualContent({
      title: title || 'Nova Publicação DefesAi',
      channel: channel || 'instagram',
      format: format || 'carrossel',
      copyText: copyText || '',
      scheduledDate: scheduledDate || new Date(Date.now() + 24 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 16),
      hashtags: Array.isArray(hashtags) ? hashtags : (hashtags ? String(hashtags).split(' ').filter(Boolean) : ['#AdeusMulta', '#CTB']),
      imageUrl: imageUrl || null,
      mediaUrl: mediaUrl || imageUrl || null,
      visualPrompt: visualPrompt || '',
      status: status || 'rascunho',
      legalTheme: legalTheme || title || 'Recurso de Multa e Direito de Trânsito',
    });
    res.status(201).json({ success: true, content: created });
  } catch (err: any) {
    logger.error('marketing', 'routes', 'create_content_error', `Erro ao criar conteúdo: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/contents/:id', async (req, res) => {
  const { id } = req.params;
  const {
    status,
    channel,
    copyText,
    title,
    versionNote,
    imageUrl,
    mediaUrl,
    scheduledDate,
    format,
    hashtags,
    visualPrompt,
    legalTheme,
  } = req.body ?? {};
  
  const allowed = ['rascunho', 'aprovado_qualidade', 'agendado', 'publicado'];
  const channels = ['instagram', 'blog', 'tiktok', 'linkedin', 'email', 'facebook'];
  const updates: Record<string, unknown> = {};

  if (status !== undefined) {
    if (!allowed.includes(status)) {
      res.status(400).json({ success: false, message: `status inválido. Permitidos: ${allowed.join(', ')}` });
      return;
    }
    updates.status = status;
  }
  if (channel !== undefined) {
    if (!channels.includes(channel)) {
      res.status(400).json({ success: false, message: `canal inválido. Permitidos: ${channels.join(', ')}` });
      return;
    }
    updates.channel = channel;
  }
  if (title !== undefined && String(title).trim() !== '') updates.title = String(title).trim();
  if (copyText !== undefined) updates.copyText = String(copyText);
  if (imageUrl !== undefined) updates.imageUrl = imageUrl;
  if (mediaUrl !== undefined) updates.mediaUrl = mediaUrl;
  if (scheduledDate !== undefined) {
    updates.scheduledDate = scheduledDate;
    updates.scheduled_date = scheduledDate;
  }
  if (format !== undefined) updates.format = format;
  if (hashtags !== undefined) {
    updates.hashtags = Array.isArray(hashtags) ? hashtags : String(hashtags).split(' ').filter(Boolean);
  }
  if (visualPrompt !== undefined) {
    updates.visualPrompt = visualPrompt;
    updates.visual_prompt = visualPrompt;
  }
  if (legalTheme !== undefined) {
    updates.legalTheme = legalTheme;
    updates.legal_theme = legalTheme;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ success: false, message: 'Nenhum campo válido para atualizar' });
    return;
  }
  const updated = await marketingService.updateContent(id, updates);
  if (!updated) {
    res.status(404).json({ success: false, message: 'Conteúdo não encontrado' });
    return;
  }
  // Registra versão quando houve edição de texto/título (agente: humano por padrão)
  if (versionNote && (copyText !== undefined || title !== undefined)) {
    marketingService.addContentVersion(id, {
      agent: versionNote.agent ?? 'humano',
      author: versionNote.author ?? 'Equipe',
      changes: versionNote.changes ?? 'Edição manual',
    });
  }
  res.json({ success: true, content: updated });
});

// Histórico de versões do conteúdo
router.get('/contents/:id/versions', async (req, res) => {
  const { id } = req.params;
  const contents = await marketingService.getEditorialContents();
  if (!contents.some((c) => c.id === id)) {
    res.status(404).json({ success: false, message: 'Conteúdo não encontrado' });
    return;
  }
  res.json({ success: true, versions: marketingService.getContentVersions(id) });
});

// =========================================================================
// UNIFIED INBOX & MESSAGING GATEWAY ROUTES
// =========================================================================

/**
 * GET /api/marketing/inbox/conversations
 * List active omnichannel conversations (WhatsApp, Messenger, Instagram) normalized with consistent conversationId
 */
router.get('/inbox/conversations', (req, res) => {
  const channel = req.query.channel as string | undefined;
  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;

  const rawConversations = messagingService.getConversations({ channel, status, search });
  
  // Normalização explícita com garantia de conversationId consistente para o Inbox
  const conversations = rawConversations.map((conv) => ({
    id: conv.id,
    conversationId: conv.id,
    contactId: conv.contactId,
    contact: conv.contact,
    lead: conv.lead,
    channel: conv.channel,
    channelLabel: conv.channelLabel || conv.channel,
    status: conv.status,
    unreadCount: conv.unreadCount,
    lastMessageText: conv.lastMessageText,
    lastMessageAt: conv.lastMessageAt,
    aiMode: conv.aiMode,
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt,
  }));

  res.json({
    success: true,
    count: conversations.length,
    total: conversations.length,
    channels: ['whatsapp_evolution', 'meta_messenger', 'instagram_direct', 'whatsapp_meta'],
    conversations,
  });
});

/**
 * GET /api/marketing/inbox/conversations/:id
 */
router.get('/inbox/conversations/:id', (req, res) => {
  const conv = messagingService.getConversationById(req.params.id);
  if (!conv) {
    return res.status(404).json({ success: false, message: 'Conversa não encontrada' });
  }
  const messages = messagingService.getMessages(conv.id);
  res.json({
    success: true,
    conversation: {
      ...conv,
      conversationId: conv.id,
    },
    messages,
  });
});

/**
 * GET /api/marketing/inbox/conversations/:id/messages
 */
router.get('/inbox/conversations/:id/messages', (req, res) => {
  const messages = messagingService.getMessages(req.params.id);
  res.json({ success: true, count: messages.length, messages });
});

/**
 * POST /api/marketing/inbox/conversations/:id/messages
 * Send outbound message to conversation through origin channel
 */
router.post('/inbox/conversations/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { text, senderId, senderName, mediaUrl } = req.body;

    if (!text && !mediaUrl) {
      return res.status(400).json({ success: false, message: 'Texto ou mediaUrl são obrigatórios' });
    }

    const result = await messagingService.sendMessage(
      id,
      text || '',
      senderId || 'atendente_humano',
      senderName || 'Atendente DefesAi',
      mediaUrl
    );

    res.json(result);
  } catch (err: any) {
    logger.error('marketing', 'inbox', 'send_error', `Erro ao enviar mensagem: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/marketing/inbox/conversations/:id
 * Update conversation status, aiMode, etc.
 */
router.patch('/inbox/conversations/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = messagingService.updateConversation(id, updates);
    res.json({ success: true, conversation: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/marketing/inbox/conversations/:id/lead
 * Qualify or update CRM lead from conversation
 */
router.post('/inbox/conversations/:id/lead', (req, res) => {
  try {
    const { id } = req.params;
    const conv = messagingService.getConversationById(id);
    if (!conv) {
      return res.status(404).json({ success: false, message: 'Conversa não encontrada' });
    }
    const lead = messagingService.createOrUpdateLead({
      contactId: conv.contactId,
      ...req.body,
    });
    // Atualiza conversa vinculada
    conv.lead = lead;
    res.json({ success: true, lead, conversation: conv });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/marketing/inbox/stats
 */
router.get('/inbox/stats', (_req, res) => {
  const stats = messagingService.getStats();
  res.json({ success: true, stats });
});

/**
 * POST /api/marketing/inbox/self-test
 * Run automated diagnostic test across all messaging channels
 */
router.post('/inbox/self-test', async (_req, res) => {
  try {
    const result = await messagingService.runSelfTest();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/marketing/inbox/simulate-inbound
 * Allows testing incoming traffic from drivers directly from UI
 */
router.post('/inbox/simulate-inbound', async (req, res) => {
  try {
    const { channel, senderName, text, phoneOrId, vehiclePlate } = req.body;
    const result = await messagingService.processIncomingMessage({
      channel: channel || 'whatsapp_evolution',
      externalMessageId: `sim_${Date.now()}`,
      externalContactId: phoneOrId || (channel?.includes('whatsapp') ? '5511999887766' : 'sim_user_123'),
      senderName: senderName || 'Motorista (Simulação)',
      text: text || 'Gostaria de recorrer de uma multa de trânsito.',
      timestamp: new Date().toISOString(),
    });

    if (vehiclePlate && result.contact) {
      result.contact.vehiclePlate = vehiclePlate;
      if (result.conversation.lead) {
        result.conversation.lead.vehiclePlate = vehiclePlate;
      }
    }

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
