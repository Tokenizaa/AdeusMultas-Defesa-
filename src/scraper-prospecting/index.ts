export type { LeadType, RawLead, Lead, ScrapeResult, SearchConfig, ScraperLogger } from './types';
export { ConsoleLogger, logger } from './logger';
export { normalizePhone, normalizeWebsite, normalizeEmail, normalizeState, normalizeCity, normalizeLead } from './normalizer';
export { classifyLead } from './classifier';
export { checkDuplicate, type DedupResult } from './deduplicator';
export { persistLeads } from './persister';
export { GoogleMapsSource } from './sources/google-maps';