import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Env } from '../supabase';
import { createSupabaseAdminClient, createSupabaseUserClient } from '../supabase';
import { authenticateToken, requireAdmin, type AuthenticatedUser } from '../middleware';
import { rowToDomain, domainToRow } from '../canonical-mapper';
import { createPixOrder, createCreditCardOrder, verifyWebhookSignature, type PagBankWebhookPayload } from '../pagbank';
import { resolveOffer } from './commercial';
import type { NormalizedWebhookEvent } from '../../src/server/integrations/gateway/types';
import { createVenoCashIn, getVenoCashInStatus, verifyVenoWebhook } from '../venopag';

const routes = new Hono<{ Bindings: Env; Variables: { user?: AuthenticatedUser } }>();

async function resolveCommercialOffer(env: Env, serviceType: string, couponCode?: string, userId?: string) {
  // Reutiliza o serviço de domínio diretamente. A rota HTTP /offers/resolve
  // continua autenticada; não simulamos uma requisição interna sem Bearer token.
  const result = await resolveOffer(env, { serviceType, couponCode, userId });
  if (!result.offer) throw new HTTPException(404, { message: result.reason || 'Oferta comercial indisponível.' });
  return result.offer;
}

async function assertCaseCanBePaid(env: Env, caseId: string, user: AuthenticatedUser, requestedServiceType: string): Promise<void> {
  const supabase = createSupabaseAdminClient(env);
  const { data: row, error } = await supabase.from('cases')
    .select('id,user_id,is_paid,service_type')
    .eq('id', caseId)
    .maybeSingle();
  if (error) throw new HTTPException(503, { message: 'Não foi possível validar o titular do caso.' });
  if (!row) throw new HTTPException(404, { message: 'Caso não encontrado.' });
  if (user.role !== 'admin' && row.user_id !== user.id) {
    throw new HTTPException(403, { message: 'Você não tem permissão para pagar este caso.' });
  }
  if (typeof row.service_type !== 'string' || row.service_type !== requestedServiceType) {
    throw new HTTPException(409, { message: 'O serviço solicitado não corresponde ao procedimento salvo no caso. Atualize o checkout antes de continuar.' });
  }
  if (row.is_paid === true) {
    throw new HTTPException(409, { message: 'Este caso já está marcado como pago.' });
  }
}

async function persistOrder(env: Env, input: { caseId: string; userId?: string; referenceId: string; serviceType?: string; gatewayOrderId?: string; gatewayTransactionId: string; amount: number; baseAmount?: number; discountAmount?: number; couponCode?: string; status: string; gateway: string; paymentMethod?: string; qrCodeText?: string; qrCodeUrl?: string }) {
  const supabase = createSupabaseAdminClient(env);
  const now = new Date().toISOString();
  const finalAmount = Number(input.amount);
  const baseAmount = Number(input.baseAmount ?? finalAmount);
  const discountAmount = Number(input.discountAmount ?? Math.max(0, baseAmount - finalAmount));
  const { data, error } = await supabase.from('payment_orders').insert({
    case_id: input.caseId, user_id: input.userId ?? null, reference_id: input.referenceId,
    pagbank_order_id: input.gatewayOrderId ?? null, gateway_transaction_id: input.gatewayTransactionId,
    status: input.status, amount: finalAmount, currency: 'BRL', payment_method: input.paymentMethod ?? 'pix',
    qr_code_text: input.qrCodeText ?? null, qr_code_url: input.qrCodeUrl ?? null, base_amount: baseAmount,
    discount_amount: discountAmount, discount_type: discountAmount > 0 ? 'commercial' : null,
    coupon_code: input.couponCode ?? null, bonus_used_amount: 0, final_amount: finalAmount,
    gateway: input.gateway, created_at: now, updated_at: now,
  }).select('*').single();
  if (error) throw error;
  return data;
}

/* ------------------------------------------------------------------ */
/*  Idempotência atômica de criação de cobrança PIX                    */
/*                                                                     */
/*  payment_orders tem UNIQUE(case_id), que usamos como guarda de      */
/*  serialização: o vencedor do INSERT reserva o caso e é o único a    */
/*  chamar o gateway. O perdedor reutiliza a linha do vencedor (não    */
/*  gera segunda cobrança).                                            */
/* ------------------------------------------------------------------ */

interface ReserveOrderInput {
  caseId: string;
  userId: string;
  referenceId: string;
  gateway: string;
  amount: number;
  baseAmount?: number;
  discountAmount?: number;
  couponCode?: string;
  gatewayOrderId?: string;
  qrCodeText?: string;
  qrCodeUrl?: string;
}

interface ReserveOrderResult {
  order: any;
  reused: boolean;
  /** Quando true, o chamador é o dono da reserva e deve criar a cobrança
   *  no gateway e, em seguida, atualizar a linha com os dados do gateway.
   *  Em falha do gateway, deve remover a reserva (deleteReservation).     */
  ownsReservation: boolean;
}

async function reserveOrFindPendingOrder(
  env: Env,
  input: ReserveOrderInput,
): Promise<ReserveOrderResult> {
  const supabase = createSupabaseAdminClient(env);
  const now = new Date().toISOString();
  const finalAmount = Number(input.amount);

  // Fast path: cobrança PENDING já criada e com dados do gateway → reutiliza.
  const { data: existing } = await supabase.from('payment_orders')
    .select('*')
    .eq('case_id', input.caseId)
    .eq('user_id', input.userId)
    .eq('payment_method', 'pix')
    .eq('gateway', 'venopag')
    .eq('status', 'PENDING')
    .maybeSingle();
  // Log reserved status without exposing sensitive data; avoid logging amounts or gateway tx IDs.

  // Fast path: cobrança PENDING já criada e com dados do gateway → reutiliza,
  // nunca gera segunda cobrança.
  if (existing?.gateway === input.gateway && existing.gateway_transaction_id && Number(existing.amount) === finalAmount) {
    return { order: existing, reused: true, ownsReservation: false };
  }

  // Reivindica o caso de forma atômica. UNIQUE(case_id) serializa o INSERT:
  // apenas um request vence; os outros recebem 23505 e reutilizam o vencedor.
  const insertPayload: Record<string, unknown> = {
    case_id: input.caseId, user_id: input.userId, reference_id: input.referenceId,
    status: 'PENDING', gateway: input.gateway, payment_method: 'pix',
    amount: finalAmount,
    base_amount: Number(input.baseAmount ?? finalAmount),
    final_amount: finalAmount, currency: 'BRL',
    discount_amount: Number(input.discountAmount ?? 0),
    discount_type: Number(input.discountAmount ?? 0) > 0 ? 'commercial' : null,
    coupon_code: input.couponCode ?? null,
    created_at: now, updated_at: now,
  };
  if (input.gatewayOrderId) insertPayload.pagbank_order_id = input.gatewayOrderId;
  if (input.qrCodeText) insertPayload.qr_code_text = input.qrCodeText;
  if (input.qrCodeUrl) insertPayload.qr_code_url = input.qrCodeUrl;

  const { data: reserved, error: insertError } = await supabase.from('payment_orders')
    .insert(insertPayload).select().single();

  if (insertError) {
    if (String(insertError.code) === '23505') {
      const { data: winner } = await supabase.from('payment_orders')
        .select('*').eq('case_id', input.caseId).maybeSingle();
      if (winner?.gateway === input.gateway && winner.gateway_transaction_id && Number(winner.amount) === finalAmount && winner.status === 'PENDING') {
        return { order: winner, reused: true, ownsReservation: false };
      }
      // UNIQUE(case_id) impede criar outra ordem. Se a ordem existente é terminal,
      // não gere nova cobrança às cegas: o gateway pode liquidar uma transação antiga.
      const terminalStatus = String(winner?.status || '').toUpperCase();
      if (winner && ['CANCELED', 'CANCELLED', 'EXPIRED', 'FAILED', 'REFUNDED', 'CHARGEBACK'].includes(terminalStatus)) {
        throw new HTTPException(409, { message: 'A cobrança anterior está em estado terminal. Confirme a reconciliação com o gateway antes de liberar nova tentativa; nenhuma cobrança duplicada foi criada.' });
      }
      throw new HTTPException(409, { message: 'Cobrança já está sendo processada para este caso. Tente novamente em instantes.' });
    }
    throw insertError;
  }

  return { order: reserved, reused: false, ownsReservation: true };
}

async function deleteReservation(env: Env, caseId: string): Promise<void> {
  const supabase = createSupabaseAdminClient(env);
  await supabase.from('payment_orders').delete().eq('case_id', caseId).eq('status', 'PENDING').is('gateway_transaction_id', null);
}

/* ------------------------------------------------------------------ */
/*  Atualização da linha já reservada (ownsReservation = true)         */
/*                                                                     */
/*  Após o gateway responder, atualiza a linha PENDING já inserida     */
/*  por reserveOrFindPendingOrder com os dados da cobrança (txId, QR,  */
/*  etc.). Nunca faz INSERT novo, pois UNIQUE(case_id) já foi usado.   */
/* ------------------------------------------------------------------ */

interface UpdateReservedOrderInput {
  gatewayTransactionId?: string;
  gatewayOrderId?: string;
  qrCodeText?: string;
  qrCodeUrl?: string;
  status?: string;
  amount?: number;
  baseAmount?: number;
  discountAmount?: number;
  couponCode?: string;
  gateway?: string;
  paymentMethod?: string;
}

async function updateReservedOrder(
  env: Env,
  paymentId: string,
  input: UpdateReservedOrderInput,
): Promise<any> {
  const supabase = createSupabaseAdminClient(env);
  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = { updated_at: now };
  if (input.gatewayTransactionId !== undefined) updatePayload.gateway_transaction_id = input.gatewayTransactionId;
  if (input.gatewayOrderId !== undefined) updatePayload.pagbank_order_id = input.gatewayOrderId;
  if (input.qrCodeText !== undefined) updatePayload.qr_code_text = input.qrCodeText;
  if (input.qrCodeUrl !== undefined) updatePayload.qr_code_url = input.qrCodeUrl;
  if (input.status !== undefined) updatePayload.status = input.status;
  if (input.amount !== undefined) updatePayload.amount = Number(input.amount);
  if (input.baseAmount !== undefined) updatePayload.base_amount = Number(input.baseAmount);
  if (input.discountAmount !== undefined) updatePayload.discount_amount = Number(input.discountAmount);
  if (input.couponCode !== undefined) updatePayload.coupon_code = input.couponCode;
  if (input.gateway !== undefined) updatePayload.gateway = input.gateway;
  if (input.paymentMethod !== undefined) updatePayload.payment_method = input.paymentMethod;

  // Atualiza e retorna a mesma linha em uma única operação Supabase.
  // A ordem correta da API é update(payload) -> eq(filtro) -> select -> single.
  // A leitura separada anterior começava com eq() sem chamar from().select(),
  // gerando erro em runtime e deixando o checkout sem confirmar a reserva.
  const { data, error } = await supabase.from('payment_orders')
    .update(updatePayload)
    .eq('id', paymentId)
    .select('*')
    .single();
  if (error) throw error;
  if (!data) throw new Error('A reserva de pagamento não foi encontrada após a atualização.');
  return data;
}

/* ------------------------------------------------------------------ */
/*  Deduplicação durável de webhooks (tabela webhook_events)           */
/*                                                                     */
/*  Todo evento verificado é inserido em webhook_events ANTES de       */
/*  qualquer efeito colateral. Sobre crash/retry, o evento permanece   */
/*  recuperável; a mesma event_id nunca é processada duas vezes.       */
/* ------------------------------------------------------------------ */

interface WebhookAcceptResult {
  isDuplicate: boolean;
  alreadyProcessed: boolean;
}

async function acceptWebhookEvent(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  provider: 'pagbank' | 'venopag' | 'ggpixapi',
  eventId: string,
  payload: unknown,
): Promise<WebhookAcceptResult> {
  const { error } = await supabase.from('webhook_events').insert({
    event_id: eventId, provider, payload, status: 'received',
  });
  if (error) {
    if (String(error.code) === '23505') {
      const { data: existing } = await supabase.from('webhook_events')
        .select('status').eq('event_id', eventId).maybeSingle();
      return {
        isDuplicate: true,
        alreadyProcessed: String(existing?.status) === 'processed',
      };
    }
    throw error;
  }
  return { isDuplicate: false, alreadyProcessed: false };
}

async function markWebhookEventProcessed(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  eventId: string,
): Promise<void> {
  await supabase.from('webhook_events')
    .update({ status: 'processed', processed_at: new Date().toISOString() })
    .eq('event_id', eventId);
}

async function registerReferralFromCode(env: Env, buyerUserId: string, rawCode?: unknown) {
  const code = typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : '';
  if (!/^[A-Z0-9_-]{1,120}$/.test(code)) return;
  const supabase = createSupabaseAdminClient(env);
  const { data: referrer, error: referrerError } = await supabase
    .from('user_profiles')
    .select('user_id,referral_code')
    .ilike('referral_code', code)
    .limit(1)
    .maybeSingle();
  if (referrerError) throw referrerError;
  if (!referrer?.user_id || String(referrer.user_id) === buyerUserId) return;

  const { data: existing, error: existingError } = await supabase
    .from('referral_relations')
    .select('id,referrer_id')
    .eq('referred_id', buyerUserId)
    .eq('level', 1)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return;

  const { error: insertError } = await supabase.from('referral_relations').insert({
    referrer_id: referrer.user_id,
    referred_id: buyerUserId,
    level: 1,
    status: 'active',
  });
  if (insertError && insertError.code !== '23505') throw insertError;
}

async function resolveVenoAffiliateSplits(env: Env, buyerUserId: string): Promise<Array<{ userId: string; level: number; username: string; percentage: number }>> {
  const supabase = createSupabaseAdminClient(env);
  const chain: Array<{ userId: string; level: number }> = [];
  const seen = new Set<string>([buyerUserId]);
  let currentBuyerId = buyerUserId;

  for (let level = 1; level <= 3; level++) {
    const { data: relation, error } = await supabase
      .from('referral_relations')
      .select('referrer_id,status')
      .eq('referred_id', currentBuyerId)
      .eq('level', 1)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    const referrerId = String(relation?.referrer_id || '');
    if (!referrerId || seen.has(referrerId)) break;
    seen.add(referrerId);
    chain.push({ userId: referrerId, level });
    currentBuyerId = referrerId;
  }

  if (!chain.length) return [];
  const affiliateIds = chain.map((item) => item.userId);
  const { data: profiles, error: profileError } = await supabase
    .from('affiliate_gateway_profiles')
    .select('user_id,venopag_username,split_percent,is_active')
    .in('user_id', affiliateIds)
    .eq('is_active', true);
  if (profileError) throw profileError;

  const levelByUser = new Map(chain.map((item) => [item.userId, item.level]));
  const splits = (profiles || []).map((profile: any) => ({
    userId: String(profile.user_id),
    username: String(profile.venopag_username || '').trim(),
    percentage: Number(profile.split_percent) || 0,
    level: levelByUser.get(String(profile.user_id)) || 1,
  })).filter((split: any) => split.username && split.percentage > 0)
    .sort((a: any, b: any) => a.level - b.level);
  const totalPercent = splits.reduce((sum: number, split: any) => sum + split.percentage, 0);
  if (totalPercent > 100) {
    throw new HTTPException(409, { message: 'A soma dos splits de afiliados ativos ultrapassa 100%. Ajuste os percentuais antes de gerar a cobrança.' });
  }
  return splits;
}

routes.get('/payments/resolve-price', authenticateToken, async (c) => {
  try {
    const serviceType = c.req.query('serviceType');
    if (!serviceType) throw new HTTPException(400, { message: 'serviceType é obrigatório.' });
    const user = c.get('user')!;
    const offer = await resolveCommercialOffer(c.env, serviceType, c.req.query('couponCode'), user.id);
    return c.json({ ok: true, ...offer });
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    console.error('[payments] resolve-price', error);
    return c.json({ ok: false, error: 'Não foi possível resolver o preço.' }, 502);
  }
});

routes.get('/payments/gateway/status', (c) => {
  // VenoPag é o único gateway habilitado para novas cobranças neste ciclo.
  // Configuração residual de PagBank não deve aparecer como gateway ativo.
  const gateway = 'venopag';
  const configured = (!c.env.VENO_PRIMARY_GATEWAY || c.env.VENO_PRIMARY_GATEWAY === 'venopag')
    && Boolean(c.env.VENO_CLIENT_ID && c.env.VENO_CLIENT_SECRET && c.env.VENO_WEBHOOK_SECRET);
  return c.json({
    ok: configured,
    configured,
    gateway,
    environment: 'production',
    simulated: false,
    // Expose admin testing only when the environment explicitly opts into sandbox.
    testMode: String(c.env.PAYMENT_MODE || '').toLowerCase() === 'sandbox',
  }, configured ? 200 : 503);
});

routes.post('/payments/coupon/redeem-free', authenticateToken, async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json<{ caseId?: string; serviceType?: string; couponCode?: string }>().catch(() => ({} as { caseId?: string; serviceType?: string; couponCode?: string }));
  const caseId = String(body.caseId || '').trim();
  const serviceType = String(body.serviceType || '').trim();
  const couponCode = String(body.couponCode || '').trim().toUpperCase();
  if (!caseId || !serviceType || !couponCode) {
    throw new HTTPException(400, { message: 'Caso, serviço e cupom são obrigatórios.' });
  }
  await assertCaseCanBePaid(c.env, caseId, user, serviceType);
  const offer = await resolveCommercialOffer(c.env, serviceType, couponCode, user.id);
  if (Number(offer.finalAmount) !== 0 || Number(offer.couponDiscount) < Number(offer.baseAmount) - Number(offer.promotionDiscount) - Number(offer.firstDocumentsDiscount)) {
    throw new HTTPException(422, { message: 'O cupom não concede 100% de desconto neste caso. Nenhuma cobrança ou liberação foi criada.' });
  }

  const supabase = createSupabaseAdminClient(c.env);
  const { data: coupon, error: couponError } = await supabase.from('coupons').select('*').eq('code', couponCode).maybeSingle();
  if (couponError) throw new HTTPException(503, { message: 'Não foi possível validar o cupom.' });
  if (!coupon || coupon.is_active !== true) throw new HTTPException(422, { message: 'Cupom inválido ou desativado.' });
  const now = Date.now();
  if ((coupon.valid_from && new Date(coupon.valid_from).getTime() > now) || (coupon.valid_until && new Date(coupon.valid_until).getTime() < now)) {
    throw new HTTPException(422, { message: 'Cupom fora do período de validade.' });
  }
  const applicable = Array.isArray(coupon.applicable_services) ? coupon.applicable_services : [];
  if (applicable.length && !applicable.includes('all') && !applicable.includes(offer.serviceType)) {
    throw new HTTPException(422, { message: 'Cupom não aplicável a este serviço.' });
  }
  const preCouponAmount = Number(offer.baseAmount) - Number(offer.promotionDiscount || 0) - Number(offer.firstDocumentsDiscount || 0);
  if (Number(offer.finalAmount) !== 0 || Number(offer.couponDiscount) < preCouponAmount) {
    throw new HTTPException(422, { message: 'O cupom não concede 100% de desconto neste caso. Nenhuma cobrança foi criada.' });
  }

  const { data: redemption, error: redemptionError } = await supabase.rpc('redeem_free_coupon', {
    p_case_id: caseId,
    p_user_id: user.id,
    p_coupon_code: couponCode,
    p_service_type: offer.serviceType,
    p_base_amount: Number(offer.baseAmount),
    p_pre_coupon_amount: preCouponAmount,
    p_coupon_discount: Number(offer.couponDiscount),
  });
  if (redemptionError) {
    const message = String(redemptionError.message || '');
    if (/limite|validade|inválido|não aplicável|titularidade|100%|liberado/i.test(message)) {
      throw new HTTPException(409, { message });
    }
    if (redemptionError.code === '23505') throw new HTTPException(409, { message: 'Este caso já possui um pedido ou benefício registrado.' });
    console.error('[payments] free coupon redemption failed', redemptionError.code || 'unknown');
    throw new HTTPException(503, { message: 'Não foi possível registrar o benefício gratuito.' });
  }
  return c.json(redemption);

});

routes.post('/payments/pix/create', authenticateToken, async (c) => {
  if (c.env?.E2E_SAFE_PREVIEW === 'true') throw new HTTPException(503, { message: 'Cobranças estão desativadas no preview de testes. Nenhuma transação foi enviada à VenoPag.' });
  const user = c.get('user')!;
  const body = await c.req.json<any>().catch(() => ({}));
  if (!body.serviceType) throw new HTTPException(400, { message: 'serviceType é obrigatório.' });
  const caseId = String(body.caseId || '');
  if (!caseId) throw new HTTPException(400, { message: 'caseId é obrigatório.' });
  await assertCaseCanBePaid(c.env, caseId, user, String(body.serviceType));
  const ipAddress = c.req.header('cf-connecting-ip');
  const limiter = c.env.ANONYMOUS_CASE_LIMITER;
  if (!ipAddress || !limiter) {
    throw new HTTPException(503, { message: 'Criação de cobrança temporariamente indisponível.' });
  }
  const { success } = await limiter.limit({ key: `pay:pix:${user.id}:${ipAddress}` });
  if (!success) {
    c.header('Retry-After', '60');
    throw new HTTPException(429, { message: 'Limite temporário de criação de cobrança atingido.' });
  }
  const offer = await resolveCommercialOffer(c.env, body.serviceType, body.couponCode, user.id);
  const referenceId = `defesai_case_${caseId}`;
  // Idempotência: a tela de checkout pode remontar após alteração de campos,
  // recarregamento ou retomada do caso. Nunca crie uma segunda cobrança PIX
  // enquanto já existir uma cobrança pendente para o mesmo caso/usuário.
  const admin = createSupabaseAdminClient(c.env);
  const { data: existingOrder } = await admin
    .from('payment_orders')
    .select('*')
    .eq('case_id', caseId)
    .eq('user_id', user.id)
    .eq('payment_method', 'pix')
    .eq('gateway', 'venopag')
    .eq('status', 'PENDING')
    .maybeSingle();
  if (existingOrder?.gateway === 'venopag' && existingOrder.gateway_transaction_id && Number(existingOrder.amount) === Number(offer.finalAmount)) {
    return c.json({
      success: true,
      paymentOrder: existingOrder,
      pixCopyPasteString: existingOrder.qr_code_text,
      qrCodeDataUrl: existingOrder.qr_code_url?.startsWith('data:') ? existingOrder.qr_code_url : undefined,
      qrCodeUrl: existingOrder.qr_code_url,
      txId: existingOrder.gateway_transaction_id,
      amount: existingOrder.amount,
      serviceType: body.serviceType,
      status: existingOrder.status,
      gateway: existingOrder.gateway,
      simulated: false,
      reused: true,
    });
  }
  const primaryGateway = c.env.VENO_PRIMARY_GATEWAY || 'venopag';
  if (primaryGateway !== 'venopag') {
    throw new HTTPException(503, { message: 'Este ambiente está configurado para priorizar VenoPag. PagBank permanece desativado para novas cobranças.' });
  }
  if (!c.env.VENO_CLIENT_ID || !c.env.VENO_CLIENT_SECRET || !c.env.VENO_WEBHOOK_SECRET) {
    throw new HTTPException(503, { message: 'Pagamento VenoPag temporariamente indisponível: credenciais não configuradas.' });
  }
  const payer = { name: body.customerName || 'Condutor DefesAi', email: body.customerEmail || user.email || 'contato@defesai.shop', document: String(body.customerCpf || '').replace(/\D/g, '') };
  if (![11, 14].includes(payer.document.length)) {
    throw new HTTPException(400, { message: 'Informe um CPF ou CNPJ válido para gerar o PIX VenoPag.' });
  }
  const finalAmount = Number(offer.finalAmount);

  const reserved = await reserveOrFindPendingOrder(c.env, {
    caseId, userId: user.id, referenceId, gateway: primaryGateway,
    amount: finalAmount, baseAmount: Number(offer.baseAmount),
    discountAmount: Number(offer.baseAmount) - finalAmount, couponCode: body.couponCode,
  });
  if (reserved.reused) {
    const order = reserved.order;
    return c.json({
      success: true, paymentOrder: order,
      pixCopyPasteString: order.qr_code_text,
      qrCodeDataUrl: order.qr_code_url?.startsWith('data:') ? order.qr_code_url : undefined,
      qrCodeUrl: order.qr_code_url,
      txId: order.gateway_transaction_id,
      amount: order.amount, serviceType: body.serviceType, status: order.status,
      gateway: order.gateway, simulated: false, reused: true,
    });
  }

  let providerRequestStarted = false;
  let venoOrder;
  let affiliateSplits: Array<{ userId: string; level: number; username: string; percentage: number }> = [];
  let record: any;
  try {
    if (primaryGateway === 'venopag') {
      if (!c.env.VENO_CLIENT_ID || !c.env.VENO_CLIENT_SECRET || !c.env.VENO_WEBHOOK_SECRET) {
        throw new HTTPException(503, { message: 'Pagamento temporariamente indisponível. Tente novamente mais tarde.' });
      }
      await registerReferralFromCode(c.env, user.id, body.referralCode);
      affiliateSplits = await resolveVenoAffiliateSplits(c.env, user.id);
      providerRequestStarted = true;
      venoOrder = await createVenoCashIn(c.env, {
        amountInCents: Math.round(finalAmount * 100),
        payerName: payer.name,
        payerDocument: payer.document,
        description: `DefesAi - ${offer.name}`,
        webhookUrl: `${c.env.APP_URL || 'https://adeusmulta.defesai.com.br'}/api/webhooks/venopag`,
        splits: affiliateSplits.map(({ username, percentage }) => ({ username, percentage })),
      });
      if (venoOrder.status !== 'pending' || Math.round(venoOrder.amount * 100) !== Math.round(finalAmount * 100)) {
        throw new Error('Resposta inesperada do provedor.');
      }
      const qrCodeDataUrl = venoOrder.qr_img
        ? `data:image/png;base64,${venoOrder.qr_img}`
        : venoOrder.qr_url;
      record = await updateReservedOrder(c.env, reserved.order.id, {
        gatewayTransactionId: venoOrder.request_number,
        qrCodeText: venoOrder.copyPaste,
        qrCodeUrl: venoOrder.qr_url,
        status: 'PENDING',
        gateway: 'venopag',
        paymentMethod: 'pix',
        amount: finalAmount,
        baseAmount: Number(offer.baseAmount),
        discountAmount: Number(offer.baseAmount) - finalAmount,
        couponCode: body.couponCode,
      });
      if (affiliateSplits.length) {
        const now = new Date().toISOString();
        const ledgerRows = affiliateSplits.map((split) => ({
          payment_id: record.id,
          case_id: caseId,
          beneficiary_id: split.userId,
          buyer_user_id: user.id,
          level: split.level,
          applied_percent: split.percentage,
          base_amount: finalAmount,
          commission_amount: Number((finalAmount * split.percentage / 100).toFixed(2)),
          status: 'PENDING',
          created_at: now,
        }));
        const { error: ledgerError } = await createSupabaseAdminClient(c.env)
          .from('commission_ledger')
          .upsert(ledgerRows, { onConflict: 'payment_id,beneficiary_id,level', ignoreDuplicates: true });
        if (ledgerError) {
          console.error('[payments] affiliate commission ledger reconciliation required', { paymentOrderId: record.id, detail: ledgerError.message });
        }
      }
      return c.json({
        success: true, order: venoOrder, paymentOrder: record,
        pixCopyPasteString: venoOrder.copyPaste, qrCodeDataUrl,
        qrCodeUrl: venoOrder.qr_url,
        txId: venoOrder.request_number, amount: offer.finalAmount,
        serviceType: offer.serviceType, status: 'PENDING', gateway: 'venopag', simulated: false,
      });
    }
    if (!c.env.PAGBANK_TOKEN) throw new HTTPException(503, { message: 'Pagamento temporariamente indisponível. Tente novamente mais tarde.' });
    providerRequestStarted = true;
    const order = await createPixOrder(c.env as any, { caseId, referenceId, payer, amountInCents: Math.round(finalAmount * 100), description: `DefesAi - ${offer.name}`, webhookUrl: `${(c.env as any).APP_URL || 'https://adeusmulta.defesai.com.br'}/api/webhooks/pagbank` });
    if (order.simulated) throw new HTTPException(503, { message: 'Pagamento simulado não é aceito neste ambiente.' });
    record = await updateReservedOrder(c.env, reserved.order.id, {
      gatewayOrderId: order.orderId,
      gatewayTransactionId: order.gatewayTransactionId,
      qrCodeText: order.pixCopyPaste || order.qrCodeText,
      qrCodeUrl: order.qrCodeUrl,
      status: order.status,
      gateway: 'pagbank',
      paymentMethod: 'pix',
      amount: finalAmount,
      baseAmount: Number(offer.baseAmount),
      discountAmount: Number(offer.baseAmount) - finalAmount,
      couponCode: body.couponCode,
    });
    return c.json({ success: true, order, paymentOrder: record, pixCopyPasteString: order.pixCopyPaste, qrCodeDataUrl: order.qrCodeUrl || undefined, txId: order.gatewayTransactionId, amount: offer.finalAmount, serviceType: offer.serviceType, status: order.status, gateway: 'pagbank', simulated: order.simulated });
  } catch (error) {
    // Uma falha de rede após iniciar a chamada ao provedor é ambígua: a cobrança
    // pode ter sido criada. Preserve a reserva para reconciliação e evite duplicidade.
    if (reserved.ownsReservation && !providerRequestStarted) {
      await deleteReservation(c.env, caseId).catch(() => {});
    }
    throw error;
  }
});

routes.post('/payments/simulate-payment', authenticateToken, requireAdmin, async (c) => {
  // Fail closed: payment bypass exists only in an explicitly configured sandbox.
  if (String(c.env.PAYMENT_MODE || '').toLowerCase() !== 'sandbox') {
    throw new HTTPException(501, {
      message: 'Endpoint de simulação não disponível fora do ambiente sandbox.',
    });
  }

  const body = await c.req.json<any>().catch(() => ({}));
  const caseId = typeof body.caseId === 'string' ? body.caseId.trim() : '';
  if (!caseId) throw new HTTPException(400, { message: 'caseId é obrigatório para simulação de pagamento.' });
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HTTPException(400, { message: 'Valor de simulação inválido.' });
  }

  const supabase = createSupabaseAdminClient(c.env);
  const { data: row, error: readError } = await supabase.from('cases').select('*').eq('id', caseId).maybeSingle();
  if (readError) throw new HTTPException(500, { message: 'Não foi possível consultar o caso para simulação.' });
  if (!row) throw new HTTPException(404, { message: 'Caso não encontrado para simulação.' });

  const domain = rowToDomain(row);
  if (domain.isPaid) {
    return c.json({ success: true, simulated: true, alreadyPaid: true, case: domain });
  }

  const now = new Date().toISOString();
  domain.isPaid = true;
  domain.paidAt = now;
  domain.status = 'defesa_pronta';
  domain.currentStage = 3;
  domain.timeline = [
    ...(domain.timeline || []),
    {
      id: 'tl_sim_' + Date.now(),
      title: 'Pagamento aprovado em modo de teste',
      description: 'Simulação administrativa de R$ ' + amount.toFixed(2).replace('.', ',') + '; nenhuma cobrança foi enviada a um gateway.',
      timestamp: now,
      type: 'payment',
    },
  ];

  const updatedRow = domainToRow(domain);
  const { error: updateError } = await supabase.from('cases').update(updatedRow).eq('id', caseId);
  if (updateError) throw new HTTPException(500, { message: 'Não foi possível persistir o pagamento simulado.' });

  return c.json({ success: true, simulated: true, case: domain });
});

routes.post('/payments/credit-card/create', authenticateToken, async (c) => {
  if (c.env?.E2E_SAFE_PREVIEW === 'true') throw new HTTPException(503, { message: 'Cobranças estão desativadas no preview de testes. Nenhuma transação foi enviada ao gateway.' });
  const user = c.get('user')!;
  const body = await c.req.json<any>().catch(() => ({}));
  if (!body.serviceType) throw new HTTPException(400, { message: 'serviceType é obrigatório.' });
  if (!body.cardToken) throw new HTTPException(400, { message: 'cardToken é obrigatório.' });
  const caseId = String(body.caseId || '');
  if (!caseId) throw new HTTPException(400, { message: 'caseId é obrigatório.' });
  await assertCaseCanBePaid(c.env, caseId, user, String(body.serviceType));
  const ipAddress = c.req.header('cf-connecting-ip');
  const limiter = c.env.ANONYMOUS_CASE_LIMITER;
  if (!ipAddress || !limiter) {
    throw new HTTPException(503, { message: 'Criação de cobrança temporariamente indisponível.' });
  }
  const { success } = await limiter.limit({ key: `pay:card:${user.id}:${ipAddress}` });
  if (!success) {
    c.header('Retry-After', '60');
    throw new HTTPException(429, { message: 'Limite temporário de criação de cobrança atingido.' });
  }
  const offer = await resolveCommercialOffer(c.env, body.serviceType, body.couponCode, user.id);
  if (Number(offer.finalAmount) <= 0) throw new HTTPException(422, { message: 'O total é zero. Use o resgate gratuito do cupom; nenhuma cobrança de cartão foi criada.' });
  if (body.amount !== undefined && Number(body.amount) !== Number(offer.finalAmount)) throw new HTTPException(400, { message: 'Valor informado não corresponde à oferta comercial.' });
  const primaryGateway = c.env.VENO_PRIMARY_GATEWAY || 'venopag';
  if (primaryGateway === 'venopag') throw new HTTPException(503, { message: 'Pagamento com cartão ainda não está habilitado para VenoPag. Use PIX; nenhuma cobrança foi enviada.' });
  if (primaryGateway !== 'pagbank') throw new HTTPException(503, { message: 'Gateway de cartão não configurado para esta modalidade.' });
  if (!c.env.PAGBANK_TOKEN) throw new HTTPException(503, { message: 'Pagamento temporariamente indisponível. Tente novamente mais tarde.' });
  let order;
  try {
    order = await createCreditCardOrder(c.env as any, { caseId, referenceId: `defesai_case_${caseId}`, customer: { name: body.customerName || 'Condutor DefesAi', email: body.customerEmail || user.email || 'contato@defesai.shop', taxId: String(body.customerCpf || '').replace(/\D/g, '') }, amount: Number(offer.finalAmount), installments: Number(body.installments || 1), cardToken: body.cardToken, authenticationMethod: body.authenticationMethod || 'CHALLENGE', softDescriptor: body.softDescriptor, webhookUrl: `${(c.env as any).APP_URL || 'https://adeusmulta.defesai.com.br'}/api/webhooks/pagbank` });
  } catch {
    throw new HTTPException(503, { message: 'Não foi possível iniciar o pagamento. Nenhuma cobrança foi confirmada.' });
  }
  if (order.simulated) throw new HTTPException(503, { message: 'Pagamento simulado não é aceito neste ambiente.' });
  const record = await persistOrder(c.env, { caseId, userId: user.id, referenceId: order.referenceId, gatewayOrderId: order.orderId, gatewayTransactionId: order.orderId, amount: Number(offer.finalAmount), baseAmount: Number(offer.baseAmount), discountAmount: Number(offer.baseAmount) - Number(offer.finalAmount), couponCode: body.couponCode, status: order.status, gateway: 'pagbank', paymentMethod: 'credit_card' });
  return c.json({ success: true, orderId: order.orderId, status: order.status, amount: offer.finalAmount, serviceType: offer.serviceType, gateway: 'pagbank', simulated: order.simulated, paymentOrder: record });
});

routes.post('/webhooks/pagbank', async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header('x-authenticity-token');
  if (!(await verifyWebhookSignature(c.env as any, rawBody, signature))) throw new HTTPException(401, { message: 'Assinatura inválida.' });
  let payload: PagBankWebhookPayload;
  try { payload = JSON.parse(rawBody); } catch { throw new HTTPException(400, { message: 'Body inválido.' }); }
  const charge = payload.charges?.[0];
  const status = charge?.status || 'RECEIVED';
  const referenceId = payload.reference_id || charge?.reference_id || '';
  if (!referenceId) return c.json({ received: true, status, isDuplicate: false });
  const match = referenceId.match(/^defesai_case_(.+)$/);
  const caseId = match?.[1] || '';

  const supabase = createSupabaseAdminClient(c.env);
  const webhookEventId = String(payload.id || `pb_${referenceId}_${status}`);
  const accepted = await acceptWebhookEvent(supabase, 'pagbank', webhookEventId, payload);
  if (accepted.isDuplicate && accepted.alreadyProcessed) {
    return c.json({ received: true, status, isDuplicate: true, matched: true });
  }

  const { data: existing, error } = await supabase.from('payment_orders').select('*').eq('reference_id', referenceId).maybeSingle();
  if (error) throw error;
  if (!existing) return c.json({ received: true, status, isDuplicate: false, matched: false });

  const now = new Date().toISOString();
  if (status === 'PAID') {
    // Validação do valor da transação contra o valor do pedido.
    const rawPaidAmount = charge?.amount ?? charge?.net_amount ?? payload.amount;
    const paidAmount = rawPaidAmount == null
      ? Number.NaN
      : Number(rawPaidAmount);
    const orderAmount = Number(existing.amount);
    if (!Number.isFinite(paidAmount) || paidAmount <= 0 || !Number.isFinite(orderAmount) || orderAmount <= 0 ||
        Math.round(paidAmount * 100) !== Math.round(orderAmount * 100)) {
      await markWebhookEventProcessed(supabase, webhookEventId).catch(() => {});
      throw new HTTPException(409, { message: 'Valor ausente, inválido ou divergente do pedido; pagamento não confirmado.' });
    }
    if (String(existing.status).toUpperCase() === 'PAID' || existing.paid_at) {
      await markWebhookEventProcessed(supabase, webhookEventId).catch(() => {});
      return c.json({ received: true, status: 'PAID', isDuplicate: true, matched: true });
    }
    const gatewayTransactionId = payload.id || charge?.reference_id || existing.gateway_transaction_id;
    const { data: transitioned, error: paymentError } = await supabase.from('payment_orders').update({ status: 'PAID', paid_at: now, gateway_transaction_id: gatewayTransactionId, pagbank_order_id: payload.id || existing.pagbank_order_id, updated_at: now }).eq('id', existing.id).neq('status', 'PAID').select('id').maybeSingle();
    if (paymentError) throw paymentError;
    if (!transitioned) {
      await markWebhookEventProcessed(supabase, webhookEventId).catch(() => {});
      return c.json({ received: true, status: 'PAID', isDuplicate: true, matched: true });
    }
    if (caseId) {
      const { error: caseError } = await supabase.from('cases').update({ is_paid: true, paid_at: now, updated_at: now }).eq('id', caseId);
      if (caseError) throw caseError;
    }
    await markWebhookEventProcessed(supabase, webhookEventId).catch(() => {});
    return c.json({ received: true, status: 'PAID', isDuplicate: false, matched: true });
  }
  const { error: statusError } = await supabase.from('payment_orders').update({ status, updated_at: now }).eq('id', existing.id);
  if (statusError) throw statusError;
  await markWebhookEventProcessed(supabase, webhookEventId).catch(() => {});
  return c.json({ received: true, status, isDuplicate: false, matched: true });
});

routes.post('/webhooks/ggpix', async (c) => {
  const rawBody = await c.req.text();
  let body: unknown;
  try { body = JSON.parse(rawBody); } catch { return c.json({ error: 'Body inválido.' }, 400); }

  // GGPIX webhook is not supported since migration to VenoPag only.
  return c.json({ error: 'Gateway GGPIX descontinuado. Use VenoPag.' }, 400);
});

routes.post('/webhooks/venopag', async (c) => {
  const rawBody = await c.req.text();
  const valid = await verifyVenoWebhook(
    c.env, rawBody, c.req.header('x-veno-signature') || null, c.req.header('x-veno-client-id') || null,
  );
  if (!valid) return c.json({ error: 'Assinatura inválida.' }, 401);

  let event: { type?: string; status?: string; request_number?: string; transaction_id?: string; amount?: number };
  try { event = JSON.parse(rawBody); } catch { return c.json({ error: 'Body inválido.' }, 400); }
  if (event.type !== 'cashin' || !event.request_number || typeof event.status !== 'string') {
    return c.json({ received: true, ignored: true });
  }
  const supportedStatuses = new Set(['pending', 'confirmed', 'chargedback', 'refunded', 'contested', 'canceled', 'expired']);
  if (!supportedStatuses.has(event.status.toLowerCase())) {
    return c.json({ error: 'Status VenoPag não suportado; evento não foi aplicado.' }, 422);
  }

  const supabase = createSupabaseAdminClient(c.env);
  try {
    const webhookEventId = `veno_${event.request_number}_${event.status.toLowerCase()}`;
  const accepted = await acceptWebhookEvent(supabase, 'venopag', webhookEventId, event);
  if (accepted.isDuplicate && accepted.alreadyProcessed) {
    return c.json({ received: true, status: event.status, isDuplicate: true, matched: true });
  }

  const { data: existing, error } = await supabase.from('payment_orders').select('*')
    .eq('gateway_transaction_id', event.request_number).eq('gateway', 'venopag').maybeSingle();
  if (error) throw error;
  if (!existing) return c.json({ received: true, matched: false });

  // Verify every transition against the provider, not only "confirmed". This
  // prevents forged/stale reversal callbacks from changing a paid order.
  const verified = await getVenoCashInStatus(c.env, event.request_number);
  if (!verified.ok || !verified.status || verified.request_number !== event.request_number ||
      Math.round(Number(verified.amount) * 100) !== Math.round(Number(existing.amount) * 100)) {
    return c.json({ error: 'Status da transação não pôde ser confirmado.' }, 502);
  }
  const currentStatus = verified.status.toLowerCase();

  // A pending callback must never downgrade an order already confirmed as paid.
  // This can happen with delayed/out-of-order provider notifications. Preserve
  // the paid state and close this event as intentionally ignored; a later
  // authoritative refund/chargeback remains processable under its own event ID.
  const wasAlreadyPaid = String(existing.status || '').toUpperCase() === 'PAID' || Boolean(existing.paid_at);
  if (wasAlreadyPaid && currentStatus === 'pending') {
    await markWebhookEventProcessed(supabase, webhookEventId);
    return c.json({
      error: 'Evento pendente fora de ordem; pagamento confirmado preservado.',
      status: 'PAID',
      ignored: true,
    }, 409);
  }

  // State mapping (provider status -> our terminal state).
  //   confirmed    -> PAID            (ledger -> PAID)
  //   chargedback  -> REFUNDED        (ledger -> REVERSED)
  //   refunded     -> REFUNDED        (ledger -> REVERSED)
  //   contested    -> DISPUTED        (ledger unchanged: money held in dispute)
  //   canceled     -> CANCELED
  //   expired      -> CANCELED
  //   pending      -> PENDING
  const now = new Date().toISOString();
  const { data: applied, error: rpcError } = await supabase.rpc('apply_venopag_webhook', {
    p_payment_id: existing.id,
    p_status: currentStatus === 'confirmed' ? 'confirmed'
      : currentStatus === 'chargedback' ? 'chargedback'
      : currentStatus === 'refunded' ? 'refunded'
      : currentStatus === 'contested' ? 'contested'
      : currentStatus === 'canceled' ? 'canceled'
      : currentStatus === 'expired' ? 'expired'
      : currentStatus === 'pending' ? 'pending'
      : 'unknown',
    p_paid_at: currentStatus === 'confirmed' ? now : null,
    p_reversal_reason: currentStatus === 'chargedback' || currentStatus === 'refunded' ? currentStatus : null,
  });
  if (rpcError) throw rpcError;
  if (!applied?.ok) throw new HTTPException(500, { message: applied?.error || 'Falha ao aplicar o webhook.' });

  await markWebhookEventProcessed(supabase, webhookEventId).catch(() => {});
  const responseStatus = currentStatus === 'confirmed' ? 'PAID'
    : ['chargedback', 'refunded'].includes(currentStatus) ? 'REFUNDED'
    : currentStatus === 'contested' ? 'DISPUTED'
    : ['canceled', 'expired'].includes(currentStatus) ? 'CANCELED'
    : currentStatus.toUpperCase();
  const previousStatus = String(existing.status || '').toUpperCase();
  const isDuplicate = previousStatus === responseStatus
    || (responseStatus === 'PENDING' && previousStatus === 'AGUARDANDO_PAGAMENTO');
  return c.json({ received: true, matched: true, status: responseStatus, isDuplicate });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[DEBUG venopag webhook]', err?.message || err);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

routes.get('/payments/pix/status/:txId', authenticateToken, async (c) => {
  const user = c.get('user')!;
  const txId = c.req.param('txId');
  const supabase = createSupabaseUserClient(c.env, c.get('rawToken'));
  const { data, error } = await supabase.from('payment_orders').select('*').eq('gateway_transaction_id', txId).eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  if (!data) throw new HTTPException(404, { message: 'Ordem não encontrada.' });
  return c.json({ success: true, txId, status: data.status, paidAt: data.paid_at, paymentOrder: data });
});

export const paymentsRoutes = routes;
export default paymentsRoutes;
