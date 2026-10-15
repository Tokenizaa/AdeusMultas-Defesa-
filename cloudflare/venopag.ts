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

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

export async function verifyVenoWebhook(env: VenoPagEnv, rawBody: string, signature: string | null, clientId: string | null): Promise<boolean> {
  const secret = env.VENO_WEBHOOK_SECRET?.trim();
  const expectedClientId = env.VENO_CLIENT_ID?.trim();
  if (!secret || !expectedClientId || !signature || clientId !== expectedClientId) return false;
  const match = /^t=(\d+),v1=([a-f0-9]{64})$/i.exec(signature.trim());
  if (!match || Math.abs(Date.now() / 1000 - Number(match[1])) > 300) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${match[1]}.${rawBody}`));
  const expected = Array.from(new Uint8Array(mac), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return constantTimeEqual(expected, match[2].toLowerCase());
}
