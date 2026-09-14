/** Cliente PagBank para Cloudflare Worker — sandbox primeiro, produção bloqueia sem token real/secret. */

export interface PixOrderParams {
  caseId: string;
  referenceId: string;
  payer: { name: string; email: string; document: string };
  amountInCents: number;
  description: string;
  webhookUrl: string;
}

export interface PixOrderResult {
  orderId?: string;
  gatewayTransactionId: string;
  qrCodeText?: string;
  qrCodeUrl?: string;
  pixCopyPaste?: string;
  status: string;
  simulated: boolean;
}

export interface Env {
  PAGBANK_TOKEN?: string;
  PAGBANK_ENV?: string;
  PAGBANK_WEBHOOK_SECRET?: string;
  PAYMENT_MODE?: string;
  APP_URL?: string;
}

const enc = new TextEncoder();

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const isProductionMode = (env: Env): boolean =>
  (env.PAYMENT_MODE || 'sandbox').toLowerCase() === 'production';

/** Cria ordem PIX. Token real → API PagBank; sandbox sem token → ordem simulada; produção sem token → erro. */
export async function createPixOrder(env: Env, params: PixOrderParams): Promise<PixOrderResult> {
  const token = env.PAGBANK_TOKEN || '';
  const environment = (env.PAGBANK_ENV || 'sandbox').toLowerCase();
  const apiBaseUrl = environment === 'production' ? 'https://api.pagseguro.com' : 'https://sandbox.api.pagseguro.com';

  if (token && !token.startsWith('mock_')) {
    try {
      const response = await fetch(`${apiBaseUrl}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          reference_id: params.referenceId,
          customer: { name: params.payer.name || 'Condutor DefesAi', email: params.payer.email || 'contato@defesai.shop', tax_id: params.payer.document },
          items: [{ reference_id: `service_${params.caseId}`, name: params.description || 'Minuta Jurídica Formal — DefesAi', quantity: 1, unit_amount: params.amountInCents }],
          qr_codes: [{ amount: { value: params.amountInCents }, expiration_date: new Date(Date.now() + 30 * 60 * 1000).toISOString() }],
          notification_urls: [params.webhookUrl],
        }),
      });
      const data: any = await response.json();
      if (data.id && data.qr_codes?.[0]) {
        const qr = data.qr_codes[0];
        return { orderId: data.id, gatewayTransactionId: data.id, qrCodeText: qr.text, qrCodeUrl: qr.links?.[0]?.href, pixCopyPaste: qr.text, status: 'aguardando_pagamento', simulated: false };
      }
      throw new Error(`PagBank API sem dados de QR: ${JSON.stringify(data).slice(0, 200)}`);
    } catch (err: any) {
      if (isProductionMode(env)) throw new Error('Falha ao criar ordem PIX no PagBank. Tente novamente.');
      return simulatedOrder(params);
    }
  }

  if (!token && isProductionMode(env)) throw new Error('PAGBANK_TOKEN não configurado. Pagamento indisponível em produção.');
  return simulatedOrder(params);
}

function simulatedOrder(params: PixOrderParams): PixOrderResult {
  const txId = `minuta_${Date.now().toString(36)}`;
  const fakePix = `00020126580014br.gov.bcb.pix0136defesai-sandbox-${txId}520400005303986540${params.amountInCents}5802BR5914DEFESAI6009SAO PAULO62070503***6304ABCD`;
  return { gatewayTransactionId: txId, qrCodeText: fakePix, pixCopyPaste: fakePix, status: 'aguardando_pagamento', simulated: true, orderId: `sim_${txId}` };
}

export interface PagBankWebhookPayload {
  id?: string;
  reference_id?: string;
  charges?: Array<{ status?: string; reference_id?: string; payment_method?: { type?: string } }>;
}

export interface WebhookProcessResult {
  received: boolean;
  orderId?: string;
  caseId?: string;
  status?: string;
  isDuplicate: boolean;
  signatureValid: boolean;
}

/**
 * PagBank Order API: x-authenticity-token = SHA-256(`${accountToken}-${rawPayload}`).
 * O payload deve ser exatamente o corpo bruto recebido.
 */
export async function verifyWebhookSignature(env: Env, rawBody: string, signatureHeader: string | null): Promise<boolean> {
  const token = env.PAGBANK_WEBHOOK_SECRET || env.PAGBANK_TOKEN || '';
  if (!token) return !isProductionMode(env);
  if (!signatureHeader) return false;

  const received = signatureHeader.trim().toLowerCase().replace(/^sha256=/, '');
  if (!/^[0-9a-f]{64}$/.test(received)) return false;

  const expected = await sha256Hex(`${token}-${rawBody}`);
  if (expected.length !== received.length) return false;
  const a = enc.encode(expected);
  const b = enc.encode(received);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Legacy helper; authoritative webhook idempotency lives in Supabase in routes/payments.ts. */
export async function processPagBankWebhook(
  env: Env,
  rawBody: string,
  signatureHeader: string | null,
  payload: PagBankWebhookPayload,
  processedIds: Set<string>,
): Promise<WebhookProcessResult> {
  const signatureValid = await verifyWebhookSignature(env, rawBody, signatureHeader);
  if (!signatureValid) return { received: false, isDuplicate: false, signatureValid: false };
  const webhookEventId = payload.id || `wh_${Date.now()}`;
  if (processedIds.has(webhookEventId)) return { received: true, orderId: payload.id, isDuplicate: true, signatureValid: true };
  processedIds.add(webhookEventId);
  const firstCharge = payload.charges?.[0];
  const referenceId = payload.reference_id || firstCharge?.reference_id || '';
  return {
    received: true,
    orderId: payload.id,
    caseId: firstCharge?.status === 'PAID' ? extractCaseId(referenceId) : undefined,
    status: firstCharge?.status || 'RECEIVED',
    isDuplicate: false,
    signatureValid: true,
  };
}

function extractCaseId(referenceId: string): string | undefined {
  const m = referenceId.match(/^defesai_case_(.+)$/);
  return (m && m[1]) || (referenceId.startsWith('case_') || /^[0-9a-f-]{36}$/i.test(referenceId) ? referenceId : undefined);
}

export interface CreditCardOrderParams {
  caseId: string;
  referenceId: string;
  customer: { name: string; email: string; taxId: string };
  amount: number;
  installments?: number;
  cardToken: string;
  authenticationMethod?: 'CHALLENGE' | 'FRICTIONLESS';
  softDescriptor?: string;
  webhookUrl?: string;
}

export interface CreditCardOrderResult {
  orderId: string;
  referenceId: string;
  caseId: string;
  status: string;
  amount: number;
  threeDsChallengeRequired: boolean;
  simulated: boolean;
}

export async function createCreditCardOrder(env: Env, params: CreditCardOrderParams): Promise<CreditCardOrderResult> {
  const token = env.PAGBANK_TOKEN || '';
  const environment = (env.PAGBANK_ENV || 'sandbox').toLowerCase();
  const apiBaseUrl = environment === 'production' ? 'https://api.pagseguro.com' : 'https://sandbox.api.pagseguro.com';
  const cleanCpf = (params.customer.taxId || '').replace(/\D/g, '') || '12345678909';
  const amountInCents = Math.round(params.amount * 100);
  const referenceId = params.referenceId || `defesai_case_${params.caseId}_cc_${Date.now()}`;
  const base: CreditCardOrderResult = {
    orderId: `ORDE_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
    referenceId,
    caseId: params.caseId,
    status: 'WAITING',
    amount: params.amount,
    threeDsChallengeRequired: (params.authenticationMethod || 'CHALLENGE') === 'CHALLENGE',
    simulated: false,
  };

  if (token && !token.startsWith('mock_')) {
    try {
      const response = await fetch(`${apiBaseUrl}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          reference_id: referenceId,
          customer: { name: params.customer.name || 'Condutor DefesAi', email: params.customer.email || 'contato@defesai.shop', tax_id: cleanCpf },
          items: [{ reference_id: `service_${params.caseId}`, name: 'Minuta Jurídica Formal — Recurso de Trânsito DefesAi', quantity: 1, unit_amount: amountInCents }],
          payment_method: { type: 'CREDIT_CARD', installments: params.installments || 1, card: { token: params.cardToken }, authentication_method: params.authenticationMethod || 'CHALLENGE', soft_descriptor: params.softDescriptor || 'DEFAI*RECURSO' },
          notification_urls: params.webhookUrl ? [params.webhookUrl] : [],
        }),
      });
      const data: any = await response.json();
      if (!response.ok) throw new Error(data?.error?.code ? `Erro PagBank (${data.error.code})` : 'Erro ao processar pagamento com cartão de crédito');
      if (data.id) base.orderId = data.id;
      return base;
    } catch (err: any) {
      if (isProductionMode(env)) throw new Error(err.message || 'Falha ao criar ordem de cartão no PagBank.');
      return { ...base, simulated: true, status: 'WAITING' };
    }
  }
  if (!token && isProductionMode(env)) throw new Error('PAGBANK_TOKEN não configurado. Pagamento indisponível em produção.');
  return { ...base, simulated: true, status: 'WAITING' };
}
