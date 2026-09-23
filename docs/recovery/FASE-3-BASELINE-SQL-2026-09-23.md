# FASE 3 — Construção da Baseline SQL Reconstruída

**Data:** 2026-09-23  
**Projeto canônico:** `llmxnpgjpxcvyrqjkfwb`  
**Modo:** reconstrução no Git; **nenhuma migration foi aplicada ao Supabase**.

## Resultado

Foi criada uma baseline SQL consolidada a partir do schema sobrevivente do projeto canônico:

- `supabase/recovery/BASELINE-20260923.sql`
- 52 tabelas públicas reconstruídas;
- chaves primárias reconstruídas;
- foreign keys observadas reconstruídas;
- RLS habilitado nas tabelas reconstruídas;
- extensões `pgcrypto`, `pg_trgm` e `vector` declaradas;
- checks, defaults e tipos observados nas colunas incorporados quando expostos pelo inventário;
- o arquivo **não é uma concatenação das migrations históricas**.

Também foi criado o artefato reservado para políticas:

- `supabase/recovery/BASELINE-20260923-POLICIES.sql`

A extração automática das 153 policies não foi considerada concluída nesta rodada porque a resposta do conector não entregou o lote completo de forma confiável. Portanto, **não foi inventada nenhuma policy**.

## Limitação importante

A baseline SQL desta fase deve ser considerada **baseline estrutural**, não ainda uma baseline final pronta para reconstrução de um banco vazio.

Ainda precisam ser consolidados e validados:

1. 153 policies RLS completas;
2. índices e constraints UNIQUE não expostos integralmente pelo inventário compacto;
3. funções públicas;
4. triggers;
5. tipos/domínios auxiliares que não sejam enums;
6. dependências especiais de Auth/Storage;
7. validação em banco descartável.

## Segurança

Nenhuma alteração foi executada no projeto canônico.

Não houve:
- `apply_migration`;
- alteração de tabela;
- alteração de policy;
- alteração de função;
- alteração de Storage;
- alteração de dados.

## Regra de reconstrução

O arquivo produzido representa o **estado estrutural observado**, e não o histórico de alterações.

As migrations históricas continuam sendo evidência de lineage e devem ser usadas para complementar objetos que não possam ser reconstruídos apenas pelo snapshot atual.

## Próxima etapa

A FASE 4 deve validar a baseline em ambiente isolado/descartável, mas somente depois de fechar os objetos de segurança e dependências que ainda faltam.

**Status:** FASE 3 — **EXECUTADA / BASELINE ESTRUTURAL CONSTRUÍDA, PENDENTE DE FECHAMENTO DOS OBJETOS DE SEGURANÇA E VALIDAÇÃO**.
