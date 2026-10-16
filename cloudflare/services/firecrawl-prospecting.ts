export interface FirecrawlSearchResult {
  title: string;
  url: string;
  description: string;
}

export interface FirecrawlSearchResponse {
  results: FirecrawlSearchResult[];
  creditsUsed?: number;
}

export class FirecrawlProspectingError extends Error {
  constructor(
    message: string,
    public readonly code: 'NOT_CONFIGURED' | 'INVALID_QUERY' | 'TIMEOUT' | 'RATE_LIMITED' | 'UPSTREAM_ERROR' | 'INVALID_RESPONSE',
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'FirecrawlProspectingError';
  }
}

interface FirecrawlSearchOptions {
  apiKey?: string;
  query: string;
  limit?: number;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeResults(payload: unknown): FirecrawlSearchResult[] {
  if (!isRecord(payload)) {
    throw new FirecrawlProspectingError('Resposta inválida do Firecrawl.', 'INVALID_RESPONSE', 502);
  }

  const rootData = payload.data;
  const data = isRecord(rootData) ? rootData : payload;
  const candidates = Array.isArray(rootData)
    ? rootData
    : Array.isArray(data.web)
      ? data.web
      : Array.isArray(data.organic)
        ? data.organic
        : Array.isArray(data.results)
          ? data.results
          : null;

  if (!candidates) {
    if (payload.success === false) {
      throw new FirecrawlProspectingError('O Firecrawl recusou a busca.', 'UPSTREAM_ERROR', 502);
    }
    throw new FirecrawlProspectingError('Resposta inválida do Firecrawl.', 'INVALID_RESPONSE', 502);
  }

  return candidates.flatMap((item): FirecrawlSearchResult[] => {
    if (!isRecord(item) || typeof item.url !== 'string') return [];
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(item.url);
    } catch {
      return [];
    }
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') return [];

    return [{
      title: typeof item.title === 'string' ? item.title.slice(0, 300) : parsedUrl.hostname,
      url: parsedUrl.toString(),
      description: typeof item.description === 'string'
        ? item.description.slice(0, 1200)
        : typeof item.snippet === 'string'
          ? item.snippet.slice(0, 1200)
          : '',
    }];
  });
}

/**
 * Bounded, read-only Firecrawl proof-of-technology.
 * Does not persist leads, scrape contact data, or trigger outreach.
 */
export async function searchFirecrawlProspects({
  apiKey,
  query,
  limit = 5,
  fetchImpl = fetch,
  timeoutMs = 12_000,
}: FirecrawlSearchOptions): Promise<FirecrawlSearchResponse> {
  const cleanQuery = typeof query === 'string' ? query.trim() : '';
  if (cleanQuery.length < 3 || cleanQuery.length > 200) {
    throw new FirecrawlProspectingError('A consulta deve ter entre 3 e 200 caracteres.', 'INVALID_QUERY', 400);
  }
  if (!apiKey?.trim()) {
    throw new FirecrawlProspectingError('Firecrawl não configurado no ambiente do servidor.', 'NOT_CONFIGURED', 503);
  }

  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(5, Math.floor(limit))) : 5;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1000, Math.min(timeoutMs, 15_000)));

  try {
    const response = await fetchImpl('https://api.firecrawl.dev/v2/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: cleanQuery, limit: safeLimit, sources: ['web'] }),
      signal: controller.signal,
    });

    if (response.status === 429) {
      throw new FirecrawlProspectingError('Limite de uso do Firecrawl atingido.', 'RATE_LIMITED', 429);
    }
    if (!response.ok) {
      throw new FirecrawlProspectingError(
        response.status === 401 || response.status === 403
          ? 'Credenciais Firecrawl inválidas ou sem permissão.'
          : 'Falha na consulta ao Firecrawl.',
        'UPSTREAM_ERROR',
        502,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new FirecrawlProspectingError('Resposta inválida do Firecrawl.', 'INVALID_RESPONSE', 502);
    }

    const results = normalizeResults(payload).slice(0, safeLimit);
    const credits = isRecord(payload) && typeof payload.creditsUsed === 'number'
      ? payload.creditsUsed
      : isRecord(payload) && isRecord(payload.data) && typeof payload.data.creditsUsed === 'number'
        ? payload.data.creditsUsed
        : undefined;

    return { results, ...(credits !== undefined ? { creditsUsed: credits } : {}) };
  } catch (error) {
    if (error instanceof FirecrawlProspectingError) throw error;
    if (controller.signal.aborted) {
      throw new FirecrawlProspectingError('A consulta Firecrawl excedeu o tempo limite.', 'TIMEOUT', 504);
    }
    throw new FirecrawlProspectingError('Não foi possível consultar o Firecrawl.', 'UPSTREAM_ERROR', 502);
  } finally {
    clearTimeout(timeout);
  }
}
