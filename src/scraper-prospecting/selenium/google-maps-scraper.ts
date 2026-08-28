import { RawLead, ScrapeResult, QueryScrapeResult, ScrapedForKey } from '../types';
import { SeleniumSession } from './session';
import { Key, WebElement } from 'selenium-webdriver';
import { logger } from '../logger';

/**
 * Regex de telefone brasileiro: captura apenas o trecho do número (match[0]),
 * não a linha inteira. Aceita: +55, DDD entre parênteses separado por espaço/cifrão,
 * 4-5 dígitos + 4 dígitos.
 */
const BR_PHONE_RE = /(?:\+?55[\s-]?)?(?:\(?(\d{2})\)?[\s-]?)?(\d{4,5}[\s-]?\d{4})/;

/** Extrai o telefone limpo (apenas dígitos com DDD) de um texto arbitrário. */
function extractCleanPhone(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.match(BR_PHONE_RE);
  if (!match) return null;
  let digits = match[0].replace(/\D/g, '');
  // Remove prefixo internacional 55 que precede o DDD (+5551... -> 51...)
  if (digits.length >= 13 && digits.startsWith('55')) {
    digits = digits.slice(2);
  }
  if (digits.length >= 10 && digits.length <= 11) {
    return digits;
  }
  return null;
}

/** Limpa um href tel: (ex: tel:+555140666564) para dígitos com DDD. */
function cleanPhoneFromTel(href: string | null | undefined): string | null {
  if (!href) return null;
  let digits = href.replace(/\D/g, '');
  if (digits.length >= 12 && digits.startsWith('55')) {
    digits = digits.slice(2);
  }
  if (digits.length >= 10 && digits.length <= 11) {
    return digits;
  }
  return null;
}

/**
 * Deriva CEP, UF e cidade de um endereço brasileiro completo.
 * Heurística: CEP no formato 99999-999; UF = 2 letras maiúsculas perto do fim;
 * cidade = texto entre a última separação e a UF.
 */
function deriveCityStateZip(address: string | null | undefined): { city?: string; state?: string; zipCode?: string } {
  if (!address) return {};
  const out: { city?: string; state?: string; zipCode?: string } = {};

  const zipMatch = address.match(/\b(\d{5}-?\d{3})\b/);
  if (zipMatch) out.zipCode = zipMatch[1].replace('-', '');

  // UF: 2 letras maiúsculas no fim da string, ou logo antes do CEP
  const ufMatch = address.match(/\b([A-Za-z]{2})\b(?=[\s,;-]*$)/) || address.match(/\b([A-Za-z]{2})\b[\s,;-]*\d{5}/);
  if (ufMatch && /^[A-Za-z]{2}$/.test(ufMatch[1])) {
    const uf = ufMatch[1].toUpperCase();
    out.state = uf;

    // Cidade: segmento mais próximo antes da UF
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
  'Resultados',
  'Resultado',
  'Patrocinado',
  'Anúncio',
  'Mapa',
  'Saiba mais sobre a divulgação legal de avaliações públicas no Google Maps',
]);

const FEED_SELECTORS = [
  'div[role="feed"]',
  '[aria-label*="Resultados"]',
  'div',
];

const ITEM_SELECTORS = [
  'a[href*="/maps/place/"]',
  '[role="heading"]',
  '> div',
];

export class GoogleMapsSeleniumScraper {
  private session: SeleniumSession;
  private blocked = false;

  constructor(session: SeleniumSession) {
    this.session = session;
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
        // validar se há links de place dentro
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
    const WAIT_BETWEEN_SCROLLS = 4000;
    const STABLE_THRESHOLD = 5;

    let lastCount = existingCount;
    let stableRounds = 0;
    let stopped: 'limit_reached' | 'no_new' | 'max_scrolls' | 'error' = 'no_new';

    for (let scrolls = 0; scrolls < maxScrolls; scrolls++) {
      await this.session.scrollContainer(feedSelector);
      await this.session.wait(WAIT_BETWEEN_SCROLLS);

      const afterCount = await this.getPlaceLinkCount(feedSelector);
      const delta = afterCount - lastCount;
      const newCollected = Math.max(0, afterCount - existingCount);

      logger.info('Scroll progressivo', {
        scroll: scrolls + 1,
        method: 'container-scrollTop-selenium',
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

    if (stopped === 'no_new' && maxScrolls > 0 && stableRounds >= STABLE_THRESHOLD) {
      // nothing
    } else if (stopped !== 'limit_reached') {
      const finalCount = await this.getPlaceLinkCount(feedSelector);
      if (finalCount === lastCount && stableRounds >= STABLE_THRESHOLD) {
        stopped = 'no_new';
      } else if (maxScrolls > 0 && stableRounds < STABLE_THRESHOLD) {
        stopped = 'max_scrolls';
      }
    }

    return { selector: feedSelector, newCount: Math.max(0, lastCount - existingCount), stopped };
  }

  /**
   * Abre o card de um place para carregar o painel de detalhes do Google Maps e
   * extrai os campos que o feed NÃO expõe (telefone, website, endereço, horários,
   * rating, total de avaliações). Fecha o card ao final para prosseguir ao próximo.
   * `restoreUrl` é usado para restaurar o feed caso o fechamento colapse a página
   * para a view de mapa (observado em alguns tamanhos de viewport).
   */
  private async openCardAndExtractDetail(cardEl: WebElement, restoreUrl: string): Promise<Partial<RawLead> & { opened: boolean }> {
    const driver = await this.session.getDriver();
    const detail: Partial<RawLead> & { opened: boolean } = { opened: false };

    try {
      // 1. Abrir o card (clique nativo com fallback via JS)
      try {
        await cardEl.click();
      } catch {
        await driver.executeScript(`arguments[0].click();`, cardEl).catch(() => undefined);
      }
      await this.session.wait(2500);

      // 2. Aguardar o painel de detalhes carregar (presença de tel:/endereço/horários ou navegação)
      const detailReady = await this.session.waitForSelector(
        'a[href^="tel:"], button[data-item-id="address"], button[data-item-id="oh"], div[role="main"] [data-item-id="address"]',
        7000,
      );
      if (!detailReady) {
        // pode ter navegado ou o painel não carregou; tentar mesmo assim via DOM global
        await this.session.wait(1500);
      }
      detail.opened = true;

      // 3. Extrair dados do painel de detalhes via DOM (robusto a ausência de seletores)
      const panelData = (await driver.executeScript(() => {
        const data: Record<string, unknown> = {};

        // Telefone: primeiro link tel: (href ou aria-label)
        const telLink = document.querySelector<HTMLAnchorElement>('a[href^="tel:"]');
        if (telLink) {
          data.phoneRaw = telLink.getAttribute('href') || undefined;
          data.phoneLabel = telLink.getAttribute('aria-label') || telLink.textContent?.trim() || undefined;
        }

        // Website: primeiro link http fora do domínio Google (maps/contas/suporte)
        const siteLink = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="http"]')).find(
          (a) =>
            a.href &&
            !/^https?:\/\/(www\.)?((.*\.)?google\.(com|com\.br|br)|maps\.google\.)/i.test(a.href) &&
            !/(support\.google|policies\.google|accounts\.google|maps\.google)/i.test(a.href),
        );
        if (siteLink) data.website = siteLink.href;

        // Endereço
        const addrBtn = document.querySelector<HTMLElement>(
          'button[data-item-id="address"], div[data-item-id="address"]',
        );
        if (addrBtn) data.address = addrBtn.textContent?.trim() || undefined;

        // Horários de funcionamento
        const hoursBtn = document.querySelector<HTMLElement>('button[data-item-id="oh"]');
        if (hoursBtn) data.openingHours = hoursBtn.textContent?.trim() || undefined;

        // Rating (aria-label com estrelas)
        const ratingEl = Array.from(document.querySelectorAll<HTMLElement>('[role="img"][aria-label]')).find((el) =>
          /(estrelas?|stars?|5)/i.test(el.getAttribute('aria-label') || ''),
        );
        if (ratingEl) {
          const label = ratingEl.getAttribute('aria-label') || '';
          const m = label.match(/(\d+[.,]\d+)/);
          if (m) data.rating = parseFloat(m[1].replace(',', '.'));
        }

        // Total de avaliações: regex no texto do painel principal
        const mainText =
          document.querySelector<HTMLElement>('div[role="main"], [data-item-id="address"]')?.textContent || '';
        const reviewMatch = mainText.match(/(\d{1,6})\s+(avaliações?|comentários?|reviews?)/i);
        if (reviewMatch) data.reviewCount = parseInt(reviewMatch[1], 10);

        return data;
      }).catch(() => ({}))) as Record<string, unknown>;

      // Telefone limpo a partir do href tel: (prioridade) ou label
      const telHref = (panelData.phoneRaw as string) || '';
      const telLabel = (panelData.phoneLabel as string) || '';
      const phoneFromHref = cleanPhoneFromTel(telHref);
      const phoneFromLabel = extractCleanPhone(telLabel);
      const phone = phoneFromHref || phoneFromLabel;
      if (phone) {
        detail.phone = phone;
      } else {
        // Fallback: procurar telefone no texto do painel
        const panelText = (await driver.executeScript(
          `const m = document.querySelector('div[role="main"]') || document.body; return m ? m.innerText.slice(0, 5000) : '';`,
        ).catch(() => '')) as string;
        const cleanPhone = extractCleanPhone(panelText);
        if (cleanPhone) detail.phone = cleanPhone;
      }

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
    } catch (err) {
      logger.warn('Falha ao abrir/extrair detalhe do card', {
        error: err instanceof Error ? err.message : 'erro desconhecido',
      });
    } finally {
      // 4. Fechar o card (Escape) para voltar ao feed
      try {
        await driver.actions().sendKeys(Key.ESCAPE).perform();
      } catch {
        /* ignore */
      }
      await this.session.wait(1200);

      // Se o fechamento colapsou a página (feed sumiu), re-navegar para restaurar a listagem
      const remaining = await this.getPlaceLinkCount('div');
      if (remaining === 0 && restoreUrl) {
        logger.info('Feed colapsado após fechar card, restaurando listagem', { restoreUrl });
        await this.session.navigate(restoreUrl);
        await this.session.wait(3500);
      }
    }

    return detail;
  }

  /** Extrai apenas os dados básicos do card no feed (nome, url, categoria), SEM abrir o detalhe. */
  private async extractBaseFromElement(el: WebElement, index: number): Promise<RawLead | null> {
    const driver = await this.session.getDriver();
    const genericNames = Array.from(GENERIC_NAMES);
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
      if (/despachante/.test(fullText)) {
        lead.category = 'despachante de trânsito';
        (lead as any).leadType = 'despachante';
      } else if (
        /advogado|direito de trânsito|trânsito direito|defesa de multa|suspensão cnh|cassação cnh/.test(fullText)
      ) {
        lead.category = categoryMatch ? (categoryMatch as string) : 'advogado direito de trânsito';
        (lead as any).leadType = 'advogado_transito';
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
    }, el, index)) as RawLead | null;

    const isEmpty = !data || Object.keys(data).length === 0 || !(data as any).name;
    return isEmpty ? null : (data as RawLead);
  }

  /** Abre o card de detalhe e mergir os campos ricos (telefone/endereço/website/horários/etc.) no lead. */
  private async enrichFromDetail(el: WebElement, lead: RawLead, restoreUrl: string): Promise<RawLead> {
    const detail = await this.openCardAndExtractDetail(el, restoreUrl);

    // Preferir dados do painel de detalhes quando disponíveis; caso contrário manter os do feed
    if (detail.phone) lead.phone = detail.phone;
    if (detail.website) lead.website = detail.website;
    if (detail.address) {
      lead.address = detail.address;
      if (detail.city) lead.city = detail.city as string;
      if (detail.state) lead.state = detail.state as string;
      if (detail.zipCode) lead.zipCode = detail.zipCode as string;
    }
    if (detail.rating != null) lead.rating = detail.rating;
    if (detail.reviewCount != null) lead.reviewCount = detail.reviewCount;

    return lead;
  }

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

      const scrollResult = await this.scrollUntilNoNewItems(
        feedSelector,
        requiredNew,
        initialCount,
      );

      logger.info('Scroll concluído', {
        strategy: 'infinite-scroll-selenium',
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

      const driver = await this.session.getDriver();

      const seenInThisQuery = new Set<string>();
      let duplicatesThisQuery = 0;
      let rejectedThisQuery = 0;

      // Abrir o card provoca re-render do feed (invalida os WebElements anteriores).
      // Por isso os cards são re-consultados a cada iteração, em vez de manter um array fixo.
      let i = 0;
      const maxIterations = 200;
      while (i < maxIterations) {
        if (requiredNew > 0 && result.leads.length >= requiredNew) {
          logger.info('Limite maxResults atingido, parando abertura de cards', {
            collected: result.leads.length,
            limit: requiredNew,
          });
          break;
        }

        const cards = await driver.findElements({ css: `${feedSelector} a[href*="/maps/place/"]` });
        if (i >= cards.length) {
          // Não há mais cards novos no DOM
          break;
        }
        const cardEl = cards[i];

        try {
          // 1. Extrai apenas a base do feed (sem abrir) para decidir duplicata/rejeição barato
          const lead = await this.extractBaseFromElement(cardEl, i);
          if (!lead || !lead.sourceUrl) {
            rejectedThisQuery += 1;
            i += 1;
            continue;
          }

          if (seenInThisQuery.has(lead.sourceUrl)) {
            duplicatesThisQuery += 1;
            i += 1;
            continue;
          }
          seenInThisQuery.add(lead.sourceUrl);

          const phoneKey = (lead.phone || '').replace(/\D/g, '');
          const webKey = (lead.website || '').toLowerCase().trim();
          const emailKey = (lead.email || '').toLowerCase().trim();
          const compositeKey = [lead.sourceUrl, phoneKey, webKey, emailKey].filter(Boolean).join('|');

          if (compositeKey && seenKeys.has(compositeKey)) {
            duplicatesThisQuery += 1;
            i += 1;
            continue;
          }

          // 2. É um lead novo: abrir o card de detalhe para enriquecer
          const enriched = await this.enrichFromDetail(cardEl, lead, searchUrl);

          if (compositeKey) {
            seenKeys.add(compositeKey);
          }

          result.leads.push(enriched);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Erro ao extrair item';
          result.errors.push(message);
          rejectedThisQuery += 1;
        }

        i += 1;
      }

      result.duplicates = duplicatesThisQuery;
      result.rejected = rejectedThisQuery;

      logger.info('Extração concluída', {
        query,
        totalItems: result.totalFound,
        newLeads: result.leads.length,
        duplicates: duplicatesThisQuery,
        rejected: rejectedThisQuery,
        scrollStopped: scrollResult.stopped,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido no Google Maps';
      logger.error('Falha no scraping do Google Maps (Selenium)', { error: message });
      result.errors.push(message);
      this.blocked = true;
    }

    return result;
  }

  async close(): Promise<void> {
    await this.session.close();
  }
}