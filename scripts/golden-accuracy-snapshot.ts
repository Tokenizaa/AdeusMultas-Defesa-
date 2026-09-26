/**
 * @file golden-accuracy-snapshot.ts
 * Snapshot forense dos 10 Golden Documents (GD-01..GD-10) pelo runtime canônico.
 *
 *   npx tsx scripts/golden-accuracy-snapshot.ts <arquivo-de-saida.json>
 *
 * Só LEITURA: nenhuma escrita no banco, nenhum dado persistido. É a ferramenta
 * de comparação BASELINE_751FB6F vs pós-correção. Nenhuma decisão jurídica:
 * apenas mede e registra o que o runtime produz.
 */
import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { analyzeInfractionCompat, generateDefenseDraftCompat } from '../cloudflare/rag-adapter';
import { hasValidDefenseIntegrity } from '../cloudflare/defense-integrity';
import { runCanonicalQualityGate } from '../cloudflare/quality-gate';
import { ALL_GOLDEN_DOCUMENTS } from '../tests/fixtures/golden-documents';

const env: any = { SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY };
const out = process.argv[2] || 'test-results/golden-accuracy-snapshot.json';

const APPLICANT = { name: 'JOSE CARLOS DE SOUZA', cpf: '123.456.789-00', cnh: '98765432100', address: 'Rua das Flores, 123', cityState: 'Sao Paulo - SP' };
const VEHICLE = { plate: 'ABC1D23', model: 'FIAT UNO' };

const sha256 = async (v: string) => {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, '0')).join('');
};

const FACT_FIELDS: Array<[string, (i: any) => unknown]> = [
  ['infraction.aitNumber', (i) => i.aitNumber],
  ['infraction.infractionCode', (i) => i.infractionCode],
  ['infraction.ctbArticle', (i) => i.ctbArticle],
  ['infraction.description', (i) => i.description],
  ['infraction.autuadorBody', (i) => i.autuadorBody],
  ['infraction.dateTime', (i) => i.dateTime],
  ['infraction.location', (i) => i.location],
  ['infraction.severity', (i) => i.severity],
  ['infraction.points', (i) => i.points],
  ['infraction.fineAmount', (i) => i.fineAmount],
  ['infraction.speedLimit', (i) => i.speedLimit],
  ['infraction.measuredSpeed', (i) => i.measuredSpeed ?? i.speedMeasured],
  ['infraction.consideredSpeed', (i) => i.consideredSpeed ?? i.speedConsidered],
  ['infraction.radarEquipmentId', (i) => i.radarEquipmentId],
  ['infraction.inmetroAferitionDate', (i) => i.inmetroAferitionDate],
  ['infraction.refusedTest', (i) => i.refusedTest],
  ['infraction.offeredRetest', (i) => i.offeredRetest],
  ['infraction.yellowPhaseCrossing', (i) => i.yellowPhaseCrossing],
  ['infraction.cellphoneCircumstance', (i) => i.cellphoneCircumstance],
  ['vehicle.plate', () => VEHICLE.plate],
  ['applicant.name', () => APPLICANT.name],
];

const present = (value: unknown, doc: string): 'MATCH' | 'MISSING' | 'NOT_APPLICABLE' => {
  if (value === undefined || value === null || value === '') return 'NOT_APPLICABLE';
  const raw = String(value);
  const hay = doc.toLowerCase();
  const variants = new Set<string>([raw, raw.replace(/-/g, ' '), raw.replace(/[.,]/g, '')]);
  // Datas: o documento renderiza em pt-BR, o Case traz em ISO (ou vice-versa).
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) variants.add(`${iso[3]}/${iso[2]}/${iso[1]}`);
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) variants.add(`${br[3]}-${br[2]}-${br[1]}`);
  return Array.from(variants).some((v) => v.trim().length > 0 && hay.includes(v.toLowerCase()))
    ? 'MATCH'
    : 'MISSING';
};

const facts = (gd: any) => Object.fromEntries(FACT_FIELDS.map(([k, f]) => [k, f(gd.infraction) ?? null]));

const tokens = (t: string) => new Set(t.toLowerCase().split(/\s+/).filter((x) => x.length > 3));
const jaccard = (a: string, b: string) => {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let n = 0; for (const t of A) if (B.has(t)) n++;
  return Number((n / (A.size + B.size - n)).toFixed(4));
};

(async () => {
  const cases: any[] = [];
  const docs = new Map<string, string>();

  for (const gd of ALL_GOLDEN_DOCUMENTS) {
    const caseId = `case_${gd.id.toLowerCase()}_snap`;
    const infraction: any = gd.infraction;
    const analysis: any = await analyzeInfractionCompat(env, caseId, infraction);
    // Passa a Analysis para o documento: é o caminho de produção
    // (cloudflare/routes/cases.ts passa domain.analysis), e é o que torna o
    // IntegrityHash verificável contra a Analysis que gerou o documento.
    const draft: any = await generateDefenseDraftCompat(
      env, caseId, infraction, VEHICLE.plate, VEHICLE.model, APPLICANT as any,
      (process.env.SNAPSHOT_PROCEDURE || 'recurso_jari') as any,
      analysis,
    );
    const text: string = draft.fullDraftText || '';
    docs.set(gd.id, text);

    const payload: any = {
      procedureType: draft.procedureType,
      vehicle: { plate: VEHICLE.plate, brandModel: VEHICLE.model },
      infraction: { ...infraction },
      applicant: { name: APPLICANT.name, cpf: APPLICANT.cpf, cnh: APPLICANT.cnh, addressCityState: APPLICANT.cityState, address: APPLICANT.address },
      identification: { aitNumber: infraction.aitNumber, infractionCode: infraction.infractionCode, autuadorBody: infraction.autuadorBody },
      specificFacts: {}, evidence: {},
    };
    const qg: any = runCanonicalQualityGate({
      infraction, analysis, draft,
      applicant: APPLICANT,
      vehicle: { plate: VEHICLE.plate, model: VEHICLE.model },
    });
    const theses = analysis.recommendedArguments || [];
    const ragArgs = theses.filter((a: any) => Array.isArray(a.provenance) && a.provenance.length > 0);

    cases.push({
      id: gd.id,
      name: gd.name,
      caseId,
      inputFingerprint: await sha256(JSON.stringify(facts(gd))),
      input: facts(gd),
      analysis: {
        id: analysis.id,
        contentHash: await sha256(JSON.stringify({
          procedure: analysis.recommendedProcedure,
          body: analysis.competentBody,
          args: (analysis.recommendedArguments || []).map((a: any) => ({ id: a.id, baseLegal: a.baseLegal, title: a.title })),
        })),
        recommendedProcedure: analysis.recommendedProcedure,
        documentProcedureType: draft.procedureType,
        procedureMismatch: draft.validation?.procedureMismatch ?? null,
        competentBody: analysis.competentBody,
        overallSuccessRate: analysis.overallSuccessRate ?? null,
        integrityScore: analysis.integrityScore ?? null,
        recommendedArguments: (analysis.recommendedArguments || []).map((a: any) => a.id),
        ruleArgumentIds: (analysis.recommendedArguments || []).map((a: any) => a.id).filter((i: string) => !i.startsWith('RAG-')),
        thesesWithProvenance: theses.filter((a: any) => a.provenanceStatus === 'SUPPORTED').map((a: any) => a.id),
        provenanceCount: theses.reduce((n: number, t: any) => n + (t.provenance?.length ?? 0), 0),
        evaluatedRules: analysis.evaluatedRules?.length ?? 0,
        notApplicableRules: (analysis.evaluatedRules || []).filter((r: any) => r.status === 'NOT_APPLICABLE').length,
        classification: analysis.infractionClassification ?? null,
        detectedFlaws: analysis.detectedFlaws?.length ?? 0,
        dataGaps: analysis.dataGaps?.length ?? 0,
        summaryReasoning: analysis.summaryReasoning ?? null,
      },
      rag: {
        query: null,
        resultCount: ragArgs.length,
        chunks: Array.from(new Set(theses.flatMap((a: any) => (a.provenance ?? []).map((p: any) => p.chunk_id)))),
        versionIds: Array.from(new Set(theses.flatMap((a: any) => (a.provenance ?? []).map((p: any) => p.document_version_id)))),
        documentIds: Array.from(new Set(theses.flatMap((a: any) => (a.provenance ?? []).map((p: any) => p.document_id)))),
        sourceIds: Array.from(new Set(theses.flatMap((a: any) => (a.provenance ?? []).map((p: any) => p.source_id)))),
        officialUrls: Array.from(new Set(theses.flatMap((a: any) => (a.provenance ?? []).map((p: any) => p.official_url)))),
      },
      document: {
        hash: await sha256(text),
        length: text.length,
        integrityHash: draft.integrityHash ?? null,
        integrityValid: await hasValidDefenseIntegrity(draft, analysis, {
          aitNumber: infraction.aitNumber, infractionCode: infraction.infractionCode, ctbArticle: infraction.ctbArticle,
          dateTime: infraction.dateTime, location: infraction.location,
          measuredSpeed: infraction.measuredSpeed, consideredSpeed: infraction.consideredSpeed, speedLimit: infraction.speedLimit,
          radarEquipmentId: infraction.radarEquipmentId, inmetroAferitionDate: infraction.inmetroAferitionDate,
        }),
        selectedArgumentIds: draft.selectedArgumentIds || [],
        factsNarrative: draft.factsNarrative || '',
        unresolvedPlaceholders: draft.validation?.unresolvedPlaceholders ?? [],
      },
      qualityGate: {
        overallPass: qg.overallPass,
        score: qg.score,
        blocked: qg.blocked,
        failedChecks: qg.checks.filter((c: any) => !c.passed).map((c: any) => c.check),
      },
      fieldVerdicts: Object.fromEntries(
        FACT_FIELDS.map(([k, f]) => [k, present(f(gd.infraction), text)]),
      ),
    });
  }

  const pairs: any[] = [];
  for (let i = 0; i < cases.length; i++) {
    for (let j = i + 1; j < cases.length; j++) {
      pairs.push({
        a: cases[i].id, b: cases[j].id,
        codeA: cases[i].input['infraction.infractionCode'], codeB: cases[j].input['infraction.infractionCode'],
        similarity: jaccard(docs.get(cases[i].id)!, docs.get(cases[j].id)!),
      });
    }
  }

  const uniq = (xs: string[]) => new Set(xs).size;
  const summary = {
    cases: cases.length,
    analysesUnique: uniq(cases.map((c) => c.analysis.contentHash)),
    argumentSetsUnique: uniq(cases.map((c) => c.document.selectedArgumentIds.slice().sort().join('|'))),
    documentsUnique: uniq(cases.map((c) => c.document.hash)),
    integrityHashesUnique: uniq(cases.map((c) => c.document.integrityHash || '')),
    proceduresUnique: uniq(cases.map((c) => c.analysis.recommendedProcedure)),
    provenanceChunks: cases.reduce((n, c) => n + c.rag.chunks.length, 0),
    provenanceLinks: cases.reduce((n, c) => n + (c.analysis.provenanceCount ?? 0), 0),
    thesesWithProvenance: cases.reduce((n, c) => n + (c.analysis.thesesWithProvenance?.length ?? 0), 0),
    evaluatedRulesTotal: cases.reduce((n, c) => n + c.analysis.evaluatedRules, 0),
    notApplicableRulesTotal: cases.reduce((n, c) => n + (c.analysis.notApplicableRules ?? 0), 0),
    integrityReproducible: 0,
    qualityGatePass: cases.filter((c) => c.qualityGate.overallPass).length,
    integrityValid: cases.filter((c) => c.document.integrityValid).length,
    factsMatched: cases.reduce((n, c) => n + Object.values(c.fieldVerdicts).filter((v) => v === 'MATCH').length, 0),
    factsMissing: cases.reduce((n, c) => n + Object.values(c.fieldVerdicts).filter((v) => v === 'MISSING').length, 0),
    pairsAbove90: pairs.filter((p) => p.similarity > 0.9).length,
    maxSimilarity: Math.max(...pairs.map((p) => p.similarity)),
  };

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), summary, cases, pairs }, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  console.log('snapshot ->', out);
})();
