/**
 * @file ingest.ts
 * CLI Script to execute incremental idempotent knowledge base ingestion
 * Usage: tsx src/server/knowledge/cli/ingest.ts
 */

import { ingestionService } from '../ingestion-service';
import { vectorStore } from '../vector-store';

async function main() {
  console.log('================================================================');
  console.log('🚀 DEFESAI — INGESTÃO CANÔNICA DA BASE DE CONHECIMENTO');
  console.log('================================================================\n');

  try {
    const record = await ingestionService.ingestKnowledgeDirectory({
      forceReindex: false,
      triggeredBy: 'CLI_INGEST',
    });

    console.log('\n✅ INGESTÃO CONCLUÍDA COM SUCESSO:');
    console.log(`• Status: ${record.status}`);
    console.log(`• Arquivos auditados: ${record.totalFiles}`);
    console.log(`• Documentos processados: ${record.processedDocuments}`);
    console.log(`• Documentos inalterados (pulados): ${record.skippedDocuments}`);
    console.log(`• Novos chunks gerados: ${record.createdChunks}`);
    console.log(`• Embeddings calculados: ${record.generatedEmbeddings}`);
    console.log(`• Duração total: ${record.durationMs}ms`);

    const stats = vectorStore.getStats();
    console.log('\n📊 ESTADO ATUAL DO VECTOR STORE:');
    console.log(`• Fontes Ativas: ${stats.sourcesCount}`);
    console.log(`• Documentos Lógicos: ${stats.documentsCount}`);
    console.log(`• Versões Catalogadas: ${stats.versionsCount}`);
    console.log(`• Chunks Vetoriais: ${stats.chunksCount}`);
    console.log(`• Embeddings Indexados: ${stats.embeddingsCount}`);
    console.log(`• Conexão Supabase: ${stats.isSupabaseConnected ? 'Conectado (pgvector)' : 'Em Memória / Standalone Local'}`);
    console.log('\n================================================================');
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ ERRO NA INGESTÃO:', err.message);
    process.exit(1);
  }
}

main();
