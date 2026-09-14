import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../supabase';
import { createSupabaseAdminClient } from '../supabase';
import { authenticateToken, type AuthenticatedUser } from '../middleware';
import { createPixOrder, createCreditCardOrder, verifyWebhookSignature, type PagBankWebhookPayload } from '../pagbank';

const routes = new Hono<{ Bindings: Env; Variables: { user?: AuthenticatedUser } }>();

const PROCEDURE_TO_COMMERCIAL: Record<string, string> = {
  defesa_previa: 'defesa_previa',
  recurso_jari: 'recurso_jari',
  recurso_cetran: 'recurso_cetran',
  suspensao: 'suspensao',
  cassacao: 'cassacao',
  indicacao_condutor: 'indicacao_condutor',
  conversao_advertencia: 'conversao_advertencia',
  suspensao_cnh: 'suspensao',
  cassacao_cnh: 'cassacao',
  processo_suspensao: 'suspensao',
  processo_cassacao: 'cassacao',
};

function normalizeServiceType(raw: string): string {
  const key = raw.toLowerCase().trim();
  return PROCEDURE_TO_COMMERCIAL[key] ?? key;
}

function production(env: Env): boolean {
  return String((env as any).PAYMENT_MODE ?? 'sandbox').toLowerCase() === 'production';
}

async function resolveCommercialOffer(env: Env, serviceType: string, couponCode?: string, userId?: string) {
  const normalized = normalizeServiceType(serviceType);
  if (!normalized) throw new HTTPException(400, { message: 'serviceType é obrigatório.' });

  const supabase = createSupabaseAdminClient(env);
  const { data: pricing, error } = await supabase
    .from('service_pricings')
    .select('*')
    .eq('service_type', normalized)
    .maybeSingle();
  if (error) throw error;
  if (!pricing || pricing.is_active === false) throw new HTTPException(404, { message: `Oferta não encontrada para "${normalized}".` });

  const raw = Number(pricing.promotional_price ?? pricing.standard_price);
  const base = Number(pricing.standard_price);
  const amount = Number((raw > 1000 ? raw / 100 : raw).toFixed(2));
  const standardAmount = Number((base > 1000 ? base / 100 : base).toFixed(2));

  let documentNumber = 1;
  if (userId) {
    const { count } = await supabase.from('cases').select('id', { count: 'exact', head: true }).eq('user_id', userId);
    documentNumber = (count ?? 0) + 1;
  }

  const firstDiscount = documentNumber <= 3 ? Number((amount * 0.5).toFixed(2)) : 0;
  let finalAmount = Number((amount - firstDiscount).toFixed(2));
  let couponDiscount = 0;

  if (couponCode) {
    const { data: coupon } = await supabase.from('coupons').select('*').eq('code', couponCode.trim().toUpperCase()).maybeSingle();
    if (coupon?.is_active) {
      const value = Number(coupon.discount_value);
      couponDiscount = coupon.discount_type === 'percentage'
        ? Number((finalAmount * value / 100).toFixed(2))
        : Number((value > 1000 ? value / 100 : value).toFixed(2));
      if (coupon.max_discount_amount) {
        const max = Number(coupon.max_discount_amount) > 1000 ? Number(coupon.max_discount_amount) / 100 : Number(coupon.max_discount_amount);
        couponDiscount = Math.min(couponDiscount, max);
      }
      couponDiscount = Math.min(couponDiscount, finalAmount);
      finalAmount = Number(Math.max(0, finalAmount - couponDiscount).toFixed(2));
    }
  }

  return {
    serviceType: normalized,
    serviceName: pricing.service_name || normalized,
    baseAmount: standardAmount,
    promotionDiscount: Number(Math.max(0, standardAmount - amount).toFixed(2)),
    firstDocumentsDiscount: firstDiscount,
    couponDiscount,
    finalAmount,
    documentNumber,
    currency: 'BRL',
  };
}

async function persistOrder(env: Env, input: {
  caseId: string;
  userId?: string;
  referenceId: string;
  gatewayOrderId?: string;
  gatewayTransactionId: string;
  amount: number;
  status: string;
  gateway: string;
  qrCodeText?: string;
  qrCodeUrl?: string;
  simulated: boolean;
}) {
  const supabase = createSupabaseAdminClient(env);
  const { data, error } = await supabase.from('payment_orders').insert({
    case_id: input.caseId,
    user_id: input.userId ?? null,
    reference_id: input.referenceId,
    pagbank_order_id: input.gatewayOrderId ?? null,
    gateway_transaction_id: input.gatewayTransactionId,
    status: input.status,
    amount: input.amount,
    final_amount: input.amount,
    qr_code_text: input.qrCodeText ?? null,
    qr_code_url: input.qrCodeUrl ?? null,
    gateway: input.gateway,
    simulated: input.simulated,
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

  const offer = await resolveCommercialOffer(c.env, body.serviceType, body.couponCode, user.id);
  const caseId = String(body.caseId || '');
  if (!caseId) throw new HTTPException(400, { message: 'caseId é obrigatório.' });

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
    amountInCents: Math.round(offer.finalAmount * 100),
    description: `DefesAi - ${offer.serviceName}`,
    webhookUrl: `${(c.env as any).APP_URL || 'https://adeusmulta.defesai.com.br'}/api/webhooks/pagbank`,
  });

  const record = await persistOrder(c.env, {
    caseId,
    userId: user.id,
    referenceId,
    gatewayOrderId: order.orderId,
    gatewayTransactionId: order.gatewayTransactionId,
    amount: offer.finalAmount,
    status: order.status,
    gateway: 'pagbank',
    qrCodeText: order.pixCopyPaste || order.qrCodeText,
    qrCodeUrl: order.qrCodeUrl,
    simulated: order.simulated,
  });

  return c.json({
    success: true,
    order,
    paymentOrder: record,
    pixCopyPasteString: order.pixCopyPaste,
    qrCodeDataUrl: order.qrCodeUrl || undefined,
    txId: order.gatewayTransactionId,
    amount: offer.finalAmount,
    serviceType: offer.serviceType,
    status: order.status,
    gateway: 'pagbank',
    simulated: order.simulated,
  });
});

routes.get('/payments/pix/status/:txId', authenticateToken, async (c) => {
  const user = c.get('user')!;
  const txId = c.req.param('txId');
  const supabase = createSupabaseAdminClient(c.env);
  const { data, error } = await supabase
    .from('payment_orders')
    .select('*')
    .eq('gateway_transaction_id', txId)
    .eq('user_id', user.id)
    .maybeSingle();
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
  if (body.amount !== undefined && Number(body.amount) !== offer.finalAmount) {
    throw new HTTPException(400, { message: 'Valor informado não corresponde à oferta comercial.' });
  }

  const order = await createCreditCardOrder(c.env as any, {
    caseId,
    referenceId: `defesai_case_${caseId}`,
    customer: {
      name: body.customerName || 'Condutor DefesAi',
      email: body.customerEmail || user.email || 'contato@defesai.shop',
      taxId: String(body.customerCpf || '').replace(/\D/g, ''),
    },
    amount: offer.finalAmount,
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
    amount: offer.finalAmount,
    status: order.status,
    gateway: 'pagbank',
    simulated: order.simulated,
  });

  return c.json({ success: true, orderId: order.orderId, status: order.status, amount: offer.finalAmount, serviceType: offer.serviceType, gateway: 'pagbank', simulated: order.simulated, paymentOrder: record });
});

routes.post('/webhooks/pagbank', async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header('x-pagbank-signature') || c.req.header('x-hub-signature-256');
  if (!(await verifyWebhookSignature(c.env as any, rawBody, signature))) {
    throw new HTTPException(401, { message: 'Assinatura inválida.' });
  }

  let payload: PagBankWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new HTTPException(400, { message: 'Body inválido.' });
  }

  const charge = payload.charges?.[0];
  const status = charge?.status || 'RECEIVED';
  const referenceId = payload.reference_id || charge?.reference_id || '';
  if (!referenceId) return c.json({ received: true, status, isDuplicate: false });

  const caseMatch = referenceId.match(/^defesai_case_(.+)$/);
  const caseId = caseMatch?.[1];
  const supabase = createSupabaseAdminClient(c.env);
  const { data: existing } = await supabase
    .from('payment_orders')
    .select('*')
    .eq('reference_id', referenceId)
    .maybeSingle();

  if (!existing) return c.json({ received: true, status, isDuplicate: false, matched: false });

  if (status === 'PAID') {
    const alreadyPaid = String(existing.status).toUpperCase() === 'PAID' || existing.paid_at != null;
    if (alreadyPaid) return c.json({ received: true, status: 'PAID', isDuplicate: true, matched: true });

    const now = new Date().toISOString();
    await supabase.from('payment_orders').update({ status: 'PAID', paid_at: now, updated_at: now }).eq('id', existing.id);
    if (caseId) {
      await supabase.from('cases').update({ is_paid: true, paid_at: now, status: 'pago', updated_at: now }).eq('id', caseId);
    }
    return c.json({ received: true, status: 'PAID', isDuplicate: false, matched: true });
  }

  await supabase.from('payment_orders').update({ status, updated_at: new Date().toISOString() }).eq('id', existing.id);
  return c.json({ received: true, status, isDuplicate: false, matched: true });
});

export const paymentsRoutes = routes;
export default paymentsRoutes;
