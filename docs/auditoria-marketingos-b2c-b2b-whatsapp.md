# Auditoria Arquitetural — Marketing OS / B2C / B2B / WhatsApp

**Projeto:** DefesAi (AdeusMultas-Defesa-) — defesa de multas de trânsito
**Data:** 2026-08-29
**Tipo:** Read-only (nenhum código de aplicação alterado)
**Branch:** `main` — HEAD `6f7e94e`
**Metodologia:** leitura de código (CONFIRMADO POR CÓDIGO), sondagem de runtime e banco (CONFIRMADO POR EXECUÇÃO), inferência (RISCO), ausência (INEXISTENTE), não verificado (NÃO TESTADO).

> Classificação usada em todos os achados: **CONFIRMADO POR CÓDIGO** (lido no código-fonte), **CONFIRMADO POR EXECUÇÃO** (sondagem real de processo/banco/rede), **NÃO TESTADO** (existe, sem evidência de execução), **INEXISTENTE** (não existe), **RISCO** (probabilidade alta, exige confirmação).

---

## VEREDITO EXECUTIVO

**O Marketing OS trata hoje todo o WhatsApp como UM pipeline técnico sem router de jornada.** B2B outbound, B2B relationship e B2C atendimento convergem para o mesmo `MessagingService.processIncomingMessage()`. A segmentação B2C/B2B existe **apenas** como `lead_type ∈ {despachante, advogado_transito}` na tabela `marketing_leads` (B2B) — não existe em campanhas sociais, conteúdo editorial, conversas, mensagens, contatos ou inbox. Não há campo `audience`, `objective`, `campaign_type`, nem flag B2C/B2B em nenhuma entidade de marketing **na base produtiva** (verificado no schema real via `information_schema` indireto). **A suspeita levantada foi CONFIRMADA POR CÓDIGO E EXECUÇÃO.**

**Estado REAL operacional (CONFIRMADO POR EXECUÇÃO):**
- Evolution API (WhatsApp): **OFFLINE** — porta 8080 e 8090 sem listener, `docker` sem daemon respondendo.
- Worker de automação B2B: **STOPPED** (`marketing_automation_state`), `timerAlive:false`, não inicia no boot.
- `marketing_lead_campaigns`: **0 linhas** → nenhuma campanha B2B jamais iniciada.
- `marketing_messages`: **0 linhas** → nenhuma mensagem WhatsApp enviada/recebida via automação.
- `marketing_automation_queue`: **0 jobs**.
- `marketing_leads`: **97** (92 despachante / 5 advogado_transito; 100% fonte `google_maps`).
- `collection_runs`: **25** execuções (todas `completed`; últimas com 0 leads novos = deduplicação funcionando).
- `editorial_content`: **7** peças — **todas `agendado`**, nenhuma `publicado`.
- `publisher_jobs`: **0**, `meta_accounts`:**0**, `meta_tokens`:**0** → Meta conectada só via env, sem persistência; fila de publicação nunca processou job.
- Rota `/api/meta/status` no servidor em execução: **`disconnected`**, `recentEventsCount:0` (webhook Meta configurado mas nunca recebeu evento).
- Servidor em execução (`tsx server.ts`, pid 18147, iniciado hoje 13:44): gate `requireAdmin` no mount `app.use('/api', adminRoutes)` bloqueia `/api/health`, `/api/marketing/*`, `/api/marketing/automation/*`, `/api/communication/*` e **`POST /api/webhooks/whatsapp` (401 sem header admin)** — CONFIRMADO POR EXECUÇÃO.

---

## 1. ESTADO ATUAL REAL

| Dimensão | Estado | Evidência |
|---|---|---|
| Frontend Marketing OS | Funciona, navegação OK | `MarketingOSView.tsx` (276 linhas), 9 views |
| Editor de conteúdo editorial | Funciona (UI + API) | `ContentEditor.tsx`, `routes/marketing.ts` |
| Pipeline 7 agentes (organismo) | Roda a cada 5 min em memória | `marketing-orchestrator.worker.ts` `CYCLE_INTERVAL_MS = 5*60*1000` |
| Publicação social (Meta) | Código existe, ZERO jobs executados | `meta-publisher.worker.ts` + `publisher_jobs:0` |
| Meta connection | Env-based only; runtime `disconnected`; `meta_accounts/meta_tokens` vazias | execução |
| Scraper Google Maps B2B | Operacional (25 runs, 97 leads) | execução |
| Campanhas B2B | 8 registros, 2 tipos de lead; 6 duplicados de "Campanha Inaugural" | execução |
| Automação B2B outbound | Código completo, nunca executada (0 lead_campaigns, 0 queue, 0 messages) | execução + código |
| B2B relationship | Não existe além de marcar `responded` | código |
| B2C WhatsApp conversas | In-memory apenas (Maps) — perdidas no restart | código |
| B2C auto-resposta IA | Heurística de keywords, sem LLM | código |
| Router de jornada WhatsApp | **INEXISTENTE** (GAP) | código |
| Evolution API | **OFFLINE** (8080/8090 sem listener) | execução |
| Worker B2B | START manual via UI/API; não reinicia sozinho; estado honesto STOPPED | execução + código |
| Typecheck | `npx tsc --noEmit` → **0 erros** | execução |
| Testes vitest | **Não executáveis** — dependência vitest não instalada | execução |

---

## 2. ARQUITETURA ENCONTRADA (arquivos reais)

```
Frontend (React 19)
  src/components/marketing/MarketingOSView.tsx          → shell do Marketing OS (9 views)
  src/components/marketing/components/*.tsx             → Dashboard, Inbox, Content*, Publication*, Prospecting*
  src/components/marketing/prospecting/*.tsx            → abas B2B (Leads, Campanhas, Automação, Fila, Coleção)
  src/components/marketing/hooks/use-marketing-service.ts → cliente HTTP do API
  src/App.tsx                                          → rotas client-side

API (Express, entry REAL = server.ts — src/server/app.ts é alternativa divergente)
  server.ts                                            → entry: monta rotas + inicia workers (orquestrador, métricas, token-renewal)
  src/server/routes/marketing.ts                       → editorial CRUD, publish, publish-7/publish-7-cache/publish-direct, inbox, simulate-inbound
  src/server/routes/marketing-automation.ts            → status/start/pause/stop, campaigns CRUD + start, leads, queue, scrape, export, health
  src/server/routes/whatsapp.ts                        → send/send-document/status/qrcode + POST /api/webhooks/whatsapp (canônico)
  src/server/routes/meta.ts                            → status, connect, webhooks Meta (leadgen/feed/messages/instagram_mentions)
  src/server/routes/commercial.ts, health.ts, etc.

Serviços
  src/server/services/marketing-service.ts             → estado editorial (memória + supabase editorial_content)
  src/server/services/messaging-service.ts             → GATEWAY OMNICHANNEL: 4 adapters (Evolution, Messenger, IG Direct, WA Cloud) + processIncomingMessage + AI auto-responder + inbox (TUDO em memória)
  src/server/services/whatsapp-service.ts              → client HTTP Evolution API (sendText/sendMedia/instance/webhook config) — env EVOLUTION_API_URL (default localhost:8080)
  src/server/services/marketing-automation/worker.ts   → worker B2B: poll queue a cada 10s, send_message/wait_response/update_status/finish
  src/server/services/marketing-automation/state.ts    → estado RUNNING/PAUSED/STOPPED/ERROR em marketing_automation_state
  src/server/services/prospecting-responder.ts         → acoplamento aditivo: inbound → marketing_messages + status responded (match por telefone)
  src/server/services/ai-media-service.ts              → geração de mídia (ComfyUI/Gemini; fallbacks SVG mock — ver AUDITORIA-MARKETING.md §5)

Workers
  src/server/workers/marketing-orchestrator.worker.ts  → ciclo 5min dos 7 agentes (setInterval, in-memory)
  src/server/workers/agents/*.ts                       → estratégico, planejamento, criador, qualidade, publicacao, inteligencia, aprendizado
  src/server/workers/meta-publisher.worker.ts          → fila de publicação Meta EM MEMÓRIA (QueueItem[]), retry 3x, gate de qualidade imagem
  src/server/workers/marketing-metrics.worker.ts       → métricas derivadas por fórmula (newCases = publicado*0.5; conversion = 10+publicado*0.4) — NÃO são métricas reais
  src/server/workers/meta-token-renewal.worker.ts      → renovação token Meta a cada 24h (lê meta_tokens — vazia)

Integrações
  src/integrations/meta/adapters/meta-adapter.ts       → adaptador canônico Meta (publishContent via publishing service)
  src/integrations/meta/publishing/meta-publishing-service.ts → publishToFacebook/publishToInstagram (container + poll + publish)
  src/integrations/meta/webhooks/meta-webhook-service.ts
  src/server/shared/webhook/evolution-webhook-auth.ts  → valida X-Webhook-Secret (timing-safe), 401/503
  src/scraper-prospecting/                             → persister (Selenium Google Maps), classifier, deduplicator, normalizer, seen-filter, cli
  infra/docker/docker-compose.whatsapp.yml             → Evolution API v2.1.1 + Postgres + Redis (container)

Banco (Supabase)
  supabase/migrations/20260827000001_create_marketing_leads.sql
  supabase/migrations/20260827000002_create_marketing_automation.sql
  supabase/migrations/20260828000001_add_collection_runs_and_scraped_for.sql
  supabase/migrations/20260828000002_add_collection_run_id_to_marketing_leads.sql
  supabase/migrations/20260829000001_add_editorial_content_rejection_tracking.sql
```

**Entradas duplicadas de API:** `server.ts` (entry real) e `src/server/app.ts` (createApp) divergem: app.ts monta admin apenas em `/api/admin`; server.ts monta `app.use('/api', adminRoutes)` — gate global. `api/index.mjs` e `api-src/index.ts` existem (provável scaffold de função serverless) sem relação com as rotas do sistema — INEXISTENTE no fluxo principal.

---

## 3. B2C (SOCIAL — FACEBOOK/INSTAGRAM)

Fluxo planejamento→conteúdo→copy→mídia→aprovação→agendamento→facebook→instagram→métricas:

- **Planejamento:** `planejamento-agent.worker.ts` gera calendário editorial em memória e publica evento; não persiste grade. CONFIRMADO POR CÓDIGO.
- **Conteúdo:** `marketing-service.generateContent()` / `createManualContent()` → insere em `editorial_content`. CONFIRMADO POR CÓDIGO.
- **Copy/hashtags:** campos `copy_text`, `hashtags` na peça. CONFIRMADO POR CÓDIGO.
- **Mídia:** via `ai-media-service.ts` (ComfyUI/Gemini) com `createFallbackImage()` SVG mock (achado pré-existente AUDITORIA-MARKETING.md §5 — vigente, arquivo atual). NÃO TESTADO (0 gerações reais comprovadas nesta auditoria).
- **Aprovação:** status `rascunho → aprovado_qualidade` via UI/API; gate de qualidade de imagem no `metaPublisher.enqueue()` (rejeita com `reprovado_qualidade`; migration 20260829). CONFIRMADO POR CÓDIGO.
- **Agendamento:** `scheduled_date`; `publicacao-agent.worker.ts` enfileira peças `aprovado_qualidade` cujo horário chegou → `agendado`. CONFIRMADO POR CÓDIGO.
- **Publicação:** `metaPublisher.enqueue({destination:'both'})` → `metaAdapter.publishContent` → FB+IG. Há **rotas paralelas** que publicam DIRETO via `metaPublishingService.publishToInstagram` com token do .env e página IG hardcoded `1199235773284220`: `/api/marketing/publish-direct`, `/publish-7`, `/publish-7-cache` (UUIDs e URLs de 7 dias hardcoded). CONFIRMADO POR CÓDIGO. Risco de dupla publicação se operador misturar caminhos.
- **Métricas:** `marketing-metrics.worker.ts` — `newCasesGenerated = publicado*0.5`, `conversionRate = min(18, 10+publicado*0.4)` — **valores fabricados por fórmula, não reais**; `monthlyReach` fixo em 0 ("accumulated from real Meta Insights only" mas adição jamais implementada). CONFIRMADO POR CÓDIGO. NÃO TESTADO para Insights reais.
- **Organic vs Paid:** **INEXISTENTE** — nenhum campo/flag `organic|paid|boosted` em conteúdo ou rota.
- **Campos de conteúdo:** channel/format/status/scheduled_date existem. **`audience`, `objective`, `campaign_type`, `CTA` tipado: INEXISTENTES** no TS; no DB real existe coluna `cta` (adicionada fora do migration — schema não versionado) mas nenhum fluxo a usa. Conteúdo **não tem target audience B2C/B2B**.
- **Conteúdo B2C → WhatsApp?** **INEXISTENTE por código.** Nenhum agente/worker envia conteúdo editorial ao WhatsApp. WhatsApp só é tocado por `messaging-service` (inbox) e `marketing-automation/worker` (B2B). CONFIRMADO POR CÓDIGO (grep: destino de `publicacao-agent` = `both`; nenhum caminho WhatsApp).

Meta real hoje: token no `.env` (META_ACCESS_TOKEN/INSTAGRAM_ACCOUNT_ID/META_PAGE_ID presentes), runtime `disconnected` no processo atual; `meta_accounts`/`meta_tokens` vazias; webhook Meta cadastrado (verify token) com **0 eventos recebidos**. NÃO TESTADO envio real nesta auditoria (não executaria publicação).

---

## 4. B2B (SCRAPER → LEADS → CAMPANHAS)

- **Scraper:** `src/scraper-prospecting/*` — Selenium headless sobre Google Maps; queries default `despachante de trânsito` / `advogado direito de trânsito`. CONFIRMADO POR CÓDIGO E EXECUÇÃO (25 collection_runs).
- **Classificação:** `classifier.ts` keyword-based → `despachante` | `advogado_transito`; ambíguos rejeitados. CONFIRMADO POR CÓDIGO.
- **Deduplicação:** 3 camadas — `seen-filter` (chaves url:/id:), `persister` fill-gap por URL, + unique indexes DB (`phone_normalized`, `website`, `email`, `source+source_url`, `name+address`). CONFIRMADO POR CÓDIGO; últimas runs com 0 novos = funciona. CONFIRMADO POR EXECUÇÃO.
- **Persistência:** `marketing_leads` com campos ricos (nome, categoria, telefone normalizado, whatsapp, email, website, instagram, facebook, endereço, cidade, estado, zip, google_maps_url, rating, review_count, source, source_url, scraped_at, scraped_for, collection_run_id). CONFIRMADO POR CÓDIGO + schema real (97 linhas).
- **Paginação/filtros:** `/api/marketing/automation/leads` (página, pageSize, search, lead_type, city, source, contact_filter). CONFIRMADO POR CÓDIGO.
- **Histórico:** `collection_runs` (25) com queries/cities/states/resultados/erros. CONFIRMADO POR EXECUÇÃO.
- **lead → campanha:** `POST /campaigns/:id/start` — seleciona `marketing_leads` por `lead_type` + phone not null, **limit default 20**, cria `marketing_lead_campaigns` (dedup por UNIQUE(lead_id, campaign_id)) e enfileira `send_message`. CONFIRMADO POR CÓDIGO.
- **`max_contacts` está MORTO:** coluna existe, rota grava, worker **nunca** a lê. CONFIRMADO POR CÓDIGO (grep: só na rota create).
- **Duplicidade de campanhas:** DB tem 6 linhas "Campanha Inaugural — Adeus Multas" (mesmo nome, lead_type despachante). Sem UNIQUE em (name, lead_type). RISCO de dupla abordagem ao mesmo lead (as 6 campanhas podem endereçar os mesmos leads).

---

## 5. B2B OUTBOUND (evolução da fila)

Worker `marketing-automation/worker.ts`:
- **Início:** manual — `POST /api/marketing/automation/start` (UI "Iniciar"). **NÃO inicia no boot** (server.ts só inicia orchestrator/metrics/token-renewal). CONFIRMADO POR CÓDIGO.
- **Poll:** `setInterval` 10s → `getNextActions` → ações `send_message | wait_response | update_status | finish` da tabela `marketing_automation_queue`. CONFIRMADO POR CÓDIGO.
- **Fila:** tabela Postgres (persistente) com `scheduled_at`, `attempts`, `max_attempts`, `last_error`. CONFIRMADO POR CÓDIGO.
- **Envio:** `whatsappService.sendText` → Evolution → grava `marketing_messages` (outbound), move step, agenda próximo `wait_response` em `min_interval_hours` (48h default). CONFIRMADO POR CÓDIGO.
- **Templates:** `steps` jsonb com `{nome}`, `{categoria}`, `{cidade}`. Renderização simples (replace). CONFIRMADO POR CÓDIGO.
- **Retry/backoff:** sem backoff exponencial; erro → `attempts+1` + `last_error`; refiltrado no próximo tick se `scheduled_at <= now`. **BUG RISCO:** filtro `.lt('attempts', 'max_attempts')` compara coluna `attempts` com o **literal** `'max_attempts'` (string) em vez da coluna — semanticamente incorreto no PostgREST; se retornar erro, `getNextActions` loga e retorna `[]` e a fila dobra. CONFIRMADO POR CÓDIGO (worker.ts:321) / RISCO de inoperância real.
- **Intervalo/limite:** min_interval_hours respeitado entre steps; **`max_contacts` não limita nada**; sem cap global por lead/dia.
- **Status:** `queued → sent → delivered → responded → converted` / `exhausted` / `error` / `paused`. CONFIRMADO POR CÓDIGO (schema CHECK).
- **Opt-out:** **INEXISTENTE** (nenhuma coluna, nenhum detector de "pare/não quero").
- **Bloqueio/erro Evolution:** captura `result.success=false` → registra `failed` na mensagem, continua tentando próximos steps; sem distinção de bloqueio/whatsapp-banned. RISCO.
- **Estado executado:** STOPPED, `processed_count=153` histórico (contador persistido de ciclos passados), 0 lead_campaigns/messages/queue hoje. CONFIRMADO POR EXECUÇÃO.

---

## 6. B2B RELATIONSHIP (resposta do lead)

**INEXISTENTE como jornada.** O que existe é apenas o acoplamento aditivo `prospecting-responder.ts` dentro de `processIncomingMessage`:
- Inbound de número que casa `marketing_leads.phone/whatsapp` → insere `marketing_messages` (inbound) e marca `marketing_lead_campaigns.status='responded'` (idempotente, sem downgrade de responded/converted/exhausted). CONFIRMADO POR CÓDIGO.
- **MAS:** (a) a mesma mensagem também cria conversa B2C no inbox com `aiMode:'auto'` → `triggerAIAutoResponse` responde com copy **B2C** (ex.: "trabalhamos com recursos a partir de R$ 97,00") — parceiro B2B recebe resposta de atendimento B2C. CONFIRMADO POR CÓDIGO (messaging-service.ts:895-899 + keyword "preço/valor").
- (b) `handleSendMessage` **rebaixa `responded` → `sent`** ao enviar o próximo step (`status: isLastStep ? 'exhausted' : 'sent'`), sem guarda `if responded skip`. O cadence B2B **continua** após resposta. CONFIRMADO POR CÓDIGO (worker.ts:219-229).
- (c) `wait_response` não consulta estado de resposta; só marca `delivered` se o último outbound é `sent`, e agenda próximo send_message. CONFIRMADO POR CÓDIGO.
- **Sem** histórico contextual, classificação de intenção, próxima ação definida, follow-up humano, timeout de estado, ou transferência para humano. INEXISTENTE.

---

## 7. B2C WHATSAPP (conversa)

- **Entrada:** `POST /api/webhooks/whatsapp` → `authorizeEvolutionWebhook` → `whatsappService.parseWebhook` → `messagingService.handleEvolutionWebhook` → `processIncomingMessage`. CONFIRMADO POR CÓDIGO.
- **Classificação:** todo inbound vira contato + lead in-memory (`extractTrafficInfractionContext` — heurística placa/artigos) + conversa `aiMode:'auto'`. **Não há classificação B2C vs B2B** — apenas o match telefônico aditivo da prospecção. CONFIRMADO POR CÓDIGO.
- **Resposta automática:** keyword heuristic (velocidade/radar/218 → tese velocidade; bafômetro/lei seca/165 → tese bafômetro; preço/valor → R$97; senão genérica). **Sem LLM**. CONFIRMADO POR CÓDIGO.
- **Persistência:** conversas/contatos/leads/mensagens **em Maps em memória** — perdidas no restart do processo. `marketing_messages` só persiste no caminho B2B (responder). CONFIRMADO POR CÓDIGO.
- **Entradas FB/IG:** Meta webhook → `handleMetaMessagingWebhook` → mesmos adapters + `processIncomingMessage`; Lead Ads viram mensagem de lead B2C. CONFIRMADO POR CÓDIGO.
- **Onboarding:** `triggerAIAutoResponse` oferece "análise gratuita"/pede placa — não há enlace com o fluxo de onboarding do produto (case creation) e nem com pagamento. INEXISTENTE (gap de conversão).

---

## 8. EVOLUTION API — status ONLINE/OFFLINE

- **Config:** `.env` → `EVOLUTION_API_URL=http://localhost:8090`, `EVOLUTION_INSTANCE_NAME=whats_crm`, `EVOLUTION_INSTANCE` (UUID), `EVOLUTION_INSTANCE_PHONE`, `EVOLUTION_INSTANCE_USER`, `EVOLUTION_API_KEY`. Compose mapeia `${EVOLUTION_PORT:-8080}:8080` → porta 8090.
- **Sondagem (CONFIRMADO POR EXECUÇÃO):** `curl localhost:8090` → `000` (sem conexão); `localhost:8080` → `000`; `docker info` sem resposta (daemon ausente/preso); `docker ps` vazio. **EVOLUTION API OFFLINE.** Nenhum envio nem recebimento possível no momento.
- **Código disponível** (sendText/sendMedia/sendDefenseDocument/getInstanceStatus/getQrCode/configureWebhook) em `whatsapp-service.ts`. NÃO TESTADO on-line (impossível sem container).
- **Webhook:** configurado por eventos MESSAGES_UPSERT/MESSAGES_UPDATE/SEND_MESSAGE/CONNECTION_UPDATE com custom header `X-Webhook-Secret` (timing-safe check). CONFIRMADO POR CÓDIGO. **Bloqueado em runtime pelo gate admin (ver §11-P0-1).**
- **Instância única:** só `EVOLUTION_INSTANCE_NAME` é usada em todo o código; `EVOLUTION_INSTANCE` (UUID) não é lido por nenhum arquivo de app. INEXISTENTE uso.

---

## 9. BANCO (schema real vs código)

| Tabela | Migração | Linhas (execução) | Observação |
|---|---|---|---|
| `marketing_leads` | 20260827000001 + 20260828* | 97 | RLS DISABLED (service_role only) — aceitável backend-only |
| `marketing_campaigns` | 20260827000002 | 8 (6 duplicadas) | sem UNIQUE(name) |
| `marketing_lead_campaigns` | 20260827000002 | 0 | UNIQUE(lead_id,campaign_id) |
| `marketing_messages` | 20260827000002 | 0 | sem UNIQUE(external_id) — retry pode duplicar |
| `marketing_automation_queue` | 20260827000002 | 0 | fila DB persistente |
| `marketing_automation_state` | 20260827000002 | 1 (STOPPED, processed=153) | |
| `collection_runs` | 20260828000001 | 25 | histórico scraper |
| `editorial_content` | **NÃO versionada** (só ALTER em 20260829) | 7 (todas agendado) | **schema drift** — tabela criada fora de migration |
| `content_versions` | NÃO versionada | 12 | schema drift |
| `publisher_jobs` | **NÃO versionada** | 0 | schema drift |
| `meta_accounts` | NÃO versionada | 0 | schema drift |
| `meta_tokens` | NÃO versionada | 0 | schema drift |
| `app_settings` | NÃO versionada | 25 | schema drift |

- **Colunas de segmento:** `editorial_content` real NÃO tem `audience/objective/campaign_type/b2c/b2b`; tem `cta`, `external_status`, `instagram_post_id` etc. adicionadas fora de migration. CONFIRMADO POR EXECUÇÃO.
- **Opt-out/block:** **INEXISTENTE** em todo schema (`grep` por opt_out/optout/unsubscribe/UNABLE) e em todo src (só unsubscribe de push/drive). CONFIRMADO POR CÓDIGO+EXECUÇÃO.
- **Conflitos frontend/backend/banco:** `EditorialContentItem.status` (TS) = 5 valores; DB `status` é text frouxo e workers usam `'em_revisao'` (permitido); rota valida 5 valores — divergência de contrato (rota rejeita status que o worker poderia escrever indiretamente). `ConnectionState` de contato B2C (lead status `new/qualifying/qualified/proposal/won/lost`) ≠ `marketing_leads.lead_type` — dois universos de lead sem relação.

---

## 10. WORKERS E FILAS

| Worker | Arquivo | Início | Fila | Persistência | Retry | Restart | Status real |
|---|---|---|---|---|---|---|---|
| Orquestrador (7 agentes) | `workers/marketing-orchestrator.worker.ts` | boot (server.ts) | evento in-memory | não | não | não | rodando |
| Publicação Meta | `workers/meta-publisher.worker.ts` | sob enqueue | **array em memória** + `publisher_jobs` (status only) | parcial | 3x, base 60s, linear | **perde fila no restart** | nunca processou job (0 publisher_jobs) |
| Métricas marketing | `workers/marketing-metrics.worker.ts` | boot | — | não | não | — | métricas por fórmula |
| Token renewal Meta | `workers/meta-token-renewal.worker.ts` | boot | — | lê meta_tokens (vazia) | — | — | idle |
| **Automação B2B** | `services/marketing-automation/worker.ts` | **manual via /start** | tabela DB | sim | attempts+1 (sem backoff, filtro de coluna possivelmente quebrado) | DB diz RUNNING com timer morto → corrigido p/ STOPPED (resolveEffectiveStatus) | STOPPED, 0 jobs |

Concorrência: workers são singletons in-process, sem lock de linha (`FOR UPDATE SKIP LOCKED`) — múltiplos processos poderiam processar a mesma fila. RISCO.

---

## 11. PROBLEMAS CRÍTICOS

1. **P0 — Gate admin global bloqueia webhooks públicos e todo o API de marketing (server.ts).** `app.use('/api', adminRoutes)` + `router.use(authenticateToken, requireAdmin)` em `admin.ts` cobre **todos** os `/api/*`. Em produção (`NODE_ENV=production`) `POST /api/webhooks/whatsapp` e `/api/meta/webhook` recebem 401 → **WhatsApp e Meta inbound mortos**. CONFIRMADO POR EXECUÇÃO (401 no webhook e em health/marketing/automation/whatsapp-status) e POR CÓDIGO. A correção do gate já existe em `src/server/app.ts` (admin só em `/api/admin`) — **server.ts (entry real) não aplicou**.
2. **P0 — Sem router de jornada WhatsApp.** Três jornadas convergem em `processIncomingMessage`. Parceiro B2B que responde: vira conversa B2C, recebe auto-resposta B2C (keyword R$97), `responded` é sobrescrito por `sent`, e o cadence B2B continua. CONFIRMADO POR CÓDIGO.
3. **P0 — Sem segmentação B2C/B2B persistida em nenhuma entidade de marketing/conversa.** `lead_type` cobre só sub-tipo B2B; campanhas sociais e editoriais sem público. CONFIRMADO POR CÓDIGO + EXECUÇÃO (schema).
4. **P0 — Evolution API offline.** Nenhum envio/recebimento possível (8090/8080 sem listener, docker sem daemon). CONFIRMADO POR EXECUÇÃO.
5. **P1 — B2B outbound nunca executado de verdade.** 0 lead_campaigns / 0 messages / 0 queue; worker STOPPED; start manual. CONFIRMADO POR EXECUÇÃO.
6. **P1 — Métricas marketing fabricadas** (`newCasesGenerated=publicado*0.5`, `conversionRate` por fórmula). CONFIRMADO POR CÓDIGO.
7. **P1 — Dupla via de publicação Meta** (`metaPublisher` vs `publish-7/-direct/-7-cache` com tokens/ids hardcoded `1199235773284220`). Risco de dupla postagem. CONFIRMADO POR CÓDIGO.
8. **P1 — Fila de publicação em memória** — restart perde jobs (já registrado na AUDITORIA-MARKETING.md §4; ainda vigente). CONFIRMADO POR CÓDIGO.
9. **P1 — BUG provável no filtro da fila B2B**: `.lt('attempts', 'max_attempts')` compara coluna com literal → pode zerar o processamento da fila. CONFIRMADO POR CÓDIGO / RISCO.
10. **P1 — Sem opt-out/bloqueio/frequência global**: mesmo telefone pode receber campanhas B2B paralelas (6 campanhas duplicadas), B2B + resposta automática B2C simultâneas. CONFIRMADO POR CÓDIGO.
11. **P1 — Schema não versionado**: `editorial_content`, `publisher_jobs`, `meta_accounts`, `meta_tokens`, `content_versions` sem migration. CONFIRMADO POR EXECUÇÃO (migrations ausentes).
12. **P1 — estado divergente server.ts vs app.ts** (dois entrypoints de montagem de rotas). CONFIRMADO POR CÓDIGO.
13. **P2 — Testes vitest não executáveis**: `*.test.ts` importam `vitest`, mas vitest não está em package.json (devDependencies ausente) e tsconfig exclui `**/*.test.ts` e `**/tests/**` do typecheck. CONFIRMADO POR EXECUÇÃO.

---

## 12. DUPLICAÇÕES

1. **Publicação Meta:** `metaPublisher` (fila+gate) **e** `metaPublishingService.publishToInstagram` direto em 3 rotas (`publish-direct`, `publish-7`, `publish-7-cache`). Arquivos: `routes/marketing.ts` vs `meta-publisher.worker.ts`.
2. **Entrypoints Express:** `server.ts` e `src/server/app.ts` com regras de montagem diferentes (gate admin).
3. **Normalização de telefone BR** duplicada: `src/scraper-prospecting/normalizer.ts` (normalizePhone) e `src/server/services/prospecting-responder.ts` (normalizeBrPhone) — código copiado com comentário "sem importar do scraper" (proposital por fronteira, mas duplicado).
4. **Campanhas duplicadas no banco:** 6× "Campanha Inaugural — Adeus Multas" (execução).
5. **Clientes Supabase admin:** `src/scraper-prospecting/supabase.ts` (supabaseAdmin) e `src/server/db/supabase-server.ts` (getSupabaseServerClient) — duas inicializações service-role.
6. **Enums de status:** `editorial_content.status` (TS 5 valores) vs rota (5) vs DB (text livre) vs worker ('em_revisao') — 4 definições.

---

## 13. GAPS ARQUITETURAIS

1. **Message Router de jornada (B2B outbound / B2B relationship / B2C):** INEXISTENTE. Não há componente que decida "incoming → B2B? B2C?". Requisito explícito da tarefa: registrar como GAP formal. O match telefônico aditivo não é router.
2. **Shared kernel de domínio WhatsApp:** os 3 fluxos compartilham infra (Evolution → gateway → messagingService) — **isso é bom** e atende à regra "não tratar como 3 sistemas". Mas o **roteamento de jornada** e o **estado de conversa B2B** não existem.
3. **Persistência da conversa B2C:** in-memory → perda total em restart; sem tabela `conversations/contacts` no Supabase.
4. **Segmento/audience como dado de primeira classe:** INEXISTENTE (schema, TS, UI).
5. **Opt-out/gov:** INEXISTENTE (LGPD/Conectar/qualidade).
6. **Estado de relacionamento B2B (responded→handoff humano, timeout, próximos passos):** INEXISTENTE.
7. **Observabilidade:** apenas logs; sem métricas reais de mensagens/campanhas (o collector fabrica).
8. **Scheduler externo / fila de jobs real:** nenhum (setInterval + tabela polling; publisher em memória).
9. **Integração editorial → WhatsApp para B2C:** INEXISTENTE (só social). B2C WhatsApp não tem campanhas — só resposta reativa.
10. **B2B scraper → campanha automático:** o loop leva→classifica→deduplica→persiste→entra em campanha é **manual em 2 pontos**: scraper (precisa /scrape ou CLI) e start de campanha (/campaigns/:id/start). Automação do CHAT é automática (worker), mas o disparo inicial não.

---

## 14. PLANO DE AÇÃO P0–P4 (não implementado — só plano)

### P0 — Bloqueadores
| # | Problema | Arquivo | Alteração | Deps | Teste | Aceite |
|---|---|---|---|---|---|---|
| P0.1 | Gate admin global bloqueia webhooks públicos | `server.ts` (mount `/api` admin); `routes/admin.ts` | Montar admin só em `/api/admin` (+ refinir rotas duplicadas); garantir `POST /api/webhooks/whatsapp`, `/api/meta/webhook` públicos | — | curl webhook sem auth → 200; health/marketing OK | Webhook Evolution/Meta responde 200 sem admin header em produção |
| P0.2 | Router de jornada WhatsApp | `messaging-service.ts` | Introduzir `journeyRouter`: incoming → resolve telefone em `marketing_leads` (B2B relationship) → else B2C; B2B NÃO dispara auto-resposta B2C; resposta B2B cancela próxima mensagem do cadence | P0.1, P3.4 | assert: inbound de lead B2B → sem reply B2C; status `responded` não volta a `sent` | Parceiro não recebe copy B2C; cadence para após resposta |
| P0.3 | Segmentação B2C/B2B persistida | migration nova + `types/messaging.ts` + `marketing_campaigns` | colunas `audience ('B2C'|'B2B')` em conteúdo/campanha/lead; `conversation.journey` | P0.2 | tsc + consulta | Every entidade de marketing tem audience explícito, obrigatório |
| P0.4 | Evolution API offline | `infra/docker/docker-compose.whatsapp.yml` | subir stack (`docker compose up -d`), conectar QR `whats_crm`, configurar webhook | ambiente | `GET /instance/connectionState` → open; curl webhook config | Instância `open`; webhook aponta `/api/webhooks/whatsapp` |

### P1 — Integração
| # | Problema | Arquivo | Alteração | Deps | Teste | Aceite |
|---|---|---|---|---|---|---|
| P1.1 | B2B outbound nunca rodou; filtro fila quebrado | `worker.ts:321` | `.lt('attempts','max_attempts')` → mover para `.or`/ filtro por `attempts.lt(...)` com max_resolvido; adicionar lock `FOR UPDATE SKIP LOCKED` | P0.4 | run manual 1 campanha 3 leads | 3 envios reais; fila drena; sem duplicata |
| P1.2 | Dupla via de publicação Meta | `routes/marketing.ts` | remover `publish-7*`/`publish-direct` (ou manter apenas com flag dev); caminho único `metaPublisher` | — | publicação única via publisher | 1 post por peça; histórico em `publisher_jobs` |
| P1.3 | Fila publisher volátil | `meta-publisher.worker.ts` | persistir `QueueItem[]` em tabela (reusar `publisher_jobs` com payload) + recovery no boot | — | restart do server com job pendente | Job retoma após restart |
| P1.4 | max_contacts morto | `worker.ts` | respeitar `max_contacts` (stop após N contatos reais) | P1.1 | lead com 1 contato → exhausted | Limite efetivo |
| P1.5 | Campanhas duplicadas no DB | SQL manual | deduplicar 6 "Campanha Inaugural"; UNIQUE(name, lead_type) | — | consulta | 2-3 campanhas únicas |

### P2 — Automação
| # | Problema | Arquivo | Alteração | Deps | Teste | Aceite |
|---|---|---|---|---|---|---|
| P2.1 | Scraper→campanha manual | `routes/marketing-automation.ts` | job agendado de scrape (intervalo) + auto-criação de lead_campaigns para campanhas `active` | P1.1 | dry-run sem envio | Lead coletado entra na fila sem operador |
| P2.2 | Início automático do worker no boot | `server.ts` | `marketingAutomationWorker.start()` no boot (com estado persistente + lock anti-multi-instância) | P1.1 | restart → RUNNING | Worker sobe sozinho, sem duplicar em 2 processos |

### P3 — Observabilidade / Governança
| # | Problema | Arquivo | Alteração | Deps | Teste | Aceite |
|---|---|---|---|---|---|---|
| P3.1 | Métricas fabricadas | `marketing-metrics.worker.ts` | coletar do `publisher_jobs` + Meta Insights reais; zerar fórmulas | P1.2 | comparar contagens | Métricas refletem jobs reais |
| P3.2 | Opt-out/bloqueio | migration + `worker.ts` + `messaging-service.ts` | coluna `marketing_leads.opt_out_at` + detector "pare/não quero" (B2B e B2C) + UNABLE/block da Evolution | P0.2 | envio a lead opt-out → bloqueado | Zero envio a opt-out; resposta "pare" para tudo |
| P3.3 | Frequência global por número | migration | tabela `contact_outbox` ou contador por telefone/dia + cap | P3.2 | simulação 2 campanhas | Máx N mensagens/dia por número |
| P3.4 | Persistir inbox B2C | migration + `messaging-service.ts` | tabelas `marketing_contacts/conversations/messages`; persistir no processIncomingMessage | P0.2 | restart → conversa mantida | Conversa sobrevive a restart |
| P3.5 | Schema versionado | `supabase/migrations` | migration para `editorial_content`, `publisher_jobs`, `meta_accounts`, `meta_tokens`, `content_versions` (baseline) | — | `supabase db diff` zero | Zero tabela fora de migration |

### P4 — Otimização
| # | Problema | Arquivo | Alteração | Deps | Teste | Aceite |
|---|---|---|---|---|---|---|
| P4.1 | status convergence | `types/index.ts` + rota + DB | enum único de status editorial (5 valores) alinhado DB/via | — | tsc + rota | Contrato único |
| P4.2 | Dupla normalização de telefone | `scraper-prospecting/normalizer.ts` | mover para shared kernel + importar | — | testes existentes | 1 implementação |
| P4.3 | Testes vitest | package.json | adicionar vitest + script; habilitar typecheck de tests | — | `npx vitest run` verde | Suíte executável no CI |

---

## 15. TESTES EXECUTADOS (comandos + saídas)

```
$ npx tsc --noEmit            → exit 0 (0 erros)
$ curl -s localhost:8090      → (sem resposta) código 000   # Evolution API OFFLINE
$ curl -s localhost:8080      → (sem resposta) código 000
$ curl -s localhost:3000/api/health                          → 401 {"error":"Não autorizado. Faça login como administrador."}
$ curl -s localhost:3000/api/marketing/automation/status     → 401 (idem)
$ curl -s localhost:3000/api/meta/status                     → 200 {status:"disconnected", pages:[], recentEventsCount:0, ...}
$ curl -s localhost:3000/api/admin/overview                  → 200 metrics (dev auto-login ativo)
$ curl -X POST localhost:3000/api/webhooks/whatsapp  (sem headers) → 401
$ curl -X POST localhost:3000/api/webhooks/whatsapp  (com x-user-role:admin) → 200 {"received":true,"success":true}
$ curl -s localhost:3000/api/marketing/automation/status (com headers admin) → {"status":"STOPPED","lastError":null,"lastProcessedAt":"2026-08-27T21:16:43.916Z","processedCount":153,"timerAlive":false}
$ docker info / docker compose ps → sem daemon (sem resposta em 120s)
```

**Banco (leitura, script node com service_role — apenas SELECT):**
```
marketing_leads: 97            marketing_campaigns: 8
marketing_lead_campaigns: 0    marketing_messages: 0
marketing_automation_queue: 0  marketing_automation_state: 1 (STOPPED, processed_count=153)
collection_runs: 25            editorial_content: 7 (status=agendado ×7)
publisher_jobs: 0              meta_accounts: 0   meta_tokens: 0
marketing_leads: 92 despachante / 5 advogado_transito / fonte google_maps ×97
editorial_content (schema real): NÃO tem audience/objective/campaign_type/b2c/b2b
marketing_leads (schema real): sem opt_out/unsubscribe/blocked
vitest: package ausente em node_modules → suíte .test.ts NÃO executável
```

**Fontes de verdade pré-existentes revisadas (desatualizadas em parte):** `AUDITORIA-MARKETING.md` (26/08 — Meta/disconnected & ComfyUI ainda válidos em essência; alguns pontos já evoluíram: rotas fixadas, gate adicionado), `AUDIT_SUMMARY.md`, `AUDIT_PHASE2_RESULTS.md`, `INTEGRATION_AUDIT.md`, `DATABASE_AUDIT.md`, `PRODUCTION_READINESS_AUDIT.md`, `DEAD_CODE_AUDIT.md`.

---

## 16. CRITÉRIOS DE ACEITE PARA CONSOLIDAÇÃO FUTURA

1. **Um único pipeline WhatsApp** com `journey` explícito por conversa (`B2B_OUTBOUND|B2B_RELATIONSHIP|B2C`) — decidido no router, persistido, visível na UI.
2. **Nenhuma tentativa de dupla persona**: lead que está em `marketing_leads` (ou conversa B2B) **nunca** recebe auto-resposta B2C nem campanha B2B paralela sem guarda; resposta de parceiro **não** dispara novo step.
3. **Audience obrigatório** em editorial_content, marketing_campaigns e lead — sem fallback que misture.
4. **Opt-out/bloqueio/frequência**: 100% dos caminhos de envio consultam antes de disparar; 0 envios a opt-out em teste automatizado.
5. **Webhooks públicos de fato**: `/api/webhooks/whatsapp` e `/api/meta/webhook` respondem sem auth em produção.
6. **Fila de publicação e inbox persistentes** (sobrevivem a restart) com retry idempotente (`external_id` único).
7. **Métricas reais** (publisher_jobs + Meta Insights), sem fórmula fabricada.
8. **Schema 100% versionado** em `supabase/migrations`; `supabase db diff` = zero.
9. **Suíte executável**: vitest no pipeline, `tsc --noEmit` inclui tests, teste de smoke B2B com 3 leads reais (envio válido) e evolution online.
10. **Entrypoint único**: `server.ts` e `app.ts` convergem (ou app.ts removido), sem dois montes de rotas.

---

## PENDÊNCIAS DE EXECUÇÃO NÃO FEITAS (por serem destrutivas/custo)

- Não subi o Docker da Evolution (alteraria ambiente).
- Não enviei mensagem WhatsApp real (irreversível para o lead).
- Não publiquei na Meta nem chamei scrape real (efeitos colaterais).
- Não validei token Meta via Graph (poderia expirar/rotacionar credencial).

---

## HANDOFF BACKEND — Rodada P0 (2026-08-29, executado por @backend)

### Corrigido (P0)
- **P0.1 — Gate admin global (server.ts).** Removido `app.use('/api', adminRoutes)` (linha 244 do entry real). `adminRoutes` (que carrega `router.use(authenticateToken, requireAdmin)`) agora monta **apenas em `/api/admin`** (linha 243), alinhando ao que `src/server/app.ts` já faz. Efeito: `POST /api/webhooks/whatsapp`, `/api/meta/webhook`, `/api/health`, `/api/marketing/*` e `/api/communication/*` voltam a responder **sem header admin**. `requireAdmin` permanece ativo em todas as rotas administrativas reais sob `/api/admin/*`. Frontend consumia apenas `/api/admin/*` (verificado por grep: `AdminDashboardView`, `AdminPaymentsView`, `AdminDocumentsView`, `AdminUsersListView`, `AdminAiGatewayView`, `AdminIntegrationsView`) — nenhum `/api/overview`/`/api/users` sem `/admin`. Evidência por execução (smoke com routers reais em porta 3999): webhook/health/marketing → 200 sem admin; `/api/admin/overview` → 200 com admin. **Exige restart do servidor de produção (pid antigo segue com código pré-fix em memória).**
- **P0-1b — Bug de drenagem fila B2B (worker.ts getNextActions).** Filtro `.lt('attempts', 'max_attempts')` comparava coluna `attempts` com o **literal string** `'max_attempts'` → PostgREST gerava cast `integer < 'max_attempts'` → erro sempre → `getNextActions` retornava `[]` → fila nunca drenava. Correção: PostgREST/supabase-js não compara coluna-vs-coluna; agora busca jobs por `scheduled_at <= now` (limit 30) e filtra `(attempts ?? 0) < (max_attempts ?? 3)` no cliente, retornando no máx 10. Sem migration (comparação resolvida em memória, colunas `attempts`/`max_attempts` são `NOT NULL` da própria tabela `marketing_automation_queue`).

### Documentado como gap (NÃO tocado — cruzamento de escopo/risco)
- **P1.2 — Dupla via de publicação Meta.** 3 rotas paralelas em `src/server/routes/marketing.ts` (`publish-7-cache`, `publish-direct`, `publish-7`) publicam DIRETO via `metaPublishingService.publishToInstagram` com token `.env` e página IG hardcoded `1199235773284220`; a via canônica `/publish` usa `metaPublisher.enqueue` (fila + gate de qualidade ADC-012). Nenhum consumidor de frontend usa as 3 rotas paralelas (verificado por grep) — só operação manual/curl. **Consolidar agora mudaria o comportamento funcional do fluxo de 7 dias** (gate de imagem rejeitaria as mídias hardcoded) e não há teste real do Meta (token não validado, Meta disconnected). Decisão: manter como está, registrar gap — consolidação para caminho único `metaPublisher` fica para rodada dedicada (P1.2) com Meta validado.
- **P0-3 — Router de jornada WhatsApp.** NÃO implementado nesta rodada (shared kernel + decisão topológica = @supervisor). Fluxos preservados: `processIncomingMessage` (B2C in-memory) em `messaging-service.ts` e `prospecting-responder` (B2B relationship). **Onde o router deve entrar:** em `messaging-service.ts`, dentro/antes de `processIncomingMessage` — resolver número contra `marketing_leads` (B2B relationship) → senão B2C; B2B não dispara auto-resposta B2C; resposta de parceiro não volta `responded → sent` (worker `handleSendMessage`). Decisão topológica do router compartilhado pertence ao @supervisor. Item A já garante o webhook Evolution público para receber.

### Handoff @banco
- **Segmento B2C/B2B persistido (P0.3 auditoria #3):** colunas de segmento em entidades de marketing/conversa (`audience` B2C|B2B) — decision de schema + migration.
- **Opt-out/bloqueio/frequência (P3.2/P3.3):** coluna `marketing_leads.opt_out_at` + tabela/contador de frequência por número — necessário antes de escalar B2B outbound real.
- **Schema não versionado (P1.11):** baselines para `editorial_content`, `publisher_jobs`, `meta_accounts`, `meta_tokens`, `content_versions`.
- **Fila publisher persistente (P1.3):** `QueueItem[]` em memória → tabela para recovery no restart.
- **Persistir inbox B2C (P3.4):** tabelas `marketing_contacts/conversations/messages` para a conversa sobreviver a restart.