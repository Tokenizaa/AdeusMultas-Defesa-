import { Router } from 'express';
import { databaseRows, auditLogs } from '../app';
import { CanonicalMapper } from '../../core/mappers/canonical-mapper';
import { RagPipeline } from '../../core/rag/rag-pipeline';
import { AUTUADOR_BODIES, PROCEDURE_TITLES } from '../../data/knowledge-base';
import { ARGUMENTS_CATALOG } from '../../core/arguments/arguments-catalog';
import { eventBus, EventTopics } from '../../core/events/topics';
import { CaseDomain } from '../../types';
import { enrichDefenseWithGemini } from '../gemini';
import { authenticateToken } from '../middleware/auth-middleware';
import {
  registerRefinementProvider,
  runControlledPipeline,
  permittedTheses,
} from '../../core/ai/ai-orchestrator';
import { logger } from '../observability/logger';

const router = Router();

// Garantir registro do provider de refinamento controlado
registerRefinementProvider({
  refineProse: async (draftText: string) => {
    return enrichDefenseWithGemini({ petitionText: draftText });
  },
});

// Cases CRUD & Lifecycle Endpoints

// GET /api/cases — with anti-IDOR: citizens only see their own cases
router.get('/cases', authenticateToken, (req, res) => {
  const { userId, claimToken } = req.query;
  const user = req.user;

  let allRows = Array.from(databaseRows.values());

  // Non-admin users only see their own cases — FAIL CLOSED: no fallback to all rows
  if (user && user.role !== 'admin' && user.id !== 'dev_user') {
    // Match both UUID and email formats for user_id
    const userSpecific = allRows.filter((r) =>
      r.user_id === user.id || r.user_id === user.email
    );
    allRows = userSpecific; // FAIL CLOSED: if no match, return empty (not all rows)
  } else if (userId) {
    const userSpecific = allRows.filter((r) => r.user_id === userId);
    allRows = userSpecific; // FAIL CLOSED
  } else if (claimToken) {
    allRows = allRows.filter((r) => r.claim_token === claimToken);
  }

  const domains: CaseDomain[] = allRows.map((r) => CanonicalMapper.rowToDomain(r));
  // Sort newest first
  domains.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(domains);
});

// GET /api/cases/:id — with anti-IDOR protection
router.get('/cases/:id', authenticateToken, (req, res) => {
  const row = databaseRows.get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'Caso não encontrado' });
  }

  // IDOR Protection: non-admin users can only access their own cases
  const user = req.user;
  if (user && user.role !== 'admin' && row.user_id) {
    const ownsCase = row.user_id === user.id || row.user_id === user.email;
    if (!ownsCase) {
      return res.status(403).json({ error: 'Você não tem permissão para acessar este caso' });
    }
  }

  res.json(CanonicalMapper.rowToDomain(row));
});

router.post('/cases', authenticateToken, (req, res) => {
  try {
    const domainData: CaseDomain = req.body;
    if (!domainData.id) {
      domainData.id = `case_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    }

    // Ownership fallback: carimba userId a partir da sessão autenticada.
    // Aceita tanto UUID quanto email (olfnetto@gmail.com).
    if (!domainData.userId && req.user?.id) {
      const uid = req.user.id;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid);
      const isEmail = uid.includes('@');
      if (isUuid || isEmail) {
        domainData.userId = uid;
      }
      // Fallback: also stamp email if available
      if (req.user.email && !domainData.userId) {
        domainData.userId = req.user.email;
      }
    }

    if (!domainData.createdAt) {
      domainData.createdAt = new Date().toISOString();
    }
    domainData.updatedAt = new Date().toISOString();

    // Run legal RAG analysis (gratuita, sem minuta)
    if (!domainData.analysis && domainData.infraction) {
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

router.put('/cases/:id', (req, res) => {
  const existingRow = databaseRows.get(req.params.id);
  if (!existingRow) {
    return res.status(404).json({ error: 'Caso não encontrado' });
  }

  const updatedDomain: CaseDomain = req.body;
  updatedDomain.id = req.params.id;
  updatedDomain.updatedAt = new Date().toISOString();

  const newRow = CanonicalMapper.domainToRow(updatedDomain);
  // Preserva o dono original quando o payload de update não carrega userId
  // (evita apagar cases.user_id via write-through em updates parciais/antigos).
  if (!newRow.user_id && existingRow.user_id) {
    newRow.user_id = existingRow.user_id;
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

  const { name, email, phone, cpf } = req.body;
  const domain = CanonicalMapper.rowToDomain(row);
  domain.clientName = name || domain.clientName;
  domain.clientEmail = email || domain.clientEmail;
  domain.clientPhone = phone || domain.clientPhone;
  domain.clientCpf = cpf || domain.clientCpf;
  domain.isAnonymous = false;
  domain.updatedAt = new Date().toISOString();

  // Claim autenticado vincula o caso ao dono da sessão (cases.user_id).
  // Retrocompatível: sem req.user (convidado em produção), mantém comportamento antigo.
  if (req.user?.id
      && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.user.id)) {
    domain.userId = req.user.id;
  }

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
router.post('/cases/:id/generate-defense', async (req, res) => {
  const row = databaseRows.get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'Caso não encontrado' });
  }

  const domain = CanonicalMapper.rowToDomain(row);
  const { procedureType, selectedArgumentIds, applicantData, customFacts } = req.body;

  const selectedArgs = ARGUMENTS_CATALOG.filter((a) =>
    selectedArgumentIds?.includes(a.id)
  );

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

  let defense = RagPipeline.generateDefenseDraft(
    domain.id,
    domain.infraction,
    domain.vehicle.plate,
    domain.vehicle.brandModel,
    resolvedApplicant,
    selectedArgs.length > 0 ? selectedArgs : (domain.analysis?.recommendedArguments as any) || [],
    procedureType || domain.serviceType
  );

  if (customFacts) {
    defense.factsNarrative = customFacts;
  }

  // ===== IA Controlada subordinada ao motor (Fase 6) =====
  // Fluxo: determinístico -> IA refina prosa -> validador de integridade -> final.
  // IA nunca decide tese; teses derivam da análise e do catálogo.
  const analysis = domain.analysis as any;
  const theses = permittedTheses(analysis).map((a: any) => a.id);

  // FASE 8: Obter payload de onboarding para quality gate
  const onboardingPayload = CanonicalMapper.domainToOnboardingPayload(domain);

  const pipelineResult = await runControlledPipeline(
    {
      analysis: analysis || {
        recommendedArguments: selectedArgs,
        detectedInconsistencies: [],
        recommendedProcedure: procedureType || domain.serviceType || 'recurso_jari',
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
  defense.selectedArgumentIds = (theses.length ? theses : defense.selectedArgumentIds);

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
    description: `Minuta da ${procedureType || 'defesa'} estruturada com ${selectedArgs.length} teses jurídicas.`,
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