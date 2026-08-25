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

  baseAmount: number; // Preço cheio de tabela em Reais (ex: 89.90)
  promotionDiscount: number; // Desconto da promoção ativa em Reais (ex: 44.95)
  firstDocumentsDiscount: number; // Desconto adicional dos 3 primeiros docs em Reais (ex: 22.47)
  couponDiscount: number; // Desconto de cupom em Reais (ex: 0.00)
  finalAmount: number; // Valor final a pagar em Reais (ex: 22.48)

  currency: string;
  promotionId?: string;
  promotionName?: string;
  documentNumber: number; // 1, 2, 3, 4...
  isFirstDocumentsBeneficiary: boolean; // true para os 3 primeiros documentos
  remainingBenefitedDocuments: number; // Restantes com benefício (ex: 3 no 1º, 2 no 2º, 1 no 3º, 0 após)
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