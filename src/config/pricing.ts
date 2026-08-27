/**
 * FALLBACKS REMOVIDOS DO CHECKOUT PÚBLICO — preço vem 100% do catálogo comercial
 * via API /api/payments/resolve-price.
 *
 * Este módulo ainda exporta PRICING APENAS para telas administrativas que não
 * pertencem ao fluxo de pagamento do cidadão (ex: tabelas do admin). O checkout
 * público NÃO deve usar estes valores.
 */

// ⚠️ FALLBACKS DE ADMIN/DEV — NÃO usar no checkout público
export const PRICING = {
  DEFAULT_PRICE: 89.90,
  ORIGINAL_PRICE: 197.00,
} as const;
