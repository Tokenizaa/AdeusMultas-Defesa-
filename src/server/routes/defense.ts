import { Router, Response } from 'express';
import { CanonicalMapper } from '../../core/mappers/canonical-mapper';
import { RagPipeline } from '../../core/rag/rag-pipeline';
import { eventBus, EventTopics } from '../../core/events/topics';
import { caseRepository } from '../db/case-repository';
import { auditService } from '../services/audit-service';
import { enrichDefenseWithGemini } from '../gemini';
import {
  registerRefinementProvider,
  runControlledPipeline,
  permittedTheses,
} from '../../core/ai/ai-orchestrator';
import { logger } from '../observability/logger';
import { CaseDomain } from '../../types';
import { authenticateToken, AuthenticatedUser } from '../middleware/auth-middleware';

const router = Router();

// Centralized case ownership check (mirrors cases.ts)
function canAccessCase(user: AuthenticatedUser | undefined, row: any): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (!row.user_id) return false;
  return row.user_id === user.id || (!!user.email && row.user_id === user.email);
}

function denyCaseAccess(user: AuthenticatedUser | undefined, res: Response): boolean {
  if (!user) {
    res.status(401).json({ error: 'Não autenticado' });
    return true;
  }
  res.status(403).json({ error: 'Você não tem permissão para acessar este caso' });
  return true;
}

// ===== IA Controlada (Fase 6) =====
// A IA atua SOMENTE como refinadora de prosa sobre a minuta determinística.
let providerRegistered = false;
function ensureRefinementProviderRegistered() {
  if (providerRegistered) return;
  providerRegistered = true;
  registerRefinementProvider({
    refineProse: async (draftText: string) => {
      return enrichDefenseWithGemini({ petitionText: draftText });
    },
  });
}
ensureRefinementProviderRegistered();

// Defense Generation & AI Enrichment
router.post('/api/cases/:id/generate-defense', authenticateToken, async (req, res) => {
  try {
    const row = caseRepository.get(req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Caso não encontrado' });
    }

    if (!canAccessCase(req.user, row)) {
      return denyCaseAccess(req.user, res);
    }

    const domain = CanonicalMapper.rowToDomain(row);
    const analysis = domain.analysis as any;

    // Legal authority is server-owned. The request cannot select procedure,
    // legal arguments, analysis, or applicant identity for the defense.
    if (!analysis || !Array.isArray(analysis.recommendedArguments)) {
      return res.status(409).json({
        error: 'Análise jurídica canônica indisponível. Não é possível gerar a defesa com autoridade jurídica incompleta.',
      });
    }

    const procedureType = analysis.recommendedProcedure || domain.serviceType;
    if (!procedureType) {
      return res.status(409).json({
        error: 'Procedimento jurídico canônico indisponível. Não é possível gerar a defesa.',
      });
    }

    // Applicant qualification is also canonical case data. Ignore applicantData
    // supplied by the client so another identity cannot be injected into a case.
    const a = domain.applicant;
    const resolvedApplicant = a
      ? {
          name: a.applicantName,
          cpf: a.applicantCpf,
          rg: a.applicantRg,
          cnh: a.applicantCnh,
          category: a.cnhCategory,
          address: `${a.addressStreet}, ${a.addressNumber || ''}`,
          cityState: a.addressCityState,
        }
      : undefined;

    if (!resolvedApplicant || !resolvedApplicant.name || !resolvedApplicant.cpf || !resolvedApplicant.cnh || !resolvedApplicant.address || !resolvedApplicant.cityState) {
      return res.status(400).json({ error: 'Dados de qualificação do requerente incompletos. Preencha os dados complementares antes de gerar a defesa.' });
    }

    // Only arguments permitted by the server-side legal analysis may enter the draft.
    const permittedArguments = permittedTheses(analysis);
    if (!Array.isArray(permittedArguments)) {
      return res.status(409).json({ error: 'Teses jurídicas permitidas indisponíveis. Geração bloqueada.' });
    }

    let defense = RagPipeline.generateDefenseDraft(
      domain.id,
      domain.infraction,
      domain.vehicle.plate,
      domain.vehicle.brandModel,
      resolvedApplicant,
      permittedArguments as any,
      procedureType
    );

    // customFacts are user-provided factual context only; they never select
    // legal authority, procedure, applicant, or theses. Bound the input size.
    if (typeof req.body?.customFacts === 'string' && req.body.customFacts.length <= 10000) {
      defense.factsNarrative = req.body.customFacts;
    }

    // ===== IA Controlada subordinada ao motor =====
    const theses = permittedArguments.map((a: any) => a.id);
    const onboardingPayload = CanonicalMapper.domainToOnboardingPayload(domain);

    const pipelineResult = await runControlledPipeline(
      {
        analysis,
        draft: defense,
        onboardingPayload,
        canonicalCase: domain,
      },
      { tone: 'formal_rigorous' }
    );

    defense.fullDraftText = pipelineResult.draft.fullDraftText;
    defense.selectedArgumentIds = theses.length ? theses : defense.selectedArgumentIds;

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
      description: `Minuta da ${procedureType} estruturada com ${theses.length} teses jurídicas.`,
      timestamp: new Date().toISOString(),
      type: 'defense',
    });

    const updatedRow = CanonicalMapper.domainToRow(domain);
    await caseRepository.set(domain.id, updatedRow);

    eventBus.publish(EventTopics.DEFENSE_DRAFT_FINALIZED, { caseId: domain.id }, 'system');

    logger.info('system', 'defense_generated', 'defense_generated', `Defesa gerada para o caso ${domain.id} com ${theses.length} teses jurídicas.`, {
      caseId: domain.id,
      stage: domain.currentStage,
      procedureType,
    });

    auditService.addAuditLog({
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: domain.clientName || 'Usuário',
      role: domain.isAnonymous ? 'citizen' : 'citizen',
      action: 'DEFENSE_GENERATED',
      targetResource: domain.id,
      ipHash: '9f83c68a765b1c44',
      details: `Defesa gerada para o caso ${domain.id} com ${theses.length} teses jurídicas.`,
      gdprCompliant: true,
    });

    res.json({
      success: true,
      defenseDraft: defense,
      case: domain,
    });
  } catch (error: any) {
    logger.error('system', 'defense_generation_failed', 'defense_generation_failed', `Falha ao gerar defesa: ${error.message}`, {
      caseId: req.params.id,
      error: error.message,
    });
    res.status(500).json({ error: error.message || 'Erro ao gerar defesa' });
  }
});

export default router;
