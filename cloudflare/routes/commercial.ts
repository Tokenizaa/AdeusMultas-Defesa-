import { Hono } from 'hono';
import type { Env } from '../supabase';
import { createSupabaseAdminClient } from '../supabase';
import { adapterError, adapterOk } from '../../src/shared/api/adapters';

const routes = new Hono<{ Bindings: Env }>();
const round2 = (value: number) => Number((Math.round(value * 100) / 100).toFixed(2));

const PROCEDURE_TO_COMMERCIAL: Record<string, string> = {
  defesa_previa: 'defesa_previa', recurso_jari: 'recurso_jari', recurso_cetran: 'recurso_cetran',
  suspensao: 'suspensao', cassacao: 'cassacao', indicacao_condutor: 'indicacao_condutor',
  conversao_advertencia: 'conversao_advertencia', suspensao_cnh: 'suspensao',
  cassacao_cnh: 'cassacao', processo_suspensao: 'suspensao', processo_cassacao: 'cassacao',
};

function normalizeServiceType(raw: string) {
  const key = raw.toLowerCase().trim();
  return PROCEDURE_TO_COMMERCIAL[key] ?? key;
}

async function resolveOffer(env: Env, input: {
  serviceType: string; stageId?: string | null; userId?: string; documentCount?: number; couponCode?: string;
}) {
  const normalized = normalizeServiceType(input.serviceType);
  if (['analise_tecnica', 'geracao_documento', 'relatorio_pericial'].includes(normalized)) {
    return { offer: null, reason: `O serviço "${normalized}" ainda não possui oferta comercial disponível.` };
  }

  const supabase = createSupabaseAdminClient(env);
  const { data: pricing, error: pricingError } = await supabase
    .from('service_pricings').select('*').eq('service_type', normalized).maybeSingle();
  if (pricingError) throw pricingError;
  if (!pricing) return { offer: null, reason: `Nenhuma tabela de preço cadastrada para o serviço "${normalized}".` };
  if (!pricing.is_active) return { offer: null, reason: `A oferta para "${normalized}" está indisponível no momento.` };

  const now = Date.now();
  if (pricing.valid_from && new Date(pricing.valid_from).getTime() > now) return { offer: null, reason: `A oferta "${normalized}" ainda não está vigente.` };
  if (pricing.valid_until && new Date(pricing.valid_until).getTime() < now) return { offer: null, reason: `A oferta "${normalized}" expirou.` };

  const rawStandard = Number(pricing.standard_price);
  const baseAmount = round2(rawStandard > 1000 ? rawStandard / 100 : rawStandard);

  const { data: promotions, error: promotionsError } = await supabase
    .from('promotion_campaigns').select('*').eq('status', 'active');
  if (promotionsError) throw promotionsError;

  let promotionDiscount = 0;
  let promotionId: string | undefined;
  let promotionName: string | undefined;
  const promo = (promotions ?? []).find((p: any) => {
    if (p.start_date && new Date(p.start_date).getTime() > now) return false;
    if (p.end_date && new Date(p.end_date).getTime() < now) return false;
    const services = Array.isArray(p.applicable_services) ? p.applicable_services : [];
    return services.length === 0 || services.includes('all') || services.includes(normalized);
  });

  if (promo) {
    promotionId = promo.id;
    promotionName = promo.name;
    const value = Number(promo.discount_value);
    promotionDiscount = promo.discount_type === 'percentage'
      ? round2((baseAmount * value) / 100)
      : round2(value > 1000 ? value / 100 : value);
  } else if (pricing.promotional_price !== null && pricing.promotional_price !== undefined) {
    const promotional = Number(pricing.promotional_price) > 1000 ? Number(pricing.promotional_price) / 100 : Number(pricing.promotional_price);
    if (promotional < baseAmount) {
      promotionDiscount = round2(baseAmount - promotional);
      promotionName = 'Preço Promocional';
    }
  }

  const priceAfterPromo = round2(Math.max(0, baseAmount - promotionDiscount));
  let documentNumber = typeof input.documentCount === 'number' ? Math.max(1, input.documentCount + 1) : 1;
  if (input.userId && typeof input.documentCount !== 'number') {
    const { count } = await supabase.from('cases').select('id', { count: 'exact', head: true }).eq('user_id', input.userId);
    documentNumber = (count ?? 0) + 1;
  }

  const isFirstDocumentsBeneficiary = documentNumber <= 3;
  const remainingBenefitedDocuments = Math.max(0, 3 - documentNumber + 1);
  const firstDocumentsDiscount = isFirstDocumentsBeneficiary ? round2(priceAfterPromo * 0.5) : 0;
  let finalAmount = round2(priceAfterPromo - firstDocumentsDiscount);

  let couponDiscount = 0;
  if (input.couponCode) {
    const code = input.couponCode.trim().toUpperCase();
    const { data: coupon } = await supabase.from('coupons').select('*').eq('code', code).maybeSingle();
    if (coupon?.is_active) {
      const applicable = Array.isArray(coupon.applicable_services) ? coupon.applicable_services : [];
      const validWindow = (!coupon.valid_from || new Date(coupon.valid_from).getTime() <= now) && (!coupon.valid_until || new Date(coupon.valid_until).getTime() >= now);
      const minOrder = Number(coupon.min_order_value ?? 0);
      if (validWindow && (applicable.length === 0 || applicable.includes('all') || applicable.includes(normalized)) && finalAmount >= minOrder) {
        couponDiscount = coupon.discount_type === 'percentage'
          ? round2(finalAmount * Number(coupon.discount_value) / 100)
          : round2(Number(coupon.discount_value) > 1000 ? Number(coupon.discount_value) / 100 : Number(coupon.discount_value));
        if (coupon.max_discount_amount) couponDiscount = Math.min(couponDiscount, Number(coupon.max_discount_amount) > 1000 ? Number(coupon.max_discount_amount) / 100 : Number(coupon.max_discount_amount));
        couponDiscount = round2(Math.min(couponDiscount, finalAmount));
        finalAmount = round2(Math.max(0, finalAmount - couponDiscount));
      }
    }
  }

  return { offer: {
    commercialId: pricing.id,
    serviceType: normalized,
    stageId: input.stageId ?? null,
    name: pricing.service_name,
    description: pricing.description,
    baseAmount, promotionDiscount, firstDocumentsDiscount, couponDiscount, finalAmount,
    currency: 'BRL', promotionId, promotionName: promotionName || 'Promoção Vigente',
    documentNumber, isFirstDocumentsBeneficiary, remainingBenefitedDocuments,
    eligible: true, available: true, requirements: [],
  }};
}

routes.get('/offers/health', async (c) => adapterOk(c, { provider: 'cloudflare-supabase', route: 'commercial-offers' }));

routes.post('/offers/resolve', async (c) => {
  try {
    const body = await c.req.json<{ serviceType?: string; stageId?: string | null; userId?: string; documentCount?: number; couponCode?: string }>();
    if (!body.serviceType?.trim()) return adapterError(c, 'VALIDATION_ERROR', 'serviceType é obrigatório', 400);
    const result = await resolveOffer(c.env, body);
    return adapterOk(c, result);
  } catch (error) {
    console.error('[commercial] resolve failed', error instanceof Error ? error.message : String(error));
    return adapterError(c, 'UPSTREAM_ERROR', 'Não foi possível resolver a oferta comercial.', 502);
  }
});

routes.get('/payments/resolve-price', async (c) => {
  try {
    const serviceType = c.req.query('serviceType');
    if (!serviceType?.trim()) return adapterError(c, 'VALIDATION_ERROR', 'serviceType é obrigatório', 400);
    const result = await resolveOffer(c.env, { serviceType, userId: c.req.query('userId'), documentCount: c.req.query('documentCount') ? Number(c.req.query('documentCount')) : undefined, couponCode: c.req.query('couponCode') });
    if (!result.offer) return adapterError(c, 'NOT_FOUND', result.reason || 'Oferta não encontrada', 404);
    return adapterOk(c, { price: result.offer.finalAmount, offer: result.offer });
  } catch (error) {
    console.error('[commercial] resolve-price failed', error instanceof Error ? error.message : String(error));
    return adapterError(c, 'UPSTREAM_ERROR', 'Não foi possível resolver o preço.', 502);
  }
});

export const commercialRoutes = routes;
