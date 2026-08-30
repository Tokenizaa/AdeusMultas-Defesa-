import { RawLead, Lead } from './types';

/**
 * Normaliza telefone BR para o formato canônico: 10-11 dígitos, DDD + número,
 * SEM código do país (+55) e SEM zero inicial do DDD.
 * - Remove tudo que não é dígito.
 * - Remove o zero inicial de DDD (0XX) quando restam > 10 dígitos.
 * - Remove o código do país 55 quando o restante é um número BR válido (10-11 dígitos).
 */
export function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  let digits = phone.replace(/\D/g, '');
  if (!digits) return undefined;
  // Código do país BR: +55/55 + DDD + número (10-11 dígitos restantes = número BR válido.
  // O guard (length - 2 >= 10) evita remover o DDD real 55 de RS/Oeste-SC:
  // ex. (55) 4066-6564 tem 10 dígitos -> não entra; (55) 99999-9999 -> restam 9 -> não entra.)
  if (digits.length > 10 && digits.startsWith('55') && digits.length - 2 >= 10) {
    digits = digits.slice(2);
  }
  // Zero inicial de DDD (formato legado 0XX, inclusive após remover o país:
  // +55 011 99999-9999 -> "55011999999999" -> "011999999999" -> "11999999999")
  if (digits.length > 10 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits;
}

/**
 * Regex de telefone brasileiro: captura apenas o trecho do número (match[0]),
 * não a linha inteira. Aceita: +55, DDD entre parênteses separado por espaço/cifrão,
 * 4-5 dígitos + 4 dígitos.
 */
const BR_PHONE_RE = /(?:\+?55[\s-]?)?(?:\(?(\d{2})\)?[\s-]?)?(\d{4,5}[\s-]?\d{4})/;

/** Extrai o telefone limpo (apenas dígitos com DDD, 10-11) de um texto arbitrário. */
export function extractCleanPhone(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.match(BR_PHONE_RE);
  if (!match) return null;
  const digits = normalizePhone(match[0]);
  if (!digits || digits.length < 10 || digits.length > 11) return null;
  return digits;
}

/** Limpa um href tel: (ex: tel:+555140666564) para dígitos com DDD (10-11). */
export function cleanPhoneFromTel(href: string | null | undefined): string | null {
  if (!href) return null;
  const digits = normalizePhone(href);
  if (!digits || digits.length < 10 || digits.length > 11) return null;
  return digits;
}

export function normalizeWebsite(website?: string): string | undefined {
  if (!website) return undefined;
  let url = website.trim().toLowerCase();
  if (!/^https?:\/\//.test(url)) {
    url = `https://${url}`;
  }
  try {
    const u = new URL(url);
    u.pathname = u.pathname.replace(/\/$/, '');
    return u.toString();
  } catch {
    return url;
  }
}

export function normalizeEmail(email?: string): string | undefined {
  if (!email) return undefined;
  return email.trim().toLowerCase();
}

export function normalizeState(state?: string): string | undefined {
  if (!state) return undefined;
  return state.trim().toUpperCase().slice(0, 2);
}

export function normalizeCity(city?: string): string | undefined {
  if (!city) return undefined;
  return city.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeLead(raw: RawLead) {
  return {
    ...raw,
    phone_normalized: normalizePhone(raw.phone),
    website: normalizeWebsite(raw.website),
    email: normalizeEmail(raw.email),
    state: normalizeState(raw.state),
    city: normalizeCity(raw.city),
  } as unknown as Lead;
}