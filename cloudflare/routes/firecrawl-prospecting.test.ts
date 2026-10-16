import { describe, expect, it, vi } from 'vitest';
import { FirecrawlProspectingError, searchFirecrawlProspects } from '../services/firecrawl-prospecting';

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

describe('searchFirecrawlProspects', () => {
  it('requires server-side credentials without making a network request', async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    await expect(searchFirecrawlProspects({ query: 'despachante trânsito', fetchImpl }))
      .rejects.toMatchObject({ code: 'NOT_CONFIGURED', statusCode: 503 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('validates query length before calling the provider', async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    await expect(searchFirecrawlProspects({ apiKey: 'test-key', query: '  ', fetchImpl }))
      .rejects.toMatchObject({ code: 'INVALID_QUERY', statusCode: 400 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('sends bounded web-only search and normalizes results without writing to a database', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({
      success: true,
      data: {
        web: [
          { title: 'Despachante A', url: 'https://example.com', description: 'Serviços de trânsito' },
          { title: 'URL inválida', url: 'javascript:alert(1)', description: 'ignore' },
          { title: 'Despachante B', url: 'https://example.org', snippet: 'Atendimento veicular' },
        ],
      },
      creditsUsed: 1,
    }));
    const result = await searchFirecrawlProspects({
      apiKey: 'test-key',
      query: 'despachante de trânsito em São Paulo',
      limit: 99,
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.firecrawl.dev/v2/search');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-key');
    expect(JSON.parse(String(init?.body))).toMatchObject({
      query: 'despachante de trânsito em São Paulo',
      limit: 5,
      sources: ['web'],
    });
    expect(result.results).toEqual([
      { title: 'Despachante A', url: 'https://example.com/', description: 'Serviços de trânsito' },
      { title: 'Despachante B', url: 'https://example.org/', description: 'Atendimento veicular' },
    ]);
    expect(result.creditsUsed).toBe(1);
  });

  it('maps provider throttling to a stable error without exposing provider details', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response('secret provider body', { status: 429 }));
    await expect(searchFirecrawlProspects({ apiKey: 'test-key', query: 'despachante trânsito', fetchImpl }))
      .rejects.toMatchObject({ code: 'RATE_LIMITED', statusCode: 429 });
  });

  it('does not expose upstream response bodies on provider errors', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response('sensitive details', { status: 500 }));
    await expect(searchFirecrawlProspects({ apiKey: 'test-key', query: 'despachante trânsito', fetchImpl }))
      .rejects.toMatchObject({ code: 'UPSTREAM_ERROR', statusCode: 502, message: 'Falha na consulta ao Firecrawl.' });
  });
});
