/**
 * @file index.ts
 * Public facade for the Commercial domain module.
 *
 * Consumers MUST import from here. Internal layout is an implementation detail.
 */

export { PricingService, type CreatePricingInput, type UpdatePricingInput } from './pricing/pricing-service';
export { PromotionService, type CreatePromotionInput } from './promotions/promotion-service';
export { CouponService, type CreateCouponInput, type ValidateCouponResult } from './coupons/coupon-service';
export { AffiliateService } from './affiliates/affiliate-service';
export { CommissionService, type ProcessPaymentParams } from './affiliates/commission-service';
export { CommercialAuditService } from './audit/audit-service';
export { OfferService } from './offers/offer-service';
export { OrderService } from './orders/order-service';
export type {
  CommercialOfferBreakdown,
  ResolveOfferParams,
  ResolveOfferResult,
} from './offers/offer-types';
export type { CommercialOrder, CreateOrderInput, OrderStatus } from './orders/order-types';