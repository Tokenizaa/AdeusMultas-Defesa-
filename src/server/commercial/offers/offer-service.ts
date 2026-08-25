/**
 * @file offer-service.ts
 * Offer resolution domain service — authoritative price calculation.
 */

import type {
  ServicePricing,
  PromotionCampaign,
  Coupon,
} from '../../../types/commercial';
import type { CommercialOfferBreakdown, ResolveOfferParams, ResolveOfferResult } from './offer-types';

export { CommercialOfferBreakdown, ResolveOfferParams, ResolveOfferResult };

const round2 = (value: number): number => Number((Math.round(value * 100) / 100).toFixed(2));

/**
 * Normalize serviceType aliases to canonical DB values.
 * Single source of truth — no page should implement its own normalization.
 *
 * Known aliases (from onboarding rules, frontend, legacy):
 *  - suspensao_cnh  → suspensao
 *  - cassacao_cnh   → cassacao
 *  - recurso_multa  → defesa_previa (legacy)
 */
const SERVICE_TYPE_ALIASES: Record<string, string> = {
  suspensao_cnh: 'suspensao',
  cassacao_cnh: 'cassacao',
  recurso_multa: 'defesa_previa',
};

export function normalizeServiceType(raw: string): string {
  const key = (raw || '').toLowerCase().trim();
  return SERVICE_TYPE_ALIASES[key] ?? key;
}

export class OfferService {
  constructor(
    private pricings: Map<string, ServicePricing>,
    private promotions: Map<string, PromotionCampaign>,
    private coupons: Map<string, Coupon>,
    private recordAudit: (entry: {
      action: string;
      changedBy: string;
      target: string;
      previousState: unknown;
      newState: unknown;
      reason?: string;
    }) => void,
    private getDocumentCount?: (userId: string) => number | Promise<number>,
  ) {}

  resolve(params: ResolveOfferParams): ResolveOfferResult {
    const { serviceType, stageId, userId, documentCount: docCountInput, couponCode } = params;

    if (!serviceType || typeof serviceType !== 'string') {
      return { offer: null, reason: 'serviceType é obrigatório.' };
    }

    const normalized = normalizeServiceType(serviceType);

    /**
     * Services that exist in the DB but do NOT have a commercial catalog entry yet.
     * Once a row is inserted into service_pricings for any of these, remove it here.
     * NOTE: This list uses CANONICAL names (post-normalization).
     */
    const servicesWithoutCommercialOffer: string[] = [
      'analise_tecnica',
      'geracao_documento',
      'relatorio_pericial',
    ];

    if (servicesWithoutCommercialOffer.includes(normalized)) {
      return {
        offer: null,
        reason: `O serviço "${normalized}" ainda não possui oferta comercial disponível.`,
      };
    }

    const pricing = this.getPricingForService(normalized);
    if (!pricing) {
      return {
        offer: null,
        reason: `Nenhuma tabela de preço cadastrada para o serviço "${normalized}".`,
      };
    }

    if (!pricing.isActive) {
      return {
        offer: null,
        reason: `A oferta para "${normalized}" está indisponível no momento.`,
      };
    }

    const now = new Date();
    if (pricing.validFrom && new Date(pricing.validFrom) > now) {
      return { offer: null, reason: `A oferta "${normalized}" ainda não está vigente.` };
    }
    if (pricing.validUntil && new Date(pricing.validUntil) < now) {
      return { offer: null, reason: `A oferta "${normalized}" expirou.` };
    }

    // Normaliza basePrice para Reais (caso esteja em centavos > 1000)
    const rawStandard = pricing.standardPrice;
    const baseAmount = round2(rawStandard > 1000 ? rawStandard / 100 : rawStandard);

    let promotionDiscount = 0;
    let promotionId: string | undefined;
    let promotionName: string | undefined;

    const activePromotions = Array.from(this.promotions.values()).filter((p) => {
      if (p.status !== 'active') return false;
      if (p.startDate && new Date(p.startDate) > now) return false;
      if (p.endDate && new Date(p.endDate) < now) return false;
      if (p.applicableServices && !p.applicableServices.includes('all') && !p.applicableServices.includes(normalized)) return false;
      return true;
    });

    if (activePromotions.length > 0) {
      const promo = activePromotions[0];
      promotionId = promo.id;
      promotionName = promo.name;
      if (promo.discountType === 'percentage') {
        promotionDiscount = round2((baseAmount * promo.discountValue) / 100);
      } else {
        const rawDisc = promo.discountValue > 1000 ? promo.discountValue / 100 : promo.discountValue;
        promotionDiscount = round2(rawDisc);
      }
    } else if (pricing.promotionalPrice !== null && pricing.promotionalPrice !== undefined) {
      const rawPromo = pricing.promotionalPrice > 1000 ? pricing.promotionalPrice / 100 : pricing.promotionalPrice;
      if (rawPromo < baseAmount) {
        promotionDiscount = round2(baseAmount - rawPromo);
        promotionName = 'Preço Promocional';
      }
    }

    const priceAfterPromo = round2(baseAmount - promotionDiscount);

    let documentNumber = 1;
    if (typeof docCountInput === 'number') {
      documentNumber = Math.max(1, docCountInput + 1);
    } else if (userId && typeof this.getDocumentCount === 'function') {
      const count = this.getDocumentCount(userId);
      documentNumber = (typeof count === 'number' ? count : 0) + 1;
    }

    const isFirstDocumentsBeneficiary = documentNumber <= 3;
    const remainingBenefitedDocuments = Math.max(0, 3 - documentNumber + 1);

    let firstDocumentsDiscount = 0;
    let finalAmount: number;
    if (isFirstDocumentsBeneficiary) {
      // 50% de desconto adicional sobre o valor pós-promoção para os 3 primeiros documentos
      firstDocumentsDiscount = round2(priceAfterPromo * 0.5);
      finalAmount = round2(priceAfterPromo - firstDocumentsDiscount);
    } else {
      finalAmount = priceAfterPromo;
    }

    let couponDiscount = 0;
    if (couponCode) {
      const code = couponCode.trim().toUpperCase();
      const coupon = this.coupons.get(code);
      if (coupon && coupon.isActive) {
        let discount = 0;
        if (coupon.discountType === 'percentage') {
          discount = round2((finalAmount * coupon.discountValue) / 100);
          if (coupon.maxDiscountAmount) {
            const maxDisc = coupon.maxDiscountAmount > 1000 ? coupon.maxDiscountAmount / 100 : coupon.maxDiscountAmount;
            discount = Math.min(discount, maxDisc);
          }
        } else {
          const rawVal = coupon.discountValue > 1000 ? coupon.discountValue / 100 : coupon.discountValue;
          discount = round2(rawVal);
        }
        couponDiscount = round2(Math.min(discount, finalAmount));
        finalAmount = round2(Math.max(0, finalAmount - couponDiscount));
      }
    }

    finalAmount = round2(Math.max(0, finalAmount));

    const offer: CommercialOfferBreakdown = {
      commercialId: pricing.id,
      serviceType: normalized,
      stageId: stageId ?? null,
      name: pricing.serviceName,
      description: pricing.description,
      baseAmount,
      promotionDiscount,
      firstDocumentsDiscount,
      couponDiscount,
      finalAmount,
      currency: 'BRL',
      promotionId,
      promotionName: promotionName || 'Promoção Vigente',
      documentNumber,
      isFirstDocumentsBeneficiary,
      remainingBenefitedDocuments,
      eligible: true,
      available: true,
      requirements: [],
    };

    return { offer };
  }

  private getPricingForService(serviceType: string): ServicePricing | undefined {
    return Array.from(this.pricings.values()).find(
      (p) => p.serviceType === serviceType || p.id === `price_${serviceType}`,
    );
  }
}