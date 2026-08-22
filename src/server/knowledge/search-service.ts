/**
 * @file search-service.ts
 * Centralized Semantic Search & Hybrid Retrieval Gateway for DefesAi
 * 
 * Guarantees:
 * 1. Single entrypoint for all AI Agents, Legal Synthesizer, and Admin tooling.
 * 2. Automatic embedding of natural language queries with multi-tier fallback.
 * 3. Multi-dimensional filtering (Source, Document Type, Jurisdiction, Authority).
 * 4. High-precision hybrid reranking.
 * 5. Full performance tracing and metric instrumentation.
 */

import { embeddingService } from './embedding-service';
import { vectorStore } from './vector-store';
import { rerankerService } from './reranker-service';
import { logger } from '../observability/logger';
import { metricsService } from '../observability/metrics-service';
import { SearchKnowledgeOptions, KnowledgeSearchResult } from './types';

export class SearchService {
  private static instance: SearchService;

  private constructor() {}

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  /**
   * Search knowledge base using semantic vector retrieval + hybrid legal reranking
   */
  public async searchKnowledge(
    query: string,
    options?: SearchKnowledgeOptions
  ): Promise<KnowledgeSearchResult[]> {
    const startTime = Date.now();
    const correlationId = options?.correlationId || `corr_srch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const topK = options?.topK || 20;
    const topN = options?.topN || 5;
    const enableReranking = options?.enableReranking ?? true;

    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    try {
      // 1. Generate Embedding for Query
      const queryEmbResult = await embeddingService.generateEmbedding(cleanQuery, {
        correlationId,
      });

      // 2. Vector Search Retrieval (Top-K)
      const vectorResults = await vectorStore.searchVectors(queryEmbResult.embedding, {
        topK,
        threshold: options?.threshold ?? 0.30,
        filterSourceId: options?.filterSourceId,
        filterDocumentType: options?.filterDocumentType,
        filterJurisdiction: options?.filterJurisdiction,
      });

      // 3. Authority / Metadata Post-filtering
      let filteredResults = vectorResults;
      if (options?.filterAuthority) {
        filteredResults = filteredResults.filter((r) =>
          r.authority.toLowerCase().includes(options.filterAuthority!.toLowerCase())
        );
      }

      // 4. Hybrid Reranking (Top-K -> Top-N)
      const finalResults = enableReranking
        ? rerankerService.rerank(cleanQuery, filteredResults, topN)
        : filteredResults.slice(0, topN);

      const durationMs = Date.now() - startTime;

      metricsService.recordRequest(durationMs, true);

      logger.info('ai', 'search_service', 'search_knowledge', `Busca semântica executada em ${durationMs}ms (${finalResults.length} resultados)`, {
        correlationId,
        query: cleanQuery.substring(0, 80),
        matchesCount: finalResults.length,
        durationMs,
        provider: queryEmbResult.provider === 'DETERMINISTIC_LOCAL' ? 'internal' : queryEmbResult.provider.toLowerCase() as 'nvidia' | '9router' | 'gemini',
      });

      return finalResults;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      logger.error('ai', 'search_service', 'search_knowledge', `Erro na busca semântica: ${err.message}`, {
        correlationId,
        durationMs,
        error: err.message,
      });
      throw err;
    }
  }
}

export const searchService = SearchService.getInstance();
