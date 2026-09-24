# FASE 9 — Especificação Definitiva da Normalização Jurídica

**Data:** 2026-09-24 | **Natureza:** auditoria + especificação técnica da Fase 9 — implementação NÃO iniciada, RAG NÃO iniciado, Supabase SOMENTE auditado.
**Commit-base:** `8863ecfe504c580a34ce46fedadd30b73e12fd2d`

---

## 1. Objetivo

Definir como o acervo documental da Fase 8 (75 arquivos físicos / 65 documentos válidos) será transformado em uma base jurídica normalizada, versionada, rastreável e pronta para futura ingestão no RAG — sem implementar chunks/embeddings agora. A Fase 9 responde: **como representar juridicamente cada fonte, documento e versão sem perder origem, vigência, jurisdição, relações normativas, hash e evidência física.**

## 2. Estado de entrada da Fase 8

- 75 arquivos físicos; 65 documentos válidos (10 federal + 55 estadual); 3 recuperados na fase; 1 duplicata CE; 7 UFs bloqueadas (DF, MA, MT, PE, RN, RO, SE); 13 CETRANs sem DNS; 12 UFs COBERTURA_DOCUMENTAL; 1 COBERTURA_DOCUMENTAL_RECUPERADA; 7 COBERTURA_PARCIAL; 7 RECUPERACAO_BLOQUEADA; BA FORA_DO_ESCOPO; Federal com 10 válidos e 6 payloads de falha; cobertura nacional completa NÃO declarada. Fase 8 encerrada e não será reaberta.

## 3. Auditoria da arquitetura existente (código)

Comandos usados: `find src`, `grep -rl` em registros/coletores. Resultado:

**Modelos em TS (Fase 7 pré-existente):**
- `src/core/knowledge/types.ts` — `KnowledgeOrgan`, `KnowledgeCetran`, `KnowledgeState`, `KnowledgeSource` (id, uf, organId, tier, title, url, category, contentHash, httpStatus, isActive, fetchErrorCount), `KnowledgeSnapshot` (fetchedAt, httpStatus, contentHash, normalizedText), `KnowledgeChange`, `ReviewQueueItem`, `TemporalQueryContext`, `EffectiveKnowledgeResult`, `MonitoringCycleSummary`.
- `src/core/knowledge/sources-registry.ts` — `OFFICIAL_SOURCES_REGISTRY: KnowledgeSource[]` (677 linhas).
- `src/core/knowledge/national-registry.ts` — `NATIONAL_STATES_DB`, `NATIONAL_ORGANS_DB`, `NATIONAL_CETRANS_DB` + accessors (1605 linhas).
- `src/core/knowledge/monitoring/` — `source-fetcher.ts`, `hash-generator.ts` (`calculateSha256Sync`), `content-normalizer.ts`, `snapshot-store.ts`, `change-detector.ts`.
- `src/core/knowledge/temporal-engine.ts` — `TemporalKnowledgeEngine` (125 linhas).
- `src/core/knowledge/registry/canonical-registry.ts` — `CanonicalKnowledgeRegistry` (396 linhas).
- `src/core/knowledge/scheduler/` — `weekly-monitor-service.ts` (`WeeklyMonitorService`), `weekly-monitor-scheduler.ts`, `notification-alert-service.ts`.
- `src/server/services/legislation-collector.ts` — `LegislationCollector` (coleta periódica com retry, timeout, hash, idempotência).
- `src/core/rag/rag-pipeline.ts` — `RagPipeline.retrieveContext()` **determinístico** (Rule Engine + catálogos + ARGUMENTS_CATALOG + ORGANS_DB) — NÃO é embedding-based ainda.
- `src/core/domain/knowledge-schema.ts` — `KNOWLEDGE_CATEGORIES`, `CtbArticleModel`, `ResolutionModel`, `JurisprudenceModel`, `OrganModel`, `GlossaryTermModel`, `StatutoryNormReference`, `ProcedureModel`, `TemplateBlock`, `RuleModel`...
- `src/server/knowledge/` — `knowledge-service.ts`, `search-service.ts`, `rag-service.ts`; rota `src/server/routes/knowledge.ts`; UI `src/components/knowledge/NationalMonitorView.tsx`.

**Conclusão arquitetura:** existe modelo de Source/Snapshot/Change (monitoramento) e de domínio jurídico (catálogos), mas NÃO existe ainda a cadeia canônica completa `source→document→version` em código para o acervo físico da Fase 8; o modelo DB já a prevê (v. §4).

## 4. Auditoria do Supabase (somente leitura)

Tabelas `public` já criadas (0 linhas, RLS ativo), seguindo o modelo da Fase 7:

| Tabela | PK | Colunas-chave | Notas |
| --- | --- | --- | --- |
| `knowledge_sources` | id text | name, source_type (LAW/REGULATION/JURISPRUDENCE/GOVERNMENT/…), authority, url, jurisdiction (default BR_FEDERAL), is_active, timestamps | RLS ✅ |
| `knowledge_documents` | id text | source_id FK, title, document_type, jurisdiction, status (ACTIVE/REVOKED/SUPERSEDED/DRAFT/ARCHIVED), current_version_id FK, metadata jsonb | RLS ✅; ponteiro de versão vigente |
| `knowledge_document_versions` | id text | document_id FK, version, content, **content_hash**, source_url, published_at, **effective_from**, **effective_until**, metadata | RLS ✅; temporalidade presente; sem updated_at |
| `knowledge_chunks` | id text | document_version_id/document_id/source_id FK (denormalizados), chunk_index, content, **content_hash**, token_count, jurisdiction, document_type, metadata | RLS ✅ |
| `knowledge_embeddings` | id text | chunk_id FK, provider, model, dimensions, embedding (vector/pgvector) | RLS ✅ |
| `knowledge_ingestions` | id text | started_at/completed_at, status (PENDING/PROCESSING/COMPLETED/FAILED), contadores (processed/created_chunks/generated_embeddings/failed), provider/model, details jsonb | RLS ✅; tabela de telemetria, sem FK |

**Achados importantes:**
1. **Cadeia completa existe no DB** (source→document→version→chunks→embeddings) com FKs em cascata — coerente com a Fase 7.
2. **Drift de migrations:** as 6 tabelas existem no projeto canônico mas **NÃO há migration correspondente em `supabase/migrations/`** (lista auditada não contém knowledge/*). Precisam ser versionadas na Fase 9.1.
3. **RLS ativo em todas**; policies não verificadas nesta auditoria (dump não expõe policies) → verificar na implementação.
4. **Temporalidade** presente em versions (effective_from/until, published_at); **proveniência** via source_id/source_url/metadata; **hash** em versions e chunks; **jurisdição** em sources/documents/chunks.
5. Inconsistências menores: `document_versions` sem `updated_at`; `knowledge_ingestions` órfão (sem FK a source/document) — decisão arquitetural pendente.

## 5. Auditoria do acervo físico (Fase 8)

Fonte: `FASE-8-INVENTARIO-DOCUMENTAL-OFICIAL-2026-09-23.md` + `FASE-8-VALIDACAO-COBERTURA-NACIONAL-2026-09-24.md`. Realidade: 75 arquivos (16 federal + 59 estadual), 65 válidos, 3 recuperados (CONTRAN 796, Memo 753 AM, + 2 AP), 1 duplicata CE, 6 payloads federais + 3 estaduais de falha, 3 alertas MIME. Cada documento possui no inventário: ID, Fonte, Autoridade, Jurisdição, Tipo, Título, URL Oficial, URL de Coleta, SHA-256, Data, Status, caminho físico. **`data de vigência e relações normativas NÃO estão disponíveis de forma confiável no acervo`** — devem ser `UNKNOWN` até evidência.

## 6–8. Modelo canônico proposto

Base: **usar o schema Supabase existente (Fase 7) como fonte de verdade**, complementá-lo apenas quando justificado. Justificativa: cadeia já criada, RLS ativo, coerência com o monitoramento existente. Proposta por entidade (campos mapeados para colunas existentes):

### Source
- `source_id` → `knowledge_sources.id` (padrão: `SRC_FED_*`, `SRC_UF_*` do inventário) — justificativa: manter compatibilidade com o inventário.
- Campos: name, source_type, authority, url, jurisdiction (BR_FEDERAL ou UF), is_active, retrieved_at (via created_at).
- **Aditivo proposto:** `evidence_kind` (COLLECTED/RECUPERADO/BLOQUEADO) em metadata, para rastrear o estado de coleta sem perder a tabela original.

### Document
- `document_id` → `knowledge_documents.id`; `document_number`, `document_type`, `title`, `jurisdiction`, `authority`, `official_url` → colunas existentes + metadata.
- `status` governa o ciclo de vida (ACTIVE/DRAFT/ARCHIVED…). Vigência NUNCA inferida; `metadata.vigencia_state` explícito (`UNKNOWN` até comprovação).

### Version
- `version_id` → `knowledge_document_versions.id`; `content_hash`, `source_url`, `mime_type`/`file_size` → metadata; `retrieved_at` → published_at/created_at; `effective_from/until` → colunas (preenchidas só com evidência).
- `validated: RECUPERADO/VALIDADO/CATALOGADO/RECONSTRUÍDO/UNKNOWN/BLOQUEADO` → coluna/status ou metadata.

**Entidades adicionais avaliadas — decisão:**
- `amendment/revocation/supersession`: representar como **tabela de relações** (`knowledge_document_relations`: document_a, document_b, relation_type CHECK AMENDS/REVOKES/SUPERSEDES/CORRIGES/CONSOLIDATES/RELATED_TO/DERIVED_FROM, evidence_url, confidence, created_at). Justificativa: relações UNKNOWN até evidência; tabela dedicada evita contaminação dos documentos.
- `procedure` e `legal_subject`: NÃO como tabelas novas agora — via `metadata` de documents e futura tabela de mapeamento `document↔procedure` na Fase 9.5. Justificativa: o domínio já tem `ProcedureModel`; acoplar agora criaria entidade sem consumidor.
- `evidence`: capturado por `knowledge_ingestions` + metadata de documents/versions (URL, data, hash, status HTTP). Sem entidade nova.
- `parent/related sources`: via `relation_type` RELATED_TO/DERIVED_FROM na tabela de relações.

## 9. Relações normativas

Tabela `knowledge_document_relations` (aditiva, proposta na 9.1):
- `document_a_id` FK, `document_b_id` FK, `relation_type` CHECK, `evidence_url` (obrigatória), `confidence` (ALTA/MEDIA/UNKNOWN), `created_at`.
- Toda relação exige evidência documental/URL oficial; sem evidência → **não registra** (relação ausente ≠ relação inexistente).
- `UNKNOWN` permitido (relação provável não comprovada) → registrar com confidence=UNKNOWN, nunca fabricar AMENDS/REVOKES.
- Histórico preservado: relação é insert-only; revogação de relação = nova linha com status, não DELETE.

## 10. Temporalidade jurídica

Distinção obrigatória e explícita:
- `publication_date` (publicado) → `published_at`.
- `effective_from`/`effective_until` (vigência) → colunas de versions.
- `retrieved_at` (coleta) → created_at de versions/snapshots.
- `version_date` (versão do documento) → metadata.

Estados de vigência (nunca `NULL` = "não vigente"):
- `VIGENTE`, `VIGENTE_NAO_COMPROVADA` (publicado, vigência não provada), `REVOGADA`, `SUBSTITUIDA`, `NAO_VIGENTE_NA_DATA` (publicado com vigência futura), `VIGENCIA_DESCONHECIDA`, `DOCUMENTO_HISTORICO`, `VERSAO_CONSOLIDADA` (CONSOLIDATES).
- Para o acervo Fase 8: default = `VIGENCIA_DESCONHECIDA` (dado: vigência não foi comprovada nos documentos coletados). Tooltip: a ausência de documento NÃO indica ausência da norma.

## 11. Proveniência

Cadeia obrigatória por documento:
`registro jurídico → documento → versão → arquivo físico → URL oficial → hash → data de recuperação → estado de coleta (coletado/recuperado/bloqueado)`.
- Persistir em metadata de versions: `source_url`, `retrieved_at`, `collection_state`, `original_file`, `inventory_id`.
- Para recuperados: 2 linhas de version (a original inválida preservada + a recuperada com `metadata.recuperado=true` e vínculo `metadata.origem_invalida`). Nunca substituir silenciosamente.
- Auditoria posterior: `SELECT` por `metadata->>'inventory_id'` recupera o registro do inventário Fase 8 e o arquivo físico.

## 12. Classificação de confiança

Dimensões separadas (matriz de atributos independentes):

| Atributo | Valores | Não confundir com |
| --- | --- | --- |
| Existência física | presente / ausente | validade jurídica |
| Validade do arquivo | VALIDO / ALERTA_MIME / PAYLOAD_INVALIDO | validade normativa |
| Estado de coleta | COLLECTED / RECUPERADO / RECUPERACAO_BLOQUEADA / FONTE_SEM_DOCUMENTO | vigência |
| Validade jurídica | VIGENTE / REVOGADA / VIGENCIA_DESCONHECIDA | existência física |
| Cobertura da UF | COBERTURA_DOCUMENTAL / COBERTURA_PARCIAL / FORA_DO_ESCOPO / BLOQUEADA | completude normativa |

Nunca promover uma dimensão como evidência de outra.

## 13. Gap documental ≠ Gap jurídico

- **Gap documental** (não obtivemos arquivo): ex. UFs bloqueadas por DNS/Cloudflare/Akamai — registrado como BLOQUEADO.
- **Gap de catalogação** (fonte existe, metadados insuficientes): ex. Portal SPA com apenas shell — CATALOGADO/BLOQUEADO.
- **Gap de vigência** (documento existe, vigência não comprovada): `VIGENCIA_DESCONHECIDA`.
- **Gap jurídico** (regra aplicável indefinida): registrado como `UNKNOWN`, exige validação humana.
- **Gap de cobertura** (acervo insuficiente p/ afirmar cobertura da UF/procedimento): UF marcada não-coberta.
Todos são estados distintos no modelo (metadata/status dedicados) — tratá-los como equivalentes é erro de especificação.

## 14. Fonte federal × estadual

Hierarquia de jurisdição: `FEDERAL > ESTADUAL > MUNICIPAL`; órgão: `CONTRAN/SENATRAN/CTB (federal)` ; `DETRAN/CETRAN/JARI/DER (estadual)` ; órgãos municipais.
- `jurisdiction` explícita em sources/documents/chunks (default BR_FEDERAL; UF para estaduais).
- Conflito/sobreposição: **específicar apenas** agora — regra de resolução (hierarquia normativa + vigência comprovada + especificidade estadual) será implementada na aplicação futura; não implementar nesta fase.

## 15. Procedimentos

Procedimentos do produto: Defesa Prévia, JARI, CETRAN, Suspensão, Cassação, Indicação de Real Condutor, Conversão em Advertência.
- Modelo: futura tabela de mapeamento `knowledge_procedure_documents` (procedure_id e document_id) OU metadata de document (`metadata.procedures[]`). Decisão: **metadata nesta fase** (sem entidade nova), valorizada apenas quando o documento tiver vínculo explícito com o procedimento. Nunca inventar vínculo; verificar contra o inventário (ex. formulários de defesa → Defesa Prévia).
- Relação document→procedure não gera cobertura jurídica da UF.

## 16. Regras para documentos recuperados

- Manter: `metadata.recuperado=true`, hash novo, URL nova, data, origem, evidência (arquivo recuperado), e vínculo ao registro original (`metadata.origem_invalida = <arquivo original>`).
- Dois registros de version: original inválida (preservada, `collection_state=PAYLOAD_INVALIDO`) + recuperada (`collection_state=RECUPERADO`).
- Ex: `SRC_FED_CONTRAN_796_2020` → version inválida (hash antigo) + version recuperada (hash novo `5bc7bade…`).

## 17. Duplicatas

- Arquivos byte-identical (mesmo hash) → mesmo `content_hash`, dois registros de version APONTANDO para o mesmo content_hash; proveniência de cada URL preservada. CE: `defesa_autuar_infracao_transito.html` e `recurso_jari_detran_ce.html` (mesmo hash) — dois sources/documents com versões de mesmo hash, marcados `duplicate_of` no metadata.
- Mesmo documento em PDF e HTML → dois documents ou duas versions (PDF e HTML) — desde que ambos validados; manter as duas evidências.
- Nunca remover fonte oficial por conteúdo idêntico; hash detecta duplicidade, não destrói proveniência.

## 18. Arquivos inválidos (evidência de coleta)

404/403/DNS/Cloudflare/Akamai/TLS/JSON de erro/HTML de erro/PDF inválido = **evidência de coleta**, não documento jurídico.
- Representar: `knowledge_document_versions` com `collection_state=PAYLOAD_INVALIDO`/`RECUPERACAO_BLOQUEADA`, ou `knowledge_sources` com metadata de erro (httpStatus, error, lastError). Recomendação: registrar no **Source** (metadata de erro de coleta) + eventuais versions de falha em `knowledge_ingestions.details`. **Nunca** entrar em chunks/embeddings.

## 19. Contrato de ingestão futura (Fase 11)

Critérios EXATOS para entrada no RAG:
- `O que pode entrar:` documento com arquivo válido (magic/content ok) + source identificado + content_hash + jurisdiction + document_type + collection_state ∈ {COLLECTED, RECUPERADO} + validation_status ∈ {VALIDO, VALIDO_COM_ALERTA}.
- `O que não pode entrar:` payload de erro, HTML/JSON disfarçado de PDF, arquivo sem source, sem hash, sem jurisdiction, fora do escopo (FORA_DO_ESCOPO), duplicata sem proveniência.
- `Entra apenas como evidência/metadado:` arquivos inválidos (histórico de tentativa), blqueios (DNS/403/…), duplicatas byte-identical (2ª ocorrência vira metadado `duplicate_of`), alertas MIME.
- `Permanecer bloqueado:` UFs sem evidência; documentos com vigência desconhecida (para RAG jurídico, exigir validação conforme regra de negócio — nível de rigor definido na Fase 11, não aqui).
- `Validação humana:` relações normativas, vigência, fora-do-escopo reclassificações, documentos RECUPERADOS.

## 20. Critérios de aceitação da Fase 9

```
[ ] Todo documento possui source_id
[ ] Toda versão possui content_hash
[ ] Toda versão possui proveniência (source_url/retrieved_at/collection_state)
[ ] Jurisdição explícita em sources/documents/chunks
[ ] Vigência nunca inferida (VIGENCIA_DESCONHECIDA default no acervo Fase 8)
[ ] Relações normativas só com evidência (confidence/UNKNOWN explícito)
[ ] Documentos recuperados preservam lineage (version inválida + recuperada)
[ ] Payloads inválidos não entram no RAG
[ ] Bloqueios permanecem rastreáveis (metadata de coleta)
[ ] Duplicatas não destroem proveniência (duplicate_of)
[ ] Federal/estadual distinguíveis (jurisdiction)
[ ] Procedimentos relacionados às fontes apenas com evidência
[ ] Contrato futuro de ingestão definido
[ ] Migration das 6 tabelas versionada no repo (fecha drift)
```

## 21. Riscos

1. Drift de migrations (tabelas knowledge não versionadas) — mitigação: 9.1 inclui migrations de baseline idempotentes.
2. RLS sem policies verificadas — mitigação: auditar policies na 9.1 antes de popular.
3. Vigência desconhecida do acervo → risco de inferência indevida — mitigação: default explícito UNKNOWN por engenharia/validação.
4. Duplicatas mascarando documentos distintos — mitigação: hash + revisão humana dos grupos.
5. Acervo com 7 UFs bloqueadas pode induzir "ausência de norma" — mitigação: gap jurídico ≠ gap documental, registrado em estado próprio.

## 22. Decisões arquiteturais (ADR adiado para implementação)

D1. **Reusar schema Supabase existente** como fonte de verdade do modelo canônico (não criar schema novo em código).
D2. **Tabela de relações normativas** aditiva (`knowledge_document_relations`) na 9.1.
D3. **metadata jsonb** como espaço de extensão (collection_state, vigencia_state, duplicate_of, procedures) — sem novas colunas até consumidor.
D4. **Duplicate**: hash-guia + `duplicate_of`, nunca DELETE.
D5. Recuperados: **two-version lineage**, nunca substituição.
D6. Ingestão RAG bloqueada na Fase 9 (contrato definido, execução na Fase 11).

## 23. Questões que permanecem UNKNOWN

- Vigência da maioria dos documentos estaduais/federais coletados (não comprovada).
- Policies RLS efetivas das 6 tabelas knowledge (não expostas no dump).
- Relações normativas entre documentos do acervo (nenhuma evidência levantada) .
- Cobertura jurídica das 7 UFs bloqueadas e dos 13 CETRANs.
- Formato canônico do content (texto normalizado) a usar nas versions — a definir na 9.2.
- Se `knowledge_document_versions` precisa de `updated_at` (recomendado: sim) e se `knowledge_ingestions` deve ganhar FK — decisão na 9.1.

## Sequência proposta para implementação futura

Ver `FASE-9-ROADMAP-IMPLEMENTACAO-2026-09-24.md` (Fase 9.1–9.5). Resumo: 9.1 modelo/migration → 9.2 canonicalização/lineage → 9.3 versionamento/temporalidade → 9.4 reconciliação do acervo → 9.5 validação/critérios de ingestão.