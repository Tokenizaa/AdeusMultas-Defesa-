import { describe, it, expect, afterEach } from 'vitest';
import {
  registerRefinementProvider,
  runControlledPipeline,
  applyAsyncRefinement,
  runControlledRefinement,
} from './ai-orchestrator';
import { DefenseDraft } from '../../types';

function baseDraft(overrides?: Partial<DefenseDraft>): DefenseDraft {
  const fullDraftText = `
ILUSTRÍSSIMO SENHOR DIRETOR DA AUTORIDADE DE TRÂNSITO DO(A) DETRAN-SP

QUALIFICAÇÃO DO REQUERENTE
João Silva, brasileiro, CPF 12345678900, CNH 12345678900

IDENTIFICAÇÃO DO AUTO DE INFRAÇÃO
AIT nº AIT-99, artigo 218 do CTB, código 745-50, DETRAN-SP, 2024-01-15T10:30:00Z, Av. Paulista, 1000, grave

DOS FATOS
A autuação padece de vícios. Placa ABC-1234.

PRELIMINARES
Preliminares.

MÉRITO
Mérito.

PEDIDOS
Requer anulação.

ROL DE DOCUMENTOS
1. Cópia da NP

NESTES TERMOS
Pede deferimento.
São Paulo/SP, 15/01/2026
`.trim();

  return {
    id: 'dft_1',
    caseId: 'case_x',
    procedureType: 'recurso_jari',
    authorityAddressing: 'ILUSTRÍSSIMO SENHOR DIRETOR DA AUTORIDADE DE TRÂNSITO DO(A) DETRAN-SP',
    applicantName: 'João Silva',
    applicantCpf: '12345678900',
    applicantCnh: '12345678900',
    applicantAddress: 'Rua X, 1',
    applicantCityState: 'São Paulo/SP',
    vehiclePlate: 'ABC-1234',
    vehicleModel: 'Honda',
    aitNumber: 'AIT-99',
    factsNarrative: 'A autuação padece de vícios.',
    selectedArgumentIds: ['ARG-025', 'ARG-049'],
    preliminaryArgumentsText: 'Preliminares.',
    meritArgumentsText: 'Mérito.',
    legalRequestsText: 'Requer anulação.',
    closingPlaceDate: 'São Paulo/SP, 15/01/2026',
    fullDraftText,
    canonicalDraft: fullDraftText,
    finalDraft: fullDraftText,
    ...overrides,
  };
}

function baseAnalysis() {
  return {
    id: 'anl_1',
    caseId: 'case_x',
    overallSuccessRate: 88,
    detectedInconsistencies: [
      { title: 't', description: 'd', severity: 'alta' as const, legalArgumentId: 'ARG-025', impact: 'i' },
    ],
    recommendedArguments: [
      { id: 'ARG-025', title: 'Tese' } as any,
      { id: 'ARG-049', title: 'Garantia' } as any,
    ],
    recommendedProcedure: 'recurso_jari' as const,
    competentBody: 'DETRAN-SP',
    summaryReasoning: 's',
    createdAt: new Date().toISOString(),
  };
}

// Mock data for Quality Gate required parameters (matching the structure expected by final-quality-gate)
const mockOnboardingPayload = {
  infraction: { 
    aitNumber: 'AIT-99', 
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
  vehicle: { plate: 'ABC-1234' },
  applicant: { name: 'João Silva', cpf: '12345678900', cnh: '12345678900', addressCityState: 'São Paulo/SP' },
};

const mockCanonicalCase = { id: 'case_x' };

describe('Controlled AI Orchestrator — Fase 6', () => {
  afterEach(() => {
    registerRefinementProvider({});
  });

  it('keeps deterministic draft when no refinement provider is registered', async () => {
    const draft = baseDraft();
    const res = await runControlledPipeline({ analysis: baseAnalysis() as any, draft, onboardingPayload: mockOnboardingPayload, canonicalCase: mockCanonicalCase });
    expect(res.aiUses).toBe('deterministic');
    expect(res.draft.fullDraftText).toBe(draft.fullDraftText);
  });

  it('applies refinement only when the refined draft passes integrity validation', async () => {
    registerRefinementProvider({
      refineProse: async (text) => `${text}\n\n[Prosa refinada pela IA — mantém os fatos]`,
    });
    const draft = baseDraft();
    const res = await runControlledPipeline({ analysis: baseAnalysis() as any, draft, onboardingPayload: mockOnboardingPayload, canonicalCase: mockCanonicalCase });
    expect(res.aiUses).toBe('controlled_refinement');
    expect(res.controlled.applied).toBe(true);
    expect(res.draft.fullDraftText).toContain('Prosa refinada pela IA');
    // IA jamais altera a seleção de teses: segue a análise.
    expect(res.draft.selectedArgumentIds).toEqual(['ARG-025', 'ARG-049']);
  });

  it('discards AI output and keeps deterministic draft when refinement breaks integrity (empty draft)', async () => {
    registerRefinementProvider({
      refineProse: async () => '', // IA produz texto vazio/alucinação
    });
    const draft = baseDraft();
    const res = await runControlledPipeline({ analysis: baseAnalysis() as any, draft, onboardingPayload: mockOnboardingPayload, canonicalCase: mockCanonicalCase });
    expect(res.aiUses).toBe('deterministic');
    expect(res.draft.fullDraftText).toBe(draft.fullDraftText);
    expect(res.controlled.reason).toBe('REFINEMENT_UNCHANGED');
  });

  it('falls back to deterministic text when the AI provider throws', async () => {
    registerRefinementProvider({
      refineProse: async () => { throw new Error('gemini 503'); },
    });
    const draft = baseDraft();
    const res = await runControlledPipeline({ analysis: baseAnalysis() as any, draft, onboardingPayload: mockOnboardingPayload, canonicalCase: mockCanonicalCase });
    expect(res.aiUses).toBe('deterministic');
    expect(res.controlled.reason).toBe('PROVIDER_UNAVAILABLE');
    expect(res.draft.fullDraftText).toBe(draft.fullDraftText);
  });

  it('sync runControlledRefinement never yields AI text without a provider', () => {
    const draft = baseDraft();
    const res = runControlledRefinement(draft);
    expect(res.applied).toBe(false);
    expect(res.finalText).toBe(draft.fullDraftText);
  });

  it('applyAsyncRefinement rejects refinement when validateDraft flags structural error', async () => {
    registerRefinementProvider({
      refineProse: async () => 'texto qualquer que não preserva minuta',
    });
    // Base com caseId vazio já é inválida; o candidato refinado herda o caseId
    // vazio e a validação de integridade falha -> rejeita, mantém a base.
    const draft = baseDraft({ caseId: '' });
    const res = await applyAsyncRefinement(draft);
    expect(res.reason).toBe('REFINED_REJECTED');
    expect(res.finalText).toBe(draft.fullDraftText);
    expect(res.validationIssues).toBeDefined();
  });
});
