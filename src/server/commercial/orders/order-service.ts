/**
 * @file order-service.ts
 * Commercial order creation and lifecycle.
 */

import type { CommercialOrder, CreateOrderInput, OrderStatus } from './order-types';
export type { CreateOrderInput, OrderStatus, CommercialOrder } from './order-types';
import type { Coupon, ServicePricing, PromotionCampaign, ReferralRuleConfig, CommissionLedgerEntry, CommercialAuditLogEntry } from '../../../types/commercial';
import { CommercialRepository } from '../../db/commercial-repository';
import type { OfferService } from '../offers/offer-service';
import type { CouponService } from '../coupons/coupon-service';
import type { AffiliateService } from '../affiliates/affiliate-service';
import type { CommissionService } from '../affiliates/commission-service';
import type { CommercialAuditService } from '../audit/audit-service';

export class OrderService {
  constructor(
    private orders: Map<string, CommercialOrder>,
    private repository: CommercialRepository,
    private offerService: OfferService,
    private couponService: CouponService,
    private affiliateService: AffiliateService,
    private commissionService: CommissionService,
    private auditService: CommercialAuditService,
  ) {}

  createOrder(input: CreateOrderInput): CommercialOrder {
    // 1. Resolver oferta canônica (preço já calculado pelo motor comercial)
    const offerResult = this.offerService.resolve({
      serviceType: input.serviceType,
      stageId: input.stageId,
      userId: input.userId,
      documentCount: input.documentNumber - 1,
      couponCode: input.couponCode,
    });

    if (!offerResult.offer) {
      throw new Error(offerResult.reason || 'Não foi possível resolver a oferta comercial.');
    }

    const offer = offerResult.offer;

    // 2. Aplicar cupom se fornecido (o OfferService já aplicou se estava no resolve,
    // mas aqui aplicamos explicitamente para garantir)
    let couponDiscount = 0;
    let couponId: string | undefined;
    if (input.couponCode && offer.couponDiscount > 0) {
      couponDiscount = offer.couponDiscount;
      // O couponId viria do coupon service se necessário
    }

    // 3. Resolver afiliado se fornecido
    let affiliateId = input.affiliateId;
    if (!affiliateId && input.serviceType) {
      // affiliateService.resolveAffiliate pode ser chamado aqui se houver lógica de resolução
    }

    // 4. Calcular base de comissão
    const commissionBase = offer.finalAmount;
    // A taxa de comissão será calculada no CommissionService quando o pagamento for confirmado
    const commissionAmount = 0; // Será preenchido no processPaymentConfirmationEvent

    const now = new Date().toISOString();
    const order: CommercialOrder = {
      id: `order_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      caseId: input.caseId,
      userId: input.userId,
      commercialOfferId: input.commercialOfferId,
      serviceType: offer.serviceType,
      stageId: offer.stageId,
      baseAmount: offer.baseAmount,
      promotionDiscount: offer.promotionDiscount,
      firstDocumentsDiscount: offer.firstDocumentsDiscount,
      couponDiscount,
      finalAmount: offer.finalAmount,
      currency: offer.currency,
      promotionId: offer.promotionId,
      couponId,
      documentNumber: offer.documentNumber,
      affiliateId,
      commissionBase,
      commissionAmount,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    this.orders.set(order.id, order);
    this.repository.persistOrder(order);

    this.auditService.record({
      action: 'ORDER_CREATED',
      changedBy: input.userId,
      target: order.id,
      previousState: null,
      newState: order,
      reason: `Pedido criado para ${input.serviceType}`,
    });

    return order;
  }

  getOrderById(id: string): CommercialOrder | undefined {
    return this.orders.get(id);
  }

  getOrdersByCase(caseId: string): CommercialOrder[] {
    return Array.from(this.orders.values()).filter((o) => o.caseId === caseId);
  }

  getOrdersByUser(userId: string): CommercialOrder[] {
    return Array.from(this.orders.values()).filter((o) => o.userId === userId);
  }

  refundOrder(orderId: string, reason: string): CommercialOrder {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Pedido não encontrado: ${orderId}`);
    }

    if (order.status === 'refunded') {
      throw new Error(`Pedido já estornado: ${orderId}`);
    }

    const previous = { ...order };
    order.status = 'refunded';
    order.updatedAt = new Date().toISOString();

    // Reverter comissões se houver pagamento associado
    if (order.id) {
      this.commissionService.reverseCommissionsForPayment(order.id, reason, 'Admin Financeiro');
    }

    this.repository.updateOrderStatus(orderId, 'refunded');

    this.auditService.record({
      action: 'ORDER_REFUNDED',
      changedBy: 'system',
      target: orderId,
      previousState: previous,
      newState: order,
      reason,
    });

    return order;
  }
}
