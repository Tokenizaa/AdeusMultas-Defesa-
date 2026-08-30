import { RawLead, Lead } from './types';

export function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return undefined;
  if (digits.length > 10 && digits.startsWith('0')) {
    return digits.slice(1);
  }
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