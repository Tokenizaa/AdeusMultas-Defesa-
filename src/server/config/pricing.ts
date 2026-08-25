/**
 * @file pricing.ts
 * Fonte única de verdade para preços do sistema (Backend).
 *
 * REGRA:
 * - O preço efetivo SEMPRE vem do catálogo (commercial-service.ts -> service_pricings).
 * - Este arquivo guarda apenas fallbacks de último recurso para dev/teste.
 * - NUNCA usar estes valores como preço de cobrança em produção sem antes
 *   consultar o commercial-service.
 */

export const PRICING = {
  FALLBACK_PRICE: 89.90,
  REFERENCE_PRICE: 197.00,
  CURRENCY: 'BRL',
  FINE_AVERAGE: 293.47,
  POINTS_AVERAGE: 5,
} as const;