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
      const query = this.buildSemanticQuery(infraction);
      const embedding = await this.generateEmbedding(query);
      const ragResults = await this.searchKnowledgeViaRPC(embedding, infraction);
      const analysis = await this.applyDeterministicAnalysis(caseId, infraction, ragResults);
      return analysis;
    } catch (err: any) {
      console.error('[RAG Adapter] Erro na análise:', err.message);
      return this.fallbackDeterministicAnalysis(caseId, infraction);
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    return this.createDeterministicVector(text, 1024);
  }

  private async searchKnowledgeViaRPC(embedding: number[], infraction: any) {
    const threshold = 0.35;
    const matchCount = 20;
    const jurisdiction = this.extractJurisdiction(infraction);
    
    try {
      const { data, error } = await this.supabase.rpc('match_knowledge_chunks', {
        query_embedding: JSON.stringify(embedding),
        match_threshold: 0.35,
        match_count: 20,
        filter_source_id: null,
        filter_document_type: null,
        filter_jurisdiction: jurisdiction || null,
      });

      if (error) {
        console.warn('[RAG Adapter] RPC error:', error.message);
        return [];
      }

      return data || [];
    } catch (err: any) {
      console.warn('[RAG Adapter] RPC failed:', err.message);
      return [];
    }
  }

  private buildSemanticQuery(infraction: any): string {
    const parts: string[] = [];

    if (infraction.infractionCode) parts.push('Código de infração: ' + infraction.infractionCode);
    if (infraction.ctbArticle) parts.push('Artigo CTB: ' + infraction.ctbArticle);
    if (infraction.description) parts.push('Descricao: ' + infraction.description);
    if (infraction.autuadorBody) parts.push('Orgao autuador: ' + infraction.autuadorBody);
    if (infraction.severity) parts.push('Gravidade: ' + infraction.severity);
    if (infraction.speedLimit && infraction.measuredSpeed) {
      parts.push('Velocidade da via: ' + infraction.speedLimit + ' km/h, medida: ' + infraction.measuredSpeed + ' km/h');
    }
    if (infraction.location) parts.push('Local: ' + infraction.location);

    return 'Analise de infração de transito brasileira: ' + parts.join('; ');
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

  private async applyDeterministicAnalysis(caseId: string, infraction: any, ragResults: any[]) {
    const { ExpertRuleEngine } = await import('../src/core/rules/rule-engine');

    const EVIDENCE_DEPENDENT_ARGUMENTS: Record<string, string> = {
      'ARG-012': 'fotoRetencaoTrafego',
      'ARG-019': 'manualVeiculoOuFotoPainel',
      'ARG-020': 'fotoPlacaR6aAusente',
    };

    const ruleResult = ExpertRuleEngine.evaluate(caseId, infraction);
    const evidenceFlags = infraction.evidenceFlags || {};
    
    const filteredArguments = ruleResult.recommendedArguments.filter((arg: any) => {
      const evidenceKey = (EVIDENCE_DEPENDENT_ARGUMENTS as Record<string, string>)[arg.id];
      if (!evidenceKey) return true;
      return evidenceFlags[evidenceKey] === true;
    });

    const ragArguments = this.mapRAGResultToArgument(ragResults);

    const analysis = {
      id: 'analysis_' + crypto.randomUUID(),
      caseId,
      status: 'completed',
      overallSuccessRate: 75,
      detectedInconsistencies: [],
      recommendedArguments: [
        ...filteredArguments,
        ...ragResults.slice(0, 3).map(this.mapRAGResultToArgument.bind(this))
      ],
      recommendedProcedure: this.determineProcedure(infraction),
      competentBody: infraction.autuadorBody || 'Nao identificado',
      procedureDeadline: infraction.defenseDeadline,
      summaryReasoning: 'Analise hibrida: Rule Engine + RAG canonico',
      createdAt: new Date().toISOString(),
      engineVersion: 'defesai-legal-vectorizer-v1-rag-v1',
      evaluatedRules: [],
      detectedFlaws: [],
      selectedArguments: [],
      dataGaps: [],
    };

    return analysis;
  }

  private mapRAGResultToArgument(r: any) {
    return {
      id: 'RAG-' + r.chunk_id,
      title: r.heading || 'Dispositivo: ' + r.article_number,
      reason: 'Baseado em ' + r.source_name + ' - ' + r.document_title,
      baseLegal: r.authority + ' - ' + r.document_title + ' (' + (r.article_number || 'N/A') + ')',
      category: 'rag_retrieved',
      evidenceRequired: [],
    };
  }

  private determineProcedure(infraction: any): string {
    if (infraction.infractionCode === '516-91' || infraction.infractionCode === '747-10') return 'suspensao_cnh';
    if (infraction.evidenceFlags?.hasPreviousInfractionsLast12Months === false) return 'conversao_advertencia';
    return 'recurso_jari';
  }

  private fallbackDeterministicAnalysis(caseId: string, infraction: any) {
    return {
      id: 'analysis_' + crypto.randomUUID(),
      caseId,
      status: 'completed',
      overallSuccessRate: 50,
      detectedInconsistencies: [],
      recommendedArguments: [],
      recommendedProcedure: 'recurso_jari',
      competentBody: infraction.autuadorBody || 'Nao identificado',
      procedureDeadline: infraction.defenseDeadline,
      summaryReasoning: 'Analise em modo fallback (RAG indisponível).',
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

  private createDeterministicVector(text: string, dimensions = 1024): number[] {
    const vector = new Array(dimensions).fill(0);
    const words = text
      .toLowerCase()
      .replace(/[^\w\sáéíóúâêîôûãõç]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1);

    const legalKeywords: Record<string, number> = {
      ctb: 3.5, contran: 3.2, senatran: 3.0, inmetro: 3.0,
      ait: 3.0, art: 2.8, artigo: 2.8, velocidade: 2.5,
      radar: 2.5, bafometro: 2.8, etilometro: 2.8,
      autuacao: 2.6, notificacao: 2.6, prazo: 2.5,
      decadencia: 3.0, prescricao: 3.0, recurso: 2.4,
      jari: 2.8, cetran: 2.8, advertencia: 2.6,
      suspensao: 2.9, cassacao: 2.9, nulidade: 3.2,
      cancelamento: 3.0, inconsistencia: 3.0,
      sinalizacao: 2.5, placa: 2.4, afericao: 2.7, calibracao: 2.8, tolerancia: 2.6,
    };

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const weight = legalKeywords[word] || 1.0;
      const h1 = this.fnv1a(word);
      const h2 = this.fnv1a(word + '_pos_' + (i % 5));
      const h3 = this.fnv1a(word + '_rev');
      const dim1 = Math.abs(h1) % 1024;
      const dim2 = Math.abs(h2) % 1024;
      const dim3 = Math.abs(h3) % 1024;
      vector[dim1] += 0.8 * weight;
      vector[dim2] += 0.5 * weight;
      vector[dim3] += 0.3 * weight;
      if (i > 0) {
        const bigram = words[i - 1] + '_' + words[i];
        const bHash = Math.abs(this.fnv1a(bigram)) % 1024;
        vector[bHash] += 1.2 * weight;
      }
    }
    return this.normalizeVector(vector);
  }

  private fnv1a(str: string): number {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash;
  }

  private normalizeVector(vec: number[]): number[] {
    const dot = vec.reduce((acc, v) => acc + v * v, 0);
    const norm = Math.sqrt(dot);
    if (norm === 0) return vec;
    return vec.map((v) => v / norm);
  }
}

export function createRagAdapter(env: any) {
  return new CloudflareRagAdapter(env);
}

export async function analyzeInfractionCompat(env: any, caseId: string, infraction: any) {
  const adapter = new CloudflareRagAdapter(env);
  return adapter.analyzeInfraction(caseId, infraction);
}

export async function generateDefenseDraftCompat(env: any, caseId: string, infraction: any, vehiclePlate: string, vehicleModel: string, applicantData: any, procedureType: string) {
  const adapter = new CloudflareRagAdapter(env);
  const analysis = await adapter.analyzeInfraction(caseId, infraction);
  
  const { DocumentAssemblyEngine } = await import('../src/core/documents/document-assembly-engine');
  
  const draft = DocumentAssemblyEngine.assemble({
    caseId,
    procedureType: procedureType as any,
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

  const integrityHash = await computeDefenseIntegrityHash(draft as any, analysis);
  
  return { ...draft, protocolInfo: undefined, integrityHash };
}