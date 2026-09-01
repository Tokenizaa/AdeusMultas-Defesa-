/**
 * @file deterministic-pipeline.test.ts
 * Testes de Integridade E2E e Validação da Arquitetura Jurídica Determinística
 *
 * Cobertura obrigatória (Especificação §17-19):
 *  - Pipeline completo: DADOS → REGRAS → VÍCIOS → TESES → BLOCOS → DOCUMENTO → VALIDAÇÃO → (IA OPCIONAL) → DOCUMENTO FINAL
 *  - Teste IA OFFLINE: documento canônico completo sem IA
 *  - Teste IA MALICIOSA: adulteração de dados protegidos → rejeição + fallback
 *  - Testes negativos: dados obrigatórios ausentes, DATA_GAP, tags pendentes, etc.
 *  - Cadeia rastreável: FACT → RULE → FLAW → ARGUMENT → BLOCK
 */

import { describe, it, expect, afterEach } from 'vitest';
import { ExpertRuleEngine } from '../../src/core/rules/rule-engine';
import { DocumentAssemblyEngine } from '../../src/core/documents/document-assembly-engine';
import { validateAnalysis, validateDraft } from '../../src/core/validation/integrity-validator';
import {
  runControlledPipeline,
  registerRefinementProvider,
  applyAsyncRefinement,
} from '../../src/core/ai/ai-orchestrator';
import { ARGUMENTS_CATALOG } from '../../src/core/arguments/arguments-catalog';
import { PROCEDURES_CATALOG } from '../../src/core/procedures/procedures-catalog';
import { InfractionData } from '../../src/types';

// ============================================================================
// Fixtures compartilhados
// ============================================================================

const applicantWatermark = {
  name: 'Netto Teste 84721',
  cpf: '123.456.789-00',
  rg: '12.345.678-9',
  cnh: '98765432100',
  category: 'AB',
  address: 'Av. Paulista, 1000, Bela Vista',
  cityState: 'São Paulo/SP',
};

const baseSpeedInfraction: InfractionData = {
  aitNumber: 'AIT-RAD-1234',
  dateTime: '2026-08-01',
  inmetroAferitionDate: '2025-06-01',
  speedLimit: 60,
  measuredSpeed: 78,
  consideredSpeed: 71,
  radarEquipmentId: 'RAD-999',
  location: 'Marginal Pinheiros, km 12',
  autuadorBody: 'CET-SP',
  infractionCode: '745-50',
  ctbArticle: 'Art. 218, I do CTB',
  severity: 'media',
  points: 4,
  fineAmount: 130.16,
};

const leiSecaInfraction: InfractionData = {
  aitNumber: 'AIT-LS-9988',
  dateTime: '2026-05-15',
  location: 'Av. Brasil, km 5',
  autuadorBody: 'DETRAN-RJ',
  infractionCode: '516-91',
  ctbArticle: 'Art. 165-A do CTB',
  severity: 'gravissima',
  points: 7,
  fineAmount: 2934.70,
  hasPsychomotorTerm: false,
};

function assembleDraft(infraction: InfractionData, procedureType: 'defesa_previa' | 'recurso_jari' | 'suspensao_cnh' = 'defesa_previa') {
  const analysis = ExpertRuleEngine.evaluate(`case-${infraction.aitNumber}`, infraction);
  return {
    analysis,
    draft: DocumentAssemblyEngine.assemble({
      caseId: `case-${infraction.aitNumber}`,
      procedureType,
      infraction,
      vehicle: { plate: 'XYZ-9988', model: 'Honda Civic' },
      applicant: applicantWatermark,
      analysis,
    }),
  };
}

afterEach(() => {
  registerRefinementProvider({}); // Reset
});

// ============================================================================
// 1. PIPELINE E2E COMPLETO — Cadeia FACT → RULE → FLAW → ARGUMENT → BLOCK
// ============================================================================

describe('Arquitetura Jurídica Determinística — Pipeline E2E', () => {
  it('deve avaliar deterministricamente a decadência do Art. 281 CTB (>30 dias)', () => {
    const infraction: InfractionData = {
      aitNumber: 'AIT-DEC-9988',
      dateTime: '2026-01-01',
      notificationExpeditionDate: '2026-02-15',
      location: 'Av. das Américas, 500',
      autuadorBody: 'DETRAN-RJ',
      infractionCode: '745-50',
      ctbArticle: 'Art. 218, I do CTB',
      severity: 'media',
      points: 4,
      fineAmount: 130.16,
    };

    const analysis = ExpertRuleEngine.evaluate('case-dec-01', infraction);

    // Cadeia rastreável: regra → vício → tese → bloco
    const flaw = analysis.detectedFlaws?.find((f) => f.argumentId === 'ARG-048');
    expect(flaw).toBeDefined();
    expect(flaw?.ruleId).toBe('RULE_DECADENCIA_30_DIAS');
    expect(flaw?.severity).toBe('alta');

    const evaluatedRule = analysis.evaluatedRules?.find((r) => r.ruleId === 'RULE_DECADENCIA_30_DIAS');
    expect(evaluatedRule?.status).toBe('FAIL');

    expect(analysis.detectedInconsistencies.some((i) => i.legalArgumentId === 'ARG-048')).toBe(true);
    expect(analysis.overallSuccessRate).toBeGreaterThanOrEqual(95);
    expect(analysis.engineVersion).toBeDefined();
    expect(analysis.engineStartedAt).toBeDefined();
    expect(analysis.engineFinishedAt).toBeDefined();
    expect(analysis.selectedArguments).toContain('ARG-048');
  });

  it('deve avaliar deterministricamente radar com aferição vencida (>12 meses)', () => {
    const analysis = ExpertRuleEngine.evaluate('case-rad-01', baseSpeedInfraction);
    const flaw = analysis.detectedFlaws?.find((f) => f.argumentId === 'ARG-001');
    expect(flaw).toBeDefined();
    expect(flaw?.ruleId).toBe('RULE_RADAR_CALIBRACAO_12M');
    expect(analysis.detectedInconsistencies.some((i) => i.legalArgumentId === 'ARG-001')).toBe(true);
  });

  it('deve montar a minuta determinística com marca d\'água do requerente sem alucinações', () => {
    const { analysis, draft } = assembleDraft(baseSpeedInfraction, 'defesa_previa');

    expect(draft.fullDraftText).toContain('Netto Teste 84721');
    expect(draft.fullDraftText).toContain('123.456.789-00');
    expect(draft.fullDraftText).toContain('XYZ-9988');
    expect(draft.fullDraftText).toContain('AIT-RAD-1234');
    expect(draft.fullDraftText).toContain('Art. 218, I do CTB');
    expect(draft.validation.isValid).toBe(true);
    // Campos de auditoria do pipeline canônico
    expect(draft.canonicalDraft).toBe(draft.fullDraftText);
    expect(draft.usedAI).toBe(false);
    expect(draft.refinementStatus).toBe('not_attempted');
    expect(draft.validationStatus).toBe('valid');
    expect(draft.integrityScore).toBe(100);
    expect(draft.engineVersion).toBeDefined();
  });

  it('deve validar a análise produzida pelo motor (IntegrityValidator)', () => {
    const { analysis } = assembleDraft(baseSpeedInfraction);
    const report = validateAnalysis(analysis);
    expect(report.valid).toBe(true);
  });

  it('deve validar a minuta montada pelo DocumentAssemblyEngine', () => {
    const { draft } = assembleDraft(baseSpeedInfraction);
    const report = validateDraft(draft);
    expect(report.valid).toBe(true);
    expect(draft.validation.isValid).toBe(true);
  });

  it('deve produzir o rol de documentos anexos (BLK-068)', () => {
    const { draft } = assembleDraft(baseSpeedInfraction, 'defesa_previa');
    expect(draft.fullDraftText).toContain('ROL DE DOCUMENTOS QUE INSTRUEM A PRESENTE PEÇA');
    expect(draft.fullDraftText).toContain('Notificação');
    expect(draft.fullDraftText).toContain('CNH');
    expect(draft.fullDraftText).toContain('CRLV');
  });

  it('não deve conter tags {{ }} não resolvidas na minuta', () => {
    const { draft } = assembleDraft(baseSpeedInfraction, 'defesa_previa');
    const tags = draft.fullDraftText.match(/\{\{[^}]+\}\}/g);
    expect(tags).toBeNull();
  });

  it('deve conter os 11 blocos essenciais da petição', () => {
    const { draft } = assembleDraft(baseSpeedInfraction, 'defesa_previa');
    const text = draft.fullDraftText;
    // Endereçamento (formato padrão canônico)
    expect(text).toContain('ILUSTRÍSSIMO');
    expect(text).toContain('DIRETOR');
    expect(text).toContain('AUTORIDADE DE TRÂNSITO');
    // Qualificação do requerente
    expect(text).toContain('Netto Teste 84721');
    expect(text).toContain('123.456.789-00');
    // Identificação do auto
    expect(text).toContain('AIT-RAD-1234');
    // Dos fatos
    expect(text).toContain('DOS FATOS');
    // Pelos / pedidos
    expect(text).toMatch(/REQUER|Requer|PEDIDOS/i);
    // Fecho / assinatura
    expect(text).toContain('São Paulo/SP');
  });
});

// ============================================================================
// 2. TESTE CRÍTICO: IA OFFLINE — Documento canônico completo sem IA
// ============================================================================

describe('TESTE CRÍTICO — IA OFFLINE (AI DISABLED)', () => {
  it('deve produzir documento canônico completo sem provider de IA registrado', async () => {
    // Nenhum registerRefinementProvider() → IA indisponível
    registerRefinementProvider({});
    const { analysis, draft } = assembleDraft(baseSpeedInfraction, 'defesa_previa');

    const result = await runControlledPipeline({ analysis, draft });

    expect(result.aiUses).toBe('deterministic');
    expect(result.controlled.reason).toBe('PROVIDER_UNAVAILABLE');
    expect(result.controlled.applied).toBe(false);

    // O documento FINAL é idêntico ao determinístico
    expect(result.draft.fullDraftText).toBe(draft.fullDraftText);
    expect(result.draft.usedAI).toBe(false);
    expect(result.draft.refinementStatus).toBe('unavailable');

    // Integridade preservada
    expect(result.draft.canonicalDraft).toBe(draft.fullDraftText);
    expect(result.draft.validationStatus).toBe('valid');

    // Conteúdo completo e sem tags pendentes
    expect(result.draft.fullDraftText).toContain('Netto Teste 84721');
    expect(result.draft.fullDraftText).toContain('AIT-RAD-1234');
    expect(result.draft.fullDraftText).toContain('ROL DE DOCUMENTOS');
    const tags = result.draft.fullDraftText.match(/\{\{[^}]+\}\}/g);
    expect(tags).toBeNull();

    // Análise + minuta passam na validação
    expect(validateAnalysis(analysis).valid).toBe(true);
    expect(validateDraft(result.draft).valid).toBe(true);
  });

  it('deve produzir documento canônico completo para todos os procedimentos', async () => {
    registerRefinementProvider({});
    const procedures: Array<{ type: InfractionData['infractionCode']; proc: 'defesa_previa' | 'recurso_jari' | 'suspensao_cnh' }> = [
      { type: '745-50', proc: 'defesa_previa' },
      { type: '516-91', proc: 'suspensao_cnh' },
    ];

    for (const { type, proc } of procedures) {
      const inf: InfractionData = { ...baseSpeedInfraction, infractionCode: type };
      if (type === '516-91') {
        Object.assign(inf, {
          ...leiSecaInfraction,
          hasPsychomotorTerm: false,
        });
      }
      const analysis = ExpertRuleEngine.evaluate(`case-offline-${type}`, inf);
      const draftDoc = DocumentAssemblyEngine.assemble({
        caseId: `case-offline-${type}`,
        procedureType: proc,
        infraction: inf,
        vehicle: { plate: 'XYZ-9988', model: 'Honda Civic' },
        applicant: applicantWatermark,
        analysis,
      });

      const result = await runControlledPipeline({ analysis, draft: draftDoc });
      expect(result.aiUses).toBe('deterministic');
      expect(result.draft.fullDraftText.length).toBeGreaterThan(500);
      // AIT presente na minuta OU no formato de Notificação de instauração
      expect(
        result.draft.fullDraftText.includes('AIT-RAD-1234') ||
        result.draft.fullDraftText.includes('AIT-LS-9988') ||
        result.draft.fullDraftText.includes(String(inf.aitNumber))
      ).toBe(true);
      expect(validateDraft(result.draft).valid).toBe(true);
    }
  });
});

// ============================================================================
// 3. TESTE CRÍTICO: IA MALICIOSA / INCONSISTENTE — Adulteração rejeitada
// ============================================================================

describe('TESTE CRÍTICO — IA MALICIOSA / INCONSISTENTE', () => {
  it('deve rejeitar IA que remove o AIT da minuta', async () => {
    registerRefinementProvider({
      refineProse: async () => 'Texto genérico inventado pela IA sem AIT e sem requerente.',
    });

    const { analysis, draft } = assembleDraft(baseSpeedInfraction, 'defesa_previa');
    const result = await runControlledPipeline({ analysis, draft });

    expect(result.aiUses).toBe('deterministic');
    expect(result.controlled.reason).toBe('REFINED_REJECTED');
    expect(result.draft.fullDraftText).toContain('AIT-RAD-1234');
    expect(result.draft.fullDraftText).toContain('Netto Teste 84721');
  });

  it('deve rejeitar IA que altera o nome do requerente', async () => {
    // Simula IA que substitui TODAS as ocorrências do nome do requerente
    registerRefinementProvider({
      refineProse: async (text) => text.split('Netto Teste 84721').join('FALSO NOME INVENTADO PELA IA'),
    });

    const { analysis, draft } = assembleDraft(baseSpeedInfraction, 'defesa_previa');
    const result = await runControlledPipeline({ analysis, draft });

    expect(result.controlled.reason).toBe('REFINED_REJECTED');
    expect(result.draft.fullDraftText).toContain('Netto Teste 84721');
    expect(result.draft.fullDraftText).not.toContain('FALSO NOME INVENTADO PELA IA');
  });

  it('deve rejeitar IA que produz texto vazio', async () => {
    registerRefinementProvider({
      refineProse: async () => '',
    });

    const { analysis, draft } = assembleDraft(baseSpeedInfraction, 'defesa_previa');
    const result = await runControlledPipeline({ analysis, draft });

    expect(result.controlled.reason).toBe('REFINEMENT_UNCHANGED');
    expect(result.draft.fullDraftText).toBe(draft.fullDraftText);
  });

  it('deve rejeitar IA que lança erro / falha', async () => {
    registerRefinementProvider({
      refineProse: async () => { throw new Error('Gemini 503 Service Unavailable'); },
    });

    const { analysis, draft } = assembleDraft(baseSpeedInfraction, 'defesa_previa');
    const result = await runControlledPipeline({ analysis, draft });

    expect(result.aiUses).toBe('deterministic');
    expect(result.controlled.reason).toBe('PROVIDER_UNAVAILABLE');
    expect(result.draft.fullDraftText).toBe(draft.fullDraftText);
  });

  it('deve rejeitar IA que altera datas ISO na minuta', async () => {
    registerRefinementProvider({
      refineProse: async (text) => text.replaceAll('2026-08-01', '2020-01-01'),
    });

    const { analysis, draft } = assembleDraft(baseSpeedInfraction, 'defesa_previa');
    const result = await runControlledPipeline({ analysis, draft });

    expect(result.controlled.reason).toBe('REFINED_REJECTED');
    expect(result.draft.fullDraftText).toContain('2026-08-01');
  });

  it('deve preserver a seleção de teses da análise (IA não pode alterar teses)', async () => {
    registerRefinementProvider({
      refineProse: async (text) => `${text}\n\n[Tese adicional falsa pela IA]`,
    });

    const { analysis, draft } = assembleDraft(baseSpeedInfraction, 'defesa_previa');
    const result = await runControlledPipeline({ analysis, draft });

    // IA aplicou o refinamento (prosa é válida), mas teses vêm da análise
    expect(result.draft.selectedArgumentIds).toEqual(
      analysis.recommendedArguments.map((a) => a.id)
    );
  });
});

// ============================================================================
// 4. TESTES NEGATIVOS — Dados obrigatórios ausentes, DATA_GAP, tags, etc.
// ============================================================================

describe('Testes Negativos — FAIL CLOSED e DATA_GAP', () => {
  it('deve retornar DATA_GAP quando falta a data de expedição da notificação (decadência)', () => {
    const inf: InfractionData = {
      aitNumber: 'AIT-DG-001',
      dateTime: '2026-01-15',
      // notificationExpeditionDate ausente
      location: 'Rua Teste, 1',
      autuadorBody: 'DETRAN-SP',
      infractionCode: '745-50',
      ctbArticle: 'Art. 218',
      severity: 'media',
      points: 4,
      fineAmount: 130.16,
    };

    const analysis = ExpertRuleEngine.evaluate('case-dg-001', inf);
    const gap = analysis.dataGaps?.find((g) => g.ruleId === 'RULE_DECADENCIA_30_DIAS');
    expect(gap).toBeDefined();
    expect(gap?.missingData).toContain('notificationExpeditionDate');
    // DATA_GAP NUNCA se torna vício detectado
    expect(analysis.detectedInconsistencies.some((i) => i.legalArgumentId === 'ARG-048')).toBe(false);
  });

  it('deve retornar DATA_GAP quando falta hasPsychomotorTerm (Lei Seca)', () => {
    const inf: InfractionData = {
      ...leiSecaInfraction,
      hasPsychomotorTerm: undefined,
    };

    const analysis = ExpertRuleEngine.evaluate('case-dg-002', inf);
    const gap = analysis.dataGaps?.find((g) => g.ruleId === 'RULE_LEI_SECA_TERMO_432');
    expect(gap).toBeDefined();
    expect(gap?.missingData).toContain('hasPsychomotorTerm');
    expect(analysis.detectedInconsistencies.some((i) => i.legalArgumentId === 'ARG-025')).toBe(false);
  });

  it('deve retornar DATA_GAP quando falta hasAgentDetailedObservations (celular)', () => {
    const inf: InfractionData = {
      aitNumber: 'AIT-CEL-001',
      dateTime: '2026-06-01',
      location: 'Av. Teste, 100',
      autuadorBody: 'DETRAN-SP',
      infractionCode: '736-62',
      ctbArticle: 'Art. 252, PU',
      severity: 'gravissima',
      points: 7,
      fineAmount: 293.47,
      // hasAgentDetailedObservations ausente
    };

    const analysis = ExpertRuleEngine.evaluate('case-dg-003', inf);
    const gap = analysis.dataGaps?.find((g) => g.ruleId === 'RULE_AUTUACAO_SEM_ABORDAGEM_MBFT');
    expect(gap).toBeDefined();
    expect(gap?.missingData).toContain('hasAgentDetailedObservations');
    expect(analysis.detectedInconsistencies.some((i) => i.legalArgumentId === 'ARG-015')).toBe(false);
  });

  it('deve lançar erro quando autuadorBody está ausente (RuleEngine)', () => {
    const inf: InfractionData = {
      aitNumber: 'AIT-ERR-001',
      dateTime: '2026-01-01',
      location: 'Teste',
      autuadorBody: '' as any,
      infractionCode: '745-50',
      ctbArticle: 'Art. 218',
      severity: 'media',
      points: 4,
      fineAmount: 130.16,
    };

    expect(() => ExpertRuleEngine.evaluate('case-err-001', inf)).toThrow('autuadorBody obrigatório');
  });

  it('deve lançar erro quando autuadorBody é undefined (RuleEngine)', () => {
    const inf: InfractionData = {
      aitNumber: 'AIT-ERR-002',
      dateTime: '2026-01-01',
      location: 'Teste',
      autuadorBody: undefined as any,
      infractionCode: '745-50',
      ctbArticle: 'Art. 218',
      severity: 'media',
      points: 4,
      fineAmount: 130.16,
    };

    expect(() => ExpertRuleEngine.evaluate('case-err-002', inf)).toThrow('autuadorBody obrigatório');
  });

  it('deve lançar erro quando autuadorBody ausente na assembly', () => {
    const analysis = ExpertRuleEngine.evaluate('case-a-001', baseSpeedInfraction);
    expect(() => DocumentAssemblyEngine.assemble({
      caseId: 'case-a-001',
      procedureType: 'defesa_previa',
      infraction: { ...baseSpeedInfraction, autuadorBody: '' },
      vehicle: { plate: 'XYZ-9988', model: 'Civic' },
      applicant: applicantWatermark,
      analysis,
    })).toThrow('autuadorBody obrigatório para geração da minuta');
  });

  it('deve lançar erro quando cityState está ausente na assembly', () => {
    const analysis = ExpertRuleEngine.evaluate('case-a-002', baseSpeedInfraction);
    expect(() => DocumentAssemblyEngine.assemble({
      caseId: 'case-a-002',
      procedureType: 'defesa_previa',
      infraction: baseSpeedInfraction,
      vehicle: { plate: 'XYZ-9988', model: 'Civic' },
      applicant: { ...applicantWatermark, cityState: '' },
      analysis,
    })).toThrow('cityState obrigatório para geração da minuta');
  });

  it('deve rejeitar análise com argumento estrangeiro (ARG-XXX)', () => {
    const analysis = {
      id: 'anl_fake',
      caseId: 'case_fake',
      overallSuccessRate: 50,
      detectedInconsistencies: [
        { title: 'falso', description: 'falso', severity: 'alta' as const, legalArgumentId: 'ARG-XXX', impact: 'x' },
      ],
      recommendedArguments: [],
      recommendedProcedure: 'recurso_jari' as const,
      competentBody: 'DETRAN-SP',
      summaryReasoning: 'x',
      createdAt: new Date().toISOString(),
    };

    const report = validateAnalysis(analysis as any);
    expect(report.valid).toBe(false);
    expect(report.issues.some((i) => i.code === 'ARGUMENT_FOREIGN' && i.kind === 'KNOWLEDGE_GAP')).toBe(true);
  });

  it('deve rejeitar minuta vazia', () => {
    const report = validateDraft({
      id: 'dft_empty',
      caseId: 'case_empty',
      procedureType: 'recurso_jari',
      authorityAddressing: '',
      applicantName: '',
      applicantCpf: '',
      applicantCnh: '',
      applicantAddress: '',
      applicantCityState: '',
      vehiclePlate: '',
      vehicleModel: '',
      vehicleRenavam: '',
      aitNumber: '',
      factsNarrative: '',
      selectedArgumentIds: [],
      preliminaryArgumentsText: '',
      meritArgumentsText: '',
      legalRequestsText: '',
      closingPlaceDate: '',
      fullDraftText: '',
      isReady: false,
      version: 1,
      updatedAt: '',
    });
    expect(report.valid).toBe(false);
    expect(report.issues.some((i) => i.code === 'EMPTY_DRAFT')).toBe(true);
  });

  it('deve incluir integrityScore e integrityIssues na minuta', () => {
    const { draft } = assembleDraft(baseSpeedInfraction, 'defesa_previa');
    expect(typeof draft.integrityScore).toBe('number');
    expect(draft.integrityScore).toBe(100);
    expect(Array.isArray(draft.integrityIssues)).toBe(true);
    expect(draft.integrityIssues!.length).toBe(0);
  });

  it('deve incluir detectedFlaws na análise com cadeia rastreável', () => {
    const analysis = ExpertRuleEngine.evaluate('case-chain-01', baseSpeedInfraction);
    expect(Array.isArray(analysis.detectedFlaws)).toBe(true);
    expect(analysis.detectedFlaws!.length).toBeGreaterThan(0);

    for (const flaw of analysis.detectedFlaws!) {
      expect(flaw.ruleId).toBeDefined();
      expect(flaw.argumentId).toBeDefined();
      expect(flaw.severity).toMatch(/^(alta|media|baixa)$/);
      expect(flaw.title).toBeDefined();
      expect(flaw.statutoryBasis).toBeDefined();
      // Argumento deve existir no catálogo
      const argExists = ARGUMENTS_CATALOG.some((a) => a.id === flaw.argumentId);
      expect(argExists).toBe(true);
    }
  });

  it('deve incluir selectedArguments na análise', () => {
    const analysis = ExpertRuleEngine.evaluate('case-sel-01', baseSpeedInfraction);
    expect(Array.isArray(analysis.selectedArguments)).toBe(true);
    expect(analysis.selectedArguments!.length).toBeGreaterThan(0);
    for (const argId of analysis.selectedArguments!) {
      expect(argId).toMatch(/^ARG-\d{3}$/);
    }
  });
});

// ============================================================================
// 5. TESTES POR PROCEDIMENTO — Validação de cada via de recurso
// ============================================================================

describe('Validação por Procedimento — Cobertura completa', () => {
  it('defesa_previa: deve gerar minuta completa e validada', () => {
    const { analysis, draft } = assembleDraft(baseSpeedInfraction, 'defesa_previa');
    expect(draft.procedureType).toBe('defesa_previa');
    expect(draft.validation.isValid).toBe(true);
    expect(draft.fullDraftText.includes('DETRAN') || draft.fullDraftText.includes('AUTORIDADE DE TRÂNSITO')).toBe(true);
    expect(validateAnalysis(analysis).valid).toBe(true);
    expect(validateDraft(draft).valid).toBe(true);
  });

  it('recurso_jari: deve gerar minuta completa e validada', () => {
    const { analysis, draft } = assembleDraft(baseSpeedInfraction, 'recurso_jari');
    expect(draft.procedureType).toBe('recurso_jari');
    expect(draft.validation.isValid).toBe(true);
    expect(validateAnalysis(analysis).valid).toBe(true);
    expect(validateDraft(draft).valid).toBe(true);
  });

  it('suspensao_cnh: deve gerar minuta completa para Lei Seca', () => {
    const { analysis, draft } = assembleDraft(leiSecaInfraction, 'suspensao_cnh');
    expect(draft.procedureType).toBe('suspensao_cnh');
    expect(draft.validation.isValid).toBe(true);
    expect(draft.fullDraftText).toContain('AIT-LS-9988');
    expect(validateAnalysis(analysis).valid).toBe(true);
    expect(validateDraft(draft).valid).toBe(true);
  });

  it('cada procedimento no catálogo deve ter template correspondente', () => {
    const proceduresWithTemplates = PROCEDURES_CATALOG.filter((p) => p.availableTemplates.length > 0);
    expect(proceduresWithTemplates.length).toBeGreaterThanOrEqual(7);
    for (const proc of proceduresWithTemplates) {
      const hasApplicableGrounds = proc.applicableGrounds.length > 0;
      expect(hasApplicableGrounds).toBe(true);
    }
  });
});

// ============================================================================
// 6. RETROCOMPATIBILIDADE — Casos antigos sem campos novos
// ============================================================================

describe('Retrocompatibilidade — Casos antigos', () => {
  it('deve carregar caso antigo sem evaluatedRules / engineVersion / integrityScore', () => {
    const legacyAnalysis = {
      id: 'anl_legacy',
      caseId: 'case_legacy',
      overallSuccessRate: 85,
      detectedInconsistencies: [
        { title: 'Vício antigo', description: 'Decadência', severity: 'alta' as const, legalArgumentId: 'ARG-048', impact: 'x' },
      ],
      recommendedArguments: [],
      recommendedProcedure: 'recurso_jari' as const,
      competentBody: 'DETRAN-SP',
      summaryReasoning: 'Caso antigo.',
      createdAt: '2024-06-01T10:00:00Z',
      // Campos ausentes: engineVersion, evaluatedRules, detectedFlaws, selectedArguments, integrityScore
    };

    const report = validateAnalysis(legacyAnalysis as any);
    expect(report.valid).toBe(true);
  });

  it('deve carregar minuta antiga sem canonicalDraft / integrityScore / refinementStatus', () => {
    const legacyDraft = {
      id: 'dft_legacy',
      caseId: 'case_legacy',
      procedureType: 'recurso_jari',
      authorityAddressing: 'ILUSTRÍSSIMO SENHOR DIRETOR',
      applicantName: 'João',
      applicantCpf: '123.456.789-00',
      applicantCnh: '12345678900',
      applicantAddress: 'Rua X, 1',
      applicantCityState: 'São Paulo/SP',
      vehiclePlate: 'ABC-1234',
      vehicleModel: 'Civic',
      vehicleRenavam: '123',
      aitNumber: 'AIT-LEGACY',
      factsNarrative: 'Fatos.',
      selectedArgumentIds: ['ARG-048'],
      preliminaryArgumentsText: 'Preliminares.',
      meritArgumentsText: 'Mérito.',
      legalRequestsText: 'Requer anulação.',
      closingPlaceDate: 'São Paulo/SP, 01/06/2024',
      fullDraftText: 'MINUTA LEGADA COM AIT-LEGACY E JOÃO E ROL DE DOCUMENTOS.',
      isReady: true,
      version: 1,
      updatedAt: '2024-06-01T10:00:00Z',
      // Campos ausentes: canonicalDraft, refinedDraft, usedAI, refinementStatus,
      // validationStatus, integrityScore, integrityIssues, engineVersion
    };

    const report = validateDraft(legacyDraft as any);
    expect(report.valid).toBe(true);
  });
});
