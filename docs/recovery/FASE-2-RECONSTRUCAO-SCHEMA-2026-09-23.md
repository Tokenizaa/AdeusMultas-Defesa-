# FASE 2 — Reconstrução da Especificação do Schema Canônico

**Data:** 2026-09-23  
**Projeto-alvo de reconstrução:** `llmxnpgjpxcvyrqjkfwb`  
**Projeto histórico perdido:** `sgomwklorpzdwdubtmgg`  
**Modo:** somente leitura / planejamento  
**Alterações aplicadas:** nenhuma

## Objetivo

Transformar o lineage levantado na FASE 1 em uma especificação operacional do schema que poderá servir de baseline para uma eventual reconstrução limpa.

A FASE 2 **não executa migrations** e não altera o banco.

## 1. Fontes

- Git `supabase/migrations/`;
- `supabase/config.toml`;
- histórico de migrations registrado no Supabase;
- schema atualmente observável;
- documentação das FASES 17–19;
- FASE 0 e FASE 1.

## 2. Estado observado

O banco conectado continua sendo o projeto canônico `llmxnpgjpxcvyrqjkfwb`.

Snapshot estrutural atual:

- **52 tabelas públicas**;
- RLS habilitado nas tabelas públicas inventariadas;
- **153 policies**;
- **209 funções públicas**;
- **11 triggers não internos**;
- extensões previamente inventariadas: citext, pg_stat_statements, pg_trgm, pgcrypto, plpgsql, supabase_vault, uuid-ossp e vector;
- 6 buckets de Storage / 8 objetos;
- histórico remoto de migrations contém **64 registros**.

Este snapshot é referência de auditoria, não uma instrução para modificar o banco.

## 3. Baseline lógica

A baseline deve ser organizada em camadas:

### Camada A — Fundação/Auth
- tipos/domínios auxiliares;
- `user_profiles`;
- triggers relacionados a criação/atualização de perfil;
- endurecimento de funções;
- políticas de ownership.

Migrations principais no Git:
- `20260817000001_setup_auth_schema.sql`
- `20260817000002_update_profiles_table.sql`
- `20260819000001_fix_user_profiles_trigger_and_role_enum.sql`
- `20260819000002_revoke_public_trigger_functions_and_tighten_insert_policy.sql`
- `20260829100001_enable_rls_internal_tables.sql`
- `20260829110000_fix_user_profiles_policy_id_to_user_id.sql`

**Regra:** `user_profiles.user_id` é o identificador canônico; não reintroduzir `id` como chave de ownership.

### Camada B — Domínio comercial
- catálogo;
- leads;
- automação;
- collection runs;
- segmentação;
- pagamentos.

Migrations principais:
- `20260824164720_create_commercial_catalog.sql`
- `20260827000001_create_marketing_leads.sql`
- `20260827000002_create_marketing_automation.sql`
- `20260827000002_expand_commercial_catalog.sql`
- `20260828000001_add_collection_runs_and_scraped_for.sql`
- `20260828000002_add_collection_run_id_to_marketing_leads.sql`
- `20260828000003_add_queued_to_collection_runs.sql`
- `20260829120001_add_audience_segmentation_and_opt_out.sql`
- `20260829120002_baseline_unversioned_marketing_tables.sql`
- `20260829120003_deduplicate_campaigns.sql`
- `20260829120005_add_campaign_image_columns.sql`

**Atenção:** existem timestamps iguais em arquivos diferentes. A ordenação futura deve usar dependências reais, não apenas timestamp.

### Camada C — Cases
- `cases`;
- índices;
- applicant JSON;
- flags de evidência;
- RLS.

Migrations:
- `20260908000001_create_cases_table.sql`
- `20260817000003_add_case_indexes.sql`
- `20260906134612_fase_3_1_persist_case_evidence_flags.sql`
- `20260908141600_add_applicant_json_to_cases.sql`
- `20260915132153_enable_rls_cases.sql`
- `20260921000006_fase_19_add_applicant_json_cases.sql`

A migration FASE 19 deve ser tratada como correção histórica de drift, não como justificativa para duplicar a coluna.

### Camada D — Payments
- `payment_orders`;
- relações com cases/usuários;
- índices e políticas correspondentes.

Migration principal:
- `20260908000001_create_payment_orders.sql`

### Camada E — Content/Editorial
- baseline editorial;
- estados;
- rejection tracking;
- conteúdo e mídia.

Migrations:
- `20260829000001_add_editorial_content_rejection_tracking.sql`
- `20260829130001_align_content_status_checks.sql`
- `20260914000001_editorial_content_baseline.sql`

### Camada F — Messaging
- contacts;
- conversations;
- messages;
- RLS/ownership.

Migrations:
- `20260829130002_create_messaging_tables.sql`
- `20260921000005_fase_18_messaging_rls_contacts_conversations.sql`

### Camada G — E2E/Observabilidade
- `e2e_test_runs`;
- `e2e_test_results`.

Migration:
- `20260830000001_create_e2e_test_tables.sql`

### Camada H — Documenso
- envelopes;
- recipients;
- ownership.

Migrations:
- `20250115000001_documenso_integration.sql`
- `20260830000002_add_envelope_user_id_ownership.sql`

### Camada I — Storage/Security
- políticas de Storage;
- policies de ownership;
- endurecimento de funções;
- RLS recursion fix;
- role hardening.

Migrations:
- `20260905000002_storage_access_policies_baseline.sql`
- `20260921000001_fase_18_auth_rls_storage.sql`
- `20260921000002_fase_18_rls_recursion_fix.sql`
- `20260921000003_fase_18_role_update_hardening.sql`
- `20260921000004_fase_18_drop_legacy_profile_update_policy.sql`

## 4. Problemas identificados antes de qualquer baseline executável

### 4.1 Timestamp duplicado

Existem pelo menos dois pares de migrations com o mesmo prefixo temporal:

- `20260827000002_create_marketing_automation.sql`
- `20260827000002_expand_commercial_catalog.sql`

e:

- `20260829130001_align_content_status_checks.sql`
- respectivo `*.test.sql`.

Não se deve alterar os nomes históricos automaticamente.

### 4.2 Migration histórica versus migration necessária

Algumas migrations representam:
- criação inicial;
- correção;
- hardening;
- correção de drift;
- baseline de estruturas já existentes.

Uma baseline nova não deve simplesmente concatenar todos os arquivos.

### 4.3 Drift conhecido

`applicant_json` possui histórico explícito de drift entre Git e banco.

A baseline precisa representar apenas o **estado final desejado**, e não reaplicar cada correção intermediária.

### 4.4 Segurança

O baseline deverá preservar:
- RLS;
- ownership por `auth.uid()`;
- `WITH CHECK` em UPDATE;
- endurecimento de `SECURITY DEFINER`;
- políticas de Storage;
- ausência de autorização baseada em `user_metadata`.

## 5. Regra para geração da baseline

A futura baseline deverá ser:

**estado final consolidado**, não:

**concatenação das 41 migrations**.

Ela deverá conter somente o SQL necessário para obter o modelo final, com dependências ordenadas.

Antes de qualquer aplicação serão obrigatórios:

1. validação sintática;
2. validação de dependências;
3. comparação de schema;
4. validação de RLS/policies;
5. validação de funções/triggers;
6. teste em banco descartável;
7. somente depois, aprovação explícita para aplicação.

## 6. Dados

A FASE 2 não tenta recuperar dados históricos.

Classificação estabelecida na FASE 1 permanece:

- dados encontrados no Git: **RECUPERADOS DO GIT**;
- dados encontrados no banco sobrevivente: **DADOS SOBREVIVENTES**, não dados do projeto antigo;
- dados inexistentes nas fontes: **PERDIDOS / KNOWLEDGE_GAP**;
- novos registros criados após a reconstrução: **NOVOS**.

## 7. Resultado

**FASE 2 — RECONSTRUÇÃO DA ESPECIFICAÇÃO DO SCHEMA: CONCLUÍDA.**

Foi definida a arquitetura da baseline e identificados os principais grupos de dependência, migrations de criação, migrations corretivas e migrations de hardening.

**Nenhuma alteração foi aplicada ao Supabase.**

## 8. Próxima fase

**FASE 3 — CONSTRUÇÃO DA BASELINE SQL RECONSTRUÍDA**

A FASE 3 deverá gerar os arquivos de baseline no Git, sem aplicar ao Supabase.

Entregáveis:

1. baseline SQL consolidada;
2. manifesto `migration → objeto`;
3. lista de objetos reconstruídos;
4. lista de objetos que dependem de evidência adicional;
5. validação sintática;
6. relatório de diferenças;
7. marcação explícita de `KNOWLEDGE_GAP`.

**Nenhum dado histórico será inventado.**
