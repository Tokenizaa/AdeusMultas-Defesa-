/**
 * @file offer-smoke-test.ts
 * Smoke test para validar que o OfferService resolve preços corretamente.
 */

import { OfferService } from './offers/offer-service';
import type { ServicePricing, PromotionCampaign, Coupon } from '../../types/commercial';

const svc = (serviceType: ServicePricing['serviceType'], standardPrice: number, promo: number | null = null): ServicePricing => ({
  id: `price_${serviceType}`,
  serviceType,
  serviceName: serviceType,
  description: '',
  standardPrice,
  promotionalPrice: promo,
  isActive: true,
  history: [],
  updatedAt: new Date().toISOString(),
  updatedBy: 'test',
});

const promo = (id: string, discountValue: number): PromotionCampaign => ({
  id,
  name: 'Promoção de Lançamento',
  description: '',
  discountType: 'percentage',
  discountValue,
  applicableServices: ['all'],
  startDate: new Date(Date.now() - 86400000).toISOString(),
  endDate: new Date(Date.now() + 86400000).toISOString(),
  usageLimit: 9999,
  usageCount: 0,
  userUsageLimit: 9999,
  status: 'active',
  createdAt: new Date().toISOString(),
});

const offer = new OfferService(
  new Map<string, ServicePricing>([
    ['price_recurso_jari', svc('recurso_jari', 8990, 4495)],
  ]),
  new Map<string, PromotionCampaign>([
    ['promo_launch', promo('promo_launch', 50)],
  ]),
  new Map<string, Coupon>(),
  () => {},
);

function assert(label: string, actual: number, expected: number) {
  if (actual !== expected) {
    console.error(`FAIL ${label}: got ${actual}, expected ${expected}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS ${label}: ${actual}`);
  }
}

// 1º documento → 22.47 reais (base 89.90 → promo 50% → 44.95 → 50% 1º doc → 22.475→22.48 → final 22.47)
const r1 = offer.resolve({ serviceType: 'recurso_jari', documentCount: 0 });
assert('doc1 base', r1.offer?.baseAmount ?? -1, 89.9);
assert('doc1 promo', r1.offer?.promotionDiscount ?? -1, 44.95);
assert('doc1 extra', r1.offer?.firstDocumentsDiscount ?? -1, 22.48); // 44.95 * 0.5 = 22.475 → round2 = 22.48
assert('doc1 final', r1.offer?.finalAmount ?? -1, 22.47);            // 44.95 - 22.48
assert('doc1 numero', r1.offer?.documentNumber ?? -1, 1);

// 2º documento → mesma regra
const r2 = offer.resolve({ serviceType: 'recurso_jari', documentCount: 1 });
assert('doc2 final', r2.offer?.finalAmount ?? -1, 22.47);
assert('doc2 numero', r2.offer?.documentNumber ?? -1, 2);

// 3º documento
const r3 = offer.resolve({ serviceType: 'recurso_jari', documentCount: 2 });
assert('doc3 final', r3.offer?.finalAmount ?? -1, 22.47);
assert('doc3 numero', r3.offer?.documentNumber ?? -1, 3);

// 4º documento → sem 3 primeiros, só promocional = 44.95
const r4 = offer.resolve({ serviceType: 'recurso_jari', documentCount: 3 });
assert('doc4 final', r4.offer?.finalAmount ?? -1, 44.95);
assert('doc4 extra', r4.offer?.firstDocumentsDiscount ?? -1, 0);
assert('doc4 numero', r4.offer?.documentNumber ?? -1, 4);

console.log('OfferService smoke test finalizado.');