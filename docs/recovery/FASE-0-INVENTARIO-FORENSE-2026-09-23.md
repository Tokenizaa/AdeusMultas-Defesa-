# FASE 0 — Inventário Forense do Banco Atual + Git

**Data:** 2026-09-23  
**Projeto canônico:** `Defesai-AdeusMultas`  
**Supabase:** `llmxnpgjpxcvyrqjkfwb`  
**Região:** `sa-east-1`  
**Status observado:** `ACTIVE_HEALTHY`  
**Postgres:** `17.6.1.141`  
**Repositório:** `Tokenizaa/AdeusMultas-Defesa-` / `main`

## 1. Regra desta fase

Esta fase foi executada **somente em leitura**.

Não foram executados:
- migrations;
- `apply_migration`;
- `ALTER TABLE`;
- `DROP`;
- `DELETE`;
- reset/restore;
- criação de novo projeto Supabase;
- alteração de Auth, Storage ou RLS.

Objetivo: estabelecer o estado real antes de qualquer recuperação.

## 2. Estado do projeto Supabase atual

O projeto `llmxnpgjpxcvyrqjkfwb` foi consultado diretamente e está ativo e saudável.

A configuração do Git confirma o mesmo projeto:

```
supabase/config.toml
project_id = "llmxnpgjpxcvyrqjkfwb"
```

A FASE 17 também registrou o realinhamento para este projeto nos commits `7f2c233be0d35490cc6aeb1ffb80d4c5911d45dd` e `d44b82ac2194eda261a1d8b040a5906745470df2`.

O projeto histórico `sgomwklorpzdwdubtmgg` não está acessível pela conexão Supabase atual: a tentativa direta retornou **permission denied**. Portanto, ele permanece classificado como **PROJETO HISTÓRICO / ACESSO NÃO DISPONÍVEL**, não como fonte atual de dados.

## 3. Dados preservados no banco atual

Contagens exatas consultadas em PostgreSQL:

| Objeto | Registros |
|---|---:|
| `auth.users` | **4** |
| `user_profiles` | **4** |
| `cases` | **60** |
| `payment_orders` | **14** |
| `e2e_test_runs` | **3** |
| `e2e_test_results` | **36** |
| `messaging_messages` | **1** |
| `documenso_envelopes` | 0 |
| `documenso_recipients` | 0 |
| `knowledge_sources` | 0 |
| `knowledge_documents` | 0 |
| `knowledge_document_versions` | 0 |
| `knowledge_chunks` | 0 |
| `knowledge_embeddings` | 0 |
| `knowledge_ingestions` | 0 |

**Conclusão:** existem dados de produção/teste preservados. `cases` e `payment_orders` não podem ser tratados como estruturas vazias.

A estimativa estatística de `pg_stat_user_tables` está desatualizada para algumas tabelas — por exemplo, estima 13 linhas em `cases` — enquanto a contagem SQL exata retorna 60. Para recuperação, a contagem exata é a referência.

## 4. Schema atual

Foram encontradas **52 tabelas em `public`**, todas com RLS habilitado no inventário atual.

Também foram observados:
- **153 policies** em `public`;
- **209 funções** em `public`;
- **11 triggers** não internos em `public`;
- **6 buckets** de Storage;
- **8 objetos** de Storage;
- extensões: `citext`, `pg_stat_statements`, `pg_trgm`, `pgcrypto`, `plpgsql`, `supabase_vault`, `uuid-ossp`, `vector`.

As famílias de schema confirmadas incluem cases, perfis, pagamentos, Documenso, messaging, marketing, conteúdo, notificações e RAG.

## 5. Auth

Inventário atual:
- `auth.users`: **4**;
- `user_profiles`: **4**;
- `user_profiles.user_id` é a chave primária e FK para `auth.users.id`.

Nenhum usuário foi alterado nesta fase.

## 6. Migrations — estado remoto

O histórico remoto consultado contém **64 registros** em `supabase_migrations.schema_migrations`.

Há evidência de duplicidades/linhagens históricas no próprio histórico remoto, por exemplo:
- `canonical_rag_schema` aparece 3 vezes com versões distintas;
- `create_messaging_tables` aparece 2 vezes;
- `20260829120004_add_journey_router_indexes` aparece 2 vezes.

Portanto, **64 registros não equivalem a 64 arquivos canônicos atuais**.

## 7. Migrations — Git

O Git atual contém **41 arquivos SQL de migration** em `supabase/migrations/` (excluindo o arquivo de teste `*.test.sql`).

A comparação nominal mostra que apenas uma parte possui o mesmo nome literal no histórico remoto. Muitos arquivos Git possuem o mesmo sufixo lógico de migrations remotas, mas timestamps/nomenclatura diferentes.

Isso caracteriza **drift/lineage histórico**, não autorização para reaplicar migrations.

Entre os arquivos Git relevantes estão:
- `20260908000001_create_cases_table.sql`;
- `20260908141600_add_applicant_json_to_cases.sql`;
- `20260915132153_enable_rls_cases.sql`;
- `20260921000001_fase_18_auth_rls_storage.sql`;
- `20260921000002_fase_18_rls_recursion_fix.sql`;
- `20260921000003_fase_18_role_update_hardening.sql`;
- `20260921000004_fase_18_drop_legacy_profile_update_policy.sql`;
- `20260921000005_fase_18_messaging_rls_contacts_conversations.sql`;
- `20260921000006_fase_19_add_applicant_json_cases.sql`.

A FASE 19 já documentou um caso concreto de drift: `applicant_json` existia no Git, mas não estava no banco canônico até a migration corretiva `20260921000006`.

## 8. Evidência de hardening recente

A documentação e os commits da FASE 18 confirmam que o projeto atual recebeu hardening de Auth/RLS/Storage, incluindo:
- RLS em `messaging_messages`;
- correção da escalação de role em `user_profiles`;
- correção de recursão de RLS;
- policies de ownership para `documents`;
- policies de ownership para `notification_subscriptions`;
- policies do bucket privado `case-documents`;
- correção de `search_path` em duas funções.

Nenhuma dessas alterações foi refeita nesta FASE 0.

## 9. Contradição histórica resolvida

O Git contém documentação pré-FASE 17 que apontava `sgomwklorpzdwdubtmgg` como autoritativo.

A FASE 17 registrou explicitamente que essa referência ficou histórica e que o canônico passou a ser `llmxnpgjpxcvyrqjkfwb`.

Portanto, para todos os gates atuais:

**CANÔNICO = `llmxnpgjpxcvyrqjkfwb`**

**HISTÓRICO / NÃO ACESSÍVEL = `sgomwklorpzdwdubtmgg`**

## 10. Classificação inicial de recuperação

| Item | Estado | Classificação |
|---|---|---|
| Banco atual | ativo, saudável | **RECUPERÁVEL** |
| `cases` | 60 registros | **RECUPERÁVEL** |
| `payment_orders` | 14 registros | **RECUPERÁVEL** |
| Auth | 4 usuários | **RECUPERÁVEL** |
| Storage | 6 buckets / 8 objetos | **RECUPERÁVEL** |
| Schema atual | 52 tabelas | **RECUPERÁVEL** |
| Migrations remotas | 64 registros | **RECUPERÁVEL** |
| Migrations Git | 41 SQL | **RECUPERÁVEL** |
| Projeto antigo `sgomwklorpzdwdubtmgg` | acesso negado | **KNOWLEDGE_GAP** até obter evidência independente |
| Dados antigos não presentes no atual | ainda não determinado | **PENDENTE DE MATRIZ** |
| Dados que não existem no banco nem no Git | ainda não determinado | **KNOWLEDGE_GAP**, sem invenção |

## 11. Resultado da FASE 0

**FASE 0 — INVENTÁRIO FORENSE: CONCLUÍDA.**

O banco atual está preservado e contém dados reais. Não existe justificativa técnica para reconstrução destrutiva neste momento.

### Próxima fase autorizada

**FASE 1 — MATRIZ DE LINEAGE `migration → schema → dados`**

A FASE 1 deverá cruzar, sem alterar o banco:
1. as 64 entradas de migration remotas;
2. os 41 arquivos SQL de migration do Git;
3. o schema efetivamente presente;
4. as colunas/índices/FKs/policies/triggers/functions relevantes;
5. os commits que introduziram cada alteração;
6. os gaps entre Git e banco;
7. o que é recuperável do banco atual;
8. o que é reconstruível pelo Git;
9. o que depende de acesso ao projeto antigo, backup/PITR ou suporte Supabase;
10. o que deve ser marcado definitivamente como `KNOWLEDGE_GAP`.

**Regra da FASE 1: nenhum `apply_migration` e nenhuma alteração de schema.**
