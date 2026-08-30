/**
 * commercial-integrity — OfferService resolve preço p/ 100% dos
 * CommercialServiceType; bloqueios corretos p/ não-comerciais;
 * matemática de desconto (promo × 1ºs docs × cupom) determinística.
 */
import { describe, it, expect } from 'vitest';
import { OfferService } from '../../src/server/commercial/offers/offer-service';
import type { ServicePricing, PromotionCampaign, Coupon } from '../../src/types/commercial';

const makePricing = (serviceType: string, standardPrice: number, promo: number | null = null): ServicePricing => ({
  id: `price_${serviceType}`,
  serviceType: serviceType as any,
  serviceName: serviceType,
  description: '',
  standardPrice,
  promotionalPrice: promo,
  isActive: true,
  history: [],
  updatedAt: new Date().toISOString(),
  updatedBy: 'test',
});

const makePromo = (id: string, discountValue: number, applicable: string[] = ['all']): PromotionCampaign => ({
  id, name: 'Promo', description: '', discountType: 'percentage', discountValue,
  applicableServices: applicable,
  startDate: new Date(Date.now() - 86400000).toISOString(),
  endDate: new Date(Date.now() + 86400000).toISOString(),
  usageLimit: 999, usageCount: 0, userUsageLimit: 99, status: 'active',
  createdAt: new Date().toISOString(),
});

const makeCoupon = (code: string, discountValue: number, type: 'percentage' | 'fixed_amount' = 'percentage'): Coupon => ({
  id: `cpn_${code}`,
  code, discountType: type, discountValue,
  applicableServices: ['all'], totalLimit: 10, usedCount: 0, userLimit: 1,
  validFrom: new Date(Date.now() - 86400000).toISOString(),
  validUntil: new Date(Date.now() + 86400000).toISOString(),
  isActive: true, createdAt: new Date().toISOString(), usageHistory: [],
});

const COMMERCIAL_DISTINCT = ['recurso_jari', 'recurso_cetran', 'suspensao', 'cassacao', 'indicacao_condutor', 'conversao_advertencia'];

function buildService(): OfferService {
  const pricings = new Map<string, ServicePricing>();
  for (const s of COMMERCIAL_DISTINCT) pricings.set(`price_${s}`, makePricing(s, 8990));
  pricings.set('price_conversao_advertencia', makePricing('conversao_advertencia', 4990));
  return new OfferService(
    pricings,
    new Map<string, PromotionCampaign>(),
    new Map<string, Coupon>(),
    () => {},
    () => 0,
  );
}

describe('commercial-integrity: 100% CommercialServiceType resolvem', () => {
  it.each(COMMERCIAL_DISTINCT)('resolve %s (catálogo)', (svc) => {
    const svc2 = buildService();
    const { offer } = svc2.resolve({ serviceType: svc });
    expect(offer).not.toBeNull();
    expect(offer!.serviceType).toBe(svc);
    expect(offer!.finalAmount).toBeGreaterThan(0);
  });

  it.each(['suspensao_cnh', 'cassacao_cnh', 'processo_suspensao', 'processo_cassacao'])(
    'resolve alias %s → mesmo item comercial',
    (svc) => {
      const s = buildService();
      const { offer } = s.resolve({ serviceType: svc });
      expect(offer).not.toBeNull();
      expect(['suspensao', 'cassacao']).toContain(offer!.serviceType);
    },
  );

  it('bloqueia não-comerciais (analise_tecnica, relatorio_pericial)', () => {
    const s = buildService();
    for (const svc of ['analise_tecnica', 'relatorio_pericial']) {
      const { offer, reason } = s.resolve({ serviceType: svc });
      expect(offer).toBeNull();
      expect(reason).toContain('não possui oferta comercial');
    }
  });

  it('serviceType ausente → oferta nula com reason', () => {
    const s = buildService();
    const { offer, reason } = s.resolve({ serviceType: '' });
    expect(offer).toBeNull();
    expect(reason).toContain('obrigatório');
  });

  it('serviceType desconhecido → oferta nula (sem default)', () => {
    const s = buildService();
    const { offer, reason } = s.resolve({ serviceType: 'procedimento_inexistente' });
    expect(offer).toBeNull();
    expect(reason).toContain('Nenhuma tabela de preço');
  });
});

describe('commercial-integrity: matemática de desconto determinística', () => {
  it('1º documento: 50% sobre base', () => {
    const s = buildService();
    const { offer } = s.resolve({ serviceType: 'recurso_jari', documentCount: 0 })!;
    expect(offer!.baseAmount).toBe(89.9);
    expect(offer!.firstDocumentsDiscount).toBeCloseTo(44.95, 2);
    expect(offer!.finalAmount).toBeCloseTo(44.95, 2);
  });

  it('4º documento: sem desconto de 1ºs docs', () => {
    const s = buildService();
    const { offer } = s.resolve({ serviceType: 'recurso_jari', documentCount: 3 })!;
    expect(offer!.finalAmount).toBeCloseTo(89.9, 2);
  });

  it('promoção percentual aplica antes do cupom', () => {
    const pricings = new Map<string, ServicePricing>([['price_recurso_jari', makePricing('recurso_jari', 8990)]]);
    const promotions = new Map<string, PromotionCampaign>([['promo1', makePromo('promo1', 10)]]);
    const s = new OfferService(pricings, promotions, new Map(), () => {}, () => 0);
    const { offer } = s.resolve({ serviceType: 'recurso_jari', documentCount: 10 })!;
    expect(offer!.promotionDiscount).toBeCloseTo(8.99, 2);
    expect(offer!.finalAmount).toBeCloseTo(80.91, 2);
  });

  it('cupom percentual aplica sobre finalAmount', () => {
    const pricings = new Map<string, ServicePricing>([['price_recurso_jari', makePricing('recurso_jari', 8990)]]);
    const coupons = new Map<string, Coupon>([['DESCONTO10', makeCoupon('DESCONTO10', 10)]]);
    const s = new OfferService(pricings, new Map(), coupons, () => {}, () => 3);
    const { offer } = s.resolve({ serviceType: 'recurso_jari', couponCode: 'desconto10', documentCount: 10 })!;
    expect(offer!.couponDiscount).toBeCloseTo(8.99, 2);
    expect(offer!.finalAmount).toBeCloseTo(80.91, 2);
  });

  it('cálculo em centavos (>1000) normaliza p/ reais', () => {
    const pricings = new Map<string, ServicePricing>([['price_recurso_jari', makePricing('recurso_jari', 899000, 449500)]]);
    const s = new OfferService(pricings, new Map(), new Map(), () => {}, () => 3);
    const { offer } = s.resolve({ serviceType: 'recurso_jari', documentCount: 3 })!;
    expect(offer!.baseAmount).toBeCloseTo(8990, 2);
    expect(offer!.promotionDiscount).toBeCloseTo(4495, 2);
  });

  it('oferta nunca fica negativa', () => {
    const pricings = new Map<string, ServicePricing>([['price_recurso_jari', makePricing('recurso_jari', 1000)]]);
    const coupons = new Map<string, Coupon>([['MEGA', makeCoupon('MEGA', 200)]]);
    const s = new OfferService(pricings, new Map(), coupons, () => {}, () => 3);
    const { offer } = s.resolve({ serviceType: 'recurso_jari', couponCode: 'MEGA', documentCount: 3 })!;
    expect(offer!.finalAmount).toBeGreaterThanOrEqual(0);
  });
});