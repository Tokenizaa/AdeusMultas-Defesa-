import { RawLead, ScrapeResult } from '../types';
import { logger } from '../logger';

const FIRECRAWL_API_BASE = 'https://api.firecrawl.dev/v2';

interface FirecrawlSearchResponse {
  success: boolean;
  data: {
    web?: {
      title: string;
      url: string;
      description: string;
    }[];
    // Firecrawl v2 might return different structure, but we adapt
  };
}

export class FirecrawlSource {
  private apiKey: string;
  private blocked = false;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(query: string, location: string, limit = 10): Promise<ScrapeResult> {
    const result: ScrapeResult = {
      source: 'firecrawl',
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
      result.errors.push('Firecrawl blocked previously.');
      return result;
    }

    if (!this.apiKey) {
      result.errors.push('Firecrawl API key not configured.');
      this.blocked = true;
      return result;
    }

    try {
      const searchQuery = `${query} ${location} despachante ou advogado trânsito`;
      const response = await fetch(`${FIRECRAWL_API_BASE}/search`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          limit: Math.min(limit, 10), // Firecrawl limit per request
          sources: ['web'],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          result.errors.push('Firecrawl rate limit exceeded.');
          this.blocked = true;
        } else if (response.status === 401 || response.status === 403) {
          result.errors.push('Firecrawl API key invalid or missing permissions.');
          this.blocked = true;
        } else {
          result.errors.push(`Firecrawl request failed with status ${response.status}`);
        }
        return result;
      }

      const payload: FirecrawlSearchResponse = await response.json();

      if (!payload.success || !payload.data) {
        result.errors.push('Invalid response from Firecrawl.');
        return result;
      }

      const webResults = payload.data.web || [];
      result.totalFound = webResults.length;

      logger.info('Firecrawl results found', { count: webResults.length });

      for (let i = 0; i < Math.min(webResults.length, limit); i++) {
        const item = webResults[i];
        try {
          const lead = this.extractLead(item);
          if (lead) {
            result.leads.push(lead);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Error extracting lead from Firecrawl result';
          result.errors.push(message);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error in Firecrawl search';
      logger.error('Firecrawl search failed', { error: message });
      result.errors.push(message);
      this.blocked = true;
    }

    return result;
  }

  private extractLead(item: { title: string; url: string; description: string }): RawLead | null {
    const { title, url, description } = item;

    // Basic validation
    if (!title || !url) {
      return null;
    }

    // Try to extract a name from title (might be the business name)
    let name = title.trim();
    // Remove common suffixes that indicate it's not a business name
    name = name.replace(/ - .*$/, ''); // Remove everything after a dash (often page title separator)
    name = name.replace(/\s*\|\s*.*$/, ''); // Remove everything after a pipe
    if (name.length > 100) {
      name = name.substring(0, 100);
    }

    // Initialize lead
    const lead: RawLead = {
      name,
      sourceUrl: url,
      website: this.extractWebsiteFromUrl(url),
      description: description?.substring(0, 1000) || '',
    };

    // Try to extract phone and email from description
    const phoneMatch = description.match(
      /(?:\+55\s*)?\(?\d{2}\)?[\s\-]?\d{4,5}[\s\-]?\d{4}/
    );
    if (phoneMatch) {
      lead.phone = phoneMatch[0];
    }

    const emailMatch = description.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      lead.email = emailMatch[0];
    }

    // Attempt to categorize based on title and description
    const haystack = `${title} ${description}`.toLowerCase();
    if (
      haystack.includes('despachante') ||
      haystack.includes('documentalista') ||
      haystack.includes('detran') ||
      haystack.includes('veículo') ||
      haystack.includes('cnh') ||
      haystack.includes('licenciamento')
    ) {
      lead.category = 'despachante de trânsito';
    } else if (
      haystack.includes('advogado') ||
      haystack.includes('direito de trânsito') ||
      haystack.includes('defesa de multa') ||
      haystack.includes('suspensão cnh') ||
      haystack.includes('cassação cnh') ||
      haystack.includes('trânsito')
    ) {
      lead.category = 'advogado direito de trânsito';
    }

    // If we still don't have a category, we can leave it undefined and let the classifier decide based on name
    // But note: the classifier uses category and name. If category is undefined, it will rely on name.
    // We'll try to infer from name as well.
    if (!lead.category) {
      const nameLower = name.toLowerCase();
      if (
        nameLower.includes('despachante') ||
        nameLower.includes('documentalista') ||
        nameLower.includes('detran') ||
        nameLower.includes('veículo') ||
        nameLower.includes('cnh') ||
        nameLower.includes('licenciamento')
      ) {
        lead.category = 'despachante de trânsito';
      } else if (
        nameLower.includes('advogado') ||
        nameLower.includes('direito de trânsito') ||
        nameLower.includes('defesa de multa') ||
        nameLower.includes('suspensão cnh') ||
        nameLower.includes('cassação cnh') ||
        nameLower.includes('trânsito')
      ) {
        lead.category = 'advogado direito de trânsito';
      }
    }

    return lead;
  }

  private extractWebsiteFromUrl(url: string): string | null {
    try {
      const parsed = new URL(url);
      // Return the origin as the website
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      return null;
    }
  }
}