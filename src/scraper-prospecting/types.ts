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
  placeId?: string;
  rating?: number;
  reviewCount?: number;
  priceLevel?: number;
  openingHours?: string;
  currentStatus?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  plusCode?: string;
  socialLinks?: string[];
  sourceUrl?: string;
  rawData?: Record<string, unknown>;
  scrapedAt?: string;
  searchTerm?: string;
  searchLocation?: string;
}

export interface ScrapedForKey {
  query: string;
  city: string;
  state: string;
  source: string;
}

export interface Lead extends RawLead {
  id?: string;
  lead_type?: LeadType;
  phone_normalized?: string | null;
  source: string;
  scraped_at: string;
  scraped_for?: ScrapedForKey | null;
  collection_run_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ScrapeResult {
  source: string;
  query: string;
  location: string;
  totalFound: number;
  inserted: number;
  /** Leads que já existiam no banco com campos vazios e foram PREENCHIDOS (fill-gap upsert). */
  filled: number;
  duplicates: number;
  /** Duplicatas completas ignoradas (não preenchidas, não re-inseridas). */
  completeDuplicates: number;
  rejected: number;
  errors: string[];
  leads: RawLead[];
}

export interface QueryScrapeResult {
  query: string;
  location: string;
  totalFound: number;
  inserted: number;
  filled: number;
  duplicates: number;
  completeDuplicates: number;
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

export interface ScraperProgress {
  phase: 'discovery' | 'details' | 'completed';
  discovered: number;
  processed: number;
  persisted: number;
  duplicates: number;
  errors: number;
}

export interface ScraperCallbacks {
  onProgress?: (progress: ScraperProgress) => void;
  onCheckCancel?: () => boolean;
  onDriverCrash?: () => void;
  onCardExtracted?: (lead: RawLead, index: number, total: number) => Promise<void> | void;
}