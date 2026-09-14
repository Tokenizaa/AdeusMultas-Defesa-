import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../supabase';
import { createSupabaseAdminClient } from '../supabase';
import { authenticateToken, type AuthenticatedUser } from '../middleware';
import { createPixOrder, createCreditCardOrder, processPagBankWebhook, type PagBankWebhookPayload } from '../pagbank';

// Ordem em memória (status + tx) — idempotência de webhook.
const ordersStore = new Map<string, any>();
const processedWebhookIds = new Set<string>();

const CURRENCY = 'BRL';
const FALLBACK_PRICE = 89.9;
const round2 = (v: number): number => Number((Math.round(v * 100) / 100).toFixed(2));
const toBRL = (v: number | null | undefined): number | null =>
  v == null ? null : round2(v > 1000 ? v / 100 : v);

/** Mapeamento canônico ProcedureType → serviço comercial (espelho do offer-service.ts). */
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

const SERVICES_WITHOUT_OFFER = ['analise_tecnica', 'geracao_documento', 'relatorio_pericial'];

function normalizeServiceType(raw: string): string {
  const key = (raw || '').toLowerCase().trim();
  return PROCEDURE_TO_COMMERCIAL[key] ?? key;
}

export const paymentsRoutes = new Hono<{ Bindings: Env; Variables: { user?: AuthenticatedUser } }>();

// GET /api/payments/resolve-price?serviceType=...&userId=...&couponCode=...
paymentsRoutes.get('/payments/resolve-price', async (c) => {
  try {
    const offer = await computeOffer(c.env, c.req.query().serviceType, c.req.query().couponCode);
    if (!offer) return c.json({ error: 'Serviço não encontrado no catálogo.' }, 404);
    return c.json(offer);
  } catch (err: any) {
    console.error('[payments] resolve-price error:', err?.stack || err?.message || err);
    return c.json({ error: String(err?.message || err) }, 500);
  }
});

async function computeOffer(env: Env, serviceType: string | undefined, couponCode?: string): Promise<any | null> {
  if (!serviceType) throw new HTTPException(400, { message: 'serviceType é obrigatório.' });

  const normalized = normalizeServiceType(serviceType);
  if (SERVICES_WITHOUT_OFFER.includes(normalized)) {
    throw new HTTPException(404, { message: `O serviço "${normalized}" ainda não possui oferta comercial disponível.` });
  }

  const supabase = createSupabaseAdminClient(env);
  const now = new Date().toISOString();

  // 1. Preço do catálogo (Supabase), com fallback 89.90
  const { data: pricingRows } = await supabase
    .from('service_pricings')
    .select('*')
    .eq('service_type', normalized)
    .maybeSingle();

  const rawStandard = pricingRows?.standard_price ?? FALLBACK_PRICE;
  const baseAmount = toBRL(rawStandard) ?? FALLBACK_PRICE;

  let promotionDiscount = 0;
  let promotionId: string | undefined;
  let promotionName: string | undefined;

  // 2. Promoção ativa (fail-safe: tabela pode não existir)
  let promos: any[] = [];
  try {
    const { data, error } = await supabase.from('promotions').select('*').eq('status', 'active');
    if (!error) promos = data || [];
  } catch {
    // tabela ausente → sem promoção
  }

  const activePromo = promos.find((p: any) => {
    if (p.starts_at && p.starts_at > now) return false;
    if (p.ends_at && p.ends_at < now) return false;
    const svc = p.applicable_services || [];
    return svc.includes('all') || svc.includes(normalized);
  });

  if (activePromo) {
    promotionId = activePromo.id;
    promotionName = activePromo.name;
    promotionDiscount = activePromo.discount_type === 'percentage'
      ? round2((baseAmount * Number(activePromo.discount_value)) / 100)
      : round2(toBRL(activePromo.discount_value) ?? 0);
  } else if (pricingRows?.promotional_price != null) {
    const promo = toBRL(pricingRows.promotional_price) ?? baseAmount;
    if (promo < baseAmount) {
      promotionDiscount = round2(baseAmount - promo);
      promotionName = 'Preço Promocional';
    }
  }

  const priceAfterPromo = round2(baseAmount - promotionDiscount);

  // 3. Desconto de 50% nos 3 primeiros documentos (por simplificação worker: sempre beneficiário)
  const isFirstBeneficiary = true;
  const firstDocumentsDiscount = isFirstBeneficiary ? round2(priceAfterPromo * 0.5) : 0;
  let finalAmount = round2(priceAfterPromo - firstDocumentsDiscount);

  // 4. Cupom (fail-safe: tabela pode não existir)
  let couponDiscount = 0;
  if (couponCode) {
    let coupon: any = null;
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', String(couponCode).trim().toUpperCase())
        .maybeSingle();
      if (!error) coupon = data;
    } catch {
      // tabela ausente → cupom ignorado
    }

    if (coupon && coupon.is_active) {
      if (coupon.discount_type === 'percentage') {
        let disc = round2((finalAmount * Number(coupon.discount_value)) / 100);
        if (coupon.max_discount_amount) {
          disc = Math.min(disc, toBRL(coupon.max_discount_amount) ?? disc);
        }
        couponDiscount = round2(disc);
      } else {
        couponDiscount = round2(Math.min(toBRL(coupon.discount_value) ?? 0, finalAmount));
      }
      finalAmount = round2(Math.max(0, finalAmount - couponDiscount));
    }
  }

  finalAmount = round2(Math.max(0, finalAmount));

  return {
    price: finalAmount,
    finalAmount,
    baseAmount,
    promotionDiscount,
    firstDocumentsDiscount,
    couponDiscount,
    promotionId,
    serviceName: pricingRows?.service_name || normalized,
    serviceType: normalized,
    currency: CURRENCY,
    documentNumber: 1,
  };
}

// POST /api/payments/pix/create — cria ordem PIX (sandbox/homologação)
paymentsRoutes.post('/payments/pix/create', authenticateToken, async (c) => {
  const user = c.get('user')!;
  const { caseId, serviceType, couponCode, customerName, customerEmail, customerCpf } = await c.req.json<any>().catch(() => ({}));
  if (!serviceType) throw new HTTPException(400, { message: 'serviceType é obrigatório.' });

  // Preço resolvido server-side (nunca do frontend)
  const offer = await computeOffer(c.env, serviceType, couponCode);
  if (!offer) throw new HTTPException(400, { message: 'Não foi possível determinar a oferta comercial.' });

  const payer = {
    name: customerName || 'Condutor DefesAi',
    email: customerEmail || (user.email || 'contato@defesai.shop'),
    document: (customerCpf || '').replace(/\D/g, '') || '00000000000',
  };

  const referenceId = caseId ? `defesai_case_${caseId}` : `defesai_case_${Date.now()}`;
  const gatewayId = (c.env as any).PAYMENT_MODE && (c.env as any).PAYMENT_MODE !== 'sandbox' ? 'pagbank' : 'pagbank';

  const order = await createPixOrder(c.env as any, {
    caseId: caseId || `case_${Date.now()}`,
    referenceId,
    payer,
    amountInCents: Math.round(offer.finalAmount * 100),
    description: `DefesAi - ${offer.serviceName}`,
    webhookUrl: `${(c.env as any).APP_URL || 'https://adeusmulta.defesai.com.br'}/api/webhooks/pagbank`,
  });

  ordersStore.set(order.gatewayTransactionId, {
    caseId,
    txId: order.gatewayTransactionId,
    status: 'aguardando_pagamento',
    createdAt: new Date().toISOString(),
    simulated: order.simulated,
  });

  return c.json({
    success: true,
    order,
    pixCopyPasteString: order.pixCopyPaste,
    qrCodeDataUrl: order.qrCodeUrl || undefined,
    txId: order.gatewayTransactionId,
    amount: offer.finalAmount,
    serviceType: offer.serviceType,
    status: 'aguardando_pagamento',
    gateway: gatewayId,
    simulated: order.simulated,
  });
});

// GET /api/payments/pix/status/:txId — polling de status (webhook pode atrasar)
paymentsRoutes.get('/payments/pix/status/:txId', authenticateToken, async (c) => {
  const { txId } = c.req.param();
  const order = ordersStore.get(txId);
  if (!order) throw new HTTPException(404, { message: 'Ordem não encontrada' });
  return c.json({ success: true, txId, status: order.status, paidAt: order.paidAt });
});

// POST /api/payments/credit-card/create — cartão de crédito (PagBank, sandbox por padrão)
paymentsRoutes.post('/payments/credit-card/create', authenticateToken, async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json<any>().catch(() => ({}));
  const {
    caseId, customerName, customerEmail, customerCpf, amount,
    installments = 1, serviceType, cardToken, authenticationMethod = 'CHALLENGE',
    softDescriptor, couponCode,
  } = body;

  if (!cardToken) throw new HTTPException(400, { message: 'cardToken é obrigatório para pagamento com cartão de crédito' });
  if (!serviceType) throw new HTTPException(400, { message: 'serviceType é obrigatório para criar o pagamento.' });

  const offer = await computeOffer(c.env, serviceType, couponCode);
  if (!offer) throw new HTTPException(400, { message: 'Não foi possível determinar a oferta comercial.' });

  if (amount !== undefined && Number(amount) !== offer.finalAmount) {
    throw new HTTPException(400, {
      message: 'Valor informado não corresponde ao preço da oferta. O backend recalcula automaticamente.',
    });
  }

  const payer = {
    name: customerName || 'Condutor DefesAi',
    email: customerEmail || user.email || 'contato@defesai.shop',
    document: (customerCpf || '').replace(/\D/g, '') || '00000000000',
  };

  const order = await createCreditCardOrder(c.env as any, {
    caseId: caseId || `case_${Date.now()}`,
    referenceId: caseId ? `defesai_case_${caseId}` : `defesai_case_${Date.now()}`,
    customer: { name: payer.name, email: payer.email, taxId: payer.document },
    amount: offer.finalAmount,
    installments: Number(installments),
    cardToken,
    authenticationMethod,
    softDescriptor,
    webhookUrl: `${(c.env as any).APP_URL || 'https://adeusmulta.defesai.com.br'}/api/webhooks/pagbank`,
  });

  // Registra ordem para polling de status e webhook
  ordersStore.set(order.orderId, {
    caseId,
    txId: order.orderId,
    status: order.threeDsChallengeRequired ? 'aguardando_autenticacao' : 'aguardando_pagamento',
    createdAt: new Date().toISOString(),
    simulated: order.simulated,
  });

  return c.json({
    success: true,
    orderId: order.orderId,
    status: order.status,
    threeDsChallengeRequired: order.threeDsChallengeRequired,
    amount: offer.finalAmount,
    serviceType: offer.serviceType,
    gateway: 'pagbank',
    simulated: order.simulated,
  });
});

// POST /api/webhooks/pagbank — webhook de pagamento (Hono lê body cru p/ assinatura)
paymentsRoutes.post('/webhooks/pagbank', async (c) => {
  const rawBody = await c.req.text();
  const signature =
    c.req.header('x-pagbank-signature') ||
    c.req.header('x-hub-signature-256') ||
    c.req.header('x-pagbank-signature') ||
    null;

  let payload: PagBankWebhookPayload = {};
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new HTTPException(400, { message: 'Body inválido' });
  }

  const result = await processPagBankWebhook(c.env as any, rawBody, signature, payload, processedWebhookIds);
  if (!result.signatureValid) {
    throw new HTTPException(401, { message: 'Assinatura inválida' });
  }

  if (result.status === 'PAID') {
    const refId = payload.reference_id || payload.charges?.[0]?.reference_id || '';
    const caseIdMatch = String(refId).match(/^defesai_case_(.+)$/);
    const caseId = caseIdMatch?.[1];

    if (caseId) {
      const supabase = createSupabaseAdminClient(c.env);
      const orderRecord = Array.from(ordersStore.values()).find((o) => o.caseId === caseId);
      await supabase
        .from('cases')
        .update({
          is_paid: true,
          paid_at: new Date().toISOString(),
          status: 'pago',
          updated_at: new Date().toISOString(),
        })
        .eq('id', caseId);

      if (orderRecord) {
        orderRecord.status = 'pago';
        orderRecord.paidAt = new Date().toISOString();
        ordersStore.set(orderRecord.txId, orderRecord);
      }
    }
  }

  return c.json({ received: true, isDuplicate: result.isDuplicate, status: result.status });
});

export default paymentsRoutes;