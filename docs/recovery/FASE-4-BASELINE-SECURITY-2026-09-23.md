# FASE 4 — Baseline de Functions, Triggers e Policies — 2026-09-23

## Objetivo

Construir uma representação fiel do estado atual do Supabase canônico antes de qualquer reconstrução ou limpeza.

Projeto canônico: `llmxnpgjpxcvyrqjkfwb`

## Resultado desta rodada

### Functions

Foi feita a separação entre funções próprias da aplicação e funções fornecidas por extensões.

Snapshot:
- 203 funções públicas no total (snapshot atual; o número 209 registrado anteriormente era um snapshot anterior e foi corrigido nesta rodada);
- 161 funções em C, 15 internas e 27 em SQL/PLpgSQL;
- 14 das 27 funções SQL/PLpgSQL são extension-owned (citext) e foram excluídas da baseline da aplicação; as 13 restantes são funções próprias da aplicação;
- 13 funções SQL/PLpgSQL não pertencentes a extensões foram capturadas integralmente em `supabase/recovery/BASELINE-20260923-FUNCTIONS.sql`.

Funções de aplicação capturadas:
- `match_knowledge_chunks`
- `set_updated_at`
- `emit_event`
- `current_user_id`
- `handle_new_user`
- `handle_user_update`
- `update_updated_at_column`
- `admin_update_user_role`
- `admin_update_user_role_by_email`
- `update_documenso_envelopes_updated_at`
- `domain_to_uuid`
- `is_admin`
- `current_role_name`

A baseline preserva o estado atual. Ela não corrige silenciosamente funções históricas potencialmente inconsistentes.

### Triggers

Snapshot:
- 11 triggers públicos não internos;
- 2 triggers adicionais em `auth.users`, responsáveis pelos eventos de criação/atualização de usuário.

Baseline:
`supabase/recovery/BASELINE-20260923-TRIGGERS.sql`

Foi preservada explicitamente a duplicação de `user_profiles.updated_at`:
- `trg_user_profiles_updated` → `set_updated_at()`;
- `update_user_profiles_updated_at` → `update_updated_at_column()`.

Nenhum dos dois foi removido.

### Policies

O canônico possui **153 policies públicas**.

A baseline completa foi materializada em:

`supabase/recovery/BASELINE-20260923-POLICIES.sql`

A extração foi feita em lotes determinísticos por faixa de tabelas, preservando:
- nome da policy;
- tabela;
- permissive/restrictive;
- roles;
- comando;
- `USING`;
- `WITH CHECK`.

A baseline é somente uma representação do estado atual. Ela não deve ser aplicada diretamente ao canônico.

### Verificação

Foi criado um script somente leitura:

`supabase/recovery/VERIFY-BASELINE-SECURITY-20260923.sql`

Ele permite conferir:
- quantidade de policies;
- quantidade de funções públicas;
- quantidade de triggers públicos não internos;
- tabelas com RLS sem policy;
- identidade e expressões das 153 policies.

## Security Advisors

A execução dos advisors de segurança identificou:

1. 16 tabelas com RLS habilitado e sem policy;
2. 3 extensões instaladas em `public`: vector, pg_trgm e citext;
3. `current_role_name()` e `is_admin()` são SECURITY DEFINER e executáveis por anon/authenticated;
4. proteção contra senhas vazadas está desabilitada.

Esses achados continuam sendo **observações de segurança**, não alterações automáticas. Nenhum foi corrigido nesta fase porque o objetivo ainda é recuperar e documentar o estado canônico antes de alterar comportamento.

## Regra de reconstrução

Nenhuma baseline foi aplicada ao projeto canônico.

O próximo gate é a validação da baseline em ambiente descartável ou, se não houver ambiente/crédito disponível, uma validação estrutural completa sem escrita no canônico.

Sequência:
1. reproduzir schema;
2. aplicar functions;
3. aplicar triggers;
4. aplicar policies;
5. comparar contagens e definições;
6. executar Golden Path;
7. somente então avaliar correções de segurança ou simplificações.

## Status

**FASE 4 — BASELINE DE SEGURANÇA CAPTURADA.**

Functions: **CAPTURADAS — 13 de aplicação; 14 funções SQL de extensão excluídas**  
Triggers: **CAPTURADOS — 11 públicos + 2 auth.users**  
Policies: **CAPTURADAS — 153/153**  
Verificação: **CRIADA**  
Aplicação ao canônico: **NÃO EXECUTADA**  
Validação em ambiente descartável: **PENDENTE**
