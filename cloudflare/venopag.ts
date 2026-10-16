/** Minimal VenoPag Cash In client for the Cloudflare Worker runtime. */
export interface VenoPagEnv {
  VENO_CLIENT_ID?: string;
  VENO_CLIENT_SECRET?: string;
  VENO_WEBHOOK_SECRET?: string;
}

export interface VenoCashIn {
  request_number: string;
  transaction_id?: string;
  status: string;
  amount: number;
  copyPaste: string;
  qr_url?: string;
  qr_img?: string;
  checkout_url?: string;
  expire_minutes?: number;
}

export interface VenoCashInStatus {
  ok: boolean;
  status?: string;
  request_number?: string;
  amount?: number;
  error?: string;
}

const API_BASE = 'https://venopagments.com/api';

function credentials(env: VenoPagEnv): { id: string; secret: string } {
  const id = env.VENO_CLIENT_ID?.trim();
  const secret = env.VENO_CLIENT_SECRET?.trim();
  if (!id || !secret) throw new Error('VenoPag indisponível: credenciais não configuradas.');
  return { id, secret };
}

async function request<T>(env: VenoPagEnv, path: string, init: RequestInit = {}): Promise<T> {
  const { id, secret } = credentials(env);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'X-Client-Id': id,
        'X-Client-Secret': secret,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
    const data = await response.json() as T & { ok?: boolean; error?: string };
    // VenoPag business errors usually arrive with HTTP 200; inspect both.
    if (!response.ok || data?.ok === false) {
      throw new Error(typeof data?.error === 'string' ? data.error : 'Falha ao processar pagamento VenoPag.');
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export async function createVenoCashIn(env: VenoPagEnv, input: {
  amountInCents: number;
  payerName: string;
  payerDocument: string;
  description: string;
  webhookUrl: string;
  splits?: Array<{ username: string; percentage: number }>;
}): Promise<VenoCashIn> {
  if (!Number.isSafeInteger(input.amountInCents) || input.amountInCents <= 0) {
    throw new Error('Valor inválido para cobrança PIX.');
  }
  const name = input.payerName.trim();
  const document = input.payerDocument.replace(/\D/g, '');
  if (!name || ![11, 14].includes(document.length)) {
    throw new Error('Nome e CPF/CNPJ válidos do pagador são obrigatórios para o PIX.');
  }
  const data = await request<VenoCashIn & { ok: boolean; error?: string }>(env, '/cashin', {
    method: 'POST',
    body: JSON.stringify({
      amount: input.amountInCents / 100,
      name,
      document,
      description: input.description.slice(0, 120),
      webhook_url: input.webhookUrl,
      ...(input.splits?.length ? { splits: input.splits } : {}),
    }),
  });
  if (!data.request_number || typeof data.copyPaste !== 'string' || !data.copyPaste.trim()) {
    throw new Error('Resposta VenoPag sem identificador ou código PIX válido.');
  }
  return data;
}

export function getVenoCashInStatus(env: VenoPagEnv, requestNumber: string): Promise<VenoCashInStatus> {
  return request<VenoCashInStatus>(env, `/consult-transaction?request_number=${encodeURIComponent(requestNumber)}`);
}

/** VenoPag does not sign webhook payloads. Protect the endpoint with a non-guessable URL token,
 * then independently confirm each event through GET /api/consult-transaction before mutating payment state. */
export function verifyVenoWebhook(env: VenoPagEnv, token: string | null): boolean {
  const secret = env.VENO_WEBHOOK_SECRET?.trim();
  if (!secret || !token || token.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= secret.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}
