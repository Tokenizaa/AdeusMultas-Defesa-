# Fase 13 — Reposição dos dados recuperáveis

**Data:** 2026-09-21  
**Branch:** `recovery/sgom-db-reconstruction`  
**Alvo:** Supabase LLMX `llmxnpgjpxcvyrqjkfwb`  
**Fonte histórica:** SGOM `sgomwklorpzdwdubtmgg` (excluído)

## 1. Objetivo

Executar a reposição somente dos dados que possuem evidência recuperável, preservando o estado já existente no LLMX e sem inventar registros históricos do SGOM.

## 2. Resultado

A reposição física por INSERT/UPSERT **não foi executada**, porque os dados classificados como diretamente recuperáveis já estão preservados no próprio LLMX.

O LLMX permanece com:

- 19 tabelas públicas contendo dados;
- 351 registros públicos;
- 4 usuários em `auth.users`;
- 6 buckets Storage;
- 8 objetos Storage.

As contagens das 19 tabelas preservadas são:

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

**Total: 351 registros.**

## 3. Investigação de fontes externas

Foram verificadas as fontes de recuperação disponíveis no contexto desta reconstrução:

- histórico/documentação versionada no Git;
- diretório `supabase/` do branch de reconstrução;
- migrations atuais;
- buscas por dumps/exports/seeds e instruções de `pg_dump`/`supabase db dump`;
- arquivos disponíveis na Library/conversação.

Não foi localizado dump completo do SGOM nem conjunto de INSERTs/seed que permita repor dados exclusivos do projeto apagado.

O diretório atual `supabase/` contém configuração e migrations, sem diretório de seeds/dump recuperável identificado.

## 4. Decisão de preservação

Como o LLMX já contém os 351 registros recuperáveis, executar INSERT/UPSERT sobre os mesmos dados seria redundante e aumentaria o risco de:

- duplicação;
- alteração de timestamps;
- disparo desnecessário de triggers;
- alteração de relações;
- corrupção do estado histórico já preservado.

Portanto, a decisão técnica desta fase é **preservar o dataset existente como fonte de recuperação**, sem reescrevê-lo.

## 5. O que foi comprovado

### Recuperável diretamente

- 351 registros públicos atualmente preservados;
- 4 usuários Auth;
- estrutura das 52 tabelas;
- relações e constraints já verificadas na Fase 12;
- Storage já preservado no LLMX.

### Não recuperável por evidência disponível

- registros exclusivos do SGOM que não existem no LLMX;
- dados históricos das 33 tabelas atualmente vazias;
- dump completo do SGOM;
- backup/PITR do SGOM;
- lista completa das 88 migrations históricas;
- objetos Storage exclusivos sem cópia.

A ausência de registros nas 33 tabelas vazias **não** é interpretada como prova de que elas estavam historicamente vazias.

## 6. Integridade e segurança da operação

Nenhuma operação destrutiva foi executada.

Nesta fase:

- `INSERT = 0`;
- `UPDATE = 0`;
- `DELETE = 0`;
- `TRUNCATE = 0`;
- `DROP = 0`;
- `ALTER = 0`.

O LLMX não foi zerado e nenhum dado existente foi sobrescrito.

## 7. Limite histórico

O dataset preservado deve ser denominado:

**dados recuperáveis preservados no LLMX**

e não:

**cópia completa dos dados históricos do SGOM**.

Essa distinção permanece obrigatória porque o projeto SGOM original e seus backups foram excluídos.

## 8. Critério de conclusão

A Fase 13 é considerada concluída porque:

1. o inventário de dados recuperáveis já existia;
2. as fontes externas disponíveis foram verificadas;
3. não foi encontrado dump/seed completo adicional;
4. os dados recuperáveis já estão no alvo LLMX;
5. nenhuma reescrita redundante foi feita;
6. as perdas e lacunas foram documentadas.

## 9. Próxima fase

**Fase 14 — Validação estrutural e funcional.**

A próxima etapa deverá comparar o estado real do LLMX contra:

- snapshot estrutural;
- manifesto final;
- inventário de dados;
- funções/triggers/RLS;
- Storage;
- migrations e evidências do Git.

A validação deverá separar divergências históricas comprovadas de divergências que não podem ser determinadas devido à perda do SGOM.
