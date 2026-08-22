/**
 * @file reranker-service.ts
 * Legal Hybrid Reranking Engine for DefesAi Knowledge Retrieval
 * 
 * Flow:
 * Vector Top-K Results -> Lexical BM25 Boost -> Authority Tier Weighting 
 *   -> Exact Statutory Pinpointing -> Calibrated Top-N
 * 
 * Weights:
 * 1. Dense Semantic Similarity (45%)
 * 2. Lexical & Exact Statutory Match (35%)
 * 3. Authority Hierarchy Tier (20%)
 */

import { KnowledgeSearchResult } from './types';

export class RerankerService {
  private static instance: RerankerService;

  private constructor() {}

  public static getInstance(): RerankerService {
    if (!RerankerService.instance) {
      RerankerService.instance = new RerankerService();
    }
    return RerankerService.instance;
  }

  /**
   * Authority Tier multipliers
   */
  private getAuthorityWeight(authority: string, documentType: string): number {
    const authUpper = (authority || '').toUpperCase();
    const typeUpper = (documentType || '').toUpperCase();

    if (authUpper.includes('CONSTITUIÇÃO') || typeUpper.includes('CONSTITUCIONAL')) return 1.25;
    if (authUpper.includes('CONGRESSO') || typeUpper.includes('LEI') || authUpper.includes('PRESIDÊNCIA')) return 1.20;
    if (authUpper.includes('STJ') || authUpper.includes('STF') || typeUpper.includes('ACORDAO')) return 1.18;
    if (authUpper.includes('CONTRAN') || typeUpper.includes('RESOLUCAO')) return 1.15;
    if (authUpper.includes('INMETRO') || authUpper.includes('SENATRAN') || typeUpper.includes('PORTARIA')) return 1.12;
    if (authUpper.includes('CETRAN') || authUpper.includes('JARI')) return 1.08;
    return 1.0;
  }

  /**
   * Calculates lexical match score based on query keywords and exact statutory references
   */
  private calculateLexicalScore(query: string, result: KnowledgeSearchResult): number {
    const cleanQuery = query.toLowerCase();
    const content = (result.content + ' ' + (result.heading || '') + ' ' + (result.articleNumber || '')).toLowerCase();

    // Extract exact legal tokens (e.g. "art. 218", "artigo 280", "745-50", "res 798", "inmetro")
    const queryTokens = cleanQuery
      .replace(/[^\w\sáéíóúâêîôûãõç\.\-]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    if (queryTokens.length === 0) return 0.5;

    let matches = 0;
    let exactStatuteMatch = false;

    // Check exact article or resolution match
    if (result.articleNumber) {
      const artClean = result.articleNumber.toLowerCase().replace(/[^0-9]/g, '');
      if (artClean && cleanQuery.includes(artClean)) {
        exactStatuteMatch = true;
      }
    }

    for (const token of queryTokens) {
      if (content.includes(token)) {
        matches++;
      }
    }

    let lexicalScore = matches / queryTokens.length;
    if (exactStatuteMatch) {
      lexicalScore = Math.min(1.0, lexicalScore + 0.35);
    }

    return Math.min(1.0, lexicalScore);
  }

  /**
   * Reranks search results using dense vector similarity, lexical scoring, and legal authority weighting
   */
  public rerank(
    query: string,
    results: KnowledgeSearchResult[],
    topN = 5
  ): KnowledgeSearchResult[] {
    if (results.length === 0) return [];

    const scoredResults = results.map((item) => {
      const vectorScore = item.similarity;
      const lexicalScore = this.calculateLexicalScore(query, item);
      const authorityMultiplier = this.getAuthorityWeight(item.authority, item.documentType);

      // Hybrid calculation
      const combinedScore = (vectorScore * 0.45 + lexicalScore * 0.35 + (authorityMultiplier - 1.0)) * authorityMultiplier;
      const finalScore = Number(Math.max(0, Math.min(1.0, combinedScore)).toFixed(4));

      return {
        ...item,
        rerankScore: finalScore,
      };
    });

    // Sort descending by final calibrated rerank score
    scoredResults.sort((a, b) => b.rerankScore - a.rerankScore);

    return scoredResults.slice(0, topN);
  }
}

export const rerankerService = RerankerService.getInstance();
