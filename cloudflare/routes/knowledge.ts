import { Hono } from 'hono';
import type { Env } from '../supabase';
import { authenticateToken, requireAdmin } from '../middleware';
import { adapterError, adapterOk } from '../../src/shared/api/adapters';

type VectorMatch = { id: string; score?: number; metadata?: Record<string, unknown> };

const routes = new Hono<{ Bindings: Env }>();
const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5';
const MAX_CHUNK = 7000;

function chunkText(text: string): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  const chunks: string[] = [];
  for (let i = 0; i < normalized.length; i += MAX_CHUNK) chunks.push(normalized.slice(i, i + MAX_CHUNK));
  return chunks;
}

async function embed(env: Env, texts: string[]): Promise<number[][]> {
  const result = await env.AI.run(EMBEDDING_MODEL, { text: texts }) as { data?: number[][] };
  if (!result.data?.length) throw new Error('Embedding model returned no vectors');
  return result.data;
}

routes.get('/knowledge/health', async (c) => {
  try {
    const vectors = await embed(c.env, ['teste de busca jurídica de trânsito']);
    return adapterOk(c, { provider: 'cloudflare-vectorize', embeddingModel: EMBEDDING_MODEL, dimensions: vectors[0]?.length ?? 0 });
  } catch (error) {
    return adapterError(c, 'UPSTREAM_ERROR', error instanceof Error ? error.message : 'Knowledge provider unavailable', 502);
  }
});

routes.post('/knowledge/search', async (c) => {
  try {
    const body = await c.req.json<{ query?: string; topK?: number; filter?: Record<string, unknown> }>();
    const query = body.query?.trim();
    if (!query) return adapterError(c, 'VALIDATION_ERROR', 'query é obrigatório', 400);
    const topK = Math.min(Math.max(Number(body.topK) || 8, 1), 20);
    const [vector] = await embed(c.env, [query]);
    if (!vector) return adapterError(c, 'UPSTREAM_ERROR', 'Embedding não gerado', 502);
    const result = await c.env.VECTORIZE.query(vector, {
      topK,
      returnMetadata: 'all',
      ...(body.filter ? { filter: body.filter } : {}),
    });
    return adapterOk(c, { query, matches: (result.matches ?? []) as VectorMatch[] });
  } catch (error) {
    return adapterError(c, 'UPSTREAM_ERROR', error instanceof Error ? error.message : 'Falha na busca semântica', 502);
  }
});

routes.post('/knowledge/index', authenticateToken, requireAdmin, async (c) => {
  try {
    const body = await c.req.json<{ id?: string; text?: string; title?: string; source?: string; jurisdiction?: string; metadata?: Record<string, unknown> }>();
    if (!body.id || !body.text) return adapterError(c, 'VALIDATION_ERROR', 'id e text são obrigatórios', 400);
    const chunks = chunkText(body.text);
    const vectors = await embed(c.env, chunks);
    await c.env.VECTORIZE.upsert(chunks.map((text, index) => ({
      id: `${body.id}:${index}`,
      values: vectors[index]!,
      metadata: {
        documentId: body.id!,
        title: body.title ?? null,
        source: body.source ?? null,
        jurisdiction: body.jurisdiction ?? null,
        chunk: index,
        text,
        ...(body.metadata ?? {}),
      },
    })));
    return adapterOk(c, { documentId: body.id, chunks: chunks.length, embeddingModel: EMBEDDING_MODEL }, 201);
  } catch (error) {
    return adapterError(c, 'UPSTREAM_ERROR', error instanceof Error ? error.message : 'Falha ao indexar conhecimento', 502);
  }
});

export const knowledgeRoutes = routes;
