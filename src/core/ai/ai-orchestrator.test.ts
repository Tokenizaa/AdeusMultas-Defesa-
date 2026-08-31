import { describe, it, expect, afterEach } from 'vitest';
import {
  registerRefinementProvider,
  runControlledPipeline,
  applyAsyncRefinement,
  runControlledRefinement,
} from './ai-orchestrator';
import { DefenseDraft } from '../../types';

function baseDraft(overrides?: Partial<DefenseDraft>): DefenseDraft {
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
    fullDraftText: 'TEXTO DETERMINÍSTICO ORIGINAL COM FUNDAMENTAÇÃO.',
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

describe('Controlled AI Orchestrator — Fase 6', () => {
  afterEach(() => {
    registerRefinementProvider({});
  });

  it('keeps deterministic draft when no refinement provider is registered', async () => {
    const draft = baseDraft();
    const res = await runControlledPipeline({ analysis: baseAnalysis() as any, draft });
    expect(res.aiUses).toBe('deterministic');
    expect(res.draft.fullDraftText).toBe(draft.fullDraftText);
  });

  it('applies refinement only when the refined draft passes integrity validation', async () => {
    registerRefinementProvider({
      refineProse: async (text) => `${text}\n\n[Prosa refinada pela IA — mantém os fatos]`,
    });
    const draft = baseDraft();
    const res = await runControlledPipeline({ analysis: baseAnalysis() as any, draft });
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
    const res = await runControlledPipeline({ analysis: baseAnalysis() as any, draft });
    expect(res.aiUses).toBe('deterministic');
    expect(res.draft.fullDraftText).toBe(draft.fullDraftText);
    expect(res.controlled.reason).toBe('REFINEMENT_UNCHANGED');
  });

  it('falls back to deterministic text when the AI provider throws', async () => {
    registerRefinementProvider({
      refineProse: async () => { throw new Error('gemini 503'); },
    });
    const draft = baseDraft();
    const res = await runControlledPipeline({ analysis: baseAnalysis() as any, draft });
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
