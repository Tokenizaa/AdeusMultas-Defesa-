import { Router } from 'express';
import { logger } from '../observability/logger';
import { marketingService } from '../services/marketing-service';
import { marketingOrchestrator } from '../workers/marketing-orchestrator.worker';
import { marketingMetricsCollector } from '../workers/marketing-metrics.worker';
import { metaPublisher } from '../workers/meta-publisher.worker';
import { messagingService } from '../services/messaging-service';
import { eventBus, EventTopics } from '../../core/events/topics';
import { metaPublishingService } from '../../integrations/meta/publishing/meta-publishing-service';
import { getSupabaseServerClient } from '../db/supabase-server';

const router = Router();

// ─── Reload state from Supabase (dev/E2E helper) ──────────────────────
router.post('/reload', async (_req, res) => {
  try {
    await marketingService.reload();
    const agents = await marketingService.getMarketingAgents();
    const contents = await marketingService.getEditorialContents();
    res.json({
      success: true,
      agentsCount: agents.length,
      contentsCount: contents.length,
      message: 'State reloaded from Supabase.',
    });
  } catch (err: any) {
    logger.error('marketing', 'routes', 'reload_error', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Marketing OS (7 Autonomous Agents Organism) — estado REAL do orquestrador
// PUBLIC: health/metrics endpoint — no auth required
router.get('/status', async (_req, res) => {
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
  const result = await metaPublisher.enqueue({
    destination: destination || 'both',
    message: `${content.copyText}\n\n${(content.hashtags || []).join(' ')}`,
    linkUrl: 'https://www.defesai.shop',
  }, contentId);
  eventBus.publish(EventTopics.MARKETING_CONTENT_PUBLISHED, { contentId }, 'marketing_os');
  res.json(result);
});

// Publica os 7 dias direto do cache do marketingService (sem depender de Supabase query)
router.post('/publish-7-cache', async (_req, res) => {
  try {
    await marketingService.reload();
    const allContents = await marketingService.getEditorialContents();
    console.log('[publish-7-cache] total contents:', allContents.length);
    allContents.forEach(c => console.log('  ', c.id, c.status, c.title));

    const systemToken = process.env.META_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN;
    const igId = process.env.INSTAGRAM_ACCOUNT_ID;
    if (!systemToken || !igId) return res.status(500).json({ success: false, message: 'Credenciais Meta não configuradas no .env' });

    const DAY_IMAGES: Record<string, string> = {
      '17e1f2ef-e775-4478-b4e6-38cfa960eb9f': 'https://llmxnpgjpxcvyrqjkfwb.supabase.co/storage/v1/object/public/marketing-assets/17e1f2ef-e775-4478-b4e6-38cfa960eb9f_dia1.png',
      '6d246b93-d6e7-466d-a2d5-b1a2efdd1324': 'https://llmxnpgjpxcvyrqjkfwb.supabase.co/storage/v1/object/public/marketing-assets/6d246b93-d6e7-466d-a2d5-b1a2efdd1324_dia2.png',
      '40bd46d6-12ed-41df-a41e-d6e1ec62db64': 'https://llmxnpgjpxcvyrqjkfwb.supabase.co/storage/v1/object/public/marketing-assets/40bd46d6-12ed-41df-a41e-d6e1ec62db64_dia3.png',
      '22bd4696-1feb-4465-a640-577fc356e9b3': 'https://llmxnpgjpxcvyrqjkfwb.supabase.co/storage/v1/object/public/marketing-assets/22bd4696-1feb-4465-a640-577fc356e9b3_dia4.png',
      'e8e498f4-509d-4e7c-902e-2f0aac56cbdd': 'https://llmxnpgjpxcvyrqjkfwb.supabase.co/storage/v1/object/public/marketing-assets/e8e498f4-509d-4e7c-902e-2f0aac56cbdd_dia5.png',
      'be623f95-af80-425b-b60a-45b0e8e76a2d': 'https://llmxnpgjpxcvyrqjkfwb.supabase.co/storage/v1/object/public/marketing-assets/be623f95-af80-425b-b60a-45b0e8e76a2d_dia6.png',
      '5d26abae-fc97-418a-a8ec-ebde0ee4cae3': 'https://llmxnpgjpxcvyrqjkfwb.supabase.co/storage/v1/object/public/marketing-assets/5d26abae-fc97-418a-a8ec-ebde0ee4cae3_dia7.png',
    };

    const DAY_CNT_IDS = [
      'cnt-001', 'cnt-002', 'cnt-003', 'cnt-004',
      'cnt-1787878913493', 'cnt-1787878957279', 'cnt-1787878957681',
    ];

    const cntToUuid: Record<string, string> = {
      'cnt-001': '17e1f2ef-e775-4478-b4e6-38cfa960eb9f',
      'cnt-002': '6d246b93-d6e7-466d-a2d5-b1a2efdd1324',
      'cnt-003': '40bd46d6-12ed-41df-a41e-d6e1ec62db64',
      'cnt-004': '22bd4696-1feb-4465-a640-577fc356e9b3',
      'cnt-1787878913493': 'e8e498f4-509d-4e7c-902e-2f0aac56cbdd',
      'cnt-1787878957279': 'be623f95-af80-425b-b60a-45b0e8e76a2d',
      'cnt-1787878957681': '5d26abae-fc97-418a-a8ec-ebde0ee4cae3',
    };

    const results: { id: string; status: string; mediaId?: string; error?: string }[] = [];

    for (const item of allContents) {
      const uuid = cntToUuid[item.id];
      if (!uuid) continue;

      // Pega imagem: primeiro do cache do conteudo, depois do DAY_IMAGES
      const cachedImg = (item as any).image_url || (item as any).imageUrl || (item as any).mediaUrl;
      const imageUrl = cachedImg || DAY_IMAGES[uuid];

      if (!imageUrl) {
        results.push({ id: item.id, status: 'skipped', error: 'Sem imagem' });
        continue;
      }

      const hashtags = Array.isArray(item.hashtags) ? item.hashtags : [];
      const caption = `${item.copyText || item.title}\n\n${hashtags.join(' ')}`.trim();

      try {
        const pubResult = await metaPublishingService.publishToInstagram(igId, systemToken, { caption, imageUrl }, '1199235773284220');

        // Atualizar status no cache E no Supabase
        await marketingService.updateContent(item.id, { status: 'publicado' });
        const supabase = getSupabaseServerClient();
        if (supabase) {
          await supabase.from('editorial_content').update({ status: 'publicado', updated_at: new Date().toISOString() }).eq('id', item.id);
        }

        results.push({ id: item.id, status: 'published', mediaId: pubResult.mediaId });
      } catch (err: any) {
        results.push({ id: item.id, status: 'failed', error: err.message || String(err) });
      }
    }

    const published = results.filter((r) => r.status === 'published').length;
    res.json({ success: true, published, total: results.length, results });
  } catch (err: any) {
    logger.error('marketing', 'routes', 'publish_7_cache_failed', err.message);
    res.status(500).json({ success: false, message: err.message, stack: err.stack });
  }
});

// Publica direto no Instagram usando token do .env (bypass MetaPublisher travado)
router.post('/publish-direct', async (req, res) => {
  try {
    const { contentId } = req.body;
    if (!contentId) return res.status(400).json({ success: false, message: 'contentId é obrigatório' });

    const contents = await marketingService.getEditorialContents();
    const content = contents.find((c) => c.id === contentId);
    if (!content) return res.status(404).json({ success: false, message: 'Conteúdo não encontrado' });

    const systemToken = process.env.META_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN;
    const igId = process.env.INSTAGRAM_ACCOUNT_ID;
    const imageUrl = content.image_url || content.mediaUrl || content.imageUrl;

    if (!systemToken || !igId) return res.status(500).json({ success: false, message: 'META_ACCESS_TOKEN ou INSTAGRAM_ACCOUNT_ID não configurado' });
    if (!imageUrl) return res.status(400).json({ success: false, message: 'Conteúdo sem imagem — Instagram feed exige mídia visual' });

    const caption = `${content.copyText}\n\n${(content.hashtags || []).join(' ')}`.trim();
    const result = await metaPublishingService.publishToInstagram(igId, systemToken, { caption, imageUrl }, '1199235773284220');
    await marketingService.updateContent(contentId, { status: 'publicado' });

    res.json({ success: true, instagramMediaId: result.mediaId, publishedAt: new Date().toISOString(), destination: 'instagram' });
  } catch (err: any) {
    logger.error('marketing', 'routes', 'publish_direct_failed', err.message);
    res.status(err.statusCode === 401 ? 401 : 500).json({ success: false, message: err.message || 'Erro ao publicar no Instagram' });
  }
});

// Publica os 7 dias da campanha direto do Supabase com token do .env
router.post('/publish-7', async (_req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) return res.status(500).json({ success: false, message: 'Supabase não configurado' });

    const systemToken = process.env.META_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN;
    const igId = process.env.INSTAGRAM_ACCOUNT_ID;
    if (!systemToken || !igId) return res.status(500).json({ success: false, message: 'Credenciais Meta não configuradas no .env' });

    // Buscar todos os conteúdos agendados/rascunho do período da campanha
    const { data: rows, error } = await supabase
      .from('editorial_content')
      .select('*')
      .in('status', ['agendado', 'rascunho'])
      .order('scheduled_date', { ascending: true });

    if (error) throw error;
    if (!rows || rows.length === 0) return res.json({ success: true, published: 0, results: [], message: 'Nenhum conteúdo agendado' });

    const DAY_IMAGES: Record<string, string> = {
      '17e1f2ef-e775-4478-b4e6-38cfa960eb9f': 'https://llmxnpgjpxcvyrqjkfwb.supabase.co/storage/v1/object/public/marketing-assets/17e1f2ef-e775-4478-b4e6-38cfa960eb9f_dia1.png',
      '6d246b93-d6e7-466d-a2d5-b1a2efdd1324': 'https://llmxnpgjpxcvyrqjkfwb.supabase.co/storage/v1/object/public/marketing-assets/6d246b93-d6e7-466d-a2d5-b1a2efdd1324_dia2.png',
      '40bd46d6-12ed-41df-a41e-d6e1ec62db64': 'https://llmxnpgjpxcvyrqjkfwb.supabase.co/storage/v1/object/public/marketing-assets/40bd46d6-12ed-41df-a41e-d6e1ec62db64_dia3.png',
      '22bd4696-1feb-4465-a640-577fc356e9b3': 'https://llmxnpgjpxcvyrqjkfwb.supabase.co/storage/v1/object/public/marketing-assets/22bd4696-1feb-4465-a640-577fc356e9b3_dia4.png',
      'e8e498f4-509d-4e7c-902e-2f0aac56cbdd': 'https://llmxnpgjpxcvyrqjkfwb.supabase.co/storage/v1/object/public/marketing-assets/e8e498f4-509d-4e7c-902e-2f0aac56cbdd_dia5.png',
      'be623f95-af80-425b-b60a-45b0e8e76a2d': 'https://llmxnpgjpxcvyrqjkfwb.supabase.co/storage/v1/object/public/marketing-assets/be623f95-af80-425b-b60a-45b0e8e76a2d_dia6.png',
      '5d26abae-fc97-418a-a8ec-ebde0ee4cae3': 'https://llmxnpgjpxcvyrqjkfwb.supabase.co/storage/v1/object/public/marketing-assets/5d26abae-fc97-418a-a8ec-ebde0ee4cae3_dia7.png',
    };

    const DAY_CNT_IDS = [
      'cnt-001', 'cnt-002', 'cnt-003', 'cnt-004',
      'cnt-1787878913493', 'cnt-1787878957279', 'cnt-1787878957681',
    ];

    // Mapa cnt-* → UUID dos 7 dias
    const cntToUuid: Record<string, string> = {
      'cnt-001': '17e1f2ef-e775-4478-b4e6-38cfa960eb9f',
      'cnt-002': '6d246b93-d6e7-466d-a2d5-b1a2efdd1324',
      'cnt-003': '40bd46d6-12ed-41df-a41e-d6e1ec62db64',
      'cnt-004': '22bd4696-1feb-4465-a640-577fc356e9b3',
      'cnt-1787878913493': 'e8e498f4-509d-4e7c-902e-2f0aac56cbdd',
      'cnt-1787878957279': 'be623f95-af80-425b-b60a-45b0e8e76a2d',
      'cnt-1787878957681': '5d26abae-fc97-418a-a8ec-ebde0ee4cae3',
    };

    const results: { id: string; status: string; mediaId?: string; error?: string }[] = [];

    for (const item of rows) {
      const uuid = cntToUuid[item.id];
      if (!uuid) continue; // só publica os 7 dias

      const imageUrl = DAY_IMAGES[uuid];
      if (!imageUrl) {
        results.push({ id: item.id, status: 'skipped', error: 'Sem imagem para este dia' });
        continue;
      }

      const hashtags = Array.isArray(item.hashtags) ? item.hashtags : [];
      const caption = `${item.copy_text || item.title}\n\n${hashtags.join(' ')}`.trim();

      try {
        const pubResult = await metaPublishingService.publishToInstagram(igId, systemToken, { caption, imageUrl }, '1199235773284220');

        // Atualizar status no Supabase para publicado
        await supabase
          .from('editorial_content')
          .update({ status: 'publicado', updated_at: new Date().toISOString() })
          .eq('id', item.id);

        results.push({ id: item.id, status: 'published', mediaId: pubResult.mediaId });
      } catch (err: any) {
        const errMsg = err.message || String(err);
        results.push({ id: item.id, status: 'failed', error: errMsg });
      }
    }

    const published = results.filter((r) => r.status === 'published').length;
    res.json({ success: true, published, total: results.length, results });
  } catch (err: any) {
    logger.error('marketing', 'routes', 'publish_7_failed', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Força processamento da fila MetaPublisher (resume worker travado)
router.post('/process-queue', async (_req, res) => {
  try {
    const queueBefore = metaPublisher.getQueue().length;
    void metaPublisher['process']().catch(() => {});
    await new Promise((r) => setTimeout(r, 500));
    const queueAfter = metaPublisher.getQueue().length;
    res.json({ success: true, queueBefore, queueAfter, jobsProcessed: queueBefore - queueAfter });
  } catch (err: any) {
    logger.error('marketing', 'routes', 'process_queue_error', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
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
  
  const allowed = ['rascunho', 'aprovado_qualidade', 'reprovado_qualidade', 'agendado', 'publicado'];
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
  if (process.env.NODE_ENV === 'production') {
    return res.status(501).json({
      error: 'Endpoint de simulação indisponível em produção',
      message: 'Simulação de mensagens não permitida em ambiente de produção.',
    });
  }
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
