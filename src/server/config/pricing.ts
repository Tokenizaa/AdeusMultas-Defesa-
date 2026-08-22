/**
 * Fonte única de verdade para preços do sistema (Backend).
 * Em produção, estes valores devem vir do config-service ou banco.
 * Estes são os FALLBACKS — o config-service tem prioridade.
 */

export const PRICING = {
  DEFAULT_PRICE: 89.90,
  ORIGINAL_PRICE: 197.00,
  CURRENCY: 'BRL',
  FINE_AVERAGE: 293.47,
  POINTS_AVERAGE: 5,
} as const;
