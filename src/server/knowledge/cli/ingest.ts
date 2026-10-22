/**
 * @file ingest.ts
 * CLI Script to execute incremental idempotent knowledge base ingestion
 * Usage: tsx src/server/knowledge/cli/ingest.ts
 */

import { ingestionService } from '../ingestion-service';
import { vectorStore } from '../vector-store';
import { logger } from '../../observability/logger';

async function main() {
  logger.info('knowledge', 'ingest', 'start', '================================================================');
  logger.info('knowledge', 'ingest', 'start-title', '🚀 DEFESAI — INGESTÃO CANÔNICA DA BASE DE CONHECIMENTO');
  logger.info('knowledge', 'ingest', 'end', '================================================================');

  try {
    const record = await ingestionService.ingestKnowledgeDirectory({
      forceReindex: false,
      triggeredBy: 'CLI_INGEST',
    });

    logger.info('knowledge', 'ingest', 'ingestion-completed', '\n✅ INGESTÃO CONCLUÍDA COM SUCESSO:');
    logger.info('knowledge', 'ingest', 'ingestion-status', `• Status: ${record.status}`);
    logger.info('knowledge', 'ingest', 'ingestion-files', `• Arquivos auditados: ${record.totalFiles}`);
    logger.info('knowledge', 'ingest', 'ingestion-documents', `• Documentos processados: ${record.processedDocuments}`);
    logger.info('knowledge', 'ingest', 'ingestion-skipped', `• Documentos inalterados (pulados): ${record.skippedDocuments}`);
    logger.info('knowledge', 'ingest', 'ingestion-chunks', `• Novos chunks gerados: ${record.createdChunks}`);
    logger.info('knowledge', 'ingest', 'ingestion-embeddings', `• Embeddings calculados: ${record.generatedEmbeddings}`);
    logger.info('knowledge', 'ingest', 'ingestion-duration', `• Duração total: ${record.durationMs}ms`);

    const stats = vectorStore.getStats();
    logger.info('knowledge', 'ingest', 'vector-store-state', '\n📊 ESTADO ATUAL DO VECTOR STORE:');
    logger.info('knowledge', 'ingest', 'vector-sources', `• Fontes Ativas: ${stats.sourcesCount}`);
    logger.info('knowledge', 'ingest', 'vector-documents', `• Documentos Lógicos: ${stats.documentsCount}`);
    logger.info('knowledge', 'ingest', 'vector-versions', `• Versões Catalogadas: ${stats.versionsCount}`);
    logger.info('knowledge', 'ingest', 'vector-chunks', `• Chunks Vetoriais: ${stats.chunksCount}`);
    logger.info('knowledge', 'ingest', 'vector-embeddings', `• Embeddings Indexados: ${stats.embeddingsCount}`);
    logger.info('knowledge', 'ingest', 'vector-supabase', `• Conexão Supabase: ${stats.isSupabaseConnected ? 'Conectado (pgvector)' : 'Em Memória / Standalone Local'}`);
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ ERRO NA INGESTÃO:', err.message);
    process.exit(1);
  }
}

main();
