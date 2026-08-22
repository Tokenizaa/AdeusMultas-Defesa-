/**
 * @file types.ts
 * Canonical Data Types & Interfaces for DefesAi RAG & Knowledge Base
 */

export type SourceType =
  | 'LAW'
  | 'REGULATION'
  | 'JURISPRUDENCE'
  | 'GOVERNMENT'
  | 'TECHNICAL'
  | 'INTERNAL'
  | 'MANUAL'
  | 'OTHER';

export type DocumentStatus = 'ACTIVE' | 'REVOKED' | 'SUPERSEDED' | 'DRAFT' | 'ARCHIVED';

export type EmbeddingProvider = 'NVIDIA' | '9ROUTER' | 'GEMINI' | 'DETERMINISTIC_LOCAL';

export interface KnowledgeSource {
  id: string;
  name: string;
  sourceType: SourceType;
  authority: string;
  description?: string;
  url?: string;
  jurisdiction: string; // 'BR_FEDERAL', 'SP_ESTADUAL', etc.
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeDocument {
  id: string;
  sourceId: string;
  title: string;
  documentType: string; // 'LEI', 'RESOLUCAO', 'PORTARIA', 'ACORDAO', 'TESE_JURIDICA', 'CATALOGO'
  description?: string;
  jurisdiction: string;
  status: DocumentStatus;
  currentVersionId?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeDocumentVersion {
  id: string;
  documentId: string;
  version: string;
  content: string;
  contentHash: string; // SHA-256
  sourceUrl?: string;
  publishedAt?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface KnowledgeChunk {
  id: string;
  documentVersionId: string;
  documentId: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  contentHash: string;
  tokenCount: number;
  heading?: string;
  articleNumber?: string;
  sectionName?: string;
  jurisdiction: string;
  documentType: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface KnowledgeEmbedding {
  id: string;
  chunkId: string;
  provider: EmbeddingProvider;
  model: string;
  dimensions: number;
  embedding: number[];
  createdAt: string;
}

export interface KnowledgeIngestionRecord {
  id: string;
  startedAt: string;
  completedAt?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalFiles: number;
  processedDocuments: number;
  skippedDocuments: number;
  createdChunks: number;
  generatedEmbeddings: number;
  failedCount: number;
  durationMs: number;
  providerUsed?: string;
  modelUsed?: string;
  triggeredBy: string;
  errorMessage?: string;
  details: Record<string, any>;
}

export interface SearchKnowledgeOptions {
  topK?: number; // Initial vector search limit (default: 20)
  topN?: number; // Reranked output limit (default: 5)
  threshold?: number; // Min cosine similarity (default: 0.35)
  filterSourceId?: string;
  filterDocumentType?: string;
  filterJurisdiction?: string;
  filterAuthority?: string;
  enableReranking?: boolean;
  correlationId?: string;
}

export interface KnowledgeSearchResult {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  documentType: string;
  version: string;
  sourceId: string;
  sourceName: string;
  authority: string;
  heading?: string;
  articleNumber?: string;
  sectionName?: string;
  content: string;
  similarity: number; // Vector cosine similarity (0 to 1)
  rerankScore: number; // Combined hybrid score
  tokenCount: number;
  provenance: {
    source: string;
    document: string;
    version: string;
    article?: string;
    url?: string;
    hash: string;
  };
  metadata: Record<string, any>;
}

export interface RAGContextBuildResult {
  formattedContext: string;
  tokenCountEstimate: number;
  sourcesUsed: {
    sourceId: string;
    sourceName: string;
    authority: string;
    documentTitle: string;
    articleOrHeading?: string;
    chunkId: string;
    score: number;
  }[];
  citations: string[];
}

export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
  provider: EmbeddingProvider;
  model: string;
  durationMs: number;
  cached: boolean;
}
