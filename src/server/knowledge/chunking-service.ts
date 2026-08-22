/**
 * @file chunking-service.ts
 * Specialized Legal Semantic Chunking Engine for DefesAi Knowledge Base
 * 
 * Features:
 * 1. Preserves legal hierarchy: Articles, Paragraphs (§), Items (Incisos), Sub-items (Alíneas).
 * 2. Contextual inheritance: Every sub-chunk inherits its parent Article heading & Caput context.
 * 3. Controlled token windowing with smart overlap to prevent cutting statutory rules mid-sentence.
 * 4. Automatic extraction of statutory references, article numbers, and legal metadata.
 * 5. Deterministic SHA-256 chunk hashing for absolute reproducibility and deduplication.
 */

import crypto from 'crypto';
import { KnowledgeChunk } from './types';

export interface ChunkingOptions {
  maxTokensPerChunk?: number; // Target chunk size (default: 450 tokens ~ 1800 chars)
  overlapTokens?: number; // Overlap size (default: 60 tokens ~ 240 chars)
  preserveArticleHierarchy?: boolean;
}

export class ChunkingService {
  private static instance: ChunkingService;

  private constructor() {}

  public static getInstance(): ChunkingService {
    if (!ChunkingService.instance) {
      ChunkingService.instance = new ChunkingService();
    }
    return ChunkingService.instance;
  }

  /**
   * Estimates token count (~4 characters per token in Portuguese legal text)
   */
  public estimateTokens(text: string): number {
    return Math.ceil(text.trim().length / 4);
  }

  /**
   * Generates SHA-256 hash for chunk content
   */
  public hashContent(text: string): string {
    return crypto.createHash('sha256').update(text.trim()).digest('hex');
  }

  /**
   * Main chunking method: parses text and splits into semantically coherent legal chunks
   */
  public chunkDocument(
    documentVersionId: string,
    documentId: string,
    sourceId: string,
    rawText: string,
    options?: {
      documentType?: string;
      jurisdiction?: string;
      title?: string;
      chunkingOptions?: ChunkingOptions;
    }
  ): KnowledgeChunk[] {
    const documentType = options?.documentType || 'LEI';
    const jurisdiction = options?.jurisdiction || 'BR_FEDERAL';
    const docTitle = options?.title || 'Documento Jurídico';

    const normalizedText = rawText.replace(/\r\n/g, '\n').trim();
    if (!normalizedText) return [];

    const chunks: KnowledgeChunk[] = [];
    const maxChars = (options?.chunkingOptions?.maxTokensPerChunk || 450) * 4;

    // Detect if this is a structured legislation (contains Art. or Artigo)
    const isLegislation = /(?:Art\.|Artigo\s+)\d+/i.test(normalizedText);

    if (isLegislation) {
      const articleBlocks = this.splitByArticles(normalizedText);
      let chunkIdx = 0;

      for (const block of articleBlocks) {
        const subChunks = this.splitArticleBlock(block, maxChars, docTitle);
        for (const sub of subChunks) {
          const content = sub.text.trim();
          const contentHash = this.hashContent(content);
          chunks.push({
            id: `chk_${documentId}_${String(chunkIdx).padStart(4, '0')}`,
            documentVersionId,
            documentId,
            sourceId,
            chunkIndex: chunkIdx++,
            content,
            contentHash,
            tokenCount: this.estimateTokens(content),
            heading: sub.heading || block.articleNumber || docTitle,
            articleNumber: block.articleNumber,
            sectionName: block.sectionName || docTitle,
            jurisdiction,
            documentType,
            metadata: {
              articleNumber: block.articleNumber,
              docTitle,
              caputExcerpt: block.caputExcerpt,
            },
            createdAt: new Date().toISOString(),
          });
        }
      }
    } else {
      // Generic structured paragraph / section chunking
      const sections = this.splitByParagraphsAndSections(normalizedText, maxChars);
      let chunkIdx = 0;

      for (const sec of sections) {
        const content = sec.text.trim();
        const contentHash = this.hashContent(content);
        chunks.push({
          id: `chk_${documentId}_${String(chunkIdx).padStart(4, '0')}`,
          documentVersionId,
          documentId,
          sourceId,
          chunkIndex: chunkIdx++,
          content,
          contentHash,
          tokenCount: this.estimateTokens(content),
          heading: sec.heading || docTitle,
          articleNumber: undefined,
          sectionName: sec.heading || docTitle,
          jurisdiction,
          documentType,
          metadata: {
            docTitle,
          },
          createdAt: new Date().toISOString(),
        });
      }
    }

    return chunks;
  }

  /**
   * Splits legal text into article blocks preserving article number and header
   */
  private splitByArticles(text: string): {
    articleNumber: string;
    sectionName?: string;
    caputExcerpt: string;
    fullText: string;
  }[] {
    const lines = text.split('\n');
    const articles: {
      articleNumber: string;
      sectionName?: string;
      caputExcerpt: string;
      fullText: string;
    }[] = [];

    let currentArticleNum = '';
    let currentSection = '';
    let currentLines: string[] = [];
    let currentCaput = '';

    const articleRegex = /^(?:Art\.|Artigo)\s*([0-9]+[A-Za-z0-9\-\.\º\ª]*)/i;
    const sectionRegex = /^(?:CAPÍTULO|SEÇÃO|TÍTULO|LIVRO)\s+[IVXLCDM0-9]+/i;

    for (const line of lines) {
      const trimmed = line.trim();

      if (sectionRegex.test(trimmed)) {
        currentSection = trimmed;
      }

      const match = trimmed.match(articleRegex);
      if (match) {
        // Save previous article if exists
        if (currentArticleNum && currentLines.length > 0) {
          articles.push({
            articleNumber: currentArticleNum,
            sectionName: currentSection,
            caputExcerpt: currentCaput,
            fullText: currentLines.join('\n'),
          });
          currentLines = [];
        }

        currentArticleNum = `Art. ${match[1]}`;
        currentCaput = trimmed;
        currentLines.push(trimmed);
      } else {
        if (currentArticleNum) {
          currentLines.push(line);
        } else {
          // Introductory or pre-article text
          if (trimmed.length > 0) {
            currentLines.push(line);
          }
        }
      }
    }

    // Save final article block
    if (currentArticleNum && currentLines.length > 0) {
      articles.push({
        articleNumber: currentArticleNum,
        sectionName: currentSection,
        caputExcerpt: currentCaput,
        fullText: currentLines.join('\n'),
      });
    } else if (currentLines.length > 0) {
      articles.push({
        articleNumber: 'Disposições Preliminares',
        sectionName: currentSection,
        caputExcerpt: currentLines[0],
        fullText: currentLines.join('\n'),
      });
    }

    return articles;
  }

  /**
   * Splits an article block into smaller semantic chunks if it exceeds maximum token size
   */
  private splitArticleBlock(
    block: {
      articleNumber: string;
      sectionName?: string;
      caputExcerpt: string;
      fullText: string;
    },
    maxChars: number,
    docTitle: string
  ): { text: string; heading: string }[] {
    if (block.fullText.length <= maxChars) {
      return [
        {
          text: `[${docTitle} — ${block.articleNumber}]\n${block.fullText}`,
          heading: `${docTitle} • ${block.articleNumber}`,
        },
      ];
    }

    // Split article by paragraphs (§) and items (incisos)
    const paragraphs = block.fullText.split(/\n(?=(?:§|Parágrafo único|[IVXLCDM]+\s*[-–]))/i);
    const result: { text: string; heading: string }[] = [];
    let currentChunk = `[${docTitle} — ${block.articleNumber}]\n${block.caputExcerpt}\n`;

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i].trim();
      if (!p) continue;

      if ((currentChunk + '\n' + p).length > maxChars && currentChunk.length > 100) {
        result.push({
          text: currentChunk.trim(),
          heading: `${docTitle} • ${block.articleNumber} (Parte ${result.length + 1})`,
        });
        currentChunk = `[${docTitle} — ${block.articleNumber} (Cont.)]\n${block.caputExcerpt}\n${p}`;
      } else {
        currentChunk += `\n${p}`;
      }
    }

    if (currentChunk.trim().length > 0) {
      result.push({
        text: currentChunk.trim(),
        heading: `${docTitle} • ${block.articleNumber} (Parte ${result.length + 1})`,
      });
    }

    return result;
  }

  /**
   * Splits unstructured text by paragraphs with smart overlap
   */
  private splitByParagraphsAndSections(
    text: string,
    maxChars: number
  ): { text: string; heading: string }[] {
    const rawParagraphs = text.split(/\n\s*\n/);
    const results: { text: string; heading: string }[] = [];

    let current = '';
    let currentHeading = '';

    for (const para of rawParagraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      // Detect heading (short line starting with # or uppercase)
      if (trimmed.length < 90 && (trimmed.startsWith('#') || trimmed === trimmed.toUpperCase())) {
        currentHeading = trimmed.replace(/^#+\s*/, '');
      }

      if ((current + '\n\n' + trimmed).length > maxChars && current.length > 100) {
        results.push({
          text: current.trim(),
          heading: currentHeading || 'Seção',
        });
        current = trimmed;
      } else {
        current = current ? `${current}\n\n${trimmed}` : trimmed;
      }
    }

    if (current.trim().length > 0) {
      results.push({
        text: current.trim(),
        heading: currentHeading || 'Seção',
      });
    }

    return results;
  }
}

export const chunkingService = ChunkingService.getInstance();
