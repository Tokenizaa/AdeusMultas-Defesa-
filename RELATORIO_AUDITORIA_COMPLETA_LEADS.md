# Auditoria Completa — Sistema de Captação de Leads — DefesAi

---

## Cabeçalho

| Campo | Valor |
|-------|-------|
| **Projeto** | DefesAi (plataforma de defesa de multas de trânsito — AdeusMultas-Defesa-) |
| **Caminho** | /home/lg/workspace/projects/AdeusMultas-Defesa- |
| **Branch** | main (canônica — sem branches/PRs, conforme AGENTS.md) |
| **SHA do commit** | 41dd4a8 — fix(auth): remove insert manual user_profiles — trigger handle_new_user() já cria [DEPLOY-PRODUCTION] |
| **Data** | 21/10/2026 |
| **Auditor** | Orquestrador multi-agente (8 subagents) — Technical Writer |
| **Metodologia** | Leitura estática de código e documentação; nenhuma modificação de arquivos; compilação de 8 relatórios parciais |

---

## Resumo Executivo

Esta auditoria avaliou o sistema de captação de leads do DefesAi, que opera com dois funis paralelos:

- **Funil B2C**: motorista/cidadão realiza onboarding, analisa a multa, gera a defesa e efetua pagamento via checkout (PagBank, VenoPag, GGPIX).
- **Funil B2B**: despachantes/advogados de trânsito captam leads via Meta Lead Ads, scraping do Google Maps, campanhas de automação de marketing e envio de mensagens pelo WhatsApp (Evolution API).

### Tabela de Vereditos por Área

| Área | Subagent responsável | Veredito | Justificativa resumida |
|------|----------------------|----------|------------------------|
| Funil B2C (Conversão/Pagamentos) | @payments-billing-engineer | **BLOCKED** | Checkout bloqueado para não-admins; webhooks não idempotentes duravelmente; consentimento LGPD não persistido. |
| Segurança | @security-architect | **FAIL** | Segredos reais em `.env.md` não gitignorado; webhooks sem HMAC; endpoints públicos sem auth; CORS permissivo. |
| SRE / Infraestrutura Assíncrona | @sre-site-reliability-engineer | **BLOCKED** | Worker de automação não auto-iniciado; sem DLQ para marketing_automation_queue; falhas silenciosas do Evolution API. |
| WhatsApp / Webhooks / Inbox | @comunicacao-whatsapp | **PASS com gaps** | Evento `MESSAGING_LEAD_QUALIFIED` nunca emitido; persistência fire-and-forget; webhook auth desabilitada por padrão. |
| Funil B2B (Marketing/Aquisição) | @marketing-aquisicao | **Funcional com gaps críticos** | Meta leadgenId não persistido; dedup silencioso >5.000 leads; export XLSX incompleto; rotas duplicadas. |
| Testes e Qualidade | @test-automation-engineer | **Cobertura insuficiente** | 167 testes verdes, mas frontend ZERO testes; webhook Meta sem teste; tsc com 2 erros; E2E apenas especificação. |
| Métricas e KPIs | @analytics-reporter | **Imatura** | Status `converted` nunca preenchido → conversão sempre 0%; KPIs críticos ausentes (CAC, LTV, taxa de entrega, etc.). |

### Veredito Geral: **BLOCKED / NÃO PRONTO PARA PRODUÇÃO**

O sistema de captação de leads apresenta falhas críticas que impedem a conversão B2C em produção, expõem segredos sensíveis, não garantem idempotência de pagamentos, não drenam filas de automação de marketing e não medem conversão. Nenhum dos dois funis está operacional com segurança e confiabilidade suficientes para uso em produção.

---

## Seção 1 — Arquitetura e Escopo

### 1.1 Dois Funis de Captação

O sistema opera com dois funis independentes que convergem na tabela unificada de leads no Supabase:

| Funil | Público-alvo | Entrada | Conversão |
|-------|-------------|---------|-----------|
| **B2C** | Motorista/cidadão | Onboarding → análise da multa → geração de defesa | Checkout de pagamento (PagBank/VenoPag/GGPIX) |
| **B2B** | Despachantes/advogados de trânsito | Meta Lead Ads, scraping Google Maps, automação de marketing | Qualificação via WhatsApp (Evolution API) → envio de propostas |

### 1.2 Tabelas Principais (Supabase / PostgreSQL)

A auditoria não realizou alterações de schema; as tabelas abaixo são referenciadas nos relatórios parciais:

- `leads` — registro central de leads (B2C e B2B), com colunas: `id`, `phone_normalized`, `email`, `name`, `status`, `qualification_status`, `opt_out_at`, `contact_count`, `source`, `source_url`, `lead_type`, `state`, `converted`, `created_at`, `updated_at`.
- `marketing_automation_queue` — fila BullMQ para jobs de automação de marketing (envio WhatsApp, campanhas).
- `payment_orders` / `orders` — pedidos de pagamento B2C.
- `user_profiles` — perfis de usuários (criados via trigger `handle_new_user()`).
- Tabelas de marketing com RLS (Row Level Security) — deny-all para `anon` e `authenticated`.

### 1.3 Endpoints Principais Auditados

| Endpoint | Método | Funil | Proteção | Status (resumo) |
|----------|--------|-------|----------|-----------------|
| `/api/marketing/*` | GET | B2B | Público (sem auth) | ⚠️ Falha de segurança |
| `/api/scrape` | POST | B2B | Público (sem auth) | ⚠️ Falha de segurança |
| `/api/marketing-automation/*` | — | B2B | authenticateToken + requireAdmin | ✅ Protegido |
| `/api/meta/webhook` | POST | B2B | HMAC (mas re-serialização do body) | ⚠️ Risco de assinatura |
| `/api/whatsapp/webhook` | POST | B2B/WhatsApp | HMAC (desabilitado se segredo ausente) | ⚠️ Aceita qualquer req sem segredo |
| `/api/payments/webhooks/*` | POST | B2C | Variável por adapter | ⚠️ Não idempotente duravelmente |
| `/api/cases/:id` | GET/PUT | B2C | Auth JWT | ✅ |
| `/api/onboarding/*` | POST | B2C | Auth JWT | ✅ |

---

## Seção 2 — Matriz de Vereditos Consolidada

| Área | Status | Justificativa consolidada |
|------|--------|---------------------------|
| **Funil B2C — Conversão / Pagamentos** | 🔴 **BLOCKED** | Checkout exige `isAdmin` no frontend (App.tsx:349) → cidadão não consegue pagar; webhooks de pagamento não idempotentes duravelmente (VenoPag hardcoded `isDuplicate=false`; PagBank `Set` em memória; GGPIX `signatureValid=true` sempre); telefone não obrigatório no cadastro; consentimento LGPD apenas frontend; Resend free tier sem fila/retry. |
| **Segurança** | 🔴 **FAIL** | `.env.md` com segredos reais (Supabase service_role, Cloudflare token, chaves NVIDIA, Evolution API, credenciais admin) não gitignorado; webhook WhatsApp aceita qualquer requisição sem HMAC se `EVOLUTION_WEBHOOK_SECRET` não definido; Meta webhook verifica HMAC sobre `JSON.stringify(req.body)` re-serializado; endpoints GET públicos em `/api/marketing/*`; POST `/api/scrape` público; CORS permissivo; rate limit insuficiente; chave Evolution API exposta client-side. |
| **SRE / Infraestrutura Assíncrona** | 🔴 **BLOCKED** | Worker de automação de marketing não é auto-iniciado (só via endpoint manual `POST /start`); sem DLQ para `marketing_automation_queue`; falhas silenciosas do Evolution API (`sendText` retorna `{success:false}` sem exceção; lead avançado para `sent`/`exhausted` mesmo sem entrega); nenhum SLO/error budget para captação de leads; métricas de leads não rastreadas; health check não inclui marketing/Evolution; logs apenas em memória (ring buffer 2000). |
| **WhatsApp / Webhooks / Inbox Unificado** | 🟡 **PASS com gaps** | Evento `MESSAGING_LEAD_QUALIFIED` definido em `topics.ts` mas nunca emitido (contrato morto); duplicação de regex de intenção B2B; prospecting-responder carrega apenas 50 leads e filtra em JS; status de opt-out inconsistente (`paused` vs `opt_out`); `createOrUpdateLead` default `status='qualified'` sem avaliação; persistência Supabase fire-and-forget; webhook auth desabilitada por padrão se segredo ausente. |
| **Funil B2B — Marketing / Aquisição** | 🟡 **Funcional com gaps críticos** | Meta `leadgenId`/`formId` não persistidos (leads captados via Meta somem do funil); HMAC do webhook Meta pode falhar (re-serialização); dedup silencioso acima de 5.000 leads; conflito `phone_normalized` descarta número do novo lead; export XLSX omite email/whatsapp/estado/lead_type/source/source_url/qualification_status/opt_out_at; rotas `/scrape` duplicadas; tipo Lead do frontend desatualizado (faltam 16 colunas). |
| **Testes e Qualidade** | 🔴 **Cobertura insuficiente** | 167 testes verdes (vitest), 24 arquivos; `cloudflare/routes/payments.test.ts` não carrega; `tsc --noEmit` com 2 erros (ggpix-adapter deletado mas importado; tipo incompatível venopag-adapter); testes de frontend ZERO; webhook Meta leadgen SEM teste; idempotência webhook pagamento parcial; suíte E2E canônica (70 cenários) apenas especificação, não implementada. |
| **Métricas e KPIs** | 🟡 **Imatura** | Status `converted` nunca preenchido por nenhum fluxo → conversão sempre 0%, `conversionRate` sempre 0%; inconsistência de `sent` entre `/stats` e `/campaigns`; `errors` incompleto; sem dimensão temporal; KPIs ausentes: CAC, LTV, taxa de entrega, taxa de resposta WhatsApp, tempo de primeira resposta, profundidade da fila por envelhecimento, funil B2C, atribuição de fonte agregada, cohort analysis, opt-out rate, churn rate de leads, receita por lead, ROI por campanha, taxa de qualificação. |

**Veredito Geral do Sistema: 🔴 BLOCKED / NÃO PRONTO PARA PRODUÇÃO**

---

## Seção 3 — Top 10 Achados Críticos / Bloqueantes

Os 10 problemas mais críticos, ordenados por impacto sobre a operação em produção:

| # | Problema | Localização (arquivo:linha) | Impacto | Relatório de origem |
|---|----------|------------------------------|---------|---------------------|
| 1 | Checkout B2C bloqueado para não-admins | `src/server/routes/payments.ts` (via `App.tsx:349` exige `isAdmin`) | Conversão B2C = zero em produção; cidadão não consegue pagar | R1 |
| 2 | Segredos reais expostos em `.env.md` (não gitignorado) | `.env.md` (raiz do repositório) | Exposição de Supabase service_role, Cloudflare token, chaves NVIDIA, Evolution API, credenciais admin | R2 (C-01) |
| 3 | Webhook WhatsApp aceita qualquer requisição sem HMAC se segredo ausente | `src/server/routes/whatsapp.ts` (ou `whatsapp-webhook.integration.test.ts`) | Inclusive produção: qualquer atacante pode injetar mensagens/falsificar leads | R2 (C-02), R4 |
| 4 | Meta webhook HMAC verificado sobre `JSON.stringify(req.body)` re-serializado | `src/server/routes/marketing.ts` (ou rota Meta webhook) | Assinatura pode não conferir; leads Meta rejeitados ou aceitos indevidamente | R2 (C-03), R5 |
| 5 | Pagamentos não idempotentes duravelmente | `src/server/integrations/gateway/` (PagBank `Set` em memória; VenoPag `isDuplicate=false` hardcoded; GGPIX `signatureValid=true` sempre) | Cobranças duplicadas, perda de webhooks após reinício, assinatura GGPIX não verificada | R1 |
| 6 | Worker de automação de marketing não auto-iniciado | `src/server/services/marketing-automation/**` (endpoint manual `POST /start`) | Fila `marketing_automation_queue` nunca drena em produção; leads B2B não são contactados | R3 |
| 7 | Sem DLQ para `marketing_automation_queue` | `src/server/services/marketing-automation/**` (BullMQ config) | Jobs falhados ficam parados; nenhuma recuperação automática | R3 |
| 8 | Falhas silenciosas do Evolution API | `src/server/services/whatsapp-service.ts` / `whatsapp-journey-router.ts` | `sendText` retorna `{success:false}` sem lançar exceção; lead avançado para `sent`/`exhausted` sem entrega real | R3, R4 |
| 9 | Evento `MESSAGING_LEAD_QUALIFIED` nunca emitido (contrato morto) | `src/core/events/topics.ts` (definição sem emissão) | Qualificação de lead B2B não dispara downstream; funil B2B quebrado | R4 |
| 10 | Status `converted` nunca preenchido → conversão sempre 0% | `src/server/routes/admin.ts` / `monitoring.ts` / `analytics.ts` (ou serviços de métricas) | KPIs de conversão inutilizáveis; impossível medir ROI de campanhas | R7 |

---

## Seção 4 — Detalhamento por Área

### 4.1 — Relatório 1: Funil B2C (Conversão / Pagamentos) — @payments-billing-engineer

**Veredito: BLOCKED**

**Pontos fortes:**
- Preço canônico definido no backend (não confia no frontend)
- Auth robusta (validação de JWT, não deriva identidade de headers do cliente)
- Persistência FAIL CLOSED (se falhar, não prossegue)
- Validação de lead antes de prosseguir no fluxo
- Programa de indicação estruturado
- Mapper canônico consistente

**Pontos fracos / bloqueantes:**
1. **Checkout B2C bloqueado para não-admins**: `App.tsx:349` exige `isAdmin` → cidadão não consegue pagar → conversão B2C zero em produção.
2. **Webhooks de pagamento não idempotentes duravelmente**:
   - VenoPag: `isDuplicate=false` hardcoded (não detecta duplicatas)
   - PagBank: `processedWebhookIds` é `Set` em memória (perde após reinício)
   - GGPIX: `signatureValid=true` sempre (sem verificação de assinatura real)
3. **Telefone não obrigatório no cadastro**: `phoneRequired=false`
4. **Consentimento LGPD apenas no frontend**: não persistido no backend
5. **Resend free tier**: 100 emails/dia sem fila nem retry

**Recomendações:**
- **Alta**: Remover exigência de `isAdmin` no checkout B2C; tornar webhooks idempotentes duravelmente (banco de dados, não memória); verificar assinatura GGPIX.
- **Média**: Tornar telefone obrigatório; persistir consentimento LGPD no backend; adicionar fila/retry para envio de emails (Resend).
- **Baixa**: Documentar fluxo de indicação; adicionar testes de webhook.

---

### 4.2 — Relatório 2: Segurança — @security-architect

**Veredito: FAIL (vulnerabilidades críticas)**

**Críticas (3):**
- **C-01**: Segredos reais em `.env.md` (Supabase service_role, Cloudflare token, chaves NVIDIA, Evolution API key, credenciais admin) — arquivo não gitignorado.
- **C-02**: Webhook WhatsApp aceita qualquer requisição sem HMAC se `EVOLUTION_WEBHOOK_SECRET` não definido (inclusive produção).
- **C-03**: Meta webhook verifica HMAC sobre `JSON.stringify(req.body)` re-serializado, não `req.rawBody` — assinatura pode não conferir.

**Altas (4):**
- PagBank sem idempotência durável
- VenoPag ignora HMAC em não-produção
- Endpoints GET públicos em `/api/marketing/*` sem auth
- POST `/api/scrape` público sem autenticação

**Médias (5):**
- CORS permissivo
- Rate limit insuficiente
- Export XLSX sem paginação/mascaramento PII
- Estado de pagamento apenas in-memory
- Chave Evolution API exposta client-side

**Positivos:**
- Auth middleware valida JWT e não deriva identidade de headers cliente
- Marketing-automation router protegido por `authenticateToken` + `requireAdmin`
- RLS nas tabelas de marketing (deny-all para `anon`/`authenticated`)
- Coluna `opt_out_at` respeitada (LGPD opt-out)
- Input validation via Supabase JS

**Recomendações:**
- **Alta**: Remover `.env.md` do repositório e adicionar ao `.gitignore`; mover segredos para vault/secret manager; definir `EVOLUTION_WEBHOOK_SECRET` e exigir HMAC em todos os ambientes; usar `req.rawBody` para verificação HMAC do Meta; proteger `/api/marketing/*` e `/api/scrape` com autenticação.
- **Média**: Ajustar CORS para origens específicas; implementar rate limiting por IP/API key; paginar e mascarar PII no export XLSX; persistir estado de pagamento no banco.
- **Baixa**: Não expor chave Evolution API client-side; adicionar testes de segurança (penetration test leve).

---

### 4.3 — Relatório 3: SRE / Infraestrutura Assíncrona e Observabilidade — @sre-site-reliability-engineer

**Veredito: BLOCKED**

**Críticos (C1-C4):**
- **C1**: Worker de automação de marketing NÃO é auto-iniciado (só via endpoint manual `POST /start`) → fila nunca drena em produção.
- **C2**: Não há DLQ para `marketing_automation_queue` → jobs falhados ficam parados.
- **C3**: Falhas silenciosas do Evolution API: `sendText` retorna `{success:false}` sem lançar exceção; worker avança lead para `sent`/`exhausted` mesmo sem entrega.
- **C4**: Nenhum SLO nem error budget para captação de leads.

**Altos:**
- `metrics-service` não rastreia métricas de leads
- `health-service` não inclui marketing/Evolution
- `service_role` sem pool configurado
- Logs apenas em memória (ring buffer 2000)
- Falha em cascata sem isolamento (Evolution API down derruba fluxo)

**Positivos:**
- BullMQ com retry/DLQ para scraping
- Fallback Supabase
- Honestidade de estado do worker
- Logger estruturado com sanitização de PII
- Endpoints `/stats` e `/health` da automação

**Recomendações:**
- **Alta**: Auto-iniciar worker de automação de marketing na inicialização da aplicação; adicionar DLQ para `marketing_automation_queue`; tratar falhas silenciosas do Evolution API (lançar exceção ou não avançar status sem entrega); definir SLOs e error budgets para captação de leads.
- **Média**: Rastrear métricas de leads no `metrics-service`; incluir marketing/Evolution no `health-service`; configurar pool para `service_role`; persistir logs (não só memória); isolar falhas do Evolution API com circuit breaker.
- **Baixa**: Adicionar dashboards de observabilidade para leads; alertas PagerDuty/Slack para fila parada.

---

### 4.4 — Relatório 4: WhatsApp / Webhooks / Inbox Unificado / Qualificação — @comunicacao-whatsapp

**Veredito: PASS com gaps**

**GAP CRÍTICO:**
- Evento `MESSAGING_LEAD_QUALIFIED` definido em `topics.ts` mas NUNCA emitido em nenhum lugar (contrato morto).

**Outros gaps:**
- Duplicação de regex de intenção B2B (`whatsapp-journey-router` vs `messaging-service`)
- Journey router pode falso-positivo B2B
- `prospecting-responder` carrega só 50 leads e filtra em JS (não escala)
- Status de opt-out inconsistente (`paused` vs `opt_out`)
- `createOrUpdateLead` default `status='qualified'` sem avaliação
- Persistência Supabase fire-and-forget
- Webhook auth desabilitada por padrão em produção se segredo ausente

**Positivos:**
- Arquitetura de camadas separada
- Webhook seguro (200 imediato, HMAC `timingSafeEqual`, `rawBody`)
- Journey Router ADR-013 (`B2B_RELATIONSHIP` vs `B2C_AUTO`)
- Detecção de opt-out LGPD
- Idempotência por `external_message_id`
- Omnichannel unificado
- Endpoints de diagnóstico (self-test, simulate-inbound)

**Recomendações:**
- **Alta**: Emitir evento `MESSAGING_LEAD_QUALIFIED` nos pontos de qualificação; unificar regex de intenção B2B em um único local; fazer `prospecting-responder` paginar/query no banco em vez de carregar 50 e filtrar em JS; alinhar status de opt-out (`paused` → `opt_out`); exigir `EVOLUTION_WEBHOOK_SECRET` em produção.
- **Média**: Remover default `status='qualified'` em `createOrUpdateLead` (avaliar antes de definir); tornar persistência Supabase síncrona ou com confirmação; adicionar testes de webhook e journey router.
- **Baixa**: Documentar contratos de evento em `topics.ts`; adicionar métricas de qualificação.

---

### 4.5 — Relatório 5: Funil B2B (Marketing / Aquisição) — @marketing-aquisicao

**Veredito: FUNCIONAL MAS COM GAPS CRÍTICOS**

**Altas:**
- **Meta Lead Ads**: `leadgenId`/`formId` NÃO persistidos → leads captados via Meta somem do funil (não há rastreamento de origem).
- **HMAC do webhook Meta**: pode falhar devido à re-serialização (`JSON.stringify(req.body)`) — mesmo problema do Relatório 2 (C-03).

**Médias:**
- Dedup silencioso acima de 5.000 leads
- Conflito `phone_normalized` descarta número do novo lead
- WhatsApp não normalizado
- Export XLSX omite: email, whatsapp, estado, lead_type, source, source_url, qualification_status, opt_out_at
- Duplicação de rotas `/scrape`
- Rate limiting fraco no scraping Google Maps
- Tipo `Lead` do frontend desatualizado (faltam 16 colunas)

**Positivos:**
- Endpoints completos protegidos (auth + requireAdmin)
- Dedup por unique constraints no banco
- Fill-gap upsert (preenche lacunas sem sobrescrever)
- Elegibilidade bem definida
- Resiliência ao scraping
- Detecção honesta de bloqueios
- LGPD implementado
- Estatísticas de conversão
- Export XLSX funcional

**Recomendações:**
- **Alta**: Persistir `leadgenId`/`formId` do Meta Lead Ads; corrigir verificação HMAC do webhook Meta (usar `rawBody`).
- **Média**: Ajustar dedup para não ser silencioso acima de 5.000 leads; resolver conflito `phone_normalizado` (não descartar número do novo lead); normalizar whatsapp; completar export XLSX com todas as colunas; unificar rotas `/scrape` duplicadas; fortalecer rate limiting do scraping Google Maps; atualizar tipo `Lead` do frontend com as 16 colunas faltantes.
- **Baixa**: Adicionar testes de integração para Meta webhook e scraping.

---

### 4.6 — Relatório 6: Testes e Qualidade — @test-automation-engineer

**Veredito: Cobertura insuficiente**

**Achados:**
- 167 testes verdes (vitest), 24 arquivos
- `cloudflare/routes/payments.test.ts` não carrega
- `npx tsc --noEmit`: 2 erros (área gateway: `ggpix-adapter.ts` deletado mas ainda importado; tipo incompatível em `venopag-adapter.ts`)
- Testes de frontend (AuthPageView, SharedAuthForm, OnboardingWizard, CheckoutView): ZERO
- Webhook Meta leadgen (`/api/meta/webhook`): SEM TESTE
- Idempotência webhook pagamento: parcial (só PagBank `isDuplicate`)
- Suíte E2E canônica (70 cenários): apenas especificação em `docs/testing/E2E-CERTIFICACAO-CANONICA.md`, não implementada
- Arquivos de relatório criados: `RELATORIO_AUDITORIA_TESTES_LEADS.md`

**Recomendações:**
- **Alta**: Corrigir erros TypeScript (remover import de `ggpix-adapter.ts` deletado; corrigir tipo incompatível em `venopag-adapter.ts`); implementar testes de frontend (CheckoutView, AuthPageView, OnboardingWizard); implementar teste do webhook Meta leadgen; completar idempotência de webhook de pagamento (todos os adapters).
- **Média**: Corrigir `cloudflare/routes/payments.test.ts` para carregar; implementar suíte E2E canônica (70 cenários) conforme especificação.
- **Baixa**: Adicionar testes de integração para webhooks de pagamento (VenoPag, GGPIX); adicionar cobertura de métricas e KPIs.

---

### 4.7 — Relatório 7: Métricas e KPIs — @analytics-reporter

**Veredito: Imatura**

**Problema crítico:**
- Status `converted` nunca é preenchido por nenhum fluxo de código → `converted` sempre 0, `conversionRate` sempre 0%.

**Outros problemas:**
- Inconsistência de `sent` entre `/stats` e `/campaigns`
- Campo `errors` incompleto
- Sem dimensão temporal (não há séries históricas)
- `interested` subestimado

**KPIs ausentes:**
- CAC (Custo de Aquisição de Cliente)
- LTV (Lifetime Value)
- Taxa de entrega
- Taxa de resposta WhatsApp
- Tempo de primeira resposta
- Profundidade da fila por envelhecimento
- Funil B2C
- Atribuição de fonte agregada
- Cohort analysis
- Opt-out rate
- Churn rate de leads
- Receita por lead
- ROI por campanha
- Taxa de qualificação

**Positivos:**
- `/stats` expõe contagens brutas
- `contactado` usa `contact_count >= 1`
- `opt_out_at` implementado
- `qualification_status` com gate de 20 chars
- Idempotência de mensagens inbound

**Recomendações:**
- **Alta**: Implementar preenchimento de `converted` em todos os fluxos de conversão (pagamento confirmado, lead qualificado, etc.); adicionar dimensão temporal a todas as métricas; implementar KPIs críticos (CAC, LTV, taxa de entrega, taxa de resposta WhatsApp).
- **Média**: Alinhar `sent` entre `/stats` e `/campaigns`; completar campo `errors`; corrigir subestimação de `interested`; implementar cohort analysis e opt-out rate.
- **Baixa**: Implementar ROI por campanha, receita por lead, churn rate de leads, profundidade da fila por envelhecimento; adicionar dashboards de visualização.

---

### 4.8 — Relatório 8: (Consolidação dos relatórios parciais)

Os 8 relatórios parciais foram compilados neste documento. Cada relatório acima (4.1 a 4.7) corresponde a um subagent específico. Não há um 8º relatório parcial distinto além dos 7 áreas cobertas; a oitava perspectiva é a consolidação transversal realizada pelo Technical Writer neste relatório mestre.

---

## Seção 5 — Plano de Remediação Priorizado

### Cronograma sugerido

| Prioridade | Prazo sugerido | Itens | Responsável sugerido |
|------------|----------------|-------|----------------------|
| **Alta (Semana 1-2)** | Imediato / 2 semanas | Remover `.env.md` e adicionar ao `.gitignore`; mover segredos para secret manager; definir `EVOLUTION_WEBHOOK_SECRET` e exigir HMAC; remover exigência de `isAdmin` no checkout B2C; tornar webhooks de pagamento idempotentes duravelmente; auto-iniciar worker de automação de marketing; adicionar DLQ para `marketing_automation_queue`; proteger `/api/marketing/*` e `/api/scrape` com auth | Security + Backend |
| **Alta (Semana 3-4)** | 2-4 semanas | Verificar assinatura GGPIX; corrigir HMAC do Meta webhook (`rawBody`); persistir `leadgenId`/`formId` do Meta; tratar falhas silenciosas do Evolution API; implementar preenchimento de `converted`; corrigir erros TypeScript (2 erros) | Backend + SRE |
| **Média (Semana 5-8)** | 1-2 meses | Tornar telefone obrigatório no cadastro; persistir consentimento LGPD no backend; fila/retry para Resend; alinhar `sent` entre `/stats` e `/campaigns`; completar export XLSX; unificar rotas `/scrape`; atualizar tipo `Lead` do frontend; implementar KPIs críticos (CAC, LTV, taxa de entrega, taxa de resposta WhatsApp) | Backend + Frontend |
| **Baixa (Semana 9-12)** | 2-3 meses | Implementar testes de frontend (ZERO atualmente); teste do webhook Meta; suíte E2E canônica (70 cenários); dashboard de observabilidade; alertas PagerDuty/Slack; cohort analysis, opt-out rate, churn rate, ROI por campanha | QA + Analytics |

### Matriz de responsabilidade sugerida

| Item | Domínio | Agent sugerido |
|------|---------|----------------|
| Segredos / `.env.md` | Segurança | @security-architect |
| Checkout B2C / `isAdmin` | Pagamentos | @payments-billing-engineer |
| Webhooks idempotência | Pagamentos | @payments-billing-engineer |
| Worker auto-início / DLQ | SRE / Infra | @sre-site-reliability-engineer |
| Falhas silenciosas Evolution API | WhatsApp | @comunicacao-whatsapp |
| HMAC Meta webhook | Marketing / Segurança | @marketing-aquisicao + @security-architect |
| `leadgenId` persistência | Marketing | @marketing-aquisicao |
| Status `converted` / KPIs | Métricas | @analytics-reporter |
| Testes frontend / E2E | Qualidade | @test-automation-engineer |
| Tipo `Lead` frontend | Frontend | @frontend-developer |

---

## Seção 6 — Estado do Repositório

### Git status (à data da auditoria)

Branch: `main` (canônica)
SHA: `41dd4a8`

**Modificações não commitadas (working tree):**
- `M src/server/integrations/gateway/gateway-manager.ts`
- `D src/server/integrations/gateway/ggpix-adapter.ts`
- `M src/server/integrations/gateway/index.ts`
- `D src/server/integrations/gateway/pagbank-adapter.ts`
- `D src/server/integrations/gateway/test-adapter.ts`
- `M src/server/integrations/gateway/types.ts`
- `M src/server/integrations/gateway/webhook-handler.ts`
- `M src/server/observability/logger.ts`
- `M src/server/routes/admin.ts`
- `M src/server/routes/payments.ts`

**Arquivos não rastreados (untracked):**
- `.env.md` — **CONTÉM SEGREDOS REAIS** (Supabase service_role, Cloudflare token, chaves NVIDIA, Evolution API key, credenciais admin). **Deve ser removido e adicionado ao `.gitignore` imediatamente.**
- `RELATORIO_AUDITORIA_SEGURANCA_LEADS.md`
- `RELATORIO_AUDITORIA_TESTES_LEADS.md`
- `debug-inputs.mjs`, `debug-page.mjs`, `debug-step2.mjs`, `debug-step3.mjs`, `debug-step4.mjs`, `debug-step5.mjs`, `debug-step6.mjs`, `debug-step6-full.mjs`
- `visual-full-complete.mjs`
- `src/server/integrations/gateway/venopag-adapter.ts`

### Ação crítica obrigatória

O arquivo `.env.md` contém segredos de produção e não está gitignorado. Deve ser:
1. Removido do repositório (`git rm --cached .env.md` ou exclusão física)
2. Adicionado ao `.gitignore`
3. Substituído por um `.env.example` com placeholders (sem valores reais)

---

## Seção 7 — Conclusão e Próximos Passos

### Conclusão

O sistema de captação de leads do DefesAi **não está pronto para produção**. O veredito geral é **BLOCKED** devido a:

1. **Conversão B2C bloqueada**: cidadãos não conseguem pagar (checkout exige `isAdmin`).
2. **Exposição de segredos**: `.env.md` com credenciais reais não gitignorado.
3. **Webhooks inseguros e não idempotentes**: risco de cobranças duplicadas e aceitação de requisições falsificadas.
4. **Filas de automação não drenadas**: worker não auto-inicia, sem DLQ.
5. **Métricas de conversão inutilizáveis**: `converted` nunca preenchido.

### Próximos passos recomendados (em ordem)

1. **Semana 1**: Remover `.env.md`, corrigir checkout B2C, definir HMAC obrigatório, proteger endpoints públicos.
2. **Semana 2-3**: Corrigir idempotência de pagamentos, auto-iniciar worker, adicionar DLQ, verificar assinatura GGPIX e Meta HMAC.
3. **Semana 4-6**: Implementar testes (frontend, webhook Meta, E2E), corrigir erros TypeScript, persistir `converted` e KPIs básicos.
4. **Semana 7+**: Implementar KPIs avançados, dashboards, alertas, e realizar nova auditoria de validação.

Não há modificações de código neste relatório. Foi produzido exclusivamente por leitura estática e compilação dos 8 relatórios parciais, sem alterar nenhum arquivo do projeto.

---

## Apêndice

### A1 — SHA do commit auditado

`41dd4a8` — fix(auth): remove insert manual user_profiles — trigger handle_new_user() já cria [DEPLOY-PRODUCTION]

### A2 — Lista de arquivos auditados (caminhos absolutos)

| # | Caminho absoluto |
|---|------------------|
| 1 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/integrations/gateway/gateway-manager.ts |
| 2 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/integrations/gateway/ggpix-adapter.ts |
| 3 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/integrations/gateway/index.ts |
| 4 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/integrations/gateway/pagbank-adapter.ts |
| 5 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/integrations/gateway/test-adapter.ts |
| 6 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/integrations/gateway/types.ts |
| 7 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/integrations/gateway/webhook-handler.ts |
| 8 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/integrations/gateway/venopag-adapter.ts |
| 9 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/observability/logger.ts |
| 10 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/routes/admin.ts |
| 11 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/routes/payments.ts |
| 12 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/routes/whatsapp.ts |
| 13 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/routes/marketing.ts |
| 14 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/routes/whatsapp-webhook.integration.test.ts |
| 15 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/services/whatsapp-service.ts |
| 16 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/services/whatsapp-journey-router.ts |
| 17 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/services/messaging-service.ts |
| 18 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/services/marketing-service.ts |
| 19 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/services/marketing-automation/** |
| 20 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/services/scraper-job-queue.ts |
| 21 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/services/scrape-worker.ts |
| 22 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/integrations/evolution-api/** |
| 23 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/integrations/meta/** |
| 24 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/integrations/comfyui/** |
| 25 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/core/events/topics.ts |
| 26 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/core/onboarding/** |
| 27 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/core/rules/** |
| 28 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/core/legal-base/** |
| 29 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/core/knowledge/** |
| 30 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/types/** |
| 31 | /home/lg/workspace/projects/AdeusMultas-Defesa-/src/lib/** |
| 32 | /home/lg/workspace/projects/AdeusMultas-Defesa-/docs/testing/E2E-CERTIFICACAO-CANONICA.md |
| 33 | /home/lg/workspace/projects/AdeusMultas-Defesa-/.env.md |
| 34 | /home/lg/workspace/projects/AdeusMultas-Defesa-/AGENTS.md |

### A3 — Referências aos relatórios parciais

| Código | Relatório parcial | Subagent | Veredito |
|--------|------------------|----------|----------|
| R1 | Funil B2C Conversão | @payments-billing-engineer | BLOCKED |
| R2 | Segurança | @security-architect | FAIL |
| R3 | SRE / Infraestrutura Assíncrona | @sre-site-reliability-engineer | BLOCKED |
| R4 | WhatsApp / Webhooks / Inbox | @comunicacao-whatsapp | PASS com gaps |
| R5 | Funil B2B Marketing | @marketing-aquisicao | Funcional com gaps críticos |
| R6 | Testes e Qualidade | @test-automation-engineer | Cobertura insuficiente |
| R7 | Métricas e KPIs | @analytics-reporter | Imatura |
| R8 | Consolidação (este documento) | Technical Writer | BLOCKED / NÃO PRONTO PARA PRODUÇÃO |

---

**Fim do relatório.** Gerado em 21/10/2026 pelo Technical Writer do projeto DefesAi, com base em leitura estática e 8 relatórios parciais de subagents especializados. Nenhum arquivo do projeto foi modificado.



