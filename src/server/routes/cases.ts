import { randomUUID } from 'node:crypto';
import { Router, Response } from 'express';
import { databaseRows, auditLogs } from '../app';
import { CanonicalMapper } from '../../core/mappers/canonical-mapper';
import { RagPipeline } from '../../core/rag/rag-pipeline';
import { eventBus, EventTopics } from '../../core/events/topics';
import { envelopeRepository } from '../db/envelope-repository';
import { enrichDefenseWithGemini } from '../gemini';
import { authenticateToken, AuthenticatedUser } from '../middleware/auth-middleware';
import {
  registerRefinementProvider,
  runControlledPipeline,
  permittedTheses,
} from '../../core/ai/ai-orchestrator';
import { logger } from '../observability/logger';
import { CaseDomain, CaseRow } from '../../types';
import { computeDefenseIntegrityHash, hasValidDefenseIntegrity } from '../../core/documents/defense-integrity';

const router = Router();

registerRefinementProvider({
  refineProse: async (draftText: string) => {
    return enrichDefenseWithGemini({ petitionText: draftText });
  },
});

function isCanonicalUserId(value: string | undefined): boolean {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function canAccessCase(user: AuthenticatedUser | undefined, row: CaseRow): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (!row.user_id || !isCanonicalUserId(user.id)) return false;
  return row.user_id === user.id;
}

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

router.get('/cases', authenticateToken, (req, res) => {
  const { userId } = req.query;
  const user = req.user;
  let allRows = Array.from(databaseRows.values());

  if (user && user.role !== 'admin') {
    allRows = isCanonicalUserId(user.id)
      ? allRows.filter((r) => r.user_id === user.id)
      : [];
  } else if (user?.role === 'admin' && userId) {
    allRows = allRows.filter((r) => r.user_id === userId);
  } else if (!user) {
    allRows = [];
  }

  const domains: CaseDomain[] = allRows.map((r) => CanonicalMapper.rowToDomain(r));
  domains.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(domains);
});

router.get('/cases/:id', authenticateToken, (req, res) => {
  const row = databaseRows.get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'Caso não encontrado' });
  }

  if (!canAccessCase(req.user, row)) {
    return denyCaseAccess(req.user, res);
  }

  const domain = CanonicalMapper.rowToDomain(row);

  if (domain.defenseDraft && domain.analysis) {
    const draft = domain.defenseDraft as any;

    if (!hasValidDefenseIntegrity(draft, domain.analysis as any)) {
      domain.defenseDraft = undefined;
      return res.status(409).json({
        error: 'Documento de defesa inválido ou adulterado. Gere novamente a defesa antes de consultá-la.',
        code: 'DEFENSE_INTEGRITY_FAILED',
      });
    }

    const authorizedTheses = permittedTheses(domain.analysis);
    const authorizedIds = new Set(authorizedTheses.map((t) => t.id));
    const sanitizedIds = domain.defenseDraft.selectedArgumentIds.filter((id) =>
      authorizedIds.has(id)
    );

    if (sanitizedIds.length !== domain.defenseDraft.selectedArgumentIds.length) {
      domain.defenseDraft = undefined;
      return res.status(409).json({
        error: 'Documento de defesa contém teses não autorizadas pela análise jurídica canônica.',
        code: 'DEFENSE_AUTHORIZATION_FAILED',
      });
    }
  }

  res.json(domain);
});

router.post('/cases', authenticateToken, async (req, res) => {
  try {
    const domainData: CaseDomain = req.body;

    if (!isCanonicalUserId(req.user?.id)) {
      return res.status(401).json({
        error: 'Identidade de usuário inválida para criação do caso.',
        code: 'CANONICAL_USER_ID_REQUIRED',
      });
    }

    domainData.id = domainData.id || `case_${randomUUID()}`;
    delete (domainData as any).userId;
    delete (domainData as any).analysis;
    domainData.userId = req.user.id;

    if (!domainData.createdAt) {
      domainData.createdAt = new Date().toISOString();
    }
    domainData.updatedAt = new Date().toISOString();

    if (domainData.infraction) {
      domainData.analysis = RagPipeline.analyzeInfraction(domainData.id, domainData.infraction);
    }

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
        (domainData.defenseDraft as any).integrityHash = computeDefenseIntegrityHash(
          domainData.defenseDraft as any,
          domainData.analysis as any
        );
      }
    }

    const row = CanonicalMapper.domainToRow(domainData);
    await databaseRows.set(row.id, row);

    eventBus.publish(EventTopics.CASE_CREATED, { caseId: domainData.id, isAnonymous: domainData.isAnonymous }, 'case_engine');

    auditLogs.unshift({
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: domainData.clientName || 'Anônimo',
      role: 'citizen',
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

router.put('/cases/:id', authenticateToken, async (req, res) => {
  const existingRow = databaseRows.get(req.params.id);
  if (!existingRow) {
    return res.status(404).json({ error: 'Caso não encontrado' });
  }

  if (!canAccessCase(req.user, existingRow)) {
    return denyCaseAccess(req.user, res);
  }

  const updatedDomain: CaseDomain = req.body;
  updatedDomain.id = req.params.id;
  updatedDomain.updatedAt = new Date().toISOString();
  updatedDomain.userId = existingRow.user_id;

  const newRow = CanonicalMapper.domainToRow(updatedDomain);
  newRow.user_id = existingRow.user_id;

  if (updatedDomain.infraction) {
    newRow.analysis_json = JSON.stringify(
      RagPipeline.analyzeInfraction(req.params.id, updatedDomain.infraction)
    );
  } else {
    newRow.analysis_json = existingRow.analysis_json;
  }

  await databaseRows.set(req.params.id, newRow);

  eventBus.publish(EventTopics.CASE_UPDATED, { caseId: req.params.id }, 'case_engine');

  res.json(CanonicalMapper.rowToDomain(newRow));
});

router.delete('/cases/:id', authenticateToken, async (req, res) => {
  const row = databaseRows.get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'Caso não encontrado' });
  }

  if (!canAccessCase(req.user, row)) {
    return denyCaseAccess(req.user, res);
  }

  const anonymizedRow: typeof row = {
    ...row,
    client_name: '[REMOVIDO]',
    client_email: undefined,
    client_phone: undefined,
    client_cpf: undefined,
    user_id: undefined,
    applicant_json: undefined,
    defense_draft_json: undefined,
    analysis_json: undefined,
    evidence_json: undefined,
    ocr_auxiliary_json: undefined,
    timeline_json: undefined,
    claim_token: undefined,
    commercial_offer_id: undefined,
    formal_flaws_json: undefined,
    protocol_info_json: undefined,
    real_driver_name: undefined,
    real_driver_cpf: undefined,
    real_driver_cnh: undefined,
    cellphone_circumstance: undefined,
    updated_at: new Date().toISOString(),
  };

  await databaseRows.set(req.params.id, anonymizedRow);

  const caseUuid = row.id;
  await envelopeRepository.anonymizeEnvelopesByCaseId(caseUuid);

  auditLogs.unshift({
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: req.user?.email || req.user?.id || 'unknown',
    role: req.user?.role === 'admin' ? 'admin' : 'citizen',
    action: 'CASE_ANONYMIZED',
    targetResource: req.params.id,
    ipHash: '9f83c68a765b1c41',
    details: 'Caso anonimizado via requisição LGPD Art. 18 — dados pessoais removidos.',
    gdprCompliant: true,
  });

  eventBus.publish(EventTopics.CASE_DELETED, { caseId: req.params.id }, 'case_engine');

  res.json({ success: true, message: 'Dados pessoais removidos. Caso retido para conformidade legal.' });
});

router.post('/cases/:id/claim', authenticateToken, async (req, res) => {
  const row = databaseRows.get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'Caso anônimo não encontrado' });
  }

  if (!isCanonicalUserId(req.user?.id)) {
    return res.status(401).json({
      error: 'Identidade de usuário inválida para vinculação do caso.',
      code: 'CANONICAL_USER_ID_REQUIRED',
    });
  }

  const isOwner = row.user_id === req.user.id;

  if (row.user_id && !isOwner) {
    return res.status(403).json({ error: 'Caso já vinculado a outro usuário' });
  }

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
  domain.userId = req.user.id;

  domain.timeline.push({
    id: `tl_${Date.now()}`,
    title: 'Cadastro Concluído',
    description: `Caso vinculado ao motorista ${domain.clientName}.`,
    timestamp: new Date().toISOString(),
    type: 'system',
  });

  const updatedRow = CanonicalMapper.domainToRow(domain);
  await databaseRows.set(domain.id, updatedRow);

  eventBus.publish(EventTopics.CASE_CLAIMED, { caseId: domain.id, email }, 'auth_engine');

  res.json(domain);
});

router.post('/cases/:id/generate-defense', authenticateToken, async (req, res) => {
  const row = databaseRows.get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'Caso não encontrado' });
  }

  if (!canAccessCase(req.user, row)) {
    return denyCaseAccess(req.user, res);
  }

  const domain = CanonicalMapper.rowToDomain(row);
  const { applicantData, customFacts } = req.body;

  const canonicalAnalysis = domain.analysis as any;
  const canonicalArguments = (canonicalAnalysis?.recommendedArguments as any) || [];
  const canonicalProcedure = canonicalAnalysis?.recommendedProcedure || domain.serviceType || 'recurso_jari';

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
    canonicalArguments,
    canonicalProcedure
  );

  if (customFacts) {
    defense.factsNarrative = customFacts;
  }

  const theses = permittedTheses(canonicalAnalysis).map((a: any) => a.id);
  const onboardingPayload = CanonicalMapper.domainToOnboardingPayload(domain);

  let pipelineResult: any;
  try {
    pipelineResult = await runControlledPipeline(
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
  } catch (err: any) {
    if (err.message?.startsWith('Quality Gate BLOCKED:')) {
      logger.warn('system', 'quality-gate', 'blocked', err.message, { caseId: domain.id });
      return res.status(422).json({
        error: 'Documento não atende aos critérios de qualidade obrigatórios.',
        details: err.message.replace('Quality Gate BLOCKED: ', ''),
        code: 'QUALITY_GATE_BLOCKED',
      });
    }
    throw err;
  }

  defense.fullDraftText = pipelineResult.draft.fullDraftText;
  defense.selectedArgumentIds = theses.length ? theses : canonicalArguments.map((a: any) => a.id);
  (defense as any).integrityHash = computeDefenseIntegrityHash(
    defense as any,
    canonicalAnalysis as any
  );

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
  await databaseRows.set(domain.id, updatedRow);

  eventBus.publish(EventTopics.DEFENSE_DRAFT_FINALIZED, { caseId: domain.id }, 'defense_engine');

  res.json({
    success: true,
    defenseDraft: defense,
    case: domain,
  });
});

export default router;
