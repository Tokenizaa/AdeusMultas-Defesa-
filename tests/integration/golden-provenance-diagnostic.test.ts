/**
 * Diagnóstico rápido da proveniência no runtime canônico.
 *
 * Executar isoladamente antes da suíte completa:
 * npm run test:unit -- tests/integration/golden-provenance-diagnostic.test.ts
 *
 * Intencionalmente não exige chunks/proveniência: seu objetivo é mostrar o que
 * o runtime realmente retorna para dois casos contrastantes, sem transformar
 * ausência de recuperação em falha opaca nem executar montagem documental.
 */
import 'dotenv/config';
import { describe, it, expect } from 'vitest';
import { analyzeInfractionCompat } from '../../cloudflare/rag-adapter';
import { ALL_GOLDEN_DOCUMENTS } from '../fixtures/golden-documents';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const skip = !SUPABASE_URL || !SERVICE_ROLE;
const env: any = { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE };

const DIAGNOSTIC_IDS = ['GD-06', 'GD-01'];
const selected = DIAGNOSTIC_IDS.map((id) => {
  const gd = ALL_GOLDEN_DOCUMENTS.find((item) => item.id === id);
  if (!gd) throw new Error(`Golden fixture não encontrada: ${id}`);
  return gd;
});

const validHttpUrl = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

describe.skipIf(skip)('Golden Document — diagnóstico rápido de proveniência RAG', () => {
  it.each(selected)('$id: expõe recuperação, argumentos e fontes reais', async (gd) => {
    const analysis: any = await analyzeInfractionCompat(
      env,
      `diagnostic_${gd.id.toLowerCase()}_${Date.now().toString(36)}`,
      gd.infraction as any,
    );
    expect(analysis?.status, `${gd.id}: análise não concluída`).toBe('completed');

    const retrieval = analysis.ragRetrieval ?? {};
    const argumentsEvidence = (analysis.recommendedArguments ?? []).map((arg: any) => ({
      argumentId: String(arg.id ?? ''),
      provenanceStatus: String(arg.provenanceStatus ?? 'UNKNOWN'),
      provenance: (Array.isArray(arg.provenance) ? arg.provenance : []).map((p: any) => ({
        chunkId: p.chunk_id ?? null,
        sourceId: p.source_id ?? null,
        sourceName: p.source_name ?? null,
        authority: p.authority ?? null,
        documentId: p.document_id ?? null,
        documentVersionId: p.document_version_id ?? null,
        version: p.version ?? null,
        officialUrl: p.official_url ?? null,
        officialUrlValid: validHttpUrl(p.official_url),
        contentHash: p.content_hash ?? null,
        matchedTerms: p.matched_terms ?? [],
      })),
    }));

    const report = {
      caseId: gd.id,
      infractionCode: (gd.infraction as any).infractionCode,
      description: (gd.infraction as any).description,
      engineVersion: analysis.engineVersion ?? null,
      retrieval: {
        provider: retrieval.provider ?? null,
        count: retrieval.count ?? null,
        top: retrieval.top ?? [],
      },
      arguments: argumentsEvidence,
      totals: {
        recommendedArguments: argumentsEvidence.length,
        supportedArguments: argumentsEvidence.filter((a: any) => a.provenanceStatus === 'SUPPORTED').length,
        provenanceRows: argumentsEvidence.reduce((n: number, a: any) => n + a.provenance.length, 0),
        validSourceUrls: argumentsEvidence.reduce(
          (n: number, a: any) => n + a.provenance.filter((p: any) => p.officialUrlValid).length,
          0,
        ),
      },
    };

    console.info(`[GOLDEN_PROVENANCE_DIAGNOSTIC] ${JSON.stringify(report)}`);
    expect(typeof retrieval.provider, `${gd.id}: provider de recuperação ausente`).toBe('string');
    expect(Array.isArray(retrieval.top), `${gd.id}: retrieval.top não é array`).toBe(true);
  }, 90000);
});
