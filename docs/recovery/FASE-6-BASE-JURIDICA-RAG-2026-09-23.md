# FASE 6 — Reconstrução da Base Jurídica/RAG — 2026-09-23

## Objetivo

Determinar, antes de qualquer reingestão, quanto da antiga base jurídica sobreviveu no Git e no banco canônico, qual era a arquitetura esperada do RAG e quais partes precisam ser recompostas por fontes jurídicas oficiais.

## Regra de reconstrução

A base histórica do projeto perdido não é tratada como recuperável. A reconstrução deve distinguir:

- **RECUPERADO** — conteúdo original ainda evidenciado em código/documentação/artefato versionado;
- **RECONSTRUÍVEL** — arquitetura, catálogo ou regras sobrevivem, mas o conteúdo precisa ser recomposto de fonte oficial;
- **PERDIDO** — não há evidência suficiente do conteúdo histórico;
- **KNOWLEDGE_GAP** — há indicação de necessidade, mas falta evidência para afirmar conteúdo ou cobertura.

Nenhum conteúdo jurídico foi inventado ou inserido no Supabase nesta fase.

## 1. Estado do banco canônico

As seis tabelas de RAG foram verificadas diretamente no projeto 'llmxnpgjpxcvyrqjkfwb' e também no snapshot 'recovery_backup_20260923':

- 'knowledge_sources': 0
- 'knowledge_documents': 0
- 'knowledge_document_versions': 0
- 'knowledge_chunks': 0
- 'knowledge_embeddings': 0
- 'knowledge_ingestions': 0

Conclusão: a estrutura RAG existe, mas o conteúdo jurídico persistido nessas tabelas não sobreviveu.

A função 'public.match_knowledge_chunks' existe e referencia 'knowledge_chunks', portanto o mecanismo de consulta foi preservado estruturalmente, não a base de conteúdo.

## 2. Estrutura RAG preservada

O schema atual fornece evidência clara de um pipeline versionado:

### Sources
'knowledge_sources' possui identidade, autoridade, URL, jurisdição e ativação.

### Documents
'knowledge_documents' possui título, tipo, jurisdição, status e versão corrente.

### Versions
'knowledge_document_versions' possui conteúdo, hash, fonte, datas de publicação/vigência e metadados.

### Chunks
'knowledge_chunks' possui conteúdo, hash, token count, heading, artigo, seção, jurisdição, tipo documental e metadados.

### Embeddings
'knowledge_embeddings' possui provider, model, dimensions e vetor pgvector.

### Ingestion
'knowledge_ingestions' registra arquivos, documentos processados, chunks, embeddings, falhas, duração, provider/model e detalhes.

Conclusão: **pipeline estrutural RECUPERADO; conteúdo persistido PERDIDO.**

## 3. Evidência histórica no Git

A busca de histórico encontrou implementação explícita de Knowledge/RAG.

Evidências relevantes:

- 'feat(cloudflare): migrate knowledge RAG to Vectorize' — commit '5a6b832e0799fda8786371a764186f4b6347a2ed'.
- 'feat(cloudflare): expose knowledge RAG routes' — commit 'e4f7f86433eb0619bd00e381a75cac865203f0b9'.
- 'feat(knowledge): complete Cloudflare migration phase 3 (Knowledge/RAG)' — commit '921903a8e2ccc31c3c68cd1bc26a0bc437c4a783'.
- 'feat: add national monitor and improve document engine' — commit '9326bdca99ccafc96ec34b2b23c8d4b373a6f34e'.
- 'feat(fases 3-7): composição determinística dirigida por análise...' — commit '75609a241a46dcf4dab2cc7cb99cefa4eb0cc121'.

## 4. O que o histórico do Git comprova

O histórico comprova que o sistema já possuía:

- pipeline de Knowledge/RAG;
- ingestão e busca semântica;
- indexação vetorial;
- chunking;
- embeddings;
- catálogo de argumentos jurídicos;
- motor de regras;
- catálogo de infrações;
- artigos do CTB;
- templates e blocos documentais;
- metadados temporais de vigência;
- metadados jurisdicionais;
- registro nacional de órgãos/UFs/CETRANs;
- mecanismo explícito de 'KNOWLEDGE_GAP';
- geração determinística subordinada ao conhecimento canônico.

Um commit de migração Cloudflare registra explicitamente ingestão de fontes jurídicas incluindo **CTB, DETRANs, resoluções e jurisprudência**, além de mencionar embeddings e busca vetorial. Isso é evidência de arquitetura/escopo, não prova de que o conteúdo histórico completo ainda exista.

## 5. Evidência de conteúdo jurídico versionado no código

O histórico também contém evidências de catálogos jurídicos embutidos no código.

Entre elas:

- 'ARGUMENTS_CATALOG';
- 'EXPERT_RULES';
- 'INFRACTION_CATALOG';
- 'CTB_ARTICLES_DB';
- 'DOCUMENT_BLOCKS';
- 'TEMPLATES_CATALOG';
- 'NATIONAL_STATES_DB';
- 'NATIONAL_ORGANS_DB';
- 'NATIONAL_CETRANS_DB';
- 'CanonicalKnowledgeRegistry'.

Há evidência histórica de **52 teses/argumentos fundamentados** no Knowledge Hub e de regras como:
- dupla notificação/prazos;
- aferição de radar;
- conversão em advertência;
- termo de sinais psicomotores da Lei Seca;
- observações circunstanciadas/MBFT;
- sinalização;
- velocidade considerada pelo INMETRO.

Esses catálogos representam conhecimento jurídico de aplicação determinística, mas não devem ser confundidos com a antiga base RAG documental completa.

## 6. Embeddings e migração vetorial

O histórico de 14/15 de setembro de 2026 mostra uma migração específica para Cloudflare Vectorize.

A implementação encontrada registra:

- modelo de embedding Cloudflare '@cf/baai/bge-base-en-v1.5';
- chunking com limite de 7000 caracteres;
- metadados de 'documentId', título, fonte, jurisdição, chunk e texto;
- busca semântica via Vectorize;
- endpoint administrativo de indexação;
- endpoint de busca.

Outro registro de planejamento da fase Cloudflare menciona NV-Embed-QA e reranking Nemotron-3B, mas isso é evidência documental de requisito/planejamento, não confirmação de que toda essa arquitetura chegou a ser a implementação final em produção.

## 7. Conclusão da Fase 6 — auditoria

### RECUPERADO

- modelo estrutural das tabelas RAG;
- função de busca 'match_knowledge_chunks';
- arquitetura de ingestão/versionamento;
- existência histórica do pipeline RAG;
- catálogo de regras/teses e componentes jurídicos no código histórico;
- arquitetura nacional/jurisdicional;
- princípios de temporalidade e 'KNOWLEDGE_GAP'.

### RECONSTRUÍVEL

- base documental jurídica, usando os catálogos e a arquitetura sobreviventes como especificação;
- fontes oficiais por autoridade/jurisdição;
- documentos, versões, chunks e embeddings;
- cobertura nacional, mediante coleta e validação das fontes oficiais;
- pipeline de ingestão compatível com o schema atual.

### PERDIDO

- registros históricos efetivamente armazenados nas seis tabelas RAG;
- embeddings históricos dessas tabelas;
- histórico de ingestões armazenado nessas tabelas;
- qualquer volume histórico de documentos/chunks que não tenha sobrevivido em outro artefato.

### KNOWLEDGE_GAP

- tamanho exato da antiga base;
- lista completa de documentos que existiam no banco perdido;
- correspondência entre os antigos documentos RAG e os catálogos embutidos no código;
- provedor/modelo definitivo usado para todos os embeddings históricos;
- eventual conteúdo de jurisprudência que não esteja preservado em código/documentação.

## 8. Gate para a próxima etapa

**Não executar ingestão ainda.**

A próxima etapa deve construir o **Catálogo Mestre de Fontes Jurídicas**, usando:

1. fontes jurídicas oficiais;
2. categorias e jurisdições já previstas pelo projeto;
3. cobertura necessária para cada serviço;
4. vigência temporal;
5. autoridade da fonte;
6. URL oficial;
7. estratégia de versionamento;
8. regras de validação antes da publicação no RAG.

Somente depois do catálogo aprovado deve ocorrer a coleta e ingestão.

## Estado

**FASE 6 — AUDITORIA DA BASE JURÍDICA/RAG: CONCLUÍDA — CONTEÚDO HISTÓRICO NÃO RECUPERADO, ARQUITETURA E PARTE DO CONHECIMENTO CANÔNICO RECONSTRUÍVEIS.**

Nenhuma alteração de dados foi realizada no Supabase durante esta fase.
