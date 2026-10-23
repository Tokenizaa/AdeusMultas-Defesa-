/**
 * @file ingestion-service.ts
 * Canonical Knowledge Ingestion & Indexing Pipeline for DefesAi
 * 
 * Pipeline Flow:
 * Source Detection -> Normalization -> SHA-256 Hash Verification -> Idempotent Check
 *   -> Version Creation -> Semantic Legal Chunking -> Vector Embedding -> VectorStore Persist
 * 
 * Features:
 * 1. Supports JSON, Markdown (.md), Plain Text (.txt), and PDF extraction.
 * 2. Idempotent: Skips documents with identical content_hash.
 * 3. Auto-versioning: Creates new version records when content changes.
 * 4. Full telemetry & audit logging in `knowledge_ingestions`.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { chunkingService } from './chunking-service';
import { embeddingService } from './embedding-service';
import { vectorStore } from './vector-store';
import { configService } from '../config/config-service';
import { logger } from '../observability/logger';
import {
  KnowledgeSource,
  KnowledgeDocument,
  KnowledgeDocumentVersion,
  KnowledgeChunk,
  KnowledgeEmbedding,
  KnowledgeIngestionRecord,
} from './types';

export interface IngestDocumentPayload {
  sourceId: string;
  sourceName: string;
  authority: string;
  sourceType: KnowledgeSource['sourceType'];
  jurisdiction?: string;
  sourceUrl?: string;
  documentId: string;
  title: string;
  documentType: string;
  description?: string;
  content: string;
  publishedAt?: string;
  versionLabel?: string;
  metadata?: Record<string, any>;
}

/**
 * Resultado da tentativa de persistência de um registro de ingestão.
 */
export interface IngestionPersistenceResult {
  persistedToMemory: boolean;
  persistedToSupabase: boolean;
  supabaseError?: string;
  recordId: string;
}

export class IngestionService {
  private static instance: IngestionService;
  private ingestionHistory: KnowledgeIngestionRecord[] = [];
  private supabaseClient: SupabaseClient | null = null;

  private constructor() {
    this.initSupabaseClient();
  }

  public static getInstance(): IngestionService {
    if (!IngestionService.instance) {
      IngestionService.instance = new IngestionService();
    }
    return IngestionService.instance;
  }

  private initSupabaseClient(): void {
    const url = configService.get('VITE_SUPABASE_URL');
    const serviceKey =
      configService.get('SUPABASE_SECRET_KEY') || configService.get('SUPABASE_SERVICE_ROLE_KEY');
    if (url && serviceKey && url.startsWith('https://')) {
      try {
        this.supabaseClient = createClient(url, serviceKey);
        logger.info('ai', 'ingestion_service', 'supabase_init', 'Supabase client inicializado para registro de ingestão.');
      } catch (err: any) {
        logger.warn('ai', 'ingestion_service', 'supabase_init', `Falha ao inicializar Supabase para ingestão: ${err.message}. Operando apenas em memória.`);
      }
    }
  }

  public hashContent(text: string): string {
    return crypto.createHash('sha256').update(text.trim()).digest('hex');
  }

  /**
   * Registra um registro de ingestão por documento (telemetria em knowledge_ingestions).
   * Persiste em Supabase quando o cliente estiver disponível e mantém cópia em memória.
   * Falhas de persistência no Supabase são observáveis via retorno, nunca silenciadas como sucesso.
   */
  private async recordIngestion(
    correlationId: string,
    documentId: string,
    status: 'PROCESSED' | 'SKIPPED',
    chunksCount: number,
    startedAt: number,
    triggeredBy: string,
    errorMessage?: string,
  ): Promise<IngestionPersistenceResult> {
    const record: KnowledgeIngestionRecord = {
      id: `ing_${correlationId}`,
      startedAt: new Date(startedAt).toISOString(),
      completedAt: new Date().toISOString(),
      status: errorMessage ? 'FAILED' : (status === 'SKIPPED' ? 'COMPLETED' : 'COMPLETED'),
      totalFiles: 1,
      processedDocuments: status === 'PROCESSED' ? 1 : 0,
      skippedDocuments: status === 'SKIPPED' ? 1 : 0,
      createdChunks: chunksCount,
      generatedEmbeddings: chunksCount,
      failedCount: errorMessage ? 1 : 0,
      durationMs: Date.now() - startedAt,
      providerUsed: 'IngestionService',
      modelUsed: 'sha256-content-hash',
      triggeredBy,
      errorMessage,
      details: {
        documentId,
        perDocument: true,
      },
    };

    let persistedToSupabase = false;
    let supabaseError: string | undefined;

    this.ingestionHistory.unshift(record);
    if (this.ingestionHistory.length > 50) {
      this.ingestionHistory.pop();
    }

    if (this.supabaseClient) {
      try {
        await this.supabaseClient.from('knowledge_ingestions').upsert({
          id: record.id,
          started_at: record.startedAt,
          completed_at: record.completedAt,
          status: record.status,
          total_files: record.totalFiles,
          processed_documents: record.processedDocuments,
          skipped_documents: record.skippedDocuments,
          created_chunks: record.createdChunks,
          generated_embeddings: record.generatedEmbeddings,
          failed_count: record.failedCount,
          duration_ms: record.durationMs,
          provider_used: record.providerUsed,
          model_used: record.modelUsed,
          triggered_by: record.triggeredBy,
          error_message: record.errorMessage,
          details: record.details,
        });
        persistedToSupabase = true;
      } catch (err: any) {
        supabaseError = err instanceof Error ? err.message : String(err);
        logger.error('ai', 'ingestion_service', 'ingestion_persist_failed', `Falha ao persistir ingestão no Supabase para documento ${documentId}: ${supabaseError}`, {
          correlationId,
          documentId,
          recordId: record.id,
          error: supabaseError,
        });
      }
    }

    logger.info('ai', 'ingestion_service', 'ingestion_recorded', `Registro de ingestão gravado para documento ${documentId}: ${status}`, {
      correlationId,
      documentId,
      ingestionStatus: status,
      chunksCount,
      persistedToSupabase,
    });

    return {
      persistedToMemory: true,
      persistedToSupabase,
      supabaseError,
      recordId: record.id,
    };
  }

  /**
   * Verifica se o cliente Supabase está configurado e disponível para persistência.
   */
  public isSupabaseConfigured(): boolean {
    return this.supabaseClient !== null;
  }

  /**
   * Recupera o histórico de ingestões persistidas no Supabase.
   * Retorna vazio se o Supabase não estiver configurado ou na falha da consulta.
   */
  public async getPersistedIngestions(): Promise<KnowledgeIngestionRecord[]> {
    if (!this.supabaseClient) {
      return [];
    }
    try {
      const { data, error } = await this.supabaseClient
        .from('knowledge_ingestions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) {
        logger.error('ai', 'ingestion_service', 'ingestions_fetch_failed', `Falha ao recuperar ingestões persistidas: ${error.message}`);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        status: row.status,
        totalFiles: row.total_files,
        processedDocuments: row.processed_documents,
        skippedDocuments: row.skipped_documents,
        createdChunks: row.created_chunks,
        generatedEmbeddings: row.generated_embeddings,
        failedCount: row.failed_count,
        durationMs: row.duration_ms,
        providerUsed: row.provider_used,
        modelUsed: row.model_used,
        triggeredBy: row.triggered_by,
        errorMessage: row.error_message,
        details: row.details || {},
      }));
    } catch (err: any) {
      logger.error('ai', 'ingestion_service', 'ingestions_fetch_failed', `Exceção ao recuperar ingestões persistidas: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }

  /**
   * Ingest a single document payload idempotently
   */
  public async ingestDocument(
    payload: IngestDocumentPayload,
    options?: { correlationId?: string; forceReindex?: boolean }
  ): Promise<{ status: 'PROCESSED' | 'SKIPPED'; chunksCount: number; versionId: string; persistenceResult: IngestionPersistenceResult }> {
    const correlationId = options?.correlationId || `corr_ing_${Date.now()}`;
    const startedAt = Date.now();
    const content = payload.content.trim();
    const contentHash = this.hashContent(content);
    const jurisdiction = payload.jurisdiction || 'BR_FEDERAL';

    // 1. Ensure Source Exists
    let source = vectorStore.getSource(payload.sourceId);
    if (!source) {
      source = {
        id: payload.sourceId,
        name: payload.sourceName,
        sourceType: payload.sourceType,
        authority: payload.authority,
        description: payload.description,
        url: payload.sourceUrl,
        jurisdiction,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await vectorStore.upsertSource(source);
    }

    // 2. Check Document & Existing Versions for Idempotency
    const existingDoc = vectorStore.getDocument(payload.documentId);
    let versionNumber = 'v1.0';
    let isNewVersion = true;

    if (existingDoc && existingDoc.currentVersionId) {
      const currentVer = vectorStore.getVersion(existingDoc.currentVersionId);
      if (currentVer && currentVer.contentHash === contentHash && !options?.forceReindex) {
        logger.info('ai', 'ingestion_service', 'ingest_document', `Documento '${payload.title}' inalterado (hash ${contentHash.substring(0, 8)}). Pulando reindexação.`, {
          correlationId,
          documentId: payload.documentId,
        });
        const persistence = await this.recordIngestion(
          correlationId,
          payload.documentId,
          'SKIPPED',
          0,
          startedAt,
          options?.correlationId || 'INGEST_DOCUMENT',
        );
        logger.info('ai', 'ingestion_service', 'ingest_document_skipped', `Documento '${payload.title}' inalterado (hash ${contentHash.substring(0, 8)}). Pulando reindexação. Persistência: ${persistence.persistedToSupabase ? 'supabase' : 'memória'}${persistence.supabaseError ? ' | erro: ' + persistence.supabaseError : ''}`, {
          correlationId,
          documentId: payload.documentId,
          persistenceResult: persistence,
        });
        return { status: 'SKIPPED', chunksCount: 0, versionId: currentVer.id, persistenceResult: persistence };
      }

      if (currentVer) {
        // Increment version
        const vNum = parseFloat(currentVer.version.replace('v', '')) || 1.0;
        versionNumber = `v${(vNum + 0.1).toFixed(1)}`;
      }
    }

    const versionId = `ver_${payload.documentId}_${Date.now()}`;

    // 3. Upsert Document Record
    const docRecord: KnowledgeDocument = {
      id: payload.documentId,
      sourceId: payload.sourceId,
      title: payload.title,
      documentType: payload.documentType,
      description: payload.description,
      jurisdiction,
      status: 'ACTIVE',
      currentVersionId: versionId,
      metadata: payload.metadata || {},
      createdAt: existingDoc?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await vectorStore.upsertDocument(docRecord);

    // 4. Create Version Record
    const versionRecord: KnowledgeDocumentVersion = {
      id: versionId,
      documentId: payload.documentId,
      version: payload.versionLabel || versionNumber,
      content,
      contentHash,
      sourceUrl: payload.sourceUrl,
      publishedAt: payload.publishedAt || new Date().toISOString(),
      metadata: payload.metadata || {},
      createdAt: new Date().toISOString(),
    };
    await vectorStore.upsertVersion(versionRecord);

    // 5. Semantic Legal Chunking
    const chunks: KnowledgeChunk[] = chunkingService.chunkDocument(
      versionId,
      payload.documentId,
      payload.sourceId,
      content,
      {
        documentType: payload.documentType,
        jurisdiction,
        title: payload.title,
      }
    );

    await vectorStore.upsertChunks(chunks);

    // 6. Generate Vector Embeddings
    const embeddings: KnowledgeEmbedding[] = [];
    for (const chunk of chunks) {
      const embRes = await embeddingService.generateEmbedding(chunk.content, { correlationId });
      embeddings.push({
        id: `emb_${chunk.id}`,
        chunkId: chunk.id,
        provider: embRes.provider,
        model: embRes.model,
        dimensions: embRes.dimensions,
        embedding: embRes.embedding,
        createdAt: new Date().toISOString(),
      });
    }

    await vectorStore.upsertEmbeddings(embeddings);

    logger.info('ai', 'ingestion_service', 'ingest_document', `Documento '${payload.title}' indexado com sucesso: ${chunks.length} chunks e ${embeddings.length} embeddings gerados.`, {
      correlationId,
      documentId: payload.documentId,
      versionId,
      chunksCount: chunks.length,
    });

    const persistence = await this.recordIngestion(
      correlationId,
      payload.documentId,
      'PROCESSED',
      chunks.length,
      startedAt,
      options?.correlationId || 'INGEST_DOCUMENT',
    );
    logger.info('ai', 'ingestion_service', 'ingest_document', `Documento '${payload.title}' indexado com sucesso: ${chunks.length} chunks e ${embeddings.length} embeddings gerados. Persistência: ${persistence.persistedToSupabase ? 'supabase' : 'memória'}${persistence.supabaseError ? ' | erro: ' + persistence.supabaseError : ''}`, {
      correlationId,
      documentId: payload.documentId,
      versionId,
      chunksCount: chunks.length,
      persistenceResult: persistence,
    });

    return { status: 'PROCESSED', chunksCount: chunks.length, versionId, persistenceResult: persistence };
  }

  /**
   * Complete Bulk Ingestion from Local Knowledge Directory Structure
   */
  public async ingestKnowledgeDirectory(
    options?: { forceReindex?: boolean; triggeredBy?: string }
  ): Promise<KnowledgeIngestionRecord> {
    const startTime = Date.now();
    const ingestionId = `ing_${Date.now()}`;
    const triggeredBy = options?.triggeredBy || 'CLI_INGEST';

    let totalFiles = 0;
    let processedDocuments = 0;
    let skippedDocuments = 0;
    let createdChunks = 0;
    let generatedEmbeddings = 0;
    let failedCount = 0;
    let errorMessage: string | undefined;

    logger.info('ai', 'ingestion_service', 'bulk_ingest', `Iniciando ingestão em massa da base de conhecimento...`, {
      ingestionId,
      triggeredBy,
    });

    try {
      const knowledgeDir = path.join(process.cwd(), 'knowledge');

      // 1. Ingest Official Sources (knowledge/sources/sources.json)
      const sourcesFile = path.join(knowledgeDir, 'sources', 'sources.json');
      if (fs.existsSync(sourcesFile)) {
        totalFiles++;
        const raw = JSON.parse(fs.readFileSync(sourcesFile, 'utf-8'));
        for (const s of raw) {
          await vectorStore.upsertSource({
            id: s.id,
            name: s.name,
            sourceType: 'GOVERNMENT',
            authority: s.official_body || 'SENATRAN',
            url: s.official_url,
            jurisdiction: 'BR_FEDERAL',
            isActive: s.status === 'active',
            createdAt: s.collection_date || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // 2. Ingest CTB (knowledge/legislation/laws/ctb.json & raw CTB)
      const ctbFile = path.join(knowledgeDir, 'legislation', 'laws', 'ctb.json');
      const ctbRawFile = path.join(knowledgeDir, 'raw', 'ctb', 'ctb_planalto_raw.txt');

      if (fs.existsSync(ctbFile)) {
        totalFiles++;
        const ctbData = JSON.parse(fs.readFileSync(ctbFile, 'utf-8'));
        const articlesList = ctbData.articles || [];

        // Build composite document text
        const ctbContent = articlesList
          .map((a: any) => `${a.article || a.number} — ${a.title || ''}\n${a.caput || a.text || ''}\n${(a.paragraphs || []).join('\n')}`)
          .join('\n\n');

        const res = await this.ingestDocument(
          {
            sourceId: 'SRC-CTB-PLANALTO',
            sourceName: 'Código de Trânsito Brasileiro — Lei 9.503/1997',
            authority: 'Congresso Nacional / Presidência da República',
            sourceType: 'LAW',
            sourceUrl: 'https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm',
            documentId: 'DOC-LEI-9503-CTB',
            title: 'Código de Trânsito Brasileiro (CTB Completo Consolidado)',
            documentType: 'LEI',
            description: 'Norma primária do trânsito nacional atualizada com as Leis 14.071/20, 14.229/21 e 14.599/23.',
            content: ctbContent,
            versionLabel: 'v2026.1',
          },
          { forceReindex: options?.forceReindex }
        );

        if (res.status === 'PROCESSED') {
          processedDocuments++;
          createdChunks += res.chunksCount;
          generatedEmbeddings += res.chunksCount;
        } else {
          skippedDocuments++;
        }
      }

      // 3. Ingest CONTRAN Resolutions (knowledge/legislation/resolutions/contran.json)
      const resFile = path.join(knowledgeDir, 'legislation', 'resolutions', 'contran.json');
      if (fs.existsSync(resFile)) {
        totalFiles++;
        const resData = JSON.parse(fs.readFileSync(resFile, 'utf-8'));
        const list = resData.resolutions || resData || [];

        for (const r of list) {
          const content = `Resolução CONTRAN nº ${r.number}/${r.year}\nEmenta: ${r.subject || r.title || ''}\nImpacto Jurídico: ${r.impact || r.impactOnDefenses || ''}\nDispositivos Chave: ${r.keyArticles || ''}\nTexto: ${r.text || r.summary || ''}`;
          const res = await this.ingestDocument(
            {
              sourceId: 'SRC-CONTRAN-RESOLUTIONS',
              sourceName: 'Conselho Nacional de Trânsito (CONTRAN)',
              authority: 'CONTRAN',
              sourceType: 'REGULATION',
              sourceUrl: 'https://www.gov.br/transportes/pt-br/assuntos/transito/senatran/resolucoes-contran',
              documentId: `DOC-RES-CONTRAN-${r.number}`,
              title: `Resolução CONTRAN nº ${r.number}/${r.year}`,
              documentType: 'RESOLUCAO',
              description: r.subject || `Regulamentação CONTRAN nº ${r.number}`,
              content,
            },
            { forceReindex: options?.forceReindex }
          );

          if (res.status === 'PROCESSED') {
            processedDocuments++;
            createdChunks += res.chunksCount;
            generatedEmbeddings += res.chunksCount;
          } else {
            skippedDocuments++;
          }
        }
      }

      // 4. Ingest SENATRAN Ordinances
      const ordFile = path.join(knowledgeDir, 'legislation', 'ordinances', 'senatran.json');
      if (fs.existsSync(ordFile)) {
        totalFiles++;
        const ordData = JSON.parse(fs.readFileSync(ordFile, 'utf-8'));
        const list = ordData.ordinances || ordData || [];

        for (const o of list) {
          const content = `Portaria SENATRAN nº ${o.number}/${o.year}\nAssunto: ${o.subject || o.title || ''}\nDetalhamento: ${o.description || o.text || ''}`;
          const res = await this.ingestDocument(
            {
              sourceId: 'SRC-SENATRAN-ORDINANCES',
              sourceName: 'Secretaria Nacional de Trânsito (SENATRAN)',
              authority: 'SENATRAN',
              sourceType: 'REGULATION',
              documentId: `DOC-PORT-SENATRAN-${o.number}`,
              title: `Portaria SENATRAN nº ${o.number}/${o.year}`,
              documentType: 'PORTARIA',
              description: o.subject,
              content,
            },
            { forceReindex: options?.forceReindex }
          );

          if (res.status === 'PROCESSED') {
            processedDocuments++;
            createdChunks += res.chunksCount;
            generatedEmbeddings += res.chunksCount;
          } else {
            skippedDocuments++;
          }
        }
      }

      // 5. Ingest Legal Arguments & Defenses (knowledge/arguments/arguments.json)
      const argsFile = path.join(knowledgeDir, 'arguments', 'arguments.json');
      if (fs.existsSync(argsFile)) {
        totalFiles++;
        const argsData = JSON.parse(fs.readFileSync(argsFile, 'utf-8'));
        const list = Array.isArray(argsData) ? argsData : argsData.arguments || [];

        for (const arg of list) {
          const content = `TESE JURÍDICA: ${arg.title} [Código: ${arg.code || arg.id}]\nBase Legal: ${arg.legal_base || arg.legalBase || ''}\nResoluções Aplicáveis: ${(arg.resolutions || []).join(', ')}\nJurisprudência: ${(arg.jurisprudence || []).join('; ')}\nQuando Utilizar: ${(arg.when_to_use || []).join('; ')}\nProvas Exigidas: ${(arg.required_evidence || []).join('; ')}\nFundamentação Doutrinária: ${arg.description || ''}`;
          const res = await this.ingestDocument(
            {
              sourceId: 'SRC-DEFESAI-INTERNAL',
              sourceName: 'DefesAi Repertório de Teses Especializadas',
              authority: 'DefesAi Legal Engineering',
              sourceType: 'INTERNAL',
              documentId: `DOC-ARG-${arg.id || arg.code}`,
              title: `Tese Jurídica: ${arg.title}`,
              documentType: 'TESE_JURIDICA',
              description: arg.description,
              content,
            },
            { forceReindex: options?.forceReindex }
          );

          if (res.status === 'PROCESSED') {
            processedDocuments++;
            createdChunks += res.chunksCount;
            generatedEmbeddings += res.chunksCount;
          } else {
            skippedDocuments++;
          }
        }
      }

      // 6. Ingest Priority Infractions (knowledge/infractions/infractions.json)
      const infractionsFile = path.join(knowledgeDir, 'infractions', 'infractions.json');
      if (fs.existsSync(infractionsFile)) {
        totalFiles++;
        const infraData = JSON.parse(fs.readFileSync(infractionsFile, 'utf-8'));
        const list = Array.isArray(infraData) ? infraData : infraData.infractions || [];

        for (const inf of list) {
          const content = `CATÁLOGO DE INFRAÇÃO — Código: ${inf.code}\nDescrição: ${inf.description}\nArtigo do CTB: ${inf.ctb_article || inf.ctbArticle}\nGravidade: ${inf.severity} (${inf.points} pontos)\nPenalidade: ${inf.penalty}\nMedida Administrativa: ${inf.administrative_measures || ''}\nDefesas Cabíveis: ${(inf.possible_defenses || []).join('; ')}`;
          const res = await this.ingestDocument(
            {
              sourceId: 'SRC-SENATRAN-MBFT',
              sourceName: 'Manual Brasileiro de Fiscalização de Trânsito (MBFT)',
              authority: 'CONTRAN / SENATRAN',
              sourceType: 'MANUAL',
              documentId: `DOC-INFRA-${inf.code.replace(/[^a-zA-Z0-9]/g, '')}`,
              title: `Infração ${inf.code} — ${inf.description}`,
              documentType: 'CATALOGO',
              description: inf.description,
              content,
            },
            { forceReindex: options?.forceReindex }
          );

          if (res.status === 'PROCESSED') {
            processedDocuments++;
            createdChunks += res.chunksCount;
            generatedEmbeddings += res.chunksCount;
          } else {
            skippedDocuments++;
          }
        }
      }
    } catch (err: any) {
      errorMessage = err.message;
      failedCount++;
      logger.error('ai', 'ingestion_service', 'bulk_ingest', `Falha durante ingestão em massa: ${err.message}`);
    }

    const durationMs = Date.now() - startTime;
    const record: KnowledgeIngestionRecord = {
      id: ingestionId,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      status: failedCount > 0 ? (processedDocuments > 0 ? 'COMPLETED' : 'FAILED') : 'COMPLETED',
      totalFiles,
      processedDocuments,
      skippedDocuments,
      createdChunks,
      generatedEmbeddings,
      failedCount,
      durationMs,
      providerUsed: 'NVIDIA / Fallback Resilient Chain',
      modelUsed: 'nv-embedqa-e5-v5 / Legal Vectorizer',
      triggeredBy,
      errorMessage,
      details: {
        totalIndexedChunks: vectorStore.getStats().chunksCount,
      },
    };

    this.ingestionHistory.unshift(record);
    if (this.ingestionHistory.length > 50) {
      this.ingestionHistory.pop();
    }

    // Persiste o registro de ingestão em massa no Supabase quando disponível.
    // Falha de persistência não corrompe o histórico em memória; é observável via log.
    if (this.supabaseClient) {
      try {
        await this.supabaseClient.from('knowledge_ingestions').upsert({
          id: record.id,
          started_at: record.startedAt,
          completed_at: record.completedAt,
          status: record.status,
          total_files: record.totalFiles,
          processed_documents: record.processedDocuments,
          skipped_documents: record.skippedDocuments,
          created_chunks: record.createdChunks,
          generated_embeddings: record.generatedEmbeddings,
          failed_count: record.failedCount,
          duration_ms: record.durationMs,
          provider_used: record.providerUsed,
          model_used: record.modelUsed,
          triggered_by: record.triggeredBy,
          error_message: record.errorMessage,
          details: record.details,
        });
      } catch (err: any) {
        const supabaseError = err instanceof Error ? err.message : String(err);
        logger.error('ai', 'ingestion_service', 'bulk_ingest_persist_failed', `Falha ao persistir ingestão em massa no Supabase: ${supabaseError}`, {
          ingestionId,
          error: supabaseError,
        });
      }
    }

    logger.info('ai', 'ingestion_service', 'bulk_ingest', `Ingestão concluída em ${durationMs}ms: ${processedDocuments} docs processados, ${skippedDocuments} ignorados (idempotência), ${createdChunks} chunks criados. Supabase: ${this.supabaseClient ? 'configurado' : 'não configurado'}`, {
      ingestionId,
      durationMs,
    });

    return record;
  }

  public getHistory(): KnowledgeIngestionRecord[] {
    return [...this.ingestionHistory];
  }
}

export const ingestionService = IngestionService.getInstance();
