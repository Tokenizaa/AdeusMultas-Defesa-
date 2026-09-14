import { describe, expect, it } from 'vitest';
import { knowledgeRoutes } from './knowledge';

describe('knowledge RAG routes', () => {
  it('rejects empty semantic queries', async () => {
    const response = await knowledgeRoutes.request('/knowledge/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '' }),
    }, {} as never);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('embeds and queries Vectorize', async () => {
    const calls: unknown[] = [];
    const env = {
      AI: { run: async (_model: string, _input: Record<string, unknown>) => ({ data: [[0.1, 0.2, 0.3]] }) },
      VECTORIZE: {
        query: async (vector: number[], options: Record<string, unknown>) => {
          calls.push({ vector, options });
          return { matches: [{ id: 'doc-1:0', score: 0.91, metadata: { text: 'Art. 281 do CTB' } }] };
        },
      },
    };

    const response = await knowledgeRoutes.request('/knowledge/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'recurso de multa', topK: 5 }),
    }, env as never);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.data.matches[0].id).toBe('doc-1:0');
    expect(calls).toHaveLength(1);
  });
});
