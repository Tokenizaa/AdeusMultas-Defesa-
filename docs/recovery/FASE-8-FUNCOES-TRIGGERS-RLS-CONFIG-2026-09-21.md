# Fase 8 — Recuperação de funções, triggers, RLS e configurações

**Data:** 2026-09-21  
**Branch:** `recovery/sgom-db-reconstruction`  
**Projeto auditado:** LLMX `llmxnpgjpxcvyrqjkfwb`  
**Projeto histórico alvo:** SGOM `sgomwklorpzdwdubtmgg`  
**Modo:** somente leitura.

## 1. Objetivo

Preservar e classificar a configuração operacional necessária para reconstruir o banco, cobrindo:

- funções próprias do domínio;
- triggers;
- RLS e policies;
- grants/ACLs de funções;
- enum;
- extensões;
- publicação Realtime;
- configurações relevantes do PostgreSQL;
- correspondência com o Git atual;
- lacunas históricas que ainda dependem do SGOM/backup/PITR.

Nenhuma alteração foi executada no LLMX.

## 2. Resultado executivo

A auditoria reproduzível confirmou:

| Item | Estado LLMX |
|---|---:|
| Funções públicas totais | 207 |
| Funções públicas pertencentes a extensões | 196 |
| Funções próprias do domínio | 11 |
| Funções próprias SECURITY DEFINER | 5 |
| Triggers públicos não internos | 11 |
| Policies públicas | 148 |
| Tabelas públicas com RLS | 49/52 |
| Tabelas públicas sem RLS | 3 |
| Enums públicos | 1 |
| Extensões | 8 |
| Publicações Realtime | 1 |

A diferença entre as **207 funções públicas** e as **11 funções próprias** é explicada pelas funções instaladas pelas extensões `vector`, `pg_trgm` e `citext`: 118 + 31 + 47 = 196.

## 3. Funções próprias recuperáveis

As 11 funções próprias do schema `public` permanecem diretamente recuperáveis no LLMX:

| Função | SECURITY DEFINER | Configuração |
|---|---|---|
| `admin_update_user_role(uuid,text)` | sim | search_path=public |
| `admin_update_user_role_by_email(text,text)` | sim | search_path=public |
| `current_user_id()` | não | search_path=public |
| `domain_to_uuid(text)` | não | sem configuração |
| `emit_event(...)` | sim | search_path=public |
| `handle_new_user()` | sim | search_path=public, auth |
| `handle_user_update()` | sim | search_path=public |
| `match_knowledge_chunks(...)` | não | search_path=public |
| `set_updated_at()` | não | search_path=public |
| `update_documenso_envelopes_updated_at()` | não | sem configuração |
| `update_updated_at_column()` | não | search_path="" |

As definições completas continuam disponíveis no snapshot estrutural versionado em:

`docs/recovery/llmx-structural-snapshot-2026-09-21.sql`

### Grants das funções próprias

- As duas funções administrativas e `emit_event` estão limitadas a `postgres` e `service_role`.
- `handle_new_user` e `handle_user_update` também estão limitadas a `postgres` e `service_role`.
- `current_user_id`, `domain_to_uuid`, `match_knowledge_chunks`, `set_updated_at`, `update_documenso_envelopes_updated_at` e `update_updated_at_column` mantêm EXECUTE para PUBLIC/anon/authenticated/service_role no estado observado.

Isso é **evidência do estado atual do LLMX**, não uma recomendação de alteração.

## 4. Triggers

Foram confirmados 11 triggers públicos não internos, todos habilitados:

| Tabela | Trigger | Função |
|---|---|---|
| cases | `trg_cases_updated` | `set_updated_at()` |
| coupons | `trg_coupons_updated` | `set_updated_at()` |
| documenso_envelopes | `trigger_update_documenso_envelopes_updated_at` | `update_documenso_envelopes_updated_at()` |
| editorial_content | `trg_editorial_content_updated` | `set_updated_at()` |
| marketing_campaigns | `trg_marketing_campaigns_updated` | `set_updated_at()` |
| meta_accounts | `trg_meta_accounts_updated` | `set_updated_at()` |
| payment_orders | `trg_payment_orders_updated` | `set_updated_at()` |
| promotion_campaigns | `trg_promotion_campaigns_updated` | `set_updated_at()` |
| referral_config | `trg_referral_config_updated` | `set_updated_at()` |
| user_profiles | `trg_user_profiles_updated` | `set_updated_at()` |
| user_profiles | `update_user_profiles_updated_at` | `update_updated_at_column()` |

### Observação importante

Os triggers `on_auth_user_created` e `on_auth_user_updated` descritos nas migrations de 2026-08-19 atuam sobre `auth.users`, portanto não aparecem na consulta restrita ao schema `public`.

As funções correspondentes `handle_new_user()` e `handle_user_update()` continuam presentes no LLMX e são evidência recuperável.

## 5. RLS e policies

O estado atual permanece:

- 49 das 52 tabelas públicas com RLS;
- 3 tabelas públicas sem RLS:
  - `messaging_contacts`;
  - `messaging_conversations`;
  - `messaging_messages`.
- 148 policies públicas.

O Supabase Security Advisor, consultado em 2026-09-21, também confirmou:

- 15 tabelas com RLS habilitado e sem policy, mantendo o comportamento deny-by-default para roles sujeitas a RLS;
- as 3 tabelas de messaging sem RLS;
- 2 funções com search_path mutável;
- 3 extensões instaladas no schema public;
- proteção contra senhas vazadas desabilitada no Auth.

Esses achados foram apenas registrados. Nenhuma correção foi aplicada durante a fase forense.

## 6. Funções SECURITY DEFINER

Existem 5 funções próprias SECURITY DEFINER:

1. `admin_update_user_role`;
2. `admin_update_user_role_by_email`;
3. `emit_event`;
4. `handle_new_user`;
5. `handle_user_update`.

O estado observado de grants mostra que as funções administrativas, `emit_event` e os handlers de Auth estão restringidos a `postgres`/service_role.

As migrations atuais do Git documentam explicitamente o endurecimento dos handlers e das funções administrativas:

- `20260819000002_revoke_public_trigger_functions_and_tighten_insert_policy.sql`;
- `20260829100002_harden_security_definer_functions.sql`;
- `20260829100003_fix_revoke_admin_functions_public.sql`.

## 7. Enum

Existe um único enum próprio:

`public.user_role`

Valores, na ordem:

1. `citizen`
2. `admin`

A criação e a conversão da coluna `user_profiles.role` para esse enum estão documentadas no Git pela migration:

`20260819000001_fix_user_profiles_trigger_and_role_enum.sql`

## 8. Extensões

Extensões observadas:

| Extensão | Versão |
|---|---:|
| citext | 1.6 |
| pg_stat_statements | 1.11 |
| pg_trgm | 1.6 |
| pgcrypto | 1.3 |
| plpgsql | 1.0 |
| supabase_vault | 0.3.1 |
| uuid-ossp | 1.1 |
| vector | 0.8.2 |

A migration Git `20260905000001_fix_domain_to_uuid_digest_schema.sql` confirma `pgcrypto` instalado no schema `extensions` e a utilização explícita de `extensions.digest()`.

O estado atual também registra que `vector`, `pg_trgm` e `citext` possuem funções no schema `public`.

## 9. Realtime

Existe a publicação:

`supabase_realtime`

Configuração observada:

- `puballtables = false`;
- INSERT = habilitado;
- UPDATE = habilitado;
- DELETE = habilitado;
- TRUNCATE = habilitado.

A consulta de relações da publicação não retornou tabelas explicitamente associadas naquele momento.

Isso deve ser tratado como configuração a verificar novamente durante a reconstrução, e não como prova de que o SGOM histórico possuía exatamente a mesma publicação.

## 10. Configurações PostgreSQL relevantes

Estado observado:

| Configuração | Valor | Origem |
|---|---|---|
| `default_transaction_isolation` | read committed | default |
| `jit` | off | configuration file |
| `lock_timeout` | 0 ms | default |
| `row_security` | on | configuration file |
| `search_path` | "$user", public | default |
| `session_replication_role` | origin | default |
| `standard_conforming_strings` | on | default |
| `statement_timeout` | 120000 ms | configuration file |

Esses valores são evidência do LLMX atual e não devem ser tratados automaticamente como configuração histórica do SGOM.

## 11. Cruzamento com Git

### Recuperação estrutural direta pelo Git atual

Há correspondência explícita para:

- `handle_new_user()`;
- `handle_user_update()`;
- `admin_update_user_role()`;
- `admin_update_user_role_by_email()`;
- `domain_to_uuid()`;
- políticas relacionadas a `user_profiles`;
- endurecimento de SECURITY DEFINER;
- RLS de tabelas internas;
- enum `user_role`.

### Funções presentes no LLMX, mas sem migration equivalente no conjunto atual do Git

Não foi encontrada migration atual com definição direta para:

- `current_user_id()`;
- `emit_event()`;
- `match_knowledge_chunks()`;
- `set_updated_at()`;
- `update_documenso_envelopes_updated_at()`;
- `update_updated_at_column()`.

Isso **não significa ausência histórica**. O LLMX conserva as definições atuais e a auditoria da Fase 4 já demonstrou que o histórico LLMX possui migrations que não estão representadas nominalmente no conjunto atual do Git.

## 12. Classificação de recuperação

| Objeto | Evidência LLMX | Evidência Git atual | Classificação |
|---|---|---|---|
| 11 funções próprias | direta | parcial | A + B/C |
| 11 triggers public | direta | parcial | A + B/C |
| 148 policies | direta | parcial | A + B/C |
| RLS 49/52 | direta | parcial | A + B/C |
| 3 tabelas sem RLS | direta | documentada parcialmente | A + C |
| enum user_role | direta | direta | A + B |
| extensões | direta | parcial | A + B/C |
| Realtime | direta | insuficiente | A + E histórico |
| configurações PostgreSQL | direta | insuficiente | A + E histórico |
| grants/ACLs | direta | parcial | A + C |

**A:** estado diretamente observável no LLMX.  
**B:** comprovado estruturalmente pelo Git.  
**C:** reconstrução segura exige cruzamento LLMX + Git/histórico.  
**E:** equivalência histórica com o SGOM ainda não comprovada.

## 13. Lacunas que permanecem

A Fase 8 não permite afirmar:

- que as 148 policies atuais sejam idênticas às policies existentes no SGOM imediatamente antes da exclusão;
- que os grants atuais reproduzam integralmente os grants do SGOM;
- que a configuração Realtime atual seja historicamente equivalente;
- que as configurações PostgreSQL atuais sejam as mesmas do SGOM;
- que funções/triggers existentes no histórico SGOM e ausentes do LLMX possam ser recuperados sem backup/PITR;
- que a ordem histórica das migrations possa ser reproduzida somente pelo estado atual do LLMX.

Essas lacunas permanecem para a Fase 9 e para o manifesto final.

## 14. Integridade operacional

- Nenhuma função foi alterada.
- Nenhum trigger foi alterado.
- Nenhuma policy foi alterada.
- RLS não foi habilitado/desabilitado.
- Nenhum grant foi alterado.
- Nenhuma extensão foi instalada/removida/movida.
- Realtime não foi alterado.
- Nenhuma configuração foi alterada.

## 15. Conclusão

**FASE 8 — CONCLUÍDA.**

O LLMX preserva o conjunto operacional necessário para reconstruir as funções próprias, triggers, RLS/policies, enum, extensões, Realtime e grants atuais. O Git atual cobre parte relevante desse estado, especialmente os objetos de Auth/RLS/segurança, mas não cobre nominalmente todas as funções próprias observadas.

A evidência atual é suficiente para preservar o estado do LLMX como fonte de reconstrução, mas **não é suficiente para declarar equivalência histórica integral com o SGOM**.

A próxima etapa é a **Fase 9 — Investigação de backup/PITR/Suporte do SGOM**, sem criação de novo projeto e sem qualquer cutover.
