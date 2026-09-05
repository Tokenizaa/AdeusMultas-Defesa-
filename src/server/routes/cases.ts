import { Router, Response } from 'express';
import { databaseRows, auditLogs } from '../app';
import { CanonicalMapper } from '../../core/mappers/canonical-mapper';
import { RagPipeline } from '../../core/rag/rag-pipeline';
import { AUTUADOR_BODIES, PROCEDURE_TITLES } from '../../data/knowledge-base';
import { ARGUMENTS_CATALOG } from '../../core/arguments/arguments-catalog';
import { eventBus, EventTopics } from '../../core/events/topics';
import { enrichDefenseWithGemini } from '../gemini';
import { authenticateToken, AuthenticatedUser } from '../middleware/auth-middleware';
import {
  registerRefinementProvider,
  runControlledPipeline,
  permittedTheses,
} from '../../core/ai/ai-orchestrator';
import { logger } from '../observability/logger';
import { CaseDomain, CaseRow } from '../../types';

const router = Router();

// Garantir registro do provider de refinamento controlado
registerRefinementProvider({
  refineProse: async (draftText: string) => {
    return enrichDefenseWithGemini({ petitionText: draftText });
  },
});

// ─── Regra central de autorização de casos (Fase 2 / IDOR) ───
// FAIL CLOSED:
// - sem usuário autenticado → sem acesso;
// - caso sem user_id → inacessível a usuários não-admin (ausência de owner
//   NUNCA é autorização);
// - identidade vem exclusivamente de req.user (validada pelo middleware),
//   nunca de headers, query ou body controlados pelo cliente.
// - admin tem acesso total.
function canAccessCase(user: AuthenticatedUser | undefined, row: CaseRow): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (!row.user_id) return false;
  // Compatibilidade com email: identidade derivada de req.user (validada), nunca do cliente.
  return row.user_id === user.id || (!!user.email && row.user_id === user.email);
}

// Resposta uniforme 401 (sem identidade) / 403 (sem permissão). Retorna true se negou.
function denyCaseAccess(
  user: AuthenticatedUser | undefined,
  res: Response
): boolean {
  if (!user) {
    res.status(401).json({ error: 'Não autenticado' });
    return true;
  }
  res.status(403).json({ error: 'Você não tem permissão para acessar este caso' });
  return true;
}

// Cases CRUD & Lifecycle Endpoints

// GET /api/cases — anti-IDOR: cidadãos veem somente os próprios casos.
router.get('/cases', authenticateToken, (req, res) => {
  const { userId, claimToken } = req.query;
  const user = req.user;

  let allRows = Array.from(databaseRows.values());

  if (user && user.role !== 'admin') {
    // Cidadão: somente casos próprios — FAIL CLOSED: sem match → lista vazia.
    const userSpecific = allRows.filter((r) =>
      r.user_id === user.id || (user.email && r.user_id === user.email)
    );
    allRows = userSpecific;
  } else if (user?.role === 'admin' && userId) {
    // Admin: filtro opcional por dono (identidade do cliente não é usada aqui).
    allRows = allRows.filter((r) => r.user_id === userId);
  } else if (!user && claimToken) {
    // Fluxo anônimo legítimo: claim token como prova de posse.
    allRows = allRows.filter((r) => r.claim_token === claimToken);
  } else if (!user) {
    // FAIL CLOSED: visitante sem claim token não lista casos.
    allRows = [];
  }

  const domains: CaseDomain[] = allRows.map((r) => CanonicalMapper.rowToDomain(r));
  // Sort newest first
  domains.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(domains);
});

// GET /api/cases/:id — proteção anti-IDOR via regra central
router.get('/cases/:id', authenticateToken, (req, res) => {
  const row = databaseRows.get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'Caso não encontrado' });
  }

  // Regra central de autorização: proprietário → 200, admin → 200,
  // outro usuário → 403, sem identidade válida → 401.
  if (!canAccessCase(req.user, row)) {
    return denyCaseAccess(req.user, res);
  }

  res.json(CanonicalMapper.rowToDomain(row));
});

router.post('/cases', authenticateToken, (req, res) => {
  try {
    const domainData: CaseDomain = req.body;
    if (!domainData.id) {
      domainData.id = `case_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    }

    // P0 (Fase 2): o cliente NUNCA escolhe o proprietário.
    // userId vindo do body é IGNORADO; user_id deriva exclusivamente de req.user.
    delete (domainData as any).userId;

    // P0 (Fase 3): o cliente NUNCA escolhe a autoridade jurídica.
    // analysis vinda do body é IGNORADA; a análise é SEMPRE produzida pelo servidor.
    delete (domainData as any).analysis;

    if (req.user?.id) {
      const uid = req.user.id;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid);
      const isEmail = uid.includes('@');
      if (isUuid || isEmail) {
        domainData.userId = uid;
      }
      // Fallback: também stamp email se disponível
      if (req.user.email && !domainData.userId) {
        domainData.userId = req.user.email;
      }
    }

    if (!domainData.createdAt) {
      domainData.createdAt = new Date().toISOString();
    }
    domainData.updatedAt = new Date().toISOString();

    // Run legal RAG analysis (gratuita, sem minuta) — SEMPRE pelo servidor.
    if (domainData.infraction) {
      domainData.analysis = RagPipeline.analyzeInfraction(domainData.id, domainData.infraction);
    }

    // Se o caso já é pago e os dados de qualificação reais do requerente estão presentes,
    // gera deterministicamente a minuta da defesa sem fabricar dados.
    if ((domainData.isPaid || domainData.status === 'defesa_pronta') && !domainData.defenseDraft && domainData.applicant) {
      const a = domainData.applicant;
      if (a.applicantName && a.applicantCpf && a.applicantCnh && a.addressStreet && a.addressCityState) {
        domainData.defenseDraft = RagPipeline.generateDefenseDraft(
          domainData.id,
          domainData.infraction,
          domainData.vehicle?.plate || 'SEM PLACA',
          domainData.vehicle?.brandModel || 'Veículo',
          {
            name: a.applicantName,
            cpf: a.applicantCpf,
            rg: a.applicantRg,
            cnh: a.applicantCnh,
            category: a.cnhCategory,
            address: `${a.addressStreet}, ${a.addressNumber || ''}`.trim(),
            cityState: a.addressCityState,
          },
          domainData.analysis?.recommendedArguments || [],
          domainData.serviceType || 'recurso_jari'
        );
      }
    }

    const row = CanonicalMapper.domainToRow(domainData);
    databaseRows.set(row.id, row);

    eventBus.publish(EventTopics.CASE_CREATED, { caseId: domainData.id, isAnonymous: domainData.isAnonymous }, 'case_engine');

    auditLogs.unshift({
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: domainData.clientName || 'Anônimo',
      role: domainData.isAnonymous ? 'citizen' : 'citizen',
      action: 'CASE_CREATED',
      targetResource: domainData.id,
      ipHash: '9f83c68a765b1c41',
      details: `Caso ${domainData.title} criado no estágio ${domainData.currentStage}.`,
      gdprCompliant: true,
    });

    res.status(201).json(CanonicalMapper.rowToDomain(row));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/cases/:id', authenticateToken, (req, res) => {
  const existingRow = databaseRows.get(req.params.id);
  if (!existingRow) {
    return res.status(404).json({ error: 'Caso não encontrado' });
  }

  // P0 (Fase 2): autorização ANTES de qualquer alteração.
  if (!canAccessCase(req.user, existingRow)) {
    return denyCaseAccess(req.user, res);
  }

  const updatedDomain: CaseDomain = req.body;
  updatedDomain.id = req.params.id;
  updatedDomain.updatedAt = new Date().toISOString();

  const newRow = CanonicalMapper.domainToRow(updatedDomain);
  // P0: o proprietário é preservado SEMPRE a partir do registro existente.
  // userId/user_id do body (mesmo `userId: "outro-usuario"`) é ignorado —
  // troca de ownership via PUT é impossível.
  newRow.user_id = existingRow.user_id;
  
  // P0 (Fase 3): a autoridade jurídica (analysis) é preservada do registro existente.
  // O cliente NÃO pode substituir/injetar analysis via PUT.
  // Se houver infraction nova, recalcular análise pelo servidor.
  if (updatedDomain.infraction) {
    newRow.analysis_json = JSON.stringify(
      RagPipeline.analyzeInfraction(req.params.id, updatedDomain.infraction)
    );
  } else {
    newRow.analysis_json = existingRow.analysis_json;
  }
  
  databaseRows.set(req.params.id, newRow);

  eventBus.publish(EventTopics.CASE_UPDATED, { caseId: req.params.id }, 'case_engine');

  res.json(CanonicalMapper.rowToDomain(newRow));
});

// Claim Anonymous Case (Modal Cadastro -> Link account)
router.post('/cases/:id/claim', authenticateToken, (req, res) => {
  const row = databaseRows.get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'Caso anônimo não encontrado' });
  }

  // P0 (Fase 2): claim exige identidade autenticada — após o claim,
  // user_id deriva exclusivamente de req.user.
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const isOwner =
    row.user_id === req.user.id || (req.user.email && row.user_id === req.user.email);

  // Caso já vinculado a outro usuário → negar SEMPRE (inclusive admin).
  if (row.user_id && !isOwner) {
    return res.status(403).json({ error: 'Caso já vinculado a outro usuário' });
  }

  // Caso anônimo → claim somente mediante claim_token válido como prova de posse.
  // Email/CPF/nome enviados pelo cliente NÃO são prova de posse.
  if (!row.user_id) {
    const { claimToken } = req.body;
    if (!row.claim_token || claimToken !== row.claim_token) {
      return res.status(403).json({ error: 'Token de claim inválido ou ausente' });
    }
  }

  const { name, email, phone, cpf } = req.body;
  const domain = CanonicalMapper.rowToDomain(row);
  domain.clientName = name || domain.clientName;
  domain.clientEmail = email || domain.clientEmail;
  domain.clientPhone = phone || domain.clientPhone;
  domain.clientCpf = cpf || domain.clientCpf;
  domain.isAnonymous = false;
  domain.updatedAt = new Date().toISOString();

  // Claim autenticado vincula o caso ao dono da sessão (cases.user_id).
  domain.userId = req.user.id;

  domain.timeline.push({
    id: `tl_${Date.now()}`,
    title: 'Cadastro Concluído',
    description: `Caso vinculado ao motorista ${domain.clientName}.`,
    timestamp: new Date().toISOString(),
    type: 'system',
  });

  const updatedRow = CanonicalMapper.domainToRow(domain);
  databaseRows.set(domain.id, updatedRow);

  eventBus.publish(EventTopics.CASE_CLAIMED, { caseId: domain.id, email }, 'auth_engine');

  res.json(domain);
});

// Defense Generation & AI Enrichment
router.post('/cases/:id/generate-defense', authenticateToken, async (req, res) => {
  const row = databaseRows.get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'Caso não encontrado' });
  }

  // P0 (Fase 2): autorização ANTES de qualquer processamento
  // (RAG, minuta, IA, alteração do caso). Usuário A no caso de B → rejeitado.
  if (!canAccessCase(req.user, row)) {
    return denyCaseAccess(req.user, res);
  }

  const domain = CanonicalMapper.rowToDomain(row);
  const { procedureType: _procedureTypeIgnored, selectedArgumentIds: _selectedArgumentIdsIgnored, applicantData, customFacts } = req.body;

  // P0 (Fase 3): autoridade jurídica canônica — o servidor é a única fonte de teses.
  // selectedArgumentIds do body é IGNORADO (compatibilidade API: aceita mas não usa).
  // procedimento do body é IGNORADO se houver recommendedProcedure na análise canônica.
  const canonicalAnalysis = domain.analysis as any;
  const canonicalArguments = (canonicalAnalysis?.recommendedArguments as any) || [];
  const canonicalProcedure = canonicalAnalysis?.recommendedProcedure || domain.serviceType || 'recurso_jari';

  // Dados de qualificação do requerente DEVEM vir do onboarding real (body ou
  // domain.applicant). NUNCA fabricar CNH/cidade. FAIL CLOSED: ausentes → erro.
  const b = applicantData as any;
  const resolvedApplicant = (b && (b.name !== undefined || b.applicantName !== undefined))
    ? {
        name: b.name || b.applicantName || '',
        cpf: b.cpf || b.applicantCpf || '',
        rg: b.rg || b.applicantRg,
        cnh: b.cnh || b.applicantCnh || '',
        category: b.category || b.cnhCategory,
        address: b.address || (b.addressStreet ? `${b.addressStreet}, ${b.addressNumber || ''}` : ''),
        cityState: b.cityState || b.addressCityState || '',
      }
    : domain.applicant
      ? {
          name: domain.applicant.applicantName,
          cpf: domain.applicant.applicantCpf,
          rg: domain.applicant.applicantRg,
          cnh: domain.applicant.applicantCnh,
          category: domain.applicant.cnhCategory,
          address: `${domain.applicant.addressStreet}, ${domain.applicant.addressNumber || ''}`,
          cityState: domain.applicant.addressCityState,
        }
      : undefined;

  if (!resolvedApplicant || !resolvedApplicant.name || !resolvedApplicant.cpf || !resolvedApplicant.cnh || !resolvedApplicant.address || !resolvedApplicant.cityState) {
    return res.status(400).json({ error: 'Dados de qualificação do requerente incompletos. Preencha os dados complementares antes de gerar a defesa.' });
  }

  if (b && (!domain.applicant || !domain.applicant.applicantCnh)) {
    domain.applicant = {
      applicantName: resolvedApplicant.name,
      applicantCpf: resolvedApplicant.cpf,
      applicantRg: resolvedApplicant.rg,
      applicantCnh: resolvedApplicant.cnh,
      cnhCategory: resolvedApplicant.category,
      applicantPhone: domain.clientPhone || '',
      applicantEmail: domain.clientEmail || '',
      addressStreet: resolvedApplicant.address,
      addressNumber: '',
      addressNeighborhood: '',
      addressZipCode: '',
      addressCityState: resolvedApplicant.cityState,
      factsNarrative: customFacts,
    };
  }

  // Geração da minuta SOMENTE com teses canônicas derivadas da análise do servidor.
  let defense = RagPipeline.generateDefenseDraft(
    domain.id,
    domain.infraction,
    domain.vehicle.plate,
    domain.vehicle.brandModel,
    resolvedApplicant,
    canonicalArguments,
    canonicalProcedure
  );

  if (customFacts) {
    defense.factsNarrative = customFacts;
  }

  // ===== IA Controlada subordinada ao motor (Fase 6) =====
  // Fluxo: determinístico -> IA refina prosa -> validador de integridade -> final.
  // IA nunca decide tese; teses derivam da análise e do catálogo.
  // A análise autoritativa é a canônica do domínio (servidor), nunca a do request.
  const theses = permittedTheses(canonicalAnalysis).map((a: any) => a.id);

  // FASE 8: Obter payload de onboarding para quality gate
  const onboardingPayload = CanonicalMapper.domainToOnboardingPayload(domain);

  const pipelineResult = await runControlledPipeline(
    {
      analysis: canonicalAnalysis || {
        recommendedArguments: canonicalArguments,
        detectedInconsistencies: [],
        recommendedProcedure: canonicalProcedure,
        overallSuccessRate: 50,
        caseId: domain.id,
        id: `anl_${Date.now()}`,
        competentBody: domain.infraction?.autuadorBody || '',
        summaryReasoning: 'análise gerada para defesa',
        createdAt: new Date().toISOString(),
      },
      draft: defense,
      onboardingPayload,
      canonicalCase: domain,
    },
    { tone: 'formal_rigorous' }
  );

  defense.fullDraftText = pipelineResult.draft.fullDraftText;
  // selectedArgumentIds no response reflete APENAS a seleção autorizada pelo servidor.
  defense.selectedArgumentIds = theses.length ? theses : canonicalArguments.map((a: any) => a.id);

  if (pipelineResult.controlled.reason === 'REFINED_VALID') {
    logger.info('system', 'ai_controlled_refinement', 'ai_controlled_refinement', 'Refinamento de prosa da IA aplicado após validação de integridade.', { caseId: domain.id });
  } else if (pipelineResult.controlled.reason === 'PROVIDER_UNAVAILABLE') {
    logger.info('system', 'ai_fallback_deterministic', 'ai_fallback_deterministic', 'IA indisponível; minuta determinística mantida.', { caseId: domain.id });
  }

  domain.defenseDraft = defense;
  domain.currentStage = 3;
  domain.status = 'defesa_pronta';
  domain.updatedAt = new Date().toISOString();

  domain.timeline.push({
    id: `tl_def_${Date.now()}`,
    title: 'Petição Administrativa Atualizada',
    description: `Minuta da ${canonicalProcedure} estruturada com ${canonicalArguments.length} teses jurídicas canônicas.`,
    timestamp: new Date().toISOString(),
    type: 'defense',
  });

  const updatedRow = CanonicalMapper.domainToRow(domain);
  databaseRows.set(domain.id, updatedRow);

  eventBus.publish(EventTopics.DEFENSE_DRAFT_FINALIZED, { caseId: domain.id }, 'defense_engine');

  res.json({
    success: true,
    defenseDraft: defense,
    case: domain,
  });
});

export default router;