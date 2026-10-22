/**
 * Seed Knowledge Base from local markdown documents
 * Usage: tsx scripts/seed-kb.ts
 */

import { ingestionService } from '../src/server/knowledge/ingestion-service';
import { vectorStore } from '../src/server/knowledge/vector-store';
import { logger } from '../src/server/observability/logger';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  logger.info('knowledge', 'seed', 'start', '================================================================');
  logger.info('knowledge', 'seed', 'start-title', '🚀 DEFESAI — SEED KB FROM LOCAL DOCUMENTS');
  logger.info('knowledge', 'seed', 'end', '================================================================');

  try {
    // 1. Ensure sources exist
    const sourcesFile = path.join(process.cwd(), 'knowledge', 'sources', 'sources.json');
    if (fs.existsSync(sourcesFile)) {
      const raw = JSON.parse(fs.readFileSync(sourcesFile, 'utf-8'));
      for (const s of raw) {
        await vectorStore.upsertSource({
          id: s.id,
          name: s.name,
          sourceType: s.source_type,
          authority: s.authority,
          description: s.description,
          url: s.url,
          jurisdiction: s.jurisdiction,
          isActive: s.is_active,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        logger.info('knowledge', 'seed', 'source-upserted', `Source: ${s.name}`);
      }
    }

    // 2. Ingest documents from markdown files
    const docsDir = path.join(process.cwd(), 'knowledge', 'documents');
    const docFiles = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));
    
    let totalFiles = 0;
    let processedDocuments = 0;
    let createdChunks = 0;
    let generatedEmbeddings = 0;

    for (const file of docFiles) {
      const filePath = path.join(docsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      totalFiles++;

      // Extract metadata from frontmatter or filename
      const docId = `DOC_${file.replace('.md', '').toUpperCase()}`;
      const title = file.replace('.md', '').replace(/-/g, ' ');
      
      const record = await ingestionService.ingestDocument({
        sourceId: file.includes('ctb') ? 'SRC_FED_CTB' : 
                  file.includes('contran') ? 'SRC_FED_CONTRAN' : 'SRC_FED_STJ',
        sourceName: file.includes('ctb') ? 'Código de Trânsito Brasileiro' :
                  file.includes('contran') ? 'Resoluções do CONTRAN' : 'Jurisprudência do STJ',
        authority: file.includes('ctb') ? 'Presidência da República' :
                  file.includes('contran') ? 'CONTRAN' : 'STJ',
        sourceType: file.includes('jurisprudence') ? 'JURISPRUDENCE' : 
                   file.includes('contran') ? 'REGULATION' : 'LAW',
        jurisdiction: 'BR_FEDERAL',
        sourceUrl: file.includes('ctb') ? 'https://www.planalto.gov.br/ccivil_03/leis/L9503.htm' :
                  file.includes('contran') ? 'https://www.gov.br/contran/pt-br/assuntos/resolucoes' : 'https://www.stj.jus.br/',
        documentId: docId,
        title: title,
        documentType: file.includes('jurisprudence') ? 'JURISPRUDENCE' : 'LEGAL_TEXT',
        description: `Documento importado de ${file}`,
        content: content,
        publishedAt: new Date().toISOString(),
        metadata: { sourceFile: file },
      });

      if (record.status === 'PROCESSED') {
        processedDocuments++;
        createdChunks += record.chunksCount;
        generatedEmbeddings += record.chunksCount; // approximation
      }
      
      logger.info('knowledge', 'seed', 'doc-processed', `${file}: ${record.status} (${record.chunksCount} chunks)`);
    }

    logger.info('knowledge', 'seed', 'completed', '\n✅ SEED CONCLUÍDO COM SUCESSO:');
    logger.info('knowledge', 'seed', 'stats', `• Arquivos processados: ${totalFiles}`);
    logger.info('knowledge', 'seed', 'stats', `• Documentos criados: ${processedDocuments}`);
    logger.info('knowledge', 'seed', 'stats', `• Chunks gerados: ${createdChunks}`);
    logger.info('knowledge', 'seed', 'stats', `• Embeddings estimados: ${generatedEmbeddings}`);

    const stats = vectorStore.getStats();
    logger.info('knowledge', 'seed', 'vector-store', '\n📊 ESTADO DO VECTOR STORE:');
    logger.info('knowledge', 'seed', 'vector-store', `• Fontes: ${stats.sourcesCount}`);
    logger.info('knowledge', 'seed', 'vector-store', `• Documentos: ${stats.documentsCount}`);
    logger.info('knowledge', 'seed', 'vector-store', `• Chunks: ${stats.chunksCount}`);
    logger.info('knowledge', 'seed', 'vector-store', `• Embeddings: ${stats.embeddingsCount}`);
    logger.info('knowledge', 'seed', 'vector-store', `• Supabase: ${stats.isSupabaseConnected ? 'Conectado' : 'Local'}`);

    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ ERRO NO SEED:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
