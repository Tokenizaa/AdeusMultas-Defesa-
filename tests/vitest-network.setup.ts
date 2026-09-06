import { afterAll, beforeAll, vi } from 'vitest';

const originalFetch = globalThis.fetch;

beforeAll(() => {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    const userAgent = headers.get('User-Agent') || '';

    // The WeeklyMonitorService uses this dedicated UA. Keep the unit/audit gate
    // deterministic without weakening tests for unrelated network consumers.
    if (userAgent.includes('DefesAi Legal Monitor/2026.1')) {
      const url = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

      return new Response(
        `<!doctype html><html><head><title>Mock official source</title></head><body>Official source snapshot for ${url}</body></html>`,
        {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        },
      );
    }

    return originalFetch(input, init);
  }) as typeof fetch;
});

afterAll(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});
