export type { LeadType, RawLead, Lead, ScrapeResult, SearchConfig, ScraperLogger } from './types';
export { ConsoleLogger, logger } from './logger';
export { normalizePhone, normalizeWebsite, normalizeEmail, normalizeState, normalizeCity, normalizeLead } from './normalizer';
export { classifyLead } from './classifier';
export { checkDuplicate, type DedupResult } from './deduplicator';
export { persistLeads } from './persister';
// Scraper Selenium (substituto do GoogleMapsSource Playwright)
export { SeleniumSession } from './selenium/session';
export { GoogleMapsSeleniumScraper } from './selenium/google-maps-scraper';
export { generateLeadsXlsx } from './export/xlsx';