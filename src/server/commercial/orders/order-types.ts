/**
 * @file order-types.ts
 * Commercial order domain types.
 */

export type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'refunded';

export interface CommercialOrder {
  id: string;
  caseId: string;
  userId: string;
  commercialOfferId: string;
  serviceType: string;
  stageId: string | null;
  baseAmount: number;
  promotionDiscount: number;
  firstDocumentsDiscount: number;
  couponDiscount: number;
  finalAmount: number;
  currency: string;
  promotionId?: string;
  couponId?: string;
  documentNumber: number;
  affiliateId?: string;
  commissionBase: number;
  commissionAmount: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderInput {
  caseId: string;
  userId: string;
  serviceType: string;
  stageId?: string;
  commercialOfferId: string;
  documentNumber: number;
  couponCode?: string;
  affiliateId?: string;
}
