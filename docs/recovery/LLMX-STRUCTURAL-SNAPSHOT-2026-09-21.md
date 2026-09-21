# LLMX — Snapshot estrutural forense

**Data:** 2026-09-21  
**Projeto:** LLMX `llmxnpgjpxcvyrqjkfwb`  
**Branch:** `recovery/sgom-db-reconstruction`  
**Natureza:** auditoria somente leitura; nenhum DDL/DML foi executado.

## Resultado consolidado

| Item | Resultado |
|---|---:|
| Tabelas públicas | 52 |
| Constraints públicas | 202 |
| Índices públicos | 180 |
| Policies públicas | 148 |
| Tabelas públicas com RLS | 49/52 |
| Triggers públicos não internos | 11 |
| Funções normais no schema public | 207 |
| Views públicas | 0 |
| Edge Functions | 0 identificadas |
| Enum customizado | `public.user_role` |
| Valores do enum | `citizen`, `admin` |
| Buckets Storage | 6 |
| Objetos Storage | 8 |
| Publicação Realtime | `supabase_realtime` |

## RLS

As únicas tabelas públicas observadas sem RLS são:

- `messaging_contacts`
- `messaging_conversations`
- `messaging_messages`

Isso é evidência histórica do LLMX e não foi alterado durante a recuperação.

## Extensões instaladas relevantes

A inventariação do projeto confirmou como instaladas, entre outras:

- `pg_trgm` 1.6 — schema `public`
- `pgcrypto` 1.3 — schema `extensions`
- `uuid-ossp` 1.1 — schema `extensions`
- `citext` 1.6 — schema `public`
- `vector` 0.8.2 — schema `public`
- `pg_stat_statements` 1.11 — schema `extensions`
- `plpgsql` 1.0 — schema `pg_catalog`
- `supabase_vault` 0.3.1 — schema `vault`

A lista completa retornada pelo inventário de extensões deve ser tratada como catálogo de disponibilidade/instalação; apenas entradas com `installed_version` não nulo foram consideradas instaladas.

## Storage

Buckets observados:

| Bucket | Público | Limite |
|---|---|---:|
| ai-policy | não | 20 MiB |
| case-documents | não | 10 MiB |
| lgpd-exports | não | 50 MiB |
| marketing-assets | sim | 50 MiB |
| skill-assets | não | 5 MiB |
| whatsapp-media | não | 50 MiB |

Foram observados 8 objetos no bucket `marketing-assets`. Os nomes/metadados completos estão disponíveis apenas no banco auditado e serão tratados na Fase 7; não são reproduzidos aqui para evitar transformar este documento em inventário operacional de arquivos.

## Realtime

Existe a publicação `supabase_realtime`, configurada com operações INSERT/UPDATE/DELETE/TRUNCATE habilitadas. A publicação não está configurada como `FOR ALL TABLES`; a associação de tabelas deve ser preservada pelo snapshot SQL.

## Grants/ACL

As tabelas públicas observadas possuem ACL explícita para `postgres`, `anon`, `authenticated` e `service_role`. Os ACLs de Storage permanecem sob o modelo interno do Supabase.

## Funções e segurança

Foram catalogadas 207 funções normais em `public`, com assinatura, retorno, linguagem, volatilidade, atributo `SECURITY DEFINER`, leakproof e `proconfig`. As definições completas podem ser reproduzidas pelo SELECT de `pg_get_functiondef` no snapshot SQL.

Nenhuma função foi modificada.

## Artefato reprodutível

O catálogo completo é reproduzível executando, em modo somente leitura, o arquivo:

`docs/recovery/llmx-structural-snapshot-2026-09-21.sql`

Esse arquivo não contém DDL nem DML.

## Critério da Fase 3

**Atendido:** existe um snapshot estrutural versionado e reproduzível, cobrindo tabelas/colunas, constraints, índices, RLS/policies, triggers, funções, ACLs, enums, extensões, Realtime e Storage, sem alteração do banco.

## Limite importante

Este snapshot descreve **LLMX**, não prova que o estado era idêntico ao SGOM imediatamente antes da exclusão. A divergência será tratada nas Fases 4 e 5.
