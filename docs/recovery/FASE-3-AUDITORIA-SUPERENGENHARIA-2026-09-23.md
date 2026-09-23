# Auditoria de Superengenharia e Uso Real do Schema — 2026-09-23

## Objetivo

Avaliar se a reconstrução da Fase 3 está reproduzindo complexidade histórica desnecessária.

**Regra:** nenhuma tabela, função, policy, trigger ou dado foi removido ou alterado nesta auditoria.

## Snapshot do banco canônico

Projeto: `llmxnpgjpxcvyrqjkfwb`

- 52 tabelas públicas
- 153 policies RLS
- 203 funções públicas
- 11 triggers públicos não internos
- 180 índices públicos

Dados atuais observados:
- `cases`: 13
- `user_profiles`: 2
- `messaging_messages`: 1
- `payment_orders`: dados existentes
- demais tabelas públicas: sem dados atuais relevantes no snapshot consultado

A ausência de dados não é, isoladamente, motivo para remoção.

## Evidência de uso no código

A auditoria foi feita contra o `main` do GitHub e focou primeiro nas rotas que representam o produto e seus módulos.

### Núcleo confirmado

| Tabela | Evidência atual | Classificação |
|---|---|---|
| cases | usada diretamente em rotas de casos, documentos, defesa, pagamentos e administração | CORE |
| documents | usada diretamente em documentos, casos/pagamentos/admin | CORE |
| payment_orders | usada diretamente na rota de pagamentos e administração | CORE |
| user_profiles | usada diretamente na administração e no modelo de autorização | CORE/SUPORTE |
| orders | referenciada no fluxo de pagamentos | SUPORTE/COMERCIAL |

### Módulos com consumidores claros

**Marketing/automação**
- marketing_campaigns
- marketing_lead_campaigns
- marketing_leads
- marketing_messages
- marketing_automation_queue
- collection_runs
- editorial_content

Essas tabelas possuem consumidores diretos nas rotas atuais. Portanto não podem ser classificadas como legado apenas por estarem vazias.

**Comercial**
- promotions
- coupons
- commissions

Há referências na rota comercial. O restante do conjunto comercial ainda precisa de auditoria nos serviços/repositórios antes de qualquer conclusão.

**E2E/Admin**
- e2e_test_runs

Possui consumidor administrativo. Deve ser tratado como infraestrutura de testes/admin, não como core B2C.

### Módulos que não apresentaram uso direto nas rotas auditadas

Não foram encontrados consumidores diretos nas principais rotas analisadas para:
- payment_events
- payment_webhook_events
- notifications
- notification_subscriptions
- ai_execution_logs
- app_settings
- audit_logs
- knowledge_sources
- knowledge_documents
- knowledge_document_versions
- knowledge_chunks
- knowledge_embeddings
- knowledge_ingestions
- marketing_automation_state
- content_versions
- publisher_jobs
- commercial_offers
- commercial_orders
- commission_ledger
- bonus_ledger
- referral_relations
- referral_config
- promotion_campaigns
- service_pricings
- documenso_envelopes
- documenso_recipients
- documenso_webhook_events
- messaging_contacts
- messaging_conversations
- e2e_test_results
- platform_events

**Importante:** "sem uso direto nas rotas auditadas" NÃO significa "sem uso no projeto". Serviços, repositories, workers, jobs, componentes administrativos e funções SQL ainda precisam ser cruzados.

## Achado principal de superengenharia

A estrutura do repositório e do banco contém diversos subsistemas paralelos:

1. núcleo de casos/documentos;
2. pagamentos;
3. RAG/knowledge;
4. marketing/prospecção/automação;
5. comercial/MLM;
6. Documenso;
7. messaging;
8. observabilidade/auditoria;
9. infraestrutura de E2E;
10. múltiplas integrações.

Isso confirma que a baseline não deve ser fechada simplesmente copiando os 52 objetos.

Também foi observado que o repositório contém camadas e artefatos históricos/alternativos (por exemplo arquivos `.bak`, `.fix`, múltiplos diretórios de integração e extensa infraestrutura de agentes). Isso reforça a necessidade de distinguir arquitetura atual de legado antes da reconstrução.

## Decisão da reconstrução

A baseline definitiva seguirá esta regra:

> **Objeto só entra como obrigatório quando houver evidência de que é necessário ao produto atual, à segurança, à persistência de dados existente ou a uma funcionalidade explicitamente mantida.**

Categorias:

- **CORE** — indispensável ao fluxo principal;
- **SUPORTE** — segurança/infraestrutura necessária;
- **ATIVO** — funcionalidade existente mantida;
- **LEGADO** — sem consumidor atual comprovado;
- **CANDIDATO A REMOÇÃO** — somente após prova de ausência de dependências;
- **INDETERMINADO** — necessita auditoria adicional.

## O que NÃO será feito

- não apagar tabelas do Supabase canônico;
- não apagar migrations históricas;
- não remover policies por aparência de excesso;
- não remover funções sem verificar chamadas;
- não reduzir o schema apenas porque tabelas estão vazias;
- não reconstruir automaticamente 203 funções e 153 policies antes do mapeamento de dependências.

## Próxima etapa

A auditoria precisa avançar dos pontos de entrada (rotas) para:

1. repositories/services/workers;
2. chamadas SQL/RPC;
3. componentes administrativos;
4. triggers e funções PostgreSQL;
5. migrations que criaram os objetos;
6. Golden Path atual.

Somente depois desse cruzamento será possível marcar objetos como **LEGADO** ou **CANDIDATO A REMOÇÃO** com segurança.

**Status:** auditoria de superengenharia iniciada e documentada; nenhuma alteração destrutiva executada.


## Complemento — Auditoria de dependências interna (executada em 2026-09-23)

A segunda rodada saiu das rotas e cruzou **services, repositories, workers e funções/triggers PostgreSQL**. Nenhuma alteração de banco foi feita.

### Dependências comprovadas

| Domínio | Objetos comprovados | Evidência | Classificação |
|---|---|---|---|
| Casos | `cases` | `case-repository.ts` faz SELECT/UPSERT/LOAD real | CORE |
| Documentos/assinatura | `documents`, `documenso_envelopes` | rota de documentos + `envelope-repository.ts` + módulo Documenso | CORE/SUPORTE e ATIVO |
| Pagamentos | `payment_orders` | rota de pagamentos + `admin-query-service.ts` | CORE |
| Comercial | `service_pricings`, `promotion_campaigns`, `coupons`, `bonus_ledger`, `commission_ledger`, `referral_relations`, `referral_config`, `commercial_audit_log` | `commercial-repository.ts` faz persistência/load real; não são apenas referências de rota | ATIVO |
| Marketing | `editorial_content`, `content_versions`, `app_settings` | `marketing-service.ts` | ATIVO/SUPORTE |
| Automação | `marketing_automation_queue`, `marketing_lead_campaigns`, `marketing_messages`, `collection_runs` | workers executam INSERT/UPDATE/SELECT/DELETE reais | ATIVO |
| Mensageria | `messaging_contacts`, `messaging_conversations`, `messaging_messages` | `messaging-service.ts` persiste e lê as três | ATIVO |
| Knowledge/RAG | `knowledge_sources`, `knowledge_documents`, `knowledge_document_versions`, `knowledge_chunks`, `knowledge_embeddings` + RPC `match_knowledge_chunks` | `vector-store.ts` persiste e consulta pgvector/RPC | ATIVO |
| Auth | `user_profiles` | funções `handle_new_user`, `handle_user_update`, `is_admin`, `current_role_name` e código de administração | CORE/SUPORTE |
| Eventos | `platform_events` | função pública `emit_event` insere diretamente | SUPORTE/ATIVO |
| E2E | `e2e_test_runs`, `e2e_test_results` | infraestrutura de testes/admin; não é requisito do B2C | SUPORTE/TESTE |

### Funções PostgreSQL relevantes encontradas

A inspeção de `pg_proc` identificou referências de dados relevantes, entre outras funções utilitárias:

- `handle_new_user` → `user_profiles`
- `handle_user_update` → `user_profiles`
- `current_role_name` → `user_profiles`
- `is_admin` → `user_profiles`
- `admin_update_user_role` / `admin_update_user_role_by_email` → `user_profiles` + `auth.users`
- `emit_event` → `platform_events`
- `match_knowledge_chunks` → cadeia completa do RAG/pgvector

Isso elimina a hipótese de considerar as tabelas de Knowledge, eventos ou perfis como "sobras" apenas porque algumas estavam vazias no snapshot.

### Triggers e duplicação confirmada

Além dos triggers públicos, foram encontrados os dois triggers de Auth:

- `auth.users.on_auth_user_created` → `handle_new_user`
- `auth.users.on_auth_user_updated` → `handle_user_update`

No `public.user_profiles` existem **dois triggers de atualização de timestamp**:

- `trg_user_profiles_updated` → `set_updated_at()`
- `update_user_profiles_updated_at` → `update_updated_at_column()`

As duas funções fazem essencialmente a mesma operação (`NEW.updated_at = NOW()`). Isso é um **excesso técnico real e localizado**, mas permanece como candidato a consolidação; não foi removido nesta auditoria porque a baseline precisa primeiro registrar o estado atual e a próxima etapa deve validar a dependência/migration antes de simplificar.

### Estado atual da classificação

A auditoria muda a classificação de vários objetos antes indeterminados para **ATIVO/SUPORTE**. Ainda não há evidência suficiente para marcar uma tabela como **CANDIDATO A REMOÇÃO** de forma segura.

Há, porém, um grupo que merece revisão específica antes da baseline definitiva:

- tabelas legadas/paralelas de pagamento (`payments`, `payment_events`, `payment_webhook_events`, `orders`) — há referências de código históricas, mas o fluxo atual deve ser fechado contra Golden Path;
- tabelas comerciais paralelas (`promotions`, `commissions`, `commercial_offers`, `commercial_orders`) — parte do domínio foi substituída por `promotion_campaigns`/ledgers/repository atual;
- Documenso completo — ativo no código, mas precisa ser separado claramente do core B2C;
- observabilidade/auditoria e notificações — dependência funcional ainda deve ser cruzada com os consumidores completos;
- `app_settings` / `content_versions` — usados pelo marketing-service, apesar de vazios no snapshot.

### Conclusão da rodada

**Resultado:** a suspeita de superengenharia foi confirmada no nível arquitetural, mas **não** na forma de "a maior parte das 52 tabelas pode ser apagada".

O achado mais importante é outro: o banco contém uma mistura de **core + módulos ativos + infraestrutura + legado histórico**, e o código atual ainda usa uma parcela maior do schema do que a auditoria somente por rotas indicava.

Portanto, a baseline deve continuar sendo construída como **estado final necessário**, mas sem eliminar módulos ativos por estarem vazios.

**Próximo passo:** fechar os grupos paralelos de pagamentos/comercial/Documenso/observabilidade/notificações contra todas as chamadas de código e o Golden Path. Só depois gerar a baseline final de functions/triggers/policies.
