import { Hono } from 'hono';
import type { Env } from '../supabase';
import { adapterError, adapterOk } from '../../src/shared/api/adapters';

const MODEL = '@cf/moondream/moondream3.1-9B-A2B';
const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

type OcrFields = {
  aitNumber: string | null;
  plate: string | null;
  infractionDate: string | null;
  autuadorBody: string | null;
  description: string | null;
  ctbArticle: string | null;
  vehicleBrandModel: string | null;
  driverName: string | null;
  driverCpf: string | null;
  driverCnh: string | null;
};

type AiResult = { answer?: string; [key: string]: unknown };

function emptyFields(): OcrFields {
  return {
    aitNumber: null,
    plate: null,
    infractionDate: null,
    autuadorBody: null,
    description: null,
    ctbArticle: null,
    vehicleBrandModel: null,
    driverName: null,
    driverCpf: null,
    driverCnh: null,
  };
}

function normalizeFields(value: unknown): OcrFields {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const fields = emptyFields();
  for (const key of Object.keys(fields) as Array<keyof OcrFields>) {
    const candidate = source[key];
    fields[key] = typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null;
  }
  return fields;
}

function parseModelAnswer(answer: string): { rawText: string; fields: OcrFields } {
  const cleaned = answer.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try {
    const parsed = JSON.parse(cleaned) as { rawText?: unknown; fields?: unknown };
    return {
      rawText: typeof parsed.rawText === 'string' ? parsed.rawText.trim() : answer.trim(),
      fields: normalizeFields(parsed.fields),
    };
  } catch {
    return { rawText: answer.trim(), fields: emptyFields() };
  }
}

function toDataUri(bytes: Uint8Array, mimeType: string): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

async function readInput(c: any): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const contentType = c.req.header('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const form = await c.req.raw.formData();
    const file = form.get('file') || form.get('image');
    if (!(file instanceof File)) throw new Error('Arquivo de imagem ausente.');
    return { bytes: new Uint8Array(await file.arrayBuffer()), mimeType: file.type || 'image/jpeg' };
  }

  const body = await c.req.json<{ image?: string; mimeType?: string }>();
  if (!body.image || typeof body.image !== 'string') throw new Error('Campo image ausente.');
  const match = body.image.match(/^data:([^;]+);base64,(.+)$/s);
  const mimeType = match?.[1] || body.mimeType || 'image/jpeg';
  const encoded = match?.[2] || body.image;
  const binary = atob(encoded.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return { bytes, mimeType };
}

export const ocrRoutes = new Hono<{ Bindings: Env }>();

/**
 * OCR nacional de documentos de trânsito.
 * Anonymous-first: não exige Supabase Auth porque é usado antes do cadastro.
 * O processamento é executado integralmente pelo Workers AI; não há fallback Vercel.
 */
ocrRoutes.post('/ocr/analyze', async (c) => {
  try {
    const { bytes, mimeType } = await readInput(c);
    if (!ALLOWED_TYPES.has(mimeType)) {
      return adapterError(c, 'VALIDATION_ERROR', 'Formato não suportado. Envie JPEG, PNG, WEBP ou GIF.', 400);
    }
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) {
      return adapterError(c, 'VALIDATION_ERROR', 'A imagem deve ter entre 1 byte e 12 MB.', 400);
    }

    const image = toDataUri(bytes, mimeType);
    const prompt = `Você é um OCR de documentos de trânsito brasileiros. Extraia o texto visível com máxima fidelidade e, quando existirem, identifique os campos abaixo. Não invente valores. Responda SOMENTE JSON válido no formato {"rawText":"...","fields":{"aitNumber":null,"plate":null,"infractionDate":null,"autuadorBody":null,"description":null,"ctbArticle":null,"vehicleBrandModel":null,"driverName":null,"driverCpf":null,"driverCnh":null}}. Preserve pontuação, números e acentos. Se um campo não estiver legível ou não existir, use null.`;

    const result = await c.env.AI.run(MODEL, {
      task: 'query',
      image,
      question: prompt,
      reasoning: false,
      temperature: 0,
      max_tokens: 8192,
    }) as AiResult;

    const answer = typeof result.answer === 'string' ? result.answer : '';
    if (!answer) {
      return adapterError(c, 'UPSTREAM_ERROR', 'O serviço OCR não retornou conteúdo.', 502);
    }

    const parsed = parseModelAnswer(answer);
    return adapterOk(c, {
      provider: 'cloudflare-workers-ai',
      model: MODEL,
      rawText: parsed.rawText,
      fields: parsed.fields,
    });
  } catch (error) {
    console.error('[ocr] failed', error instanceof Error ? error.message : String(error));
    return adapterError(c, 'INTERNAL_ERROR', 'Não foi possível processar o documento.', 500);
  }
});

export default ocrRoutes;
