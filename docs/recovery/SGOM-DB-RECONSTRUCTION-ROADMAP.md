# Recuperação Forense do Banco SGOM

## Objetivo

Reconstruir, com evidências, o estado do projeto Supabase canônico **SGOM** (sgomwklorpzdwdubtmgg) antes da exclusão acidental, preservando o banco LLMX (llmxnpgjpxcvyrqjkfwb) como fonte histórica não destrutiva.

**Regra:** nenhuma alteração destrutiva ou de produção durante as fases forenses.

## Status geral

- **Fase 1 — Congelamento e definição do alvo:** ✅ CONCLUÍDA
- **Fase 2 — Auditoria do projeto LLMX atual:** ✅ CONCLUÍDA
- **Fase 3 — Inventário estrutural detalhado do LLMX:** 🟡 EM ANDAMENTO
- **Fase 4 — Auditoria completa das migrations do Git e histórico SGOM:** 🟡 EM ANDAMENTO
- **Fase 5 — Matriz de divergência SGOM × LLMX × Git:** ⬜ PENDENTE
- **Fase 6 — Inventário e recuperação dos dados:** ⬜ PENDENTE
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
- Edge Functions: nenhuma identificada na auditoria anterior.
- Buckets históricos observados: ai-policy, case-documents, lgpd-exports, marketing-assets, skill-assets, whatsapp-media.

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

**Status: 🟡 EM ANDAMENTO — estrutura catalogada; documentação forense ainda não encerrada**

Confirmado diretamente no LLMX:

- 52 tabelas públicas;
- catálogo verbose de tabelas, colunas, tipos, defaults, nulabilidade, PKs e FKs;
- 202 constraints;
- 180 índices;
- 148 policies;
- 49/52 tabelas com RLS;
- 11 triggers não internos;
- 207 funções no schema public;
- enum public.user_role com valores citizen, admin;
- 0 views públicas;
- extensões instaladas/inventariadas;
- 0 Edge Functions.

Também foram identificados os 3 objetos sem RLS: messaging_contacts, messaging_conversations e messaging_messages. Isso é uma característica observada do LLMX e **não deve ser corrigida durante a recuperação forense**.

Ainda falta consolidar em artefatos versionados:

- catálogo completo de constraints por tabela;
- catálogo completo de índices;
- catálogo completo de policies;
- definições das funções relevantes, excluindo funções internas/overloads sem utilidade para reconstrução;
- grants;
- storage buckets, objetos e policies;
- realtime/publications;
- extensões relevantes para reconstrução;
- comparação estrutural objeto a objeto com Git e histórico SGOM.

**Critério de conclusão da Fase 3:** existir um snapshot estrutural versionado e reproduzível do LLMX, sem dados secretos e sem executar DDL no banco.

## Fase 4 — Auditoria Git/histórico

**Status: 🟡 EM ANDAMENTO**

Evidências já encontradas:

- Git atual possui 35 arquivos de migration.
- LLMX possui 58 registros de migration e 54 nomes únicos.
- Histórico SGOM documentado anteriormente indicou 88 migrations.
- 21 migrations atuais do Git possuem correspondência nominal no histórico LLMX.
- 14 migrations atuais do Git não possuem correspondência nominal direta no LLMX.
- A ausência nominal não será tratada como prova de ausência estrutural, pois há renomeações, squashes, substituições e migrations históricas fora do estado atual do Git.

Exemplos de divergência relevantes:

- 20260908000001_create_cases_table existe no Git atual, mas não aparece com esse nome no histórico LLMX; LLMX possui a tabela cases e migrations históricas relacionadas.
- Há migrations históricas do LLMX para user_profiles, commercial_orders, gateway de pagamentos, content_versions, publisher_jobs, documentos, notificações e outras estruturas que não correspondem diretamente ao conjunto atual de arquivos Git.
- Commit 4076f57f993e8d90b185c0efb53dd83a6fac9b04 registra explicitamente a distinção entre LLMX antigo e SGOM canônico.
- Commit 98b077ca6bc48943977c30ddb5f165e8fd6bc2ca força o cliente server-side para SGOM.
- Evidência loop/evidence/G1-01-2026-09-15.md registrou SGOM como autoridade e 88 migrations em 2026-09-15.

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

- Criada branch recovery/sgom-db-reconstruction.
- Iniciada documentação versionada da recuperação.
- Confirmado inventário estrutural do LLMX.
- Confirmadas contagens exatas de dados nas 52 tabelas públicas.
- Nenhuma alteração foi executada no banco LLMX.
- Nenhuma alteração foi executada no SGOM.
- Inventário verbose do schema e catálogo de segurança/configuração consultados em modo somente leitura.
