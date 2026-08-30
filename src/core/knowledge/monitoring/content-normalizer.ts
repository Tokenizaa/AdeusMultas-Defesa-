/**
 * @file content-normalizer.ts
 * Normalizador de Conteúdo para o Crawler de Monitoramento Nacional.
 * Remove ruído dinâmico (timestamps, banners, cookies, tokens de sessão)
 * para evitar falsos positivos de hash, preservando integralmente o texto legal e operacional.
 */

export interface NormalizedResult {
  normalizedText: string;
  wordCount: number;
  extractedKeywords: string[];
  extractedDeadlines: string[];
  extractedArticles: string[];
  extractedUrls: string[];
}

export class ContentNormalizer {
  /**
   * Normaliza o conteúdo bruto (HTML ou texto) extraindo o núcleo jurídico/operacional.
   */
  public static normalize(rawContent: string): NormalizedResult {
    if (!rawContent) {
      return {
        normalizedText: '',
        wordCount: 0,
        extractedKeywords: [],
        extractedDeadlines: [],
        extractedArticles: [],
        extractedUrls: [],
      };
    }

    let cleaned = rawContent;

    // 1. Remove scripts, styles, iframes, and comments
    cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
    cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
    cleaned = cleaned.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, ' ');
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, ' ');

    // 2. Extrai URLs antes de remover as tags
    const urlRegex = /href=["'](https?:\/\/[^"']+)["']/gi;
    const extractedUrls: string[] = [];
    let matchUrl: RegExpExecArray | null;
    while ((matchUrl = urlRegex.exec(cleaned)) !== null) {
      if (!extractedUrls.includes(matchUrl[1])) {
        extractedUrls.push(matchUrl[1]);
      }
    }

    // 3. Remove HTML tags
    cleaned = cleaned.replace(/<[^>]+>/g, ' ');

    // 4. Decodifica entidades HTML comuns
    cleaned = cleaned
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&ordm;/g, 'º')
      .replace(/&ordf;/g, 'ª');

    // 5. Remove tokens dinâmicos, nonces, sessões, cookies e timestamps
    cleaned = cleaned.replace(/[0-9a-fA-F]{32,64}/g, ''); // hashes hex/tokens
    cleaned = cleaned.replace(/\b(csrf|nonce|session_id|auth_token|timestamp)=[a-zA-Z0-9_-]+/gi, '');
    cleaned = cleaned.replace(/\b\d{2}:\d{2}:\d{2}\b/g, ''); // horários dinâmicos de renderização

    // 6. Normaliza quebras de linha e espaços
    cleaned = cleaned
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join('\n');

    cleaned = cleaned.replace(/[ \t]+/g, ' ');

    // 7. Extrai artigos do CTB (ex: "Art. 280", "Artigo 218", "Art. 165-A")
    const articleRegex = /\b(?:Art\.|Artigo)\s*(\d+[A-Za-z\-]*(?:\s*§\s*\d+)?(?:\s*,\s*[IVXLCDM]+)?)/gi;
    const extractedArticles: string[] = [];
    let matchArt: RegExpExecArray | null;
    while ((matchArt = articleRegex.exec(cleaned)) !== null) {
      const art = matchArt[0].trim();
      if (!extractedArticles.includes(art)) {
        extractedArticles.push(art);
      }
    }

    // 8. Extrai menções a prazos (ex: "prazo de 30 dias", "30 (trinta) dias")
    const deadlineRegex = /\b(?:prazo(?:\s+de)?\s*)?(\d{1,3})\s*(?:\([a-zA-Z\s]+\))?\s*dias\b/gi;
    const extractedDeadlines: string[] = [];
    let matchDead: RegExpExecArray | null;
    while ((matchDead = deadlineRegex.exec(cleaned)) !== null) {
      const dead = matchDead[0].trim();
      if (!extractedDeadlines.includes(dead)) {
        extractedDeadlines.push(dead);
      }
    }

    // 9. Extrai palavras-chave jurídicas de interesse
    const keywordsOfInterest = [
      'defesa previa',
      'defesa da autuação',
      'jari',
      'cetran',
      'contrandife',
      'efeito suspensivo',
      'advertencia por escrito',
      'notificacao',
      'decadencia',
      'prescricao',
      'inmetro',
      'protocolo digital',
      'poupatempo',
    ];

    const lowerCleaned = cleaned.toLowerCase();
    const extractedKeywords = keywordsOfInterest.filter((kw) => lowerCleaned.includes(kw));

    const words = cleaned.split(/\s+/).filter(Boolean);

    return {
      normalizedText: cleaned,
      wordCount: words.length,
      extractedKeywords,
      extractedDeadlines,
      extractedArticles,
      extractedUrls,
    };
  }
}
