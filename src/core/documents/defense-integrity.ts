import { createHash } from 'node:crypto';

export interface DefenseIntegrityDraft {
  fullDraftText?: string;
  factsNarrative?: string;
  selectedArgumentIds?: string[];
  procedureType?: string;
}

export interface DefenseIntegrityAnalysis {
  id?: string;
  recommendedProcedure?: string;
  recommendedArguments?: Array<{ id?: string }>;
}

/** Fatos do auto que a peça sustenta (paridade com cloudflare/defense-integrity.ts). */
export interface DefenseIntegrityInfraction {
  aitNumber?: string;
  infractionCode?: string;
  ctbArticle?: string;
  dateTime?: string;
  location?: string;
  measuredSpeed?: number;
  consideredSpeed?: number;
  speedLimit?: number;
  radarEquipmentId?: string;
  inmetroAferitionDate?: string;
}

/**
 * Deterministic fingerprint for a persisted defense artifact.
 * It detects post-generation mutations of the final text, the factual narrative,
 * the authorized thesis selection, the canonical procedure and the infraction
 * facts the document relies on.
 *
 * FASE 12: `analysisId` saiu do payload. Ele é um UUID novo por execução, então
 * a integridade mudava mesmo com conteúdo byte-idêntico (ACHADO A-04).
 * Integridade representa CONTEÚDO, não identidade aleatória de execução.
 *
 * This is an integrity detector, not an authentication primitive: the hash is
 * intentionally deterministic and must not be treated as a secret signature.
 */
export function computeDefenseIntegrityHash(
  draft: DefenseIntegrityDraft,
  analysis: DefenseIntegrityAnalysis | undefined,
  infraction?: DefenseIntegrityInfraction
): string {
  const payload = {
    // Hash do artefato final: alterações no texto invalidam a integridade.
    fullDraftText: draft.fullDraftText ?? '',
    factsNarrative: draft.factsNarrative ?? '',
    selectedArgumentIds: Array.isArray(draft.selectedArgumentIds)
      ? draft.selectedArgumentIds
      : [],
    procedureType: draft.procedureType ?? '',
    recommendedProcedure: analysis?.recommendedProcedure ?? '',
    recommendedArgumentIds: Array.isArray(analysis?.recommendedArguments)
      ? analysis!.recommendedArguments!.map((argument) => argument.id ?? '')
      : [],
    infraction: {
      aitNumber: infraction?.aitNumber ?? '',
      infractionCode: infraction?.infractionCode ?? '',
      ctbArticle: infraction?.ctbArticle ?? '',
      dateTime: infraction?.dateTime ?? '',
      location: infraction?.location ?? '',
      measuredSpeed: infraction?.measuredSpeed ?? '',
      consideredSpeed: infraction?.consideredSpeed ?? '',
      speedLimit: infraction?.speedLimit ?? '',
      radarEquipmentId: infraction?.radarEquipmentId ?? '',
      inmetroAferitionDate: infraction?.inmetroAferitionDate ?? '',
    },
  };

  return createHash('sha256').update(JSON.stringify(payload), 'utf8').digest('hex');
}

export function hasValidDefenseIntegrity(
  draft: DefenseIntegrityDraft & { integrityHash?: string },
  analysis: DefenseIntegrityAnalysis | undefined,
  infraction?: DefenseIntegrityInfraction
): boolean {
  if (!draft.integrityHash) return false;
  return draft.integrityHash === computeDefenseIntegrityHash(draft, analysis, infraction);
}
