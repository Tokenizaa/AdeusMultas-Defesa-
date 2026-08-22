/**
 * Fonte única de verdade para preços do sistema (Frontend).
 * Em produção, estes valores devem vir de API/config-service.
 * Estes são os FALLBACKS — o config-service tem prioridade.
 */

export const PRICING = {
  DEFAULT_PRICE: 89.90,
  ORIGINAL_PRICE: 197.00,
} as const;
