/**
 * @file source-fetcher.ts
 * Fetcher de Fontes Oficiais com Timeout, Cabeçalhos Oficiais e Tratamento de Falhas.
 */

import { KnowledgeSource } from '../types';

export interface FetchResult {
  sourceId: string;
  url: string;
  success: boolean;
  httpStatus: number;
  content: string;
  contentLength: number;
  durationMs: number;
  errorMessage?: string;
  fetchedAt: string;
}

export interface FetchOptions {
  timeoutMs?: number;
  userAgent?: string;
  maxRetries?: number;
}

export class SourceFetcher {
  private static DEFAULT_TIMEOUT = 10000;
  private static DEFAULT_USER_AGENT =
    'Mozilla/5.0 (DefesAi Legal Monitor/2026.1; +https://adeuscnhmultas.com/monitoring-bot)';

  /**
   * Executa a requisição HTTP real para a fonte oficial.
   */
  public static async fetchSource(
    source: KnowledgeSource,
    options: FetchOptions = {}
  ): Promise<FetchResult> {
    const timeoutMs = options.timeoutMs || this.DEFAULT_TIMEOUT;
    const userAgent = options.userAgent || this.DEFAULT_USER_AGENT;
    const startTime = Date.now();
    const fetchedAt = new Date().toISOString();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(source.url, {
        method: 'GET',
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal,
      });

      clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      const httpStatus = response.status;

      if (!response.ok) {
        return {
          sourceId: source.id,
          url: source.url,
          success: false,
          httpStatus,
          content: '',
          contentLength: 0,
          durationMs,
          errorMessage: `HTTP Error ${httpStatus}: ${response.statusText}`,
          fetchedAt,
        };
      }

      const text = await response.text();
      return {
        sourceId: source.id,
        url: source.url,
        success: true,
        httpStatus,
        content: text,
        contentLength: text.length,
        durationMs,
        fetchedAt,
      };
    } catch (error: any) {
      clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      const isTimeout = error.name === 'AbortError';

      return {
        sourceId: source.id,
        url: source.url,
        success: false,
        httpStatus: isTimeout ? 408 : 0,
        content: '',
        contentLength: 0,
        durationMs,
        errorMessage: isTimeout ? `Request timed out after ${timeoutMs}ms` : error.message || 'Fetch failed',
        fetchedAt,
      };
    }
  }

  /**
   * Executa requisições em lote com controle de concorrência.
   */
  public static async fetchAllSources(
    sources: KnowledgeSource[],
    concurrency = 5,
    options: FetchOptions = {}
  ): Promise<FetchResult[]> {
    const results: FetchResult[] = [];
    const activeSources = sources.filter((s) => s.isActive);

    for (let i = 0; i < activeSources.length; i += concurrency) {
      const chunk = activeSources.slice(i, i + concurrency);
      const chunkPromises = chunk.map((s) => this.fetchSource(s, options));
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    return results;
  }
}
