# 📋 Relatório de Auditoria SRE — Observabilidade e Confiabilidade Operacional

**Projeto:** DefesAi (AdeusMultas-Defesa-)  
**Escopo:** Auditoria de prontidão de produção — leitura estática local apenas  
**Restrições:** Sem execução contra produção, sem escrita no banco, sem branches/PRs, sem alteração de arquivos  
**Data:** 21 de Outubro de 2026  
**Auditor:** SRE (Site Reliability Engineer)

---

## 🎯 Veredito Geral

### **BLOCKED** — Não Pronto para Produção

O sistema apresenta **falhas críticas nas áreas de SLO/error budget, ausência de alertas externos, falta de circuit breaker para pagamentos externos, logs apenas em memória sem envio para destino externo, e nenhuma estratégia de backup/DR (RPO/RTO não definidos).** Sem essas correções, um incidente em produção não seria detectado, não haveria orçamento de erro para decidir entre ship vs. fix, e não haveria mecanismo de recuperação para pagamentos travados por webhook perdido.

---

## 📊 Resumo Executivo de Achados

| Severidade | Quantidade | Categorias principais |
|------------|-----------|----------------------|
| 🔴 **CRÍTICO** | 4 | Ausência de SLO/error budget; alertas apenas em memória (sem PagerDuty/Slack/email); sem circuit breaker em pagamentos; sem backup/DR com RPO/RTO |
| 🟠 **ALTO** | 5 | Health check público não verifica dependências; métricas apenas em memória (sem Prometheus); não há rastreamento distribuído (traceId propagado); retry/backoff ausente em VenoPag e NVIDIA; webhook de pagamento perdido trava o caso |
| 🟡 **MÉDIO** | 4 | Logs não enviados para destino externo (ELK/Datadog/CloudWatch); correlação requestId não propagada via middleware global; health check não aciona failover automático; sem dashboard operacional |
| 🟢 **BAIXO** | 3 | Uso inconsistente de logger (alguns endpoints usam console.log); sem versionamento de SLOs; sem chaos engineering definido |

**Total: 16 achados**

---

## 🔍 Detalhamento por Área de Auditoria

---

### 1. Health Checks

**Existem endpoints:**
- `GET /api/health` (público, sem auth) — `src/server/routes/monitoring.ts:11` — retorna `{ status: 'ok' }` **sem verificar nenhuma dependência**. Sempre HTTP 200.
- `GET /api/monitoring/health` (protegido por admin) — `src/server/routes/monitoring.ts:19` — usa `HealthService.getHealth()` e verifica NVIDIA, 9Router, Gemini, Supabase DB, Supabase Auth, Edge Functions, PagBank, Meta, OCR, Storage.
- `GET /api/health` (outro) — `src/server/routes/health.ts:8` — retorna `{ status: 'ok' }` sem verificar DB.
- `GET /api/settings/health` — `src/server/routes/settings.ts:11` — retorna `{ status: 'ok' }` sem verificar dependências.

**Achados:**

| ID | Severidade | Arquivo:linha | Descrição |
|----|-----------|---------------|-----------|
| HC-01 | 🟠 ALTO | `src/server/routes/monitoring.ts:11` | O health check **público** (`/api/health`) retorna HTTP 200 mesmo quando todas as dependências estão down. Não é adequado para load balancer ou monitoramento externo, pois não reflete a real saúde do sistema. |
| HC-02 | 🟡 MÉDIO | `src/server/routes/health.ts:8-17` | Endpoint `/api/health` duplicado e superficial; não verifica Supabase, pagamentos ou IA. |
| HC-03 | 🟡 MÉDIO | `src/server/observability/health-service.ts:126-131` | O status geral é `DOWN` apenas se houver serviços com status `DOWN`. Não há degrade automático do tráfego nem failover baseado no health check (não é usado para drenar conexões). |
| HC-04 | 🟢 BAIXO | `src/server/observability/health-service.ts:98` | Cache de 5 segundos (`CACHE_TTL_MS = 5000`) pode mascarar falhas intermitentes curtas. |

**Recomendação:** Criar um endpoint `/api/health` público que retorne HTTP 503 (ou campo `status: "DOWN"`) quando dependências críticas (Supabase DB, gateway de pagamento ativo) estiverem down, e configurar o load balancer para usar esse endpoint. Expor versão sem auth apenas para liveness; readiness deve validar dependências.

---

### 2. Métricas

**Existem métricas em:**
- `src/server/observability/metrics-service.ts` — latências P50/P95/P99, erro rate, throughput (estimado), métricas de IA (NVIDIA, 9Router) com contadores de retry/fallback/timeout.
- `src/server/routes/analytics.ts` — métricas de negócio (casos processados, taxa de deferimento, MRR estimado, distribuição por órgão), mas apenas para admin dashboard, sem persistência.

**Achados:**

| ID | Severidade | Arquivo:linha | Descrição |
|----|-----------|---------------|-----------|
| MET-01 | 🟠 ALTO | `src/server/observability/metrics-service.ts:45-48` | Métricas ficam **apenas em memória** (arrays limitados: 500 latências, 300 latências por provedor de IA). São perdidas em reinício. Não há exportação para Prometheus, CloudWatch, Datadog ou qualquer backend de métricas externo. |
| MET-02 | 🟠 ALTO | `src/server/observability/metrics-service.ts:202` | `requestsPerMin` é uma estimativa grosseira (`latencies.length * 6`), não métrica real baseada em timestamps. |
| MET-03 | 🟠 ALTO | `src/server/observability/metrics-service.ts` (geral) | **Não há métricas de negócio**: casos criados, pagamentos processados, falhas de webhook, conversão análise→defesa, receita por gateway. O `analytics.ts` calcula essas métricas sob demanda a partir do `databaseRows` (memória), não como métricas agregadas persistentes. |
| MET-04 | 🟡 MÉDIO | (não existe dashboard) | Não há dashboard operacional (Grafana, Datadog, etc.) consumindo as métricas. Os endpoints `/metrics` e `/ai-pipeline` são JSON brutos sem histórico. |

**Recomendação:** Expor métricas no formato Prometheus (`/metrics` em formato texto) e configurar scraping. Adicionar contadores de negócio: `cases_created_total`, `payments_processed_total`, `webhook_failures_total`, `payment_webhook_lag_seconds`, `defense_generation_failures_total`.

---

### 3. Alertas

**Existem alertas em:**
- `src/server/observability/alerts-service.ts` — thresholds: erro rate 5%, p95 latency 3000ms, 3 falhas consecutivas de IA, fallback rate 15%. Alertas ficam em memória (array de 100 itens).

**Achados:**

| ID | Severidade | Arquivo:linha | Descrição |
|----|-----------|---------------|-----------|
| ALT-01 | 🔴 CRÍTICO | `src/server/observability/alerts-service.ts:32` | Alertas ficam **apenas em memória**. Não há integração com PagerDuty, Slack, email ou qualquer canal de notificação externo. Um alerta disparado em produção não notifica ninguém. |
| ALT-02 | 🔴 CRÍTICO | `src/server/observability/alerts-service.ts:55-86` | Não há avaliação automática dos thresholds contra as métricas (não há loop de avaliação / alerta baseado em métrica). O método `triggerAlert` só é chamado manualmente. |
| ALT-03 | 🟠 ALTO | `src/server/observability/alerts-service.ts:33-38` | Não há thresholds para: DB Supabase down, falha de pagamento, webhook de pagamento não recebido, erro rate de pagamentos, latência p99, fallback rate de IA acima do limite. |
| ALT-04 | 🟡 MÉDIO | `src/server/observability/alerts-service.ts:81` | Array de alertas limitado a 100 itens; alertas antigos são descartados sem persistência. |

**Recomendação:** Implementar avaliação contínua de thresholds (a cada 30-60s) e integração com PagerDuty/Slack/email via webhook. Alertas críticos: DB down, erro rate > 5% por 5 min, falha de pagamento > 10 min, webhook de pagamento pendente > 15 min.

---

### 4. Logging Estruturado

**Existe em:** `src/server/observability/logger.ts` — `StructuredLogger` com:
- Schema estruturado com `requestId`, `correlationId`, `service`, `module`, `operation`, `status`, `duration`, `errorCode`, `provider`, `model`
- Sanitização de dados sensíveis (API keys, bearer tokens, CPF, CNH, RG, telefone, email, placa)
- Ring buffer de 2000 itens em memória
- Níveis: debug, info, warn, error, fatal
- Event bus para listeners em tempo real
- Query/filtro por nível, serviço, provedor, status, correlationId, caseId, requestId, busca textual, datas

**Achados:**

| ID | Severidade | Arquivo:linha | Descrição |
|----|-----------|---------------|-----------|
| LOG-01 | 🟠 ALTO | `src/server/observability/logger.ts:82-84, 250-254` | Logs ficam **apenas em memória** (ring buffer de 2000 itens). Não são enviados para destino externo (ELK, Datadog, CloudWatch, Loki). Em reinício, todo histórico é perdido. |
| LOG-02 | 🟠 ALTO | `src/server/observability/logger.ts:257-268` | Saída é `console.error`/`console.warn`/`console.debug`. Em produção (Vercel/Cloudflare), isso depende do captura de stdout da plataforma; não há garantia de envio para sistema de logs centralizado. |
| LOG-03 | 🟡 MÉDIO | `src/server/routes/cases.ts:54, 68` | Uso inconsistente: alguns endpoints usam `console.log` diretamente em vez do `StructuredLogger` (ex: `console.log("GET /cases user:", user)`). |
| LOG-04 | 🟢 BAIXO | `src/server/observability/logger.ts:459-461` | Método `clear()` apaga todos os logs em memória; sem retenção configurável nem exportação antes da limpeza. |

**Recomendação:** Configurar envio de logs para destino externo (ex: CloudWatch Logs, Datadog, Loki, ou pelo menos um syslog/HTTP endpoint). Adicionar middleware global no Express para injetar `x-request-id` do header do cliente em todos os logs de requisição. Garantir que todos os endpoints usem `logger.info/error` em vez de `console.log`.

---

### 5. SLOs / SLAs / Error Budget

**Achados:**

| ID | Severidade | Arquivo:linha | Descrição |
|----|-----------|---------------|-----------|
| SLO-01 | 🔴 CRÍTICO | (não existe) | **Não há definição de SLO** (disponibilidade, latência p95, erro rate) em nenhum arquivo do código. Não há `slo.yaml`, nem definição em `config-service.ts`, nem documentação de SLO. |
| SLO-02 | 🔴 CRÍTICO | (não existe) | **Não há error budget** definido. Não há política do que acontece quando o error budget se esgota (bloquear deploys de features, focar em confiabilidade, etc.). |
| SLO-03 | 🟡 MÉDIO | `src/server/config/config-service.ts:171-191` | Existem configurações relacionadas (`AI_TIMEOUT_MS = 8000`, `AI_MAX_RETRIES = 2`, `AI_ENABLE_FALLBACK = true`) mas não estão atreladas a nenhum SLO formal. |

**Recomendação:** Definir SLOs formais (ex: disponibilidade 99.9% nos últimos 30 dias, latência p95 < 500ms para API de casos, erro rate < 1% para pagamentos). Definir error budget e política: se error budget consumido > X%, suspender deploys de novas features e priorizar correções de confiabilidade. Documentar em `docs/specs/SLO-DEFINICOES.md`.

---

### 6. Tracing / Distributed Tracing

**Achados:**

| ID | Severidade | Arquivo:linha | Descrição |
|----|-----------|---------------|-----------|
| TRC-01 | 🟠 ALTO | (não existe propagação) | **Não há rastreamento distribuído.** O `correlationId` existe no logger mas não é propagado via header HTTP entre serviços (frontend → backend → Supabase → VenoPag → Google GenAI → Resend). Não há `traceId` nem `spanId`. |
| TRC-02 | 🟠 ALTO | `src/shared/api/http.ts:4-5` | O frontend gera `requestId` via `crypto.randomUUID()` e envia header `x-request-id`, mas o backend não tem middleware global para extrair esse header e propagá-lo para o `StructuredLogger` de cada requisição. |
| TRC-03 | 🟡 MÉDIO | `src/server/observability/ai-provider-manager.ts:58` | O `correlationId` é gerado internamente no AI provider manager, mas não é vinculado ao `requestId` da requisição HTTP original. |

**Recomendação:** Adicionar middleware Express que leia `x-request-id` do header, crie/mantenha `correlationId`, e injete no `logger` de todas as requisições. Propagar `traceparent` (W3C Trace Context) para chamadas externas (VenoPag, Google GenAI, Supabase). Considerar OpenTelemetry ou Jaeger.

---

### 7. Circuit Breaker / Retry

**Achados:**

| ID | Severidade | Arquivo:linha | Descrição |
|----|-----------|---------------|-----------|
| CB-01 | 🟠 ALTO | `src/server/integrations/gateway/venopag-adapter.ts:101-142` | Chamadas para VenoPag têm timeout de 12s mas **não há retry** nem **circuit breaker**. Se o VenoPag estiver indisponível, cada requisição falha imediatamente sem tentativa de recuperação. |
| CB-02 | 🟠 ALTO | `src/server/observability/ai-provider-manager.ts:102-121` | Chamada para NVIDIA usa `fetch` direto **sem retry** e **sem timeout explícito** (usa o timeout global do fetch, não controlado). O fallback existe (NVIDIA → 9Router → Gemini → RAG) mas não há retry com backoff exponencial antes do fallback. |
| CB-03 | 🟡 MÉDIO | `src/server/integrations/gateway/venopag-adapter.ts:241-248` | Em modo produção, falha no VenoPag lança erro e não cria transação. Não há fallback para outro gateway de pagamento (o GatewayManager só suporta VenoPag). |
| CB-04 | 🟢 BAIXO | `src/integrations/meta/client/meta-graph-client.ts:222-231` | Retry com backoff exponencial existe **apenas** para Meta Graph API (1s, 2s, 4s). Não é um padrão aplicado a outros clientes externos. |
| CB-05 | 🟢 BAIXO | `src/server/config/config-service.ts:182-191` | `AI_MAX_RETRIES = 2` está definido mas não é usado como retry com backoff no código de chamada NVIDIA (o retry é implícito via fallback, não retry do mesmo provedor). |

**Recomendação:** Implementar circuit breaker (ex: após 5 falhas consecutivas, abrir circuito por 60s) e retry com backoff exponencial para VenoPag, NVIDIA, Google GenAI, ComfyUI e Resend. Adicionar fallback elegante para pagamento (fila de pagamento pendente para retry posterior).

---

### 8. Backup e DR (Disaster Recovery)

**Achados:**

| ID | Severidade | Arquivo:linha | Descrição |
|----|-----------|---------------|-----------|
| DR-01 | 🔴 CRÍTICO | (não existe) | **Não há estratégia de backup do Supabase** definida no código ou documentação. Supabase é BaaS; backup depende de configuração externa da plataforma, não verificada aqui. |
| DR-02 | 🔴 CRÍTICO | (não existe) | **Não há PITR (Point-in-Time Recovery)** definido. |
| DR-03 | 🔴 CRÍTICO | (não existe) | **Não há teste de restore** documentado ou automatizado. |
| DR-04 | 🟠 ALTO | (não existe) | **RPO/RTO não definidos.** Não há documento de DR com objetivo de ponto de recuperação nem tempo de recuperação. |

**Recomendação:** Definir RPO (ex: máximo 1 hora de perda de dados) e RTO (ex: máximo 4 horas para restauração). Configurar backups automáticos do Supabase (se disponível no plano) e testar restore periodicamente. Documentar runbook de DR.

---

### 9. Chaos / Resiliência

**Achados:**

| ID | Severidade | Arquivo:linha | Descrição |
|----|-----------|---------------|-----------|
| CHA-01 | 🟠 ALTO | `src/server/routes/payments.ts:599-650` | Se o webhook de pagamento (PagBank/VenoPag/GGPIXAPI) **não for recebido** (rede, gateway down, assinatura inválida), o caso fica com `isPaid = false` e `status` não avança para `defesa_pronta`. Não há job de reconciliação para detectar pagamentos pendentes e consultar o gateway. |
| CHA-02 | 🟡 MÉDIO | `src/server/routes/payments.ts:628-650` | A geração da defesa após pagamento falha silenciosamente (catch não-bloqueante, linha 645-650). O pagamento fica aprovado mas sem defesa gerada; não há retry automático. |
| CHA-03 | 🟢 BAIXO | `src/server/observability/ai-provider-manager.ts:240-252` | IA degrada graciosamente: NVIDIA → 9Router → Gemini → RAG determinístico. Este é o único mecanismo de degradação graciosa bem implementado. |
| CHA-04 | 🟢 BAIXO | `src/server/observability/health-service.ts:741-772` | OCR é reportado como healthy sem verificação real (simulado). Não há degradação graciosa se OCR falhar no fluxo real. |

**Recomendação:** Implementar job de reconciliação de pagamentos (ex: a cada 15 min, consultar casos com `status = aguardando_pagamento` há mais de 30 min diretamente no gateway). Adicionar retry de geração de defesa após falha. Implementar chaos engineering em staging (desligar ComfyUI, Google GenAI, VenoPag propositalmente e verificar degradação).

---

## 📋 Tabela Consolidada de Achados

| ID | Severidade | Área | Arquivo:linha | Resumo |
|----|-----------|------|---------------|--------|
| HC-01 | ALTO | Health check | `src/server/routes/monitoring.ts:11` | Health público retorna 200 sem verificar dependências |
| HC-02 | MÉDIO | Health check | `src/server/routes/health.ts:8-17` | Endpoint duplicado e superficial |
| HC-03 | MÉDIO | Health check | `src/server/observability/health-service.ts:126-131` | Sem failover baseado em health check |
| HC-04 | BAIXO | Health check | `src/server/observability/health-service.ts:98` | Cache de 5s mascara falhas curtas |
| MET-01 | ALTO | Métricas | `src/server/observability/metrics-service.ts:45-48` | Métricas só em memória, sem exportação externa |
| MET-02 | ALTO | Métricas | `src/server/observability/metrics-service.ts:202` | Throughput é estimativa grosseira |
| MET-03 | ALTO | Métricas | `src/server/observability/metrics-service.ts` (geral) | Sem métricas de negócio (casos, pagamentos, falhas webhook) |
| MET-04 | MÉDIO | Métricas | (não existe dashboard) | Sem dashboard operacional |
| ALT-01 | CRÍTICO | Alertas | `src/server/observability/alerts-service.ts:32` | Alertas só em memória, sem notificação externa |
| ALT-02 | CRÍTICO | Alertas | `src/server/observability/alerts-service.ts:55-86` | Sem avaliação automática de thresholds |
| ALT-03 | ALTO | Alertas | `src/server/observability/alerts-service.ts:33-38` | Sem thresholds para DB down, pagamento, webhook |
| ALT-04 | MÉDIO | Alertas | `src/server/observability/alerts-service.ts:81` | Retenção de 100 alertas, sem persistência |
| LOG-01 | ALTO | Logging | `src/server/observability/logger.ts:82-84, 250-254` | Logs só em memória, sem destino externo |
| LOG-02 | ALTO | Logging | `src/server/observability/logger.ts:257-268` | Saída apenas console, sem envio centralizado |
| LOG-03 | MÉDIO | Logging | `src/server/routes/cases.ts:54, 68` | Uso de console.log inconsistente |
| LOG-04 | BAIXO | Logging | `src/server/observability/logger.ts:459-461` | clear() apaga logs sem retenção |
| SLO-01 | CRÍTICO | SLO/SLA | (não existe) | Sem definição de SLO |
| SLO-02 | CRÍTICO | SLO/SLA | (não existe) | Sem error budget nem política de esgotamento |
| SLO-03 | MÉDIO | SLO/SLA | `src/server/config/config-service.ts:171-191` | Configs de IA não atreladas a SLO formal |
| TRC-01 | ALTO | Tracing | (não existe) | Sem rastreamento distribuído, sem traceId propagado |
| TRC-02 | ALTO | Tracing | `src/shared/api/http.ts:4-5` | Sem middleware global de correlação requestId |
| TRC-03 | MÉDIO | Tracing | `src/server/observability/ai-provider-manager.ts:58` | correlationId não vinculado ao requestId HTTP |
| CB-01 | ALTO | Circuit breaker | `src/server/integrations/gateway/venopag-adapter.ts:101-142` | Sem retry nem circuit breaker em VenoPag |
| CB-02 | ALTO | Circuit breaker | `src/server/observability/ai-provider-manager.ts:102-121` | Sem retry/backoff na chamada NVIDIA |
| CB-03 | MÉDIO | Circuit breaker | `src/server/integrations/gateway/venopag-adapter.ts:241-248` | Sem fallback de pagamento se VenoPag falhar |
| CB-04 | BAIXO | Circuit breaker | `src/integrations/meta/client/meta-graph-client.ts:222-231` | Retry apenas para Meta, não padronizado |
| CB-05 | BAIXO | Circuit breaker | `src/server/config/config-service.ts:182-191` | AI_MAX_RETRIES definido mas não usado como retry |
| DR-01 | CRÍTICO | Backup/DR | (não existe) | Sem estratégia de backup do Supabase |
| DR-02 | CRÍTICO | Backup/DR | (não existe) | Sem PITR |
| DR-03 | CRÍTICO | Backup/DR | (não existe) | Sem teste de restore |
| DR-04 | ALTO | Backup/DR | (não existe) | RPO/RTO não definidos |
| CHA-01 | ALTO | Chaos/Resiliência | `src/server/routes/payments.ts:599-650` | Webhook perdido trava o caso, sem reconciliação |
| CHA-02 | MÉDIO | Chaos/Resiliência | `src/server/routes/payments.ts:628-650` | Falha na geração de defesa não tem retry |
| CHA-03 | BAIXO | Chaos/Resiliência | `src/server/observability/ai-provider-manager.ts:240-252` | IA degrada graciosamente (bom) |
| CHA-04 | BAIXO | Chaos/Resiliência | `src/server/observability/health-service.ts:741-772` | OCR simulado no health check |

---

## ✅ O Que Está Bem (Pontos Fortes)

1. **StructuredLogger robusto** — sanitização de dados sensíveis (CPF, CNH, RG, telefone, email, placa, chaves de API), ring buffer, correlação por correlationId, query/filtro avançado. (`src/server/observability/logger.ts`)
2. **Health check real de integrações** — verifica NVIDIA, 9Router, Gemini, Supabase, Edge Functions, PagBank, Meta, OCR com latência medida. (`src/server/observability/health-service.ts`)
3. **Fallback de IA em cadeia** — NVIDIA → 9Router → Gemini → RAG determinístico, com degradação graciosa. (`src/server/observability/ai-provider-manager.ts`)
4. **Idempotência de webhooks** — uso de `webhookRepository.acceptEvent/completeEvent` com dedup durável. (`src/server/routes/payments.ts:586-696`)
5. **HMAC-SHA256 em webhooks** — verificação de assinatura para PagBank e VenoPag. (`src/server/routes/payments.ts:568`, `cloudflare/venopag.ts:107-116`)
6. **Métricas de IA detalhadas** — P50/P95/P99, sucesso/falha, timeouts, retries, fallbacks, tokens. (`src/server/observability/metrics-service.ts`)

---

## 🛠️ Recomendações de Métricas, Alertas, Health Checks e SLOs

### Métricas recomendadas (Prometheus/OpenTelemetry)

| Métrica | Tipo | Descrição |
|---------|------|-----------|
| `http_requests_total` | Counter | Requisições HTTP por método, endpoint, status code |
| `http_request_duration_seconds` | Histogram | Latência de requisições (p50, p95, p99) |
| `ai_provider_requests_total` | Counter | Requisições por provedor de IA (nvidia, 9router, gemini) |
| `ai_provider_fallback_total` | Counter | Fallbacks acionados entre provedores de IA |
| `payment_orders_created_total` | Counter | Ordens de pagamento criadas por gateway |
| `payment_webhook_received_total` | Counter | Webhooks de pagamento recebidos por gateway |
| `payment_webhook_failures_total` | Counter | Falhas de processamento de webhook de pagamento |
| `webhook_pending_duration_seconds` | Gauge | Tempo que um pagamento ficou pendente sem webhook |
| `cases_created_total` | Counter | Casos criados por tipo de serviço |
| `defense_generation_failures_total` | Counter | Falhas na geração automática de defesa |

### Alertas recomendados (PagerDuty/Slack/email)

| Condição | Severidade | Canal | Ação |
|----------|-----------|-------|------|
| Supabase DB DOWN | Critical | PagerDuty + Slack | Incident imediato |
| Erro rate > 5% por 5 min | Warning | Slack | Investigar |
| Latência p95 > 3000ms por 10 min | Warning | Slack | Investigar |
| Webhook de pagamento pendente > 15 min | Critical | PagerDuty | Reconciliar pagamento |
| Falha de pagamento > 10 min | Critical | PagerDuty | Verificar gateway |
| Fallback rate de IA > 15% | Warning | Slack | Verificar NVIDIA |
| Error budget consumido > 80% | Critical | PagerDuty + Slack | Bloquear deploys de features |

### Health checks recomendados

- `GET /health` — liveness: retorna 200 se o processo está vivo (não verifica dependências)
- `GET /ready` — readiness: retorna 200 apenas se Supabase DB e gateway de pagamento ativo estão respondendo; 503 caso contrário
- Usar `/ready` no load balancer para drenar tráfego

### SLOs recomendados (documentar em `docs/specs/SLO-DEFINICOES.md`)

| SLO | Alvo | Janela | SLI |
|-----|------|--------|-----|
| Disponibilidade da API | 99.9% | 30 dias | Requisições com status < 500 / total |
| Latência p95 (API de casos) | < 500ms | 30 dias | Requisições com duração < 500ms / total |
| Erro rate de pagamentos | < 1% | 30 dias | Pagamentos com erro / total de pagamentos |
| Disponibilidade de webhook de pagamento | 99.5% | 30 dias | Webhooks processados com sucesso / total recebido |

**Política de error budget:** Se error budget consumido > 10% da janela, suspender deploys de novas features e priorizar correções de confiabilidade até recuperar.

---

## 📄 Veredito Final

**BLOCKED** — O sistema não está pronto para produção nos pilares de observabilidade e confiabilidade. Os itens críticos (SLO/error budget ausentes, alertas apenas em memória sem notificação externa, sem circuit breaker em pagamentos externos, sem backup/DR com RPO/RTO) bloqueiam a implantação segura. Os itens altos (health check público falso, métricas apenas em memória, sem rastreamento distribuído, webhook perdido trava caso) devem ser corrigidos antes de qualquer tráfego real.

---

*Relatório gerado por auditoria estática local. Nenhum arquivo foi alterado, nenhuma branch criada, nenhuma execução contra produção realizada.*