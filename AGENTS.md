# Topologia de Agentes — DefesAi

> Gerado automaticamente pelo `@agent-loop` em 2024-08-19

---

## Visão Geral do Projeto

**DefesAi** — Plataforma de defesa de multas de trânsito com:
- Frontend: React 19 + TypeScript + Vite + TailwindCSS
- Backend: Express + TypeScript (server.ts)
- Database: Supabase (PostgreSQL) + Firebase
- Auth: Supabase Auth + Firebase Auth
- Payments: Resend (email) + Stripe (implícito)
- IA: Google GenAI + ComfyUI (marketing)

---

## Agents Disponíveis no Projeto

### Core Agents (Sempre Disponíveis)

| Agent | Papel | Quando Usar |
|-------|-------|-------------|
| `@agent-loop` | Orquestrador global | Qualquer task que precise de loop percepção→decisão→ação→verificação |
| `@supervisor` | Orquestrador universal | Conflitos entre agents, shared kernel, escalação, discovery pipeline |
| `@descoberta` | Discovery pipeline | Projeto novo ou redescoberta completa |
| `@qualidade` | Guardião qualidade | PR review, SOLID, acoplamento, performance, contratos |
| `@seguranca` | Auditoria segurança | OWASP, secrets, SSRF, injection, crypto |
| `@documentacao` | Documentação viva | ADRs, folder-structure, decision-log, roadmap |

### Domain Agents (Descobertos via Discovery Pipeline Fases 4-7)

| Agent | Domínio | Escopo Principal |
|-------|---------|------------------|
| `@defesa-transito` | **Defesa de Trânsito (CORE)** | Onboarding 5 situações × 9 categorias × 6 fases, Rule Engine determinístico (FACT→RULE→FLAW→ARGUMENT→BLOCK→PROCEDURE), análise gratuita, geração peças jurídicas, Quality Gate Fase 8 |
| `@base-legal` | **Base Legal** | CTB artigos, 27 DETRANs+PRF+DNIT+DERs, resoluções CONTRAN, jurisprudência, glossário — API somente leitura |
| `@conhecimento-juridico` | **Conhecimento Jurídico (RAG)** | Pipeline RAG: ingestão 50+ fontes/semana, embedding NVIDIA NV-Embed-QA (3 chaves round-robin), vector store, busca semântica, rerank Nemotron-3B, change detection |
| `@comunicacao-whatsapp` | **Comunicação WhatsApp** | Evolution API (Baileys): instâncias, envio/recebimento msg/mídia/docs, webhooks, jornadas conversacionais, templates HSM |
| `@marketing-aquisicao` | **Marketing & Aquisição** | 7 agentes autônomos, Meta Ads/Conversions API, ComfyUI criativos, Firecrawl prospecção, Resend email — **CANDIDATO A SPLIT** |
| `@pagamentos-comercial` | **Pagamentos & Comercial** | Catálogo ofertas, pricing dinâmico, checkout PIX/cartão (PagBank), webhooks idempotentes, payment_orders, ofertas bônus 3 docs |
| `@ocr-evidencias` | **OCR & Evidências** | Upload docs, OCR (Vision/Tesseract), quality gate, evidenceFlags para Rule Engine, Documenso assinatura digital |
| `@admin-observabilidade` | **Administração & Observabilidade** (Transversal) | Dashboard admin, health checks 12+ serviços, métricas AI providers, alertas PagerDuty/Slack, audit logs, config dinâmicas |
| `@trabalhadores-assincronos` | **Trabalhadores Assíncronos** (Infra) | BullMQ/Redis workers: scraping, OCR, messaging, marketing automation; retry/DLQ, autoscaling, zero HTTP routes |

### Specialized Agents

| Agent | Especialidade | Gatilhos |
|-------|---------------|----------|
| `@cloudflare` | Cloudflare | Workers, Pages, KV, D1, R2, Durable Objects |
| `@evolution-api` | WhatsApp | Instâncias, mensagens, webhooks, chatbot |
| `@marketing` | Marketing | Estratégia, conteúdo, SEO, ads, email, social |
| `@nvidia` | NVIDIA | RAG, ASR, Nemotron, AI-Q |

---

## Fronteiras e Contratos

### Backend ↔ Frontend
- **Contrato**: REST API via Express (server.ts)
- **Auth**: Supabase JWT + Firebase tokens
- **Dados**: Types compartilhados em `src/types/` (se existir)

### Frontend ↔ Database
- **Cliente**: `@supabase/supabase-js` direto no frontend
- **RLS**: Policies no Supabase controlam acesso
- **Realtime**: Supabase Realtime para updates live

### Backend ↔ Database
- **Admin client**: `supabase-js` com service role
- **Migrations**: `supabase/migrations/` versionadas
- **Triggers/Functions**: PostgreSQL nativo

---

## Fluxos de Trabalho Padrão

### 1. Nova Feature (Padrão)
```
@agent-loop (DISCOVERY)
    ↓
@descoberta (se projeto novo)
    ↓
@agent-loop (PLANNING) → define objetivo, escopo, agent inicial
    ↓
@backend / @frontend / @banco (EXECUTION)
    ↓
@testes (VERIFICATION)
    ↓
@qualidade (REVIEW)
    ↓
@agent-loop (DECISION) → DONE ou REPLAN
```

### 2. Bug Fix
```
@agent-loop (DISCOVERY)
    ↓
@build-error-resolver (se erro build/TS)
    ↓
@backend ou @frontend (EXECUTION)
    ↓
@testes (VERIFICATION)
    ↓
@agent-loop (DECISION)
```

### 3. Refatoração
```
@agent-loop (DISCOVERY)
    ↓
@refactor-cleaner (análise: knip, depcheck, ts-prune)
    ↓
@backend/@frontend (EXECUTION - mudanças seguras)
    ↓
@testes (VERIFICATION - regression check)
    ↓
@qualidade (REVIEW)
    ↓
@agent-loop (DECISION)
```

### 4. Feature Cross-Domínio (com @supervisor)
```
@supervisor (recebe demanda)
    ↓
@agent-loop (cria máquina de estados)
    ↓
@backend + @frontend + @banco (paralelo via task tool)
    ↓
@testes (integração)
    ↓
@qualidade (contratos)
    ↓
@supervisor (aprova final)
```

---

## Escopo Padrão por Agent

### @defesa-transito (CORE)
- **Permitido**: `src/core/onboarding/**`, `src/core/rules/**`, `src/core/validation/**`, `src/core/ai/**`, `src/core/arguments/**`, `src/core/procedures/**`, `src/core/templates/**`, `src/core/documents/**`, `src/onboarding-v2/**`, `src/server/routes/onboarding.ts`, `src/server/routes/onboarding-v2.ts`, `src/server/routes/cases.ts`
- **Proibido**: `src/server/routes/payments.ts`, `src/server/routes/marketing*.ts`, `src/server/routes/whatsapp.ts`, `src/server/routes/ocr.ts`, `src/server/routes/knowledge.ts`, `src/server/integrations/**`, `src/server/knowledge/**`, `src/core/knowledge/**`, `src/core/legal-base/**`
- **Pode importar**: `@compartilhado`, `@base-legal`, `@conhecimento-juridico`
- **Contratos**: `POST /api/onboarding/analyze`, `POST /api/onboarding-v2/start`, `POST /api/onboarding-v2/claim`, `GET/PUT /api/cases/:id`, `GET /api/cases/:id/analysis`, `POST /api/cases/:id/defense`

### @base-legal
- **Permitido**: `src/core/legal-base/**`
- **Proibido**: `src/core/onboarding/**`, `src/core/knowledge/**`, `src/server/routes/**`, `src/server/services/**`, `src/server/integrations/**`
- **Pode importar**: `@compartilhado`
- **Contratos**: `GET /api/knowledge/legal-base/ctb/:article`, `GET /api/knowledge/legal-base/organs`, `GET /api/knowledge/legal-base/resolutions`

### @conhecimento-juridico
- **Permitido**: `src/core/knowledge/**`, `src/server/knowledge/**`, `src/server/routes/knowledge.ts`, `src/core/rag/**`
- **Proibido**: `src/core/onboarding/**`, `src/core/rules/**`, `src/core/legal-base/**`, `src/server/routes/onboarding*.ts`, `src/server/routes/cases.ts`, `src/server/routes/payments.ts`, `src/server/routes/marketing*.ts`
- **Pode importar**: `@compartilhado`, `@base-legal`
- **Contratos**: `POST /api/knowledge/ingest`, `GET /api/knowledge/search`, `GET /api/knowledge/sources`, `POST /api/knowledge/monitor`

### @comunicacao-whatsapp
- **Permitido**: `src/server/routes/whatsapp.ts`, `src/server/routes/whatsapp-webhook.integration.test.ts`, `src/server/services/whatsapp-service.ts`, `src/server/services/whatsapp-journey-router.ts`, `src/server/services/messaging-service.ts`, `src/server/integrations/evolution-api/**`
- **Proibido**: `src/server/routes/onboarding*.ts`, `src/server/routes/cases.ts`, `src/server/routes/payments.ts`, `src/server/routes/marketing*.ts`, `src/server/routes/ocr.ts`, `src/server/integrations/meta/**`, `src/server/integrations/comfyui/**`
- **Pode importar**: `@compartilhado`, `@defesa-transito` (caseId), `@marketing-aquisicao`
- **Contratos**: `POST /api/whatsapp/send`, `POST /api/whatsapp/send-document`, `POST /api/whatsapp/send-media`, `POST /api/webhooks/whatsapp`, `GET /api/whatsapp/instances`

### @marketing-aquisicao
- **Permitido**: `src/server/routes/marketing.ts`, `src/server/routes/marketing-automation.ts`, `src/server/services/marketing-service.ts`, `src/server/services/marketing-automation/**`, `src/server/services/ai-media-service.ts`, `src/server/services/scraper-job-queue.ts`, `src/server/services/scrape-worker.ts`, `src/server/integrations/meta/**`, `src/server/integrations/comfyui/**`, `src/scraper-prospecting/**`, `src/data/marketing-agents-data.ts`
- **Proibido**: `src/core/onboarding/**`, `src/core/rules/**`, `src/core/legal-base/**`, `src/server/routes/payments.ts`, `src/server/routes/ocr.ts`, `src/server/knowledge/**`
- **Pode importar**: `@compartilhado`, `@defesa-transito` (temas), `@comunicacao-whatsapp` (envio)
- **Contratos**: `GET /api/marketing/agents`, `POST /api/marketing/content`, `POST /api/marketing/automation/leads`, `GET /api/marketing/meta/status`, `POST /api/scrape/jobs`

### @pagamentos-comercial
- **Permitido**: `src/server/routes/payments.ts`, `src/server/routes/commercial.ts`, `src/server/payments/**`, `src/server/services/commercial-service.ts`, `src/core/integrations/pagbank-client.ts`, `src/config/pricing.ts`, `src/types/commercial.ts`
- **Proibido**: `src/core/onboarding/**`, `src/core/rules/**`, `src/server/routes/marketing*.ts`, `src/server/routes/whatsapp.ts`, `src/server/routes/ocr.ts`, `src/server/integrations/meta/**`, `src/server/integrations/comfyui/**`
- **Pode importar**: `@compartilhado`, `@defesa-transito` (caseId, serviceType)
- **Contratos**: `GET /api/payments/resolve-price`, `POST /api/payments/create-order`, `POST /api/payments/webhooks/pagbank`, `GET/POST /api/commercial/offers`

### @ocr-evidencias
- **Permitido**: `src/server/routes/ocr.ts`, `src/server/routes/documenso.ts`, `src/server/services/ocr-service.ts`, `src/server/services/image-quality.service.ts`, `src/core/documents/defense-integrity.ts`
- **Proibido**: `src/core/onboarding/**`, `src/core/rules/**`, `src/server/routes/payments.ts`, `src/server/routes/marketing*.ts`, `src/server/routes/whatsapp.ts`, `src/server/integrations/**`
- **Pode importar**: `@compartilhado`, `@defesa-transito` (evidenceFlags)
- **Contratos**: `POST /api/ocr/upload`, `POST /api/ocr/process`, `GET /api/ocr/quality/:fileId`, `POST /api/documenso/sign`

### @admin-observabilidade (Transversal)
- **Permitido**: `src/server/routes/admin.ts`, `src/server/routes/monitoring.ts`, `src/server/routes/analytics.ts`, `src/server/routes/audit.ts`, `src/server/routes/logs.ts`, `src/server/routes/settings.ts`, `src/server/services/admin-query-service.ts`, `src/server/observability/**`
- **Proibido**: `src/core/onboarding/**`, `src/core/rules/**`, `src/core/legal-base/**`, `src/core/knowledge/**`, `src/server/routes/onboarding*.ts`, `src/server/routes/payments.ts`, `src/server/routes/marketing*.ts`, `src/server/routes/whatsapp.ts`, `src/server/routes/ocr.ts`
- **Pode importar**: `@compartilhado`, TODOS domínios (read-only agregação)
- **Contratos**: `GET /api/admin/overview`, `GET /api/admin/metrics`, `GET /api/health`, `GET /api/monitoring/*`, `GET /api/audit/logs`

### @trabalhadores-assincronos (Infra)
- **Permitido**: `src/server/workers/**`, `src/server/services/scraper-job-queue.ts`, `src/server/services/scrape-worker.ts`, `src/core/events/topics.ts`
- **Proibido**: `src/server/routes/**`, `src/core/onboarding/**`, `src/core/rules/**`, `src/server/integrations/**`
- **Pode importar**: `@compartilhado`, `@marketing-aquisicao` (via queue), `@ocr-evidencias` (via queue), `@comunicacao-whatsapp` (via queue)
- **Contratos**: BullMQ queues (scraping, ocr, messaging, marketing), `core/events/topics.ts`

### @compartilhado (Shared Kernel)
- **Permitido**: `src/types/**`, `src/lib/**`, `src/server/config/**`, `src/server/middleware/**`, `src/server/shared/**`, `src/core/mappers/**`, `src/core/events/**`
- **Proibido**: TODOS domínios de negócio (`src/core/onboarding/**`, `src/core/knowledge/**`, `src/core/legal-base/**`, `src/core/documents/**`, `src/server/routes/**`, `src/server/services/**`, `src/server/integrations/**`, `src/server/workers/**`)
- **Owner**: `@compartilhado` | **Mutable by**: `@compartilhado` + aprovação `@supervisor`
- **Contratos**: `types/index.ts`, `types/commercial.ts`, `canonical-mapper.ts`, `auth-middleware.ts`, `rate-limit.ts`, `cors.ts`, `pricing.ts`, `topics.ts`, `lib/supabase.ts`

### @supervisor | @qualidade | @documentacao
- **Permitido**: Orquestração, review, documentação (nenhum código de produção)
- **Proibido**: Implementar features de domínio

---

## Configuração Global

```json
{
  "project": "DefesAi",
  "root": "/home/lg/workspace/projects/DefesAi_AdeusMultas",
  "loop": {
    "max_attempts": 3,
    "auto_commit": true,
    "require_quality_gate": true,
    "learning_enabled": true
  },
  "agents": {
    "default_start_agent": "qualidade",
    "parallel_execution": true
  }
}
```

---

## Comandos Úteis

```bash
# Ver estado atual
cat .agent-loop/state.json

# Inicializar loop para task
loop:run "Descrição da task" --objective "Critério mensurável" --desired-state "Estado alvo" --agent backend

# Verificar gates
loop:gates

# Forçar replan
loop:replan --reason "Mudança de requisitos"

# Escalar para supervisor
loop:escalate --reason "Bloqueio arquitetural"
```

---

## Legacy Pipeline Agents (agents/)

> **⚠️ NÃO USADOS PELO RUNTIME.** Decisão arquitetural: [ADR-008](docs/adr/ADR-008-Agent-Topology-Unification.md).

O diretório `agents/` na raiz contém o **scaffold morto do antigo pipeline de agents** (sistema A):
- Definições `.md` + implementações `.ts` parciais: `base-agent`, `case-agent`, `ai-analysis-agent`, `document-agent`, `communication-agent`, `crm-agent`, `knowledge-agent`, `automation-agent`, `admin-agent`, `infrastructure-agent`, `marketing-agent`, `payment-agent` e subdiretórios (`legal/`, `document/`, `ocr/`, `quality/`, `product/`, `marketing-platform/`, `pipeline/`).

**Por que é legacy:**
- Zero imports de `src/` (`rg "agents/" src/` → 0 matches)
- **31 erros TypeScript pré-existentes, todos isolados em `agents/`** (verificado 2026-08-24 via `npx tsc --noEmit`: 31 erros, `TS2307` em `@/lib/types/agent-interfaces` + derivados; zero erros fora de `agents/`); depende de `CaseContext`, que nunca existiu ([ADR-005](docs/adr/ADR-005-Missing-Agent-Implementations.md))
- ⚠️ **Correção factual** ([Errata no ADR-008](docs/adr/ADR-008-Agent-Topology-Unification.md)): o commit `57253b9` citado anteriormente **não existe** no histórico atual. Em 2026-08-24 a exclusão `"agents"` foi **restaurada no `tsconfig.json`** (autorizada pelo usuário, executada via @build-error-resolver): o typecheck do projeto volta a zerar (`tsc --noEmit` → 0 erros); os 31 erros pré-existentes permanecem arquivados sob `agents/`, fora da checagem. Qualquer ressurreição deles exige ADR novo (Regras abaixo).

**Regras:**
1. Nenhum código novo importa de `agents/`.
2. Nenhum recurso novo é criado lá.
3. Deletar, migrar ou ressuscitar conteúdo de `agents/` exige um ADR novo.

**Fonte canônica da topologia de agents = este AGENTS.md** (sistema B, orquestrado por `@agent-loop`).

---

## Próximos Passos Recomendados

1. **Validar funcionamento**: Rodar um ciclo de teste simples
2. **Criar primeira task real**: Ex: "Corrigir onboarding etapa 3"
3. **Configurar @supervisor**: Se precisar de orquestração cross-domínio
4. **Ativar learning loop**: Para capturar padrões do projeto

---

*Este arquivo é mantido automaticamente pelo `@agent-loop` e `@documentacao`. Não edite manualmente — use os comandos do loop.*