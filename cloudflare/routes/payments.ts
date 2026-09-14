import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../supabase';
import { createSupabaseAdminClient } from '../supabase';
import { authenticateToken, type AuthenticatedUser } from '../middleware';
import { createPixOrder, createCreditCardOrder, verifyWebhookSignature, type PagBankWebhookPayload } from '../pagbank';
import { commercialRoutes } from './commercial';

const routes = new Hono<{ Bindings: Env; Variables: { user?: AuthenticatedUser } }>();

async function resolveCommercialOffer(env: Env, serviceType: string, couponCode?: string, userId?: string) {
  const request = new Request('https://internal/api/offers/resolve', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ serviceType, couponCode, userId }),
  });
  const response = await commercialRoutes.fetch(request, env);
  const payload = await response.json<any>();
  if (!response.ok || !payload?.ok || !payload?.data?.offer) {
    throw new HTTPException(response.status || 502, { message: payload?.error?.message || payload?.reason || 'Oferta comercial indisponível.' });
  }
  return payload.data.offer;
}

async function persistOrder(env: Env, input: {
  caseId: string;
  userId?: string;
  referenceId: string;
  gatewayOrderId?: string;
  gatewayTransactionId: string;
  amount: number;
  baseAmount?: number;
  discountAmount?: number;
  couponCode?: string;
  status: string;
  gateway: string;
  paymentMethod?: string;
  qrCodeText?: string;
  qrCodeUrl?: string;
}) {
  const supabase = createSupabaseAdminClient(env);
  const now = new Date().toISOString();
  const finalAmount = Number(input.amount);
  const baseAmount = Number(input.baseAmount ?? finalAmount);
  const discountAmount = Number(input.discountAmount ?? Math.max(0, baseAmount - finalAmount));
  const { data, error } = await supabase.from('payment_orders').insert({
    case_id: input.caseId,
    user_id: input.userId ?? null,
    reference_id: input.referenceId,
    pagbank_order_id: input.gatewayOrderId ?? null,
    gateway_transaction_id: input.gatewayTransactionId,
    status: input.status,
    amount: finalAmount,
    currency: 'BRL',
    payment_method: input.paymentMethod ?? 'pix',
    qr_code_text: input.qrCodeText ?? null,
    qr_code_url: input.qrCodeUrl ?? null,
    base_amount: baseAmount,
    discount_amount: discountAmount,
    discount_type: discountAmount > 0 ? 'commercial' : null,
    coupon_code: input.couponCode ?? null,
    bonus_used_amount: 0,
    final_amount: finalAmount,
    gateway: input.gateway,
    created_at: now,
    updated_at: now,
  }).select('*').single();
  if (error) throw error;
  return data;
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

routes.post('/payments/pix/create', authenticateToken, async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json<any>().catch(() => ({}));
  if (!body.serviceType) throw new HTTPException(400, { message: 'serviceType é obrigatório.' });
  const caseId = String(body.caseId || '');
  if (!caseId) throw new HTTPException(400, { message: 'caseId é obrigatório.' });

  const offer = await resolveCommercialOffer(c.env, body.serviceType, body.couponCode, user.id);
  const referenceId = `defesai_case_${caseId}`;
  const payer = {
    name: body.customerName || 'Condutor DefesAi',
    email: body.customerEmail || user.email || 'contato@defesai.shop',
    document: String(body.customerCpf || '').replace(/\D/g, ''),
  };

  const order = await createPixOrder(c.env as any, {
    caseId,
    referenceId,
    payer,
    amountInCents: Math.round(Number(offer.finalAmount) * 100),
    description: `DefesAi - ${offer.name}`,
    webhookUrl: `${(c.env as any).APP_URL || 'https://adeusmulta.defesai.com.br'}/api/webhooks/pagbank`,
  });

  const record = await persistOrder(c.env, {
    caseId,
    userId: user.id,
    referenceId,
    gatewayOrderId: order.orderId,
    gatewayTransactionId: order.gatewayTransactionId,
    amount: Number(offer.finalAmount),
    baseAmount: Number(offer.baseAmount),
    discountAmount: Number(offer.baseAmount) - Number(offer.finalAmount),
    couponCode: body.couponCode,
    status: order.status,
    gateway: 'pagbank',
    paymentMethod: 'pix',
    qrCodeText: order.pixCopyPaste || order.qrCodeText,
    qrCodeUrl: order.qrCodeUrl,
  });

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

  const order = await createCreditCardOrder(c.env as any, {
    caseId,
    referenceId: `defesai_case_${caseId}`,
    customer: { name: body.customerName || 'Condutor DefesAi', email: body.customerEmail || user.email || 'contato@defesai.shop', taxId: String(body.customerCpf || '').replace(/\D/g, '') },
    amount: Number(offer.finalAmount),
    installments: Number(body.installments || 1),
    cardToken: body.cardToken,
    authenticationMethod: body.authenticationMethod || 'CHALLENGE',
    softDescriptor: body.softDescriptor,
    webhookUrl: `${(c.env as any).APP_URL || 'https://adeusmulta.defesai.com.br'}/api/webhooks/pagbank`,
  });

  const record = await persistOrder(c.env, {
    caseId,
    userId: user.id,
    referenceId: order.referenceId,
    gatewayOrderId: order.orderId,
    gatewayTransactionId: order.orderId,
    amount: Number(offer.finalAmount),
    baseAmount: Number(offer.baseAmount),
    discountAmount: Number(offer.baseAmount) - Number(offer.finalAmount),
    couponCode: body.couponCode,
    status: order.status,
    gateway: 'pagbank',
    paymentMethod: 'credit_card',
  });
  return c.json({ success: true, orderId: order.orderId, status: order.status, amount: offer.finalAmount, serviceType: offer.serviceType, gateway: 'pagbank', simulated: order.simulated, paymentOrder: record });
});

routes.post('/webhooks/pagbank', async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header('x-pagbank-signature') || c.req.header('x-hub-signature-256');
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
    const { error: paymentError } = await supabase.from('payment_orders').update({
      status: 'PAID',
      paid_at: now,
      gateway_transaction_id: gatewayTransactionId,
      pagbank_order_id: payload.id || existing.pagbank_order_id,
      updated_at: now,
    }).eq('id', existing.id).neq('status', 'PAID');
    if (paymentError) throw paymentError;
    const match = referenceId.match(/^defesai_case_(.+)$/);
    if (match?.[1]) {
      const { error: caseError } = await supabase.from('cases').update({ is_paid: true, paid_at: now, status: 'pago', updated_at: now }).eq('id', match[1]);
      if (caseError) throw caseError;
    }
    return c.json({ received: true, status: 'PAID', isDuplicate: false, matched: true });
  }

  const { error: statusError } = await supabase.from('payment_orders').update({ status, updated_at: now }).eq('id', existing.id);
  if (statusError) throw statusError;
  return c.json({ received: true, status, isDuplicate: false, matched: true });
});

export const paymentsRoutes = routes;
export default paymentsRoutes;
