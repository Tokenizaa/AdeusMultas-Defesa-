/**
 * @file rag-service.ts
 * Canonical RAG Context Assembly & Traceability Engine for DefesAi
 * 
 * Guarantees:
 * 1. Consistent structured formatting for LLM comprehension.
 * 2. Absolute provenance traceability for every paragraph and statutory citation.
 * 3. Token-budget-aware context trimming.
 * 4. Generates audit-ready citation lists for generated legal defense petitions.
 */

import { searchService } from './search-service';
import { KnowledgeSearchResult, RAGContextBuildResult, SearchKnowledgeOptions } from './types';

export class RagService {
  private static instance: RagService;

  private constructor() {}

  public static getInstance(): RagService {
    if (!RagService.instance) {
      RagService.instance = new RagService();
    }
    return RagService.instance;
  }

  /**
   * Formats search results into a clean, highly structured RAG context block
   */
  public buildRAGContext(
    results: KnowledgeSearchResult[],
    maxTokens = 3000
  ): RAGContextBuildResult {
    if (!results || results.length === 0) {
      return {
        formattedContext: 'Nenhum documento específico encontrado na base canônica para este caso.',
        tokenCountEstimate: 12,
        sourcesUsed: [],
        citations: [],
      };
    }

    const contextBlocks: string[] = [];
    const citations: string[] = [];
    const sourcesUsed: RAGContextBuildResult['sourcesUsed'] = [];
    let currentChars = 0;
    const maxChars = maxTokens * 4;

    for (let i = 0; i < results.length; i++) {
      const item = results[i];
      const headingOrArticle = item.articleNumber || item.heading || 'Dispositivo Legal';
      const citation = `${item.sourceName} — ${item.documentTitle} (${headingOrArticle})`;

      if (!citations.includes(citation)) {
        citations.push(citation);
      }

      sourcesUsed.push({
        sourceId: item.sourceId,
        sourceName: item.sourceName,
        authority: item.authority,
        documentTitle: item.documentTitle,
        articleOrHeading: headingOrArticle,
        chunkId: item.chunkId,
        score: item.rerankScore,
      });

      const block = [
        `[Fonte: ${item.sourceName} | Autoridade: ${item.authority}]`,
        `[Documento: ${item.documentTitle} | Versão: ${item.version}]`,
        `[Dispositivo: ${headingOrArticle}]`,
        `[Conteúdo Normativo]:`,
        item.content,
        `----------------------------------------`,
      ].join('\n');

      if (currentChars + block.length <= maxChars) {
        contextBlocks.push(block);
        currentChars += block.length;
      } else {
        break;
      }
    }

    const formattedContext = [
      `=== REPERTÓRIO JURÍDICO CANÔNICO RECUPERADO (RAG DEFESAI) ===`,
      ...contextBlocks,
      `=== FIM DO REPERTÓRIO JURÍDICO ===`,
    ].join('\n\n');

    return {
      formattedContext,
      tokenCountEstimate: Math.ceil(formattedContext.length / 4),
      sourcesUsed,
      citations,
    };
  }

  /**
   * Complete end-to-end RAG retrieval: Query -> Search -> Rerank -> Structured Context Block
   */
  public async retrieveContextForQuery(
    query: string,
    options?: SearchKnowledgeOptions & { maxTokens?: number }
  ): Promise<RAGContextBuildResult & { results: KnowledgeSearchResult[] }> {
    const results = await searchService.searchKnowledge(query, options);
    const context = this.buildRAGContext(results, options?.maxTokens || 3000);

    return {
      ...context,
      results,
    };
  }
}

export const ragService = RagService.getInstance();
