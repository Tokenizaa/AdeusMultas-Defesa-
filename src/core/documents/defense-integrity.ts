import { createHash } from 'node:crypto';

export interface DefenseIntegrityDraft {
  fullDraftText?: string;
  selectedArgumentIds?: string[];
  procedureType?: string;
}

export interface DefenseIntegrityAnalysis {
  id?: string;
  recommendedProcedure?: string;
  recommendedArguments?: Array<{ id?: string }>;
}

/**
 * Deterministic fingerprint for a persisted defense artifact.
 * It detects post-generation mutations of the final text, authorized thesis
 * selection, or canonical procedure/analysis identity.
 *
 * This is an integrity detector, not an authentication primitive: the hash is
 * intentionally deterministic and must not be treated as a secret signature.
 */
export function computeDefenseIntegrityHash(
  draft: DefenseIntegrityDraft,
  analysis: DefenseIntegrityAnalysis | undefined
): string {
  const payload = {
    fullDraftText: draft.fullDraftText ?? '',
    selectedArgumentIds: Array.isArray(draft.selectedArgumentIds)
      ? draft.selectedArgumentIds
      : [],
    procedureType: draft.procedureType ?? '',
    analysisId: analysis?.id ?? '',
    recommendedProcedure: analysis?.recommendedProcedure ?? '',
    recommendedArgumentIds: Array.isArray(analysis?.recommendedArguments)
      ? analysis!.recommendedArguments!.map((argument) => argument.id ?? '')
      : [],
  };

  return createHash('sha256').update(JSON.stringify(payload), 'utf8').digest('hex');
}

export function hasValidDefenseIntegrity(
  draft: DefenseIntegrityDraft & { integrityHash?: string },
  analysis: DefenseIntegrityAnalysis | undefined
): boolean {
  if (!draft.integrityHash) return false;
  return draft.integrityHash === computeDefenseIntegrityHash(draft, analysis);
}
