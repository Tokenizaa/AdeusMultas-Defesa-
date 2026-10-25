#!/usr/bin/env tsx
/**
 * Script para persistir as 7 normas prioritárias via IngestionService
 * Execute: npx tsx scripts/ingest-norms.ts
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ingestionService } from '../src/server/knowledge/ingestion-service';

// Ler arquivos coletados
function readFileContent(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf-8');
}

// Calcular hash SHA-256
function hashContent(text: string): string {
  return crypto.createHash('sha256').update(text.trim()).digest('hex');
}

// Estrutura de uma norma para ingestão
interface NormInput {
  sourceId: string;
  sourceName: string;
  authority: string;
  sourceType: 'LAW' | 'REGULATION' | 'MANUAL' | 'JURISPRUDENCE' | 'GOVERNMENT' | 'TECHNICAL' | 'INTERNAL' | 'OTHER';
  sourceUrl: string;
  documentId: string;
  title: string;
  documentType: string;
  description: string;
  content: string;
  publishedAt: string;
  versionLabel?: string;
  jurisdiction?: string;
  metadata?: Record<string, any>;
}

// Coletar normas dos arquivos .firecrawl
const norms: NormInput[] = [
  {
    sourceId: 'SRC_FED_CTB_PLANALTO',
    sourceName: 'Código de Trânsito Brasileiro — Lei 9.503/1997 (Planalto)',
    authority: 'Congresso Nacional / Presidência da República',
    sourceType: 'LAW',
    sourceUrl: 'https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm',
    documentId: 'DOC-LEI-9503-CTB-CONSOLIDADO',
    title: 'Código de Trânsito Brasileiro (CTB Completo Consolidado - Planalto)',
    documentType: 'LEI',
    description: 'Norma primária do trânsito nacional atualizada com as Leis 14.071/20, 14.229/21, 14.599/23 e 14.861/24. Texto oficial consolidado do Planalto.',
    content: '',
    publishedAt: '1997-09-23',
    versionLabel: 'v2026.1-consolidado',
    jurisdiction: 'BR_FEDERAL',
    metadata: { 
      collection_date: new Date().toISOString(),
      source_official: 'planalto.gov.br',
      consolidation_date: '2026-08-19'
    }
  },
  {
    sourceId: 'SRC_FED_CONTRAN_RESOLUCOES',
    sourceName: 'Conselho Nacional de Trânsito (CONTRAN)',
    authority: 'CONTRAN',
    sourceType: 'REGULATION',
    sourceUrl: 'https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao10312026.pdf',
    documentId: 'DOC-RES-CONTRAN-1031-2026',
    title: 'Resolução CONTRAN nº 1.031/2026',
    documentType: 'RESOLUCAO',
    description: 'Dispõe sobre os procedimentos a serem adotados pelas autoridades de trânsito e seus agentes na fiscalização do consumo de álcool ou de outra substância psicoativa que determine dependência. Revoga Resolução 432/2013. Altera Anexo da Resolução 985/2022.',
    content: '',
    publishedAt: '2026-08-18',
    versionLabel: 'v1.0',
    jurisdiction: 'BR_FEDERAL',
    metadata: { 
      collection_date: new Date().toISOString(),
      source_official: 'gov.br/transportes',
      revokes: 'RES-432-2013',
      alters_annex_of: 'RES-985-2022'
    }
  },
  {
    sourceId: 'SRC_FED_CONTRAN_RESOLUCOES',
    sourceName: 'Conselho Nacional de Trânsito (CONTRAN)',
    authority: 'CONTRAN',
    sourceType: 'REGULATION',
    sourceUrl: 'https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9652022.pdf',
    documentId: 'DOC-RES-CONTRAN-965-2022',
    title: 'Resolução CONTRAN nº 965/2022',
    documentType: 'RESOLUCAO',
    description: 'Define e regulamenta as áreas de segurança e de estacionamentos específicos de veículos. Inclui vagas para PcD, idosos, ambulâncias, veículos elétricos, carga/descarga, rotativo, curta duração, viaturas policiais. Revoga Resoluções 302, 303, 304/2008. Alterada pela Resolução 1012/2024.',
    content: '',
    publishedAt: '2022-05-17',
    versionLabel: 'v1.0',
    jurisdiction: 'BR_FEDERAL',
    metadata: { 
      collection_date: new Date().toISOString(),
      source_official: 'gov.br/transportes',
      revokes: ['RES-302-2008', 'RES-303-2008', 'RES-304-2008'],
      altered_by: 'RES-1012-2024',
      process_number: '80000.113319/2016-17'
    }
  },
  {
    sourceId: 'SRC_FED_CONTRAN_RESOLUCOES',
    sourceName: 'Conselho Nacional de Trânsito (CONTRAN)',
    authority: 'CONTRAN',
    sourceType: 'REGULATION',
    sourceUrl: 'https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9662022.pdf',
    documentId: 'DOC-RES-CONTRAN-966-2022',
    title: 'Resolução CONTRAN nº 966/2022',
    documentType: 'RESOLUCAO',
    description: 'Dispõe sobre os requisitos técnicos dos espelhos retrovisores de veículos. Revoga art. 5º da Resolução 799/2020 e Resoluções 682/2017 e 703/2017. Vigência escalonada até 2025.',
    content: '',
    publishedAt: '2022-05-17',
    versionLabel: 'v1.0',
    jurisdiction: 'BR_FEDERAL',
    metadata: { 
      collection_date: new Date().toISOString(),
      source_official: 'gov.br/transportes',
      revokes: ['RES-682-2017', 'RES-703-2017', 'ART-5-RES-799-2020'],
      process_number: '50000.034185/2021-67',
      effective_dates: {
        motorcycles: '2019-01-01',
        new_projects: '2022-10-18',
        cars_production: '2024-10-18',
        heavy_production: '2025-10-18'
      }
    }
  },
  {
    sourceId: 'SRC_FED_CONTRAN_RESOLUCOES',
    sourceName: 'Conselho Nacional de Trânsito (CONTRAN)',
    authority: 'CONTRAN',
    sourceType: 'REGULATION',
    sourceUrl: 'https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9852022.pdf',
    documentId: 'DOC-RES-CONTRAN-985-2022',
    title: 'Resolução CONTRAN nº 985/2022',
    documentType: 'RESOLUCAO',
    description: 'Aprova o Manual Brasileiro de Fiscalização de Trânsito (MBFT). Revoga Resolução 925/2022. Alterada pelas Resoluções 1003/2023, 1009/2024, 1012/2024, 1013/2024, 1031/2026. Anexos em 7 partes (MBFT Part I-VII).',
    content: '',
    publishedAt: '2022-12-15',
    versionLabel: 'v1.0',
    jurisdiction: 'BR_FEDERAL',
    metadata: { 
      collection_date: new Date().toISOString(),
      source_official: 'gov.br/transportes',
      revokes: 'RES-925-2022',
      altered_by: ['RES-1003-2023', 'RES-1009-2024', 'RES-1012-2024', 'RES-1013-2024', 'RES-1031-2026'],
      process_number: '50000.007555/2021-93',
      annexes: ['MBFT Part I', 'MBFT Part II', 'MBFT Part III', 'MBFT Part IV', 'MBFT Part V', 'MBFT Part VI', 'MBFT Part VII']
    }
  },
  {
    sourceId: 'SRC_FED_CONTRAN_RESOLUCOES',
    sourceName: 'Conselho Nacional de Trânsito (CONTRAN)',
    authority: 'CONTRAN',
    sourceType: 'REGULATION',
    sourceUrl: 'https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao798-2020.pdf',
    documentId: 'DOC-RES-CONTRAN-798-2020',
    title: 'Resolução CONTRAN nº 798/2020',
    documentType: 'RESOLUCAO',
    description: 'Dispõe sobre requisitos técnicos mínimos para a fiscalização da velocidade de veículos automotores, elétricos, reboques e semirreboques. Define medidores fixos (controlador/redutor) e portáteis. Requisitos metrológicos (Inmetro), técnicos (OCR, GPS, contagem volumétrica). Revoga Resolução 396/2011. Alterada pela Resolução 804/2020.',
    content: '',
    publishedAt: '2020-09-02',
    versionLabel: 'v1.0',
    jurisdiction: 'BR_FEDERAL',
    metadata: { 
      collection_date: new Date().toISOString(),
      source_official: 'gov.br/transportes',
      revokes: 'RES-396-2011',
      altered_by: 'RES-804-2020',
      process_number: '80001.020255/2007-01',
      effective_date: '2020-11-01'
    }
  },
  {
    sourceId: 'SRC_FED_CONTRAN_RESOLUCOES',
    sourceName: 'Conselho Nacional de Trânsito (CONTRAN)',
    authority: 'CONTRAN',
    sourceType: 'REGULATION',
    sourceUrl: 'https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao8042020.pdf',
    documentId: 'DOC-RES-CONTRAN-804-2020',
    title: 'Resolução CONTRAN nº 804/2020',
    documentType: 'RESOLUCAO',
    description: 'Altera a Resolução CONTRAN nº 798/2020. Modifica requisitos de verificação metrológica (Inmetro), exige imagem da placa no AIT/NA, ajusta prazos de adequação para medidores em operação. Entra em vigor na data da publicação.',
    content: '',
    publishedAt: '2020-11-16',
    versionLabel: 'v1.0',
    jurisdiction: 'BR_FEDERAL',
    metadata: { 
      collection_date: new Date().toISOString(),
      source_official: 'gov.br/transportes',
      alters: 'RES-798-2020',
      process_number: '80001.020255/2007-01'
    }
  },
  {
    sourceId: 'SRC_FED_CONTRAN_RESOLUCOES',
    sourceName: 'Conselho Nacional de Trânsito (CONTRAN)',
    authority: 'CONTRAN',
    sourceType: 'REGULATION',
    sourceUrl: 'https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9182022.pdf',
    documentId: 'DOC-RES-CONTRAN-918-2022',
    title: 'Resolução CONTRAN nº 918/2022',
    documentType: 'RESOLUCAO',
    description: 'Consolida as normas sobre procedimentos para a aplicação das multas por infrações, a arrecadação e o repasse dos valores arrecadados. Revoga Resoluções 156/2004, 424/2012, 442/2013, 574/2015, 619/2016, 697/2017, 736/2018, 845/2021 e Deliberação 115/2011. Alterada pela Resolução 991/2023.',
    content: '',
    publishedAt: '2022-03-28',
    versionLabel: 'v1.0',
    jurisdiction: 'BR_FEDERAL',
    metadata: { 
      collection_date: new Date().toISOString(),
      source_official: 'gov.br/transportes',
      revokes: ['RES-156-2004', 'RES-424-2012', 'RES-442-2013', 'RES-574-2015', 'RES-619-2016', 'RES-697-2017', 'RES-736-2018', 'RES-845-2021', 'DEL-115-2011'],
      altered_by: 'RES-991-2023',
      process_number: '50000.031757/2021-56',
      effective_date: '2022-04-01'
    }
  },
  {
    sourceId: 'SRC_FED_CONTRAN_RESOLUCOES',
    sourceName: 'Conselho Nacional de Trânsito (CONTRAN)',
    authority: 'CONTRAN',
    sourceType: 'REGULATION',
    sourceUrl: 'https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9912023.pdf',
    documentId: 'DOC-RES-CONTRAN-991-2023',
    title: 'Resolução CONTRAN nº 991/2023',
    documentType: 'RESOLUCAO',
    description: 'Altera a Resolução CONTRAN nº 918/2022. Moderniza procedimentos de arrecadação de multas, pagamento parcelado via cartão, credenciamento de empresas, relatórios mensais ao órgão máximo.',
    content: '',
    publishedAt: '2023-04-19',
    versionLabel: 'v1.0',
    jurisdiction: 'BR_FEDERAL',
    metadata: { 
      collection_date: new Date().toISOString(),
      source_official: 'gov.br/transportes',
      alters: 'RES-918-2022',
      process_number: '50000.031757/2021-56',
      effective_date: '2023-04-25'
    }
  }
];

async function loadContentFromFirecrawl() {
  const firecrawlDir = path.join(process.cwd(), '.firecrawl');
  
  // Mapear arquivos para normas
  const fileMap: Record<string, string> = {
    'ctb_planalto.md': 'DOC-LEI-9503-CTB-CONSOLIDADO',
    'contran_1031_2026.md': 'DOC-RES-CONTRAN-1031-2026',
    'contran_965_2022.md': 'DOC-RES-CONTRAN-965-2022',
    'contran_966_2022.md': 'DOC-RES-CONTRAN-966-2022',
    'contran_985_2022.md': 'DOC-RES-CONTRAN-985-2022',
    'contran_985_2022_mbft.md': 'DOC-RES-CONTRAN-985-2022', // Portaria SENATRAN 985 - não é a mesma
    'contran_798_2020.md': 'DOC-RES-CONTRAN-798-2020', // Conteúdo vem do LegisWeb
    'contran_804_2020.md': 'DOC-RES-CONTRAN-804-2020', // Conteúdo vem do LegisWeb
    'contran_918_2022.md': 'DOC-RES-CONTRAN-918-2022',
    'contran_991_2023.md': 'DOC-RES-CONTRAN-991-2023',
  };

  for (const norm of norms) {
    const fileName = Object.keys(fileMap).find(k => fileMap[k] === norm.documentId);
    if (fileName) {
      const filePath = path.join(firecrawlDir, fileName);
      if (fs.existsSync(filePath)) {
        const content = readFileContent(filePath);
        norm.content = content;
        console.log(`✓ Carregado: ${norm.documentId} (${content.length} chars)`);
      } else {
        console.log(`✗ Arquivo não encontrado: ${fileName}`);
      }
    }
  }

  // Para normas sem arquivo firecrawl, usar o conteúdo do LegisWeb já obtido nas buscas
  // Resolução 966, 798, 804, 918, 991 - já temos o texto completo nas buscas
  
  // Carregar Resolução 966 do arquivo LegisWeb
  const res966Path = path.join(firecrawlDir, 'contran_966_2022.md');
  if (fs.existsSync(res966Path)) {
    const content = readFileContent(res966Path);
    const norm = norms.find(n => n.documentId === 'DOC-RES-CONTRAN-966-2022');
    if (norm) norm.content = content;
  }

  // Carregar Resolução 798 do arquivo LegisWeb (busca já retornou o texto completo)
  const res798Path = path.join(firecrawlDir, 'search_contran_798_2020.json');
  if (fs.existsSync(res798Path)) {
    const searchData = readFileContent(res798Path);
    const norm = norms.find(n => n.documentId === 'DOC-RES-CONTRAN-798-2020');
    if (norm) {
      norm.content = extractResolutionFromSearchFile(searchData);
    }
  }

  // Carregar Resolução 804 do arquivo LegisWeb
  const res804Path = path.join(firecrawlDir, 'search_contran_804_2020.json');
  if (fs.existsSync(res804Path)) {
    const searchData = readFileContent(res804Path);
    const norm = norms.find(n => n.documentId === 'DOC-RES-CONTRAN-804-2020');
    if (norm) {
      norm.content = extractResolutionFromSearchFile(searchData);
    }
  }

  // Carregar Resolução 918 do arquivo LegisWeb
  const res918Path = path.join(firecrawlDir, 'search_contran_918_2022.json');
  if (fs.existsSync(res918Path)) {
    const searchData = readFileContent(res918Path);
    const norm = norms.find(n => n.documentId === 'DOC-RES-CONTRAN-918-2022');
    if (norm) {
      norm.content = extractResolutionFromSearchFile(searchData);
    }
  }

  // Carregar Resolução 991 do arquivo LegisWeb
  const res991Path = path.join(firecrawlDir, 'search_contran_991_2023.json');
  if (fs.existsSync(res991Path)) {
    const searchData = readFileContent(res991Path);
    const norm = norms.find(n => n.documentId === 'DOC-RES-CONTRAN-991-2023');
    if (norm) {
      norm.content = extractResolutionFromSearchFile(searchData);
    }
  }

  // Carregar Resolução 1031 do arquivo PDF do gov.br
  const res1031Path = path.join(firecrawlDir, 'contran_1031_2026.md');
  if (fs.existsSync(res1031Path)) {
    const content = readFileContent(res1031Path);
    const norm = norms.find(n => n.documentId === 'DOC-RES-CONTRAN-1031-2026');
    if (norm) {
      // O PDF não foi extraído bem, usar conteúdo da busca
      const searchPath = path.join(firecrawlDir, 'search_contran_1031_2026.json');
      if (fs.existsSync(searchPath)) {
        const searchData = readFileContent(searchPath);
        norm.content = extractResolutionFromSearchFile(searchData);
      }
    }
  }
}

function extractResolutionFromSearch(searchData: any): string {
  // O resultado da busca já contém o texto completo da resolução
  if (typeof searchData === 'string') {
    return searchData;
  }
  if (searchData && searchData.data && searchData.data.web) {
    const results = searchData.data.web;
    if (Array.isArray(results)) {
      for (const r of results) {
        if (r.content && r.content.length > 1000) {
          return r.content;
        }
        if (r.description && r.description.length > 1000) {
          return r.description;
        }
      }
    }
  }
  return JSON.stringify(searchData, null, 2).substring(0, 10000);
}

function extractResolutionFromSearchFile(searchText: string): string {
  // O arquivo de busca do firecrawl tem formato customizado (não JSON)
  // Procurar pelo conteúdo da resolução no texto
  const lines = searchText.split('\n');
  
  // Tentar encontrar o início da resolução
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Resolve:') || 
        lines[i].includes('Art. 1º') || 
        lines[i].includes('CAPÍTULO I')) {
      startIdx = i;
      break;
    }
  }
  
  if (startIdx >= 0) {
    // Pegar da resolução até o fim ou até encontrar marcadores de fim
    let content = lines.slice(startIdx).join('\n');
    // Limitar tamanho
    if (content.length > 50000) {
      content = content.substring(0, 50000) + '\n... [truncado]';
    }
    return content;
  }
  
  // Fallback: retornar o texto completo truncado
  if (searchText.length > 50000) {
    return searchText.substring(0, 50000) + '\n... [truncado]';
  }
  return searchText;
}

async function ingestNorm(norm: NormInput) {
  const contentHash = hashContent(norm.content);
  console.log(`\n--- Ingestando: ${norm.title} ---`);
  console.log(`  DocumentID: ${norm.documentId}`);
  console.log(`  Content Hash: ${contentHash.substring(0, 16)}...`);
  console.log(`  Tamanho: ${norm.content.length} chars`);

  try {
    const result = await ingestionService.ingestDocument(norm, { 
      correlationId: `INGEST-${norm.documentId}-${Date.now()}`
    });
    
    console.log(`  Status: ${result.status}`);
    console.log(`  Chunks: ${result.chunksCount}`);
    console.log(`  VersionID: ${result.versionId}`);
    console.log(`  Persistência Supabase: ${result.persistenceResult.persistedToSupabase ? 'OK' : 'FALHOU'}`);
    if (result.persistenceResult.supabaseError) {
      console.log(`  Erro Supabase: ${result.persistenceResult.supabaseError}`);
    }
    
    return {
      documentId: norm.documentId,
      title: norm.title,
      status: result.status,
      contentHash: contentHash.substring(0, 16),
      size: norm.content.length,
      chunksCount: result.chunksCount,
      versionId: result.versionId,
      persistedToSupabase: result.persistenceResult.persistedToSupabase,
      supabaseError: result.persistenceResult.supabaseError,
      sourceUrl: norm.sourceUrl,
      metadata: norm.metadata
    };
  } catch (error: any) {
    console.error(`  ERRO: ${error.message}`);
    return {
      documentId: norm.documentId,
      title: norm.title,
      status: 'ERROR',
      error: error.message,
      contentHash: contentHash.substring(0, 16),
      size: norm.content.length,
      sourceUrl: norm.sourceUrl
    };
  }
}

async function main() {
  console.log('=== CARREGANDO CONTEÚDO DOS ARQUIVOS FIRECRAWL ===');
  await loadContentFromFirecrawl();
  
  console.log('\n=== INICIANDO INGESTÃO DAS 7 NORMAS PRIORITÁRIAS ===');
  console.log(`Supabase configurado: ${ingestionService.isSupabaseConfigured()}`);

  const results = [];
  for (const norm of norms) {
    if (!norm.content || norm.content.length < 100) {
      console.log(`\n⚠️  PULANDO ${norm.documentId}: conteúdo insuficiente (${norm.content?.length || 0} chars)`);
      results.push({
        documentId: norm.documentId,
        title: norm.title,
        status: 'SKIPPED',
        reason: 'Conteúdo insuficiente ou não obtido',
        sourceUrl: norm.sourceUrl
      });
      continue;
    }
    const result = await ingestNorm(norm);
    results.push(result);
    
    // Pequena pausa para não sobrecarregar
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n=== RELATÓRIO FINAL DE COLETA ===');
  console.log(JSON.stringify(results, null, 2));

  // Salvar relatório
  const reportPath = path.join(process.cwd(), '.firecrawl', `ingestion-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nRelatório salvo em: ${reportPath}`);

  // Resumo
  const success = results.filter(r => r.status === 'PROCESSED').length;
  const skipped = results.filter(r => r.status === 'SKIPPED').length;
  const errors = results.filter(r => r.status === 'ERROR').length;
  console.log(`\nResumo: ${success} processados, ${skipped} pulados, ${errors} erros`);
  
  // Verificar se consegue ler de volta
  console.log('\n=== VERIFICAÇÃO DE RECUPERAÇÃO ===');
  const persisted = await ingestionService.getPersistedIngestions();
  console.log(`Registros de ingestão no Supabase: ${persisted.length}`);
}

main().catch(console.error);