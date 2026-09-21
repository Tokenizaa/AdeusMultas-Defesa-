# Fase 6 — Inventário e recuperação dos dados

**Data:** 2026-09-21  
**Branch:** `recovery/sgom-db-reconstruction`  
**Fonte de dados:** projeto Supabase LLMX `llmxnpgjpxcvyrqjkfwb`  
**Modo:** somente leitura. Nenhum dado foi alterado, removido ou importado.

## 1. Objetivo

Inventariar os dados que ainda existem no LLMX, separar dados efetivamente recuperáveis de tabelas apenas estruturais e definir a ordem/estratégia de recuperação para uma futura reconstrução.

## 2. Resultado geral

O LLMX contém:

- **52 tabelas públicas**;
- **19 tabelas com dados**;
- **33 tabelas sem dados**;
- **351 registros nas tabelas públicas não vazias**;
- **4 usuários em `auth.users`**, conforme auditoria anterior;
- **6 buckets Storage**;
- **8 objetos Storage**, todos observados no bucket `marketing-assets`.

Os 351 registros são evidência de dados preservados no LLMX, **não uma contagem histórica comprovada do SGOM**.

## 3. Inventário completo das tabelas

### Tabelas com dados — recuperação direta do LLMX

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

### Tabelas vazias no LLMX

As seguintes tabelas permanecem somente como estrutura, sem registros recuperáveis:

- ai_execution_logs
- audit_logs
- bonus_ledger
- commercial_audit_log
- commercial_offers
- commercial_orders
- commission_ledger
- commissions
- coupons
- documenso_envelopes
- documenso_recipients
- documenso_webhook_events
- documents
- knowledge_chunks
- knowledge_document_versions
- knowledge_documents
- knowledge_embeddings
- knowledge_ingestions
- knowledge_sources
- marketing_automation_queue
- marketing_messages
- meta_accounts
- meta_tokens
- notification_subscriptions
- notifications
- orders
- payment_events
- payments
- platform_events
- promotion_campaigns
- publisher_jobs
- referral_config
- referral_relations

**Importante:** tabela vazia no LLMX não significa que estava vazia no SGOM.

## 4. Classificação de recuperação

### Classe A — Dados diretamente recuperáveis

As 19 tabelas não vazias possuem registros atualmente acessíveis no LLMX.

A recuperação futura poderá partir desses registros, preservando os valores originais, sem reconstrução manual.

### Classe B — Estrutura sem dados

As 33 tabelas vazias possuem definição estrutural no LLMX, mas nenhum registro recuperável.

A futura reconstrução deverá obter dados dessas tabelas por outras fontes caso seja comprovado que existiam no SGOM.

### Classe C — Dados dependentes de relacionamento

As tabelas abaixo possuem relacionamentos que exigem ordem de importação e validação de chaves:

- cases
- user_profiles
- payment_orders
- payment_webhook_events
- content_versions
- marketing_lead_campaigns
- messaging_conversations
- messaging_messages
- e2e_test_results
- e2e_test_runs

A ordem definitiva deverá ser derivada das FK do snapshot estrutural antes de qualquer importação.

### Classe D — Dados potencialmente perdidos

Toda tabela vazia que possua evidência histórica de uso no Git, documentação, Storage ou aplicação entra como candidata a recuperação externa.

Isso inclui especialmente domínios que aparecem em migrations históricas mas estão vazios no LLMX.

## 5. Storage

O inventário anterior confirmou seis buckets:

- ai-policy
- case-documents
- lgpd-exports
- marketing-assets
- skill-assets
- whatsapp-media

Foram encontrados **8 objetos**, todos em `marketing-assets`.

Os objetos possuem metadados de criação, atualização, tamanho e MIME type. Não foram copiados para o Git e nenhum conteúdo foi alterado.

**Decisão:** Storage será tratado integralmente na Fase 7. Este inventário não assume que os 8 objetos representam o conteúdo histórico completo do SGOM.

## 6. Política de preservação

Nesta fase **não foi feita exportação de conteúdo bruto para o Git**.

Motivos:

1. existem dados potencialmente pessoais;
2. o Git não é o destino apropriado para backup de dados;
3. a prioridade atual é preservar evidência e definir a estratégia de recuperação;
4. a futura reposição deve ser feita em banco de reconstrução controlado, após o manifesto final.

Os registros permanecem no LLMX sem qualquer alteração.

## 7. Ordem de recuperação futura

A reposição dos dados deverá seguir esta lógica:

1. schema completo;
2. enums/extensions necessários;
3. tabelas-base sem dependências;
4. `user_profiles` e referências de autenticação;
5. dados de domínio;
6. tabelas dependentes por FK;
7. índices;
8. triggers/functions;
9. RLS/policies;
10. Storage;
11. validação de contagens e integridade referencial.

A ordem é deliberadamente posterior à reconstrução do schema e **não será executada nesta fase**.

## 8. Lacunas críticas

O inventário não permite determinar:

- quantos registros existiam no SGOM imediatamente antes da perda;
- quais registros foram criados somente no SGOM;
- quais registros foram apagados antes de o LLMX ser congelado;
- se existiam objetos Storage adicionais no SGOM;
- se as 33 tabelas vazias tinham dados no SGOM.

Essas questões permanecem como recuperação externa e serão cruzadas com evidências do Git, aplicação, Storage e eventual backup/PITR.

## 9. Conclusão da Fase 6

**FASE 6 — CONCLUÍDA.**

O LLMX foi inventariado integralmente em nível de dados:

- 52 tabelas analisadas;
- 19 com dados;
- 33 vazias;
- 351 registros públicos recuperáveis;
- 4 usuários Auth já identificados;
- 6 buckets;
- 8 objetos Storage identificados.

Nenhum dado foi modificado.

A próxima etapa é a **Fase 7 — Recuperação de Storage e objetos**, separando o que ainda existe no LLMX do que precisará ser localizado em fontes externas.
