# Relatório de Auditoria — Base Jurídica, RAG e Geração de Minuta em Produção

**Projeto:** DefesAi / AdeusMultas  
**Repositório:** `Tokenizaa/AdeusMultas-Defesa-`  
**Branch:** `main` (SHA `6a4b6e5`, commit `feat(onboarding): completa 28 casos de referência...`)  
**Data:** 23/10/2026  
**Escopo:** Auditoria aprofundada — somente leitura; nenhuma alteração de código, dados, migração ou permissão.

---

## 0. Resumo Executivo

O domínio de produção `https://adeusmulta.defesai.com.br` é atendido por um **Cloudflare Worker** (`wrangler.jsonc`, `workers_dev: false`) que roda sobre o projeto Supabase `llmxnpgjpxcvyrqjkfwb` ("Defesai-AdeusMultas", região `sa-east-1`, status `ACTIVE_HEALTHY`, PG 17.6.1.166).

O caminho de produção (Cloudflare Worker) é **independente do legacy Express/TypeScript** (`src/server/`) e não invoca os serviços RAG do servidor (`SearchService`, `RagService`, `VectorStore`, `ingestionService`). Em vez disso, usa o `CloudflareRagAdapter` (`cloudflare/rag-adapter.ts`) com **busca lexical direta sobre `knowledge_chunks`** via PostgREST, enriquecida pelo **Expert Rule Engine** determinístico e montada pelo `DocumentAssemblyEngine`.

A base de conhecimento persistida existe no Supabase (39 fontes, 66 documentos, 66 versões, 58 chunks, 58 embeddings) mas:
- **Todas as 39 fontes estão sem URL** (`url IS NULL OR url = ''`).
- O provedor dos 58 embeddings é `DETERMINISTIC_LOCAL` (vetorização baseada em hash de saco de palavras), com dimensão 1024 — **não é um modelo semântico real**.
- A RPC `match_knowledge_chunks` existe no banco, com índice HNSW (`vector_cosine_ops`), mas **não é chamada pelo caminho de produção Cloudflare** (só é usada pelo legacy Express e pelo worker.ts de agentes).
- Nenhum registro em `knowledge_ingestions` (0 linhas), embora os dados estejam presentes nas tabelas.

A recuperação jurídica **não fundamenta efetivamente as teses**: a `provenanceStatus` é computada por correspondência lexical de termos do `legalBase` nos chunks, mas a busca lexical retorna chunks de portarias estaduais (AC, AM, AP, etc.) que raramente citam o artigo/CTB específico da tese. Consequentemente, a grande maioria das teses fica com `provenanceStatus: 'UNSUPPORTED'`.

O Quality Gate (`cloudflare/quality-gate.ts`) **é invocado** na rota de geração de defesa (`POST /api/cases/:id/generate-defense`) e bloqueia quando `overallPass` é falso, incluindo o check `PROVENANCE_KB` que exige que todas as teses estejam ancoradas em fonte oficial recuperada. Este é um ponto de controle relevante, mas depende da qualidade da recuperação lexical.

---

## 1. Fluxo Real por Caminho de Execução

### 1.1 Caminho A — Análise gratuita (onboarding anônimo)

**Rota:** `POST /api/cases/anonymous` (`cloudflare/routes/cases.ts:73`)

1. Recebe dados mínimos da autuação (AIT, código, local, placa) + flags de evidência.
2. Cria o caso com `status: 'analisado'`, `is_paid: false`, `current_stage: 2`.
3. Chama `analyzeInfractionCompat(c.env, caseId, infraction)` → `CloudflareRagAdapter.analyzeInfraction`.
   - `buildSearchTerms(infraction)` extrai até 12 termos lexicais (artigo, descrição, CTB).
   - `searchKnowledgeLexical(terms)` faz `ilike` sobre `knowledge_chunks.content` (máx. 200), filtra chunks com ≥1 termo, ordena por contagem de termos, top 5.
   - Carrega versões (`knowledge_document_versions.source_url`) e fontes (`knowledge_sources`).
   - `applyDeterministicAnalysis` instancia `ExpertRuleEngine.evaluate(caseId, infractionWithFlags)` (motor determinístico).
   - Para cada argumento recomendado, busca hits nos chunks recuperados cujo `content` cita o artigo/resolução do `legalBase`; se houver hit com `official_url`, `provenanceStatus = 'SUPPORTED'`, senão `'UNSUPPORTED'`.
   - Retorna `analysis` com `recommendedArguments` (cada um com `provenance`, `provenanceStatus`) e `ragRetrieval` (top 3 chunks).
4. `analysis.recommendedProcedure` é sobrescrito por `domainData.serviceType` (escolha do usuário no onboarding).
5. Persiste `analysis_json` e `defense_draft_json` (ainda null nesta etapa) no `cases`.

**Motor determinístico:** `ExpertRuleEngine.evaluate` (`src/core/rules/rule-engine.ts`).  
**Fonte de seleção das teses:** `ARGUMENTS_CATALOG` filtrado por `classification.eligibleArgumentIds` (família da infração).  
**Mecanismo de recuperação jurídica:** busca lexical direta em `knowledge_chunks` (não semântica, não híbrida).  
**Origem dos parágrafos impressos:** ainda não há minuta nesta etapa; apenas a análise com teses e provenance.  
**Proveniência persistida:** `analysis_json` em `cases` (inclui `ragRetrieval` e `provenance` por tese).  
**Validações antes de liberar:** nenhuma nesta etapa (análise gratuita, sem minuta). O documento só é gerado após pagamento.

### 1.2 Caminho B — Geração manual de minuta (após pagamento)

**Rota:** `POST /api/cases/:id/generate-defense` (`cloudflare/routes/cases.ts:526`)

Pré-requisito: `row.is_paid === true` (senão 402). Usuário autenticado, dono do caso.

1. Requalificação do requerente (`body.applicantData` ou `domain.applicant`). Campos obrigatórios: nome, CPF, CNH, endereço, cidade/UF.
2. Recomputa a análise via `analyzeInfractionCompat(c.env, domain.id, domain.infraction)` (mesmo fluxo do Caminho A, fresco via RAG).
3. `generateDefenseDraftCompat(c.env, domain.id, infraction, plate, model, applicant, serviceType, domain.analysis)`:
   - Usa a `analysis` pré-computada (não recalcula) para preservar o `integrityHash`.
   - `resolveProcedure(procedureType, analysis)` — pedido do usuário se compatível com a família, senão o recomendado pela Analysis.
   - `DocumentAssemblyEngine.assemble(...)` com `selectedArgumentIds = analysis.recommendedArguments.map(a => a.id)` e `analysis`.
4. `computeDefenseIntegrityHash(draft, analysis, infraction)` (SHA-256 sobre conteúdo do rascunho + fatos do AIT).
5. `runCanonicalQualityGate({infraction, analysis, draft, applicant, vehicle, serviceType})` — 7 checks herdados + TESE_AUTORIZADA + FUNDAMENTO_VERIFICAVEL + PROCEDIMENTO_COMPATIVEL + JURISDIÇÃO + PROVENANCE_KB.
6. Se `!qualityGate.overallPass` → HTTP 422 (bloqueado). Senão persiste `defense_draft_json`, `status: 'defesa_pronta'`, `current_stage: 3`.

**Motor determinístico:** Expert Rule Engine + Document Assembly Engine.  
**Fonte de seleção das teses:** `analysis.recommendedArguments` (do Rule Engine, já filtrado por elegibilidade de família).  
**Mecanismo de recuperação jurídica:** busca lexical em `knowledge_chunks` (via rag-adapter, já executada na análise).  
**Origem dos parágrafos impressos:** `ARGUMENTS_CATALOG[].formattedParagraphs` (heading + texto), organizados em seções preliminares (categoria `preliminar`/`formal`) e mérito (`merito`/`constitucional`), mais blocos de template (`DOCUMENT_BLOCKS`, `TEMPLATES_CATALOG`) e narrativa de fatos (`buildFactsNarrative`).  
**Proveniência persistida:** `defense_draft_json` + `integrity_hash` + `analysis_json` em `cases`.  
**Validações antes de liberar:** Quality Gate canônico (fail-closed). Inclui `PROVENANCE_KB` (todas as teses devem ter `provenanceStatus === 'SUPPORTED'`), `TESE_AUTORIZADA`, `FUNDAMENTO_VERIFICAVEL`, `PROCEDIMENTO_COMPATIVEL`, `JURISDIÇÃO`.

### 1.3 Caminho C — Geração após confirmação de pagamento (webhook)

O pagamento é confirmado via:
- **VenoPag:** `POST /api/webhooks/venopag` (`cloudflare/routes/payments.ts:407`) — verifica assinatura, consulta `getVenoCashInStatus` para confirmar, atualiza `payment_orders` e `cases.is_paid = true`.
- **PagBank:** `POST /api/webhooks/pagbank` (`cloudflare/routes/payments.ts:365`) — verifica `x-authenticity-token`, atualiza `payment_orders` e `cases.is_paid = true` quando `status === 'PAID'`.

Após a confirmação, o cliente chama `POST /api/cases/:id/generate-defense` (Caminho B). Não há geração automática de minuta no próprio webhook; a minuta é gerada sob demanda pelo cliente após o pagamento ser confirmado.

**Legacy Express (`src/server/routes/`):** Não atende o domínio de produção. É um caminho paralelo, não invocado pelo Cloudflare Worker. Usa `RagPipeline.generateDefenseDraft` (que chama `RagPipeline.analyzeInfraction` → `ExpertRuleEngine.evaluate` + `DocumentAssemblyEngine.assemble`) e `RagPipeline.retrieveContext`. Os serviços RAG do servidor (`SearchService`/`RagService`/`VectorStore`) são usados apenas em `src/server/routes/ai.ts` (legacy), `src/server/workers/agents/estrategico-agent.worker.ts`, e CLIs de ingestão — **não no caminho de produção da minuta**.

---

## 2. Evidências com Arquivos, Funções e Trechos Relevantes

| Item | Arquivo | Função/Trecho | Evidência |
|------|---------|---------------|-----------|
| Deploy produção | `wrangler.jsonc` | `main: "cloudflare/dist/worker.js"`, `workers_dev: false`, `API_ORIGIN_PRIMARY`, `SUPABASE_URL`, `PAYMENT_MODE: "production"` | Worker é o backend de produção |
| Supabase client | `cloudflare/supabase.ts:66` | `createSupabaseAdminClient` usa `SUPABASE_SECRET_KEY || SUPABASE_SERVICE_ROLE_KEY` | Acesso privilegiado ao banco |
| Worker routes | `cloudflare/worker.js` | `app.route('/api', casesRoutes)`, `paymentsRoutes`, etc. | Todas as rotas montadas no Worker |
| Análise RAG | `cloudflare/rag-adapter.ts:81-301` | `analyzeInfraction` → `searchKnowledgeLexical` + `ExpertRuleEngine.evaluate` + provenance por tese | Caminho de recuperação jurídica em produção |
| Busca lexical | `cloudflare/rag-adapter.ts:124-180` | `.or(filter).limit(200)` sobre `knowledge_chunks.content`, top 5 por contagem de termos | Não vetorial, não híbrida |
| Qualidade | `cloudflare/quality-gate.ts:72-201` | `runCanonicalQualityGate` com 12 checks incluindo `PROVENANCE_KB` | Gate fail-closed antes de liberar minuta |
| Montagem minuta | `cloudflare/rag-adapter.ts:372-432` | `generateDefenseDraftCompat` → `DocumentAssemblyEngine.assemble` + `computeDefenseIntegrityHash` | Minuta determinística |
| Montagem minuta | `src/core/documents/document-assembly-engine.ts:104-512` | Seleciona template, argumentos do `analysis.recommendedArguments`, interpola placeholders, blocos | Origem dos parágrafos impressos |
| Motor regras | `src/core/rules/rule-engine.ts:681-1012` | `ExpertRuleEngine.evaluate` — 17 regras determinísticas, FAIL CLOSED, elegibilidade por família | Autoridade da decisão jurídica |
| Catálogo argumentos | `src/core/arguments/arguments-catalog.ts` | 52 teses (ARG-001 a ARG-052) com `formattedParagraphs`, `legalBase`, `resolutions` | Fonte dos parágrafos impressos |
| Base CTB | `src/core/legal-base/ctb-articles.ts` | 33 artigos do CTB estáticos (não consultados em runtime) | Referência estática, não recuperação |
| Base Resoluções | `src/core/legal-base/resolutions.ts` | 9 resoluções CONTRAN/SENATRAN/INMETRO estáticas | Referência estática, não recuperação |
| Base Jurisprudência | `src/core/legal-base/jurisprudence.ts` | 5 precedentes estáticos | Referência estática, não recuperação |
| Servidor RAG (legacy) | `src/server/knowledge/rag-service.ts` | `RagService.buildRAGContext` / `retrieveContextForQuery` | Não chamado em produção Cloudflare |
| Servidor busca | `src/server/knowledge/search-service.ts` | `SearchService.searchKnowledge` (vetorial + rerank) | Não chamado em produção Cloudflare |
| VectorStore | `src/server/knowledge/vector-store.ts` | `searchVectors` — RPC `match_knowledge_chunks` + in-memory fallback | Não chamado em produção Cloudflare |
| Ingestão | `src/server/knowledge/ingestion-service.ts` | `ingestionService.ingestKnowledgeDirectory` | Não chamado em produção; 0 registros em `knowledge_ingestions` |
| Integridade | `cloudflare/defense-integrity.ts:54-91` | `computeDefenseIntegrityHash` / `hasValidDefenseIntegrity` (SHA-256) | Hash de conteúdo + fatos do AIT |
| Mapper | `cloudflare/canonical-mapper.ts` | `rowToDomain` / `domainToRow` — serialização JSON em `cases` | Persistência de analysis/defenseDraft |

---

## 3. Resultados das Consultas ao Banco (Somente Leitura)

Todas as consultas foram feitas no projeto `llmxnpgjpxcvyrqjkfwb` (confirmado via `list_projects`: nome "Defesai-AdeusMultas", `ACTIVE_HEALTHY`, região `sa-east-1`).

### 3.1 Tabelas e funções existentes

Tabelas relevantes: `knowledge_sources`, `knowledge_documents`, `knowledge_document_versions`, `knowledge_chunks`, `knowledge_embeddings`, `knowledge_ingestions`, `knowledge_document_relations`, `cases`, `payment_orders`.

Função RPC: `match_knowledge_chunks(query_embedding vector, match_threshold double precision, match_count integer, filter_source_id text, filter_document_type text, filter_jurisdiction text)` — retorna `chunk_id, document_id, document_title, document_type, version, source_id, source_name, authority, heading, article_number, content, similarity, metadata`. Assinatura real confirmada via `pg_proc`. Filtra `d.status = 'ACTIVE'` e usa `1 - (e.embedding <=> query_embedding) AS similarity` (cosine).

### 3.2 Contagens

| Tabela | Total | Detalhes |
|--------|-------|----------|
| `knowledge_sources` | 39 | 39 ativas, **39 sem URL** (`tem_url: false` para todas) |
| `knowledge_documents` | 66 | 66 ativas, 0 sem versão atual, 0 sem fonte |
| `knowledge_document_versions` | 66 | 0 sem `content_hash`, 0 sem `source_url` (versões têm URL, fontes não) |
| `knowledge_chunks` | 58 | 0 sem `content_hash` |
| `knowledge_embeddings` | 58 | 0 nulos, 1 modelo distinto (`defesai-legal-vectorizer-v1`), 1 dimensão (1024), provider `DETERMINISTIC_LOCAL` |
| `knowledge_ingestions` | 0 | 0 falhas, 0 registros — pipeline de ingestão não foi executado/rastreado no banco |

### 3.3 Consistência referencial

- Chunks sem embedding correspondente: **0**
- Embeddings sem chunk correspondente: **0**
- Documentos cuja `current_version_id` não existe em versões: **0**
- Versões cujo `document_id` não existe em documentos: **0**
- Chunks cujo `document_version_id` não existe em versões: **0**
- Duplicações de `content_hash` em chunks: 1 hash com qtd 2
- Duplicações de `content_hash` em versões: 1 hash com qtd 2

### 3.4 Índices vetoriais

- `idx_k_embeddings_vector_hnsw` — `hnsw (embedding vector_cosine_ops)` com `m='16'`, `ef_construction='64'` na tabela `knowledge_embeddings`.
- Índices btree em `knowledge_chunks` (source, document, version, article, heading), `knowledge_document_versions` (document, hash), `knowledge_documents` (current_version, source, type), `knowledge_embeddings` (chunk, provider+model).

### 3.5 Limitações das consultas

- Não foi possível exibir conteúdo completo de `content` de chunks/versões (evitar dados pessoais; amostras limitadas a `left(content, 60-100)`).
- O provedor `DETERMINISTIC_LOCAL` indica que os embeddings são gerados por vetorização determinística de hash (conforme comentário em `rag-adapter.ts:97-103`), não por modelo de linguagem semântico.
- Não há registros de ingestão para auditar quando/como os dados entraram; a origem dos 58 chunks não é rastreável via `knowledge_ingestions`.

---

## 4. Distinção: Fato Confirmado, Hipótese, Não Verificado

### Fatos confirmados (evidência direta no código ou banco)

1. O domínio de produção é atendido pelo Cloudflare Worker `adeusmulta` (`wrangler.jsonc`, `worker.js` monta todas as rotas).
2. O Worker usa `SUPABASE_URL = https://llmxnpgjpxcvyrqjkfwb.supabase.co` e modo `PAYMENT_MODE: production`.
3. O caminho de produção NÃO chama `SearchService`, `RagService`, `VectorStore` nem `ingestionService` (grep em `cloudflare/` retornou apenas 1 match: comentário em `rag-adapter.ts`).
4. O caminho de produção usa busca lexical PostgREST sobre `knowledge_chunks.content` (`cloudflare/rag-adapter.ts:124-132`).
5. O Quality Gate `runCanonicalQualityGate` é invocado em `POST /api/cases/:id/generate-defense` (`cases.ts:601`) e bloqueia com HTTP 422 quando `overallPass` é falso.
6. O banco possui 39 fontes (todas sem URL), 66 documentos, 66 versões, 58 chunks, 58 embeddings (provider `DETERMINISTIC_LOCAL`, 1024 dims, 0 nulos).
7. A RPC `match_knowledge_chunks` existe com índice HNSW, mas não é chamada pelo Worker.
8. `knowledge_ingestions` está vazia (0 linhas).
9. A montagem da minuta usa `ARGUMENTS_CATALOG[].formattedParagraphs` (não conteúdo recuperado da KB) (`document-assembly-engine.ts:144-157`).
10. O pagamento é confirmado via webhooks VenoPag/PagBank; a minuta é gerada sob demanda após `is_paid = true`.

### Hipóteses (fundamentadas, mas não provadas diretamente)

1. A baixa qualidade da recuperação lexical (chunks de portarias estaduais raramente citam o artigo CTB da tese) resulta na maioria das teses com `provenanceStatus: 'UNSUPPORTED'`, o que faria o check `PROVENANCE_KB` bloquear a geração da minuta em muitos casos reais. Não foi possível executar contra produção para confirmar a taxa de bloqueio.
2. O `integrityHash` é computado sobre o conteúdo da minuta, mas não inclui a proveniência jurídica (quais documentos fundamentam cada tese), então não detecta adulteração na fundamentação documental.
3. Como o provedor de embedding é `DETERMINISTIC_LOCAL`, a busca vetorial semântica (se ativada) não melhoraria a recuperação jurídica real.

### Itens não verificados (requerem execução ou acesso adicional)

1. Taxa real de `provenanceStatus: 'SUPPORTED'` vs `'UNSUPPORTED'` em casos de produção.
2. Se o Quality Gate bloqueia a geração de minuta para casos típicos (devido a `PROVENANCE_KB`).
3. Se o Worker em produção está atualizado com o `cloudflare/dist/worker.js` mais recente (o dist tem data 23/10, o fonte 20/10).
4. Conteúdo completo dos 58 chunks para avaliar se realmente contêm os artigos CTB/resoluções referenciados pelas teses.
5. Se as fontes sem URL (39/39) impedem a verificação de `official_url` no `ragRetrieval` (o adapter exige `Boolean(r.official_url)` para considerar um hit válido, linha 258).

---

## 5. Riscos Classificados por Prioridade

### P1 — Crítico (bloqueia produção)

**R-01: Recuperação jurídica não fundamenta as teses.** A busca lexical em `knowledge_chunks` retorna chunks que, em geral, não citam o `legalBase` da tese. Conforme o comentário em `rag-adapter.ts:97-103`, a busca vetorial anterior já havia sido descartada por limiar inatingível. A busca lexical substituta depende de coincidência textual entre o `legalBase` da tese e o conteúdo dos chunks — improvável para portarias estaduais que não reproduzem o CTB. Resultado: `provenanceStatus: 'UNSUPPORTED'` para a maioria das teses, e o check `PROVENANCE_KB` do Quality Gate bloquearia a geração de minuta. **Estado:** não verificado quantitativamente contra produção.

**R-02: Todas as 39 fontes estão sem URL.** `knowledge_sources.url` é NULL/'' para 100% das fontes. O `official_url` vem de `knowledge_document_versions.source_url` (que tem URL para as versões amostradas), mas a fonte oficial de nível superior não é rastreável. Isso enfraquece a proveniência e o check `Boolean(r.official_url)` em `rag-adapter.ts:258`.

### P2 — Alto

**R-03: Serviços RAG do servidor (vetorial/híbrido/rerank) não são usados em produção.** `SearchService`, `RagService`, `VectorStore` existem mas são chamados apenas no legacy Express e workers de agente. O caminho de produção está preso à busca lexical simples.

**R-04: Provedor de embedding é `DETERMINISTIC_LOCAL` (hash-based), não semântico.** Mesmo que a busca vetorial fosse ativada, os embeddings não capturam semântica jurídica. Índice HNSW existe mas os vetores não são semanticamente úteis.

**R-05: Nenhum registro de ingestão (`knowledge_ingestions` vazio).** Não há rastreabilidade de quando/como os documentos entraram, nem mecanismo de reindexação auditável para normas alteradas.

**R-06: Divergência entre fonte e versão na proveniência.** O adapter usa `knowledge_document_versions.source_url` para `official_url`, mas as fontes (`knowledge_sources`) não têm URL. Há risco de inconsistência entre a versão citada e a fonte oficial vigente.

### P3 — Médio

**R-07: `integrityHash` não cobre proveniência jurídica.** O hash valida integridade do conteúdo da minuta e fatos do AIT, mas não registra quais documentos/chunks fundamentaram cada tese.

**R-08: Qualidade Gate depende de recuperação defeituosa.** Se a busca lexical retorna zero resultados ou baixa relevância, `PROVENANCE_KB` falha e bloqueia toda a geração (fail-closed), afetando a experiência do cliente mesmo quando o motor determinístico teria teses válidas.

**R-09: Documentos/versões sem URL verificável em nível de fonte.** Embora as versões amostradas tenham `source_url`, 39/39 fontes não têm URL, impedindo verificação da autoridade oficial.

---

## 6. Arquitetura-Alvo Recomendada

### 6.1 Princípios

- Preservar o motor determinístico (Expert Rule Engine) como autoridade da elegibilidade jurídica. Nunca substituir regras por IA nem deixar a busca semântica decidir sozinha a elegibilidade.
- A recuperação jurídica deve **ancorar** (proveniência), não **decidir** a tese.
- Fail-closed: quando a base não sustentar, não gerar minuta com teses não suportadas; informar lacuna ao usuário.

### 6.2 Componentes

| Componente | Responsabilidade | Implementação |
|------------|------------------|---------------|
| Base jurídica canônica | Versionamento, fonte oficial, vigência, proveniência | Tabelas `knowledge_*` com `effective_from`/`effective_until` já presentes; popular `knowledge_sources.url` e `document_versions.source_url` com URLs oficiais |
| Recuperação jurídica | Ancoragem documental das teses elegíveis | Busca híbrida: lexical (garante correspondência de artigo) + vetorial (apenas quando embeddings forem semânticos); fallback explícito para zero resultados |
| Motor de regras | Elegibilidade, FAIL CLOSED, data gaps | `ExpertRuleEngine` — inalterado |
| Montagem minuta | Parágrafos do `ARGUMENTS_CATALOG`, não da KB | `DocumentAssemblyEngine` — inalterado |
| Quality Gate | Bloqueio de teses sem suporte | `runCanonicalQualityGate` — mantido, com `PROVENANCE_KB` ajustado |
| Observabilidade | Latência, erros, cobertura, qualidade de recuperação | Logs estruturados por `caseId`, `chunk_id`, `provenanceStatus` |

### 6.3 Política de recuperação

1. **Seleção da tese:** exclusiva do Expert Rule Engine (determinístico, por família de infração). A KB não adiciona nem remove teses.
2. **Ancoragem:** para cada tese elegível, buscar chunks que citem o `legalBase` (artigo CTB / número de resolução) da tese.
3. **Critério de relevância:** hit válido requer (a) `content` menciona o dispositivo da tese, (b) `official_url` presente (versão ou fonte), (c) versão vigente na data da infração (`effective_from` ≤ data ≤ `effective_until` ou null).
4. **Zero resultados:** `provenanceStatus = 'UNSUPPORTED'`; tese continua elegível pelo motor, mas o Quality Gate pode bloquear conforme política (`PROVENANCE_KB`). O usuário é informado da falta de fonte verificável.
5. **Erro de conexão / indisponibilidade:** fallback degradado (`fallbackDeterministicAnalysis`) sem fabricação de provenance; marcar `dataGaps` com `RAG_UNAVAILABLE`; não ger minuta com teses não ancoradas se o gate exigir.

### 6.4 Versionamento e reprodução

- Motor: `engineVersion` versionado (`defesai-rule-engine+kb-lexical-v2` no adapter; `2.7.0` no rule engine).
- Corpus: `content_hash` (SHA-256) por versão e chunk; `current_version_id` aponta para a versão vigente.
- Reindexação: idempotente por `content_hash` (já implementado no `IngestionService`); disparar reindexação quando `content_hash` mudar para um documento.

### 6.5 Observabilidade

- Métricas por caso: `ragRetrieval.count`, `provenanceStatus` distribution (SUPPORTED/UNSUPPORTED), latência da busca, erros de conexão, cobertura ( % de teses ancoradas).
- Alertas: taxa de `UNSUPPORTED` acima de limite, erro de conexão ao Supabase, `knowledge_ingestions` sem registros por N dias.

### 6.6 Proteção de dados

- Acesso mínimo necessário: cliente frontend usa Supabase Anon (JWT); backend Worker usa Service Role apenas para leitura de knowledge e casos do usuário.
- Não imprimir dados pessoais (CPF, placa, AIT) em logs de recuperação.
- RLS no Supabase para `cases` (já implementado via `canAccessCase`).

---

## 7. Critérios Objetivos — Pronto para Produção

A integração conhecimento jurídico → minuta será considerada pronta para produção quando:

1. [ ] **Recuperação funcional:** busca retorna chunks que efetivamente citam o `legalBase` de ≥90% das teses elegíveis em casos representativos (métrica `provenanceStatus = 'SUPPORTED'`).
2. [ ] **Fontes com URL:** 100% das `knowledge_sources` ativas usadas na fundamentação têm `url` preenchido e verificável.
3. [ ] **Qualidade Gate não bloqueia falsos positivos:** `PROVENANCE_KB` não reprova casos onde o motor determinístico encontrou teses válidas e a KB possui o documento relevante.
4. [ ] **Fail-closed documentado:** comportamento para zero resultados, baixa relevância, erro de conexão, versão obsoleta e referência conflitante está especificado e testado.
5. [ ] **Embeddings semânticos (opcional):** se a busca vetorial for reativada, provedor deve ser modelo de embeddings semântico (não `DETERMINISTIC_LOCAL`) com dimensão adequada e índice HNSW mantido.
6. [ ] **Ingestão rastreável:** `knowledge_ingestions` com registros de cada carga, `content_hash` correspondente entre documentos e chunks.
7. [ ] **Consistência referencial:** 0 chunks sem embedding, 0 embeddings sem chunk, 0 documentos sem versão válida, 0 versões sem documento.
8. [ ] **Observabilidade:** logs de `provenanceStatus` e latência por caso em produção.
9. [ ] **Não há escrita não autorizada:** nenhuma alteração de código/dados/migração foi feita como parte desta auditoria (conforme limite).

---

## 8. Pendências que Precisam de Investigação Adicional

| # | Pendência | Por que importa |
|---|-----------|-----------------|
| P-01 | Taxa real de `provenanceStatus: 'SUPPORTED'` vs `'UNSUPPORTED'` em casos de produção (executar busca lexical contra os 58 chunks com amostras de teses reais). | Determina se o Quality Gate bloqueia minuta em massa. |
| P-02 | Conteúdo completo dos 58 chunks para verificar se contêm os artigos CTB/resoluções referenciados pelas teses do `ARGUMENTS_CATALOG`. | Valida se a base jurídica persistida tem conteúdo útil para ancoragem. |
| P-03 | Verificar se o `cloudflare/dist/worker.js` implantado em produção está sincronizado com o fonte `cloudflare/worker.js` (datas divergem: fonte 20/10, dist 23/10). | Garante que o código auditado é o que está em produção. |
| P-04 | Confirmar se `knowledge_sources.url` deve ser preenchido (39/39 vazias) e de onde viriam as URLs oficiais. | Afeta a proveniência de nível de fonte. |
| P-05 | Avaliar se a busca vetorial com HNSW + embeddings semânticos agrega valor sobre a busca lexical, dado que os embeddings atuais são `DETERMINISTIC_LOCAL`. | Decide se vale a pena reativar o caminho vetorial. |
| P-06 | Testar o comportamento do Quality Gate quando `ragRetrieval` está vazio ou com erros de conexão. | Valida o fail-closed em condições adversas. |
| P-07 | Verificar se há casos em produção com `defenseDraft` gerado mas com teses `UNSUPPORTED` (o gate teria falhado?). | Detecta possível bypass do gate. |
| P-08 | Revisar as 44 teses não mapeadas e as 9 usadas pelo motor mas não em `LEGAL_THESES_VALIDATION` (citado na auditoria 07-revisao-juridica.md). | Cobertura jurídica completa do catálogo. |

---

**Fim da Parte 1 (contexto, fluxos, evidências, banco, riscos, arquitetura-alvo, critérios, pendências).** O relatório está completo no caminho indicado. Nenhuma alteração foi feita no repositório. Aguardo instruções antes de implementar qualquer correção.
