/**
 * Commercial Domain Types for DefesAi LegalTech Platform
 * 
 * Manages Pricing, Promotional Campaigns, Coupons, Bonus Ledgers,
 * Multi-Level Referral (3 Levels), Commission Ledgers, and Commercial Settings.
 * 
 * Strictly separated from the Case Analysis/Legal Rule Engine.
 */

import { ProcedureType } from './index';

/**
 * Canonical commercial service types — must match service_pricings.service_type in DB.
 * Any addition/removal requires a DB migration + this type update.
 */
export type CommercialServiceType =
  | 'defesa_previa'
  | 'recurso_jari'
  | 'recurso_cetran'
  | 'suspensao'
  | 'cassacao'
  | 'indicacao_condutor'
  | 'conversao_advertencia';

export interface PriceHistoryEntry {
  id: string;
  previousStandardPrice: number;
  newStandardPrice: number;
  previousPromoPrice: number | null;
  newPromoPrice: number | null;
  reason: string;
  changedBy: string;
  changedAt: string;
}

export interface ServicePricing {
  id: string;
  serviceType: CommercialServiceType;
  serviceName: string;
  description: string;
  standardPrice: number;
  promotionalPrice: number | null;
  isActive: boolean;
  validFrom?: string;
  validUntil?: string;
  history: PriceHistoryEntry[];
  updatedAt: string;
  updatedBy: string;
}

export type DiscountType = 'percentage' | 'fixed_amount' | 'special_price' | 'first_purchase';

export interface PromotionCampaign {
  id: string;
  name: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  applicableServices: string[]; // ['all'] or specific service types
  startDate: string;
  endDate: string;
  usageLimit: number;
  usageCount: number;
  userUsageLimit: number;
  promoCode?: string;
  status: 'active' | 'scheduled' | 'expired' | 'paused';
  createdAt: string;
  updatedAt?: string;
}

export interface CouponUsageLog {
  id: string;
  userId: string;
  userName: string;
  caseId: string;
  orderAmount: number;
  discountApplied: number;
  usedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  minOrderValue?: number;
  maxDiscountAmount?: number;
  applicableServices: string[];
  totalLimit: number;
  usedCount: number;
  totalUsed?: number;
  userLimit: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  createdAt: string;
  usageHistory: CouponUsageLog[];
}

export type BonusLedgerType = 'CREDIT' | 'DEBIT' | 'EXPIRATION' | 'REVERSAL' | 'ADJUSTMENT';

export type BonusOrigin =
  | 'signup'
  | 'referral'
  | 'campaign'
  | 'manual_adjustment'
  | 'checkout_redemption'
  | 'refund_reversal';

export interface BonusLedgerEntry {
  id: string;
  userId: string;
  userName: string;
  type: BonusLedgerType;
  amount: number;
  origin: BonusOrigin;
  reason: string;
  referenceId?: string; // Order / Payment / Referral ID
  adminAuthor?: string;
  balanceAfter: number;
  createdAt: string;
  expiresAt?: string;
}

export type CommissionCalculationBase =
  | 'gross_amount'
  | 'net_amount'
  | 'after_discount'
  | 'effectively_paid';

export interface ReferralRuleConfig {
  level1Percent: number; // e.g. 10
  level2Percent: number; // e.g. 5
  level3Percent: number; // e.g. 2
  calculationBase: CommissionCalculationBase;
  payoutDelayDays: number;
  minWithdrawalAmount: number;
  signupBonusAmount: number;
  referrerBonusAmount: number;
  isReferralProgramActive: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface ReferralNodeUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  joinedAt: string;
  purchasesCount: number;
  revenueGenerated: number;
  commissionGeneratedForReferrer: number;
}

export interface ReferralUserTree {
  referrerId: string;
  referrerName: string;
  referrerEmail: string;
  referralCode: string;
  referralLink: string;
  level1: ReferralNodeUser[];
  level2: ReferralNodeUser[];
  level3: ReferralNodeUser[];
  totalReferralsCount: number;
  totalSalesCount: number;
  totalRevenueGenerated: number;
  totalCommissionsEarned: number;
  availableCommissionBalance: number;
  bonusBalance: number;
}

export type CommissionStatus = 'PENDING' | 'AVAILABLE' | 'PAID' | 'REVERSED' | 'CANCELLED';

export interface CommissionLedgerEntry {
  id: string;
  beneficiaryId: string;
  beneficiaryName: string;
  buyerUserId: string;
  buyerUserName: string;
  level: 1 | 2 | 3;
  appliedPercent: number; // Frozen at transaction time
  baseAmount: number;
  commissionAmount: number;
  paymentId: string;
  caseId: string;
  status: CommissionStatus;
  createdAt: string;
  availableAt?: string;
  paidAt?: string;
  reversedAt?: string;
  reversalReason?: string;
}

export interface CommercialAuditLogEntry {
  id: string;
  action:
    | 'PRICE_CHANGE'
    | 'PROMO_CHANGE'
    | 'COUPON_CHANGE'
    | 'BONUS_CREDIT'
    | 'BONUS_ADJUSTMENT'
    | 'REFERRAL_CONFIG_CHANGE'
    | 'COMMISSION_PAYOUT'
    | 'COMMISSION_REVERSAL';
  changedBy: string;
  target: string;
  previousState: any;
  newState: any;
  reason?: string;
  timestamp: string;
}

export type CommercialPermission =
  | 'commercial.view'
  | 'commercial.prices'
  | 'commercial.promotions'
  | 'commercial.coupons'
  | 'commercial.bonuses'
  | 'commercial.referrals'
  | 'commercial.commissions'
  | 'commercial.settings';

export interface CouponValidationResult {
  valid: boolean;
  message: string;
  discountAmount: number;
  finalPrice: number;
  coupon?: Coupon;
}

export type ReferralConfig = ReferralRuleConfig;

export interface ReferralTreeResponse {
  referrerId: string;
  userName: string;
  level1: any[];
  level2: any[];
  level3: any[];
  totalReferralsCount: number;
  totalRevenueGenerated: number;
  totalCommissionsEarned: number;
}

export type CommercialAuditEntry = CommercialAuditLogEntry;

export interface CommercialOverviewMetrics {
  totalRevenueGMV: number;
  totalPaidOrders: number;
  averageTicket: number;
  totalCommissionsGenerated: number;
  totalCommissionsPending: number;
  totalCommissionsPaid: number;
  totalActiveBonuses: number;
  totalReferralsCount: number;
  couponsRedeemedCount: number;
  activePromotionsCount: number;
  activeCouponsCount: number;
}
