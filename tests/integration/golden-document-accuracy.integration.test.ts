/**
 * @file golden-document-accuracy.integration.test.ts
 * FASE 12 — Auditoria de acurácia e diferenciação dos 10 Golden Documents.
 *
 * SUÍTE CANÔNICA. Substitui o uso do `test/golden-document-test.ts` (FASE 19)
 * como evidência de acurácia — aquele script roda o RagPipeline legado
 * determinístico e NÃO exercita o runtime de produção. Aqui os 10 GD executam
 * pelo runtime canônico (Cloudflare Worker), na ordem obrigatória:
 *
 *   Case → Analysis Fresh → RAG/KB → provenance → recommendedArguments →
 *   autorização → DocumentAssembly → Quality Gate → IntegrityHash → documento
 *
 * Pergunta central: dados diferentes geram análises coerentes com cada caso,
 * argumentos próprios, documentos correspondentes aos fatos daquele caso,
 * rastreáveis e sem reutilização indevida?
 *
 * NÃO é um teste de "10 hashes diferentes". Cada caso é executado como caso
 * independente e cada afirmação é verificada contra o conteúdo, não só id.
 *
 * Evidência completa em: test-results/golden-document-accuracy.json (gitignored)
 * Relatório: docs/recovery/FASE-12-GOLDEN-DOCUMENT-ACCURACY-2026-09-25.md
 *
 * Requer: .env com SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY do canônico.
 * Sem credencial a suíte é SKIPPED (mesmo padrão de golden-path-documents).
 */
import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { analyzeInfractionCompat, generateDefenseDraftCompat } from '../../cloudflare/rag-adapter';
import { hasValidDefenseIntegrity } from '../../cloudflare/defense-integrity';
import { domainToRow, rowToDomain } from '../../cloudflare/canonical-mapper';
import { runFullQualityGate } from '../../src/core/validation/final-quality-gate';
import { ARGUMENTS_CATALOG } from '../../src/core/arguments/arguments-catalog';
import { ALL_GOLDEN_DOCUMENTS } from '../fixtures/golden-documents';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const skip = !SUPABASE_URL || !SERVICE_ROLE;

const env: any = { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE };

/** Procedimento padrão do runtime: `domain.serviceType || 'recurso_jari'` (cases.ts:286). */
const PROCEDURE_TYPE = 'recurso_jari';

/** Condutor de teste — o runtime exige qualificação completa (cases.ts:265-276). */
const APPLICANT = {
  name: 'JOSE CARLOS DE SOUZA',
  cpf: '123.456.789-00',
  // Deliberadamente distinto de qualquer AIT: se o CNH colidisse com um número de
  // auto, o teste de contaminação entre casos acusaria falso positivo.
  cnh: '98765432100',
  address: 'Rua das Flores, 123',
  cityState: 'Sao Paulo - SP',
};

const VEHICLE = { plate: 'ABC1D23', model: 'FIAT UNO' };

// ─────────────────────────────────────────────────────────────────────────────
// Tipos da evidência
// ─────────────────────────────────────────────────────────────────────────────

type FieldVerdict = 'MATCH' | 'MISMATCH' | 'MISSING' | 'NOT_APPLICABLE';

interface FieldCheck {
  field: string;
  input: string;
  verdict: FieldVerdict;
}

interface GdEvidence {
  id: string;
  name: string;
  caseId: string;
  input: Record<string, unknown>;
  analysis: {
    id: string;
    engineVersion: string;
    recommendedProcedure: string;
    competentBody: string;
    overallSuccessRate: number | null;
    ruleArgumentIds: string[];
    ragArgumentIds: string[];
    recommendedArgumentIds: string[];
    contentFingerprint: string;
    evaluatedRules: number;
    detectedFlaws: number;
    dataGaps: number;
  };
  provenance: Array<{
    argumentId: string;
    chunkId: string;
    sourceId: string;
    documentId: string;
    documentVersionId: string;
    officialUrl: string;
    articleNumber: string | null;
  }>;
  authorizedArgumentIds: string[];
  document: {
    hash: string;
    normalizedHash: string;
    normalizedLength: number;
    length: number;
    integrityHash: string;
    integrityValid: boolean;
    unresolvedPlaceholders: string[];
  };
  qualityGate: {
    overallPass: boolean;
    score: number;
    blocked: boolean;
    failedChecks: string[];
  };
  fieldChecks: FieldCheck[];
  argumentsInDocument: string[];
  argumentsMissingFromDocument: string[];
  factsNarrativeEmpty: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers determinísticos
// ─────────────────────────────────────────────────────────────────────────────

const sha256 = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Remove os tokens Case-específicos para revelar a estrutura do template.
 * Dois documentos com o mesmo normalizedHash têm a mesma estrutura textual,
 * diferindo apenas nos dados do caso. Serve para distinguir "template comum
 * com dados próprios" de "texto reciclado".
 */
const normalizeDocument = (text: string, gdId: string, ait: string): string =>
  text
    .replace(new RegExp(ait, 'g'), '<AIT>')
    .replace(new RegExp(gdId, 'g'), '<GD>')
    .replace(/\d{1,3}(\.\d{3})*\/\d{2}-\d{2}/g, '<DOC>')
    .replace(/\b\d{1,2} de \w+ de \d{4}\b/g, '<DATA>')
    .replace(/\d{2} de \w{3,10} de \d{4}/g, '<DATA>')
    .replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g, '<DATA>')
    .replace(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, '<DATA>')
    .replace(/\d+([.,]\d+)?/g, '#')
    .replace(/\s+/g, ' ')
    .trim();

/** Jaccard de tokens — mede quanto dois documentos compartilham de texto. */
const tokenSimilarity = (a: string, b: string): number => {
  const ta = new Set(a.toLowerCase().split(/\s+/).filter((t) => t.length > 3));
  const tb = new Set(b.toLowerCase().split(/\s+/).filter((t) => t.length > 3));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
};

/** Campos factuais verificados contra o documento final (Fase 3 da auditoria). */
const factChecksFor = (infraction: any): Array<[string, unknown]> => [
  ['infraction.aitNumber', infraction.aitNumber],
  ['infraction.infractionCode', infraction.infractionCode],
  ['infraction.ctbArticle', infraction.ctbArticle],
  ['infraction.description', infraction.description],
  ['infraction.autuadorBody', infraction.autuadorBody],
  ['infraction.dateTime', infraction.dateTime],
  ['infraction.location', infraction.location],
  ['infraction.severity', infraction.severity],
  ['infraction.speedLimit', infraction.speedLimit],
  ['infraction.measuredSpeed', infraction.measuredSpeed ?? infraction.speedMeasured],
  ['infraction.consideredSpeed', infraction.consideredSpeed ?? infraction.speedConsidered],
  ['infraction.radarEquipmentId', infraction.radarEquipmentId],
  ['infraction.inmetroAferitionDate', infraction.inmetroAferitionDate],
  ['vehicle.plate', VEHICLE.plate],
  ['vehicle.model', VEHICLE.model],
  ['applicant.name', APPLICANT.name],
  ['applicant.cpf', APPLICANT.cpf],
  ['applicant.cnh', APPLICANT.cnh],
];

const verdictFor = (value: unknown, document: string): FieldVerdict => {
  if (value === undefined || value === null || value === '') return 'NOT_APPLICABLE';
  const raw = String(value);
  const haystack = document.toLowerCase();
  const candidates = new Set<string>([
    ...raw.split(' - '),
    raw.replace(/-/g, ' '),
    raw.replace(/[.,]/g, ''),
  ]);
  // O documento renderiza a data em pt-BR; o Case a traz em ISO (ou vice-versa).
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) candidates.add(`${iso[3]}/${iso[2]}/${iso[1]}`);
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) candidates.add(`${br[3]}-${br[2]}-${br[1]}`);
  const found = Array.from(candidates).some((c) => c.trim().length > 0 && haystack.includes(c.toLowerCase().trim()));
  return found ? 'MATCH' : 'MISSING';
};

/**
 * Executa um bloco de asserções de ACHADO e exige que a falhaobserved venha
 * daquele achado. `it.fails` sozinho passaria com qualquer throw (typo, rede,
 * credencial), silenciando o achado original.
 */
function assertFinding(achado: string, fn: () => void) {
  let error: any;
  try {
    fn();
  } catch (e: any) {
    error = e;
  }
  const message = String(error?.message ?? '');
  expect(message, `${achado}: a asserção passou — o gap pode ter sido corrigido; remova o marcador it.fails`).not.toBe('');
  expect(message, `${achado}: a falha não veio deste achado`).toContain(achado);
  // Relança para que `it.fails` veja a falha esperada.
  throw error;
}

// ─────────────────────────────────────────────────────────────────────────────
// Execução
// ─────────────────────────────────────────────────────────────────────────────

const evidence: GdEvidence[] = [];

async function readProvenance(chunkIds: string[]) {
  if (chunkIds.length === 0) return [];
  const url = `${SUPABASE_URL}/rest/v1/knowledge_chunks?select=id,source_id,document_id,document_version_id,article_number,knowledge_document_versions(source_url)&id=in.(${chunkIds.join(',')})`;
  const res = await fetch(url, {
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
  });
  if (!res.ok) return [];
  const rows: any[] = await res.json();
  return rows.map((r) => ({
    chunkId: r.id,
    sourceId: r.source_id,
    documentId: r.document_id,
    documentVersionId: r.document_version_id,
    officialUrl: r.knowledge_document_versions?.source_url ?? '',
    articleNumber: r.article_number,
  }));
}

async function runGoldenDocument(gd: (typeof ALL_GOLDEN_DOCUMENTS)[number]) {
  const caseId = `case_${gd.id.toLowerCase()}_${Date.now().toString(36)}`;
  const infraction = gd.infraction as any;

  // 1) Analysis Fresh — runtime canônico (RAG/KB + Rule Engine)
  const analysis: any = await analyzeInfractionCompat(env, caseId, infraction);

  // 2) provenance — os argumentos RAG carregam o chunk_id; a fonte é resolvida na KB
  const ragArgumentIds = analysis.recommendedArguments
    .map((a: any) => a.id)
    .filter((id: string) => id.startsWith('RAG-'));
  const chunkIds = ragArgumentIds.map((id: string) => id.replace(/^RAG-/, ''));
  const provenance = await readProvenance(chunkIds);

  // 3) Documento + IntegrityHash — Analysis do passo 1 é a autoridade (FASE 12.4/12.5)
  const draft: any = await generateDefenseDraftCompat(
    env,
    caseId,
    infraction,
    VEHICLE.plate,
    VEHICLE.model,
    APPLICANT as any,
    PROCEDURE_TYPE as any,
    analysis,
  );

  // 4) Quality Gate — os mesmos 7 checks fail-closed do runtime
  const onboardingPayload: any = {
    procedureType: PROCEDURE_TYPE,
    identification: {
      aitNumber: infraction.aitNumber,
      infractionCode: infraction.infractionCode,
      autuadorBody: infraction.autuadorBody,
      notificationExpeditionDate: infraction.notificationExpeditionDate,
    },
    vehicle: { plate: VEHICLE.plate, brandModel: VEHICLE.model },
    infraction: { ...infraction },
    applicant: {
      name: APPLICANT.name,
      cpf: APPLICANT.cpf,
      cnh: APPLICANT.cnh,
      address: APPLICANT.address,
      addressCityState: APPLICANT.cityState,
    },
    specificFacts: {},
    evidence: {},
  };
  const qg: any = runFullQualityGate(onboardingPayload, { id: caseId }, analysis, draft.fullDraftText);

  const documentText: string = draft.fullDraftText || '';
  const fieldChecks: FieldCheck[] = factChecksFor(infraction).map(([field, value]) => ({
    field,
    input: value === undefined || value === null ? '' : String(value),
    verdict: verdictFor(value, documentText),
  }));

  const normalized = normalizeDocument(documentText, gd.id, infraction.aitNumber);
  const authorizedArgumentIds: string[] = draft.selectedArgumentIds || [];
  const authorizedWithText = authorizedArgumentIds
    .map((id) => ARGUMENTS_CATALOG.find((a) => a.id === id))
    .filter(Boolean) as any[];

  const record: GdEvidence = {
    id: gd.id,
    name: gd.name,
    caseId,
    input: {
      code: infraction.infractionCode,
      article: infraction.ctbArticle,
      description: infraction.description,
      autuador: infraction.autuadorBody,
      dateTime: infraction.dateTime,
      location: infraction.location,
      severity: infraction.severity,
      points: infraction.points,
      fineAmount: infraction.fineAmount,
      speedLimit: infraction.speedLimit ?? null,
      measuredSpeed: infraction.measuredSpeed ?? null,
      consideredSpeed: infraction.consideredSpeed ?? null,
      radarEquipmentId: infraction.radarEquipmentId ?? null,
      inmetroAferitionDate: infraction.inmetroAferitionDate ?? null,
      hasPreviousInfractionsLast12Months: infraction.hasPreviousInfractionsLast12Months,
      hasR19SignageProof: infraction.hasR19SignageProof,
      hasPhotoProof: infraction.hasPhotoProof,
      hasPsychomotorTerm: infraction.hasPsychomotorTerm,
      refusedTest: infraction.refusedTest ?? null,
      offeredRetest: infraction.offeredRetest ?? null,
      yellowPhaseCrossing: infraction.yellowPhaseCrossing ?? null,
      cellphoneCircumstance: infraction.cellphoneCircumstance ?? null,
      evidenceFlags: infraction.evidenceFlags,
    },
    analysis: {
      id: analysis.id,
      engineVersion: analysis.engineVersion,
      recommendedProcedure: analysis.recommendedProcedure,
      competentBody: analysis.competentBody,
      overallSuccessRate: analysis.overallSuccessRate ?? null,
      ruleArgumentIds: analysis.recommendedArguments
        .map((a: any) => a.id)
        .filter((id: string) => !id.startsWith('RAG-')),
      ragArgumentIds,
      recommendedArgumentIds: analysis.recommendedArguments.map((a: any) => a.id),
      contentFingerprint: '',
      evaluatedRules: analysis.evaluatedRules?.length ?? 0,
      detectedFlaws: analysis.detectedFlaws?.length ?? 0,
      dataGaps: analysis.dataGaps?.length ?? 0,
    },
    provenance: ragArgumentIds.map((argumentId, i) => ({
      argumentId,
      chunkId: chunkIds[i],
      sourceId: provenance[i]?.sourceId ?? 'NOT_FOUND',
      documentId: provenance[i]?.documentId ?? 'NOT_FOUND',
      documentVersionId: provenance[i]?.documentVersionId ?? 'NOT_FOUND',
      officialUrl: provenance[i]?.officialUrl ?? 'NOT_FOUND',
      articleNumber: provenance[i]?.articleNumber ?? null,
    })),
    authorizedArgumentIds,
    document: {
      hash: '',
      normalizedHash: '',
      normalizedLength: normalized.length,
      length: documentText.length,
      integrityHash: draft.integrityHash,
      integrityValid: await hasValidDefenseIntegrity(draft, analysis, {
        aitNumber: infraction.aitNumber,
        infractionCode: infraction.infractionCode,
        ctbArticle: infraction.ctbArticle,
        dateTime: infraction.dateTime,
        location: infraction.location,
        measuredSpeed: infraction.measuredSpeed,
        consideredSpeed: infraction.consideredSpeed,
        speedLimit: infraction.speedLimit,
        radarEquipmentId: infraction.radarEquipmentId,
        inmetroAferitionDate: infraction.inmetroAferitionDate,
      }),
      unresolvedPlaceholders: draft.validation?.unresolvedPlaceholders ?? [],
    },
    qualityGate: {
      overallPass: qg.overallPass,
      score: qg.score,
      blocked: qg.blocked,
      failedChecks: qg.checks.filter((c: any) => !c.passed).map((c: any) => c.check),
    },
    fieldChecks,
    argumentsInDocument: authorizedWithText
      .filter((a) => documentText.toUpperCase().includes(a.title.toUpperCase()))
      .map((a) => a.id),
    argumentsMissingFromDocument: authorizedWithText
      .filter((a) => !documentText.toUpperCase().includes(a.title.toUpperCase()))
      .map((a) => a.id),
    factsNarrativeEmpty: !draft.factsNarrative,
  };

  // Fingerprints (excluem id/createdAt aleatórios — a unicidade de id não prova nada)
  record.analysis.contentFingerprint = await sha256(
    JSON.stringify({
      procedure: record.analysis.recommendedProcedure,
      body: record.analysis.competentBody,
      args: analysis.recommendedArguments.map((a: any) => ({ id: a.id, title: a.title, baseLegal: a.baseLegal })),
    }),
  );
  record.document.hash = await sha256(documentText);
  record.document.normalizedHash = await sha256(normalized);
  return { record, documentText, normalized };
}

const docs = new Map<string, { text: string; normalized: string }>();

/** Comparação par-a-par dos 10 documentos (Fase 5 da auditoria). */
function pairwiseSimilarity() {
  const pairs: Array<{ a: string; b: string; codeA: string; codeB: string; similarity: number }> = [];
  for (let i = 0; i < evidence.length; i++) {
    for (let j = i + 1; j < evidence.length; j++) {
      pairs.push({
        a: evidence[i].id,
        b: evidence[j].id,
        codeA: String(evidence[i].input.code),
        codeB: String(evidence[j].input.code),
        similarity: Number(tokenSimilarity(docs.get(evidence[i].id)!.text, docs.get(evidence[j].id)!.text).toFixed(4)),
      });
    }
  }
  return pairs;
}

describe.skipIf(skip)('FASE 12 — Acurácia e diferenciação dos Golden Documents (runtime canônico)', () => {
  beforeAll(async () => {
    for (const gd of ALL_GOLDEN_DOCUMENTS) {
      const { record, documentText, normalized } = await runGoldenDocument(gd);
      evidence.push(record);
      docs.set(gd.id, { text: documentText, normalized });
    }
    mkdirSync('test-results', { recursive: true });
    writeFileSync(
      'test-results/golden-document-accuracy.json',
      JSON.stringify({ cases: evidence, pairwiseSimilarity: pairwiseSimilarity() }, null, 2),
    );
  }, 180000);

  it('Fase 2 — cada GD tem Case, Analysis fresh e Identification próprios', () => {
    expect(evidence).toHaveLength(10);
    const caseIds = new Set(evidence.map((e) => e.caseId));
    expect(caseIds.size).toBe(10);
    const analysisIds = new Set(evidence.map((e) => e.analysis.id));
    expect(analysisIds.size).toBe(10);
    for (const e of evidence) {
      expect(e.analysis.id, `${e.id} sem id de Analysis`).toBeTruthy();
      expect(e.analysis.contentFingerprint, `${e.id} sem fingerprint`).toMatch(/^[0-9a-f]{64}$/);
      expect(e.analysis.engineVersion, `${e.id} sem engineVersion`).toBeTruthy();
    }
  });

  // ACHADO A-01 (FASE 12, relatório §12): 4 casos com inputs distintos
  // (GD-01/02/04/10) produzem a MESMA Analysis em conteúdo; 4 outros
  // (GD-06/07/08/09) idem. Marcado como it.fails: se o gap for corrigido, este
  // teste passa a falhar e força a remoção do marcador.
  it.fails('Fase 2 — ACHADO A-01: nenhuma Analysis é stale/generic (o fingerprint reflete os dados do caso)', () => {
    assertFinding('A-01', () => {
      const byFingerprint = new Map<string, string[]>();
      for (const e of evidence) {
        const list = byFingerprint.get(e.analysis.contentFingerprint) ?? [];
        list.push(e.id);
        byFingerprint.set(e.analysis.contentFingerprint, list);
      }
      const collisions = [...byFingerprint.entries()].filter(([, ids]) => ids.length > 1);
      expect(
        collisions.length,
        `A-01: ${collisions.length} fingerprints compartilhados por casos com inputs diferentes: ${collisions
          .map(([f, ids]) => `${ids.join('/')}@${f.slice(0, 12)}`)
          .join(', ')} — Analysis stale ou reutilizada`,
      ).toBe(0);
    });
  });

  it('Fase 4 — todo argumento autorizado tem fundamento no catálogo canônico', () => {
    for (const e of evidence) {
      for (const argId of e.authorizedArgumentIds) {
        const arg = ARGUMENTS_CATALOG.find((a) => a.id === argId);
        expect(arg, `${e.id}: argumento autorizado ${argId} inexistente no catálogo`).toBeTruthy();
        expect(arg!.legalBase, `${e.id}: ${argId} sem fundamento legal`).toBeTruthy();
        expect(arg!.formattedParagraphs.length, `${e.id}: ${argId} sem parágrafos`).toBeGreaterThan(0);
      }
      // Argumento autorizado sempre foi recomendado pela Analysis
      for (const argId of e.authorizedArgumentIds) {
        expect(
          e.analysis.recommendedArgumentIds,
          `${e.id}: ${argId} autorizado sem estar em recommendedArguments`,
        ).toContain(argId);
      }
    }
  });

  // ACHADO A-05: o RPC match_knowledge_chunks devolve 0 linhas para todos os 10
  // GD. Causa medida: com o vetor determinístico, a maior similaridade possível
  // contra o melhor chunk de SP é 0.2134, abaixo do match_threshold=0.35 fixo em
  // cloudflare/rag-adapter.ts:98; e filter_jurisdiction='BR_FEDERAL' (GD-06,
  // autuador PRF) não casa com nenhum chunk. Resultado: 0 argumentos RAG,
  // 0 chunk_id, 0 source_id, 0 official_url — a fundamentação dos documentos vem
  // só do ARGUMENTS_CATALOG estático, nunca da KB de 66 documentos.
  it.fails('Fase 4 — ACHADO A-05: toda tese do documento tem provenance na KB (chunk/source/version/URL)', () => {
    assertFinding('A-05', () => {
      const withoutProvenance = evidence.filter((e) => e.provenance.length === 0).map((e) => e.id);
      expect(
        withoutProvenance.length,
        `A-05: ${withoutProvenance.length} GD sem qualquer provenance de KB (${withoutProvenance.join(', ')}) — a KB não fundamenta nenhuma tese`,
      ).toBe(0);
      // Quando houver provenance, ela tem de ser completa e recuperável.
      for (const e of evidence) {
        for (const p of e.provenance) {
          expect(p.chunkId, `A-05: ${e.id} provenance sem chunk_id`).toBeTruthy();
          expect(p.sourceId, `A-05: ${e.id} provenance ${p.chunkId} sem source_id`).not.toBe('NOT_FOUND');
          expect(p.documentVersionId, `A-05: ${e.id} provenance ${p.chunkId} sem document_version_id`).not.toBe('NOT_FOUND');
          expect(p.officialUrl, `A-05: ${e.id} provenance ${p.chunkId} sem official_url`).not.toBe('NOT_FOUND');
        }
      }
    });
  });

  // ACHADO A-06: o documento montado pelo runtime canônico não passa no próprio
  // Quality Gate. Falha constante: ESTRUTURA (endereçamento "ILUSTRÍSSIMO(A)
  // SENHOR(A)" não casa com /ilustríssimo senhor/; não há seção "Qualificação do
  // requerente"; não há "identificação do auto de infração"). Como o gate é
  // fail-closed, `blocked=true` — mas cloudflare/routes/cases.ts NÃO invoca o
  // gate, então o documento é entregue assim mesmo.
  it.fails('Fase 7 — ACHADO A-06: Quality Gate approves todos os documentos do runtime canônico', () => {
    assertFinding('A-06', () => {
      const failing = evidence.filter((e) => !e.qualityGate.overallPass).map((e) => `${e.id}(${e.qualityGate.failedChecks.join('+')})`);
      expect(failing.length, `A-06: Quality Gate reprova ${failing.length}/10: ${failing.join(', ')}`).toBe(0);
    });
  });

  // ACHADO A-07: o documento não reproduz os fatos decisivos do auto. Para os
  // casos de velocidade faltam código da infração, gravidade, limite, velocidade
  // medida, velocidade considerada, ID do radar e data de aferição. Para TODOS os
  // 10 faltam o código da infração e a gravidade.
  it.fails('Fase 3 — ACHADO A-07: o documento reproduz os fatos do Case (código, gravidade, velocidades, radar)', () => {
    assertFinding('A-07', () => {
      const withGaps = evidence
        .map((e) => ({ id: e.id, missing: e.fieldChecks.filter((f) => f.verdict === 'MISSING').map((f) => f.field) }))
        .filter((g) => g.missing.length > 0);
      expect(
        withGaps.length,
        `A-07: ${withGaps.length} GD com fatos ausentes do documento: ${withGaps.map((g) => `${g.id}=[${g.missing.join(' ')}]`).join(' | ')}`,
      ).toBe(0);
    });
  });

  it('Fase 7 — Integridade: o documento validado é o documento persistido', () => {
    for (const e of evidence) {
      expect(e.document.integrityHash, `${e.id} sem integrityHash`).toMatch(/^[0-9a-f]{64}$/);
      expect(e.document.integrityValid, `${e.id}: IntegrityHash não valida contra a Analysis`).toBe(true);
      expect(
        e.document.unresolvedPlaceholders,
        `${e.id}: placeholders não resolvidos no documento`,
      ).toEqual([]);
      // Toda tese autorizada tem de aparecer no documento entregue.
      expect(
        e.argumentsMissingFromDocument,
        `${e.id}: teses autorizadas ausentes do documento: ${e.argumentsMissingFromDocument.join(', ')}`,
      ).toEqual([]);
    }
  });

  // R2: validação em memória é identidade de objeto e não prova nada sobre
  // persistência. Aqui a cadeia real: domainToRow → JSON no banco → rowToDomain →
  // hasValidDefenseIntegrity, exatamente como nas rotas de produção.
  it('Fase 7 — Integridade sobrevive ao round-trip de persistência (domainToRow → rowToDomain)', async () => {
    const gd = ALL_GOLDEN_DOCUMENTS[4]; // GD-05: radar com aferição vencida
    const caseId = `case_${gd.id.toLowerCase()}_roundtrip`;
    const infraction = gd.infraction as any;
    const analysis: any = await analyzeInfractionCompat(env, caseId, infraction);
    const draft: any = await generateDefenseDraftCompat(
      env, caseId, infraction, VEHICLE.plate, VEHICLE.model, APPLICANT as any, PROCEDURE_TYPE as any, analysis,
    );
    const domain = {
      id: caseId,
      userId: '00000000-0000-4000-8000-000000000000',
      vehicle: { plate: VEHICLE.plate, brandModel: VEHICLE.model },
      infraction,
      analysis,
      defenseDraft: draft,
      serviceType: PROCEDURE_TYPE,
    };
    const row = domainToRow(domain);
    const rehydrated = rowToDomain(JSON.parse(JSON.stringify(row)));
    expect(rehydrated.analysis.id, 'round-trip trocou a Analysis persistida').toBe(analysis.id);
    expect(rehydrated.defenseDraft.integrityHash, 'round-trip trocou o integrityHash').toBe(draft.integrityHash);
    expect(
      await hasValidDefenseIntegrity(
        rehydrated.defenseDraft,
        rehydrated.analysis,
        {
          aitNumber: infraction.aitNumber,
          infractionCode: infraction.infractionCode,
          ctbArticle: infraction.ctbArticle,
          dateTime: infraction.dateTime,
          location: infraction.location,
          measuredSpeed: infraction.measuredSpeed,
          consideredSpeed: infraction.consideredSpeed,
          speedLimit: infraction.speedLimit,
          radarEquipmentId: infraction.radarEquipmentId,
          inmetroAferitionDate: infraction.inmetroAferitionDate,
        },
      ),
      'GET /api/cases/:id responderia 409 após o round-trip de persistência',
    ).toBe(true);
  }, 60000);

  it('Fase 8 — nenhum documento reusa o documento de outro caso', () => {
    const hashes = new Map<string, string[]>();
    for (const e of evidence) {
      const list = hashes.get(e.document.hash) ?? [];
      list.push(e.id);
      hashes.set(e.document.hash, list);
    }
    for (const [hash, ids] of hashes) {
      if (ids.length === 1) continue;
      const [a, b] = ids.map((id) => evidence.find((e) => e.id === id)!);
      expect(
        JSON.stringify(a.input),
        `documento ${hash} idêntico em ${ids.join('/')} com entradas diferentes — reuso indevido`,
      ).toBe(JSON.stringify(b.input));
    }
  });

  it('Fase 8 — o documento não carrega fatos de outro GD', () => {
    // Cada AIT é único; se o AIT de um caso aparecer no documento de outro, há contaminação.
    for (const e of evidence) {
      const ownAit = String(e.fieldChecks.find((f) => f.field === 'infraction.aitNumber')?.input ?? '');
      const text = docs.get(e.id)!.text;
      for (const other of evidence) {
        if (other.id === e.id) continue;
        const otherAit = String(other.fieldChecks.find((f) => f.field === 'infraction.aitNumber')?.input ?? '');
        if (otherAit.length >= 8) {
          expect(
            text.includes(otherAit),
            `${e.id} contém o AIT de ${other.id} (${otherAit}) — contaminação entre casos`,
          ).toBe(false);
        }
      }
      expect(text.includes(ownAit), `${e.id} não contém o próprio AIT`).toBe(true);
    }
  });

  // ACHADO A-02: GD-06 (Lei Seca), GD-07 (semáforo), GD-08 (celular) e
  // GD-09 (estacionamento) recebem o MESMO conjunto {ARG-002, ARG-049}.
  it.fails('Fase 5 — ACHADO A-02: cada GD carrega argumentos próprios (nenhum conjunto genérico)', () => {
    assertFinding('A-02', () => {
      const bySet = new Map<string, string[]>();
      for (const e of evidence) {
        const key = e.authorizedArgumentIds.slice().sort().join('|');
        bySet.set(key, [...(bySet.get(key) ?? []), e.id]);
      }
      const collisions = [...bySet.entries()]
        .filter(([, ids]) => ids.length > 1)
        .filter(([, ids]) => {
          // Colisão só é legítima entre casos com a MESMA tipificação.
          const descriptions = new Set(ids.map((id) => evidence.find((e) => e.id === id)!.input.description));
          return descriptions.size > 1;
        });
      expect(
        collisions.length,
        `A-02: ${collisions.length} conjuntos de argumentos idênticosacross tipificações distintas: ${collisions
          .map(([, ids]) => `${ids.join('/')}`)
          .join(', ')}`,
      ).toBe(0);
    });
  });

  // ACHADO A-03: pares com tipificação distinta (ex.: Lei Seca x semáforo)
  // produzem Analysis idêntica.
  it.fails('Fase 6 — ACHADO A-03: diferenças materiais de input produzem diferenças na Analysis', () => {
    assertFinding('A-03', () => {
      const identical: string[] = [];
      for (let i = 0; i < evidence.length; i++) {
        for (let j = i + 1; j < evidence.length; j++) {
          const a = evidence[i];
          const b = evidence[j];
          if (a.input.code === b.input.code && a.input.autuador === b.input.autuador) continue;
          const aOnly = a.analysis.recommendedArgumentIds.filter((x) => !b.analysis.recommendedArgumentIds.includes(x));
          const bOnly = b.analysis.recommendedArgumentIds.filter((x) => !a.analysis.recommendedArgumentIds.includes(x));
          if (aOnly.length + bOnly.length === 0) {
            identical.push(`${a.id}(${a.input.code})~${b.id}(${b.input.code})`);
          }
        }
      }
      expect(
        identical.length,
        `A-03: ${identical.length} pares com tipificação distinta e Analysis idêntica: ${identical.join(', ')}`,
      ).toBe(0);
    });
  });

  it('Fase 7 — Quality Gate é fail-closed (comportamento, não aritmética de campo derivado)', () => {
    for (const e of evidence) {
      expect(typeof e.qualityGate.overallPass, `${e.id} sem resultado de Quality Gate`).toBe('boolean');
      expect(e.qualityGate.score).toBeGreaterThan(0);
    }
    // Comportamento fail-closed: um documento com tag não resolvida é REPROVADO.
    // Verificar `blocked === !overallPass` seria tautológico (final-quality-gate.ts:107).
    const sample = evidence[0];
    const polluted = `${docs.get(sample.id)!.text}\n{{placa_inexistente}}`;
    const pollutedReport: any = runFullQualityGate(
      { procedureType: PROCEDURE_TYPE, vehicle: {}, infraction: {}, applicant: {} },
      { id: sample.caseId },
      { evaluatedRules: [], selectedArguments: [], recommendedProcedure: PROCEDURE_TYPE, detectedInconsistencies: [] },
      polluted,
    );
    expect(pollutedReport.overallPass, 'Quality Gate aprovou documento com placeholder não resolvido').toBe(false);
    expect(pollutedReport.blocked).toBe(true);
  });

  it('Fase 8 — o documento só afirma velocidades medidas/consideradas que existem no Case (nunca inventa)', () => {
    for (const e of evidence) {
      const text = docs.get(e.id)!.text;
      const speedTokens = (text.match(/\d+\s*km\/h/g) ?? []).map((t) => Number(t.replace(/\D/g, '')));
      // Apenas velocidades medida/considerada são proibidas de ser inventadas.
      // O limite da via (speedLimit) é um fato legítimo e pode aparecer.
      const measured = e.input.measuredSpeed;
      const considered = e.input.consideredSpeed;
      const authorizedMeasured = (measured !== null && measured !== undefined) ? [measured] : [];
      const authorizedConsidered = (considered !== null && considered !== undefined) ? [considered] : [];
      const authorized = [...authorizedMeasured, ...authorizedConsidered];
      for (const token of speedTokens) {
        if (authorized.length > 0 && !authorized.includes(token)) {
          // Token não corresponde a nenhuma velocidade medida/considerada do Case.
          // Aceitável se for o speedLimit (já que o limite é um fato do caso).
          const isLimit = e.input.speedLimit !== null && e.input.speedLimit !== undefined && token === e.input.speedLimit;
          if (!isLimit) {
            throw new Error(`${e.id} afirma ${token} km/h, que não existe no Case como velocidade medida/considerada (${authorized.join(', ')}) — dado inventado`);
          }
        }
      }
    }
  });

  // A-08: o hash diferente não prova personalização. Mede o quanto o texto é
  // realmente próprio de cada caso.
  it.fails('Fase 5 — ACHADO A-08: documentos de casos distintos não são cópias um do outro', () => {
    assertFinding('A-08', () => {
      const tooSimilar = pairwiseSimilarity().filter((p) => p.similarity > 0.9);
      expect(
        tooSimilar.length,
        `A-08: ${tooSimilar.length} pares com >90% de tokens em comum: ${tooSimilar
          .map((p) => `${p.a}~${p.b}=${p.similarity}`)
          .join(', ')} — mesmos documentos com dados trocados`,
      ).toBe(0);
    });
  });

  it('Fase 9 — reexecução do mesmo caso é DETERMINISTICALLY_SAME no conteúdo', async () => {
    const gd = ALL_GOLDEN_DOCUMENTS[0];
    const { record } = await runGoldenDocument(gd);
    const first = evidence.find((e) => e.id === gd.id)!;
    // Conteúdo: determinístico (fingerprint da Analysis e hash do documento).
    expect(record.analysis.contentFingerprint).toBe(first.analysis.contentFingerprint);
    expect(record.document.hash).toBe(first.document.hash);
    // IntegrityHash: A-04 — o hash de integridade inclui a data da petição (template),
    // portanto muda a cada execução. O que NÃO pode quebrar é o vínculo entre
    // o documento e a Analysis que o gerou (integrityValid=true na primeira execução).
    // A reprodutibilidade do conteúdo (fingerprint/hash) é o critério de sucesso.
  }, 60000);
});

/**
 * Relatório de diferenciação impresso no console (evidência legível na saída do
 * gate). Também consolidado em test-results/golden-document-accuracy.json.
 */
function printCrossCaseReport(ev: GdEvidence[]) {
  const unique = (xs: string[]) => new Set(xs).size;
  const lines: string[] = [];
  lines.push('--- FASE 12: diferenciação cruzada (10 GD) ---');
  for (const e of ev) {
    lines.push(
      `${e.id} | args=${e.authorizedArgumentIds.join(',') || '(nenhuma)'} | qg=${e.qualityGate.overallPass ? 'PASS' : 'FAIL:' + e.qualityGate.failedChecks.join('+')} | integrity=${e.document.integrityValid}`,
    );
  }
  lines.push(`analysis fingerprints únicos: ${unique(ev.map((e) => e.analysis.contentFingerprint))}/10`);
  lines.push(`conjuntos de argumentos únicos: ${unique(ev.map((e) => e.authorizedArgumentIds.slice().sort().join('|'))) }/10`);
  lines.push(`documentos (hash) únicos: ${unique(ev.map((e) => e.document.hash))}/10`);
  lines.push(`documentos (hash normalizado) únicos: ${unique(ev.map((e) => e.document.normalizedHash))}/10`);
  lines.push(`integrityHash únicos: ${unique(ev.map((e) => e.document.integrityHash))}/10`);
  lines.push(`quality gate PASS: ${ev.filter((e) => e.qualityGate.overallPass).length}/10`);
  lines.push(`provenance KB (chunk/source/version/url): ${ev.reduce((n, e) => n + e.provenance.length, 0)} de ${ev.length} casos`);
  lines.push(`procedimentos distintos: ${unique(ev.map((e) => e.analysis.recommendedProcedure))}/10`);
  const missingFacts = ev
    .map((e) => ({ id: e.id, m: e.fieldChecks.filter((f) => f.verdict === 'MISSING').map((f) => f.field.replace('infraction.', '')) }))
    .filter((x) => x.m.length > 0);
  for (const x of missingFacts) lines.push(`  fatos ausentes no doc ${x.id}: ${x.m.join(', ')}`);
  const pairs = pairwiseSimilarity().sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  for (const p of pairs) lines.push(`  maior semelhança textual: ${p.a}(${p.codeA}) ~ ${p.b}(${p.codeB}) = ${p.similarity}`);
  lines.push('---');
  // eslint-disable-next-line no-console
  console.log(lines.join('\n'));
}

afterAll(() => {
  if (skip || evidence.length === 0) return;
  printCrossCaseReport(evidence);
});
