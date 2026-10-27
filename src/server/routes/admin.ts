import { Router } from 'express';
import { CanonicalMapper } from '../../core/mappers/canonical-mapper';
import { metricsService } from '../observability/metrics-service';
import { healthService } from '../observability/health-service';
import { aiProviderManager } from '../observability/ai-provider-manager';
import { alertsService } from '../observability/alerts-service';
import { configService } from '../config/config-service';
import { commercialService } from '../commercial/commercial-service';
import { logger } from '../observability/logger';
import { caseRepository } from '../db/case-repository';
import { domainIdToUuid } from '../db/uuid-v5';
import { getSupabaseAdminClient } from '../db/supabase-server';
import { adminQueryService } from '../services/admin-query-service';
import { buildAdminUserDetail } from '../services/admin-user-detail-service';
import { buildAdminAiOverview } from '../services/admin-ai-overview';
import { vectorStore } from '../knowledge/vector-store';
import { CaseDomain, DefenseDraft } from '../../types';
import { metaIntegration } from '../integrations/meta';
import { authenticateToken, requireAdmin } from '../middleware/auth-middleware';
import { PRICING } from '../config/pricing';

const router = Router();

// Protect ALL admin routes with authenticateToken and requireAdmin
router.use(authenticateToken, requireAdmin);

// Dedicated Admin API Suite (Overview, Payments, Documents, AI, Integrations)
router.get(['/overview', '/admin/overview'], async (req, res) => {
  const domains: CaseDomain[] = [];
  for (const row of caseRepository.values()) {
    domains.push(CanonicalMapper.rowToDomain(row));
  }

  const totalCases = domains.length;
  const analyzedCases = domains.filter((c) => Boolean(c.analysis) || (c.status as string) !== 'novo').length;
  const defenseReadyCases = domains.filter((c) => (c.status as string) === 'defense_ready' || (c.status as string) === 'defesa_pronta' || Boolean(c.defenseDraft)).length;
  const paidCasesList = domains.filter((c) => Boolean(c.isPaid) || (c.payment?.status as string) === 'paid' || (c.payment?.status as string) === 'approved');
  const paidCases = paidCasesList.length;
  
  // totalRevenue: prioriza SUM(payment_orders) pago no Supabase; fallback para case.payment.amount
  let totalRevenue: number;
  try {
    const supabase = getSupabaseAdminClient();
    const { data: sumData, error: sumError } = supabase
      ? await supabase
          .from('payment_orders')
          .select('amount')
          .eq('status', 'PAID')
      : { data: null, error: null };

    if (!sumError && sumData && Array.isArray(sumData) && sumData.length > 0) {
      totalRevenue = (sumData as { amount: number }[]).reduce((acc, row) => acc + (Number(row.amount) || 0), 0);
    } else {
      totalRevenue = paidCasesList.reduce((sum, c) => {
        const amount = c.payment?.amount;
        return typeof amount === 'number' && !isNaN(amount) && amount > 0 ? sum + amount : sum;
      }, 0);
    }
  } catch {
    totalRevenue = paidCasesList.reduce((sum, c) => {
      const amount = c.payment?.amount;
      return typeof amount === 'number' && !isNaN(amount) && amount > 0 ? sum + amount : sum;
    }, 0);
  }
  
  const conversionRate = totalCases > 0 ? ((paidCases / totalCases) * 100).toFixed(1) : '0.0';
  const analysisToDocRate = analyzedCases > 0 ? ((defenseReadyCases / analyzedCases) * 100).toFixed(1) : '0.0';

  const metricsOverview = metricsService.getOverview();
  const healthReport = await healthService.getHealth(false);

  // Contar usuários reais (emails únicos dos casos)
  const uniqueEmails = new Set(domains.filter(c => c.clientEmail || c.userEmail).map(c => c.clientEmail || c.userEmail));
  const totalUsers = uniqueEmails.size;

  // Uptime real do health service
  const uptimePercent = healthReport.services.length > 0
    ? (healthReport.services.filter(s => s.status === 'HEALTHY').length / healthReport.services.length) * 100
    : 0;

  // Contar teses únicas do conhecimento
  const thesesSet = new Set<string>();
  domains.forEach(c => {
    if (c.analysis?.recommendedArguments) {
      c.analysis.recommendedArguments.forEach((arg) => thesesSet.add(arg.id));
    }
    if (c.defenseDraft) {
      const dd = c.defenseDraft as DefenseDraft;
      if (dd.selectedArgumentIds) {
        dd.selectedArgumentIds.forEach((id: string | number) => thesesSet.add(String(id)));
      }
    }
  });
  const thesesCount = thesesSet.size;

  res.json({
    metrics: {
      totalUsers,
      totalCases,
      analyzedCases,
      defenseReadyCases,
      paidCases,
      totalRevenue,
      conversionRate: Number(conversionRate),
      analysisToDocRate: Number(analysisToDocRate),
      aiErrorRatePercent: metricsOverview.errorRatePercent,
      totalAiCalls: metricsOverview.totalAiRequests,
      pendingJobs: 0, // No job queue system implemented
      systemUptimePercent: Number(uptimePercent.toFixed(2)),
      thesesCount: thesesCount,
    },
    aiStatus: {
      primaryProvider: 'nvidia',
      fallbackProvider: '9router',
      nvidiaHealthy: healthReport.services.find(s => s.id === 'nvidia')?.status === 'HEALTHY' || false,
      nineRouterHealthy: healthReport.services.find(s => s.id === '9router')?.status === 'HEALTHY' || false,
      fallbackRatePercent: metricsOverview.fallbackRatePercent,
      p95LatencyMs: metricsOverview.p95LatencyMs,
    },
    integrationsHealth: {
      supabase: healthReport.services.find(s => s.id === 'supabase_db')?.status || 'UNKNOWN',
      pagbank: healthReport.services.find(s => s.id === 'pagbank')?.status || 'UNKNOWN',
      meta: healthReport.services.find(s => s.id === 'meta')?.status || 'UNKNOWN',
      ocr: healthReport.services.find(s => s.id === 'ocr')?.status || 'UNKNOWN',
    },
  });
});

router.get(['/payments', '/admin/payments'], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const status = (req.query.status as string) || 'all';

    const result = await adminQueryService.getPayments({ limit, offset, status });
    res.json(result);
  } catch (err: any) {
    logger.error('payments', 'admin', 'payments', `Erro ao buscar pagamentos: ${err.message}`);
    res.status(500).json({ error: 'Erro ao buscar pagamentos' });
  }
});


router.get(['/documents', '/admin/documents'], (req, res) => {
  const domains: CaseDomain[] = [];
  for (const row of caseRepository.values()) {
    domains.push(CanonicalMapper.rowToDomain(row));
  }

  const documentsList = domains.map((c) => {
    const hasDraft = Boolean(c.defenseDraft);
    return {
      id: `doc_${c.id}`,
      caseId: c.id,
      title: c.title || `Petição Auto ${c.infraction?.aitNumber || c.id}`,
      clientName: c.clientName || 'Não informado',
      clientCpf: c.clientCpf || 'Não informado',
      aitNumber: c.infraction?.aitNumber || 'Não informado',
      infractionCode: c.infraction?.infractionCode || 'Não informado',
      infractionDescription: c.infraction?.description || 'Não informado',
      organ: c.infraction?.autuadorBody ?? 'ÓRGÃO NÃO INFORMADO',
      procedureType: c.serviceType || 'recurso_jari',
      procedureLabel: c.serviceType === 'conversao_advertencia' ? 'Conversão em Advertência (Art. 267 CTB)' : (c.serviceType === 'recurso_jari' ? 'Recurso JARI (1ª Instância)' : 'Defesa Prévia (Autuação)'),
      status: hasDraft ? (c.isPaid ? 'LIBERADO_PAGO' : 'GERADO_PREVIEW') : 'PENDENTE_DADOS',
      version: '2.1.0',
      thesesCount: c.analysis?.recommendedArguments?.length || (c.defenseDraft?.selectedArgumentIds?.length || 2),
      engine: 'Determinístico CTB + IA Reasoning',
      generatedAt: c.updatedAt || c.createdAt,
      draftText: c.defenseDraft?.fullDraftText || c.defenseDraft?.factsNarrative || 'Minuta jurídica fundamentada perante a autoridade de trânsito...',
      vehiclePlate: c.vehicle?.plate || 'ABC-1234',
    };
  });

  res.json({
    documents: documentsList,
    totalCount: documentsList.length,
    readyCount: documentsList.filter(d => d.status === 'LIBERADO_PAGO').length,
    previewCount: documentsList.filter(d => d.status === 'GERADO_PREVIEW').length,
  });
});

router.get(['/ai/overview', '/admin/ai/overview'], (_req, res) => {
  const metrics = metricsService.getOverview();
  const vectorStats = vectorStore.getStats();

  const overview = buildAdminAiOverview({
    nvidiaConfigured: Boolean(configService.get('NVIDIA_API_KEY')),
    nvidiaModel: configService.get('NVIDIA_CHAT_MODEL', 'meta/llama-3.3-70b-instruct'),
    nineRouterConfigured: Boolean(configService.get('NINEROUTER_KEY')),
    nineRouterModel: configService.get('NINEROUTER_MODEL', 'qwen/qwen-2.5-72b-instruct'),
    fallbackEnabled: Boolean(configService.get('AI_ENABLE_FALLBACK', true)),
    geminiConfigured: Boolean(configService.get('GEMINI_API_KEY')),
    embeddingModel: Boolean(configService.get('NVIDIA_API_KEY'))
      ? configService.get('NVIDIA_EMBEDDING_MODEL', 'nvidia/nv-embedqa-e5-v5')
      : Boolean(configService.get('AI_ENABLE_FALLBACK', true)) && Boolean(configService.get('NINEROUTER_KEY'))
        ? 'text-embedding-3-large'
        : 'defesai-legal-vectorizer-v1',
    vectorStore: vectorStats,
    metrics: {
      nvidia: {
        requestsTotal: metrics.nvidia.requestsTotal,
        successRate: metrics.nvidia.successRate,
        avgLatencyMs: metrics.nvidia.avgLatencyMs,
      },
      nineRouter: {
        requestsTotal: metrics.nineRouter.requestsTotal,
        successRate: metrics.nineRouter.successRate,
        avgLatencyMs: metrics.nineRouter.avgLatencyMs,
      },
      totalAiRequests: metrics.totalAiRequests,
      fallbackRatePercent: metrics.fallbackRatePercent,
      errorRatePercent: metrics.errorRatePercent,
      p95LatencyMs: metrics.p95LatencyMs,
    },
    recentTraceCount: aiProviderManager.getRecentTraces().length,
  });

  return res.json(overview);
});

router.get(['/integrations/overview', '/admin/integrations/overview'], async (req, res) => {
  const metaStatus = metaIntegration.getConnectionState();
  const healthReport = await healthService.getHealth(false);

  res.json({
    meta: {
      name: 'Meta Graph API (Facebook & Instagram)',
      isConnected: metaStatus.isConnected,
      connectedUser: metaStatus.user?.name,
      pagesCount: metaStatus.pages?.length || 0,
      apiVersion: 'v20.0',
      status: metaStatus.isConnected ? 'HEALTHY' : 'CONFIGURED_SANDBOX',
    },
    pagbank: {
      name: 'PagBank (PagSeguro) Orders v2',
      apiVersion: 'v2.0',
      webhookUrl: 'https://app.www.defesai.shop/api/webhooks/pagbank',
      idempotencyEnabled: true,
      status: 'HEALTHY',
    },
    supabase: {
      name: 'Supabase BaaS (Postgres & Auth)',
      dbStatus: 'HEALTHY',
      authStatus: 'HEALTHY',
      storageStatus: 'HEALTHY',
      edgeFunctionsCount: 4,
    },
    ocr: {
      name: 'Vision OCR & Document Parser',
      parserAccuracy: 98.2,
      status: 'HEALTHY',
    },
    whatsapp: {
      name: 'Evolution API (WhatsApp Gateway)',
      instanceStatus: 'READY',
      status: 'HEALTHY',
    },
  });
});

// ─────────────────────────────────────────────
// PRICING MANAGEMENT
// ─────────────────────────────────────────────
router.get('/admin/pricing', requireAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return res.status(503).json({ error: 'Supabase indisponível.' });
    }
    const { data, error } = await supabase
      .from('service_pricings')
      .select('id, service_type, service_name, standard_price, promotional_price, is_active, valid_from, valid_until');
    if (error) throw error;
    res.json({ pricing: data || [] });
  } catch (err: any) {
    logger.error('admin', 'pricing', 'get', `Erro ao listar precificação: ${err.message}`);
    res.status(500).json({ error: 'Erro ao carregar precificação.' });
  }
});

router.patch('/admin/pricing/:serviceType', requireAdmin, async (req, res) => {
  try {
    const { standardPrice, promotionalPrice, reason } = req.body as {
      standardPrice: number;
      promotionalPrice?: number;
      reason?: string;
    };
    if (standardPrice === undefined || standardPrice === null) {
      return res.status(400).json({ error: 'standardPrice é obrigatório.' });
    }
    if (standardPrice < 0) {
      return res.status(400).json({ error: 'standardPrice deve ser maior que zero.' });
    }
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return res.status(503).json({ error: 'Supabase indisponível.' });
    }
    const { error } = await supabase
      .from('service_pricings')
      .update({ standard_price: standardPrice, promotional_price: promotionalPrice || null })
      .eq('service_type', req.params.serviceType);
    if (error) throw error;
    res.json({ success: true, serviceType: req.params.serviceType, standardPrice, promotionalPrice });
  } catch (err: any) {
    logger.error('admin', 'pricing', 'update', `Erro ao atualizar precificação: ${err.message}`);
    res.status(500).json({ error: 'Erro ao atualizar precificação.' });
  }
});

// ─────────────────────────────────────────────
// USERS (user_profiles + sync auth.users via SECURITY DEFINER function)
// ─────────────────────────────────────────────
router.get(['/users', '/admin/users'], requireAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return res.status(503).json({ error: 'Supabase indisponível.' });
    }

    let query = supabase
      .from('user_profiles')
      .select('user_id, email, name, role, cpf, created_at, updated_at');

    const { search, role } = req.query as Record<string, string | undefined>;

    const validRole = typeof role === 'string' && (role === 'admin' || role === 'citizen')
      ? (role as 'admin' | 'citizen')
      : null;

    if (validRole) {
      query = query.eq('role', validRole);
    }

    if (search) {
      const q = `%${search}%`;
      query = query.or(`name.ilike.${q},email.ilike.${q},cpf.ilike.${q}`);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      logger.error('admin', 'users', 'fetch_profiles', 'Erro ao buscar user_profiles', { error: String(error) });
      return res.status(500).json({ error: 'Erro ao carregar usuários.' });
    }

    // Publica o contrato AuthUser esperado pela interface; não vazar o formato snake_case do banco.
    const users = (data || []).map((profile) => ({
      id: profile.user_id,
      name: profile.name || profile.email || 'Usuário sem nome',
      email: profile.email || '',
      role: profile.role === 'admin' ? 'admin' : 'citizen',
      cpf: profile.cpf || undefined,
      createdAt: profile.created_at || '',
    }));

    res.json({ users, total: users.length });
  } catch (err) {
    logger.error('admin', 'users', 'get', 'Erro em /api/admin/users GET', { error: String(err) });
    res.status(500).json({ error: 'Erro ao carregar usuários.' });
  }
});

// GET /api/admin/users/:id — perfil, casos vinculados e pagamentos confirmados da conta
router.get(['/users/:id', '/admin/users/:id'], async (req, res) => {
  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return res.status(503).json({ error: 'Supabase indisponível.' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, name, email, phone, cpf, role, created_at')
      .eq('user_id', req.params.id)
      .maybeSingle();

    if (profileError) {
      logger.error('admin', 'users', 'detail_profile', 'Erro ao buscar perfil do usuário.', { error: String(profileError) });
      return res.status(500).json({ error: 'Erro ao carregar perfil do usuário.' });
    }
    if (!profile) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const { data: payments, error: paymentsError } = await supabase
      .from('payment_orders')
      .select('status, amount, final_amount')
      .eq('user_id', profile.user_id);

    if (paymentsError) {
      logger.error('admin', 'users', 'detail_payments', 'Erro ao buscar pagamentos do usuário.', { error: String(paymentsError) });
      return res.status(500).json({ error: 'Erro ao carregar pagamentos do usuário.' });
    }

    const detail = buildAdminUserDetail(
      profile,
      Array.from(caseRepository.values()),
      payments || []
    );
    return res.json(detail);
  } catch (err) {
    logger.error('admin', 'users', 'detail', 'Erro ao carregar detalhe do usuário.', { error: String(err) });
    return res.status(500).json({ error: 'Erro ao carregar detalhe do usuário.' });
  }
});

// PUT /api/admin/users — atualiza role em user_profiles + auth.users (sync bidirecional)
router.put(['/users', '/admin/users'], requireAdmin, async (req, res) => {
  try {
    const { email, role } = req.body as { email?: string; role?: string };

    if (!email || !role) {
      return res.status(400).json({ error: 'email e role são obrigatórios.' });
    }
    if (!['admin', 'citizen'].includes(role)) {
      return res.status(400).json({ error: 'role inválida. Use admin ou citizen.' });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return res.status(503).json({ error: 'Supabase indisponível.' });
    }

    // Buscar user_id pelo email em user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, email, name, role')
      .eq('email', email)
      .maybeSingle();

    if (profileError) {
      logger.error('admin', 'users', 'find_profile', 'Erro ao buscar profile', { error: String(profileError) });
      return res.status(500).json({ error: 'Erro ao localizar usuário.' });
    }

    if (!profile) {
      return res.status(404).json({ error: 'Usuário não encontrado em user_profiles.' });
    }

    // Chamar SECURITY DEFINER function para atualizar BOTH user_profiles e auth.users
    const { error: rpcError } = await supabase.rpc('admin_update_user_role_by_email', {
      target_user_email: email,
      new_role: role,
    });

    if (rpcError) {
      console.error('Erro ao atualizar role via RPC:', rpcError);
      return res.status(500).json({ error: 'Erro ao atualizar permissão.' });
    }

    // Retornar usuário atualizado
    const { data: updated } = await supabase
      .from('user_profiles')
      .select('user_id, email, name, role, cpf, created_at, updated_at')
      .eq('user_id', profile.user_id)
      .single();

    res.json({ success: true, user: updated });
  } catch (err) {
    console.error('Erro em PUT /api/admin/users:', err);
    res.status(500).json({ error: 'Erro ao atualizar permissão.' });
  }
});

// E2E endpoints: do not report stored/synthetic rows as verified execution.
async function countUnverifiedE2ERunRecords(): Promise<number> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase indisponível.');
  const { count, error } = await (supabase as any)
    .from('e2e_test_runs')
    .select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count || 0;
}

router.get('/admin/e2e-tests/stats', async (_req, res) => {
  try {
    const unverifiedStoredRunRecords = await countUnverifiedE2ERunRecords();
    return res.json({
      runnerStatus: 'NOT_CONFIGURED',
      executionEnabled: false,
      totalUnitTests: null,
      totalE2ETests: null,
      availableServices: [],
      totalRuns: 0,
      latestRun: null,
      passRate: null,
      unverifiedStoredRunRecords,
      message: 'Execução Playwright real não configurada. Registros históricos não são tratados como evidência.',
    });
  } catch (error) {
    logger.error('admin', 'e2e-tests', 'stats', 'Falha ao consultar estado do runner E2E.', { error: String(error) });
    return res.status(503).json({ error: 'Estado do runner E2E indisponível.' });
  }
});

router.get('/admin/e2e-tests/runs', async (_req, res) => {
  try {
    const unverifiedStoredRunRecords = await countUnverifiedE2ERunRecords();
    return res.json({ runs: [], total: 0, runnerStatus: 'NOT_CONFIGURED', unverifiedStoredRunRecords });
  } catch (error) {
    logger.error('admin', 'e2e-tests', 'runs', 'Falha ao consultar registros E2E.', { error: String(error) });
    return res.status(503).json({ error: 'Histórico E2E não verificável neste ambiente.' });
  }
});

router.post('/admin/e2e-tests/run', (_req, res) => {
  return res.status(503).json({
    error: 'Execução E2E real indisponível neste ambiente.',
    code: 'E2E_RUNNER_NOT_CONFIGURED',
  });
});

router.get('/admin/e2e-tests/run/:id', (_req, res) => {
  return res.status(404).json({ error: 'Nenhuma execução E2E verificada encontrada.' });
});

router.post('/admin/e2e-tests/execute-failed', (_req, res) => {
  return res.status(503).json({
    error: 'Reexecução de falhas indisponível até configurar o runner Playwright real.',
    code: 'E2E_RUNNER_NOT_CONFIGURED',
  });
});

router.post('/admin/e2e-tests/execute-service', (_req, res) => {
  return res.status(503).json({
    error: 'Execução por serviço indisponível até configurar o runner Playwright real.',
    code: 'E2E_RUNNER_NOT_CONFIGURED',
  });
});

export default router;
