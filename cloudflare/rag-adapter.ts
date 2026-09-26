/**
 * @file rag-adapter.ts
 * Adaptador RAG simplificado para Cloudflare Worker — usa a Knowledge Base canônica (Fases 9–11) via Supabase RPC direto
 * 
 * Substitui o antigo RagPipeline (determinístico, catálogos hardcoded) pelo
 * RAG persistido com pgvector, provenance íntegra e cross-process retrieval.
 * 
 * FASE 12.3 — Unificação Knowledge Base / RAG → Analysis
 */

import { createSupabaseAdminClient } from './supabase';
import { computeDefenseIntegrityHash } from './defense-integrity';
import { COMPATIBLE_PROCEDURES_BY_FAMILY } from '../src/core/rules/infraction-classifier';

export interface CaseInfractionData {
  aitNumber?: string;
  infractionCode?: string;
  description?: string;
  ctbArticle?: string;
  severity?: string;
  points?: number;
  fineAmount?: number;
  autuadorBody?: string;
  dateTime?: string;
  location?: string;
  speedLimit?: number;
  measuredSpeed?: number;
  consideredSpeed?: number;
  radarEquipmentId?: string;
  inmetroAferitionDate?: string;
  notificationExpeditionDate?: string;
  defenseDeadline?: string;
  evidenceFlags?: Record<string, boolean>;
}

export interface CaseAnalysis {
  id: string;
  caseId: string;
  status?: string;
  overallSuccessRate?: number;
  detectedInconsistencies?: any[];
  recommendedArguments: LegalArgument[];
  recommendedProcedure?: string;
  competentBody?: string;
  procedureDeadline?: string;
  summaryReasoning?: string;
  createdAt?: string;
  engineVersion?: string;
  evaluatedRules?: any[];
  detectedFlaws?: any[];
  selectedArguments?: string[];
  integrityScore?: number;
  dataGaps?: any[];
  engineStartedAt?: string;
  engineFinishedAt?: string;
}

export interface LegalArgument {
  id: string;
  title: string;
  reason?: string;
  baseLegal?: string;
  category?: string;
  evidenceRequired?: string[];
}

/**
 * Adapter RAG simplificado para Cloudflare Worker
 * Usa a Knowledge Base canônica (Fases 9–11) via Supabase RPC direto
 */
export class CloudflareRagAdapter {
  private supabase: ReturnType<typeof createSupabaseAdminClient>;

  constructor(env: any) {
    this.supabase = createSupabaseAdminClient(env);
  }

  /**
   * Analisa uma infração usando a Knowledge Base canônica via RPC pgvector
   */
  async analyzeInfraction(caseId: string, infraction: any): Promise<any> {
    try {
      const terms = this.buildSearchTerms(infraction);
      const ragResults = await this.searchKnowledgeLexical(terms);
      return await this.applyDeterministicAnalysis(caseId, infraction, ragResults);
    } catch (err: any) {
      console.error('[RAG Adapter] Erro na análise:', err.message);
      return this.fallbackDeterministicAnalysis(caseId, infraction);
    }
  }

  /**
   * Termos de busca extraídos do caso. A recuperação é LEXICAL sobre o
   * conteúdo real dos chunks: cada termo retornado é verificável no chunk, e a
   * provenance é completa (chunk → versão → documento → fonte → URL oficial).
   *
   * Causa-raiz RC-4 (auditoria FASE 12): a busca vetorial usava um
   * vetorizador determinístico de hashing de um saco de palavras, com
   * `match_threshold` fixo em 0,35. Medido: a maior similaridade alcançável
   * contra o melhor chunk da jurisdição era 0,2134 — ou seja, o limiar era
   * inatingível e a KB (66 documentos) jamais fundamentava tese alguma. Baixar
   * o limiar teria produzido "provenance" sem semântica, que é pior do que
   * nenhuma. A busca lexical é determinística, auditável e realmente recupera.
   */
  private buildSearchTerms(infraction: any): string[] {
    const raw: string[] = [];
    if (infraction?.ctbArticle) raw.push(String(infraction.ctbArticle).match(/Art\.\s*([0-9]+(?:-[A-Z])?)/i)?.[0] ?? '');
    if (infraction?.description) raw.push(String(infraction.description));
    if (infraction?.ctbArticle) raw.push(String(infraction.ctbArticle));
    const normalized = raw.join(' ')
      .toLowerCase()
      .replace(/[^\w\sáéíóúâêîôûãõç-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3);
    const stop = new Set(['artigo', 'artigos', 'codigo', 'descricao', 'infração', 'infracao']);
    const counts = new Map<string, number>();
    for (const w of normalized) {
      if (stop.has(w)) continue;
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
    return Array.from(counts.keys()).slice(0, 12);
  }

  private async searchKnowledgeLexical(terms: string[]) {
    if (terms.length === 0) return [];
    // PostgREST: qualquer um dos termos, sem wildcard no início (evita varrer tudo).
    const filter = terms.map((t) => `content.ilike.*${t.replace(/[%,()]/g, '')}*`).join(',');
    const { data, error } = await this.supabase
      .from('knowledge_chunks')
      .select('id,source_id,document_id,document_version_id,content,content_hash,jurisdiction')
      .or(filter)
      .limit(200);
    if (error || !data || data.length === 0) return [];

    const scored = data
      .map((row: any) => {
        const hay = String(row.content ?? '').toLowerCase();
        const matched = terms.filter((t) => hay.includes(t));
        return { row, matched };
      })
      .filter((x) => x.matched.length > 0)
      .sort((a, b) => b.matched.length - a.matched.length || String(a.row.id).localeCompare(String(b.row.id)))
      .slice(0, 5);

    // Provenance: URL oficial vive em knowledge_document_versions.source_url
    // (knowledge_sources.url está vazio em 39/39 fontes — ver FASE 12.6 §7).
    const versionIds = Array.from(new Set(scored.map((x) => x.row.document_version_id).filter(Boolean)));
    if (versionIds.length === 0) return [];
    const { data: versions } = await this.supabase
      .from('knowledge_document_versions')
      .select('id,document_id,source_url,version,content_hash')
      .in('id', versionIds);
    const byVersion = new Map<string, any>((versions ?? []).map((v: any) => [v.id, v]));

    const sourceIds = Array.from(new Set(scored.map((x) => x.row.source_id).filter(Boolean)));
    const { data: sources } = await this.supabase
      .from('knowledge_sources')
      .select('id,name,authority,jurisdiction')
      .in('id', sourceIds);
    const bySource = new Map<string, any>((sources ?? []).map((v: any) => [v.id, v]));

    return scored.map(({ row, matched }) => {
      const version = byVersion.get(row.document_version_id);
      const source = bySource.get(row.source_id);
      return {
        chunk_id: row.id,
        document_id: row.document_id,
        document_version_id: row.document_version_id,
        source_id: row.source_id,
        source_name: source?.name ?? null,
        authority: source?.authority ?? null,
        official_url: version?.source_url ?? null,
        version: version?.version ?? null,
        content_hash: row.content_hash,
        jurisdiction: row.jurisdiction,
        matched_terms: matched,
        content: row.content,
      };
    });
  }

  private extractJurisdiction(infraction: any): string | undefined {
    if (infraction.autuadorBody) {
      const match = infraction.autuadorBody.match(/(?:DETRAN|CET|DER|BHTRANS|SPTRANS|TRANSALVADOR|TRANSPE|TRANSFOR|PMT|PRF|DNIT|ANTT|IBAMA|INFRAERO)-([A-Z]{2})/i);
      if (match) return match[1];
      if (/PRF|DNIT|ANTT|IBAMA|INFRAERO|POLICIA_MILITAR|POLICIA_RODOVIARIA/i.test(infraction.autuadorBody)) {
        return 'BR_FEDERAL';
      }
    }
    if (infraction.location) {
      const match = infraction.location.match(/[-\s]([A-Z]{2})(?:\s*[-,]|$)/);
      if (match) return match[1];
    }
    return undefined;
  }

  /**
   * A Analysis canônica é o Rule Engine (autoridade da decisão jurídica)
   * ENRIQUECIDA com a recuperação da KB. Antes esta função descartava
   * `ruleResult` e devolvia um objeto novo com métricas fixas
   * (`overallSuccessRate: 75`) e listas de rastro vazias — causa-raiz RC-3 da
   * auditoria FASE 12, que fazia 10 casos distintos produzirem a mesma
   * assinatura de Analysis.
   */
  private async applyDeterministicAnalysis(caseId: string, infraction: any, ragResults: any[]) {
    const { ExpertRuleEngine } = await import('../src/core/rules/rule-engine');

    // Extrai flags de evidenceFlags para o nível superior do infraction,
    // pois o RuleEngine lê direto do objeto infraction (não de evidenceFlags).
    // Causa-raiz RC-1: fixtures colocam flags em evidenceFlags, mas RuleEngine
    // lê infraction.hasR19SignageProof, hasPhotoProof, etc. no nível superior.
    const evidenceFlags = infraction.evidenceFlags || {};
    const infractionWithFlags = {
      ...infraction,
      hasR19SignageProof: evidenceFlags.r19SignageProof ?? infraction.hasR19SignageProof,
      hasPhotoProof: evidenceFlags.fotoVeiculo ?? infraction.hasPhotoProof,
      hasPsychomotorTerm: evidenceFlags.psicomotorTerm ?? infraction.hasPsychomotorTerm,
      hasAgentDetailedObservations: evidenceFlags.observacoesAgente ?? infraction.hasAgentDetailedObservations,
      hasRegulatorySign: evidenceFlags.placaSinalizacao ?? infraction.hasRegulatorySign,
      refusedTest: evidenceFlags.recusouTeste ?? infraction.refusedTest,
      offeredRetest: evidenceFlags.ofereceuContraprova ?? infraction.offeredRetest,
      yellowPhaseCrossing: evidenceFlags.tempoAmarelo ?? infraction.yellowPhaseCrossing,
      cellphoneCircumstance: evidenceFlags.celularVivaVoz ?? infraction.cellphoneCircumstance,
      emergencyPassage: evidenceFlags.passagemEmergencia ?? infraction.emergencyPassage,
      hasPreviousInfractionsLast12Months: infraction.hasPreviousInfractionsLast12Months,
      hasRegulatorySign: evidenceFlags.hasRegulatorySign ?? infraction.hasRegulatorySign,
    };

    // Autorização por tese: cada regra do EXPERT_RULES já tem condição causal
    // verificável nos fatos do Case. O caminho canônico NÃO aplica um segundo
    // filtro de chaves de evidenceFlags (EVIDENCE_DEPENDENT_ARGUMENTS): ele
    // duplicava a autorização com chaves que nenhuma regra e nenhum Case
    // produziam, e por isso descartava teses causalmente detectadas — era a
    // causa-raiz RC-1b de GD-08 perder ARG-019.
    const ruleResult = ExpertRuleEngine.evaluate(caseId, infractionWithFlags);
    const filteredArguments = ruleResult.recommendedArguments;

    // Recuperação da KB ancora a fundamentação das teses ELEGÍVEIS da família:
    // para cada tese recomendada, procuramos nos chunks recuperados aquele cujo
    // conteúdo cita o artigo do fundamento legal. A tese não muda — muda a sua
    // origem documental, recuperável em chunk → versão → documento → fonte → URL.
    const withProvenance = filteredArguments.map((arg: any) => {
      const articles = String(arg.legalBase ?? '').match(/Art\.\s*([0-9]+)/gi) ?? [];
      const wanted = new Set(articles.map((a) => a.toLowerCase()));
      const hits = ragResults.filter((r) => {
        const content = String(r.content ?? '').toLowerCase();
        return Array.from(wanted).some((w) => content.includes(w));
      });
      return {
        ...arg,
        provenanceStatus: hits.length > 0 ? 'SUPPORTED' : 'UNSUPPORTED',
        provenance: hits.map((r) => ({
          chunk_id: r.chunk_id,
          document_id: r.document_id,
          document_version_id: r.document_version_id,
          source_id: r.source_id,
          source_name: r.source_name,
          authority: r.authority,
          official_url: r.official_url,
          version: r.version,
          content_hash: r.content_hash,
          matched_terms: r.matched_terms,
        })),
      };
    });

    const classification = ruleResult.infractionClassification;

    return {
      ...ruleResult,
      status: 'completed',
      recommendedArguments: withProvenance,
      competentBody: infraction.autuadorBody || 'Nao identificado',
      procedureDeadline: infraction.defenseDeadline,
      engineVersion: 'defesai-rule-engine+kb-lexical-v2',
      // Provenance da recuperação: fica na Analysis, não é descartada.
      ragRetrieval: {
        provider: 'lexical-content-match',
        count: ragResults.length,
        top: ragResults.slice(0, 3).map((r) => ({
          chunk_id: r.chunk_id,
          document_id: r.document_id,
          document_version_id: r.document_version_id,
          source_id: r.source_id,
          official_url: r.official_url,
          matched_terms: r.matched_terms,
        })),
      },
    };
  }

  /**
   * Procedimento efetivo. Ordem: (1) o que a rota pediu, se compatível com a
   * Analysis; (2) o que a Analysis determinou a partir dos fatos. Não existe
   * default universal: pedido incompatível é rejeitado, não reescrito.
   */
  resolveProcedure(requested: string | undefined, analysis: any): string {
    const classification = analysis?.infractionClassification;
    const family = classification?.family ?? 'desconhecida';
    const allowed = new Set<string>([
      ...(COMPATIBLE_PROCEDURES_BY_FAMILY[family as keyof typeof COMPATIBLE_PROCEDURES_BY_FAMILY] ?? []),
      ...(analysis?.recommendedProcedure ? [analysis.recommendedProcedure] : []),
    ]);
    if (allowed.size === 0) {
      throw new Error(
        `Procedimento indeterminado: tipificação classificada como "${family}" sem conjunto de procedimentos aplicáveis. ` +
          `Informe o procedimento do serviço ou complete a tipificação. Nenhum procedimento foi assumido.`,
      );
    }
    if (requested && requested !== 'recurso_jari' && !allowed.has(requested)) {
      throw new Error(
        `Procedimento incompatível com o caso: "${requested}" não se aplica à família "${family}" ` +
          `(permitidos: ${Array.from(allowed).join(', ')}).`,
      );
    }
    // "recurso_jari" é o valor persistido por ausência de escolha explícita do
    // usuário (canonical-mapper). Só é aceito se a família o comportar; caso
    // contrário o procedimento da Analysis prevalece.
    if (requested && allowed.has(requested)) return requested;
    return analysis.recommendedProcedure;
  }

  private fallbackDeterministicAnalysis(caseId: string, infraction: any) {
    return {
      id: 'analysis_' + crypto.randomUUID(),
      caseId,
      status: 'completed',
      // Sem fabrication numérica: a probabilidade é desconhecida, não 50.
      overallSuccessRate: null,
      successRateBasis: 'UNAVAILABLE',
      detectedInconsistencies: [],
      recommendedArguments: [],
      recommendedProcedure: 'recurso_jari',
      competentBody: infraction.autuadorBody || 'Nao identificado',
      procedureDeadline: infraction.defenseDeadline,
      summaryReasoning: 'Análise em modo degradado: recuperação da KB indisponível. Nenhuma tese foi autorizada por recuperação; as teses do Rule Engine, se houver, permanecem válidas.',
      createdAt: new Date().toISOString(),
      engineVersion: 'fallback-deterministic',
      evaluatedRules: [],
      detectedFlaws: [],
      selectedArguments: [],
      dataGaps: [{
        ruleId: 'RAG_UNAVAILABLE',
        missingData: ['base juridica canonica'],
        reason: 'Serviço RAG indisponível — análise em modo degradado',
      }],
    };
  }

}

export function createRagAdapter(env: any) {
  return new CloudflareRagAdapter(env);
}

export async function analyzeInfractionCompat(env: any, caseId: string, infraction: any) {
  const adapter = new CloudflareRagAdapter(env);
  return adapter.analyzeInfraction(caseId, infraction);
}

export async function generateDefenseDraftCompat(
  env: any,
  caseId: string,
  infraction: any,
  vehiclePlate: string,
  vehicleModel: string,
  applicantData: any,
  procedureType?: string,
  precomputedAnalysis?: any
) {
  const adapter = new CloudflareRagAdapter(env);
  // A Analysis do chamador é a autoridade: o integrityHash depende do conteúdo
  // dela, então recomputar aqui criaria divergência entre o documento e a
  // Analysis persistida. Só recalcula quando o chamador legacy não forneceu
  // nenhuma.
  const analysis = precomputedAnalysis
    ? precomputedAnalysis
    : await adapter.analyzeInfraction(caseId, infraction);

  // Procedimento: pedido do chamador se compatível, senão o que a Analysis
  // determinou pelos fatos. Incompatível é rejeitado, nunca reescrito.
  const effectiveProcedure = adapter.resolveProcedure(procedureType, analysis);

  const { DocumentAssemblyEngine } = await import('../src/core/documents/document-assembly-engine');

  const draft = DocumentAssemblyEngine.assemble({
    caseId,
    procedureType: effectiveProcedure as any,
    infraction: infraction as any,
    vehicle: { plate: vehiclePlate, model: vehicleModel },
    applicant: applicantData,
    selectedArgumentIds: analysis.recommendedArguments.map((a: any) => a.id),
    analysis,
    dates: {
      infractionDate: infraction.dateTime,
      expeditionDate: infraction.notificationExpeditionDate,
      notificationDate: infraction.notificationExpeditionDate,
      appealFilingDate: infraction.defenseDeadline,
    },
    speeds: {
      measured: infraction.measuredSpeed,
      considered: infraction.consideredSpeed,
      limit: infraction.speedLimit,
    },
  });

  const integrityHash = await computeDefenseIntegrityHash(draft as any, analysis, {
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
  });

  return { ...draft, protocolInfo: undefined, integrityHash };
}
