/**
 * @file commercial-service.ts
 * Centralized Commercial Management Service for DefesAi LegalTech Platform
 * 
 * Provides:
 * 1. Service Pricing & Historical Price Versioning
 * 2. Promotional Campaigns Engine
 * 3. Coupon Validation & Redemption Tracking
 * 4. Bonus Ledger & Immutable Balance Engine (Credits, Debits, Expirations, Reversals)
 * 5. 3-Level Referral Tree & Commission Engine (Frozen Percentiles, Payment Event Triggered, Reversals)
 * 6. Audit Trail for all Financial & Commercial modifications
 */

import {
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
} from '../../types/commercial';
import { logger } from '../observability/logger';
import { commercialRepository } from '../db/commercial-repository';
import { PRICING } from '../config/pricing';

class CommercialService {
  private pricings: Map<string, ServicePricing> = new Map();
  private promotions: Map<string, PromotionCampaign> = new Map();
  private coupons: Map<string, Coupon> = new Map();
  private bonusLedger: BonusLedgerEntry[] = [];
  private commissionLedger: CommissionLedgerEntry[] = [];
  private commercialAuditLogs: CommercialAuditLogEntry[] = [];

  // Referral relationship map: childUserId -> parentUserId
  private referralParents: Map<string, string> = new Map();

  // Global Referral Configuration
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

  constructor() {
    this.loadDataFromRepository();
  }

  
  private async loadDataFromRepository(): Promise<void> {
    // Load all data from Supabase repository
    await commercialRepository.loadAllFromSupabase();
    
    // Populate service internal state from repository getters
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
    
    // Rebuild referralParents map from referral relations
    this.referralParents.clear();
    const relations = commercialRepository.getReferralRelations();
    for (const relation of relations) {
      this.referralParents.set(relation.referredId, relation.referrerId);
    }
    
    // Set referral config
    const config = commercialRepository.getReferralConfig();
    if (config) {
      this.referralConfig = config;
    }
  }

  // 1. GESTÃO DE PREÇOS
  // =========================================================================

  public getPricings(): ServicePricing[] {
    return Array.from(this.pricings.values());
  }

  public getPricingById(id: string): ServicePricing | undefined {
    return this.pricings.get(id);
  }

  public getPricingForService(serviceType: string): ServicePricing | undefined {
    return Array.from(this.pricings.values()).find(
      (p) => p.serviceType === serviceType || p.id === `price_${serviceType}`
    ) || Array.from(this.pricings.values())[0];
  }
  public createPricing(data: Omit<ServicePricing, 'id' | 'history' | 'updatedAt' | 'updatedBy'>): ServicePricing {
    // Generate ID based on serviceType
    const baseId = `price_${data.serviceType}`;
    let id = baseId;
    let counter = 1;
    
    // Ensure ID is unique
    while (this.pricings.has(id)) {
      id = `${baseId}_${counter}`;
      counter++;
    }
    
    // Create new pricing with default values for missing fields
    const now = new Date().toISOString();
    const newPricing: ServicePricing = {
      id,
      serviceType: data.serviceType,
      serviceName: data.serviceName,
      description: data.description,
      standardPrice: data.standardPrice,
      promotionalPrice: data.promotionalPrice ?? null,
      isActive: data.isActive ?? true,
      validFrom: data.validFrom,
      validUntil: data.validUntil,
      history: [],
      updatedAt: now,
      updatedBy: 'Admin Comercial',
    };
    
    // Add to pricings map
    this.pricings.set(id, newPricing);
    
    // Create initial history entry for creation
    const historyEntry: PriceHistoryEntry = {
      id: `ph_${Date.now()}`,
      previousStandardPrice: 0,
      newStandardPrice: data.standardPrice,
      previousPromoPrice: null,
      newPromoPrice: data.promotionalPrice ?? null,
      reason: 'Criação de nova tabela de preço',
      changedBy: 'Admin Comercial',
      changedAt: now,
    };
    
    // Initialize history array
    newPricing.history = [historyEntry];
    
    return newPricing;
  }
  public updatePricing(
    id: string,
    updates: {
      standardPrice: number;
      promotionalPrice: number | null;
      isActive?: boolean;
      validFrom?: string;
      validUntil?: string;
      reason: string;
      changedBy: string;
    }
  ): ServicePricing {
    const existing = this.pricings.get(id);
    if (!existing) {
      throw new Error(`Tabela de preço não encontrada: ${id}`);
    }

    const previousState = {
      standardPrice: existing.standardPrice,
      promotionalPrice: existing.promotionalPrice,
      isActive: existing.isActive,
    };

    const historyEntry: PriceHistoryEntry = {
      id: `ph_${Date.now()}`,
      previousStandardPrice: existing.standardPrice,
      newStandardPrice: updates.standardPrice,
      previousPromoPrice: existing.promotionalPrice,
      newPromoPrice: updates.promotionalPrice,
      reason: updates.reason || 'Atualização de precificação comercial',
      changedBy: updates.changedBy || 'Admin Comercial',
      changedAt: new Date().toISOString(),
    };

    existing.standardPrice = updates.standardPrice;
    existing.promotionalPrice = updates.promotionalPrice;
    if (typeof updates.isActive === 'boolean') {
      existing.isActive = updates.isActive;
    }
    if (updates.validFrom) existing.validFrom = updates.validFrom;
    if (updates.validUntil) existing.validUntil = updates.validUntil;
    existing.updatedAt = new Date().toISOString();
    existing.updatedBy = updates.changedBy || 'Admin Comercial';
    existing.history.unshift(historyEntry);

    this.pricings.set(id, existing);
    commercialRepository.persistPricing(existing);

    // Record Audit Log
    this.recordAudit({
      action: 'PRICE_CHANGE',
      changedBy: updates.changedBy || 'Admin Comercial',
      target: id,
      previousState,
      newState: {
        standardPrice: existing.standardPrice,
        promotionalPrice: existing.promotionalPrice,
        isActive: existing.isActive,
      },
      reason: updates.reason,
    });

    return existing;
  }

  // =========================================================================
  // 2. PROMOÇÕES
  // =========================================================================

  public getPromotions(): PromotionCampaign[] {
    return Array.from(this.promotions.values());
  }

  public createPromotion(data: Omit<PromotionCampaign, 'id' | 'usageCount' | 'createdAt'>, author = 'Admin Comercial'): PromotionCampaign {
    const id = `promo_${Date.now()}`;
    const newPromo: PromotionCampaign = {
      ...data,
      id,
      usageCount: 0,
      createdAt: new Date().toISOString(),
    };

    this.promotions.set(id, newPromo);
    commercialRepository.persistPromotion(newPromo);

    this.recordAudit({
      action: 'PROMO_CHANGE',
      changedBy: author,
      target: id,
      previousState: null,
      newState: newPromo,
      reason: `Criação da promoção: ${newPromo.name}`,
    });

    return newPromo;
  }

  public updatePromotion(id: string, updates: Partial<PromotionCampaign>, author = 'Admin Comercial'): PromotionCampaign {
    const promo = this.promotions.get(id);
    if (!promo) {
      throw new Error(`Promoção não encontrada: ${id}`);
    }

    const previousState = { ...promo };
    const updated = {
      ...promo,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.promotions.set(id, updated);
    commercialRepository.persistPromotion(updated);

    this.recordAudit({
      action: 'PROMO_CHANGE',
      changedBy: author,
      target: id,
      previousState,
      newState: updated,
      reason: `Atualização da promoção: ${updated.name}`,
    });

    return updated;
  }

  // =========================================================================
  // 3. GESTÃO DE CUPONS
  // =========================================================================

  public getCoupons(): Coupon[] {
    return Array.from(this.coupons.values());
  }

  public createCoupon(data: Omit<Coupon, 'id' | 'usedCount' | 'createdAt' | 'usageHistory'>, author = 'Admin Comercial'): Coupon {
    const code = data.code.trim().toUpperCase();
    if (this.coupons.has(code)) {
      throw new Error(`Cupom com o código '${code}' já existe.`);
    }

    const id = `cupom_${Date.now()}`;
    const newCoupon: Coupon = {
      ...data,
      id,
      code,
      usedCount: 0,
      createdAt: new Date().toISOString(),
      usageHistory: [],
    };

    this.coupons.set(code, newCoupon);
    commercialRepository.persistCoupon(newCoupon);

    this.recordAudit({
      action: 'COUPON_CHANGE',
      changedBy: author,
      target: code,
      previousState: null,
      newState: newCoupon,
      reason: `Criação de novo cupom: ${code}`,
    });

    return newCoupon;
  }

  public updateCoupon(code: string, updates: Partial<Coupon>, author = 'Admin Comercial'): Coupon {
    const cleanCode = code.trim().toUpperCase();
    const coupon = this.coupons.get(cleanCode);
    if (!coupon) {
      throw new Error(`Cupom não encontrado: ${code}`);
    }

    const previousState = { ...coupon };
    const updated = {
      ...coupon,
      ...updates,
    };

    this.coupons.set(cleanCode, updated);
    commercialRepository.persistCoupon(updated);

    this.recordAudit({
      action: 'COUPON_CHANGE',
      changedBy: author,
      target: cleanCode,
      previousState,
      newState: updated,
      reason: `Atualização de parâmetros do cupom: ${cleanCode}`,
    });

    return updated;
  }

  public validateCoupon(
    rawCode: string,
    orderAmount: number,
    serviceType: string,
    userId?: string
  ): { valid: boolean; discountAmount: number; finalPrice: number; message: string; coupon?: Coupon } {
    const code = rawCode.trim().toUpperCase();
    const coupon = this.coupons.get(code);

    if (!coupon) {
      return { valid: false, discountAmount: 0, finalPrice: orderAmount, message: 'Cupom inválido ou não cadastrado.' };
    }

    if (!coupon.isActive) {
      return { valid: false, discountAmount: 0, finalPrice: orderAmount, message: 'Este cupom está desativado.' };
    }

    const now = new Date();
    if (new Date(coupon.validFrom) > now) {
      return { valid: false, discountAmount: 0, finalPrice: orderAmount, message: 'Este cupom ainda não é válido.' };
    }

    if (new Date(coupon.validUntil) < now) {
      return { valid: false, discountAmount: 0, finalPrice: orderAmount, message: 'Este cupom expirou.' };
    }

    if (coupon.usedCount >= coupon.totalLimit) {
      return { valid: false, discountAmount: 0, finalPrice: orderAmount, message: 'Limite total de usos deste cupom foi atingido.' };
    }

    if (coupon.minOrderValue && orderAmount < coupon.minOrderValue) {
      return {
        valid: false,
        discountAmount: 0,
        finalPrice: orderAmount,
        message: `Valor mínimo para este cupom é de R$ ${coupon.minOrderValue.toFixed(2)}.`,
      };
    }

    if (!coupon.applicableServices.includes('all') && !coupon.applicableServices.includes(serviceType)) {
      return {
        valid: false,
        discountAmount: 0,
        finalPrice: orderAmount,
        message: 'Este cupom não é aplicável ao tipo de serviço selecionado.',
      };
    }

    if (userId) {
      const userUsage = coupon.usageHistory.filter((u) => u.userId === userId).length;
      if (userUsage >= coupon.userLimit) {
        return {
          valid: false,
          discountAmount: 0,
          finalPrice: orderAmount,
          message: 'Você já atingiu o limite de utilizações para este cupom.',
        };
      }
    }

    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (orderAmount * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    } else {
      discount = coupon.discountValue;
    }

    discount = Math.min(discount, orderAmount);
    const finalPrice = Math.max(0, orderAmount - discount);

    return {
      valid: true,
      discountAmount: Number(discount.toFixed(2)),
      finalPrice: Number(finalPrice.toFixed(2)),
      message: `Cupom ${code} aplicado com sucesso!`,
      coupon,
    };
  }

  public redeemCoupon(
    rawCode: string,
    userId: string,
    userName: string,
    caseId: string,
    orderAmount: number,
    serviceType: string
  ): { discountApplied: number; finalPrice: number } {
    const validation = this.validateCoupon(rawCode, orderAmount, serviceType, userId);
    if (!validation.valid || !validation.coupon) {
      throw new Error(validation.message);
    }

    const coupon = validation.coupon;
    coupon.usedCount += 1;
    coupon.usageHistory.push({
      id: `cup_use_${Date.now()}`,
      userId,
      userName,
      caseId,
      orderAmount,
      discountApplied: validation.discountAmount,
      usedAt: new Date().toISOString(),
    });

    this.coupons.set(coupon.code, coupon);
    commercialRepository.persistCoupon(coupon);

    return {
      discountApplied: validation.discountAmount,
      finalPrice: validation.finalPrice,
    };
  }

  // =========================================================================
  // 4. SISTEMA DE BÔNUS COM LEDGER IMUTÁVEL
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

    this.recordAudit({
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

    this.recordAudit({
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
    amount: number; // positive or negative
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

    this.recordAudit({
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
  // 5. SISTEMA DE INDICAÇÃO EM 3 NÍVEIS & COMISSÕES
  // =========================================================================

  public getReferralConfig(): ReferralRuleConfig {
    return { ...this.referralConfig };
  }

  public updateReferralConfig(updates: Partial<ReferralRuleConfig>, author = 'Admin Comercial'): ReferralRuleConfig {
    const previousState = { ...this.referralConfig };
    this.referralConfig = {
      ...this.referralConfig,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: author,
    };
    commercialRepository.persistReferralConfig(this.referralConfig);

    this.recordAudit({
      action: 'REFERRAL_CONFIG_CHANGE',
      changedBy: author,
      target: 'referral_config',
      previousState,
      newState: this.referralConfig,
      reason: 'Atualização das taxas e regras do programa de indicação em 3 níveis',
    });

    return this.referralConfig;
  }

  public registerReferral(newUserId: string, referrerCodeOrId: string) {
    if (newUserId === referrerCodeOrId) return;

    // Resolve referrer ID
    let referrerId = referrerCodeOrId;
    if (referrerCodeOrId.startsWith('REF_')) {
      referrerId = referrerCodeOrId.replace('REF_', 'usr_').toLowerCase();
    }

    this.referralParents.set(newUserId, referrerId);
    commercialRepository.persistReferralRelation(newUserId, referrerId);

    // Credit signup bonus for the new user
    if (this.referralConfig.signupBonusAmount > 0) {
      this.creditBonus({
        userId: newUserId,
        userName: `Condutor Indicado (${newUserId})`,
        amount: this.referralConfig.signupBonusAmount,
        origin: 'signup',
        reason: 'Bônus por cadastro via link de indicação',
        referenceId: referrerId,
      });
    }

    logger.info('commercial', 'referral', 'registered', `Usuário ${newUserId} vinculado ao indicador ${referrerId}`, {
      newUserId,
      referrerId,
    });
  }

  /**
   * Dispatches Commercial Payment Event
   * Triggered ONLY when payment is confirmed (e.g. PagBank approved order).
   * Generates 3-level commissions with frozen percentiles and prevents double-dipping.
   */
  public processPaymentConfirmationEvent(params: {
    paymentId: string;
    caseId: string;
    buyerUserId: string;
    buyerUserName: string;
    grossAmount: number;
    discountAmount: number;
    effectivelyPaid: number;
  }): CommissionLedgerEntry[] {
    const { paymentId, caseId, buyerUserId, buyerUserName, grossAmount, discountAmount, effectivelyPaid } = params;

    // Idempotency check: prevent duplicate commission creation for the same payment
    const existing = this.commissionLedger.filter((c) => c.paymentId === paymentId);
    if (existing.length > 0) {
      logger.warn('commercial', 'commissions', 'duplicate_prevented', `Comissões já geradas para o pagamento ${paymentId}`, {
        paymentId,
      });
      return existing;
    }

    if (!this.referralConfig.isReferralProgramActive) {
      return [];
    }

    // Determine calculation base
    let baseAmount = effectivelyPaid;
    if (this.referralConfig.calculationBase === 'gross_amount') {
      baseAmount = grossAmount;
    } else if (this.referralConfig.calculationBase === 'after_discount') {
      baseAmount = grossAmount - discountAmount;
    } else if (this.referralConfig.calculationBase === 'net_amount') {
      baseAmount = effectivelyPaid * 0.95; // e.g. net of gateway fee
    }

    const createdCommissions: CommissionLedgerEntry[] = [];

    // 1. Level 1 Referrer
    const l1ParentId = this.referralParents.get(buyerUserId);
    if (l1ParentId && this.referralConfig.level1Percent > 0) {
      const commAmount = Number(((baseAmount * this.referralConfig.level1Percent) / 100).toFixed(2));
      const entry: CommissionLedgerEntry = {
        id: `comm_${Date.now()}_l1_${l1ParentId}`,
        beneficiaryId: l1ParentId,
        beneficiaryName: `Indicador N1 (${l1ParentId})`,
        buyerUserId,
        buyerUserName,
        level: 1,
        appliedPercent: this.referralConfig.level1Percent,
        baseAmount,
        commissionAmount: commAmount,
        paymentId,
        caseId,
        status: this.referralConfig.payoutDelayDays === 0 ? 'AVAILABLE' : 'PENDING',
        createdAt: new Date().toISOString(),
        availableAt: new Date(Date.now() + this.referralConfig.payoutDelayDays * 86400000).toISOString(),
      };
      this.commissionLedger.unshift(entry);
      commercialRepository.persistCommission(entry);
      createdCommissions.push(entry);

      // 2. Level 2 Referrer
      const l2ParentId = this.referralParents.get(l1ParentId);
      if (l2ParentId && this.referralConfig.level2Percent > 0) {
        const commAmountL2 = Number(((baseAmount * this.referralConfig.level2Percent) / 100).toFixed(2));
        const entryL2: CommissionLedgerEntry = {
          id: `comm_${Date.now()}_l2_${l2ParentId}`,
          beneficiaryId: l2ParentId,
          beneficiaryName: `Indicador N2 (${l2ParentId})`,
          buyerUserId,
          buyerUserName,
          level: 2,
          appliedPercent: this.referralConfig.level2Percent,
          baseAmount,
          commissionAmount: commAmountL2,
          paymentId,
          caseId,
          status: this.referralConfig.payoutDelayDays === 0 ? 'AVAILABLE' : 'PENDING',
          createdAt: new Date().toISOString(),
          availableAt: new Date(Date.now() + this.referralConfig.payoutDelayDays * 86400000).toISOString(),
        };
        this.commissionLedger.unshift(entryL2);
        commercialRepository.persistCommission(entryL2);
        createdCommissions.push(entryL2);

        // 3. Level 3 Referrer
        const l3ParentId = this.referralParents.get(l2ParentId);
        if (l3ParentId && this.referralConfig.level3Percent > 0) {
          const commAmountL3 = Number(((baseAmount * this.referralConfig.level3Percent) / 100).toFixed(2));
          const entryL3: CommissionLedgerEntry = {
            id: `comm_${Date.now()}_l3_${l3ParentId}`,
            beneficiaryId: l3ParentId,
            beneficiaryName: `Indicador N3 (${l3ParentId})`,
            buyerUserId,
            buyerUserName,
            level: 3,
            appliedPercent: this.referralConfig.level3Percent,
            baseAmount,
            commissionAmount: commAmountL3,
            paymentId,
            caseId,
            status: this.referralConfig.payoutDelayDays === 0 ? 'AVAILABLE' : 'PENDING',
            createdAt: new Date().toISOString(),
            availableAt: new Date(Date.now() + this.referralConfig.payoutDelayDays * 86400000).toISOString(),
          };
          this.commissionLedger.unshift(entryL3);
          commercialRepository.persistCommission(entryL3);
          createdCommissions.push(entryL3);
        }
      }
    }

    logger.info('commercial', 'commissions', 'calculated', `Comissões processadas para o pagamento ${paymentId} (${createdCommissions.length} níveis)`, {
      paymentId,
      commissionsCount: createdCommissions.length,
      totalCommissionValue: createdCommissions.reduce((acc, c) => acc + c.commissionAmount, 0),
    });

    return createdCommissions;
  }

  /**
   * Handles Payment Reversal / Chargeback / Cancellation
   * Reverses all associated commissions.
   */
  public reverseCommissionsForPayment(paymentId: string, reason = 'Cancelamento de pagamento / Estorno PagBank', author = 'Admin Financeiro') {
    const comms = this.commissionLedger.filter((c) => c.paymentId === paymentId && c.status !== 'REVERSED');
    for (const comm of comms) {
      const prev = { ...comm };
      comm.status = 'REVERSED';
      comm.reversedAt = new Date().toISOString();
      comm.reversalReason = reason;

      this.recordAudit({
        action: 'COMMISSION_REVERSAL',
        changedBy: author,
        target: comm.id,
        previousState: prev,
        newState: comm,
        reason,
      });
    }

    if (comms.length > 0) {
      const reversedAt = comms[0].reversedAt;
      commercialRepository.updateCommissionsStatus(paymentId, 'REVERSED', {
        reversedAt,
        reversalReason: reason,
      });
    }

    logger.warn('commercial', 'commissions', 'reversed', `Comissões revertidas para o pagamento ${paymentId}`, {
      paymentId,
      reversedCount: comms.length,
    });
  }

  public getCommissionsLedger(beneficiaryId?: string): CommissionLedgerEntry[] {
    if (beneficiaryId) {
      return this.commissionLedger.filter((c) => c.beneficiaryId === beneficiaryId);
    }
    return this.commissionLedger;
  }

  public markCommissionPaid(commissionId: string, author = 'Admin Financeiro'): CommissionLedgerEntry {
    const comm = this.commissionLedger.find((c) => c.id === commissionId);
    if (!comm) {
      throw new Error(`Comissão não encontrada: ${commissionId}`);
    }

    if (comm.status === 'REVERSED' || comm.status === 'CANCELLED') {
      throw new Error(`Não é possível pagar comissão com status ${comm.status}`);
    }

    const prev = { ...comm };
    comm.status = 'PAID';
    comm.paidAt = new Date().toISOString();

    commercialRepository.updateCommissionsStatus(comm.paymentId, 'PAID', {
      paidAt: comm.paidAt,
      level: comm.level,
    });

    this.recordAudit({
      action: 'COMMISSION_PAYOUT',
      changedBy: author,
      target: comm.id,
      previousState: prev,
      newState: comm,
      reason: 'Pagamento de comissão liquidado',
    });

    return comm;
  }

  /**
   * Generates Full 3-Level Referral Tree for a user
   */
  public getReferralTree(userId: string): ReferralUserTree {
    const l1Ids: string[] = [];
    for (const [child, parent] of this.referralParents.entries()) {
      if (parent === userId) l1Ids.push(child);
    }

    const l2Ids: string[] = [];
    for (const l1 of l1Ids) {
      for (const [child, parent] of this.referralParents.entries()) {
        if (parent === l1) l2Ids.push(child);
      }
    }

    const l3Ids: string[] = [];
    for (const l2 of l2Ids) {
      for (const [child, parent] of this.referralParents.entries()) {
        if (parent === l2) l3Ids.push(child);
      }
    }

    const mapUserNode = (id: string, level: 1 | 2 | 3): ReferralNodeUser => {
      const comms = this.commissionLedger.filter((c) => c.beneficiaryId === userId && c.buyerUserId === id);
      const rev = comms.reduce((acc, c) => acc + c.baseAmount, 0);
      const earned = comms.filter((c) => c.status !== 'REVERSED' && c.status !== 'CANCELLED').reduce((acc, c) => acc + c.commissionAmount, 0);

      return {
        id,
        name: id === 'usr_beatriz' ? 'Beatriz Santos' : id === 'usr_andre' ? 'André Oliveira' : id === 'usr_daniela' ? 'Daniela Ferreira' : `Condutor ${id}`,
        email: `${id}@defesai.com.br`,
        joinedAt: new Date(Date.now() - (level === 1 ? 20 : level === 2 ? 12 : 4) * 86400000).toISOString(),
        purchasesCount: comms.length,
        revenueGenerated: Number(rev.toFixed(2)),
        commissionGeneratedForReferrer: Number(earned.toFixed(2)),
      };
  }
    const level1 = l1Ids.map((id) => mapUserNode(id, 1));
    const level2 = l2Ids.map((id) => mapUserNode(id, 2));
    const level3 = l3Ids.map((id) => mapUserNode(id, 3));

    const totalReferrals = level1.length + level2.length + level3.length;
    const allUserComms = this.commissionLedger.filter((c) => c.beneficiaryId === userId);
    const totalComms = allUserComms.filter((c) => c.status !== 'REVERSED').reduce((acc, c) => acc + c.commissionAmount, 0);
    const paidComms = allUserComms.filter((c) => c.status === 'PAID').reduce((acc, c) => acc + c.commissionAmount, 0);
    const availComms = allUserComms.filter((c) => c.status === 'AVAILABLE').reduce((acc, c) => acc + c.commissionAmount, 0);

    return {
      referrerId: userId,
      referrerName: userId === 'usr_carlos' ? 'Carlos Eduardo Silveira' : `Indicador (${userId})`,
      referrerEmail: `${userId}@defesai.com.br`,
      referralCode: `REF_${userId.toUpperCase()}`,
      referralLink: `https://app.defesai.com.br/r/REF_${userId.toUpperCase()}`,
      level1,
      level2,
      level3,
      totalReferralsCount: totalReferrals,
      totalSalesCount: allUserComms.length,
      totalRevenueGenerated: allUserComms.reduce((acc, c) => acc + c.baseAmount, 0),
      totalCommissionsEarned: Number(totalComms.toFixed(2)),
      availableCommissionBalance: Number(availComms.toFixed(2)),
      bonusBalance: this.getUserBonusBalance(userId),
    };
  }

  // =========================================================================
  // 6. OVERVIEW METRICS & AUDIT
  // =========================================================================

  public getCommercialMetrics(): CommercialOverviewMetrics {
    const totalComms = this.commissionLedger.filter((c) => c.status !== 'REVERSED');
    const totalRev = totalComms.reduce((acc, c) => acc + c.baseAmount, 0);
    const totalCommsAmount = totalComms.reduce((acc, c) => acc + c.commissionAmount, 0);
    const pendingComms = this.commissionLedger.filter((c) => c.status === 'PENDING' || c.status === 'AVAILABLE').reduce((acc, c) => acc + c.commissionAmount, 0);
    const paidComms = this.commissionLedger.filter((c) => c.status === 'PAID').reduce((acc, c) => acc + c.commissionAmount, 0);
    const totalBonuses = this.bonusLedger.reduce((acc, b) => acc + b.amount, 0);

    // Compute totalPaidOrders from distinct paymentIds with status PAID
    const paidCommissionEntries = this.commissionLedger.filter((c) => c.status === 'PAID');
    const paidPaymentIds = new Set(paidCommissionEntries.map((c) => c.paymentId).filter((id): id is string => !!id));
    const totalPaidOrders = paidPaymentIds.size;

    // Compute averageTicket from real data (totalRevenueGMV / totalPaidOrders or fallback)
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
    return this.commercialAuditLogs;
  }

  private recordAudit(entry: Omit<CommercialAuditLogEntry, 'id' | 'timestamp'>) {
    const log: CommercialAuditLogEntry = {
      ...entry,
      id: `caudit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.commercialAuditLogs.unshift(log);
    commercialRepository.persistAuditLog(log);

    logger.info('commercial', 'audit', entry.action, `Ação comercial auditada: ${entry.action} no alvo ${entry.target}`, {
      action: entry.action,
      changedBy: entry.changedBy,
      target: entry.target,
    });
  }
}

export const commercialService = new CommercialService();
