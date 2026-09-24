# FASE 9.1 — Migração do Schema Jurídico e Fechamento do Drift

**Data:** 2026-09-24 | **Natureza:** estado real auditado → migration versionada → integridade verificada. Nenhuma ingestão, nenhum dado populado, nenhum DROP/TRUNCATE/DELETE.
**Commit-base:** `c4ea4a7b3ad4f42429e3191834108f672855f4f7`

## 1. Estado encontrado

6 tabelas existiam no banco canônico (`llmxnpgjpxcvyrqjkfwb`) **sem representação em `supabase/migrations/`** (drift). Todas com 0 linhas, RLS ativo, sem policies:

`knowledge_sources → knowledge_documents → knowledge_document_versions → knowledge_chunks → knowledge_embeddings` + `knowledge_ingestions`.

## 2. Migration drift (matrix)

| Objeto | Banco | Migration (antes) | Código | Ação |
| --- | --- | --- | --- | --- |
| knowledge_sources | ✅ existe | ❌ ausente | types (KnowledgeSource) | versionar |
| knowledge_documents | ✅ existe | ❌ ausente | types | versionar |
| knowledge_document_versions | ✅ existe | ❌ ausente | types (Snapshot-hash) | versionar |
| knowledge_chunks | ✅ existe | ❌ ausente | rags (contrato) | versionar |
| knowledge_embeddings | ✅ existe | ❌ ausente | — | versionar |
| knowledge_ingestions | ✅ existe | ❌ ausente | — | versionar |
| knowledge_document_relations | ❌ inexistente | ❌ | spec Fase 9 | **criar** |
| extensão vector | ✅ 0.8.2 | ❌ | — | versionar (IF NOT EXISTS) |
| extensão pg_trgm | ✅ 1.6 | ❌ | — | registro gap (não requerida pela cadeia) |

Nenhuma migration anterior referenciava `knowledge_*` (grep confirmou 0 ocorrências reais).

## 3. Tabelas auditadas (estado real preservado)

Colunas/tipos/defaults/PK/FK/CHECK/índices extraídos via `pg_catalog` (queries MCP). Destaques:
- `knowledge_embeddings.embedding` = `vector(1024)` — exige extensão `vector`.
- FK circular `documents.current_version_id → document_versions` = `DEFERRABLE INITIALLY DEFERRED`.
- ON DELETE CASCADE nos filhos (chunks/embeddings/versions→documents→sources) conforme schema real.
- CHECKs: `source_type` (8 valores), `status` de documents (ACTIVE/REVOKED/SUPERSEDED/DRAFT/ARCHIVED), `status` de ingestions (PENDING/PROCESSING/COMPLETED/FAILED).
- Índices: btree de navegação + `idx_k_embeddings_vector_hnsw` (hnsw, vector_cosine_ops, m=16, ef_construction=64).

## 4. Divergências encontradas

- **RLS sem policies** nas 6 tabelas (e em outras 11 tabelas do projeto) — lint `rls_enabled_no_policy`. **Fora do escopo** desta fase (correção ampla de segurança não permitida). Registrado como gap; a nova tabela segue o mesmo padrão (RLS ON, sem policy).
- **Extensions no schema public** (vector, pg_trgm, citext) — lint `extension_in_public`. Pré-existente; fora do escopo.
- `knowledge_document_versions` **sem `updated_at`** — schema real preservado como está (spec Fase 9 deixou decisão para 9.1; mantida a fidelidade ao real).

## 5. Estruturas preservadas

Todas as 6 tabelas existentes foram reproduzidas na migration com **fidelidade ao estado real** (mesmos nomes, tipos, defaults, constraints, índices). Nenhuma alteração destrutiva. Contagens antes/depois: 0 → 0 em todas.

## 6. Migration criada

`supabase/migrations/20260924233015_fase_9_1_knowledge_schema.sql` (criada via `supabase migration new`).

Propriedades:
- **idempotente**: `CREATE TABLE IF NOT EXISTS`, `create extension if not exists`, `create index if not exists`, FK circular guardada por `DO $$ … IF NOT EXISTS (pg_constraint)`.
- **determinística e reversível em banco novo** (reproduz o schema integralmente; em banco existente é no-op aditivo).
- Aplicada no canônico via `apply_migration` — sucesso, sem perda de dados.

## 7. knowledge_document_relations (nova tabela)

| Coluna | Tipo | Regra |
| --- | --- | --- |
| id | text PK | |
| source_document_id | text FK → knowledge_documents | ON DELETE RESTRICT |
| target_document_id | text FK → knowledge_documents | ON DELETE RESTRICT |
| relation_type | text CHECK | AMENDS, REVOKES, SUPERSEDES, CORRIGES, CONSOLIDATES, RELATED_TO, DERIVED_FROM |
| evidence | text NOT NULL | origem da evidência (obrigatória) |
| source_url | text | opcional |
| status | text default PENDING_VALIDATION | PENDING_VALIDATION, VALIDATED, REJECTED, UNKNOWN |
| metadata | jsonb default {} | extensão |
| created_at / updated_at | timestamptz default now() | |

CHECK extra: `source_document_id <> target_document_id` (sem auto-relação).

**Racional ON DELETE RESTRICT:** relação jurídica jamais aponta para documento inexistente; sem cascata destrutiva (spec Fase 9 §16).

## 8–9. Relações suportadas e constraints/índices

- 7 relation_types via CHECK (sem enum novo — projeto não reutilizava enum compatível).
- 3 CHECKs + PK + 2 FKs na tabela = 6 constraints (verificado: `knowledge_relations_constraints` = 6).
- Índices justificados (composição origem+type e destino+type; origem; destino) — 4 índices.

## 10. Validação

- Sintaxe/DDL aplicado com sucesso no canônico.
- Verificado pós-aplicação: **7 tabelas** `knowledge_*` com `RLS_ON` (knowledge_document_relations incluída).
- Constraints de relations = 6 (PK+FKs+CHECKs).
- Sugestão de teste em DB-shadow: CLI `supabase db pull`/reset não executado para não arriscar o canônico (documentado como limitação).

## 11–12. RLS e policies

RLS: ativo em todas as 7. Policies: **nenhuma** nas knowledge_* — obtidas via pg_policies (0 rows). Padrão de segurança atual = acesso somente via `service_role`. Gap registrado (lint ativo) para tratamento em fase própria de segurança — fora do escopo desta execução.

## 13–14. Contagens antes/depois

| Tabela | Antes | Depois |
| --- | ---: | ---: |
| knowledge_sources | 0 | 0 |
| knowledge_documents | 0 | 0 |
| knowledge_document_versions | 0 | 0 |
| knowledge_chunks | 0 | 0 |
| knowledge_embeddings | 0 | 0 |
| knowledge_ingestions | 0 | 0 |
| knowledge_document_relations | — | 0 |

Nenhuma linha criada, removida ou alterada. Nenhuma relação populada.

## 15. Limitações

- Não foi possível validar em shadow-db sem risco ao canônico (CLI local não vinculado); validação feita por inspeção pg_catalog pré/pós + apply bem-sucedido.
- Policies RLS ausentes não sendo criadas (padrão existente + escopo).
- `updated_at` ausente em document_versions mantido (fidelidade).

## 16. Itens que permanecem UNKNOWN

- Policies RLS a adotar para knowledge_* (decisão de segurança em fase própria).
- Se `knowledge_ingestions` deve ganhar FK para source/document (decisão deixada pela Fase 9; não alterado).
- Adoção de `updated_at` em document_versions (não alterado).

## 17. Resultado final

- **Drift fechado:** schema jurídico versionado em `supabase/migrations/20260924233015_fase_9_1_knowledge_schema.sql`.
- **Tabela nova criada:** `knowledge_document_relations` (RLS ON, 6 constraints, 4 índices).
- **Banco íntegro:** zero DROP/TRUNCATE/DELETE; contagens preservadas.
- **Código:** nenhum tipo/arquivo `src/` alterado (nova tabela não exige regeneração de tipos para esta fase).
- **Próximos (fora desta execução):** Fase 9.2 canonicalização/lineage; Fase 9.4 reconciliação do acervo; decisão de policies RLS.