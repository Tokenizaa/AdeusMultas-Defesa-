import type { QueryScrapeResult, RawLead, ScraperCallbacks } from './types';
import { isSeen } from './seen-filter';

interface FirecrawlResult {
  title: string;
  url: string;
  description: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeResults(payload: unknown): FirecrawlResult[] {
  if (!isRecord(payload) || payload.success === false) {
    throw new Error('Resposta inválida do Firecrawl.');
  }

  const data = isRecord(payload.data) ? payload.data : payload;
  const candidates = Array.isArray(payload.data)
    ? payload.data
    : Array.isArray(data.web)
      ? data.web
      : Array.isArray(data.results)
        ? data.results
        : Array.isArray(data.organic)
          ? data.organic
          : null;

  if (!candidates) throw new Error('O Firecrawl não retornou uma lista de resultados.');

  return candidates.flatMap((item): FirecrawlResult[] => {
    if (!isRecord(item) || typeof item.url !== 'string') return [];
    let url: URL;
    try {
      url = new URL(item.url);
    } catch {
      return [];
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return [];
    return [{
      title: typeof item.title === 'string' && item.title.trim()
        ? item.title.trim().slice(0, 300)
        : url.hostname,
      url: url.toString(),
      description: typeof item.description === 'string'
        ? item.description.slice(0, 1200)
        : typeof item.snippet === 'string'
          ? item.snippet.slice(0, 1200)
          : '',
    }];
  });
}

/**
 * Firecrawl discovery adapter for the existing prospecting pipeline.
 * It only maps public search results into the existing RawLead contract;
 * the normal classifier, deduplication and persistence remain authoritative.
 */
export class FirecrawlScraper {
  private readonly apiKey: string;
  private callbacks: ScraperCallbacks;

  constructor(apiKey: string, callbacks: ScraperCallbacks = {}) {
    if (!apiKey?.trim()) throw new Error('FIRECRAWL_API_KEY not configured');
    this.apiKey = apiKey.trim();
    this.callbacks = callbacks;
  }

  setCallbacks(callbacks: ScraperCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  async search(
    query: string,
    location: string,
    requiredNew: number,
    seenKeys: Set<string>,
  ): Promise<QueryScrapeResult> {
    const result: QueryScrapeResult = {
      query: `${query} ${location}`.trim(),
      location,
      totalFound: 0,
      inserted: 0,
      filled: 0,
      duplicates: 0,
      completeDuplicates: 0,
      rejected: 0,
      errors: [],
      leads: [],
    };

    const cleanQuery = `${query} ${location}`.trim();
    if (cleanQuery.length < 3) {
      result.errors.push('Consulta Firecrawl inválida: informe segmento e localização.');
      return result;
    }
    if (this.callbacks.onCheckCancel?.()) return result;

    const limit = Math.max(1, Math.min(20, Math.floor(requiredNew || 10)));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch('https://api.firecrawl.dev/v2/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: cleanQuery, limit, sources: ['web'] }),
        signal: controller.signal,
      });

      if (response.status === 429) throw new Error('Limite de uso do Firecrawl atingido.');
      if (!response.ok) {
        throw new Error(response.status === 401 || response.status === 403
          ? 'Credenciais Firecrawl inválidas ou sem permissão.'
          : `Consulta Firecrawl falhou (HTTP ${response.status}).`);
      }

      const payload: unknown = await response.json();
      const discovered = normalizeResults(payload);
      result.totalFound = discovered.length;

      for (const item of discovered) {
        if (this.callbacks.onCheckCancel?.()) break;
        const url = new URL(item.url);
        const lead: RawLead = {
          name: item.title,
          category: query,
          website: url.origin,
          sourceUrl: item.url,
          description: item.description || undefined,
          searchTerm: query,
          searchLocation: location,
          scrapedAt: new Date().toISOString(),
          rawData: { discoverySource: 'firecrawl', resultUrl: item.url },
        };

        if (isSeen(seenKeys, lead.sourceUrl, lead.phone, lead.website, lead.email)) {
          result.duplicates += 1;
          continue;
        }

        result.leads.push(lead);
        seenKeys.add(`url:${lead.sourceUrl}`);
        this.callbacks.onCardExtracted?.(lead, result.leads.length, discovered.length);
        this.callbacks.onProgress?.({
          phase: 'discovery',
          discovered: discovered.length,
          processed: result.leads.length + result.duplicates,
          persisted: 0,
          duplicates: result.duplicates,
          errors: result.errors.length,
        });
      }
    } catch (error) {
      result.errors.push(error instanceof Error
        ? error.message
        : 'Falha desconhecida na consulta Firecrawl.');
    } finally {
      clearTimeout(timeout);
    }

    return result;
  }

  async close(): Promise<void> {
    // Firecrawl is request-based and has no persistent browser session to close.
  }
}
