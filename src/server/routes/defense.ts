import { Router } from 'express';
import { CanonicalMapper } from '../../core/mappers/canonical-mapper';
import { RagPipeline } from '../../core/rag/rag-pipeline';
import { eventBus, EventTopics } from '../../core/events/topics';
import { LEGAL_ARGUMENTS } from '../../data/knowledge-base';
import { caseRepository } from '../db/case-repository';
import { auditService } from '../services/audit-service';
import { enrichDefenseWithGemini } from '../gemini';
import { logger } from '../observability/logger';
import { CaseDomain } from '../../types';

const router = Router();

// Defense Generation & AI Enrichment
router.post('/api/cases/:id/generate-defense', async (req, res) => {
  try {
    const row = caseRepository.get(req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Caso não encontrado' });
    }

    const domain = CanonicalMapper.rowToDomain(row);
    const { procedureType, selectedArgumentIds, applicantData, customFacts } = req.body;

    const selectedArgs = LEGAL_ARGUMENTS.filter((a) =>
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

    let defense = RagPipeline.generateDefenseDraft(
      domain.id,
      domain.infraction,
      domain.vehicle.plate,
      domain.vehicle.brandModel,
      resolvedApplicant,
      selectedArgs.length > 0 ? selectedArgs : domain.analysis?.recommendedArguments || [],
      procedureType || domain.serviceType
    );

    if (customFacts) {
      defense.factsNarrative = customFacts;
    }

    // Optionally enrich with Gemini AI for superior legal polish
    const enrichedGemini = await enrichDefenseWithGemini({
      infraction: domain.infraction,
      applicant: applicantData,
      arguments: selectedArgs,
      procedure: procedureType,
    });

    if (enrichedGemini) {
      defense.fullDraftText = enrichedGemini;
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
    caseRepository.set(domain.id, updatedRow);

    eventBus.publish(EventTopics.DEFENSE_DRAFT_FINALIZED, { caseId: domain.id }, 'system');

    logger.info('system', 'defense_generated', 'defense_generated', `Defesa gerada para o caso ${domain.id} com ${selectedArgs.length} teses jurídicas.`, {
      caseId: domain.id,
      stage: domain.currentStage,
      procedureType,
    });

    // Audit log for defense generation
    auditService.addAuditLog({
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: domain.clientName || 'Usuário',
      role: domain.isAnonymous ? 'citizen' : 'citizen',
      action: 'DEFENSE_GENERATED',
      targetResource: domain.id,
      ipHash: '9f83c68a765b1c44',
      details: `Defesa gerada para o caso ${domain.id} com ${selectedArgs.length} teses jurídicas.`,
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