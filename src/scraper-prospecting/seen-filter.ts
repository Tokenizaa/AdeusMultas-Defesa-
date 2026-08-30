import { normalizePhone } from './normalizer';

/**
 * Chaves de dedup no formato carregado do banco por `loadExistingScrapedKeys`
 * (persister.ts): `url:<source_url>` e `id:<phone_normalized>|<website>|<email>`.
 * Fonte única de verdade para o formato — garante que o skip entre execuções
 * realmente case com as chaves persistidas (BUG 3: repetição da primeira página).
 */
export function buildSeenKeys(
  sourceUrl: string | null | undefined,
  phone?: string | null,
  website?: string | null,
  email?: string | null,
): string[] {
  const keys: string[] = [];
  if (sourceUrl) keys.push(`url:${sourceUrl}`);
  const phoneKey = normalizePhone(phone ?? undefined) || '';
  const webKey = (website || '').toLowerCase().trim();
  const emailKey = (email || '').toLowerCase().trim();
  const composite = [phoneKey, webKey, emailKey].filter(Boolean).join('|');
  if (composite) keys.push(`id:${composite}`);
  return keys;
}

/** Um lead já foi coletado antes? Consulta `seenKeys` pelas chaves canônicas. */
export function isSeen(
  seenKeys: Set<string>,
  sourceUrl?: string | null,
  phone?: string | null,
  website?: string | null,
  email?: string | null,
): boolean {
  return buildSeenKeys(sourceUrl, phone, website, email).some((k) => seenKeys.has(k));
}

/**
 * Decisão de avanço do scroll (BUG 3): continua carregando resultados quando o
 * pool visível se esgota mas ainda faltam leads NOVOS, respeitando o teto de
 * rounds extras para não cair em loop infinito.
 */
export function stillNeedsScroll(
  collectedNew: number,
  requiredNew: number,
  extraRoundsUsed: number,
  maxExtraRounds: number,
): boolean {
  if (requiredNew <= 0) return false;
  if (extraRoundsUsed >= maxExtraRounds) return false;
  return collectedNew < requiredNew;
}