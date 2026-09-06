/**
 * FASE 3.2 — Testes de dependência de evidência para RagPipeline.analyzeInfraction().
 *
 * Estes testes provam que o gate FASE 3.2 é respeitado:
 *   - análise NUNCA recomenda tese cuja evidência é ausente ou `false` (fail closed).
 *   - evidência `true` → tese permitida (sem dataGap para ela).
 *   - upload/OCR/notes NÃO satisfazem a dependência de evidência.
 *   - teses não relacionadas não são afetadas.
 *   - dataGaps do motor de regras E evidence gaps se acumulam.
 *
 * Abordagem: mock de ExpertRuleEngine.evaluate() via vi.mock para
 * isolar a lógica de evidence filtering sem depender de qual regra específica
 * é disparada pelos campos da InfractionData.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RagPipeline } from '../../src/core/rag/rag-pipeline';
import { ExpertRuleEngine } from '../../src/core/rules/rule-engine';
import type { CaseAnalysis, InfractionData } from '../../src/types';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const baseInfraction: InfractionData = {
  id: 'test-case-001',
  aitNumber: 'AIT-001',
  infractionCode: '745-50',
  code: '745-50',
  description: 'Excesso de velocidade',
  ctbArticle: 'Art. 218',
  severity: 'grave',
  points: 7,
  fineAmount: 1300,
  autuadorBody: 'DETRAN-SP',
  dateTime: '2024-01-15T10:00:00Z',
  location: 'Via Expressa',
  speedLimit: 80,
  measuredSpeed: 120,
  consideredSpeed: 115,
  notificationExpeditionDate: '2024-01-20T00:00:00Z',
  radarCalibrationDate: '2023-01-01T00:00:00Z', // expirada > 12 meses → ARG-001
};

/** Mock padrão: retorna ARG-001 (sem dependência) + ARG-012 (dependente de evidência) */
const makeEngineResult = (
  extraArgs: string[] = []
): CaseAnalysis => ({
  id: 'anl_test',
  caseId: 'test-case-001',
  overallSuccessRate: 92,
  detectedInconsistencies: [
    {
      title: 'Radar Vencido',
      description: 'Aferição expirada',
      severity: 'alta',
      legalArgumentId: 'ARG-001',
      impact: 'Anulação',
    },
  ],
  selectedArguments: ['ARG-001', 'ARG-049', ...extraArgs],
  recommendedArguments: [
    {
      id: 'ARG-001',
      code: 'RADAR_CALIBRACAO_VENCIDA',
      title: 'Aferição Metrológica do Radar Vencida',
      category: 'merito',
      legalBase: 'Art. 280 CTB',
      summary: 'Radar vencido',
      detailedText: 'Laudo de aferição vencido há mais de 12 meses.',
      confidenceScore: 92,
      applicabilityNote: 'Sempre que a aferição do radar estiver vencida.',
    },
    {
      id: 'ARG-049',
      code: 'CONSTITUTIONAL_DUE_PROCESS',
      title: 'Garantia Constitucional do Devido Processo Legal',
      category: 'constitucional',
      legalBase: 'Art. 5º LIV e LV CF/88',
      summary: 'Devido processo legal',
      detailedText: 'Garantia constitucional.',
      confidenceScore: 100,
      applicabilityNote: 'Injetada automaticamente.',
    },
    ...extraArgs.map((id) => ({
      id,
      code: `ARG_${id.replace('ARG-', '')}`,
      title: `Argumento ${id}`,
      category: 'merito' as const,
      legalBase: 'Art. 280 CTB',
      summary: 'Teste',
      detailedText: 'Teste',
      confidenceScore: 80,
      applicabilityNote: 'Teste',
    })),
  ],
  recommendedProcedure: 'recurso_jari' as const,
  competentBody: 'DETRAN-SP',
  summaryReasoning: 'Motor identificou inconsistências.',
  createdAt: new Date().toISOString(),
  engineVersion: '2.6.0',
  evaluatedRules: [],
  integrityScore: 100,
  dataGaps: [
    {
      ruleId: 'RULE_RADAR_CALIBRACAO_12M',
      missingData: ['radarCalibrationDate'],
      reason: 'Exemplo de gap do motor de regras.',
    },
  ],
});

// ── Testes ───────────────────────────────────────────────────────────────────

describe('FASE 3.2 — Evidência → Analysis (fail closed)', () => {
  let evaluateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    evaluateSpy = vi.spyOn(ExpertRuleEngine, 'evaluate');
  });

  afterEach(() => {
    evaluateSpy.mockRestore();
  });

  // ── A. Evidência ausente → tese dependente EXCLUÍDA + dataGap gerado ──

  it('A) sem evidenceFlags: teses dependentes de evidência são excluídas e dataGap é gerado', () => {
    evaluateSpy.mockReturnValue(makeEngineResult(['ARG-012', 'ARG-019', 'ARG-020']));

    const result = RagPipeline.analyzeInfraction('test-case-001', {
      ...baseInfraction,
      evidenceFlags: undefined,
    });

    // ARG-012/019/020 NÃO devem estar em recommendedArguments
    const argIds = result.recommendedArguments.map((a) => a.id);
    expect(argIds).not.toContain('ARG-012');
    expect(argIds).not.toContain('ARG-019');
    expect(argIds).not.toContain('ARG-020');

    // ARG-001 e ARG-049 (não dependentes) DEVEM permanecer
    expect(argIds).toContain('ARG-001');
    expect(argIds).toContain('ARG-049');

    // dataGaps deve conter entradas para cada tese removida
    const gapRuleIds = result.dataGaps?.map((g) => g.ruleId) ?? [];
    expect(gapRuleIds).toContain('ARG-012');
    expect(gapRuleIds).toContain('ARG-019');
    expect(gapRuleIds).toContain('ARG-020');

    // Formato do dataGap
    const arg012Gap = result.dataGaps?.find((g) => g.ruleId === 'ARG-012');
    expect(arg012Gap).toBeDefined();
    expect(arg012Gap?.missingData).toContain('fotoRetencaoTrafego');
    expect(arg012Gap?.reason).toContain('fotoRetencaoTrafego');
  });

  it('A) sem evidenceFlags: selectedArguments também não contém teses dependentes', () => {
    evaluateSpy.mockReturnValue(makeEngineResult(['ARG-012', 'ARG-020']));

    const result = RagPipeline.analyzeInfraction('test-case-001', {
      ...baseInfraction,
      evidenceFlags: undefined,
    });

    expect(result.selectedArguments).not.toContain('ARG-012');
    expect(result.selectedArguments).not.toContain('ARG-020');
    expect(result.selectedArguments).toContain('ARG-001');
  });

  // ── B. Evidência explicitamente `false` → tese excluída + dataGap ─────

  it('B) evidenceFlags[key] = false: tese dependente excluída e dataGap gerado', () => {
    evaluateSpy.mockReturnValue(makeEngineResult(['ARG-012', 'ARG-019', 'ARG-020']));

    const result = RagPipeline.analyzeInfraction('test-case-001', {
      ...baseInfraction,
      evidenceFlags: {
        fotoRetencaoTrafego: false,
        manualVeiculoOuFotoPainel: false,
        fotoPlacaR6aAusente: false,
      },
    });

    const argIds = result.recommendedArguments.map((a) => a.id);
    expect(argIds).not.toContain('ARG-012');
    expect(argIds).not.toContain('ARG-019');
    expect(argIds).not.toContain('ARG-020');

    const gapRuleIds = result.dataGaps?.map((g) => g.ruleId) ?? [];
    expect(gapRuleIds).toContain('ARG-012');
    expect(gapRuleIds).toContain('ARG-019');
    expect(gapRuleIds).toContain('ARG-020');
  });

  // ── C. Evidência `true` → tese incluída, sem dataGap para ela ──────────

  it('C) evidenceFlags[key] = true: tese dependente INCLUÍDA e SEM dataGap para ela', () => {
    evaluateSpy.mockReturnValue(makeEngineResult(['ARG-012', 'ARG-019', 'ARG-020']));

    const result = RagPipeline.analyzeInfraction('test-case-001', {
      ...baseInfraction,
      evidenceFlags: {
        fotoRetencaoTrafego: true,
        manualVeiculoOuFotoPainel: true,
        fotoPlacaR6aAusente: true,
      },
    });

    const argIds = result.recommendedArguments.map((a) => a.id);
    expect(argIds).toContain('ARG-012');
    expect(argIds).toContain('ARG-019');
    expect(argIds).toContain('ARG-020');

    // Nenhum dataGap para as teses com evidência confirmada
    const gapRuleIds = result.dataGaps?.map((g) => g.ruleId) ?? [];
    expect(gapRuleIds).not.toContain('ARG-012');
    expect(gapRuleIds).not.toContain('ARG-019');
    expect(gapRuleIds).not.toContain('ARG-020');
  });

  it('C) evidenceFlags parcial (algumas true, outras ausentes): só as ausentes geram gap', () => {
    evaluateSpy.mockReturnValue(makeEngineResult(['ARG-012', 'ARG-019', 'ARG-020']));

    const result = RagPipeline.analyzeInfraction('test-case-001', {
      ...baseInfraction,
      evidenceFlags: {
        fotoRetencaoTrafego: true,   // presente e true → ARG-012 liberada
        // manualVeiculoOuFotoPainel ausente → ARG-019 gera gap
        fotoPlacaR6aAusente: false, // false → ARG-020 gera gap
      },
    });

    const argIds = result.recommendedArguments.map((a) => a.id);
    expect(argIds).toContain('ARG-012');
    expect(argIds).not.toContain('ARG-019');
    expect(argIds).not.toContain('ARG-020');

    const gapRuleIds = result.dataGaps?.map((g) => g.ruleId) ?? [];
    expect(gapRuleIds).not.toContain('ARG-012');
    expect(gapRuleIds).toContain('ARG-019');
    expect(gapRuleIds).toContain('ARG-020');
  });

  // ── D. Teses não relacionadas permanecem inalteradas ─────────────────────

  it('D) teses não dependentes de evidência são sempre incluídas (independentemente de evidenceFlags)', () => {
    evaluateSpy.mockReturnValue(makeEngineResult(['ARG-012']));

    const withFlags = RagPipeline.analyzeInfraction('test-case-001', {
      ...baseInfraction,
      evidenceFlags: { fotoRetencaoTrafego: false },
    });
    const withoutFlags = RagPipeline.analyzeInfraction('test-case-001', {
      ...baseInfraction,
      evidenceFlags: undefined,
    });

    // ARG-001 e ARG-049 presentes em ambos
    const argIdsWith = withFlags.recommendedArguments.map((a) => a.id);
    const argIdsWithout = withoutFlags.recommendedArguments.map((a) => a.id);
    expect(argIdsWith).toContain('ARG-001');
    expect(argIdsWith).toContain('ARG-049');
    expect(argIdsWithout).toContain('ARG-001');
    expect(argIdsWithout).toContain('ARG-049');
  });

  // ── E. Upload/OCR/notes NÃO satisfazem a dependência de evidência ─────────

  it('E) ocrExtractedText/photoProofUrls/notes NÃO são tratados como evidência para análise', () => {
    evaluateSpy.mockReturnValue(makeEngineResult(['ARG-012']));

    const result = RagPipeline.analyzeInfraction('test-case-001', {
      ...baseInfraction,
      // Evidência "documental" presente, mas fotoRetencaoTrafego ausente
      ocrExtractedText: 'Texto de OCR com informação relevante',
      photoProofUrls: ['https://exemplo.com/foto.jpg'],
      notes: 'Condutor Parou na faixa de retenção',
      evidenceFlags: undefined, // sem evidenceFlags explícito
    });

    // ARG-012 deve ser EXCLUÍDA mesmo com OCR/foto/notes presentes
    const argIds = result.recommendedArguments.map((a) => a.id);
    expect(argIds).not.toContain('ARG-012');
    expect(result.dataGaps?.some((g) => g.ruleId === 'ARG-012')).toBe(true);
  });

  // ── F. dataGaps do motor de regras E evidence gaps se acumulam ────────────

  it('F) dataGaps do motor de regras E evidence gaps coexistem (não se sobrescrevem)', () => {
    evaluateSpy.mockReturnValue(makeEngineResult(['ARG-012']));

    const result = RagPipeline.analyzeInfraction('test-case-001', {
      ...baseInfraction,
      evidenceFlags: { fotoRetencaoTrafego: false },
    });

    // Deve haver tanto o gap do motor de regras (radar calibration)
    // quanto o gap de evidência (ARG-012)
    expect(result.dataGaps).toBeDefined();
    expect(result.dataGaps!.length).toBeGreaterThanOrEqual(2);

    const ruleIds = result.dataGaps!.map((g) => g.ruleId);
    expect(ruleIds).toContain('RULE_RADAR_CALIBRACAO_12M'); // gap do motor
    expect(ruleIds).toContain('ARG-012');                    // gap de evidência
  });

  // ── G. Fallback genérico do motor preservado (o motor nunca é mascarado) ─

  it('G) resultado sem gaps de evidência (evidências todas true) mantém gaps originais do motor', () => {
    evaluateSpy.mockReturnValue(makeEngineResult([])); // sem teses extras

    const result = RagPipeline.analyzeInfraction('test-case-001', {
      ...baseInfraction,
      evidenceFlags: {
        fotoRetencaoTrafego: true,
        manualVeiculoOuFotoPainel: true,
        fotoPlacaR6aAusente: true,
      },
    });

    // Gaps originais do motor (radar calibration) devem permanecer
    expect(result.dataGaps?.some((g) => g.ruleId === 'RULE_RADAR_CALIBRACAO_12M')).toBe(true);
    // Nenhum evidence gap多余
    expect(result.dataGaps?.filter((g) => g.ruleId === 'ARG-012')).toHaveLength(0);
  });

  // ── Integridade: selectedArguments e recommendedArguments são consistentes ─

  it('selectedArguments contém só IDs presentes em recommendedArguments', () => {
    evaluateSpy.mockReturnValue(makeEngineResult(['ARG-012', 'ARG-020']));

    const result = RagPipeline.analyzeInfraction('test-case-001', {
      ...baseInfraction,
      evidenceFlags: { fotoRetencaoTrafego: false }, // ARG-012 removida
    });

    for (const id of result.selectedArguments ?? []) {
      expect(result.recommendedArguments.some((a) => a.id === id)).toBe(true);
    }
  });

  // ── Comportamento when ExpertRuleEngine.evaluate retorna engine dataGaps ──

  it('engineVersion e engineStartedAt/FinishedAt são preservados após filtering', () => {
    evaluateSpy.mockReturnValue({
      ...makeEngineResult(['ARG-012']),
      engineVersion: '2.6.0',
      engineStartedAt: '2024-01-01T00:00:00.000Z',
      engineFinishedAt: '2024-01-01T00:00:01.000Z',
    });

    const result = RagPipeline.analyzeInfraction('test-case-001', {
      ...baseInfraction,
      evidenceFlags: { fotoRetencaoTrafego: false },
    });

    expect(result.engineVersion).toBe('2.6.0');
    expect(result.engineStartedAt).toBe('2024-01-01T00:00:00.000Z');
    expect(result.engineFinishedAt).toBe('2024-01-01T00:00:01.000Z');
  });
});
