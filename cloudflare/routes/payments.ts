import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Env } from '../supabase';
import { createSupabaseAdminClient } from '../supabase';
import { authenticateToken, type AuthenticatedUser } from '../middleware';
import { createPixOrder, createCreditCardOrder, verifyWebhookSignature, type PagBankWebhookPayload } from '../pagbank';
import { commercialRoutes } from './commercial';
import { GGPIXAdapter } from '../../src/server/integrations/gateway/ggpix-adapter';
import type { NormalizedWebhookEvent } from '../../src/server/integrations/gateway/types';
import { createVenoCashIn, getVenoCashInStatus, verifyVenoWebhook } from '../venopag';

const routes = new Hono<{ Bindings: Env; Variables: { user?: AuthenticatedUser } }>();

async function resolveCommercialOffer(env: Env, serviceType: string, couponCode?: string, userId?: string) {
  // `commercialRoutes` is mounted at `/api` by the worker, but its own
  // sub-application receives paths relative to that mount. Calling it with
  // `/api/offers/resolve` bypasses the route and makes checkout fail before
  // any gateway request is attempted.
  const request = new globalThis.Request('https://internal/offers/resolve', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ serviceType, couponCode, userId }) });
  const response = await commercialRoutes.fetch(request, env);
  const payload = await response.json() as any;
  if (!response.ok || !payload?.ok || !payload?.data?.offer) throw new HTTPException((response.status || 502) as ContentfulStatusCode, { message: payload?.error?.message || payload?.reason || 'Oferta comercial indisponível.' });
  return payload.data.offer;
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

async function resolveVenoAffiliateSplits(env: Env, buyerUserId: string) {
  const supabase = createSupabaseAdminClient(env);
  const { data: relations, error: relationError } = await supabase
    .from('referral_relations')
    .select('referrer_id,level,status')
    .eq('referred_id', buyerUserId)
    .eq('status', 'active')
    .in('level', [1, 2, 3]);
  if (relationError) throw relationError;
  const affiliateIds = [...new Set((relations || []).map((r: any) => String(r.referrer_id)).filter(Boolean))];
  if (!affiliateIds.length) return [];
  const { data: profiles, error: profileError } = await supabase
    .from('affiliate_gateway_profiles')
    .select('user_id,venopag_username,split_percent,is_active')
    .in('user_id', affiliateIds)
    .eq('is_active', true);
  if (profileError) throw profileError;
  const relationLevels = new Map<string, number>();
  for (const relation of relations || []) {
    const id = String((relation as any).referrer_id);
    const level = Number((relation as any).level);
    if (!relationLevels.has(id) || level < relationLevels.get(id)!) relationLevels.set(id, level);
  }
  const splits = (profiles || []).map((profile: any) => ({
    username: String(profile.venopag_username || '').trim(),
    percentage: Number(profile.split_percent) || 0,
    level: relationLevels.get(String(profile.user_id)) || 1,
  })).filter((split: any) => split.username && split.percentage > 0)
    .sort((a: any, b: any) => a.level - b.level)
    .map(({ username, percentage }: any) => ({ username, percentage }));
  const totalPercent = splits.reduce((sum: number, split: any) => sum + split.percentage, 0);
  if (totalPercent > 100) {
    throw new HTTPException(409, { message: 'A soma dos splits de afiliados ativos ultrapassa 100%. Ajuste os percentuais antes de gerar a cobrança.' });
  }
  return splits;
}

routes.get('/payments/resolve-price', async (c) => {
  try {
    const serviceType = c.req.query('serviceType');
    if (!serviceType) throw new HTTPException(400, { message: 'serviceType é obrigatório.' });
    const offer = await resolveCommercialOffer(c.env, serviceType, c.req.query('couponCode'), c.req.query('userId'));
    return c.json({ ok: true, ...offer });
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    console.error('[payments] resolve-price', error);
    return c.json({ ok: false, error: 'Não foi possível resolver o preço.' }, 502);
  }
});

routes.get('/payments/gateway/status', (c) => {
  const gateway = c.env.VENO_PRIMARY_GATEWAY || 'venopag';
  const configured = gateway === 'venopag'
    ? Boolean(c.env.VENO_CLIENT_ID && c.env.VENO_CLIENT_SECRET && c.env.VENO_WEBHOOK_SECRET)
    : Boolean(c.env.PAGBANK_TOKEN);
  return c.json({
    ok: configured,
    configured,
    gateway,
    environment: gateway === 'venopag' ? 'production' : (c.env.PAGBANK_ENV || 'sandbox'),
    simulated: false,
  }, configured ? 200 : 503);
});

routes.post('/payments/pix/create', authenticateToken, async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json<any>().catch(() => ({}));
  if (!body.serviceType) throw new HTTPException(400, { message: 'serviceType é obrigatório.' });
  const caseId = String(body.caseId || '');
  if (!caseId) throw new HTTPException(400, { message: 'caseId é obrigatório.' });
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
    .eq('status', 'PENDING')
    .maybeSingle();
  if (existingOrder?.gateway_transaction_id && existingOrder.amount === Number(offer.finalAmount)) {
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
  const payer = { name: body.customerName || 'Condutor DefesAi', email: body.customerEmail || user.email || 'contato@defesai.shop', document: String(body.customerCpf || '').replace(/\D/g, '') };
  const primaryGateway = c.env.VENO_PRIMARY_GATEWAY || 'venopag';
  if (primaryGateway === 'venopag') {
    if (!c.env.VENO_CLIENT_ID || !c.env.VENO_CLIENT_SECRET || !c.env.VENO_WEBHOOK_SECRET) {
      throw new HTTPException(503, { message: 'Pagamento temporariamente indisponível. Tente novamente mais tarde.' });
    }
    let venoOrder;
    try {
      const splits = await resolveVenoAffiliateSplits(c.env, user.id);
      venoOrder = await createVenoCashIn(c.env, {
        amountInCents: Math.round(Number(offer.finalAmount) * 100),
        payerName: payer.name,
        payerDocument: payer.document,
        description: `DefesAi - ${offer.name}`,
        webhookUrl: `${c.env.APP_URL || 'https://adeusmulta.defesai.com.br'}/api/webhooks/venopag`,
        splits,
      });
    } catch (error) {
      const message = error instanceof Error && error.message
        ? error.message
        : 'Não foi possível confirmar a criação do pagamento. Aguarde e verifique antes de tentar novamente.';
      console.error('[payments] venopag cashin failed', message);
      throw new HTTPException(502, { message });
    }
    if (venoOrder.status !== 'pending' || Math.round(venoOrder.amount * 100) !== Math.round(Number(offer.finalAmount) * 100)) {
      throw new HTTPException(502, { message: 'Resposta inesperada do provedor. Verifique a transação antes de tentar novamente.' });
    }
    const qrCodeDataUrl = venoOrder.qr_img
      ? `data:image/png;base64,${venoOrder.qr_img}`
      : venoOrder.qr_url;
    let record;
    try {
      record = await persistOrder(c.env, {
        caseId, userId: user.id, referenceId, serviceType: body.serviceType, gatewayTransactionId: venoOrder.request_number,
        amount: Number(offer.finalAmount), baseAmount: Number(offer.baseAmount),
        discountAmount: Number(offer.baseAmount) - Number(offer.finalAmount), couponCode: body.couponCode,
        status: 'PENDING', gateway: 'venopag', paymentMethod: 'pix',
        qrCodeText: venoOrder.copyPaste, qrCodeUrl: venoOrder.qr_url,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error('[payments] venopag order persistence failed', {
        caseId,
        requestNumber: venoOrder.request_number,
        detail,
      });
      throw new HTTPException(502, { message: 'O gateway gerou a cobrança, mas o sistema não conseguiu registrá-la. Não tente novamente; suporte deve reconciliar a transação.' });
    }
    return c.json({
      success: true, order: venoOrder, paymentOrder: record,
      pixCopyPasteString: venoOrder.copyPaste, qrCodeDataUrl, qrCodeUrl: venoOrder.qr_url,
      txId: venoOrder.request_number, amount: offer.finalAmount,
      serviceType: offer.serviceType, status: 'PENDING', gateway: 'venopag', simulated: false,
    });
  }
  if (!c.env.PAGBANK_TOKEN) throw new HTTPException(503, { message: 'Pagamento temporariamente indisponível. Tente novamente mais tarde.' });
  let order;
  try {
    order = await createPixOrder(c.env as any, { caseId, referenceId, payer, amountInCents: Math.round(Number(offer.finalAmount) * 100), description: `DefesAi - ${offer.name}`, webhookUrl: `${(c.env as any).APP_URL || 'https://adeusmulta.defesai.com.br'}/api/webhooks/pagbank` });
  } catch {
    throw new HTTPException(503, { message: 'Não foi possível iniciar o pagamento. Nenhuma cobrança foi confirmada.' });
  }
  if (order.simulated) throw new HTTPException(503, { message: 'Pagamento simulado não é aceito neste ambiente.' });
  const record = await persistOrder(c.env, { caseId, userId: user.id, referenceId, serviceType: body.serviceType, gatewayOrderId: order.orderId, gatewayTransactionId: order.gatewayTransactionId, amount: Number(offer.finalAmount), baseAmount: Number(offer.baseAmount), discountAmount: Number(offer.baseAmount) - Number(offer.finalAmount), couponCode: body.couponCode, status: order.status, gateway: 'pagbank', paymentMethod: 'pix', qrCodeText: order.pixCopyPaste || order.qrCodeText, qrCodeUrl: order.qrCodeUrl });
  return c.json({ success: true, order, paymentOrder: record, pixCopyPasteString: order.pixCopyPaste, qrCodeDataUrl: order.qrCodeUrl || undefined, txId: order.gatewayTransactionId, amount: offer.finalAmount, serviceType: offer.serviceType, status: order.status, gateway: 'pagbank', simulated: order.simulated });
});

routes.get('/payments/pix/status/:txId', authenticateToken, async (c) => {
  const user = c.get('user')!;
  const txId = c.req.param('txId');
  const supabase = createSupabaseAdminClient(c.env);
  const { data, error } = await supabase.from('payment_orders').select('*').eq('gateway_transaction_id', txId).eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  if (!data) throw new HTTPException(404, { message: 'Ordem não encontrada.' });
  return c.json({ success: true, txId, status: data.status, paidAt: data.paid_at, paymentOrder: data });
});

routes.post('/payments/credit-card/create', authenticateToken, async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json<any>().catch(() => ({}));
  if (!body.serviceType) throw new HTTPException(400, { message: 'serviceType é obrigatório.' });
  if (!body.cardToken) throw new HTTPException(400, { message: 'cardToken é obrigatório.' });
  const caseId = String(body.caseId || '');
  if (!caseId) throw new HTTPException(400, { message: 'caseId é obrigatório.' });
  const offer = await resolveCommercialOffer(c.env, body.serviceType, body.couponCode, user.id);
  if (body.amount !== undefined && Number(body.amount) !== Number(offer.finalAmount)) throw new HTTPException(400, { message: 'Valor informado não corresponde à oferta comercial.' });
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
  const supabase = createSupabaseAdminClient(c.env);
  const { data: existing, error } = await supabase.from('payment_orders').select('*').eq('reference_id', referenceId).maybeSingle();
  if (error) throw error;
  if (!existing) return c.json({ received: true, status, isDuplicate: false, matched: false });
  const now = new Date().toISOString();
  if (status === 'PAID') {
    if (String(existing.status).toUpperCase() === 'PAID' || existing.paid_at) return c.json({ received: true, status: 'PAID', isDuplicate: true, matched: true });
    const gatewayTransactionId = payload.id || charge?.reference_id || existing.gateway_transaction_id;
    const { data: transitioned, error: paymentError } = await supabase.from('payment_orders').update({ status: 'PAID', paid_at: now, gateway_transaction_id: gatewayTransactionId, pagbank_order_id: payload.id || existing.pagbank_order_id, updated_at: now }).eq('id', existing.id).neq('status', 'PAID').select('id').maybeSingle();
    if (paymentError) throw paymentError;
    if (!transitioned) return c.json({ received: true, status: 'PAID', isDuplicate: true, matched: true });
    const match = referenceId.match(/^defesai_case_(.+)$/);
    if (match?.[1]) {
      const { error: caseError } = await supabase.from('cases').update({ is_paid: true, paid_at: now, updated_at: now }).eq('id', match[1]);
      if (caseError) throw caseError;
    }
    return c.json({ received: true, status: 'PAID', isDuplicate: false, matched: true });
  }
  const { error: statusError } = await supabase.from('payment_orders').update({ status, updated_at: now }).eq('id', existing.id);
  if (statusError) throw statusError;
  return c.json({ received: true, status, isDuplicate: false, matched: true });
});

routes.post('/webhooks/ggpix', async (c) => {
  const rawBody = await c.req.text();
  let body: unknown;
  try { body = JSON.parse(rawBody); } catch { return c.json({ error: 'Body inválido.' }, 400); }

  // Never log Worker bindings: c.env contains production credentials.
  const headersObj = Object.fromEntries(c.req.raw.headers.entries());

  // Use the adapter with the current Env binding
  const envRecord = c.env as unknown as Record<string, string>;
  const ggpixAdapterInstance = new GGPIXAdapter(envRecord);
  let normalized: NormalizedWebhookEvent;
  try {
    normalized = ggpixAdapterInstance.processWebhook(rawBody, headersObj, body);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('Webhook GGPIXAPI rejeitado')) {
      return c.json({ error: err.message }, 401);
    }
    return c.json({ error: 'Webhook inválido.' }, 400);
  }

  const { referenceId, status, gatewayTransactionId } = normalized;
  if (!referenceId) return c.json({ received: true, status, isDuplicate: false });

  const supabase = createSupabaseAdminClient(c.env);
  const { data: existing, error } = await supabase.from('payment_orders').select('*').eq('reference_id', referenceId).maybeSingle();
  if (error) throw error;
  if (!existing) return c.json({ received: true, status, isDuplicate: false, matched: false });

  const now = new Date().toISOString();
  if (status === 'PAID') {
    if (String(existing.status).toUpperCase() === 'PAID' || existing.paid_at) return c.json({ received: true, status: 'PAID', isDuplicate: true, matched: true });
    const { data: transitioned, error: paymentError } = await supabase.from('payment_orders').update({ status: 'PAID', paid_at: now, gateway_transaction_id: gatewayTransactionId, updated_at: now }).eq('id', existing.id).neq('status', 'PAID').select('id').maybeSingle();
    if (paymentError) throw paymentError;
    if (!transitioned) return c.json({ received: true, status: 'PAID', isDuplicate: true, matched: true });
    const match = referenceId.match(/^defesai_case_(.+)$/);
    if (match?.[1]) {
      const { error: caseError } = await supabase.from('cases').update({ is_paid: true, paid_at: now, updated_at: now }).eq('id', match[1]);
      if (caseError) throw caseError;
    }
    return c.json({ received: true, status: 'PAID', isDuplicate: false, matched: true });
  }
  const { error: statusError } = await supabase.from('payment_orders').update({ status, updated_at: now }).eq('id', existing.id);
  if (statusError) throw statusError;
  return c.json({ received: true, status, isDuplicate: false, matched: true });
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

  const supabase = createSupabaseAdminClient(c.env);
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
  const currentStatus = verified.status;
  const reversed = ['contested', 'chargedback', 'refunded'].includes(currentStatus);
  if (currentStatus === 'confirmed') {
    const now = new Date().toISOString();
    const alreadyPaid = String(existing.status).toUpperCase() === 'PAID' || Boolean(existing.paid_at);
    const { data: transitioned, error: updateError } = alreadyPaid
      ? { data: null, error: null }
      : await supabase.from('payment_orders').update({
          status: 'PAID', paid_at: now, updated_at: now,
        }).eq('id', existing.id).neq('status', 'PAID').select('id').maybeSingle();
    if (updateError) throw updateError;
    const { error: caseError } = await supabase.from('cases').update({ is_paid: true, paid_at: existing.paid_at || now, updated_at: now }).eq('id', existing.case_id);
    if (caseError) throw caseError;
    return c.json({ received: true, matched: true, isDuplicate: alreadyPaid || !transitioned, status: 'PAID' });
  }

  const state = reversed ? 'REFUNDED' : ['canceled', 'expired'].includes(currentStatus) ? 'CANCELED'
    : currentStatus === 'pending' ? 'PENDING' : 'CANCELED';
  const { error: updateError } = await supabase.from('payment_orders').update({
    status: state, paid_at: null, updated_at: new Date().toISOString(),
  }).eq('id', existing.id);
  if (updateError) throw updateError;
  if (String(existing.status).toUpperCase() === 'PAID' || existing.paid_at) {
    const { error: caseError } = await supabase.from('cases').update({ is_paid: false, paid_at: null, status: 'aguardando_pagamento', updated_at: new Date().toISOString() }).eq('id', existing.case_id);
    if (caseError) throw caseError;
  }
  return c.json({ received: true, matched: true, status: state });
});

export const paymentsRoutes = routes;
export default paymentsRoutes;
