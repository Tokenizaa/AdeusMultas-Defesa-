import { RawLead, ScrapeResult, QueryScrapeResult, ScrapedForKey } from '../types';
import { SeleniumSession } from './session';
import { Key, WebElement } from 'selenium-webdriver';
import { extractCleanPhone, cleanPhoneFromTel } from '../normalizer';
import { buildSeenKeys, isSeen, stillNeedsScroll } from '../seen-filter';
import { logger } from '../logger';

/**
 * Deriva CEP, UF e cidade de um endereço brasileiro completo.
 */
function deriveCityStateZip(address: string | null | undefined): { city?: string; state?: string; zipCode?: string } {
  if (!address) return {};
  const out: { city?: string; state?: string; zipCode?: string } = {};

  const zipMatch = address.match(/\b(\d{5}-?\d{3})\b/);
  if (zipMatch) out.zipCode = zipMatch[1].replace('-', '');

  const ufMatch = address.match(/\b([A-Za-z]{2})\b(?=[\s,;-]*$)/) || address.match(/\b([A-Za-z]{2})\b[\s,;-]*\d{5}/);
  if (ufMatch && /^[A-Za-z]{2}$/.test(ufMatch[1])) {
    const uf = ufMatch[1].toUpperCase();
    out.state = uf;

    const withoutZip = address.replace(/\d{5}-?\d{3}/g, ' ').trim();
    const ufIndex = withoutZip.toUpperCase().lastIndexOf(uf);
    if (ufIndex > 0) {
      const beforeUf = withoutZip.slice(0, ufIndex).trim();
      const parts = beforeUf.split(/[,，/-]/).map((p) => p.trim()).filter(Boolean);
      const city = parts[parts.length - 1];
      if (city && !/^\d+$/.test(city)) out.city = city;
    }
  }

  return out;
}

const GENERIC_NAMES = new Set([
  'Resultados', 'Resultado', 'Patrocinado', 'Anúncio', 'Mapa',
  'Saiba mais sobre a divulgação legal de avaliações públicas no Google Maps',
]);

const FEED_SELECTORS = [
  'div[role="feed"]',
  '[aria-label*="Resultados"]',
  'div',
];

interface DiscoveredCard {
  name: string;
  sourceUrl: string;
  googleMapsUrl: string;
  category?: string;
  leadType?: 'despachante' | 'advogado_transito';
  phone?: string;
  website?: string;
  email?: string;
  index: number;
}

interface ScraperProgress {
  phase: 'discovery' | 'details' | 'completed';
  discovered: number;
  processed: number;
  persisted: number;
  duplicates: number;
  errors: number;
}

interface ScraperCallbacks {
  onProgress?: (progress: ScraperProgress) => void;
  onCheckCancel?: () => boolean;
  onDriverCrash?: () => void;
}

export class GoogleMapsSeleniumScraper {
  private session: SeleniumSession;
  private blocked = false;
  private callbacks: ScraperCallbacks = {};

  constructor(session: SeleniumSession, callbacks: ScraperCallbacks = {}) {
    this.session = session;
    this.callbacks = callbacks;
  }

  setCallbacks(callbacks: ScraperCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  async detectPageState(): Promise<{ status: string; reason: string }> {
    const url = await this.session.getUrl();
    if (/consent\.google\.com|consent\.google\.br/.test(url)) {
      return { status: 'CONSENT_REQUIRED', reason: 'Página de consentimento de cookies detectada.' };
    }
    if (/accounts\.google\.com/.test(url)) {
      return { status: 'LOGIN_REQUIRED', reason: 'Tela de login do Google detectada.' };
    }
    if (/sorry\/index\?/.test(url)) {
      return { status: 'BLOCKED', reason: 'Bloqueio/verificação de automação.' };
    }
    if (/captcha/.test(url.toLowerCase())) {
      return { status: 'CAPTCHA', reason: 'CAPTCHA detectado.' };
    }
    return { status: 'UNKNOWN', reason: 'Estrutura não reconhecida ou sem resultados.' };
  }

  private async findFeedContainer(): Promise<string | null> {
    for (const sel of FEED_SELECTORS) {
      const found = await this.session.findElements(sel);
      if (found.length > 0) {
        const links = await this.session.findElements(`${sel} a[href*="/maps/place/"]`);
        if (links.length > 0 || sel === 'div[role="feed"]') {
          return sel;
        }
      }
    }
    return null;
  }

  private async getPlaceLinkCount(containerSelector: string): Promise<number> {
    const driver = await this.session.getDriver();
    try {
      return await driver.executeScript<number>(
        `return document.querySelectorAll(arguments[0] + ' a[href*="/maps/place/"]').length;`,
        containerSelector,
      );
    } catch {
      return 0;
    }
  }

  private async scrollUntilNoNewItems(
    feedSelector: string,
    targetNewCount: number,
    existingCount: number,
    maxScrolls = 200,
  ): Promise<{ selector: string; newCount: number; stopped: 'limit_reached' | 'no_new' | 'max_scrolls' | 'error' }> {
    const WAIT_BETWEEN_SCROLLS = 3000;
    const STABLE_THRESHOLD = 5;

    let lastCount = existingCount;
    let stableRounds = 0;
    let stopped: 'limit_reached' | 'no_new' | 'max_scrolls' | 'error' = 'no_new';

    for (let scrolls = 0; scrolls < maxScrolls; scrolls++) {
      if (this.callbacks.onCheckCancel?.()) {
        logger.info('Scroll cancelado pelo usuário', { jobId: this.callbacks });
        stopped = 'no_new';
        break;
      }

      await this.session.scrollContainer(feedSelector);
      await this.session.wait(WAIT_BETWEEN_SCROLLS);

      const afterCount = await this.getPlaceLinkCount(feedSelector);
      const delta = afterCount - lastCount;
      const newCollected = Math.max(0, afterCount - existingCount);

      logger.info('Scroll progressivo', {
        scroll: scrolls + 1,
        before: lastCount,
        after: afterCount,
        delta,
        newCollected,
        targetNewCount,
      });

      if (delta > 0) {
        stableRounds = 0;
        lastCount = afterCount;
      } else {
        stableRounds += 1;
      }

      if (newCollected >= targetNewCount && targetNewCount > 0) {
        stopped = 'limit_reached';
        break;
      }

      if (stableRounds >= STABLE_THRESHOLD && delta === 0) {
        stopped = 'no_new';
        break;
      }
    }

    if (stopped !== 'limit_reached') {
      const finalCount = await this.getPlaceLinkCount(feedSelector);
      if (finalCount === lastCount && stableRounds >= STABLE_THRESHOLD) {
        stopped = 'no_new';
      } else if (stableRounds < STABLE_THRESHOLD) {
        stopped = 'max_scrolls';
      }
    }

    return { selector: feedSelector, newCount: Math.max(0, lastCount - existingCount), stopped };
  }

  /**
   * FASE 1 - DISCOVERY: Coleta todos os cards do feed sem abrir detalhes.
   * Retorna array de DiscoveredCard com URL e dados básicos.
   */
  private async discoverAllCards(
    feedSelector: string,
    requiredNew: number,
    seenKeys: Set<string>,
  ): Promise<DiscoveredCard[]> {
    const driver = await this.session.getDriver();
    const genericNames = Array.from(GENERIC_NAMES);
    const discovered: DiscoveredCard[] = [];
    let extraScrollRounds = 0;
    const maxExtraScrollRounds = 3;

    while (true) {
      if (this.callbacks.onCheckCancel?.()) break;
      if (requiredNew > 0 && discovered.length >= requiredNew) break;

      const cards = await driver.findElements({ css: `${feedSelector} a[href*="/maps/place/"]` });

      for (let i = discovered.length; i < cards.length; i++) {
        if (this.callbacks.onCheckCancel?.()) break;
        if (requiredNew > 0 && discovered.length >= requiredNew) break;

        const cardEl = cards[i];
        try {
          const data = (await driver.executeScript(
            (element: WebElement, idx: number, genericNames: string[]) => {
              const GENERIC_NAMES = new Set(genericNames);
              const cardEl = element as unknown as HTMLElement;
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
              let leadType: 'despachante' | 'advogado_transito' | undefined;
              if (/despachante/.test(fullText)) {
                lead.category = 'despachante de trânsito';
                leadType = 'despachante';
              } else if (
                /advogado|direito de trânsito|trânsito direito|defesa de multa|suspensão cnh|cassação cnh/.test(fullText)
              ) {
                lead.category = categoryMatch ? (categoryMatch as string) : 'advogado direito de trânsito';
                leadType = 'advogado_transito';
              }

              if (!lead.category && mapsUrl) {
                const catMatch = (mapsUrl as string).match(/place\/([^/]+)/);
                if (catMatch) {
                  const slug = decodeURIComponent(catMatch[1]).toLowerCase();
                  if (slug.includes('despachante')) {
                    lead.category = 'despachante de trânsito';
                    leadType = 'despachante';
                  } else if (slug.includes('advogado') || slug.includes('transito')) {
                    lead.category = 'advogado direito de trânsito';
                    leadType = 'advogado_transito';
                  }
                }
              }

              return { ...lead, leadType };
            }, cardEl, i)) as DiscoveredCard | null;

          if (!data || !data.sourceUrl) continue;

          // Skip já visto nesta query
          if (discovered.some((d) => d.sourceUrl === data.sourceUrl)) continue;

          // Skip já visto no banco (cross-execution)
          if (isSeen(seenKeys, data.sourceUrl, data.phone, data.website, data.email)) {
            logger.info('Card já conhecido (banco), pulando', { url: data.sourceUrl });
            continue;
          }

          discovered.push(data);
        } catch (err) {
          logger.warn('Erro ao extrair card base', { index: i, error: err instanceof Error ? err.message : err });
        }
      }

      if (discovered.length >= cards.length) {
        // Pool visível esgotado: tentar scroll extra
        if (stillNeedsScroll(discovered.length, requiredNew, extraScrollRounds, maxExtraScrollRounds)) {
          const loaded = await this.getPlaceLinkCount(feedSelector);
          const more = await this.scrollUntilNoNewItems(feedSelector, requiredNew - discovered.length, loaded);
          if (more.newCount === 0) break;
          extraScrollRounds += 1;
          continue;
        }
        break;
      }
    }

    logger.info('Discovery concluído', { totalDiscovered: discovered.length });
    return discovered;
  }

  /**
   * FASE 2 - DETAIL EXTRACTION: Para cada card descoberto, navega direto para a URL
   * e extrai detalhes completos. Não usa click/back - navega direto.
   */
  private async extractDetailsForCards(
    discovered: DiscoveredCard[],
    seenKeys: Set<string>,
    scrapedFor: ScrapedForKey,
  ): Promise<{ leads: RawLead[]; duplicates: number; rejected: number; errors: string[] }> {
    const leads: RawLead[] = [];
    let duplicates = 0;
    let rejected = 0;
    const errors: string[] = [];

    for (let i = 0; i < discovered.length; i++) {
      if (this.callbacks.onCheckCancel?.()) break;

      const card = discovered[i];

      try {
        this.callbacks.onProgress?.({
          phase: 'details',
          discovered: discovered.length,
          processed: i + 1,
          persisted: leads.length,
          duplicates,
          errors: errors.length,
        });

        // Navegar direto para a URL do place (não click no feed)
        await this.session.navigate(card.sourceUrl);
        await this.session.wait(2500);

        // Aguardar painel de detalhes
        const detailReady = await this.session.waitForSelector(
          'a[href^="tel:"], button[data-item-id="address"], button[data-item-id="oh"], div[role="main"]',
          8000,
        );
        if (!detailReady) await this.session.wait(1500);

        // Extrair dados do painel
        const detail = await this.extractDetailFromPanel();

        const enriched: RawLead = {
          name: card.name,
          category: card.category,
          sourceUrl: card.sourceUrl,
          googleMapsUrl: card.googleMapsUrl,
          lead_type: card.leadType,
          ...detail,
          scrapedAt: new Date().toISOString(),
          searchTerm: scrapedFor.query,
          searchLocation: `${scrapedFor.city}, ${scrapedFor.state}`,
        } as RawLead;

        // Registrar chaves para dedup
        for (const key of buildSeenKeys(enriched.sourceUrl, enriched.phone, enriched.website, enriched.email)) {
          seenKeys.add(key);
        }

        leads.push(enriched);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao extrair detalhe';
        errors.push(message);
        rejected += 1;
        logger.warn('Erro ao processar card', { url: card.sourceUrl, error: message });
      }
    }

    return { leads, duplicates, rejected, errors };
  }

  /**
   * Extrai dados completos do painel de detalhes via DOM.
   * Não depende de click/back - apenas lê o DOM atual.
   */
  private async extractDetailFromPanel(): Promise<Partial<RawLead>> {
    const driver = await this.session.getDriver();
    const detail: Partial<RawLead> = {};

    try {
      const panelData = (await driver.executeScript(() => {
        const data: Record<string, unknown> = {};
        const rawData: Record<string, unknown> = {};

        // Telefone: primeiro link tel:
        const telLink = document.querySelector<HTMLAnchorElement>('a[href^="tel:"]');
        if (telLink) {
          data.phoneRaw = telLink.getAttribute('href') || undefined;
          data.phoneLabel = telLink.getAttribute('aria-label') || telLink.textContent?.trim() || undefined;
          rawData.phoneHref = telLink.getAttribute('href');
          rawData.phoneAriaLabel = telLink.getAttribute('aria-label');
        }

        // Website: primeiro link http fora do domínio Google
        const siteLink = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="http"]')).find(
          (a) =>
            a.href &&
            !/^https?:\/\/(www\.)?((.*\.)?google\.(com|com\.br|br)|maps\.google\.)/i.test(a.href) &&
            !/(support\.google|policies\.google|accounts\.google|maps\.google)/i.test(a.href),
        );
        if (siteLink) {
          data.website = siteLink.href;
          rawData.websiteHref = siteLink.href;
        }

        // Endereço
        const addrBtn = document.querySelector<HTMLElement>(
          'button[data-item-id="address"], div[data-item-id="address"]',
        );
        if (addrBtn) {
          data.address = addrBtn.textContent?.trim() || undefined;
          rawData.addressText = addrBtn.textContent?.trim();
        }

        // Horários
        const hoursBtn = document.querySelector<HTMLElement>('button[data-item-id="oh"]');
        if (hoursBtn) {
          data.openingHours = hoursBtn.textContent?.trim() || undefined;
          rawData.openingHoursText = hoursBtn.textContent?.trim();
        }

        // Rating
        const ratingEl = Array.from(document.querySelectorAll<HTMLElement>('[role="img"][aria-label]')).find((el) =>
          /(estrelas?|stars?|5)/i.test(el.getAttribute('aria-label') || ''),
        );
        if (ratingEl) {
          const label = ratingEl.getAttribute('aria-label') || '';
          const m = label.match(/(\d+[.,]\d+)/);
          if (m) data.rating = parseFloat(m[1].replace(',', '.'));
          rawData.ratingAriaLabel = label;
        }

        // Total de avaliações
        const mainText =
          document.querySelector<HTMLElement>('div[role="main"], [data-item-id="address"]')?.textContent || '';
        const reviewMatch = mainText.match(/(\d{1,6})\s+(avaliações?|comentários?|reviews?)/i);
        if (reviewMatch) data.reviewCount = parseInt(reviewMatch[1], 10);
        rawData.mainTextSnippet = mainText.slice(0, 2000);

        // Place ID
        const placeIdMatch = window.location.href.match(/place\/([^\/]+)/);
        if (placeIdMatch) {
          data.placeId = placeIdMatch[1];
          rawData.placeIdFromUrl = placeIdMatch[1];
        }

        // Preço
        const priceEl = document.querySelector<HTMLElement>('[data-price-level], [aria-label*="Preço"], [aria-label*="price"]');
        if (priceEl) {
          const priceText = priceEl.textContent || priceEl.getAttribute('aria-label') || '';
          const priceMatch = priceText.match(/[€$R\$]\s*\d+|gratuito|free|\$\d+/i);
          if (priceMatch) data.priceLevel = priceMatch[0];
          rawData.priceText = priceText;
        }

        // Status
        const statusEl = document.querySelector<HTMLElement>(
          '[data-item-id="oh"] ~ div, .ZDu9vd, [aria-label*="Aberto"], [aria-label*="Fechado"], [aria-label*="Open"], [aria-label*="Closed"]',
        );
        if (statusEl) {
          data.currentStatus = statusEl.textContent?.trim() || undefined;
          rawData.currentStatusText = statusEl.textContent?.trim();
        }

        // Descrição
        const descEl = document.querySelector<HTMLElement>('[data-item-id="description"], [jsaction*="description"], .PYvSYb');
        if (descEl) {
          data.description = descEl.textContent?.trim() || undefined;
          rawData.descriptionText = descEl.textContent?.trim();
        }

        // Lat/Lng
        const latLngMatch = window.location.href.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (latLngMatch) {
          data.latitude = parseFloat(latLngMatch[1]);
          data.longitude = parseFloat(latLngMatch[2]);
          rawData.latLngFromUrl = { lat: latLngMatch[1], lng: latLngMatch[2] };
        }

        // Plus Code
        const plusCodeEl = document.querySelector<HTMLElement>('[data-item-id="plus_code"], [aria-label*="Plus Code"]');
        if (plusCodeEl) {
          data.plusCode = plusCodeEl.textContent?.trim() || undefined;
          rawData.plusCodeText = plusCodeEl.textContent?.trim();
        }

        // Social links
        const socialLinks: string[] = [];
        const socialSelectors = [
          'a[href*="instagram.com"]',
          'a[href*="facebook.com"]',
          'a[href*="linkedin.com"]',
          'a[href*="twitter.com"]',
          'a[href*="youtube.com"]',
        ];
        for (const sel of socialSelectors) {
          const els = document.querySelectorAll<HTMLAnchorElement>(sel);
          els.forEach((el) => {
            if (el.href && !socialLinks.includes(el.href)) socialLinks.push(el.href);
          });
        }
        if (socialLinks.length > 0) {
          data.socialLinks = socialLinks;
          rawData.socialLinks = socialLinks;
        }

        // HTML do painel (limitado)
        const panel = document.querySelector<HTMLElement>('div[role="main"]');
        if (panel) {
          rawData.panelHtml = panel.innerHTML.slice(0, 50000);
        }

        data.rawData = rawData;
        return data;
      }).catch(() => ({}))) as Record<string, unknown>;

      // Processar telefone
      const telHref = (panelData.phoneRaw as string) || '';
      const telLabel = (panelData.phoneLabel as string) || '';
      const phoneFromHref = cleanPhoneFromTel(telHref);
      const phoneFromLabel = extractCleanPhone(telLabel);
      const phone = phoneFromHref || phoneFromLabel;
      if (phone) detail.phone = phone;

      if (panelData.website) detail.website = panelData.website as string;
      if (panelData.address) {
        detail.address = panelData.address as string;
        const derived = deriveCityStateZip(panelData.address as string);
        if (derived.city) detail.city = derived.city;
        if (derived.state) detail.state = derived.state;
        if (derived.zipCode) detail.zipCode = derived.zipCode;
      }
      if (panelData.rating != null) detail.rating = panelData.rating as number;
      if (panelData.reviewCount != null) detail.reviewCount = panelData.reviewCount as number;
      if (panelData.openingHours) detail.openingHours = panelData.openingHours as string;
      if (panelData.placeId) detail.placeId = panelData.placeId as string;
      if (panelData.priceLevel) detail.priceLevel = panelData.priceLevel as number;
      if (panelData.currentStatus) detail.currentStatus = panelData.currentStatus as string;
      if (panelData.description) detail.description = panelData.description as string;
      if (panelData.latitude != null) detail.latitude = panelData.latitude as number;
      if (panelData.longitude != null) detail.longitude = panelData.longitude as number;
      if (panelData.plusCode) detail.plusCode = panelData.plusCode as string;
      if (panelData.socialLinks) detail.socialLinks = panelData.socialLinks as string[];
      if (panelData.rawData) detail.rawData = panelData.rawData as Record<string, unknown>;
    } catch (err) {
      logger.warn('Falha ao extrair painel de detalhes', { error: err instanceof Error ? err.message : err });
    }

    return detail;
  }

  /**
   * Método principal de busca com arquitetura discovery-first.
   */
  async search(
    query: string,
    location: string,
    requiredNew: number,
    seenKeys: Set<string>,
  ): Promise<QueryScrapeResult> {
    const result: QueryScrapeResult = {
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

    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query + ' ' + location)}?authuser=0&hl=pt-BR&g_ep=EgoyMDI2MDgyNC4w`;

    try {
      await this.session.navigate(searchUrl);
      await this.session.wait(3000);

      const ready = await this.session.waitForSelector('a[href*="/maps/place/"], div[role="feed"]', 10000);
      if (!ready) {
        const state = await this.detectPageState();
        result.errors.push(`Timeout aguardando resultados. Motivo: ${state.reason}`);
        result.errors.push(`URL: ${await this.session.getUrl()}`);
        return result;
      }

      await this.session.wait(2000);

      const feedSelector = await this.findFeedContainer();
      if (!feedSelector) {
        const state = await this.detectPageState();
        result.errors.push(`Feed não encontrado. Motivo: ${state.reason}`);
        result.errors.push(`URL: ${await this.session.getUrl()}`);
        return result;
      }

      const initialCount = await this.getPlaceLinkCount(feedSelector);
      logger.info('Resultados iniciais no DOM', { count: initialCount, query });

      // Scroll até o fim (ou limite)
      this.callbacks.onProgress?.({
        phase: 'discovery',
        discovered: 0,
        processed: 0,
        persisted: 0,
        duplicates: 0,
        errors: 0,
      });

      const scrollResult = await this.scrollUntilNoNewItems(feedSelector, requiredNew, initialCount);

      logger.info('Scroll concluído', {
        initialCount,
        finalCount: initialCount + scrollResult.newCount,
        newLoaded: scrollResult.newCount,
        stopped: scrollResult.stopped,
        query,
      });

      result.totalFound = initialCount + scrollResult.newCount;

      if (result.totalFound === 0) {
        result.errors.push('Nenhum card encontrado no feed após scroll.');
        return result;
      }

      // FASE 1: Discovery - coletar todos os cards
      this.callbacks.onProgress?.({
        phase: 'discovery',
        discovered: result.totalFound,
        processed: 0,
        persisted: 0,
        duplicates: 0,
        errors: 0,
      });

      const discovered = await this.discoverAllCards(feedSelector, requiredNew, seenKeys);

      logger.info('Discovery finalizado', { totalCards: discovered.length });

      // FASE 2: Detail Extraction - processar cada card
      const scrapedFor: ScrapedForKey = {
        query,
        city: location.split(',')[0]?.trim() || location,
        state: (location.split(',')[1]?.trim() || '').slice(0, 2).toUpperCase(),
        source: 'google_maps',
      };

      const detailResult = await this.extractDetailsForCards(discovered, seenKeys, scrapedFor);

      result.leads = detailResult.leads;
      result.duplicates = detailResult.duplicates;
      result.rejected = detailResult.rejected;
      result.errors.push(...detailResult.errors);

      this.callbacks.onProgress?.({
        phase: 'completed',
        discovered: result.totalFound,
        processed: discovered.length,
        persisted: detailResult.leads.length,
        duplicates: detailResult.duplicates,
        errors: detailResult.errors.length,
      });

      logger.info('Extração concluída', {
        query,
        totalItems: result.totalFound,
        newLeads: result.leads.length,
        duplicates: detailResult.duplicates,
        rejected: detailResult.rejected,
        scrollStopped: scrollResult.stopped,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido no Google Maps';
      logger.error('Falha no scraping do Google Maps (Selenium)', { error: message });
      result.errors.push(message);
      this.blocked = true;

      if (err instanceof Error && (err.name === 'WebDriverError' || err.message.includes('session'))) {
        this.callbacks.onDriverCrash?.();
      }
    }

    return result;
  }

  async close(): Promise<void> {
    await this.session.close();
  }
}