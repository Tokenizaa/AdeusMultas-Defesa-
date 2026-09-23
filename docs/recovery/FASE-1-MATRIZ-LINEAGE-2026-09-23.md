# FASE 1 — Matriz de Lineage: Migration → Schema → Dados

**Data:** 2026-09-23  
**Escopo:** reconstrução forense do histórico perdido do projeto Supabase antigo `sgomwklorpzdwdubtmgg`, usando Git + banco canônico sobrevivente `llmxnpgjpxcvyrqjkfwb`.

## Premissa operacional

O projeto antigo `sgomwklorpzdwdubtmgg` é considerado **definitivamente perdido e sem acesso/recuperação disponível** para esta linha de recuperação.

O projeto `llmxnpgjpxcvyrqjkfwb` permanece como o **banco canônico sobrevivente**. Ele não será tratado como fonte de dados do projeto antigo.

Esta fase é somente leitura. Nenhuma migration, alteração de schema, RLS, Auth, Storage ou dado foi executada.

## 1. Fontes cruzadas

Foram cruzados:

1. `supabase/config.toml`;
2. árvore atual do Git;
3. `supabase/migrations/*.sql`;
4. histórico/documentação de recuperação;
5. commits de realinhamento da FASE 17;
6. migrations registradas no banco sobrevivente;
7. schema efetivamente presente no banco sobrevivente;
8. contagens de dados já estabelecidas na FASE 0.

## 2. Resultado estrutural

O Git atual contém **41 migrations SQL efetivas** (excluindo `*.test.sql`).

O histórico remoto anteriormente inventariado contém **64 registros de migration**, mas esse histórico contém múltiplas linhagens/nomenclaturas e duplicidades. Portanto, não existe correspondência 1:1 entre “registro remoto” e “arquivo atual”.

Exemplos de divergência de nomenclatura:

| Git | Histórico remoto |
|---|---|
| `20260827000001_create_marketing_leads` | `create_marketing_leads` |
| `20260827000002_create_marketing_automation` | `create_marketing_automation` |
| `20260827000002_expand_commercial_catalog` | `expand_commercial_catalog` |
| `20260905000002_storage_access_policies_baseline` | `storage_access_policies_baseline` |
| `20260906134612_fase_3_1_persist_case_evidence_flags` | `fase_3_1_persist_case_evidence_flags` |
| `20260921000001_fase_18_auth_rls_storage` | `fase_18_auth_rls_storage` |
| `20260921000006_fase_19_add_applicant_json_cases` | `fase_19_add_applicant_json_cases` |

**Conclusão:** o histórico de migrations não pode ser usado mecanicamente para decidir quais arquivos devem ser reaplicados.

## 3. Schema sobrevivente

O banco canônico sobrevivente apresenta **52 tabelas públicas**, todas com RLS habilitado.

Entre as estruturas confirmadas:

- cases;
- user_profiles;
- payment_orders;
- documents;
- Documenso;
- messaging;
- marketing;
- editorial/content;
- notifications;
- AI execution logs;
- commercial;
- referral;
- payments;
- conhecimento/RAG;
- E2E/observabilidade.

A estrutura sobrevivente confirma que o Git contém uma parcela substancial da definição histórica do sistema.

## 4. Dados sobreviventes

O inventário da FASE 0 confirmou dados no banco sobrevivente:

| Estrutura | Dados |
|---|---:|
| `cases` | 60 |
| `payment_orders` | 14 |
| `auth.users` | 4 |
| `user_profiles` | 4 |
| `e2e_test_runs` | 3 |
| `e2e_test_results` | 36 |
| `messaging_messages` | 1 |
| estruturas RAG | 0 nas tabelas principais |

Esses dados pertencem ao projeto sobrevivente e **não devem ser apresentados como recuperação do antigo `sgomwklorpzdwdubtmgg`**.

## 5. Lineage de domínio

### Cases

O Git fornece reconstrução estrutural explícita de `public.cases`, incluindo:

- identidade do caso;
- referência comercial;
- usuário;
- dados do cliente;
- dados do veículo;
- infração;
- análise;
- evidências;
- defesa;
- protocolo;
- timeline;
- pagamento;
- anonimato/claim.

A migration `20260908000001_create_cases_table.sql` é uma evidência estrutural forte.

**Classificação:** schema **RECONSTRUÍVEL DO GIT**.

Dados históricos do projeto antigo: **KNOWLEDGE_GAP / PERDIDOS**.

### Applicant JSON

O Git contém `20260908141600_add_applicant_json_to_cases.sql`.

A FASE 19 registrou ainda uma correção de drift no banco sobrevivente por meio de `20260921000006_fase_19_add_applicant_json_cases.sql`.

**Classificação:** definição estrutural **RECUPERÁVEL DO GIT**; conteúdo histórico antigo **PERDIDO**.

### User profiles / Auth

O Git possui a cadeia de migrations de Auth e `user_profiles`, incluindo a correção explícita de `user_id`.

**Classificação:** schema **RECONSTRUÍVEL DO GIT**.

Os usuários existentes no banco sobrevivente não são evidência dos usuários do projeto antigo.

### Payments

Há migrations Git para `payment_orders` e demais estruturas comerciais/pagamentos.

**Classificação:** schema **RECONSTRUÍVEL DO GIT**.

Transações históricas que não estejam presentes no banco sobrevivente:

**PERDIDAS / KNOWLEDGE_GAP**.

### Messaging

O Git contém `create_messaging_tables` e migrations posteriores de hardening.

**Classificação:** schema **RECONSTRUÍVEL DO GIT**.

Mensagens históricas do projeto antigo:

**PERDIDAS**, salvo eventual cópia externa não localizada.

### Marketing / Conteúdo

Há migrations para:
- leads;
- campanhas;
- automação;
- segmentação;
- conteúdo editorial;
- versões;
- publisher jobs;
- mídia;
- collection runs.

**Classificação:** schema **RECONSTRUÍVEL DO GIT**.

Conteúdo/dados históricos que não estejam no banco sobrevivente ou em arquivos versionados:

**KNOWLEDGE_GAP / PERDIDO**.

### RAG / Knowledge Base

O banco sobrevivente possui o schema das estruturas RAG, porém as principais tabelas estão vazias.

O Git preserva a definição estrutural.

**Classificação:**
- schema: **RECUPERÁVEL/RECONSTRUÍVEL**;
- documentos/chunks/embeddings históricos: **PERDIDOS**, salvo fontes externas;
- conteúdo jurídico que existia somente no banco: **KNOWLEDGE_GAP**.

### Documenso

O schema está presente e as tabelas foram versionadas.

Os envelopes/recipients atuais estão vazios.

**Classificação:**
- schema: **RECONSTRUÍVEL**;
- envelopes/documentos históricos antigos: **PERDIDOS**.

### Storage

O banco sobrevivente ainda possui buckets e objetos.

Esses objetos são evidência do projeto sobrevivente e não serão atribuídos ao antigo sem prova de lineage.

**Classificação:** histórico do projeto antigo = **KNOWLEDGE_GAP/PERDIDO**.

## 6. FASE 17 como ponto de corte

Os commits:

- `7f2c233be0d35490cc6aeb1ffb80d4c5911d45dd`
- `d44b82ac2194eda261a1d8b040a5906745470df2`

documentaram a mudança do projeto considerado canônico.

Depois desse ponto:

`llmxnpgjpxcvyrqjkfwb` = canônico sobrevivente.

Antes desse ponto:

`sgomwklorpzdwdubtmgg` = referência histórica.

Como o segundo projeto é agora considerado definitivamente perdido, o Git passa a ser a principal fonte para reconstrução do **schema**, mas não dos **dados**.

## 7. Matriz final de recuperação

| Categoria | Schema | Dados históricos do antigo |
|---|---|---|
| Cases | **GIT** | **PERDIDOS** |
| Profiles/Auth | **GIT** | **PERDIDOS** |
| Payments | **GIT** | **PERDIDOS** |
| Documents | **GIT** | **PERDIDOS** |
| Documenso | **GIT** | **PERDIDOS** |
| Messaging | **GIT** | **PERDIDOS** |
| Marketing | **GIT** | **PERDIDOS** |
| Editorial/Content | **GIT** | **PARCIAL / GAP** |
| Notifications | **GIT + histórico** | **PERDIDOS** |
| RAG schema | **GIT** | **PERDIDOS** |
| RAG conteúdo | **GIT/schema** | **PERDIDOS** |
| E2E/observabilidade | **GIT + histórico** | **PARCIAL** |
| Storage | **GIT + sobrevivente** | **PERDIDOS** |
| RLS/policies | **GIT + sobrevivente** | **RECONSTRUÍVEIS** |
| Functions/triggers | **GIT + sobrevivente** | **RECONSTRUÍVEIS** |

## 8. Regra para reconstrução futura

Não será permitido:

- inventar registros históricos;
- fabricar clientes;
- fabricar pagamentos;
- fabricar documentos;
- fabricar conteúdo jurídico;
- fabricar embeddings/chunks;
- copiar dados do banco sobrevivente e atribuí-los ao projeto antigo sem evidência;
- reaplicar cegamente todas as migrations históricas.

Toda reconstrução deverá distinguir explicitamente:

`RECUPERADO` ≠ `RECONSTRUÍDO` ≠ `NOVO`

## 9. Resultado da FASE 1

**FASE 1 — MATRIZ DE LINEAGE: CONCLUÍDA.**

Resultado principal:

> O projeto antigo `sgomwklorpzdwdubtmgg` não é mais uma fonte operacional de recuperação. O **schema** pode ser reconstruído em grande parte a partir do Git e das evidências existentes. Os **dados históricos** que não estejam no banco sobrevivente, no Git ou em outra fonte externa devem ser tratados como **PERDIDOS/KNOWLEDGE_GAP**, nunca reconstruídos por inferência.

### Próxima fase

**FASE 2 — RECONSTRUÇÃO DO SCHEMA CANÔNICO**

Objetivo:
1. montar a especificação consolidada do schema;
2. identificar tabelas presentes no banco sobrevivente mas sem migration Git correspondente;
3. identificar migrations Git que representam estruturas ainda ausentes;
4. consolidar ordem/dependências;
5. separar migrations históricas de migrations necessárias para um banco novo;
6. gerar uma **baseline limpa**, sem executar;
7. validar contra o código atual.

**Regra:** a FASE 2 também deverá começar em modo somente leitura e planejamento. Nenhuma migration será aplicada até a baseline ser auditada.
