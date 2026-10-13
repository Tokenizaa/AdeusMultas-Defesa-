# Reconciliação de migrations Supabase — 2026-10-13

Projeto: `llmxnpgjpxcvyrqjkfwb`

## Resultado

O schema remoto foi reconciliado de forma aditiva e verificado após backup:

- remoto: 71 registros de migration;
- local: 50 arquivos SQL;
- histórico remoto preservado, sem `migration repair` ou edição retroativa;
- três nomes históricos duplicados permanecem como registros imutáveis do remoto:
  - `20260816000001_canonical_rag_schema` (3 aplicações);
  - `create_messaging_tables` (2 aplicações);
  - `20260829120004_add_journey_router_indexes` (2 aplicações).

## Migrations corretivas aplicadas

| Intenção local | Registro remoto gerado | Estado |
|---|---|---|
| `security_hardening_and_indexes` | `20261013154239_security_hardening_and_indexes_v2` | aplicado e verificado |
| `drop_redundant_user_unique_keep_fk` | `20261013154633_drop_redundant_user_unique_keep_fk` | aplicado e verificado |
| `optimize_rls_and_extension_schema` | `20261013165658_optimize_rls_and_extension_schema` | aplicado e verificado |
| `consolidate_public_rls_policies` | `20261013165828_consolidate_public_rls_policies` | aplicado e verificado |

As duas últimas migrations locais também estão versionadas em `supabase/migrations/` para que novos ambientes recebam o mesmo estado. Os timestamps remotos são atribuídos pelo Supabase MCP e, por isso, não são artificialmente reescritos nos nomes locais.

## Evidências

- dump de schema anterior às correções: `/tmp/adeus-public-schema-before-advisor-fix.sql`, 151.721 bytes;
- backup completo anterior às mudanças de segurança: `/tmp/adeus-public-schema.sql` e `/tmp/adeus-public-data.sql`;
- foreign keys anteriormente sem índice: corrigidas;
- constraint única redundante de `user_profiles`: removida preservando a FK;
- extensões `vector`, `pg_trgm` e `citext`: movidas para `extensions`;
- policies permissivas: consolidadas por `anon`/`authenticated`, preservando os predicados com OR;
- RAG e dados `knowledge_*`: preservados e validados pela suíte golden.

Não foi feito `migration repair`, porque isso alteraria o histórico imutável sem um ancestral local 1:1 comprovado. O estado operacional está reconciliado; a diferença histórica permanece auditável e documentada.
