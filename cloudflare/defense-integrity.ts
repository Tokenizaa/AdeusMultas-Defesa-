/** Portado de src/core/documents/defense-integrity.ts (client: Web Crypto). */

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

const enc = new TextEncoder();

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Fingerprint determinístico do artefato de defesa persistido. */
export async function computeDefenseIntegrityHash(
  draft: DefenseIntegrityDraft,
  analysis: DefenseIntegrityAnalysis | undefined
): Promise<string> {
  const payload = {
    fullDraftText: draft.fullDraftText ?? '',
    selectedArgumentIds: Array.isArray(draft.selectedArgumentIds) ? draft.selectedArgumentIds : [],
    procedureType: draft.procedureType ?? '',
    analysisId: analysis?.id ?? '',
    recommendedProcedure: analysis?.recommendedProcedure ?? '',
    recommendedArgumentIds: Array.isArray(analysis?.recommendedArguments)
      ? analysis!.recommendedArguments!.map((a) => a.id ?? '')
      : [],
  };
  return sha256Hex(JSON.stringify(payload));
}

export async function hasValidDefenseIntegrity(
  draft: DefenseIntegrityDraft & { integrityHash?: string },
  analysis: DefenseIntegrityAnalysis | undefined
): Promise<boolean> {
  if (!draft.integrityHash) return false;
  return draft.integrityHash === (await computeDefenseIntegrityHash(draft, analysis));
}