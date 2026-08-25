/**
 * @file commercial-service.ts
 * Commercial domain facade for DefesAi LegalTech Platform.
 *
 * Delegates to focused domain services while preserving the existing public API
 * used by routes and tests.
 */

import type {
  ServicePricing,
  PriceHistoryEntry,
  PromotionCampaign,
  Coupon,
  CouponUsageLog,
  BonusLedgerEntry,
  BonusLedgerType,
  BonusOrigin,
  ReferralRuleConfig,
  ReferralUserTree,
  ReferralNodeUser,
  CommissionLedgerEntry,
  CommercialAuditLogEntry,
  CommercialOverviewMetrics,
  CommercialServiceType,
  CommercialPermission,
  ProcedureType,
} from '../../types/index';
import { logger } from '../observability/logger';
import { commercialRepository } from '../db/commercial-repository';

import { PricingService, CreatePricingInput, UpdatePricingInput } from './pricing/pricing-service';
import { PromotionService, CreatePromotionInput } from './promotions/promotion-service';
import { CouponService, CreateCouponInput, ValidateCouponResult } from './coupons/coupon-service';
import { AffiliateService } from './affiliates/affiliate-service';
import { CommissionService, type ProcessPaymentParams } from './affiliates/commission-service';
import { CommercialAuditService } from './audit/audit-service';
import { OfferService } from './offers/offer-service';

class CommercialServiceFacade {
  // In-memory state
  private pricings = new Map<string, ServicePricing>();
  private promotions = new Map<string, PromotionCampaign>();
  private coupons = new Map<string, Coupon>();
  private bonusLedger: BonusLedgerEntry[] = [];
  private commissionLedger: CommissionLedgerEntry[] = [];
  private commercialAuditLogs: CommercialAuditLogEntry[] = [];
  private referralParents = new Map<string, string>();
  private referralConfig: ReferralRuleConfig = {
    level1Percent: 10,
    level2Percent: 5,
    level3Percent: 2,
    calculationBase: 'effectively_paid',
    payoutDelayDays: 0,
    minWithdrawalAmount: 50.0,
    signupBonusAmount: 20.0,
    referrerBonusAmount: 20.0,
    isReferralProgramActive: true,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system',
  };

  // Domain services
  private pricingService: PricingService;
  private promotionService: PromotionService;
  private couponService: CouponService;
  private affiliateService: AffiliateService;
  private commissionService: CommissionService;
  private auditService: CommercialAuditService;
  private offerService: OfferService;

  constructor() {
    this.auditService = new CommercialAuditService(commercialRepository);
    const audit = (entry: any) => this.auditService.record(entry);
    this.pricingService = new PricingService(
      this.pricings,
      commercialRepository,
      audit,
    );
    this.promotionService = new PromotionService(
      this.promotions,
      commercialRepository,
      audit,
    );
    this.couponService = new CouponService(
      this.coupons,
      commercialRepository,
      audit,
    );
    this.affiliateService = new AffiliateService(
      this.referralParents,
      commercialRepository,
      audit,
    );
    this.commissionService = new CommissionService(
      this.commissionLedger,
      this.referralParents,
      this.referralConfig,
      commercialRepository,
      audit,
    );
    this.offerService = new OfferService(
      this.pricings,
      this.promotions,
      this.coupons,
      audit,
    );

    // Fire-and-forget: popula cache em memória se Supabase já estiver disponível.
    // Caso contrário, o warmup() público (chamado em server.ts após dotenv)
    // recarregará os dados corretamente.
    this.loadDataFromRepository().catch(() => {});
  }

  /**
   * Recarrega dados do catálogo comercial do Supabase para a memória.
   * DEVE ser chamado em server.ts APÓS dotenv.config() — o construtor
   * é executado durante module load (antes do dotenv) e neste ponto
   * o Supabase client pode ainda estar null.
   */
  public async warmup(): Promise<void> {
    await this.loadDataFromRepository();
  }

  private async loadDataFromRepository(): Promise<void> {
    await commercialRepository.loadAllFromSupabase();

    const pricingsArray = commercialRepository.getPricings();
    this.pricings.clear();
    for (const pricing of pricingsArray) {
      this.pricings.set(pricing.id, pricing);
    }

    const promotionsArray = commercialRepository.getPromotions();
    this.promotions.clear();
    for (const promotion of promotionsArray) {
      this.promotions.set(promotion.id, promotion);
    }

    const couponsArray = commercialRepository.getCoupons();
    this.coupons.clear();
    for (const coupon of couponsArray) {
      this.coupons.set(coupon.code.toUpperCase(), coupon);
    }

    this.bonusLedger = [...commercialRepository.getBonusLedger()];
    this.commissionLedger = [...commercialRepository.getCommissionLedger()];
    this.commercialAuditLogs = [...commercialRepository.getCommercialAuditLogs()];

    this.referralParents.clear();
    const relations = commercialRepository.getReferralRelations();
    for (const relation of relations) {
      this.referralParents.set(relation.referredId, relation.referrerId);
    }

    const config = commercialRepository.getReferralConfig();
    if (config) {
      this.referralConfig = config;
      // Sync config to commission service after load
      this.commissionService = new CommissionService(
        this.commissionLedger,
        this.referralParents,
        this.referralConfig,
        commercialRepository,
        (entry) => this.auditService.record(entry),
      );
    }
  }

  // =========================================================================
  // Pricing delegation
  // =========================================================================

  public getPricings(): ServicePricing[] {
    return this.pricingService.getPricings();
  }

  public getPricingById(id: string): ServicePricing | undefined {
    return this.pricingService.getPricingById(id);
  }

  public getPricingForService(serviceType: string): ServicePricing | undefined {
    return this.pricingService.getPricingForService(serviceType);
  }

  public createPricing(data: CreatePricingInput): ServicePricing {
    return this.pricingService.createPricing(data);
  }

  public updatePricing(id: string, updates: UpdatePricingInput): ServicePricing {
    return this.pricingService.updatePricing(id, updates);
  }

  // =========================================================================
  // Promotion delegation
  // =========================================================================

  public getPromotions(): PromotionCampaign[] {
    return this.promotionService.getPromotions();
  }

  public getActivePromotions(): PromotionCampaign[] {
    return this.promotionService.getActivePromotions();
  }

  public createPromotion(data: CreatePromotionInput, author = 'Admin Comercial'): PromotionCampaign {
    return this.promotionService.createPromotion(data, author);
  }

  public updatePromotion(id: string, updates: Partial<PromotionCampaign>, author = 'Admin Comercial'): PromotionCampaign {
    return this.promotionService.updatePromotion(id, updates, author);
  }

  // =========================================================================
  // Coupon delegation
  // =========================================================================

  public getCoupons(): Coupon[] {
    return this.couponService.getCoupons();
  }

  public createCoupon(data: CreateCouponInput, author = 'Admin Comercial'): Coupon {
    return this.couponService.createCoupon(data, author);
  }

  public updateCoupon(code: string, updates: Partial<Coupon>, author = 'Admin Comercial'): Coupon {
    return this.couponService.updateCoupon(code, updates, author);
  }

  public validateCoupon(
    rawCode: string,
    orderAmount: number,
    serviceType: string,
    userId?: string,
  ): ValidateCouponResult {
    return this.couponService.validateCoupon(rawCode, orderAmount, serviceType, userId);
  }

  public redeemCoupon(
    rawCode: string,
    userId: string,
    userName: string,
    caseId: string,
    orderAmount: number,
    serviceType: string,
  ): { discountApplied: number; finalPrice: number } {
    return this.couponService.redeemCoupon(rawCode, userId, userName, caseId, orderAmount, serviceType);
  }

  // =========================================================================
  // Offer resolution
  // =========================================================================

  public resolveCommercialOffer(params: {
    serviceType: string;
    stageId?: string;
    caseData?: Record<string, unknown>;
    userId?: string;
    documentCount?: number;
    couponCode?: string;
  }): {
    offer: CommercialOffer | null;
    breakdown?: CommercialOfferBreakdown | null;
    reason?: string;
  } {
    const result = this.offerService.resolve(params);
    if (!result.offer) {
      return { offer: null, breakdown: null, reason: result.reason };
    }
    const o = result.offer;
    return {
      offer: {
        commercialId: o.commercialId,
        serviceType: o.serviceType,
        stageId: o.stageId,
        name: o.name,
        description: o.description,
        price: o.finalAmount,
        basePrice: o.baseAmount,
        promotionalDiscount: o.promotionDiscount,
        firstDocumentsDiscount: o.firstDocumentsDiscount,
        couponDiscount: o.couponDiscount,
        finalPrice: o.finalAmount,
        documentNumber: o.documentNumber,
        isFirstDocumentsBeneficiary: o.isFirstDocumentsBeneficiary,
        remainingBenefitedDocuments: o.remainingBenefitedDocuments,
        promotionName: o.promotionName,
        currency: o.currency,
        eligible: o.eligible,
        available: o.available,
        requirements: o.requirements,
      },
      breakdown: o,
      reason: result.reason,
    };
  }

  // =========================================================================
  // Bonus ledger delegation
  // =========================================================================

  public getBonusLedger(userId?: string): BonusLedgerEntry[] {
    if (userId) {
      return this.bonusLedger.filter((b) => b.userId === userId);
    }
    return this.bonusLedger;
  }

  public getUserBonusBalance(userId: string): number {
    const userEntries = this.bonusLedger.filter((b) => b.userId === userId);
    const total = userEntries.reduce((acc, curr) => acc + curr.amount, 0);
    return Math.max(0, Number(total.toFixed(2)));
  }

  public creditBonus(params: {
    userId: string;
    userName: string;
    amount: number;
    origin: BonusOrigin;
    reason: string;
    referenceId?: string;
    adminAuthor?: string;
    expiresAt?: string;
  }): BonusLedgerEntry {
    if (params.amount <= 0) {
      throw new Error('O valor do bônus deve ser positivo.');
    }

    const currentBalance = this.getUserBonusBalance(params.userId);
    const newBalance = Number((currentBalance + params.amount).toFixed(2));

    const entry: BonusLedgerEntry = {
      id: `bon_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: params.userId,
      userName: params.userName,
      type: 'CREDIT',
      amount: params.amount,
      origin: params.origin,
      reason: params.reason,
      referenceId: params.referenceId,
      adminAuthor: params.adminAuthor,
      balanceAfter: newBalance,
      createdAt: new Date().toISOString(),
      expiresAt: params.expiresAt,
    };

    this.bonusLedger.unshift(entry);
    commercialRepository.persistBonus(entry);

    this.auditService.record({
      action: 'BONUS_CREDIT',
      changedBy: params.adminAuthor || 'Sistema Comercial',
      target: params.userId,
      previousState: { balance: currentBalance },
      newState: { balance: newBalance, entry },
      reason: params.reason,
    });

    return entry;
  }

  public debitBonus(params: {
    userId: string;
    userName: string;
    amount: number;
    origin: BonusOrigin;
    reason: string;
    referenceId?: string;
    adminAuthor?: string;
  }): BonusLedgerEntry {
    if (params.amount <= 0) {
      throw new Error('O valor do débito deve ser positivo.');
    }

    const currentBalance = this.getUserBonusBalance(params.userId);
    if (currentBalance < params.amount) {
      throw new Error(`Saldo de bônus insuficiente. Disponível: R$ ${currentBalance.toFixed(2)}`);
    }

    const newBalance = Number((currentBalance - params.amount).toFixed(2));

    const entry: BonusLedgerEntry = {
      id: `bon_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: params.userId,
      userName: params.userName,
      type: 'DEBIT',
      amount: -params.amount,
      origin: params.origin,
      reason: params.reason,
      referenceId: params.referenceId,
      adminAuthor: params.adminAuthor,
      balanceAfter: newBalance,
      createdAt: new Date().toISOString(),
    };

    this.bonusLedger.unshift(entry);
    commercialRepository.persistBonus(entry);

    this.auditService.record({
      action: 'BONUS_ADJUSTMENT',
      changedBy: params.adminAuthor || 'Sistema Comercial',
      target: params.userId,
      previousState: { balance: currentBalance },
      newState: { balance: newBalance, entry },
      reason: params.reason,
    });

    return entry;
  }

  public manualAdjustmentBonus(params: {
    userId: string;
    userName: string;
    amount: number;
    reason: string;
    adminAuthor: string;
  }): BonusLedgerEntry {
    const currentBalance = this.getUserBonusBalance(params.userId);
    const newBalance = Number((currentBalance + params.amount).toFixed(2));
    if (newBalance < 0) {
      throw new Error('Ajuste resultaria em saldo negativo.');
    }

    const entry: BonusLedgerEntry = {
      id: `bon_adj_${Date.now()}`,
      userId: params.userId,
      userName: params.userName,
      type: 'ADJUSTMENT',
      amount: params.amount,
      origin: 'manual_adjustment',
      reason: params.reason,
      adminAuthor: params.adminAuthor,
      balanceAfter: newBalance,
      createdAt: new Date().toISOString(),
    };

    this.bonusLedger.unshift(entry);
    commercialRepository.persistBonus(entry);

    this.auditService.record({
      action: 'BONUS_ADJUSTMENT',
      changedBy: params.adminAuthor,
      target: params.userId,
      previousState: { balance: currentBalance },
      newState: { balance: newBalance, entry },
      reason: params.reason,
    });

    return entry;
  }

  // =========================================================================
  // Affiliate / Referral delegation
  // =========================================================================

  public getReferralConfig(): ReferralRuleConfig {
    return this.affiliateService.getReferralConfig();
  }

  public updateReferralConfig(updates: Partial<ReferralRuleConfig>, author = 'Admin Comercial'): ReferralRuleConfig {
    return this.affiliateService.updateReferralConfig(updates, author);
  }

  public registerReferral(newUserId: string, referrerCodeOrId: string): void {
    this.affiliateService.registerReferral(newUserId, referrerCodeOrId);
  }

  public getReferralTree(userId: string): ReferralUserTree {
    return this.affiliateService.getReferralTree(userId, this.commissionLedger);
  }

  // =========================================================================
  // Commission delegation
  // =========================================================================

  public processPaymentConfirmationEvent(params: ProcessPaymentParams): CommissionLedgerEntry[] {
    return this.commissionService.processPaymentConfirmationEvent(params);
  }

  public reverseCommissionsForPayment(
    paymentId: string,
    reason = 'Cancelamento de pagamento / Estorno PagBank',
    author = 'Admin Financeiro',
  ): void {
    this.commissionService.reverseCommissionsForPayment(paymentId, reason, author);
  }

  public getCommissionsLedger(beneficiaryId?: string): CommissionLedgerEntry[] {
    return this.commissionService.getCommissionsLedger(beneficiaryId);
  }

  public markCommissionPaid(commissionId: string, author = 'Admin Financeiro'): CommissionLedgerEntry {
    return this.commissionService.markCommissionPaid(commissionId, author);
  }

  // =========================================================================
  // Metrics & Audit delegation
  // =========================================================================

  public getCommercialMetrics(): CommercialOverviewMetrics {
    const totalComms = this.commissionLedger.filter((c) => c.status !== 'REVERSED');
    const totalRev = totalComms.reduce((acc, c) => acc + c.baseAmount, 0);
    const totalCommsAmount = totalComms.reduce((acc, c) => acc + c.commissionAmount, 0);
    const pendingComms = this.commissionLedger
      .filter((c) => c.status === 'PENDING' || c.status === 'AVAILABLE')
      .reduce((acc, c) => acc + c.commissionAmount, 0);
    const paidComms = this.commissionLedger
      .filter((c) => c.status === 'PAID')
      .reduce((acc, c) => acc + c.commissionAmount, 0);
    const totalBonuses = this.bonusLedger.reduce((acc, b) => acc + b.amount, 0);

    const paidCommissionEntries = this.commissionLedger.filter((c) => c.status === 'PAID');
    const paidPaymentIds = new Set(paidCommissionEntries.map((c) => c.paymentId).filter((id): id is string => !!id));
    const totalPaidOrders = paidPaymentIds.size;
    const averageTicket = totalPaidOrders > 0 ? totalRev / totalPaidOrders : 0;

    return {
      totalRevenueGMV: Number(totalRev.toFixed(2)),
      totalPaidOrders,
      averageTicket: Number(averageTicket.toFixed(2)),
      totalCommissionsGenerated: Number(totalCommsAmount.toFixed(2)),
      totalCommissionsPending: Number(pendingComms.toFixed(2)),
      totalCommissionsPaid: Number(paidComms.toFixed(2)),
      totalActiveBonuses: Math.max(0, Number(totalBonuses.toFixed(2))),
      totalReferralsCount: this.referralParents.size,
      couponsRedeemedCount: Array.from(this.coupons.values()).reduce((acc, c) => acc + c.usedCount, 0),
      activePromotionsCount: Array.from(this.promotions.values()).filter((p) => p.status === 'active').length,
      activeCouponsCount: Array.from(this.coupons.values()).filter((c) => c.isActive).length,
    };
  }

  public getCommercialAuditLogs(): CommercialAuditLogEntry[] {
    return this.auditService.getAuditLogs();
  }
}

export interface CommercialOffer {
  commercialId: string;
  serviceType: string;
  stageId: string | null;
  name: string;
  description: string;
  price: number;
  basePrice?: number;
  promotionalDiscount?: number;
  firstDocumentsDiscount?: number;
  couponDiscount?: number;
  finalPrice?: number;
  documentNumber?: number;
  isFirstDocumentsBeneficiary?: boolean;
  remainingBenefitedDocuments?: number;
  promotionName?: string;
  currency: string;
  eligible: boolean;
  available: boolean;
  requirements: string[];
}

export { CommercialServiceFacade as CommercialService };
export const commercialService = new CommercialServiceFacade();