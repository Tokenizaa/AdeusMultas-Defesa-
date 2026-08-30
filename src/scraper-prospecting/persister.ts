import { Lead, RawLead, ScrapeResult, SearchConfig } from './types';
import { supabaseAdmin } from './supabase';
import { classifyLead } from './classifier';
import { checkDuplicate } from './deduplicator';
import { logger } from './logger';
import { chromium, Browser } from 'playwright';
import { GoogleMapsSource } from './sources/google-maps';

export interface PersistResult {
  inserted: number;
  duplicates: number;
  rejected: number;
  errors: string[];
}

function buildLead(raw: RawLead, leadType: 'despachante' | 'advogado_transito', source: string): Lead {
  return {
    name: raw.name,
    category: raw.category || null,
    phone: raw.phone || null,
    phone_normalized: raw.phone?.replace(/\D/g, '') || null,
    whatsapp: raw.whatsapp || null,
    email: raw.email || null,
    website: raw.website || null,
    instagram: raw.instagram || null,
    facebook: raw.facebook || null,
    address: raw.address || null,
    city: raw.city || null,
    state: raw.state || null,
    zipCode: raw.zipCode || null,
    googleMapsUrl: raw.googleMapsUrl || null,
    rating: raw.rating ?? null,
    reviewCount: raw.reviewCount ?? null,
    sourceUrl: raw.sourceUrl || '',
    lead_type: leadType,
    source,
    scraped_at: new Date().toISOString(),
  };
}

export async function persistLeads(rawLeads: RawLead[], source: string): Promise<PersistResult> {
  const result: PersistResult = { inserted: 0, duplicates: 0, rejected: 0, errors: [] };

  for (const raw of rawLeads) {
    try {
      const leadType = classifyLead(raw);
      if (!leadType) {
        result.rejected += 1;
        result.errors.push(`Classificação inválida para lead: ${raw.name}`);
        continue;
      }

      const lead = buildLead(raw, leadType, source);

      const dedup = await checkDuplicate(lead);
      if (dedup.isDuplicate) {
        result.duplicates += 1;
        continue;
      }

      const payload = {
        lead_type: lead.lead_type,
        name: lead.name,
        phone: lead.phone,
        phone_normalized: lead.phone_normalized,
        whatsapp: lead.whatsapp,
        email: lead.email,
        website: lead.website,
        instagram: lead.instagram,
        facebook: lead.facebook,
        address: lead.address,
        city: lead.city,
        state: lead.state,
        zip_code: lead.zipCode,
        google_maps_url: lead.googleMapsUrl,
        rating: lead.rating,
        review_count: lead.reviewCount,
        category: lead.category,
        source: lead.source,
        source_url: lead.sourceUrl,
        scraped_at: lead.scraped_at,
      };

      const { error } = await supabaseAdmin.from('marketing_leads').insert(payload as any);

      if (error) {
        result.errors.push(`Erro ao inserir ${lead.name}: ${error.message}`);
        result.rejected += 1;
      } else {
        result.inserted += 1;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      result.errors.push(message);
      result.rejected += 1;
    }
  }

  return result;
}

export async function runScrape(config: SearchConfig): Promise<ScrapeResult> {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
    ],
  });
  const source = new GoogleMapsSource(browser);

  const aggregated: ScrapeResult = {
    source: 'google_maps',
    query: config.queries.join(', '),
    location: config.cities?.join(', ') || config.states?.join(', ') || 'Brasil',
    totalFound: 0,
    inserted: 0,
    duplicates: 0,
    rejected: 0,
    errors: [],
    leads: [],
  };

  const allRawLeads: RawLead[] = [];
  const locations: string[] = [];
  for (const city of config.cities || []) locations.push(city);
  for (const state of config.states || []) locations.push(state);
  if (locations.length === 0) locations.push('Brasil');

  for (const query of config.queries) {
    for (const location of locations) {
      const result = await source.search(query, location, config.limitPerQuery);
      aggregated.totalFound += result.totalFound;
      aggregated.errors.push(...result.errors);
      for (const lead of result.leads) {
        allRawLeads.push(lead);
      }
    }
  }

  aggregated.leads = allRawLeads;
  const persist = await persistLeads(allRawLeads, 'google_maps');
  aggregated.inserted = persist.inserted;
  aggregated.duplicates = persist.duplicates;
  aggregated.rejected = persist.rejected;
  aggregated.errors.push(...persist.errors);

  await browser.close().catch(() => undefined);
  return aggregated;
}