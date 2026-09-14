import { Hono } from 'hono';
import type { Env } from '../supabase';
import { authenticateToken, type AuthenticatedUser } from '../middleware';
import { adapterError, adapterOk } from '../../src/shared/api/adapters';

const MODEL = '@cf/openai/gpt-oss-20b';
const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5';
const MAX_QUERY = 6000;
const MAX_CONTEXT = 18000;

type Match = {
  id: string;
  score?: number;
  metadata?: Record<string, unknown>;
};

type AiResponse = {
  response?: string;
  answer?: string;
  text?: string;
};

function text(value: unknown, max = MAX_QUERY): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function retrieve(env: Env, query: string): Promise<Match[]> {
  const embedding = await env.AI.run(EMBEDDING_MODEL, { text: [query] }) as { data?: number[][] };
  const vector = embedding.data?.[0];
  if (!vector) throw new Error('Embedding não gerado');
  const result = await env.VECTORIZE.query(vector, {
    topK: 8,
    returnMetadata: 'all',
  });
  return (result.matches ?? []) as Match[];
}

function context(matches: Match[]): string {
  return matches
    .map((match, index) => {
      const metadata = match.metadata ?? {};
      return [
        `[FONTE ${index + 1}]`,
        `id=${match.id}`,
        `score=${match.score ?? 'n/a'}`,
        `source=${String(metadata.source ?? 'não informado')}`,
        `jurisdiction=${String(metadata.jurisdiction ?? 'não informada')}`,
        `title=${String(metadata.title ?? 'sem título')}`,
        `text=${String(metadata.text ?? '')}`,
      ].join('\n');
    })
    .join('\n\n')
    .slice(0, MAX_CONTEXT);
}

async function generate(env: Env, prompt: string): Promise<string> {
  const result = await env.AI.run(MODEL, {
    messages: [
      {
        role: 'system',
        content:
          'Você é o motor de IA do Adeus Multa. Trabalhe apenas com os dados do caso e as fontes recuperadas. Não invente lei, artigo, prazo, órgão, jurisprudência ou fato. Quando a base não sustentar uma conclusão, diga explicitamente que não há evidência suficiente. Não se apresente como advogado e não prometa resultado.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.1,
    max_tokens: 6000,
  }) as AiResponse;
  const answer = result.response ?? result.answer ?? result.text ?? '';
  if (!answer.trim()) throw new Error('Modelo AI não retornou conteúdo');
  return answer.trim();
}

export const aiRoutes = new Hono<{ Bindings: Env; Variables: { user?: AuthenticatedUser } }>();

aiRoutes.get('/ai/health', async (c) => {
  try {
    const result = await c.env.AI.run(MODEL, {
      messages: [{ role: 'user', content: 'Responda apenas: OK' }],
      temperature: 0,
      max_tokens: 8,
    }) as AiResponse;
    return adapterOk(c, { provider: 'cloudflare-workers-ai', model: MODEL, available: Boolean(result.response ?? result.answer ?? result.text) });
  } catch (error) {
    return adapterError(c, 'UPSTREAM_ERROR', error instanceof Error ? error.message : 'AI indisponível', 502);
  }
});

aiRoutes.post('/ai/analyze-infraction', authenticateToken, async (c) => {
  try {
    const body = await c.req.json<Record<string, unknown>>();
    const caseData = body.case ?? body.caseData ?? body;
    const caseText = JSON.stringify(caseData).slice(0, MAX_QUERY);
    if (!caseText || caseText === '{}') return adapterError(c, 'VALIDATION_ERROR', 'Dados do caso são obrigatórios', 400);

    const matches = await retrieve(c.env, `Análise de infração de trânsito brasileira: ${caseText}`);
    const prompt = `Analise o caso abaixo usando exclusivamente as fontes recuperadas. Retorne SOMENTE JSON válido com esta estrutura: {"summary":"...","formalFlaws":[],"recommendedArguments":[],"recommendedProcedure":"...","confidence":"low|medium|high","limitations":[]}. Cada item de recommendedArguments deve ter {"id":"source-id","title":"...","reason":"..."}. Não crie teses jurídicas que não estejam sustentadas pelas fontes. Caso as fontes sejam insuficientes, recommendedArguments deve ser [] e limitations deve explicar a insuficiência.\n\nCASO:\n${caseText}\n\nFONTES:\n${context(matches)}`;
    const analysis = await generate(c.env, prompt);
    return adapterOk(c, { provider: 'cloudflare-workers-ai', model: MODEL, analysis, sources: matches.map((m) => ({ id: m.id, score: m.score, metadata: m.metadata })) });
  } catch (error) {
    console.error('[ai/analyze-infraction] failed', error instanceof Error ? error.message : String(error));
    return adapterError(c, 'UPSTREAM_ERROR', 'Não foi possível analisar a infração.', 502);
  }
});

aiRoutes.post('/ai/generate-defense', authenticateToken, async (c) => {
  try {
    const body = await c.req.json<Record<string, unknown>>();
    const caseData = body.case ?? body.caseData;
    if (!caseData) return adapterError(c, 'VALIDATION_ERROR', 'Dados do caso são obrigatórios', 400);
    const customFacts = text(body.customFacts, 8000);
    const caseText = JSON.stringify(caseData).slice(0, MAX_QUERY);
    const matches = await retrieve(c.env, `Geração de defesa administrativa de trânsito brasileira: ${caseText}`);
    const prompt = `Gere uma minuta de defesa administrativa baseada somente nos fatos do caso e nas fontes recuperadas. Não invente fatos ou fundamentos jurídicos. Não cite artigo, súmula, precedente, prazo ou regra que não apareça nas fontes. Preserve campos identificadores exatamente como fornecidos. Estruture em: endereçamento, qualificação, fatos, fundamentos sustentados pelas fontes, pedidos e encerramento. Se faltar fundamento suficiente, deixe isso claro em vez de preencher com conteúdo inventado. Retorne somente o texto da minuta.\n\nCASO:\n${caseText}\n\nFATOS ADICIONAIS:\n${customFacts || '(nenhum)'}\n\nFONTES:\n${context(matches)}`;
    const draft = await generate(c.env, prompt);
    return adapterOk(c, {
      provider: 'cloudflare-workers-ai',
      model: MODEL,
      fullDraftText: draft,
      selectedArgumentIds: matches.map((m) => m.id),
      sources: matches.map((m) => ({ id: m.id, score: m.score, metadata: m.metadata })),
    });
  } catch (error) {
    console.error('[ai/generate-defense] failed', error instanceof Error ? error.message : String(error));
    return adapterError(c, 'UPSTREAM_ERROR', 'Não foi possível gerar a defesa.', 502);
  }
});

export default aiRoutes;
