import { chromium, Browser, Page, ElementHandle } from 'playwright';
import { RawLead, ScrapeResult } from '../types';
import { logger } from '../logger';
import * as fs from 'fs';
import * as path from 'path';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

type SelectorStrategy = {
  name: string;
  container: string;
  items: string;
};

const GENERIC_NAMES = new Set([
  'Resultados',
  'Resultado',
  'Patrocinado',
  'Anúncio',
  'Mapa',
  'Saiba mais sobre a divulgação legal de avaliações públicas no Google Maps',
]);

const STRATEGIES: SelectorStrategy[] = [
  { name: 'feed-article', container: 'div[role="feed"]', items: 'article' },
  { name: 'feed-anchor', container: 'div[role="feed"]', items: 'a[href*="/maps/place/"]' },
  { name: 'feed-div', container: 'div[role="feed"]', items: '> div' },
  { name: 'aria-label-feed', container: '[aria-label*="Resultados"]', items: 'a[href*="/maps/place/"]' },
  { name: 'place-links', container: 'div', items: 'a[href*="/maps/place/"]' },
];

function ensureDebugDir(): string {
  const dir = path.resolve('debug/scraper');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function saveDebugArtifacts(page: Page, query: string, city: string, state: string, strategy: string, reason: string) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(ensureDebugDir(), stamp);
  fs.mkdirSync(dir, { recursive: true });

  const screenshotPath = path.join(dir, 'screenshot.png');
  const htmlPath = path.join(dir, 'page.html');
  const metaPath = path.join(dir, 'metadata.json');

  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
  const html = await page.evaluate(() => document.documentElement.outerHTML).catch(() => '');
  fs.writeFileSync(htmlPath, html || '', 'utf-8');

  const metadata = {
    timestamp: new Date().toISOString(),
    query,
    city,
    state,
    url: page.url(),
    title: await page.title().catch(() => ''),
    strategy,
    reason,
    userAgent: USER_AGENT,
    linkCount: await page.evaluate(() => document.links.length).catch(() => 0),
    placeLinkCount: await page.evaluate(() => Array.from(document.querySelectorAll('a[href*="/maps/place/"]')).length).catch(() => 0),
    roleCount: await page.evaluate(() => document.querySelectorAll('[role]').length).catch(() => 0),
    ariaLabelCount: await page.evaluate(() => document.querySelectorAll('[aria-label]').length).catch(() => 0),
  };

  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');
  logger.warn('Debug de coleta salvo', { dir, strategy, reason });
}

async function waitForResultsReady(page: Page): Promise<boolean> {
  try {
    await Promise.race([
      page.waitForSelector('div[role="feed"]', { timeout: 6000 }).then(() => true),
      page.waitForSelector('a[href*="/maps/place/"]', { timeout: 6000 }).then(() => true),
      page.waitForURL(/\/maps\/search\//, { timeout: 6000 }).then(() => true),
    ]);
    return true;
  } catch {
    return false;
  }
}

async function discoverResults(page: Page): Promise<{
  strategy: string;
  items: ElementHandle<Element>[];
  container: ElementHandle<Element> | null;
}> {
  for (const strategy of STRATEGIES) {
    try {
      const container = await page.waitForSelector(strategy.container, { timeout: 2000 }).catch(() => null);
      if (!container) continue;

      const items = await container.$$(strategy.items).catch(() => []);
      if (items.length > 0) {
        logger.info('Estratégia de seletor bem-sucedida', { strategy: strategy.name, count: items.length });
        return { strategy: strategy.name, items, container };
      }
    } catch {
      // tenta próxima estratégia
    }
  }

  return { strategy: 'none', items: [], container: null };
}

function detectPageState(page: Page): { status: string; reason: string } {
  const text = page.url() + ' ' + (page.content().catch(() => '') as any);

  if (/consent\.google\.com|consent\.google\.br/.test(text as string)) {
    return { status: 'CONSENT_REQUIRED', reason: 'Página de consentimento de cookies detectada.' };
  }
  if (/accounts\.google\.com/.test(text as string)) {
    return { status: 'LOGIN_REQUIRED', reason: 'Tela de login do Google detectada.' };
  }
  if (/sorry\/index\?/.test(text as string)) {
    return { status: 'BLOCKED', reason: 'Bloqueio/verificação de automação.' };
  }
  if (/captcha/.test((text as string).toLowerCase())) {
    return { status: 'CAPTCHA', reason: 'CAPTCHA detectado.' };
  }

  return { status: 'UNKNOWN', reason: 'Estrutura não reconhecida ou sem resultados.' };
}

export class GoogleMapsSource {
  private browser: Browser;
  private blocked = false;

  constructor(browser: Browser) {
    this.browser = browser;
  }

  async search(query: string, location: string, limit = 10): Promise<ScrapeResult> {
    const result: ScrapeResult = {
      source: 'google_maps',
      query: `${query} ${location}`,
      location,
      totalFound: 0,
      inserted: 0,
      filled: 0,
      duplicates: 0,
      completeDuplicates: 0,
      rejected: 0,
      errors: [],
      leads: [],
    };

    if (this.blocked) {
      result.errors.push('Google bloqueou automação anteriormente.');
      return result;
    }

    const page = await this.browser.newPage();
    try {
      await page.setExtraHTTPHeaders({ 'user-agent': USER_AGENT });
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query + ' ' + location)}?authuser=0&hl=pt-BR&g_ep=EgoyMDI2MDgyNC4w`;
      logger.info('Navegando para Google Maps', { url: searchUrl });

      const response = await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });

      if (!response || response.status() !== 200) {
        const state = detectPageState(page);
        result.errors.push(`Status ${response?.status() ?? 'indefinido'} — ${state.reason}`);
        this.blocked = true;
        return result;
      }

      await waitForResultsReady(page);

      const { strategy, items } = await discoverResults(page);

      result.totalFound = items.length;
      logger.info('Resultados encontrados', { strategy, count: items.length });

      if (items.length === 0) {
        const state = detectPageState(page);
        await saveDebugArtifacts(page, query, location.split(',')[0]?.trim() || location, location.split(',')[1]?.trim() || '', strategy, state.reason);
        result.errors.push(`Nenhum resultado encontrado. Motivo: ${state.reason}`);
        return result;
      }

      for (let i = 0; i < Math.min(items.length, limit); i++) {
        try {
          const lead = await this.extractItem(page, items[i], i, searchUrl);
          if (lead) {
            result.leads.push(lead);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Erro ao extrair item';
          result.errors.push(message);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido no Google Maps';
      logger.error('Falha no scraping do Google Maps', { error: message });
      result.errors.push(message);
      this.blocked = true;
    } finally {
      await page.close().catch(() => undefined);
    }

    return result;
  }

  private async extractItem(page: Page, item: ElementHandle<Element>, index: number, searchUrl: string): Promise<RawLead | null> {
    const data = await item.evaluate((el: Element, idx: number): Record<string, unknown> => {
      const GENERIC_NAMES = new Set([
        'Resultados',
        'Resultado',
        'Patrocinado',
        'Anúncio',
        'Mapa',
        'Saiba mais sobre a divulgação legal de avaliações públicas no Google Maps',
      ]);
      const cardEl = el as HTMLElement;
      const text = cardEl.innerText || '';

      const linkEl = cardEl.tagName === 'A'
        ? (cardEl as HTMLAnchorElement)
        : cardEl.querySelector<HTMLAnchorElement>('a[href*="/maps/place/"]');
      const mapsUrl = linkEl?.getAttribute('href') || undefined;
      const label = linkEl?.getAttribute('aria-label') || undefined;

      const nameEl = cardEl.querySelector<HTMLElement>('[role="heading"], h1, h2, h3');
      const fallbackName = cardEl.tagName === 'A'
        ? (cardEl as HTMLAnchorElement).textContent?.trim() || label?.replace(/^.*:\s*/, '')?.trim()
        : undefined;
      const name = nameEl?.textContent?.trim() || fallbackName || `Resultado ${idx + 1}`;

      if (!mapsUrl || GENERIC_NAMES.has(name) || name.startsWith('Resultado') || name === 'Resultados') {
        return {} as Record<string, unknown>;
      }

      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      const fullText = lines.join(' ').toLowerCase();

      const lead: Record<string, unknown> = { name, sourceUrl: mapsUrl, googleMapsUrl: mapsUrl };

      const categoryMatch = lines.find((l) => /despachante|advogado|direito|trânsito|detran|cnh/i.test(l));
      if (/despachante/.test(fullText)) {
        lead.category = 'despachante de trânsito';
        (lead as any).leadType = 'despachante';
      } else if (
        /advogado|direito de trânsito|trânsito direito|defesa de multa|suspensão cnh|cassação cnh/.test(fullText)
      ) {
        lead.category = categoryMatch ? (categoryMatch as string) : 'advogado direito de trânsito';
        (lead as any).leadType = 'advogado_transito';
      }

      const phoneMatch = lines.find((l) => /(?:\+\d{2}[\s-]?)?(?:\(?\d{2}\)?[\s-]?)?\d{4,5}[\s-]?\d{4}/.test(l));
      if (phoneMatch) {
        lead.phone = phoneMatch;
      }

      const addressLine = lines.find((l) => /^.+,\s*[a-zA-Z]{2}\s*$/m.test(l));
      if (addressLine) {
        lead.address = addressLine as string;
        const parts = (addressLine as string).split(',').map((p) => p.trim());
        if (parts.length >= 2) {
          lead.city = parts[parts.length - 2];
          lead.state = parts[parts.length - 1].replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase();
        }
      }

      const webLine = lines.find((l) => /^https?:\/\//i.test(l));
      if (webLine) {
        lead.website = webLine;
      }

      const ratingLine = lines.find((l) => /^\d([.,]\d+)?$/.test(l));
      if (ratingLine) {
        lead.rating = parseFloat((ratingLine as string).replace(',', '.'));
      }

      const reviewLine = lines.find((l) => /\d+\s+coment[áa]rios?/i.test(l));
      if (reviewLine) {
        const match = (reviewLine as string).match(/(\d+)/);
        if (match) {
          lead.reviewCount = parseInt(match[1], 10);
        }
      }

      if (!lead.category && mapsUrl) {
        const catMatch = (mapsUrl as string).match(/place\/([^/]+)/);
        if (catMatch) {
          const slug = decodeURIComponent(catMatch[1]).toLowerCase();
          if (slug.includes('despachante')) {
            lead.category = 'despachante de trânsito';
            (lead as any).leadType = 'despachante';
          } else if (slug.includes('advogado') || slug.includes('transito')) {
            lead.category = 'advogado direito de trânsito';
            (lead as any).leadType = 'advogado_transito';
          }
        }
      }

      return lead;
    }, index as any);

    const isEmpty = !data || Object.keys(data).length === 0 || !(data as any).name;
    return isEmpty ? null : (data as unknown as RawLead);
  }
}