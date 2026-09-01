import { Lead, RawLead, ScrapeResult, QueryScrapeResult, SearchConfig, ScrapedForKey } from './types';
import { supabaseAdmin } from './supabase';
import { classifyLead } from './classifier';
import { normalizePhone, normalizeWebsite, normalizeEmail } from './normalizer';
import { buildSeenKeys } from './seen-filter';
import { logger } from './logger';
import { SeleniumSession } from './selenium/session';
import { GoogleMapsSeleniumScraper } from './selenium/google-maps-scraper';

export interface PersistResult {
  inserted: number;
  /** Leads que já existiam com campos vazios e foram PREENCHIDOS (fill-gap upsert). */
  filled: number;
  duplicates: number;
  /** Duplicatas completas ignoradas (lead já existente completo, nada a preencher). */
  completeDuplicates: number;
  rejected: number;
  errors: string[];
}

/** Colunas preenchíveis de marketing_leads (mapeiam os campos ricos do lead coletado). */
const FILLABLE_COLUMNS = [
  'phone',
  'phone_normalized',
  'whatsapp',
  'email',
  'website',
  'instagram',
  'facebook',
  'address',
  'city',
  'state',
  'zip_code',
  'rating',
  'review_count',
  'price_level',
  'category',
  'source_url',
  'google_maps_url',
  'place_id',
  'opening_hours',
  'current_status',
  'description',
  'latitude',
  'longitude',
  'plus_code',
  'social_links',
  'raw_data',
] as const;

type DbRow = Record<string, unknown> & { id: string };

/** Considera um valor como "vazio" (preenchível) quando null/undefined/string vazia. */
function isEmpty(val: unknown): boolean {
  return val === null || val === undefined || val === '';
}

/**
 * Computa o diff de preenchimento (fill-gap): campos que estão VAZIOS no registro
 * existente E possuem valor no payload coletado. NÃO sobrescreve campos que já têm
 * valor — apenas preenche o que está NULL/vazio.
 */
function computeFillColumns(existing: DbRow, payload: Record<string, unknown>): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  for (const key of FILLABLE_COLUMNS) {
    const existingVal = existing[key];
    const newVal = payload[key];
    if (isEmpty(existingVal) && !isEmpty(newVal)) {
      updates[key] = newVal;
    }
  }
  return updates;
}

/**
 * Busca no banco um lead existente cujo google_maps_url OU source_url corresponda à URL
 * canônica coletada. Usado pelo mecanismo de preenchimento de vazios (fill-gap).
 */
async function findExistingByUrl(url: string): Promise<DbRow | null> {
  try {
    for (const col of ['google_maps_url', 'source_url'] as const) {
      const { data, error } = await supabaseAdmin
        .from('marketing_leads')
        .select('*')
        .eq(col, url)
        .limit(1);
      if (error) {
        logger.error('Erro ao buscar lead existente por URL', { col, url, error: error.message });
        return null;
      }
      if (data && data.length > 0) {
        return data[0] as DbRow;
      }
    }
    return null;
  } catch (err) {
    logger.error('Falha ao buscar lead existente por URL', { error: err instanceof Error ? err.message : err });
    return null;
  }
}

function buildLead(raw: RawLead, leadType: 'despachante' | 'advogado_transito', source: string, scrapedFor: ScrapedForKey | null, collectionRunId: string | null): Lead {
  // Normalização ÚNICA e consistente de telefone (normalizer.normalizePhone):
  // remove +55/55 e zero inicial de DDD. phone (exibição) e phone_normalized (índice
  // único de dedup) derivam da MESMA função -> dedup confiável entre execuções.
  const phone = normalizePhone(raw.phone) || null;
  const website = normalizeWebsite(raw.website) || null;
  const email = normalizeEmail(raw.email) || null;
  
  return {
    name: raw.name,
    category: raw.category || null,
    phone,
    phone_normalized: phone,
    whatsapp: raw.whatsapp || null,
    email,
    website,
    instagram: raw.instagram || null,
    facebook: raw.facebook || null,
    address: raw.address || null,
    city: raw.city || null,
    state: raw.state || null,
    zipCode: raw.zipCode || null,
    googleMapsUrl: raw.googleMapsUrl || null,
    placeId: raw.placeId || null,
    rating: raw.rating ?? null,
    reviewCount: raw.reviewCount ?? null,
    priceLevel: raw.priceLevel ?? null,
    openingHours: raw.openingHours || null,
    currentStatus: raw.currentStatus || null,
    description: raw.description || null,
    latitude: raw.latitude ?? null,
    longitude: raw.longitude ?? null,
    plusCode: raw.plusCode || null,
    socialLinks: raw.socialLinks || null,
    rawData: raw.rawData || null,
    sourceUrl: raw.sourceUrl || '',
    lead_type: leadType,
    source,
    scraped_at: raw.scrapedAt || new Date().toISOString(),
    scraped_for: scrapedFor,
    collection_run_id: collectionRunId,
    searchTerm: raw.searchTerm || null,
    searchLocation: raw.searchLocation || null,
  };
}

export async function persistLeads(
  rawLeads: RawLead[],
  source: string,
  scrapedFor: ScrapedForKey | null = null,
  collectionRunId: string | null = null,
): Promise<PersistResult> {
  const result: PersistResult = { inserted: 0, filled: 0, duplicates: 0, completeDuplicates: 0, rejected: 0, errors: [] };

  for (const raw of rawLeads) {
    try {
      const leadType = classifyLead(raw);
      if (!leadType) {
        result.rejected += 1;
        result.errors.push(`Classificação inválida para lead: ${raw.name}`);
        continue;
      }

      const lead = buildLead(raw, leadType, source, scrapedFor, collectionRunId);

      const payload: Record<string, unknown> = {
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
        place_id: lead.placeId,
        rating: lead.rating,
        review_count: lead.reviewCount,
        price_level: lead.priceLevel,
        category: lead.category,
        source: lead.source,
        source_url: lead.sourceUrl,
        scraped_at: lead.scraped_at,
        audience: 'B2B',
        opening_hours: lead.openingHours,
        current_status: lead.currentStatus,
        description: lead.description,
        latitude: lead.latitude,
        longitude: lead.longitude,
        plus_code: lead.plusCode,
        social_links: lead.socialLinks,
        raw_data: lead.rawData,
        scraped_for: scrapedFor ?? null,
        collection_run_id: collectionRunId,
        search_term: lead.searchTerm,
        search_location: lead.searchLocation,
      };

      // FILL-GAP UPSERT: se a URL já existe no banco, atualizar apenas o que está vazio.
      const canonicalUrl = (lead.googleMapsUrl as string) || (lead.sourceUrl as string);
      if (canonicalUrl) {
        const existing = await findExistingByUrl(canonicalUrl);
        if (existing) {
          const updates = computeFillColumns(existing, payload);
          if (Object.keys(updates).length > 0) {
            // Preencher os campos vazios do registro existente + marcar a coleta recente
            const merged: Record<string, unknown> = {
              ...updates,
              scraped_at: payload.scraped_at,
              scraped_for: payload.scraped_for,
              collection_run_id: payload.collection_run_id,
            };

            // Tenta update com todos os campos. Se houver conflito em phone_normalized
            // (unique constraint cross-lead), remove esse campo e re-tenta.
            let fillError = null as any;
            let finalUpdates = merged;

            const { error } = await supabaseAdmin.from('marketing_leads').update(merged).eq('id', existing.id);
            if (error && error.code === '23505') {
              // Conflito de unique constraint: mais comum em phone_normalized.
              // Remove campos que podem conflitar e re-tenta, preservando o preenchimento dos demais.
              const { phone_normalized, ...retryUpdates } = merged as Record<string, unknown>;
              finalUpdates = retryUpdates;
              const { error: retryError } = await supabaseAdmin
                .from('marketing_leads')
                .update(retryUpdates)
                .eq('id', existing.id);
              fillError = retryError;
            } else {
              fillError = error;
            }

            if (fillError) {
              result.errors.push(`Erro ao preencher lead ${lead.name}: ${fillError.message}`);
              result.rejected += 1;
            } else {
              result.filled += 1;
              if (finalUpdates !== merged) {
                result.errors.push(
                  `Aviso: phone_normalized não atualizado para ${lead.name} (conflito de unique constraint — outro lead já usa esse número).`
                );
              }
            }
            continue;
          }
          // Lead existente já completo: duplicata completa ignorada
          result.duplicates += 1;
          result.completeDuplicates += 1;
          continue;
        }
      }

      const { error } = await supabaseAdmin.from('marketing_leads').insert(payload as any);

      if (error) {
        // Unique constraint violation = duplicata (detectado pelo índice do banco)
        if ((error as any).code === '23505') {
          result.duplicates += 1;
        } else {
          result.errors.push(`Erro ao inserir ${lead.name}: ${error.message}`);
          result.rejected += 1;
        }
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

/**
 * Carrega do banco as chaves de identificação dos leads existentes para as combinações
 * de query/cidade/estado/fonte que já foram coletadas.
 * Usado para descoberta incremental: não reinserir leads já persistidos.
 * Obs.: o gate definitivo de classificação (inserir/preencher/duplicata completa) é o
 * `persistLeads`, que consulta o banco por URL a cada lead. Este conjunto é mantido
 * por compatibilidade e diagnóstico.
 */
async function loadExistingScrapedKeys(): Promise<Set<string>> {
  const seenKeys = new Set<string>();

  try {
    const { data, error } = await supabaseAdmin
      .from('marketing_leads')
      .select('source_url, phone_normalized, website, email, scraped_for')
      .not('source_url', 'is', null)
      .limit(5000);

    if (error) {
      logger.error('Erro ao carregar chaves existentes para dedup', { error: error.message });
      return seenKeys;
    }

    for (const row of (data || []) as any[]) {
      // Mesmo formato de chave usado pelo scraper (seen-filter.buildSeenKeys):
      // `url:<source_url>` e `id:<phone_normalized>|<website>|<email>`
      for (const key of buildSeenKeys(
        row.source_url || undefined,
        row.phone_normalized || undefined,
        row.website || undefined,
        row.email || undefined,
      )) {
        seenKeys.add(key);
      }
    }

    logger.info('Chaves de dedup carregadas do banco', { count: seenKeys.size });
  } catch (err) {
    logger.error('Falha ao carregar chaves existentes', { error: err instanceof Error ? err.message : err });
  }

  return seenKeys;
}

interface CollectionRun {
  id: string;
  status: string;
}

async function createCollectionRun(config: SearchConfig): Promise<CollectionRun | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('collection_runs')
      .insert({
        queries: config.queries,
        cities: config.cities || [],
        states: config.states || [],
        limit_per_query: config.limitPerQuery,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id, status')
      .single();

    if (error || !data) {
      logger.error('Erro ao criar collection_run', { error: error?.message });
      return null;
    }

    return data as CollectionRun;
  } catch (err) {
    logger.error('Falha ao criar collection_run', { error: err instanceof Error ? err.message : err });
    return null;
  }
}

async function updateCollectionRun(
  runId: string,
  updates: Record<string, unknown>,
): Promise<void> {
  try {
    const isTerminal = ['completed', 'failed', 'cancelled'].includes((updates.status || '') as string);
    await supabaseAdmin
      .from('collection_runs')
      .update({ ...updates, updated_at: new Date().toISOString(), ...(isTerminal && { finished_at: new Date().toISOString() }) })
      .eq('id', runId);
  } catch (err) {
    logger.warn('Erro ao atualizar collection_run', { runId, error: err instanceof Error ? err.message : err });
  }
}

export interface ScraperCallbacks {
  onProgress?: (progress: { phase: string; discovered: number; processed: number; persisted: number; duplicates: number; errors: number }) => void;
  onCheckCancel?: () => boolean;
  onDriverCrash?: () => void;
}

export interface ScrapeRunResult {
  source: string;
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
  queriesExecuted: Array<{
    query: string;
    location: string;
    found: number;
    inserted: number;
    filled: number;
    duplicates: number;
    completeDuplicates: number;
    rejected: number;
    errors: string[];
  }>;
  hasBlockingError: boolean;
}

export async function runScrapeAsJob(config: SearchConfig, callbacks: ScraperCallbacks = {}, collectionRunId?: string): Promise<ScrapeRunResult> {
  const session = new SeleniumSession({
    headless: true,
    args: [
      '--headless=new',
      '--disable-blink-features=AutomationDetected',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--window-size=1920,1080',
    ],
  });

  let scraper: GoogleMapsSeleniumScraper | null = null;
  let cancelled = false;

  const scraperCallbacks = {
    onProgress: callbacks.onProgress,
    onCheckCancel: () => cancelled || callbacks.onCheckCancel?.() || false,
    onDriverCrash: callbacks.onDriverCrash,
  };

  try {
    await session.start();
    scraper = new GoogleMapsSeleniumScraper(session, scraperCallbacks);

    // Montar lista de locations a partir de cities ou states
    const locations: string[] = [];
    for (const city of config.cities || []) locations.push(city);
    for (const state of config.states || []) locations.push(state);
    if (locations.length === 0) locations.push('Brasil');

    // Criar/atualizar registro de execução antes de iniciar
    const collectionRun = collectionRunId
      ? { id: collectionRunId }
      : await createCollectionRun(config);
    const runId = collectionRun?.id || null;
    // Se collectionRunId foi passado, o job já foi criado com status 'running' pelo queue
    if (collectionRunId && runId) {
      await updateCollectionRun(runId, { status: 'running' });
    }

    // Carregar chaves existentes para deduplicação incremental cross-execução
    const seenKeys = await loadExistingScrapedKeys();

    // Resultado agregado final
    const aggregated: ScrapeResult = {
      source: 'google_maps',
      query: config.queries.join(', '),
      location: locations.join(', '),
      totalFound: 0,
      inserted: 0,
      filled: 0,
      duplicates: 0,
      completeDuplicates: 0,
      rejected: 0,
      errors: [],
      leads: [],
    };

    const queriesExecuted: Array<{ query: string; location: string; found: number; inserted: number; filled: number; duplicates: number; completeDuplicates: number; rejected: number; errors: string[] }> = [];

    for (const q of config.queries) {
      for (const loc of locations) {
        // Check cancellation before each query
        if (cancelled || callbacks.onCheckCancel?.()) {
          cancelled = true;
          logger.info('Coleta cancelada pelo usuário', { query: q, location: loc });
          break;
        }

        const scrapedFor: ScrapedForKey = {
          query: q,
          city: loc.split(',')[0]?.trim() || loc,
          state: (loc.split(',')[1]?.trim() || '').slice(0, 2).toUpperCase(),
          source: 'google_maps',
        };

        // requiredNew: quantos leads NOVOS ainda faltam para atingir o limite total
        const requiredNew = Math.max(1, config.limitPerQuery - aggregated.inserted);

        logger.info('Executando query incremental', { query: q, location: loc, requiredNew, seenKeysSize: seenKeys.size });

        // Retry logic for transient errors
        let attempt = 0;
        const maxAttempts = 3;
        let queryResult: QueryScrapeResult | null = null;

        while (attempt < maxAttempts && !cancelled) {
          attempt += 1;
          try {
            queryResult = await scraper.search(q, loc, requiredNew, seenKeys);
            break;
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.warn('Erro no scraping (retry)', { attempt, error: message });

            if (attempt < maxAttempts) {
              try {
                await scraper.close();
                await session.start();
                scraper = new GoogleMapsSeleniumScraper(session, scraperCallbacks);
                callbacks.onDriverCrash?.();
              } catch (restartErr) {
                logger.error('Falha ao reiniciar driver', { error: restartErr instanceof Error ? restartErr.message : restartErr });
              }
            } else {
              queryResult = {
                query: `${q} ${loc}`,
                location: loc,
                totalFound: 0,
                inserted: 0,
                filled: 0,
                duplicates: 0,
                completeDuplicates: 0,
                rejected: 0,
                errors: [`Falha após ${maxAttempts} tentativas: ${message}`],
                leads: [],
              };
            }
          }
        }

        if (!queryResult) {
          queryResult = {
            query: `${q} ${loc}`,
            location: loc,
            totalFound: 0,
            inserted: 0,
            filled: 0,
            duplicates: 0,
            completeDuplicates: 0,
            rejected: 0,
            errors: ['Resultado não obtido após tentativas'],
            leads: [],
          };
        }

        if (cancelled) break;

        // Persistir (com fill-gap) os leads coletados no banco
        const persist = await persistLeads(queryResult.leads, 'google_maps', scrapedFor, runId);

        aggregated.totalFound += queryResult.totalFound;
        aggregated.leads.push(...queryResult.leads);
        aggregated.inserted += persist.inserted;
        aggregated.filled += persist.filled;
        aggregated.duplicates += persist.duplicates + queryResult.duplicates;
        aggregated.completeDuplicates += persist.completeDuplicates;
        aggregated.rejected += persist.rejected + queryResult.rejected;
        aggregated.errors.push(...queryResult.errors, ...persist.errors);

        queriesExecuted.push({
          query: queryResult.query,
          location: queryResult.location,
          found: queryResult.totalFound,
          inserted: persist.inserted,
          filled: persist.filled,
          duplicates: persist.duplicates + queryResult.duplicates,
          completeDuplicates: persist.completeDuplicates,
          rejected: persist.rejected + queryResult.rejected,
          errors: [...queryResult.errors, ...persist.errors],
        });

        // Atualizar o collection_run após cada query
        if (runId) {
          await updateCollectionRun(runId, {
            results_found: aggregated.totalFound,
            new_leads: aggregated.inserted,
            duplicates: aggregated.duplicates,
            rejected: aggregated.rejected,
            errors: aggregated.errors,
            queries_executed: queriesExecuted,
            ...(cancelled && { status: 'cancelled' }),
          });
        }

        // Notificar progresso via callback
        callbacks.onProgress?.({
          phase: 'details',
          discovered: aggregated.totalFound,
          processed: aggregated.inserted + aggregated.duplicates + aggregated.rejected,
          persisted: aggregated.inserted,
          duplicates: aggregated.duplicates,
          errors: aggregated.errors.length,
        });

        logger.info('Query concluída', {
          query: q,
          location: loc,
          found: queryResult.totalFound,
          newPersisted: persist.inserted,
          filled: persist.filled,
          completeDuplicates: persist.completeDuplicates,
          totalInsertedSoFar: aggregated.inserted,
        });
      }
    }

    // Marcar execução como concluída
    if (runId) {
      const finalStatus = cancelled
        ? 'cancelled'
        : aggregated.errors.some((e) => /BLOCKED|CAPTCHA|LOGIN_REQUIRED/.test(e))
          ? 'error'
          : 'completed';
      await updateCollectionRun(runId, {
        status: finalStatus,
        results_found: aggregated.totalFound,
        new_leads: aggregated.inserted,
        duplicates: aggregated.duplicates,
        rejected: aggregated.rejected,
        errors: aggregated.errors,
        queries_executed: queriesExecuted,
      });
    }

    return {
      source: aggregated.source,
      query: aggregated.query,
      location: aggregated.location,
      totalFound: aggregated.totalFound,
      inserted: aggregated.inserted,
      filled: aggregated.filled,
      duplicates: aggregated.duplicates,
      completeDuplicates: aggregated.completeDuplicates,
      rejected: aggregated.rejected,
      errors: aggregated.errors,
      leads: aggregated.leads,
      queriesExecuted,
      hasBlockingError: aggregated.errors.some((e) => /BLOCKED|CAPTCHA|LOGIN_REQUIRED|Falha fatal/.test(e)),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido no scraper Selenium';
    logger.error('Falha fatal no scraper Selenium', { error: message });
    throw err;
  } finally {
    if (scraper) {
      await scraper.close().catch(() => undefined);
    } else {
      await session.close().catch(() => undefined);
    }
  }
}

export const runScrape = runScrapeAsJob;