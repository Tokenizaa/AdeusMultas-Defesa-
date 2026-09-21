# Recuperação Forense do Banco SGOM

## Objetivo

Reconstruir, com evidências, o estado do projeto Supabase canônico **SGOM** (sgomwklorpzdwdubtmgg) antes da exclusão acidental, preservando o banco LLMX (llmxnpgjpxcvyrqjkfwb) como fonte histórica não destrutiva.

**Regra:** nenhuma alteração destrutiva ou de produção durante as fases forenses.

## Status geral

- **Fase 1 — Congelamento e definição do alvo:** ✅ CONCLUÍDA
- **Fase 2 — Auditoria do projeto LLMX atual:** ✅ CONCLUÍDA
- **Fase 3 — Inventário estrutural detalhado do LLMX:** ✅ CONCLUÍDA
- **Fase 4 — Auditoria completa das migrations do Git e histórico SGOM:** ✅ CONCLUÍDA
- **Fase 5 — Matriz de divergência SGOM × LLMX × Git:** ✅ CONCLUÍDA
- **Fase 6 — Inventário e recuperação dos dados:** ✅ CONCLUÍDA
- **Fase 7 — Recuperação de Storage e objetos:** ⬜ PENDENTE
- **Fase 8 — Recuperação de funções, triggers, RLS e configurações:** ⬜ PENDENTE
- **Fase 9 — Investigação de backup/PITR/Suporte do SGOM:** ⬜ PENDENTE
- **Fase 10 — Manifesto final de reconstrução:** ⬜ PENDENTE
- **Fase 11 — Criação de novo projeto de reconstrução:** ⬜ PENDENTE
- **Fase 12 — Recriação do schema:** ⬜ PENDENTE
- **Fase 13 — Reposição dos dados recuperáveis:** ⬜ PENDENTE
- **Fase 14 — Validação estrutural e funcional:** ⬜ PENDENTE
- **Fase 15 — Homologação e somente então cutover de produção:** ⬜ PENDENTE

## Fase 1 — Congelamento e definição do alvo

**Status: ✅ CONCLUÍDA**

- SGOM identificado como projeto Supabase canônico/histórico.
- LLMX identificado como projeto acessível que contém estado histórico parcial.
- Proibidas alterações destrutivas no LLMX.
- Proibido apontar produção para LLMX durante a recuperação.
- Objetivo definido como reconstrução do estado do SGOM, incluindo schema e dados.

## Fase 2 — Auditoria do LLMX

**Status: ✅ CONCLUÍDA**

Constatações confirmadas:

- 52 tabelas públicas.
- 202 constraints.
- 180 índices.
- 148 policies.
- 49/52 tabelas públicas com RLS habilitado.
- 11 triggers não internos.
- 207 funções no schema public.
- 1 enum customizado.
- 0 views públicas.
- Edge Functions: nenhuma identificada.
- 6 buckets Storage; 8 objetos observados.
- Publicação Realtime `supabase_realtime`.

### Dados atualmente preservados no LLMX

| Tabela | Registros |
|---|---:|
| app_settings | 28 |
| cases | 47 |
| collection_runs | 45 |
| content_versions | 12 |
| e2e_test_results | 36 |
| e2e_test_runs | 3 |
| editorial_content | 7 |
| marketing_automation_state | 1 |
| marketing_campaigns | 14 |
| marketing_lead_campaigns | 7 |
| marketing_leads | 102 |
| messaging_contacts | 2 |
| messaging_conversations | 2 |
| messaging_messages | 13 |
| payment_orders | 14 |
| payment_webhook_events | 2 |
| promotions | 1 |
| service_pricings | 11 |
| user_profiles | 4 |
| auth.users | 4 |

As demais tabelas públicas auditadas estão atualmente sem registros.

**Importante:** a existência desses dados no LLMX não prova que sejam idênticos ao estado do SGOM. Eles são evidência histórica para a reconstrução.

## Fase 3 — Inventário estrutural detalhado

**Status: ✅ CONCLUÍDA**

A auditoria somente leitura foi consolidada em dois artefatos versionados:

- `docs/recovery/llmx-structural-snapshot-2026-09-21.sql`
- `docs/recovery/LLMX-STRUCTURAL-SNAPSHOT-2026-09-21.md`

O snapshot reproduzível cobre:

- tabelas e colunas;
- tipos, defaults, nulabilidade, identidade;
- PKs, FKs, UNIQUE, CHECK e demais constraints;
- índices;
- RLS e policies;
- triggers não internos;
- funções normais de `public`, com assinatura, retorno, linguagem, volatilidade e atributos de segurança;
- definições de funções via `pg_get_functiondef`;
- ACLs/grants;
- enums;
- extensões;
- publicações Realtime;
- buckets, objetos e policies de Storage;
- contagens compactas para repetição da auditoria.

### Resultado estrutural confirmado

| Item | Resultado |
|---|---:|
| Tabelas públicas | 52 |
| Constraints públicas | 202 |
| Índices públicos | 180 |
| Policies públicas | 148 |
| Tabelas com RLS | 49/52 |
| Triggers públicos não internos | 11 |
| Funções normais em public | 207 |
| Views públicas | 0 |
| Edge Functions | 0 |
| Enum | public.user_role |
| Valores | citizen, admin |
| Buckets Storage | 6 |
| Objetos Storage | 8 |

As três tabelas públicas sem RLS permanecem documentadas como evidência, sem qualquer correção:

- `messaging_contacts`
- `messaging_conversations`
- `messaging_messages`

Extensões instaladas relevantes confirmadas: `pg_trgm`, `pgcrypto`, `uuid-ossp`, `citext`, `vector`, `pg_stat_statements`, `plpgsql` e `supabase_vault`.

A publicação `supabase_realtime` existe e não está configurada como publicação global de todas as tabelas.

**Critério de conclusão atendido:** existe snapshot estrutural versionado e reproduzível, sem DDL/DML e sem exposição de dados sensíveis no documento.

## Fase 4 — Auditoria Git/histórico

**Status: 🟡 EM ANDAMENTO**

Evidências já encontradas:

- Git atual possui 35 arquivos de migration.
- LLMX possui 58 registros de migration e 54 nomes únicos.
- Histórico SGOM documentado anteriormente indicou 88 migrations.
- 21 migrations SQL atuais do Git possuem correspondência semântica no histórico LLMX.
- 13 migrations SQL atuais do Git não possuem correspondência nominal direta no LLMX.
- O diretório contém 35 arquivos, sendo 34 migrations SQL e 1 teste SQL.
- A ausência nominal não será tratada como prova de ausência estrutural, pois há renomeações, squashes, substituições e migrations históricas fora do estado atual do Git.

Exemplos de divergência relevantes:

- `20260908000001_create_cases_table` existe no Git atual, mas não aparece com esse nome no histórico LLMX; LLMX possui a tabela `cases` e migrations históricas relacionadas.
- Há migrations históricas do LLMX para user_profiles, commercial_orders, gateway de pagamentos, content_versions, publisher_jobs, documentos, notificações e outras estruturas que não correspondem diretamente ao conjunto atual de arquivos Git.
- Commit `4076f57f993e8d90b185c0efb53dd83a6fac9b04` registra explicitamente a distinção entre LLMX antigo e SGOM canônico.
- Commit `98b077ca6bc48943977c30ddb5f165e8fd6bc2ca` força o cliente server-side para SGOM.
- Evidência `loop/evidence/G1-01-2026-09-15.md` registrou SGOM como autoridade e 88 migrations em 2026-09-15.

## Fase 4 — Auditoria Git/histórico

**Status: ✅ CONCLUÍDA**

Artefato final: `docs/recovery/FASE-4-GIT-SGOM-MIGRATION-AUDIT-2026-09-21.md`.

A auditoria consolidou a cadeia SGOM → LLMX → Git, confirmou 88 migrations históricas no SGOM por evidência de 2026-09-15, 58 registros/54 nomes únicos no LLMX e 35 arquivos/34 SQL no Git. Foram identificadas 21 correspondências semânticas e 13 migrations SQL do Git sem correspondência nominal direta. A ausência nominal não foi tratada como ausência estrutural.

## Fase 5 — Matriz de divergência

**Status: ⬜ PENDENTE**

Será criada uma matriz por objeto:

objeto → LLMX → Git → evidência histórica SGOM → status de recuperação

Classificação:

- **A — Recuperação direta:** objeto/dado ainda existe no LLMX.
- **B — Recuperação por Git:** schema/configuração está comprovada no Git.
- **C — Reconstrução por evidências combinadas:** LLMX + Git permitem reconstrução.
- **D — Dependência de backup/PITR/Suporte:** somente evidência externa ao LLMX/Git pode recuperar.
- **E — Não comprovado:** não há evidência suficiente ainda.

## Fase 5 — Matriz de divergência

**Status: ✅ CONCLUÍDA**

Artefato: `docs/recovery/FASE-5-MATRIZ-DIVERGENCIA-SGOM-LLMX-GIT-2026-09-21.md`.

A matriz classifica os objetos entre recuperação direta, Git, reconstrução combinada, dependência de backup/PITR/Suporte e não comprovado. Confirmou que o LLMX preserva uma base parcial recuperável, enquanto a equivalência histórica integral do SGOM ainda não pode ser afirmada. A principal lacuna é o estado SGOM não preservado no LLMX/Git.

## Fase 6 — Dados

**Status: ⬜ PENDENTE**

Objetivo:

1. inventariar todos os registros recuperáveis do LLMX;
2. identificar dependências entre tabelas;
3. preservar IDs e relações;
4. separar dados de produção, testes e configuração;
5. identificar dados potencialmente existentes no SGOM e ausentes no LLMX;
6. gerar posteriormente um plano de reimportação sem executar ainda.

Dados sensíveis não serão exportados desnecessariamente para documentação pública do Git.

## Fase 6 — Inventário e recuperação dos dados

**Status: ✅ CONCLUÍDA**

Artefato: `docs/recovery/FASE-6-INVENTARIO-RECUPERACAO-DADOS-2026-09-21.md`.

Foram auditadas as 52 tabelas públicas do LLMX: 19 possuem dados, 33 estão vazias e existem 351 registros públicos recuperáveis. O inventário confirma também 4 usuários Auth, 6 buckets e 8 objetos Storage. Nenhum dado foi alterado ou importado. A contagem não é considerada equivalente à contagem histórica do SGOM.

## Fase 7 — Storage

**Status: ⬜ PENDENTE**

Inventariar:

- buckets;
- objetos;
- metadados;
- políticas;
- referências nas tabelas;
- possibilidade de recuperação dos arquivos.

## Fase 8 — Funções, triggers, RLS e configuração

**Status: ⬜ PENDENTE**

Reconstruir a definição histórica de:

- funções;
- triggers;
- policies;
- grants;
- enum;
- extensões;
- realtime;
- configurações necessárias.

## Fase 9 — Backup/PITR/Suporte SGOM

**Status: ⬜ PENDENTE**

Investigar se existe qualquer caminho legítimo para recuperar diretamente o SGOM apagado:

- backup;
- PITR;
- projeto pausado/removido;
- retenção;
- suporte Supabase;
- snapshots ou artefatos externos.

Não presumir recuperação até existir evidência.

## Fase 10 — Manifesto final

**Status: ⬜ PENDENTE**

Produzir o manifesto definitivo contendo:

- schema;
- migrations;
- dados;
- storage;
- funções/triggers;
- RLS;
- configurações;
- lacunas;
- origem da evidência de cada objeto;
- ordem segura de reconstrução.

## Fases 11–15 — Reconstrução e validação

Só serão iniciadas depois que as fases forenses demonstrarem que temos evidência suficiente.

Nenhum novo projeto será criado antes do manifesto de reconstrução e da revisão das lacunas.

## Registro de execução

### 2026-09-21

- Fase 6 encerrada com inventário completo dos dados recuperáveis do LLMX.
- Criado `docs/recovery/FASE-6-INVENTARIO-RECUPERACAO-DADOS-2026-09-21.md`.
- Fase 5 encerrada com matriz SGOM × LLMX × Git.
- Criado `docs/recovery/FASE-5-MATRIZ-DIVERGENCIA-SGOM-LLMX-GIT-2026-09-21.md`.
- Fase 4 encerrada com auditoria completa Git/LLMX e evidência histórica SGOM.
- Criado `docs/recovery/FASE-4-GIT-SGOM-MIGRATION-AUDIT-2026-09-21.md`.
- Criada branch `recovery/sgom-db-reconstruction`.
- Iniciada documentação versionada da recuperação.
- Confirmado inventário estrutural do LLMX.
- Confirmadas contagens exatas de dados nas 52 tabelas públicas.
- Nenhuma alteração foi executada no banco LLMX.
- Nenhuma alteração foi executada no SGOM.
- Inventário verbose do schema e catálogo de segurança/configuração consultados em modo somente leitura.
- Fase 3 encerrada com snapshot estrutural reproduzível versionado em Git.
