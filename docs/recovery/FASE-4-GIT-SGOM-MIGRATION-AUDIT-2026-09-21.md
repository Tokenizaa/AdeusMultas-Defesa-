# Fase 4 — Auditoria Git e histórico de migrations

**Data:** 2026-09-21  
**Branch:** `recovery/sgom-db-reconstruction`  
**Objetivo:** reconstruir a cadeia de migrations disponível no Git, comparar com o histórico ainda acessível do LLMX e registrar a evidência histórica do SGOM canônico.

## 1. Conclusão da fase

**Status: CONCLUÍDA.**

A auditoria confirmou três camadas distintas de evidência:

1. **SGOM:** evidência histórica de produção registra **88 migrations** em 2026-09-15.
2. **LLMX:** histórico acessível contém **58 registros**, correspondendo a **54 nomes únicos**.
3. **Git atual:** existem **35 arquivos** em `supabase/migrations/`, dos quais **34 são SQL de migration** e **1 é teste SQL associado a migration**.

Portanto, o Git atual **não representa sozinho** o histórico completo do banco histórico SGOM.

Nenhuma alteração foi feita em LLMX ou SGOM.

---

## 2. Evidência histórica do SGOM

O arquivo:

`loop/evidence/G1-01-2026-09-15.md`

registra:

- projeto Supabase autoritativo: `sgomwklorpzdwdubtmgg`;
- `supabase_migrations.schema_migrations`: **88 migrations registradas**;
- `public.cases` com RLS;
- `public.profiles` com RLS;
- 3 policies em `cases`;
- 2 policies em `profiles`;
- LLMX explicitamente descartado naquele gate como fonte de evidência.

Isso é evidência documental direta do estado observado no SGOM em 2026-09-15, mas não fornece a lista textual das 88 migrations. A lista completa do SGOM continua sendo uma lacuna de recuperação.

---

## 3. Git atual

### Quantidade

- 35 arquivos em `supabase/migrations/`;
- 34 migrations SQL;
- 1 arquivo de teste: `20260829130001_align_content_status_checks.test.sql`.

### Observações importantes

Existem timestamps duplicados no Git:

- `20260827000002_create_marketing_automation.sql`
- `20260827000002_expand_commercial_catalog.sql`

e:

- `20260908000001_create_cases_table.sql`
- `20260908000001_create_payment_orders.sql`

Isso significa que o timestamp isoladamente não é uma chave suficiente para reconstruir a ordem lógica.

### Migrations SQL atuais

```text
20250115000001_documenso_integration
20260817000001_setup_auth_schema
20260817000002_update_profiles_table
20260817000003_add_case_indexes
20260819000001_fix_user_profiles_trigger_and_role_enum
20260819000002_revoke_public_trigger_functions_and_tighten_insert_policy
20260824164720_create_commercial_catalog
20260827000001_create_marketing_leads
20260827000002_create_marketing_automation
20260827000002_expand_commercial_catalog
20260828000001_add_collection_runs_and_scraped_for
20260828000002_add_collection_run_id_to_marketing_leads
20260828000003_add_queued_to_collection_runs
20260829000001_add_editorial_content_rejection_tracking
20260829100001_enable_rls_internal_tables
20260829100002_harden_security_definer_functions
20260829100003_fix_revoke_admin_functions_public
20260829110000_fix_user_profiles_policy_id_to_user_id
20260829120001_add_audience_segmentation_and_opt_out
20260829120002_baseline_unversioned_marketing_tables
20260829120003_deduplicate_campaigns
20260829120004_add_journey_router_indexes
20260829120005_add_campaign_image_columns
20260829130001_align_content_status_checks
20260829130002_create_messaging_tables
20260830000001_create_e2e_test_tables
20260830000002_add_envelope_user_id_ownership
20260905000001_fix_domain_to_uuid_digest_schema
20260905000002_storage_access_policies_baseline
20260906134612_fase_3_1_persist_case_evidence_flags
20260908000001_create_cases_table
20260908000001_create_payment_orders
20260908141600_add_applicant_json_to_cases
20260914000001_editorial_content_baseline
```

---

## 4. Histórico LLMX

O catálogo de `supabase_migrations.schema_migrations` foi consultado diretamente em modo somente leitura.

### Resultado

- **58 registros**
- **54 nomes únicos**
- Existem duplicações reais de registro, por exemplo:
  - `20260816000001_canonical_rag_schema`: 3 registros;
  - `create_messaging_tables`: 2 registros;
  - `20260829120004_add_journey_router_indexes`: 2 registros.

Isso demonstra que a reconstrução não pode assumir que migration name seja único no histórico PostgreSQL.

### Nomes históricos únicos relevantes

```text
20260816000001_canonical_rag_schema
20260816000002_core_platform
20260816000003_commercial_domain
20260816000004_payments_domain
20260816000005_integrations_marketing
20260816000006_observability
20260816000007_rls_policies
20260816000008_lint_fixes
20260816000009_rls_perf_fixes
phase4_rls_policies_all_tables
fix_role_step1_drop_policies
fix_role_step2b_drop_constraint_and_alter
fix_role_step3_retry
revoke_public_trigger_function_execute_and_tighten_insert_policy
revoke_public_execute_handle_user_functions
fix_is_admin_recursion_security_definer
fix_user_profiles_admin_policy_recursion
add_cases_app_ref
create_commercial_orders_table
20260824164720_create_commercial_catalog
create_user_profiles_table
rpc_admin_update_user_role_by_email
add_gateway_column_and_indexes_to_payment_orders
add_gateway_transaction_id_and_indexes
20260826000000_create_meta_tokens_table
create_marketing_leads
expand_commercial_catalog
create_marketing_automation
add_marketing_automation_campaign_columns
add_campaign_media_columns_editorial_content
create_content_versions_table
create_publisher_jobs_table
add_collection_run_id_to_marketing_leads
add_editorial_content_rejection_tracking
enable_rls_internal_tables
harden_security_definer_functions
revoke_public_execute_admin_functions
fix_user_profiles_policy_id_to_user_id
add_audience_segmentation_and_opt_out
fix_is_admin_security_definer
fix_user_profiles_duplicate_columns
20260829120003_deduplicate_campaigns
add_campaign_image_columns
20260829130001_align_content_status_checks
create_messaging_tables
20260829120004_add_journey_router_indexes
20260830000001_create_e2e_test_tables
20250115000001_documenso_integration
20260830000002_add_envelope_user_id_ownership
20260905000001_fix_domain_to_uuid_digest_schema
storage_access_policies_baseline
fase_3_1_persist_case_evidence_flags
phase_7_case_documents_storage
phase_8_notifications_audit
```

---

## 5. Comparação Git × LLMX

Foi feita comparação semântica pelo nome final da migration, removendo o prefixo timestamp do Git quando aplicável.

### Resultado

- Git: **34 migrations SQL**
- Correspondências com LLMX: **21**
- Sem correspondência nominal direta no LLMX: **13**

### Correspondências

| Git | Histórico LLMX |
|---|---|
| 20250115000001_documenso_integration | 20250115000001_documenso_integration |
| 20260824164720_create_commercial_catalog | 20260824164720_create_commercial_catalog |
| 20260827000001_create_marketing_leads | create_marketing_leads |
| 20260827000002_create_marketing_automation | create_marketing_automation |
| 20260827000002_expand_commercial_catalog | expand_commercial_catalog |
| 20260828000002_add_collection_run_id_to_marketing_leads | add_collection_run_id_to_marketing_leads |
| 20260829000001_add_editorial_content_rejection_tracking | add_editorial_content_rejection_tracking |
| 20260829100001_enable_rls_internal_tables | enable_rls_internal_tables |
| 20260829100002_harden_security_definer_functions | harden_security_definer_functions |
| 20260829110000_fix_user_profiles_policy_id_to_user_id | fix_user_profiles_policy_id_to_user_id |
| 20260829120001_add_audience_segmentation_and_opt_out | add_audience_segmentation_and_opt_out |
| 20260829120003_deduplicate_campaigns | 20260829120003_deduplicate_campaigns |
| 20260829120004_add_journey_router_indexes | 20260829120004_add_journey_router_indexes |
| 20260829120005_add_campaign_image_columns | add_campaign_image_columns |
| 20260829130001_align_content_status_checks | 20260829130001_align_content_status_checks |
| 20260829130002_create_messaging_tables | create_messaging_tables |
| 20260830000001_create_e2e_test_tables | 20260830000001_create_e2e_test_tables |
| 20260830000002_add_envelope_user_id_ownership | 20260830000002_add_envelope_user_id_ownership |
| 20260905000001_fix_domain_to_uuid_digest_schema | 20260905000001_fix_domain_to_uuid_digest_schema |
| 20260905000002_storage_access_policies_baseline | storage_access_policies_baseline |
| 20260906134612_fase_3_1_persist_case_evidence_flags | fase_3_1_persist_case_evidence_flags |

### Git sem correspondência nominal direta

```text
20260817000001_setup_auth_schema
20260817000002_update_profiles_table
20260817000003_add_case_indexes
20260819000001_fix_user_profiles_trigger_and_role_enum
20260819000002_revoke_public_trigger_functions_and_tighten_insert_policy
20260828000001_add_collection_runs_and_scraped_for
20260828000003_add_queued_to_collection_runs
20260829100003_fix_revoke_admin_functions_public
20260829120002_baseline_unversioned_marketing_tables
20260908000001_create_cases_table
20260908000001_create_payment_orders
20260908141600_add_applicant_json_to_cases
20260914000001_editorial_content_baseline
```

**Importante:** “sem correspondência nominal” não significa “não aplicado”. O próprio histórico mostra renomeações, squashes, migrations aplicadas com nomes diferentes e estruturas posteriormente presentes no LLMX.

---

## 6. Evidências Git importantes

### Commit de sincronização inicial

`ac47a8f4f8c4154cd16587ba4335939a7da71753`

Esse commit introduziu `supabase/migrations` no estado versionado e registrou inicialmente um conjunto pequeno de migrations, demonstrando que o diretório atual foi construído progressivamente.

### Separação LLMX × SGOM

`4076f57f993e8d90b185c0efb53dd83a6fac9b04`

O commit documenta explicitamente:

- LLMX como host antigo;
- SGOM como host canônico;
- substituição das referências antigas.

### Forçamento do projeto canônico

`98b077ca6bc48943977c30ddb5f165e8fd6bc2ca`

O cliente server-side foi alterado para usar explicitamente o projeto SGOM.

### Evidência G1-01

`loop/evidence/G1-01-2026-09-15.md`

É a evidência mais direta localizada para a existência das **88 migrations no SGOM**.

---

## 7. Descobertas forenses

### 7.1 O Git atual não é o histórico SGOM completo

A diferença entre:

`88 SGOM → 58 LLMX → 34 Git SQL`

é material.

Nenhuma dessas três contagens deve ser usada isoladamente como “o banco original”.

### 7.2 LLMX é uma fonte histórica parcial

LLMX contém estruturas que não estão representadas nominalmente no Git atual, incluindo:

- RAG;
- core platform;
- commercial orders;
- user profiles;
- gateways de pagamento;
- Meta tokens;
- content versions;
- publisher jobs;
- notificações/auditoria;
- case documents/storage.

Isso reforça a necessidade da matriz da Fase 5.

### 7.3 Há histórico não linear

Os registros LLMX mostram migrations repetidas e posteriormente reaplicadas com nomes diferentes. Portanto, a reconstrução deve trabalhar com:

**migration → efeito estrutural → evidência**

e não somente:

**migration name → estado final**.

### 7.4 O SGOM continua sendo a referência histórica

A evidência de 2026-09-15 identifica SGOM como projeto autoritativo. O LLMX deve ser tratado como fonte de recuperação parcial, não como substituto histórico automático.

---

## 8. Artefatos da Fase 4

Este relatório:

`docs/recovery/FASE-4-GIT-SGOM-MIGRATION-AUDIT-2026-09-21.md`

O snapshot estrutural da Fase 3 permanece:

- `docs/recovery/llmx-structural-snapshot-2026-09-21.sql`
- `docs/recovery/LLMX-STRUCTURAL-SNAPSHOT-2026-09-21.md`

## 9. Critério de conclusão

**ATENDIDO para a Fase 4.**

Foi estabelecida uma cadeia documental entre:

**SGOM histórico → LLMX recuperável → Git atual**

com contagens, listas, correspondências, divergências e commits de autoridade identificados.

### Limitação que passa para a Fase 5

A lista textual das 88 migrations do SGOM não foi recuperada. Temos a prova documental de que eram 88, mas não a relação completa dos nomes/efeitos.

Essa lacuna deve ser tratada na **Matriz de Divergência da Fase 5**, e não preenchida por inferência.
