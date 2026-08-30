export type LeadType = 'despachante' | 'advogado_transito';

export interface RawLead {
  name: string;
  category?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  googleMapsUrl?: string;
  rating?: number;
  reviewCount?: number;
  sourceUrl?: string;
}

export interface Lead extends RawLead {
  id?: string;
  lead_type?: LeadType;
  phone_normalized?: string | null;
  source: string;
  scraped_at: string;
  created_at?: string;
  updated_at?: string;
}

export interface ScrapeResult {
  source: string;
  query: string;
  location: string;
  totalFound: number;
  inserted: number;
  duplicates: number;
  rejected: number;
  errors: string[];
  leads: RawLead[];
}

export interface SearchConfig {
  queries: string[];
  cities?: string[];
  states?: string[];
  limitPerQuery: number;
}

export interface ScraperLogger {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}