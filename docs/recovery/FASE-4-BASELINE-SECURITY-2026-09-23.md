# FASE 4 — Baseline de Functions, Triggers e Policies — 2026-09-23

## Objetivo

Construir uma representação fiel do estado atual do Supabase canônico antes de qualquer reconstrução ou limpeza.

Projeto canônico: `llmxnpgjpxcvyrqjkfwb`

## Resultado desta rodada

### Functions

Foi feita a separação entre funções próprias da aplicação e funções fornecidas por extensões.

Snapshot:
- 209 funções públicas no total;
- 161 funções em C, 15 internas e 27 em SQL/PLpgSQL;
- as funções C/internal observadas pertencem ao ecossistema de extensões, principalmente pgvector/citext, e não devem ser reproduzidas manualmente como functions da aplicação;
- baseline criada em `supabase/recovery/BASELINE-20260923-FUNCTIONS.sql`.

As funções de aplicação capturadas incluem:
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

Baseline criada em:
`supabase/recovery/BASELINE-20260923-TRIGGERS.sql`

Foi preservada explicitamente a duplicação de `user_profiles.updated_at`:
- `trg_user_profiles_updated` → `set_updated_at()`;
- `update_user_profiles_updated_at` → `update_updated_at_column()`.

Nenhum dos dois foi removido.

### Policies

O canônico possui 153 policies públicas.

A extração direta completa foi limitada pelo tamanho da resposta da interface de execução; portanto **não foi criada uma baseline de policies incompleta e apresentada como completa**.

A baseline de policies anterior continua marcada como incompleta e não deve ser usada para reconstrução.

Próxima ação específica: extrair as 153 policies em lotes determinísticos e materializar a baseline completa.

## Security Advisors

A execução dos advisors de segurança identificou:

1. 16 tabelas com RLS habilitado e sem policy;
2. 3 extensões instaladas em `public`: vector, pg_trgm e citext;
3. `current_role_name()` e `is_admin()` são SECURITY DEFINER e executáveis por anon/authenticated;
4. proteção contra senhas vazadas está desabilitada.

Esses achados são **observações de segurança**, não alterações automáticas. Nenhum foi corrigido nesta fase porque o objetivo ainda é recuperar e documentar o estado canônico antes de alterar comportamento.

## Regra de reconstrução

Nenhuma baseline será aplicada ao projeto canônico.

O próximo ambiente de validação deve ser descartável e servir para:
1. reproduzir schema;
2. aplicar functions;
3. aplicar triggers;
4. aplicar policies;
5. comparar contagens e definições;
6. executar Golden Path;
7. somente então avaliar correções de segurança ou simplificações.

## Status

**FASE 4 — EM EXECUÇÃO.**

Functions: **CAPTURADAS**  
Triggers: **CAPTURADOS**  
Policies: **PENDENTES DE EXTRAÇÃO COMPLETA**  
Aplicação ao canônico: **NÃO EXECUTADA**
