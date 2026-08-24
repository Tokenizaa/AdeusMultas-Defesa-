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
  applicableServices: ['recurso_multa'],
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
    ['price_recurso_multa', svc('recurso_multa', 8990, 4495)],
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

// 1º documento → 2248
const r1 = offer.resolve({ serviceType: 'recurso_multa', documentCount: 0 });
assert('doc1 base', r1.offer?.baseAmount ?? -1, 8990);
assert('doc1 promo', r1.offer?.promotionDiscount ?? -1, 4495);
assert('doc1 extra', r1.offer?.firstDocumentsDiscount ?? -1, 2247); // 4495-2248 = 2247 (desconto bruto)
assert('doc1 final', r1.offer?.finalAmount ?? -1, 2248);            // arredondado para cima
assert('doc1 numero', r1.offer?.documentNumber ?? -1, 1);

// 2º documento → mesma regra
const r2 = offer.resolve({ serviceType: 'recurso_multa', documentCount: 1 });
assert('doc2 final', r2.offer?.finalAmount ?? -1, 2248);
assert('doc2 numero', r2.offer?.documentNumber ?? -1, 2);

// 3º documento
const r3 = offer.resolve({ serviceType: 'recurso_multa', documentCount: 2 });
assert('doc3 final', r3.offer?.finalAmount ?? -1, 2248);
assert('doc3 numero', r3.offer?.documentNumber ?? -1, 3);

// 4º documento → sem 3 primeiros, só promocional = 4495
const r4 = offer.resolve({ serviceType: 'recurso_multa', documentCount: 3 });
assert('doc4 final', r4.offer?.finalAmount ?? -1, 4495);
assert('doc4 extra', r4.offer?.firstDocumentsDiscount ?? -1, 0);
assert('doc4 numero', r4.offer?.documentNumber ?? -1, 4);

console.log('OfferService smoke test finalizado.');