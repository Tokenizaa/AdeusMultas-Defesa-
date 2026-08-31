/**
 * @file ai-orchestrator.ts
 * DefesaAI — Controlador de IA Subordinada (Fase 6)
 *
 * A IA NUNCA decide tese, artigo, jurisprudência ou fato. Ela atua somente como
 * refinador de prosa (polimento da redação) e gerador de resumo em linguagem
 * simples, SEMPRE sobre a base emitida pelo pipeline determinístico.
 *
 * Fluxo controlado:
 *   determinístico -> [IA refina prosa] -> [validador integridade] -> final
 *        se validação falhar => descarta saída de IA e mantém determinístico.
 *        se IA indisponível   => mantém determinístico (FAIL CLOSED, sem inventar).
 */

import { DefenseDraft, CaseAnalysis, LegalArgumentDomain, ProcedureType } from '../../types';
import { validateDraft } from '../validation/integrity-validator';

export interface AiRefinementProvider {
  /**
   * Refina APENAS a prosa/redação da minuta já montada. Deve preservar os
   * teores factuais e jurídicos; não recebe carta branca para inserir teses.
   */
  refineProse?: (draftText: string, opts?: { tone?: string }) => Promise<string | null>;
}

/** Injeção de dependência para manter o core puro (sem fetch/HTTP). */
let refinementProvider: AiRefinementProvider | null = null;

export function registerRefinementProvider(p: AiRefinementProvider): void {
  refinementProvider = p;
}

export interface ControlledRefinementResult {
  /** Texto final emitido: ou o refinado (se válido) ou o determinístico. */
  finalText: string;
  applied: boolean;
  reason: 'REFINED_VALID' | 'REFINED_REJECTED' | 'PROVIDER_UNAVAILABLE' | 'REFINEMENT_UNCHANGED';
  /** Razão da rejeição, quando REFINED_REJECTED (validador). */
  validationIssues?: string[];
}

/**
 * Fluxo controlado (Fase 6):
 * 1. Aplica refinamento de prosa da IA sobre a minuta determinística.
 * 2. Se o refinamento mudou algo, valida a integridade da minuta resultante.
 * 3. Falha: descarta a saída de IA, mantém o texto determinístico.
 *
 * O resultado NUNCA traz tese nova: teses vêm de analysis/recommendedArguments,
 * nunca do texto gerado por IA.
 */
export function runControlledRefinement(
  baseDraft: DefenseDraft,
  opts?: { tone?: string }
): ControlledRefinementResult {
  if (!refinementProvider || !refinementProvider.refineProse) {
    return {
      finalText: baseDraft.fullDraftText,
      applied: false,
      reason: 'PROVIDER_UNAVAILABLE',
    };
  }

  // IA refinamento é promissor; este caminho sincrono não pode await. Usamos
  // o provider somente se já vier resolvido; caso contrário mantém determinístico.
  // (runner assíncrono em applyAsyncRefinement para lidar com providers reais)
  return {
    finalText: baseDraft.fullDraftText,
    applied: false,
    reason: 'PROVIDER_UNAVAILABLE',
  };
}

/**
 * Versão assíncrona real: chama o provider (Gemini etc.), valida e decide.
 */
export async function applyAsyncRefinement(
  baseDraft: DefenseDraft,
  opts?: { tone?: string }
): Promise<ControlledRefinementResult> {
  if (!refinementProvider || !refinementProvider.refineProse) {
    return { finalText: baseDraft.fullDraftText, applied: false, reason: 'PROVIDER_UNAVAILABLE' };
  }

  let refined: string | null;
  try {
    refined = await refinementProvider.refineProse(baseDraft.fullDraftText, opts);
  } catch (err) {
    // IA indisponível/erro => mantém determinístico, nunca inventa.
    return { finalText: baseDraft.fullDraftText, applied: false, reason: 'PROVIDER_UNAVAILABLE' };
  }

  if (!refined || refined.trim().length === 0) {
    return { finalText: baseDraft.fullDraftText, applied: false, reason: 'REFINEMENT_UNCHANGED' };
  }
  if (refined === baseDraft.fullDraftText) {
    return { finalText: baseDraft.fullDraftText, applied: false, reason: 'REFINEMENT_UNCHANGED' };
  }

  // Validação de integridade da minuta refinada: precisa preservar os campos
  // estruturais (AIT, procedimento, caseId). NUNCA corrige silenciosamente.
  const candidate: DefenseDraft = { ...baseDraft, fullDraftText: refined };
  const report = validateDraft(candidate);
  if (!report.valid) {
    return {
      finalText: baseDraft.fullDraftText,
      applied: false,
      reason: 'REFINED_REJECTED',
      validationIssues: report.issues.filter((i) => i.severity === 'error').map((i) => `${i.code}: ${i.message}`),
    };
  }

  return { finalText: refined, applied: true, reason: 'REFINED_VALID' };
}

// ===== Construção da minuta final em 3 estágios (Fase 6) =====

export interface PipelineInput {
  analysis: CaseAnalysis;
  draft: DefenseDraft;
}

export interface PipelineResult {
  draft: DefenseDraft;
  aiUses: 'deterministic' | 'controlled_refinement';
  controlled: ControlledRefinementResult;
  validationReport: ReturnType<typeof validateDraft>;
}

/**
 * Fluxo completo determinístico -> IA -> validador -> final (Fase 6).
 * IA refinamento só entra se passar na validação; caso contrário, determinístico.
 */
export async function runControlledPipeline(input: PipelineInput, opts?: { tone?: string }): Promise<PipelineResult> {
  // 1. Base determinística validada.
  const baseValid = validateDraft(input.draft);
  if (!baseValid.valid) {
    // Não há o que refinar com garantia: retorna a base (validador aponta erros).
    return {
      draft: input.draft,
      aiUses: 'deterministic',
      controlled: { finalText: input.draft.fullDraftText, applied: false, reason: 'PROVIDER_UNAVAILABLE' },
      validationReport: baseValid,
    };
  }

  // 2. Refinamento controlado (IA) sobre a base válida.
  const controlled = await applyAsyncRefinement(input.draft, opts);

  // 3. Compõe minuta final.
  const finalDraft: DefenseDraft = {
    ...input.draft,
    fullDraftText: controlled.finalText,
    // IA nunca altera a seleção de teses: preserva a derivada da análise.
    selectedArgumentIds: (input.analysis.recommendedArguments || []).map((a) => a.id),
  };

  return {
    draft: finalDraft,
    aiUses: controlled.applied ? 'controlled_refinement' : 'deterministic',
    controlled,
    validationReport: validateDraft(finalDraft),
  };
}

// Re-export utilitário: teses permitidas (só do catálogo / análise).
export function permittedTheses(analysis: CaseAnalysis): LegalArgumentDomain[] {
  return analysis.recommendedArguments || [];
}

export { ProcedureType };
