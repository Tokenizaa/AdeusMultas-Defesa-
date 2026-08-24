/**
 * @file offer-types.ts
 * Commercial offer domain types.
 */

export type CommercialOfferBreakdown = {
  commercialId: string;
  serviceType: string;
  stageId: string | null;
  name: string;
  description: string;

  baseAmount: number; // preço cheio em centavos
  promotionDiscount: number; // desconto da promoção em centavos
  firstDocumentsDiscount: number; // desconto adicional dos 3 primeiros docs em centavos
  couponDiscount: number; // desconto do cupom em centavos
  finalAmount: number; // valor final em centavos

  currency: string;
  promotionId?: string;
  documentNumber: number; // 1, 2, 3, 4...
  eligible: boolean;
  available: boolean;
  requirements: string[];
};

export type ResolveOfferParams = {
  serviceType: string;
  stageId?: string | null;
  caseData?: Record<string, unknown>;
  userId?: string;
  documentCount?: number;
  couponCode?: string;
};

export type ResolveOfferResult = {
  offer: CommercialOfferBreakdown | null;
  reason?: string;
};