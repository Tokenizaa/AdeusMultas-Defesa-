/**
 * @file coupon-service.ts
 * Coupon validation and redemption domain service.
 */

import {
  Coupon,
  CouponUsageLog,
} from '../../../types/commercial';
import { CommercialRepository } from '../../db/commercial-repository';

export type CreateCouponInput = Omit<
  Coupon,
  'id' | 'usedCount' | 'createdAt' | 'usageHistory'
>;

export type ValidateCouponResult = {
  valid: boolean;
  discountAmount: number;
  finalPrice: number;
  message: string;
  coupon?: Coupon;
};

export class CouponService {
  constructor(
    private coupons: Map<string, Coupon>,
    private repository: CommercialRepository,
    private recordAudit: (entry: {
      action: string;
      changedBy: string;
      target: string;
      previousState: unknown;
      newState: unknown;
      reason?: string;
    }) => void,
  ) {}

  getCoupons(): Coupon[] {
    return Array.from(this.coupons.values());
  }

  getCouponByCode(code: string): Coupon | undefined {
    return this.coupons.get(code.toUpperCase());
  }

  createCoupon(
    data: CreateCouponInput,
    author = 'Admin Comercial',
  ): Coupon {
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
    this.repository.persistCoupon(newCoupon);

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

  updateCoupon(
    code: string,
    updates: Partial<Coupon>,
    author = 'Admin Comercial',
  ): Coupon {
    const cleanCode = code.trim().toUpperCase();
    const coupon = this.coupons.get(cleanCode);
    if (!coupon) {
      throw new Error(`Cupom não encontrado: ${code}`);
    }

    const previousState = { ...coupon };
    const updated = { ...coupon, ...updates };

    this.coupons.set(cleanCode, updated);
    this.repository.persistCoupon(updated);

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

  validateCoupon(
    rawCode: string,
    orderAmount: number,
    serviceType: string,
    userId?: string,
  ): ValidateCouponResult {
    const code = rawCode.trim().toUpperCase();
    const coupon = this.coupons.get(code);

    if (!coupon) {
      return {
        valid: false,
        discountAmount: 0,
        finalPrice: orderAmount,
        message: 'Cupom inválido ou não cadastrado.',
      };
    }

    if (!coupon.isActive) {
      return {
        valid: false,
        discountAmount: 0,
        finalPrice: orderAmount,
        message: 'Este cupom está desativado.',
      };
    }

    const now = new Date();
    if (new Date(coupon.validFrom) > now) {
      return {
        valid: false,
        discountAmount: 0,
        finalPrice: orderAmount,
        message: 'Este cupom ainda não é válido.',
      };
    }

    if (new Date(coupon.validUntil) < now) {
      return {
        valid: false,
        discountAmount: 0,
        finalPrice: orderAmount,
        message: 'Este cupom expirou.',
      };
    }

    if (coupon.usedCount >= coupon.totalLimit) {
      return {
        valid: false,
        discountAmount: 0,
        finalPrice: orderAmount,
        message: 'Limite total de usos deste cupom foi atingido.',
      };
    }

    if (coupon.minOrderValue && orderAmount < coupon.minOrderValue) {
      return {
        valid: false,
        discountAmount: 0,
        finalPrice: orderAmount,
        message: `Valor mínimo para este cupom é de R$ ${coupon.minOrderValue.toFixed(2)}.`,
      };
    }

    if (
      !coupon.applicableServices.includes('all') &&
      !coupon.applicableServices.includes(serviceType)
    ) {
      return {
        valid: false,
        discountAmount: 0,
        finalPrice: orderAmount,
        message: 'Este cupom não é aplicável ao tipo de serviço selecionado.',
      };
    }

    if (userId) {
      const userUsage = coupon.usageHistory.filter(
        (u) => u.userId === userId,
      ).length;
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

  redeemCoupon(
    rawCode: string,
    userId: string,
    userName: string,
    caseId: string,
    orderAmount: number,
    serviceType: string,
  ): { discountApplied: number; finalPrice: number } {
    const validation = this.validateCoupon(
      rawCode,
      orderAmount,
      serviceType,
      userId,
    );
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
    this.repository.persistCoupon(coupon);

    this.recordAudit({
      action: 'COUPON_CHANGE',
      changedBy: userName,
      target: coupon.code,
      previousState: { usedCount: coupon.usedCount - 1 },
      newState: { usedCount: coupon.usedCount },
      reason: `Resgate de cupom ${coupon.code} no pedido ${caseId}`,
    });

    return {
      discountApplied: validation.discountAmount,
      finalPrice: validation.finalPrice,
    };
  }
}