import { Router } from 'express';
import { logger } from '../observability/logger';
import { marketingService } from '../services/marketing-service';
import { marketingOrchestrator } from '../workers/marketing-orchestrator.worker';
import { marketingMetricsCollector } from '../workers/marketing-metrics.worker';
import { metaPublisher } from '../workers/meta-publisher.worker';
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

router.put('/contents/:id', async (req, res) => {
  const { id } = req.params;
  const { status, channel, copyText, title, versionNote } = req.body ?? {};
  const allowed = ['rascunho', 'aprovado_qualidade', 'agendado', 'publicado'];
  const channels = ['instagram', 'blog', 'tiktok', 'linkedin', 'email'];
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

export default router;
