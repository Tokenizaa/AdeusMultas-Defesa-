import { Router } from 'express';
import { knowledgeService } from '../knowledge/knowledge-service';
import { SearchKnowledgeOptions } from '../knowledge/types';

const router = Router();

/**
 * CTB Endpoints
 */
router.get('/ctb', (req, res) => {
  try {
    const articles = knowledgeService.getAllCtbArticles();
    res.json(articles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch CTB articles' });
  }
});

router.get('/ctb/:id', (req, res) => {
  try {
    const article = knowledgeService.getCtbArticleById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'CTB article not found' });
    }
    res.json(article);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch CTB article' });
  }
});

router.get('/ctb/search', async (req, res) => {
  try {
    const { q, topK, topN, threshold } = req.query;
    const options: SearchKnowledgeOptions = {
      topK: topK ? parseInt(topK as string) : undefined,
      topN: topN ? parseInt(topN as string) : undefined,
      threshold: threshold ? parseFloat(threshold as string) : undefined,
    };
    
    const results = await knowledgeService.searchCtbArticles(q as string, options);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Invalid search parameters' });
  }
});

/**
 * Infractions Endpoints
 */
router.get('/infractions', (req, res) => {
  try {
    const infractions = knowledgeService.getAllInfractions();
    res.json(infractions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch infractions' });
  }
});

router.get('/infractions/:id', (req, res) => {
  try {
    const infraction = knowledgeService.getInfractionById(req.params.id);
    if (!infraction) {
      return res.status(404).json({ error: 'Infraction not found' });
    }
    res.json(infraction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch infraction' });
  }
});

router.get('/infractions/search', async (req, res) => {
  try {
    const { q, topK, topN, threshold } = req.query;
    const options: SearchKnowledgeOptions = {
      topK: topK ? parseInt(topK as string) : undefined,
      topN: topN ? parseInt(topN as string) : undefined,
      threshold: threshold ? parseFloat(threshold as string) : undefined,
    };
    
    const results = await knowledgeService.searchInfractions(q as string, options);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Invalid search parameters' });
  }
});

router.get('/infractions/:infractionCode/arguments', (req, res) => {
  try {
    const argumentsList = knowledgeService.getArgumentsByInfractionCode(req.params.infractionCode);
    res.json(argumentsList);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch arguments for infraction' });
  }
});

/**
 * Arguments Endpoints
 */
router.get('/arguments', (req, res) => {
  try {
    const argumentsList = knowledgeService.getAllArguments();
    res.json(argumentsList);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch arguments' });
  }
});

router.get('/arguments/:id', (req, res) => {
  try {
    const argument = knowledgeService.getArgumentById(req.params.id);
    if (!argument) {
      return res.status(404).json({ error: 'Argument not found' });
    }
    res.json(argument);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch argument' });
  }
});

router.get('/arguments/search', async (req, res) => {
  try {
    const { q, topK, topN, threshold } = req.query;
    const options: SearchKnowledgeOptions = {
      topK: topK ? parseInt(topK as string) : undefined,
      topN: topN ? parseInt(topN as string) : undefined,
      threshold: threshold ? parseFloat(threshold as string) : undefined,
    };
    
    const results = await knowledgeService.searchArguments(q as string, options);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Invalid search parameters' });
  }
});

/**
 * Templates Endpoints
 */
router.get('/templates', (req, res) => {
  try {
    const templates = knowledgeService.getAllTemplates();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

router.get('/templates/:id', (req, res) => {
  try {
    const template = knowledgeService.getTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

router.get('/templates/search', async (req, res) => {
  try {
    const { q, topK, topN, threshold } = req.query;
    const options: SearchKnowledgeOptions = {
      topK: topK ? parseInt(topK as string) : undefined,
      topN: topN ? parseInt(topN as string) : undefined,
      threshold: threshold ? parseFloat(threshold as string) : undefined,
    };
    
    const results = await knowledgeService.searchTemplates(q as string, options);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Invalid search parameters' });
  }
});

/**
 * Blocks Endpoints
 */
router.get('/blocks', (req, res) => {
  try {
    const blocks = knowledgeService.getAllBlocks();
    res.json(blocks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch blocks' });
  }
});

router.get('/blocks/:id', (req, res) => {
  try {
    const block = knowledgeService.getBlockById(req.params.id);
    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }
    res.json(block);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch block' });
  }
});

router.get('/blocks/search', async (req, res) => {
  try {
    const { q, topK, topN, threshold } = req.query;
    const options: SearchKnowledgeOptions = {
      topK: topK ? parseInt(topK as string) : undefined,
      topN: topN ? parseInt(topN as string) : undefined,
      threshold: threshold ? parseFloat(threshold as string) : undefined,
    };
    
    const results = await knowledgeService.searchBlocks(q as string, options);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Invalid search parameters' });
  }
});

/**
 * Procedures Endpoints
 */
router.get('/procedures', (req, res) => {
  try {
    const procedures = knowledgeService.getAllProcedures();
    res.json(procedures);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch procedures' });
  }
});

router.get('/procedures/:id', (req, res) => {
  try {
    const procedure = knowledgeService.getProcedureById(req.params.id);
    if (!procedure) {
      return res.status(404).json({ error: 'Procedure not found' });
    }
    res.json(procedure);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch procedure' });
  }
});

router.get('/procedures/search', async (req, res) => {
  try {
    const { q, topK, topN, threshold } = req.query;
    const options: SearchKnowledgeOptions = {
      topK: topK ? parseInt(topK as string) : undefined,
      topN: topN ? parseInt(topN as string) : undefined,
      threshold: threshold ? parseFloat(threshold as string) : undefined,
    };
    
    const results = await knowledgeService.searchProcedures(q as string, options);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Invalid search parameters' });
  }
});

/**
 * Graph Endpoints
 */
router.get('/graph', (req, res) => {
  try {
    const graph = knowledgeService.getAllGraphRelationships();
    res.json(graph);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch graph relationships' });
  }
});

router.get('/graph/infraction/:id', (req, res) => {
  try {
    const relationships = knowledgeService.getGraphRelationshipsByInfractionId(req.params.id);
    res.json(relationships);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch relationships for infraction' });
  }
});

router.get('/graph/search', async (req, res) => {
  try {
    const { q, topK, topN, threshold } = req.query;
    const options: SearchKnowledgeOptions = {
      topK: topK ? parseInt(topK as string) : undefined,
      topN: topN ? parseInt(topN as string) : undefined,
      threshold: threshold ? parseFloat(threshold as string) : undefined,
    };
    
    const results = await knowledgeService.searchGraphRelationships(q as string, options);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Invalid search parameters' });
  }
});

/**
 * Global Search Endpoint across all categories
 */
router.get('/search', async (req, res) => {
  try {
    const { q, view } = req.query;
    const options: SearchKnowledgeOptions = {};
    const query = (q as string) || '';
    
    if (view === 'ctb') {
      const results = await knowledgeService.searchCtbArticles(query, options);
      return res.json(results);
    }
    if (view === 'infractions') {
      const results = await knowledgeService.searchInfractions(query, options);
      return res.json(results);
    }
    if (view === 'arguments') {
      const results = await knowledgeService.searchArguments(query, options);
      return res.json(results);
    }
    if (view === 'templates') {
      const results = await knowledgeService.searchTemplates(query, options);
      return res.json(results);
    }
    if (view === 'blocks') {
      const results = await knowledgeService.searchBlocks(query, options);
      return res.json(results);
    }
    if (view === 'procedures') {
      const results = await knowledgeService.searchProcedures(query, options);
      return res.json(results);
    }
    if (view === 'graph') {
      const results = await knowledgeService.searchGraphRelationships(query, options);
      return res.json(results);
    }
    
    const [ctb, infractions, argsList, templates, blocks, procedures, graph] = await Promise.all([
      knowledgeService.searchCtbArticles(query, options),
      knowledgeService.searchInfractions(query, options),
      knowledgeService.searchArguments(query, options),
      knowledgeService.searchTemplates(query, options),
      knowledgeService.searchBlocks(query, options),
      knowledgeService.searchProcedures(query, options),
      knowledgeService.searchGraphRelationships(query, options)
    ]);
    
    res.json({
      ctb,
      infractions,
      argsList,
      templates,
      blocks,
      procedures,
      graph
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search knowledge' });
  }
});

/**
 * Document Engine Preview Endpoint
 */
router.post('/engine/preview', (req, res) => {
  try {
    const { templateId, data = {} } = req.body;
    
    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }
    
    const template = knowledgeService.getTemplateById(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    let preview = template.rawTemplate || template.templateText || template.content || '';
    
    // Replace variables in the format {{variable_name}}
    const variableMatches = Array.from(preview.matchAll(/\{\{([^}]+)\}\}/g));
    for (const match of variableMatches) {
      const variableName = (match as any)[1].trim();
      const value = data[variableName] || `{{${variableName}}}`;
      preview = preview.replace((match as any)[0], String(value));
    }
    
    res.json({
      templateId,
      templateName: template.title || template.name,
      preview,
      variablesUsed: Object.keys(data),
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate document preview' });
  }
});

// =========================================================================
// SISTEMA NACIONAL DE MONITORAMENTO JURÍDICO-OPERACIONAL (SNM-JO) ENDPOINTS
// =========================================================================

import {
  getAllNationalStates,
  getAllNationalOrgans,
  getAllNationalCetrans,
  OFFICIAL_SOURCES_REGISTRY,
  WeeklyMonitorScheduler,
  ReviewQueueService,
  NotificationAlertService,
  TemporalKnowledgeEngine,
} from '../../core/knowledge';

router.get('/national/states', (req, res) => {
  try {
    const states = getAllNationalStates();
    res.json(states);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch national states' });
  }
});

router.get('/national/organs', (req, res) => {
  try {
    const organs = getAllNationalOrgans();
    res.json(organs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch national organs' });
  }
});

router.get('/national/cetrans', (req, res) => {
  try {
    const cetrans = getAllNationalCetrans();
    res.json(cetrans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch national cetrans' });
  }
});

router.get('/national/sources', (req, res) => {
  try {
    res.json(OFFICIAL_SOURCES_REGISTRY);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sources registry' });
  }
});

router.post('/monitor/run', async (req, res) => {
  try {
    const timeoutMs = req.body.timeoutMs ? parseInt(req.body.timeoutMs) : 4000;
    const result = await WeeklyMonitorScheduler.runCycle(undefined, timeoutMs);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to run monitoring cycle' });
  }
});

router.get('/monitor/history', (req, res) => {
  try {
    const history = WeeklyMonitorScheduler.getCycleHistory();
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch monitor history' });
  }
});

router.get('/monitor/latest-report', (req, res) => {
  try {
    const report = WeeklyMonitorScheduler.getLatestReport();
    res.json({ reportMarkdown: report });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch latest report' });
  }
});

router.get('/monitor/review-queue', (req, res) => {
  try {
    const items = ReviewQueueService.getAll();
    const pending = ReviewQueueService.getPending();
    res.json({ items, pendingCount: pending.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch review queue' });
  }
});

router.post('/monitor/review-queue/:id/approve', (req, res) => {
  try {
    const { reviewer, notes } = req.body;
    const success = ReviewQueueService.approve(req.params.id, reviewer, notes);
    if (!success) {
      return res.status(404).json({ error: 'Review item not found' });
    }
    res.json({ success: true, message: 'Item approved and applied to active registry.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve review item' });
  }
});

router.post('/monitor/review-queue/:id/reject', (req, res) => {
  try {
    const { reviewer, reason } = req.body;
    const success = ReviewQueueService.reject(req.params.id, reviewer, reason);
    if (!success) {
      return res.status(404).json({ error: 'Review item not found' });
    }
    res.json({ success: true, message: 'Item rejected.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject review item' });
  }
});

router.post('/monitor/review-queue/:id/adjust', (req, res) => {
  try {
    const { adjustedData, reviewer, notes } = req.body;
    const success = ReviewQueueService.adjustAndApprove(req.params.id, adjustedData, reviewer, notes);
    if (!success) {
      return res.status(404).json({ error: 'Review item not found' });
    }
    res.json({ success: true, message: 'Item adjusted and approved.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to adjust review item' });
  }
});

router.post('/monitor/review-queue/:id/false-positive', (req, res) => {
  try {
    const { notes } = req.body;
    const success = ReviewQueueService.markFalsePositive(req.params.id, notes);
    if (!success) {
      return res.status(404).json({ error: 'Review item not found' });
    }
    res.json({ success: true, message: 'Item marked as false positive.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark false positive' });
  }
});

router.get('/monitor/alerts', (req, res) => {
  try {
    const alerts = NotificationAlertService.getAlertsHistory();
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

router.post('/temporal/resolve', (req, res) => {
  try {
    const context = req.body;
    const result = TemporalKnowledgeEngine.getEffectiveKnowledge(context);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve temporal knowledge' });
  }
});

export default router;

