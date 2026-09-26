/**
 * @file defense-integrity.ts
 * Integridade do documento de defesa (FASE 12 / FASE 13).
 *
 * FASE 12 — auditoria de acurácia:
 *  - `analysisId` saiu do payload. Ele é um UUID novo a cada execução, de modo
 *    que a "integridade" mudava a cada regeneração mesmo com conteúdo
 *    byte-idêntico (ACHADO A-04). Integridade representa CONTEÚDO, não a
 *    identidade aleatória de uma execução.
 *  - `factsNarrative` entrou no payload: o texto que o cliente pode sobrescrever
 *    (`cases.ts` aceita `body.customFacts`) passa a ser coberto pela
 *    integridade (ACHADO A-13).
 *  - `infractionFingerprint` entrou: sem ele, alterar os fatos do AIT não
 *    invalidava o documento já gerado (lacuna da FASE 12.6 §10).
 */

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

/** Fatos do auto que a peça sustenta: alteração aqui deve invalidar o documento. */
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
  analysis: DefenseIntegrityAnalysis | undefined,
  infraction?: DefenseIntegrityInfraction
): Promise<string> {
  const payload = {
    // Hash do artefato final: alterações no texto invalidam a integridade.
    fullDraftText: draft.fullDraftText ?? '',
    factsNarrative: draft.factsNarrative ?? '',
    selectedArgumentIds: Array.isArray(draft.selectedArgumentIds) ? draft.selectedArgumentIds : [],
    procedureType: draft.procedureType ?? '',
    recommendedProcedure: analysis?.recommendedProcedure ?? '',
    recommendedArgumentIds: Array.isArray(analysis?.recommendedArguments)
      ? analysis!.recommendedArguments!.map((a) => a.id ?? '')
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
  return sha256Hex(JSON.stringify(payload));
}

export async function hasValidDefenseIntegrity(
  draft: DefenseIntegrityDraft & { integrityHash?: string },
  analysis: DefenseIntegrityAnalysis | undefined,
  infraction?: DefenseIntegrityInfraction
): Promise<boolean> {
  if (!draft.integrityHash) return false;
  return draft.integrityHash === (await computeDefenseIntegrityHash(draft, analysis, infraction));
}