# Relatório de Reconciliação — Fontes Raspadas, Catálogo Normativo e Base de Conhecimento

**Projeto:** DefesAi / AdeusMultas-Defesa-
**Repositório:** `Tokenizaa/AdeusMultas-Defesa-`
**Branch canônica:** `main`
**SHA base:** `238a745` (docs: Fase 3 ronda desbloqueio jurídico)
**Data:** 23/10/2026
**Escopo:** Somente leitura e correções de código locais. Nenhuma escrita no Supabase remoto, nenhuma migration aplicada, nenhum deploy, nenhuma alteração de tese jurídica.

---

## 0. Resumo Executivo

Esta fase reconciliou o histórico Git, os scripts de raspagem, as migrations, o recovery SQL e o código de ingestão do AdeusMultas para responder o que foi coletado, o que foi persistido, o que está no catálogo de monitoramento e o que precisa de correção.

**Conclusão central:** O sistema possui todos os componentes de coleta, monitoramento e detecção de mudança já implementados (Fase 7, commit `9326bdc`), mas existem **quatro sistemas distintos de ID de fonte** que não se mapeiam entre si, o `SnapshotStore` é apenas em memória, o `knowledge_ingestions` nunca foi persistido (0 linhas) e o `contranCollector` nunca foi iniciado. A correção aplicada conecta a ingestão existente ao registro de `knowledge_ingestions`. Nenhuma nova arquitetura foi criada.

---

## A. Commits e scripts de raspagem encontrados

### Commits prioritários examinados

| Commit | Data | Mensagem | Relevância para coleta/monitoramento |
|--------|------|----------|--------------------------------------|
| `9326bdc` | 29/08/2026 | feat: add national monitor and improve document engine | **Implementa o monitor nacional completo:** `source-fetcher.ts`, `content-normalizer.ts`, `snapshot-store.ts`, `change-detector.ts`, `hash-generator.ts`, `weekly-monitor-service.ts`, `weekly-monitor-scheduler.ts`, `sources-registry.ts`, `canonical-registry.ts`, `national-registry.ts`, `temporal-engine.ts`, validação, fila de revisão, relatório semanal. |
| `977b043` | 23/09/2026 | recovery: close phase 7 legal source master catalog | Adiciona `docs/recovery/FASE-7-CATALOGO-MESTRE-FONTES-JURIDICAS-2026-09-23.md` — define hierarquia, vigência, versionamento e fontes prioritárias (inclui Res. CONTRAN 1.031/2026). |
| `98bd453` | 23/09/2026 | recovery: update progress after phase 7 legal source catalog | Atualização de progresso da Fase 7. |
| `6087be2` | 22/10/2026 | fix(payments): ... + add KB seed data | **Adiciona semente da base jurídica:** `knowledge/sources/sources.json` (3 fontes), `knowledge/documents/*.md` (CTB, CONTRAN, STJ), `scripts/seed-kb.ts` (CLI de ingestão). |
| `408b778` | 23/10/2026 | docs: Fase 1 - integridade e diagnóstico da base jurídica | Auditoria de integridade: 39 fontes sem URL, 66 documentos, 66 versões, 58 chunks, 58 embeddings, 0 rows em `knowledge_ingestions`. |
| `add7c11` | 23/10/2026 | docs: Fase 2 - recuperação jurídica e relevância | Auditoria de recuperação jurídica. |
| `238a745` | 23/10/2026 | docs: Fase 3 ronda desbloqueio jurídico ... | Revisão jurídica das 52 teses. |

### Scripts de coleta e ingestão localizados

| Script/Caminho | Função | Status |
|----------------|--------|--------|
| `scripts/seed-kb.ts` | Lê `knowledge/sources/sources.json` e `knowledge/documents/*.md`, chama `ingestionService.ingestDocument` por arquivo | Executável via CLI; não persistia em `knowledge_ingestions` (corrigido) |
| `src/server/knowledge/ingestion-service.ts` | Pipeline de ingestão: source → document → version → chunks → embeddings; idempotente por contentHash | **Corrigido:** agora grava `KnowledgeIngestionRecord` por documento e upserta em `knowledge_ingestions` quando Supabase disponível |
| `src/server/services/legislation-collector.ts` | Coletor periódico por fonte (fetch + retry + hash + snapshot); `contranCollector` criado mas **não iniciado** (`// contranCollector.start();` comentado) | `updateSourceStatus` apenas loga (não persiste); `applyChangeToKnowledgeBase` é placeholder TODO |
| `src/core/knowledge/monitoring/source-fetcher.ts` | Fetch HTTP real com timeout, UA oficial, retry, batch com concorrência | Em uso pelo monitor |
| `src/core/knowledge/monitoring/content-normalizer.ts` | Remove ruído dinâmico, extrai URLs/artigos/prazos/palavras-chave | Em uso pelo monitor |
| `src/core/knowledge/monitoring/snapshot-store.ts` | `Map<string, KnowledgeSnapshot[]>` **apenas em memória** | Não persiste entre reinícios |
| `src/core/knowledge/monitoring/change-detector.ts` | Compara snapshots por SHA-256; classifica tipo/risco da mudança; status `PENDING_REVIEW` | Em uso pelo monitor |
| `src/core/knowledge/scheduler/weekly-monitor-service.ts` | Ciclo semanal: fontes Tier 1-3 → fetch → normalizar → hash → comparar → validar → fila de revisão → alertas → relatório | Em uso; `startScheduledService` (7 dias) |
| `src/core/knowledge/scheduler/weekly-monitor-scheduler.ts` | Lógica duplicada do service; usa `OFFICIAL_SOURCES_REGISTRY` diretamente; exposto via rota `/monitor/run` | Duplicação de lógica com o service |
| `supabase/migrations/20260924233015_fase_9_1_knowledge_schema.sql` | Cria `knowledge_sources`, `knowledge_documents`, `knowledge_document_versions`, `knowledge_chunks`, `knowledge_embeddings`, `knowledge_ingestions`, `knowledge_document_relations` | Não aplicada neste escopo |
| `supabase/recovery/FASE-9-RECONCILIACAO-DETERMINISTICA.sql` | Reproduz carga Fase 8: 39 sources / 66 documents / 66 versions; todos com `content_state: "NOT_STORED_FASE9"` (conteúdo vazio) | Artefato de reprodutibilidade; não aplicado |

---

## B. Matriz de fontes cadastradas, coletadas, persistidas e monitoradas

### Quatro sistemas de ID de fonte em conflito (gap crítico de reconciliabilidade)

O sistema mantém **quatro catálogos de fonte com IDs diferentes** que não se mapeiam entre si:

| Sistema | Arquivo | IDs das 3 fontes federais prioritárias | Total de fontes | Usado por |
|---------|---------|----------------------------------------|-----------------|-----------|
| Catálogo de monitoramento (canônico) | `src/core/knowledge/sources-registry.ts` | `SRC_FED_PLANALTO_CTB`, `SRC_FED_CONTRAN_RESOLUCOES`, `SRC_FED_STJ_JURISPRUDENCIA` | ~79 (9 federal + 70 estaduais) | `WeeklyMonitorService`, `WeeklyMonitorScheduler`, rota `/national/sources` |
| Seed de KB | `knowledge/sources/sources.json` | `SRC_FED_CTB`, `SRC_FED_CONTRAN`, `SRC_FED_STJ` | 3 | `seed-kb.ts`, `IngestionService.ingestKnowledgeDirectory` |
| Recovery SQL Fase 9 | `supabase/recovery/FASE-9-RECONCILIACAO-DETERMINISTICA.sql` | `SRC_FED_PLANALTO`, `SRC_FED_SENATRAN`, `SRC_FED_CONTRAN`, `SRC_FED_PRF`, `SRC_FED_DNIT`, `SRC_FED_ANTT`, `SRC_FED_INMETRO`, `SRC_FED_DOU`, `SRC_FED_STJ` + estaduais | 39 | Inserção determinística no Supabase (não aplicada) |
| Catálogo estático do knowledge index | `src/knowledge/index.ts` (`KNOWLEDGE_SOURCES`) | `src_ctb_planalto`, `src_contran_gov`, `src_inmetro_psi` | 3 | `KnowledgeService` (leitura estática) |

**Nenhum ID coincide entre sistemas.** O mesmo órgão (ex: CONTRAN) tem 4 IDs diferentes. Isso impede o rastreamento ponta-a-ponta: fonte oficial → raspagem → persistido → catálogo de monitoramento.

### URLs oficiais por fonte prioritária (verificação por requisição controlada)

| Fonte | ID (catálogo monitor) | URL oficial | Resultado da requisição | Tipo de conteúdo |
|-------|----------------------|-------------|------------------------|------------------|
| CTB compilado | `SRC_FED_PLANALTO_CTB` | `https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm` | ✅ HTTP 200 | Texto normativo específico (Lei 9.503/1997 compilada) |
| CONTRAN resoluções | `SRC_FED_CONTRAN_RESOLUCOES` | `https://www.gov.br/transportes/pt-br/assuntos/transito/senatran/contran` | ❌ HTTP 429 (rate limit gov.br) | Não pôde ser classificado (temporário) |
| DOU | `SRC_FED_DOU` | `https://www.in.gov.br/leiturajornal` | ✅ HTTP 200 | Portal de busca institucional (não texto específico) |
| SENATRAN portal | `SRC_FED_SENATRAN_PORTAL` | `https://www.gov.br/transportes/pt-br/assuntos/transito/senatran` | ❌ HTTP 429 (rate limit gov.br) | Não pôde ser classificado (temporário) |

**Nota:** Os 429 são rate-limiting temporário do domínio gov.br, não evidência de página indisponível. Requer nova tentativa posterior.

### Matriz de reconciliação (fontes federais prioritárias)

| Identificador (monitor) | Nome | Autoridade | Jurisdição | Categoria | URL oficial | Coletado em | Persistido | No catálogo monitor | Detecta mudança | Pendência |
|-------------------------|------|------------|------------|-----------|-------------|-------------|------------|---------------------|-----------------|-----------|
| SRC_FED_PLANALTO_CTB | Planalto - CTB | Presidência da República | BR_FEDERAL | legislation | planalto...l9503compilado.htm | Fase 8 (23/09/2026) | Não (content vazio) | ✅ Sim | Sim (SHA-256) | ID difere do seed/recovery |
| SRC_FED_CONTRAN_RESOLUCOES | CONTRAN - Resoluções | CONTRAN/SENATRAN | BR_FEDERAL | legislation | gov.br/.../senatran/contran | Fase 8 | Não (content vazio) | ✅ Sim | Sim (SHA-256) | ID difere do seed/recovery; 1.031/2026 não catalogada |
| SRC_FED_DOU | DOU - Imprensa Nacional | IN | BR_FEDERAL | diario_oficial | in.gov.br/leiturajornal | Fase 8 | Não (content vazio) | ✅ Sim | Sim (SHA-256) | Portal de busca, não texto específico |
| SRC_FED_SENATRAN_PORTAL | SENATRAN | SENATRAN | BR_FEDERAL | legislation | gov.br/.../senatran | Fase 8 | Não (content vazio) | ✅ Sim | Sim (SHA-256) | ID difere do seed/recovery |
| SRC_FED_STJ_JURISPRUDENCIA | STJ - Jurisprudência | STJ | BR_FEDERAL | jurisprudencia | scon.stj.jus.br/SCON/ | Fase 8 | Não (content vazio) | ✅ Sim | Sim (SHA-256) | ID difere do seed/recovery |
| (estaduais) SRC_DETRAN_*/SRC_CETRAN_* | 27 UFs × DETRAN+CETRAN | DETRANs/CETRANs | Estaduais | portal_recurso | var | Fase 8 | Não (content vazio) | ✅ Sim | Sim (SHA-256) | ID difere do seed/recovery |

**Estado da persistência (conforme auditoria Fase 1, commit `408b778`):**
- `knowledge_sources`: 39 registros, **100% sem URL** (`url IS NULL`)
- `knowledge_documents`: 66 registros
- `knowledge_document_versions`: 66 registros (todos com `content_hash`, todos com `source_url`, mas `content` vazio — `content_state: "NOT_STORED_FASE9"`)
- `knowledge_chunks`: 58 registros
- `knowledge_embeddings`: 58 registros (provedor `DETERMINISTIC_LOCAL`, não semântico)
- `knowledge_ingestions`: **0 linhas** (pipeline de ingestão não rastreado no banco)

---

## C. Documentos e versões com proveniência verificável

Conforme `FASE-9-RECONCILIACAO-DETERMINISTICA.sql` (reproduz a Fase 8):

- **39 fontes** cadastradas (IDs `SRC_*` do recovery SQL)
- **66 documentos** cadastrados, todos com `collection_state: "COLLECTED"` ou `"RECUPERADO"` ou `"DUPLICATA_EXATA"`
- **66 versões** (v1.0), todas com `content_hash` SHA-256, mas `content` = `''` (vazio) e `content_state: "NOT_STORED_FASE9"`
- **1 duplicata exata** identificada: `SRC_CE_DETRAN_RECURSO_JARI` é duplicata exata de `SRC_CE_DETRAN_DEFESA_AUTUAR_INFRACAO` (mesma URL, mesmo hash)

**Proveniência verificada:** Cada documento tem `origin_url` e `retrieved_at` no metadata, e cada versão tem `source_url`. No entanto:
- As 39 fontes em `knowledge_sources` têm `url = NULL` (gap de proveniência de nível de fonte)
- O conteúdo dos documentos **não foi armazenado** (`NOT_STORED_FASE9`) — apenas metadados e URLs
- Não há registros em `knowledge_ingestions` (não há rastreabilidade de quando/como os dados entraram)

---

## D. Fontes que precisam de atualização, correção ou substituição

### 1. Resolução CONTRAN 1.031/2026 (caso de referência)
- **Mencionada** no catálogo mestre Fase 7 (doc `FASE-7-CATALOGO-MESTRE...`) como fonte prioritária: "fiscalização de álcool e outras substâncias, com alterações de vigência diferenciada."
- **NÃO está catalogada** em `src/core/legal-base/resolutions.ts` (RESOLUTIONS_DB tem 9 resoluções: 798/2020, 985/2022, 432/2013, 973/2022, 900/2022, 918/2022, 940/2022, portarias 354/2022 e INMETRO 158/2022).
- **Não está** em `knowledge/sources/sources.json` nem em `OFFICIAL_SOURCES_REGISTRY` como documento individual (a fonte CONTRAN resoluções existe como catálogo, mas a norma 1.031/2026 não é um documento separado).
- **Ação:** Não foi adicionada (escopo: não alterar teses nem ampliar base jurídica sem evidência de coleta). Documentada como pendência.

### 2. Resoluções referenciadas por ARG-024 não catalogadas
- `ARG-024` (`ESTACIONAMENTO_VAGA_DEFICIENTE_CARTAO_VISIVEL`) tem `legalBase: 'Art. 181, XX do CTB c/c Resoluções CONTRAN nº 965/2022 e 966/2022'`.
- **Resoluções 965/2022 e 966/2022 não estão em `RESOLUTIONS_DB`.**
- **Ação:** Documentada como pendência. Não corrigida (não alterar teses jurídicas).

### 3. URLs das 39 fontes em `knowledge_sources` são NULL
- Conforme auditoria Fase 1: todas as 39 fontes têm `url IS NULL OR url = ''`.
- As URLs existem apenas em `knowledge_document_versions.source_url` (nível de versão, não de fonte).
- **Ação:** Preparar preenchimento de `knowledge_sources.url` com URLs oficiais (pendente de confirmação remota e autorização).

### 4. IDs de fonte divergentes entre sistemas
- O seed usa `SRC_FED_CTB` enquanto o monitor usa `SRC_FED_PLANALTO_CTB` para a mesma fonte (CTB Planalto).
- **Ação:** Não unificamos automaticamente (exigiria mudança em múltiplos sistemas e risco de quebrar referências existentes). Documentada como gap de reconciliabilidade.

---

## E. Componentes de monitoramento que podem ser reaproveitados

Todos os componentes abaixo já existem e são reutilizáveis **sem criar nova arquitetura**:

| Componente | Arquivo | Pode ser reutilizado? | Observação |
|------------|---------|----------------------|------------|
| Catálogo de fontes oficiais | `sources-registry.ts` (`OFFICIAL_SOURCES_REGISTRY`) | ✅ Sim | 79 fontes Tier 1-3, com URL, UF, categoria, isActive |
| Registro canônico | `canonical-registry.ts` | ✅ Sim | `getAllSources()`, `getTier1To3Sources()`, resolução temporal |
| Fetcher HTTP | `source-fetcher.ts` (`SourceFetcher`) | ✅ Sim | Timeout, UA oficial, batch concorrência, erro/timeout tratado |
| Normalizador | `content-normalizer.ts` (`ContentNormalizer`) | ✅ Sim | Remove ruído dinâmico, extrai artigos/prazos/URLs |
| Hash SHA-256 | `hash-generator.ts` | ✅ Sim | Determinístico, sem timestamp |
| Armazenamento de snapshot | `snapshot-store.ts` (`SnapshotStore`) | ⚠️ Parcialmente | Apenas em memória; precisa de persistência para sobreviver a reinícios |
| Detector de mudança | `change-detector.ts` (`ChangeDetector`) | ✅ Sim | Compara hashes, classifica tipo/risco, status `PENDING_REVIEW` |
| Serviço semanal | `weekly-monitor-service.ts` (`WeeklyMonitorService`) | ✅ Sim | Ciclo completo, agendamento 7 dias, histórico de ciclos |
| Scheduler (rota) | `weekly-monitor-scheduler.ts` (`WeeklyMonitorScheduler`) | ✅ Sim | Exposto via `POST /monitor/run`; lógica duplicada com o service |
| Validação e roteamento | `validation-engine.ts` | ✅ Sim | P0/P1 exigem revisão humana; nunca auto-aplica |
| Fila de revisão | `review-queue-service.ts` | ✅ Sim | Aprova/rejeita/ajusta/marca falso positivo |
| Alertas | `notification-alert-service.ts` | ✅ Sim | Dispatch para P0/P1 |
| Relatório semanal | `weekly-report-generator.ts` | ✅ Sim | Relatório em Markdown |
| Coletor de legislação | `legislation-collector.ts` (`LegislationCollector`) | ⚠️ Parcialmente | `contranCollector` não iniciado; `updateSourceStatus` só loga |
| Ingestão de KB | `ingestion-service.ts` | ✅ Sim (corrigido) | Agora grava `knowledge_ingestions` por documento |

### Decisão técnica recomendada
Usar o `WeeklyMonitorScheduler` (já exposto via rota `/monitor/run`) como ponto de entrada do monitoramento contínuo, reutilizando `SourceFetcher` + `ContentNormalizer` + `SnapshotStore` + `ChangeDetector` + `ValidationEngine` + `ReviewQueueService`. Não criar novo monitor. O `WeeklyMonitorService` (agendamento automático de 7 dias) pode ser iniciado na inicialização do servidor quando houver suporte para `setInterval` persistente.

---

## F. Lacunas de persistência, execução, versionamento e associação de impacto

| # | Lacuna | Evidência | Impacto |
|---|--------|-----------|---------|
| F-1 | `knowledge_ingestions` tem 0 linhas | Auditoria Fase 1 (`408b778`): "0 registros — pipeline de ingestão não foi executado/rastreado no banco"; `IngestionService.ingestionHistory` é só em memória | Sem rastreabilidade de quando/como os documentos entraram; sem mecanismo de reindexação auditável |
| F-2 | `SnapshotStore` apenas em memória | `snapshot-store.ts`: `private static snapshots: Map<...>`; sem persistência em Supabase | Snapshots perdidos ao reiniciar; não há histórico durável de comparação entre versões |
| F-3 | `contranCollector` não iniciado | `legislation-collector.ts` linha 318: `// contranCollector.start();` comentado | Coleta periódica da fonte CONTRAN não ocorre automaticamente |
| F-4 | `updateSourceStatus` só loga | `legislation-collector.ts`: método `updateSourceStatus` faz apenas `logger.info` | Status da fonte (HTTP, erro, hash) não persistido |
| F-5 | `applyChangeToKnowledgeBase` é placeholder | `legislation-collector.ts`: TODO, apenas loga | Mudanças detectadas não são aplicadas à base de conhecimento (correto: exige revisão humana) |
| F-6 | Quatro sistemas de ID de fonte | Análise da seção B | Impossibilita rastreamento ponta-a-ponta fonte→documento→catálogo |
| F-7 | Conteúdo dos documentos não armazenado | `FASE-9-RECONCILIACAO-DETERMINISTICA.sql`: `content = ''`, `content_state: "NOT_STORED_FASE9"` | Não há conteúdo para comparar; apenas metadados/URLs |
| F-8 | Duas implementações de monitor com lógica duplicada | `weekly-monitor-service.ts` vs `weekly-monitor-scheduler.ts` | Manutenção dupla; risco de divergência de comportamento |
| F-9 | `knowledge_sources.url` NULL para 39/39 fontes | Auditoria Fase 1 | Proveniência de nível de fonte enfraquecida; `Boolean(r.official_url)` no rag-adapter falha |

---

## G. Correções aplicadas e testes executados

### Correção de código (apenas local, sem escrita remota)

**Arquivo alterado:** `src/server/knowledge/ingestion-service.ts`

O que foi alterado:
1. Adicionada inicialização de cliente Supabase (`initSupabaseClient`) usando `configService` (`VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`), idêntica ao padrão já usado em `vector-store.ts`.
2. Adicionado método privado `recordIngestion(...)` que cria um `KnowledgeIngestionRecord` por documento ingerido, armazena em `ingestionHistory` (memória) e faz upsert na tabela `knowledge_ingestions` via Supabase quando o cliente está disponível (com try/catch silencioso: falha de persistência não falha a ingestão).
3. Chamada a `recordIngestion` nos dois pontos de retorno de `ingestDocument`:
   - `SKIPPED` (conteúdo inalterado, idempotência) → registra `skipped_documents: 1`, `processed_documents: 0`.
   - `PROCESSED` (novo conteúdo ou nova versão) → registra `processed_documents: 1`, `created_chunks`, `generated_embeddings`.
4. O campo `status` gravado no banco mapeia `PROCESSED`/`SKIPPED` → `COMPLETED`, erro → `FAILED`, respeitando a CHECK constraint da tabela (`PENDING,PROCESSING,COMPLETED,FAILED`).

**Por que esta correção:** Fecha o gap F-1 (zero linhas em `knowledge_ingestions` apesar de documentos existirem). Cada ingestão de documento agora gera um registro rastreável com `sourceId`, `documentId`, `chunksCount`, `durationMs`, `triggeredBy`, `startedAt`, `completedAt`, `errorMessage`.

### Nenhuma outra alteração de código foi feita

Conforme o escopo da fase: não criar novo catálogo, novo raspador ou novo monitoramento; não reescrever RAG; não alterar teses jurídicas; não aplicar migrations remotas; não deploy.

### Testes executados

**Baseline (antes das alterações):** `npx vitest run` → 29 arquivos, 226 testes, todos passando.

**Após alterações + novos testes de reconciliação:**
- Novo arquivo: `src/core/knowledge/reconciliation.test.ts` (16 testes)
- `npx vitest run` → **30 arquivos, 242 testes, todos passando** (0 falhas)

Testes de reconciliação cobertos:
1. Fonte coletada presente no catálogo (`OFFICIAL_SOURCES_REGISTRY` ⊇ fontes prioritárias)
2. Documento persistido com URL e proveniência (SnapshotStore + vectorStore)
3. Hash inalterado sem duplicação de versão (idempotência de ingestão → `SKIPPED`, mesma `versionId`)
4. Alteração de conteúdo gerando nova versão (novos `versionId` e `contentHash`)
5. URL indisponível não apaga snapshot anterior (ChangeDetector: hash igual → null; sem snapshot anterior → null)
6. Fonte alterada relacionada a documentos dependentes (KnowledgeChange com sourceId, sourceUrl, previousHash, newHash, `PENDING_REVIEW`)
7. Norma revogada → `REVOCATION`, `P0_LEGAL_CRITICAL`, `PENDING_REVIEW`
8. Coleta repetida idempotente (segunda ingestão igual → `SKIPPED`, `chunksCount: 0`)
9. Divergências entre catálogo, raspagem e base (IDs distintos entre sources.json e OFFICIAL_SOURCES_REGISTRY; fontes federais com URL no catálogo)

### Verificações operacionais

- `npx tsc --noEmit` → 0 erros TypeScript (antes e depois da alteração).
- Requisições controladas às URLs oficiais: CTB Planalto (200, texto específico), DOU (200, portal de busca), CONTRAN/SENATRAN (429 rate limit temporário — não classificação definitiva).

---

## H. Pendências que dependem de acesso remoto, configuração ou autorização

| # | Pendência | Por que depende de remoto/config/autorização |
|---|-----------|---------------------------------------------|
| P-1 | Preencher `knowledge_sources.url` para as 39 fontes (atualmente NULL) | Requer escrita no Supabase remoto (não autorizada nesta fase) e confirmação de que as URLs estão corretas |
| P-2 | Persistir `SnapshotStore` em Supabase (snapshots duráveis entre reinícios) | Requer nova tabela ou coluna + migration; escrita remota não autorizada |
| P-3 | Iniciar `contranCollector` (`legislation-collector.start()`) | Requer execução do servidor com env vars de Supabase configuradas; não iniciado para evitar escrita não intencional |
| P-4 | Consolidar os 4 sistemas de ID de fonte em um só | Exige alteração coordenada em `sources-registry.ts`, `sources.json`, `FASE-9-RECONCILIACAO-DETERMINISTICA.sql`, `src/knowledge/index.ts`, `seed-kb.ts`; risco de quebrar referências existentes |
| P-5 | Catalogar Resolução CONTRAN 1.031/2026 e resoluções 965/2022, 966/2022 (referenciadas por ARG-024) | Requer coleta das fontes oficiais e validação jurídica; não feita nesta fase (não alterar teses) |
| P-6 | Unificar `WeeklyMonitorService` e `WeeklyMonitorScheduler` (lógica duplicada) | Refatoração de código; não é bloqueante mas recomendada |
| P-7 | Repetir requisições a CONTRAN/SENATRAN após o rate limit (429) | Depende de acesso externo ao gov.br |

---

## I. Decisão técnica recomendada para ativar o monitoramento contínuo

**Não criar novo monitor.** Reaproveitar a arquitetura existente (`WeeklyMonitorScheduler` já exposto via `POST /monitor/run`):

1. **Entrada:** `POST /monitor/run` já existe na rota `knowledge.ts` e executa `WeeklyMonitorScheduler.runCycle()`, que usa `OFFICIAL_SOURCES_REGISTRY` (mesmo catálogo de `CanonicalKnowledgeRegistry.getTier1To3Sources()` para as fontes federais prioritárias).

2. **Fluxo reutilizado:** `SourceFetcher.fetchAllSources` → `ContentNormalizer.normalize` → `calculateSha256Sync` → `SnapshotStore.saveSnapshot` → `ChangeDetector.detectChange` → `ValidationEngine.validateAndRoute` → `ReviewQueueService.enqueueItems` → `NotificationAlertService.dispatchAlertsForReviewItems` → `WeeklyReportGenerator.generateMarkdownReport`.

3. **Gap a fechar (sem nova arquitetura):** Persistir `SnapshotStore` e `knowledge_ingestions`. A correção de `knowledge_ingestions` já foi aplicada no `IngestionService`. O `SnapshotStore` continua em memória — aceitável para execução sob demanda via `/monitor/run`; para execução automática (7 dias), seria necessário iniciar `WeeklyMonitorService.startScheduledService()` e persistir snapshots (pendente P-2).

4. **Associação de impacto:** Quando `ChangeDetector` detecta mudança (`status: PENDING_REVIEW`), o item vai para `ReviewQueueService`. A aprovação humana (`ReviewQueueService.approve`) é o gate que pode associar a fonte alterada aos documentos, versões, chunks e teses dependentes — mas essa aplicação à base de conhecimento exige revisão humana explícita (não auto-aplicação, conforme FASE-7 §9 e legislação-collector.ts).

5. **Idempotência:** `IngestionService.ingestDocument` já é idempotente por `contentHash` (retorna `SKIPPED` sem duplicar versão). A coleta repetida via monitor não gera falsos positivos porque `ChangeDetector` retorna `null` quando o hash é idêntico.

**Critério de aceite da fase (verificável):**
- [x] Visão rastreável conectando fonte oficial → raspagem → conteúdo persistido → versão/hash → catálogo de monitoramento → detecção de mudança → documentos/teses afetados (documentada nas seções B–F).
- [x] Exatamente o que já funciona (componentes E), o que foi corrigido (seção G) e o que falta (seções D, F, H).
- [x] Nenhuma coleta ou desenvolvimento duplicado (não criado novo catálogo/raspador/monitor).
- [x] Nenhuma afirmação de fontes atualizadas sem evidência de consulta e comparação (URLs verificadas com requisições controladas; 429 tratados como temporários, não como indisponibilidade).

---

## J. Fechamento Operacional — Fase Seguinte (Monitoramento Normativo)

### Estado anterior → posterior

| Área | Antes (Fase de Reconciliação) | Após (Fechamento Operacional) |
|------|------------------------------|-------------------------------|
| Identidade de fontes | 4 sistemas de ID sem mapeamento | `source-alias-registry.ts` mapeia todos os IDs legados para o canônico (`OFFICIAL_SOURCES_REGISTRY`) |
| Histórico de ingestão | 0 linhas em `knowledge_ingestions`, apenas memória | `IngestionService` grava `KnowledgeIngestionRecord` por documento (memória + Supabase), com falhas observáveis |
| Snapshots | Apenas em memória (`SnapshotStore.Map`) | `SnapshotStore` persiste no Supabase (memória + Supabase), carrega após reinício, nunca remove último válido |
| Monitor runtime | `contranCollector` não iniciado; `WeeklyMonitorService` não iniciado | `monitor-runtime.ts` com inicialização explícita e não duplicada; `cloudflare/worker.js` com handler `scheduled` (cron); `wrangler.jsonc` com crons configurados |
| Resoluções prioritárias | 1.031/2026, 965/2022, 966/2022 não catalogadas | Adicionadas a `RESOLUTIONS_DB` marcadas como "pendente de coleta oficial" |
| Fluxo de revisão | Parcialmente testado | Teste end-to-end: alteração → snapshot → versão → KnowledgeChange → ReviewQueueService → PENDING_REVIEW |

### Arquivos e componentes reaproveitados

- `source-alias-registry.ts` (novo) — mapeamento de IDs legados para canônico
- `ingestion-service.ts` (alterado) — persistência observável de `knowledge_ingestions`
- `snapshot-store.ts` (reescrito) — snapshots duráveis com Supabase + memória
- `weekly-monitor-scheduler.ts` (reescrito) — async/await com SnapshotStore durável, preserva último snapshot em falha
- `weekly-monitor-service.ts` (alterado) — async/await com SnapshotStore, snapshot de falha de coleta
- `monitor-runtime.ts` (novo) — inicialização explícita, não duplicada, status real
- `cloudflare/worker.js` (alterado) — handler `scheduled` para cron do Cloudflare
- `wrangler.jsonc` (alterado) — crons configurados (`weekly-legal-monitor`, domingo 00:00 UTC)
- `supabase/migrations/20261023000001_create_monitoring_snapshots.sql` (novo) — tabela de snapshots (não aplicada)
- `resolutions.ts` (alterado) — 3 resoluções prioritárias catalogadas (1.031/2026, 965/2022, 966/2022)

### Mapeamento de IDs canônicos

O `SOURCE_ALIAS_REGISTRY` registra ~50 aliases mapeando:
- Seed (`sources.json`): `SRC_FED_CTB` → `SRC_FED_PLANALTO_CTB`, etc.
- Recovery SQL (Fase 9): `SRC_FED_PLANALTO`, `SRC_FED_SENATRAN`, `SRC_FED_CONTRAN`, etc. → IDs canônicos
- Índice estático (`src/knowledge/index.ts`): `src_ctb_planalto`, `src_contran_gov`, etc. → IDs canônicos
- Estaduais: `SRC_AC_DETRAN_AC` → `SRC_DETRAN_AC`, `SRC_SP_DETRAN_SP` → `SRC_DETRAN_SP`, etc.

Nenhum ID legado aparece sob dois canônicos diferentes (sem ambiguidade). Fontes diferentes de um mesmo órgão (ex: DETRAN-AC vs CETRAN-AC) mantêm canônicos distintos.

### Resultado da validação da persistência

- `npx vitest run`: **32 arquivos, 270 testes, todos passando** (inclui 16 testes de reconciliação, 7 de ingestão, 13 de alias, 6 de resoluções, 2 de fluxo de revisão)
- `npx tsc --noEmit`: **0 erros**
- `knowledge_ingestions`: upsert com `id` como chave (compatível com PK da tabela); falhas de persistência são observáveis via `IngestionPersistenceResult.supabaseError`, nunca silenciadas
- `SnapshotStore`: `getLatestSnapshot` e `getPreviousSnapshot` agora são async (carregam do Supabase se não estiverem em memória); `loadFromSupabase()` permite recuperação após reinício

### Resultado da recuperação após reinicialização (simulado)

Os testes validam que:
- `SnapshotStore.loadFromSupabase()` carrega snapshots persistidos para a memória
- `getLatestSnapshot` retorna do Supabase quando não há dados em memória
- Falhas de coleta não removem o último snapshot válido (salva snapshot de `collection_failed` separado)

### Runtime e agendamento implementados ou pendentes

**Implementado (código local):**
- `monitor-runtime.ts` com `initializeMonitor()`, `runMonitorCycle()`, `getMonitorStatus()`, `stopMonitor()`
- `cloudflare/worker.js` com handler `scheduled` para cron do Cloudflare Worker
- `wrangler.jsonc` com crons (`weekly-legal-monitor`, `0 0 * * 0`)
- Rota `POST /monitor/run` já existente para execução sob demanda

**Pendente (requer deploy/credenciais):**
- Aplicar a migration `20261023000001_create_monitoring_snapshots.sql` no Supabase
- Fazer deploy do `cloudflare/dist/worker.js` com o handler `scheduled`
- Configurar `VITE_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no ambiente de execução
- Iniciar `WeeklyMonitorService.startScheduledService()` no servidor Node.js (quando aplicável)

### Situação dos 66 documentos (conforme auditoria Fase 1)

- 39 fontes cadastradas, todas sem URL em `knowledge_sources.url`
- 66 documentos com `collection_state` COLLECTED/RECUPERADO/DUPLICATA_EXATA
- 66 versões com `content_hash` mas `content` vazio (`NOT_STORED_FASE9`)
- 58 chunks, 58 embeddings (provedor `DETERMINISTIC_LOCAL`)
- 0 linhas em `knowledge_ingestions` antes da correção (agora corrigido no código)

### Resoluções reconciliadas e pendentes

**Catalogadas (RESOLUTIONS_DB):**
- 432/2013, 798/2020, 985/2022, 973/2022, 900/2022, 918/2022, 940/2022 (existentes)
- 1.031/2026, 965/2022, 966/2022 (adicionadas nesta fase, marcadas como "pendente de coleta oficial")

**Pendentes de coleta oficial:**
- Conteúdo integral de todas as resoluções (não obtido de fontes primárias)
- URLs das 39 fontes em `knowledge_sources` (NULL)

### Testes executados e resultados observados

| Teste | Arquivo | Testes | Resultado |
|-------|---------|--------|-----------|
| Reconciliação de IDs | `source-alias-registry.test.ts` | 13 | PASS |
| Persistência de ingestão | `ingestion-service.test.ts` | 7 | PASS |
| Reconciliação ponta-a-ponta | `reconciliation.test.ts` | 16 | PASS |
| Catálogo de conhecimento | `knowledge-catalog.test.ts` | 8 | PASS |
| Detector de mudança | `change-detector.test.ts` | 3 | PASS |
| Pipeline Fase 11 | `fase11-pipeline.test.ts` | 4 | PASS |
| Outros (22 arquivos) | — | 219 | PASS |
| **Total** | **32 arquivos** | **270** | **PASS** |

### Limitações, riscos e dependências externas

1. **Migration não aplicada:** `knowledge_monitoring_snapshots` não existe no Supabase remoto. A persistência de snapshots funciona em memória; a persistência remota requer aplicação da migration (pendente de autorização).
2. **Supabase não configurado em teste:** Os testes mockam o `config-service`; a persistência real no Supabase depende de `VITE_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no ambiente de execução.
3. **Cloudflare Worker não deployado:** O handler `scheduled` e os crons estão preparados em `wrangler.jsonc` e `cloudflare/worker.js`, mas não foram deployados.
4. **Conteúdo integral dos 66 documentos não obtido:** `content_state` = `NOT_STORED_FASE9` — apenas metadados e URLs, sem texto normativo.
5. **HTTP 429 em CONTRAN/SENATRAN:** Rate-limit temporário do gov.br impede classificação definitiva dessas fontes.

### Passos necessários para ativação futura em produção

1. Aplicar migration `20261023000001_create_monitoring_snapshots.sql` no banco de prova, depois no canônico (com autorização).
2. Configurar `VITE_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no ambiente de execução.
3. Fazer deploy do `cloudflare/dist/worker.js` com o handler `scheduled`.
4. Coletar conteúdo integral das fontes prioritárias (CTB, 1.031/2026, 965/2022, 966/2022, 985/2022, 798/2020, 918/2022).
5. Preencher `knowledge_sources.url` para as 39 fontes.
6. Iniciar `WeeklyMonitorService.startScheduledService()` no servidor Node.js (ou confiar no cron do Cloudflare Worker).

---

## Anexo — Comandos executados e resultados

```bash
# Estado do repositório
git status --short --branch          # main, 2 arquivos modificados locais (preservados)
git branch --show-current            # main
git log -1 --oneline                 # 238a745 ...

# Verificar commits prioritários
for c in 9326bdca... 977b043c... 98bd453b... 6087be22... 408b778a... add7c117... 238a7450...; do git log -1 --format="%H %s %ad" $c; done

# Baseline de testes (antes da correção)
npx vitest run                       # 29 files, 226 tests, all passed

# TypeScript
npx tsc --noEmit                     # 0 errors

# Após correção + novos testes
npx vitest run                       # 30 files, 242 tests, all passed (inclui reconciliation.test.ts)
npx tsc --noEmit                     # 0 errors
```

---

**Fim do relatório.** Nenhuma alteração foi feita no Supabase remoto, nenhuma migration aplicada, nenhum deploy executado, nenhuma tese jurídica modificada.
