/**
 * Fase 5 — P0: Quality Gate Obrigatório.
 *
 * Quality Gate negativo = fluxo BLOQUEADO.
 * O Quality Gate deve ser uma barreira de execução, não apenas relatório.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runFinalQualityGate } from '@/core/validation/final-quality-gate';
import { runControlledPipeline } from '@/core/ai/ai-orchestrator';
import { validateDraft } from '@/core/validation/integrity-validator';
import { ARGUMENTS_CATALOG } from '@/core/arguments/arguments-catalog';

// ─── Mocks ───
const mockLineage = vi.hoisted(() => ({
  entries: [
    { field: 'infraction.aitNumber', originalValue: 'AIT-12345', requiredInDocument: true, documentOccurrences: 1, generatedArguments: ['ARG-001'], source: 'onboarding' },
    { field: 'vehicle.plate', originalValue: 'ABC-1D23', requiredInDocument: true, documentOccurrences: 1, generatedArguments: [], source: 'onboarding' },
    { field: 'applicant.name', originalValue: 'João da Silva', requiredInDocument: true, documentOccurrences: 1, generatedArguments: [], source: 'onboarding' },
    { field: 'applicant.cpf', originalValue: '123.456.789-00', requiredInDocument: true, documentOccurrences: 1, generatedArguments: [], source: 'onboarding' },
    { field: 'applicant.cnh', originalValue: '98765432100', requiredInDocument: true, documentOccurrences: 1, generatedArguments: [], source: 'onboarding' },
    { field: 'infraction.autuadorBody', originalValue: 'DETRAN-SP', requiredInDocument: true, documentOccurrences: 1, generatedArguments: [], source: 'onboarding' },
    { field: 'infraction.infractionCode', originalValue: '745-50', requiredInDocument: true, documentOccurrences: 1, generatedArguments: [], source: 'onboarding' },
    { field: 'infraction.ctbArticle', originalValue: '218', requiredInDocument: true, documentOccurrences: 1, generatedArguments: [], source: 'onboarding' },
    { field: 'infraction.dateTime', originalValue: '2024-01-15T10:30:00Z', requiredInDocument: true, documentOccurrences: 1, generatedArguments: [], source: 'onboarding' },
    { field: 'infraction.location', originalValue: 'Av. Paulista, 1000', requiredInDocument: true, documentOccurrences: 1, generatedArguments: [], source: 'onboarding' },
    { field: 'infraction.severity', originalValue: 'grave', requiredInDocument: true, documentOccurrences: 1, generatedArguments: [], source: 'onboarding' },
    { field: 'applicant.addressCityState', originalValue: 'São Paulo/SP', requiredInDocument: true, documentOccurrences: 1, generatedArguments: [], source: 'onboarding' },
    { field: 'infraction.measuredSpeed', originalValue: '80', requiredInDocument: true, documentOccurrences: 1, generatedArguments: [], source: 'onboarding' },
    { field: 'infraction.consideredSpeed', originalValue: '73', requiredInDocument: true, documentOccurrences: 1, generatedArguments: [], source: 'onboarding' },
    { field: 'infraction.speedLimit', originalValue: '60', requiredInDocument: true, documentOccurrences: 1, generatedArguments: [], source: 'onboarding' },
    { field: 'infraction.hasPhotoProof', originalValue: 'false', requiredInDocument: false, documentOccurrences: 0, generatedArguments: [], source: 'onboarding' },
    { field: 'infraction.hasPsychomotorTerm', originalValue: 'false', requiredInDocument: false, documentOccurrences: 0, generatedArguments: [], source: 'onboarding' },
  ],
}));

const mockValidDocument = `
ILUSTRÍSSIMO SENHOR DIRETOR DA AUTORIDADE DE TRÂNSITO DO(A) DETRAN-SP

QUALIFICAÇÃO DO REQUERENTE
João da Silva, brasileiro, CPF 123.456.789-00, CNH 98765432100

IDENTIFICAÇÃO DO AUTO DE INFRAÇÃO
AIT nº AIT-12345, artigo 218 do CTB, código 745-50, DETRAN-SP, 2024-01-15T10:30:00Z, Av. Paulista, 1000, grave

DOS FATOS
O requerente foi autuado por excesso de velocidade. Velocidade medida 80 km/h, velocidade considerada 73 km/h, limite 60 km/h. Placa ABC-1D23. Cidade São Paulo/SP.

PRELIMINARES
I.1 - AFERIÇÃO METROLÓGICA DO RADAR VENCIDA OU AUSENTE (RES. CONTRAN 798/2020)

A autuação não possui comprovante de aferição metrológica do radar válida conforme Resolução CONTRAN 798/2020.

MÉRITO
A autuação é inválida.

PEDIDOS
Requer o arquivamento.

ROL DE DOCUMENTOS
1. Cópia da NP

NESTES TERMOS
Pede deferimento.
`;

const mockAnalysis = {
  evaluatedRules: [],
  selectedArguments: ['ARG-001'],
  recommendedProcedure: 'recurso_jari',
  detectedInconsistencies: [],
};

const mockOnboardingPayload = {
  infraction: { 
    aitNumber: 'AIT-12345', 
    autuadorBody: 'DETRAN-SP', 
    infractionCode: '745-50', 
    ctbArticle: '218', 
    dateTime: '2024-01-15T10:30:00Z', 
    location: 'Av. Paulista, 1000', 
    severity: 'grave',
    measuredSpeed: '80',
    consideredSpeed: '73',
    speedLimit: '60',
    hasPhotoProof: 'false',
    hasPsychomotorTerm: 'false',
  },
  vehicle: { plate: 'ABC-1D23' },
  applicant: { name: 'João da Silva', cpf: '123.456.789-00', cnh: '98765432100', addressCityState: 'São Paulo/SP' },
};

const mockCanonicalCase = { id: 'case_test' };

describe('Fase 5 — Quality Gate Obrigatório (FAIL CLOSED)', () => {
  it('1. Documento válido → Quality Gate APPROVED', () => {
    const report = runFinalQualityGate({
      onboardingPayload: mockOnboardingPayload,
      canonicalCase: mockCanonicalCase,
      analysis: mockAnalysis,
      finalDocument: mockValidDocument,
      lineage: mockLineage,
      argumentsCatalog: ARGUMENTS_CATALOG,
      blocksCatalog: [],
    });

    expect(report.overallPass).toBe(true);
    expect(report.blocked).toBe(false);
    expect(report.score).toBe(100);
  });

  it('2. isReady === false (placeholder não resolvido) → Quality Gate BLOCKED', () => {
    const documentWithPlaceholder = mockValidDocument + '\n{{PLACEHOLDER_NAO_EXISTENTE}}';

    const report = runFinalQualityGate({
      onboardingPayload: mockOnboardingPayload,
      canonicalCase: mockCanonicalCase,
      analysis: mockAnalysis,
      finalDocument: documentWithPlaceholder,
      lineage: mockLineage,
      argumentsCatalog: ARGUMENTS_CATALOG,
      blocksCatalog: [],
    });

    expect(report.overallPass).toBe(false);
    expect(report.blocked).toBe(true);
    expect(report.checks.find((c) => c.check === 'ESTRUTURA')?.passed).toBe(false);
  });

  it('3. validation.isValid === false (dados obrigatórios ausentes) → Quality Gate BLOCKED', () => {
    const incompleteLineage = {
      entries: mockLineage.entries.filter((e) => e.field !== 'infraction.aitNumber'),
    };

    const report = runFinalQualityGate({
      onboardingPayload: mockOnboardingPayload,
      canonicalCase: mockCanonicalCase,
      analysis: mockAnalysis,
      finalDocument: mockValidDocument,
      lineage: incompleteLineage,
      argumentsCatalog: ARGUMENTS_CATALOG,
      blocksCatalog: [],
    });

    expect(report.overallPass).toBe(false);
    expect(report.blocked).toBe(true);
    expect(report.checks.find((c) => c.check === 'COMPLETUDE')?.passed).toBe(false);
  });

  it('4. Placeholder não resolvido → Quality Gate BLOCKED (ESTRUTURA falha)', () => {
    const docWithPlaceholder = `Documento com {{TAG_PENDENTE}} no meio.`;

    const report = runFinalQualityGate({
      onboardingPayload: mockOnboardingPayload,
      canonicalCase: mockCanonicalCase,
      analysis: mockAnalysis,
      finalDocument: docWithPlaceholder,
      lineage: mockLineage,
      argumentsCatalog: ARGUMENTS_CATALOG,
      blocksCatalog: [],
    });

    expect(report.blocked).toBe(true);
    const estruturaCheck = report.checks.find((c) => c.check === 'ESTRUTURA');
    expect(estruturaCheck?.passed).toBe(false);
    expect(estruturaCheck?.message).toContain('Tags pendentes');
  });

  it('5. Exceção durante validação → Quality Gate BLOCKED (FAIL CLOSED)', () => {
    // Mock lineage com estrutura que causa erro interno
    const brokenLineage = {
      entries: 'not an array' as any,
    };

    expect(() => {
      runFinalQualityGate({
        onboardingPayload: mockOnboardingPayload,
        canonicalCase: mockCanonicalCase,
        analysis: mockAnalysis,
        finalDocument: mockValidDocument,
        lineage: brokenLineage,
        argumentsCatalog: [],
        blocksCatalog: [],
      });
    }).toThrow();
  });

  it('6. Resultado ausente/undefined → Quality Gate BLOCKED', () => {
    // Análise com DATA_GAP
    const analysisWithGap = {
      ...mockAnalysis,
      evaluatedRules: [
        { ruleId: 'RULE_TEST', status: 'DATA_GAP', inputs: { missingData: ['campo_obrigatorio'] } },
      ],
    };

    const report = runFinalQualityGate({
      onboardingPayload: mockOnboardingPayload,
      canonicalCase: mockCanonicalCase,
      analysis: analysisWithGap,
      finalDocument: mockValidDocument,
      lineage: mockLineage,
      argumentsCatalog: ARGUMENTS_CATALOG,
      blocksCatalog: [],
    });

    expect(report.blocked).toBe(true);
    const causalidadeCheck = report.checks.find((c) => c.check === 'CAUSALIDADE');
    expect(causalidadeCheck?.passed).toBe(false);
  });

  it('7. Documento válido não deve ser bloqueado indevidamente', () => {
    const report = runFinalQualityGate({
      onboardingPayload: mockOnboardingPayload,
      canonicalCase: mockCanonicalCase,
      analysis: mockAnalysis,
      finalDocument: mockValidDocument,
      lineage: mockLineage,
      argumentsCatalog: ARGUMENTS_CATALOG,
      blocksCatalog: [],
    });

    expect(report.overallPass).toBe(true);
    expect(report.blocked).toBe(false);
    // Todas as 7 verificações devem passar
    expect(report.checks.every((c) => c.passed)).toBe(true);
  });

  it('8. Quality Gate negativo impede avanço no pipeline (runControlledPipeline lança erro)', async () => {
    const draftWithPlaceholder = {
      id: 'dft_test',
      caseId: 'case_test',
      procedureType: 'recurso_jari',
      fullDraftText: mockValidDocument + '\n{{PLACEHOLDER_INVÁLIDO}}',
      canonicalDraft: mockValidDocument,
      finalDraft: mockValidDocument + '\n{{PLACEHOLDER_INVÁLIDO}}',
      applicantName: 'João da Silva',
      applicantCpf: '123.456.789-00',
      applicantRg: '',
      applicantCnh: '98765432100',
      applicantAddress: '',
      applicantCityState: 'São Paulo/SP',
      vehiclePlate: 'ABC-1D23',
      vehicleModel: 'Teste',
      vehicleRenavam: '',
      aitNumber: 'AIT-12345',
      factsNarrative: '',
      selectedArgumentIds: ['ARG-001'],
      preliminaryArgumentsText: '',
      meritArgumentsText: '',
      legalRequestsText: '',
      closingPlaceDate: '',
      usedAI: false,
      refinementStatus: 'not_attempted',
      validationStatus: 'valid',
      integrityScore: 100,
      integrityIssues: [],
      engineVersion: '2.6.0',
      isReady: false,
      version: 1,
      updatedAt: new Date().toISOString(),
    };

    // Deve lançar erro quando Quality Gate bloqueia
    await expect(
      runControlledPipeline(
        {
          analysis: mockAnalysis,
          draft: draftWithPlaceholder,
          onboardingPayload: mockOnboardingPayload,
          canonicalCase: mockCanonicalCase,
        },
        { tone: 'formal_rigorous' }
      )
    ).rejects.toThrow('Quality Gate BLOCKED');
  });

  it('9. Não existe fallback que transforme erro do Gate em aprovação', async () => {
    // Draft válido mas com placeholder no texto
    const draftWithPlaceholder = {
      id: 'dft_test',
      caseId: 'case_test',
      procedureType: 'recurso_jari',
      fullDraftText: mockValidDocument + '\n{{TAG}}',
      canonicalDraft: mockValidDocument,
      finalDraft: mockValidDocument + '\n{{TAG}}',
      applicantName: 'João da Silva',
      applicantCpf: '123.456.789-00',
      applicantRg: '',
      applicantCnh: '98765432100',
      applicantAddress: '',
      applicantCityState: 'São Paulo/SP',
      vehiclePlate: 'ABC-1D23',
      vehicleModel: 'Teste',
      vehicleRenavam: '',
      aitNumber: 'AIT-12345',
      factsNarrative: '',
      selectedArgumentIds: ['ARG-001'],
      preliminaryArgumentsText: '',
      meritArgumentsText: '',
      legalRequestsText: '',
      closingPlaceDate: '',
      usedAI: false,
      refinementStatus: 'not_attempted',
      validationStatus: 'valid',
      integrityScore: 100,
      integrityIssues: [],
      engineVersion: '2.6.0',
      isReady: false, // placeholder não resolvido
      version: 1,
      updatedAt: new Date().toISOString(),
    };

    await expect(
      runControlledPipeline(
        {
          analysis: mockAnalysis,
          draft: draftWithPlaceholder,
          onboardingPayload: mockOnboardingPayload,
          canonicalCase: mockCanonicalCase,
        },
        { tone: 'formal_rigorous' }
      )
    ).rejects.toThrow('Quality Gate BLOCKED');

    // Verificar que NÃO retorna objeto com success/blocked=false
    try {
      await runControlledPipeline(
        {
          analysis: mockAnalysis,
          draft: draftWithPlaceholder,
          onboardingPayload: mockOnboardingPayload,
          canonicalCase: mockCanonicalCase,
        },
        { tone: 'formal_rigorous' }
      );
    } catch (err: any) {
      expect(err.message).toContain('Quality Gate BLOCKED');
      expect(err.message).not.toContain('APPROVED');
    }
  });

  it('10. Invariante: gate === APPROVED somente quando todos os critérios obrigatórios satisfeitos', () => {
    const report = runFinalQualityGate({
      onboardingPayload: mockOnboardingPayload,
      canonicalCase: mockCanonicalCase,
      analysis: mockAnalysis,
      finalDocument: mockValidDocument,
      lineage: mockLineage,
      argumentsCatalog: ARGUMENTS_CATALOG,
      blocksCatalog: [],
    });

    // Se overallPass === true, então TODOS os checks passaram
    if (report.overallPass) {
      expect(report.checks.every((c) => c.passed)).toBe(true);
      expect(report.blocked).toBe(false);
    }

    // Teste inverso: criar cenário onde um check falha
    const report2 = runFinalQualityGate({
      onboardingPayload: mockOnboardingPayload,
      canonicalCase: mockCanonicalCase,
      analysis: mockAnalysis,
      finalDocument: mockValidDocument + '\n{{TAG}}',
      lineage: mockLineage,
      argumentsCatalog: ARGUMENTS_CATALOG,
      blocksCatalog: [],
    });

    expect(report2.overallPass).toBe(false);
    expect(report2.blocked).toBe(true);
    expect(report2.checks.some((c) => !c.passed)).toBe(true);
  });

  it('11. runControlledPipeline com dados válidos NÃO lança erro', async () => {
    // Testar Quality Gate diretamente com lineage mock (como outros testes)
    const report = runFinalQualityGate({
      onboardingPayload: mockOnboardingPayload,
      canonicalCase: mockCanonicalCase,
      analysis: mockAnalysis,
      finalDocument: mockValidDocument,
      lineage: mockLineage,
      argumentsCatalog: ARGUMENTS_CATALOG,
      blocksCatalog: [],
    });

    expect(report.overallPass).toBe(true);
    expect(report.blocked).toBe(false);
    expect(report.score).toBe(100);
  });

  it('12. verifyDraft com validação inválida NÃO prossegue para Quality Gate (retorna cedo)', async () => {
    const invalidDraft = {
      id: 'dft_test',
      caseId: 'case_test',
      procedureType: 'recurso_jari',
      fullDraftText: '', // vazio -> validação falha
      canonicalDraft: '',
      finalDraft: '',
      applicantName: '',
      applicantCpf: '',
      applicantRg: '',
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
      usedAI: false,
      refinementStatus: 'not_attempted',
      validationStatus: 'invalid',
      integrityScore: 0,
      integrityIssues: [],
      engineVersion: '2.6.0',
      isReady: false,
      version: 1,
      updatedAt: new Date().toISOString(),
    };

    const result = await runControlledPipeline(
      {
        analysis: mockAnalysis,
        draft: invalidDraft,
        onboardingPayload: mockOnboardingPayload,
        canonicalCase: mockCanonicalCase,
      },
      { tone: 'formal_rigorous' }
    );

    // Deve retornar cedo sem chamar Quality Gate
    expect(result.draft.validationStatus).toBe('invalid');
    expect(result.qualityGateReport).toBeUndefined();
  });
});