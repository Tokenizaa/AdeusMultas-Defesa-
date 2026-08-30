# ADR-016: Marketing Platform + Meta Platform Integration Audit

**Date:** 2026-08-29
**Status:** PROPOSED (Audit Phase - No Execution)
**Author:** Meta Platform Agent (audit mode)

---

## Context

The AdeusMultas-Defesa project has a Marketing OS with B2C/B2B capabilities, Meta integration (Facebook, Instagram, WhatsApp via Evolution API), and autonomous workers. A comprehensive audit was performed to determine if the existing governance (@marketing, @backend, @ad, agents/marketing-platform) is actually controlling production execution or merely existing as unused files.

---

## Decision

**This ADR documents the audit findings. NO CHANGES ARE AUTHORIZED.** The purpose is to establish a baseline diagnosis before any integration work begins.

---

## Audit Findings Summary

### A. Agent Map (Marketing Platform)

| Agent | Responsibility | Skill Used | Called By | Status |
|-------|---------------|------------|-----------|--------|
| `marketing-orchestrator` | 7-agent cycle (5min) | Internal workers | `server.ts` boot | **RUNNING IN PROCESS** (not persistent) |
| `estrategicoAgent` | Strategy | None (inline) | Orchestrator | **MOCK DATA** (hardcoded) |
| `planejamentoAgent` | Planning | None (inline) | Orchestrator | **MOCK DATA** |
| `criadorAgent` | Content creation | `ai-media-service` | Orchestrator | **PARTIAL** (fallback mocks) |
| `qualidadeAgent` | Quality review | None (inline) | Orchestrator | **NOT EXECUTED** |
| `publicacaoAgent` | Publication | `metaPublisher` | Orchestrator | **QUEUE IN MEMORY** |
| `inteligenciaAgent` | Metrics | `marketing-metrics` worker | Orchestrator | **PLACEHOLDER METRICS** |
| `aprendizadoAgent` | Learning | None | Orchestrator | **NOT EXECUTED** |
| `marketingAutomationWorker` | B2B cadence | Evolution API + Supabase queue | API `/automation/start` | **PERSISTENT QUEUE** ✅ |
| `metaPublisher` | Meta publication | `metaAdapter` + `metaPublishingService` | API `/marketing/publish` | **IN MEMORY QUEUE** ❌ |
| `messagingService` | Omnichannel inbox | 4 Channel Adapters | Webhooks + API | **IN MEMORY ONLY** ❌ |

### B. Skill Map (Marketing Platform)

| Skill | Location | Used By | Runtime? | Production? |
|-------|----------|---------|----------|-------------|
| `marketing-service` | `src/server/services/marketing-service.ts` | Orchestrator, API routes | ✅ Yes | ⚠️ Partial (mock fallbacks) |
| `ai-media-service` | `src/server/services/ai-media-service.ts` | `criadorAgent`, Studio UI | ✅ Yes | ❌ **Mock SVG/Video fallbacks in prod path** |
| `metaAdapter` | `src/integrations/meta/adapters/meta-adapter.ts` | `metaPublisher`, API routes | ✅ Yes | ⚠️ Configured but not tested |
| `metaPublishingService` | `src/integrations/meta/publishing/meta-publishing-service.ts` | `metaAdapter` | ✅ Yes | ❌ Not executed |
| `metaWebhookService` | `src/integrations/meta/webhooks/meta-webhook-service.ts` | Webhook endpoint | ✅ Yes | ❌ Not validated in prod |
| `whatsappService` | `src/server/services/whatsapp-service.ts` | `messagingService`, B2B worker | ✅ Yes | ❌ Evolution not running |
| `marketingAutomationWorker` | `src/server/services/marketing-automation/worker.ts` | API routes | ✅ Yes | ✅ **Only persistent worker** |
| `messagingService` | `src/server/services/messaging-service.ts` | Inbox UI, webhooks | ✅ Yes | ❌ **In-memory only** |

### C. Real Pipeline (Current State)

```
MARKETING STRATEGY
       ↓
[estrategicoAgent] → HARDCODED MOCK → marketingService (in-memory)
       ↓
RESEARCH / PLANNING
       ↓
[planejamentoAgent] → HARDCODED MOCK → marketingService
       ↓
CONTENT CREATION
       ↓
[criadorAgent] → ai-media-service → createFallbackImage() [SVG MOCK] → marketingService
       ↓
CREATIVE / MEDIA
       ↓
MediaStudioView (UI) → ComfyUI (NOT RUNNING, NO MODELS) → fallback mock
       ↓
QUALITY / REVIEW
       ↓
[qualidadeAgent] → NOT EXECUTED (no quality gate enforced)
       ↓
APPROVAL
       ↓
UI Manual (ContentKanban drag-drop → status='aprovado_qualidade')
       ↓
SCHEDULING
       ↓
editorial_content.scheduled_at (NO SCHEDULER - manual trigger only)
       ↓
PUBLICATION
       ↓
API /marketing/publish → metaPublisher.enqueue() → IN MEMORY ARRAY → metaAdapter → Meta API
       ↓                           ↑
                              LOST ON RESTART
       ↓
METRICS
       ↓
marketingMetricsCollector (PLACEHOLDER VALUES) → Dashboard
```

### D. Bypasses Found (Code Ignoring Governance)

| Bypass | Location | Governance Ignored |
|--------|----------|-------------------|
| **Agent → Service Direct** | `criadorAgent` → `aiMediaService.generateImage()` | Should use Skill contract |
| **Worker → Service Direct** | `metaPublisher` → `metaAdapter.publishContent()` | Should use Skill → contract → service |
| **Frontend → Backend Bypass** | `MarketingOSView` → `metaPublisher.getQueue()` (direct singleton) | Should use API route |
| **Publication → No Quality Gate** | `metaPublisher.enqueue()` has gate BUT `publish-direct` bypasses it | Quality gate circumvented |
| **Campaign → Direct Creation** | `POST /marketing/automation/campaigns` creates directly | No strategy/planning agent involvement |
| **Meta → Publication Without Campaign** | `metaPublisher.enqueue()` accepts `contentId` but no `campaign_id` validation | Campaign governance missing |
| **WhatsApp B2C → In Memory** | `messagingService` Maps for contacts/conversations | No persistence = no governance |
| **Scheduler → Missing** | No cron/Redis/BullMQ for `scheduled_at` | Scheduled content never auto-publishes |
| **B2B/B2C Mixing** | Dashboard shows combined metrics | Governance requires separation |

### E. Duplications Identified

| Type | Instances | Impact |
|------|-----------|--------|
| **Agents** | 7 orchestrator agents + 1 B2B worker = 2 parallel autonomous systems | Conflicting control |
| **Queues** | `metaPublisher.queue` (memory) + `marketing_automation_queue` (Supabase) | Inconsistent reliability |
| **Inbox State** | `messagingService` Maps + `editorial_content` (different domains) | B2C conversations lost |
| **Content Status** | `editorial_content.status` (4 values) vs `content_versions.status` (7 values) | Constraint violations |
| **Meta Auth** | `metaAdapter` env token + `metaAuthService` OAuth + `metaTokens` table | Unclear source of truth |
| **WhatsApp** | Evolution API (B2B) + Meta Cloud API (B2C) + MessagingService unified | Dual integration confusion |
| **Skills** | `@marketing` (agent) + `marketing-service` (service) + `marketing-automation` (worker) | Overlapping responsibilities |

### F. Legacy/Unused Code

| Component | Status | Evidence |
|-----------|--------|----------|
| `agents/marketing-platform` (entire directory) | **LEGACY** | Zero imports from `src/`; 31 TS errors isolated there |
| `MarketingSidebar.tsx` | **DELETED** | Was orphaned, removed during audit |
| `comfyui-marketing-os/workflows/` | **NOT EXECUTED** | Models missing, server not connected |
| `meta-token-renewal.worker.ts` | **NOT VERIFIED** | Exists but no evidence of execution |
| `marketing-metrics.worker.ts` | **PLACEHOLDER** | Returns hardcoded values |

---

## Integration Verdict

| Layer | Verdict | Evidence |
|-------|---------|----------|
| **Strategy → Research → Planning** | **NÃO INTEGRADO** | Agents produce mock data, no skill contracts |
| **Content Creation** | **PARCIALMENTE INTEGRADO** | Service called but mock fallbacks in production path |
| **Creative/Media** | **NÃO INTEGRADO** | ComfyUI not running, no models, fallback mocks |
| **Quality/Review** | **NÃO INTEGRADO** | Agent exists but never executes; no gate enforcement |
| **Approval** | **MANUAL ONLY** | UI drag-drop only, no automated gate |
| **Scheduling** | **NÃO INTEGRADO** | No scheduler, `scheduled_at` ignored |
| **Publication (Meta)** | **NÃO INTEGRADO** | Queue in memory, IDs leak, worker stopped |
| **Publication (WhatsApp B2B)** | **PARCIALMENTE INTEGRADO** | Only persistent queue; Evolution not running |
| **Inbox/WhatsApp B2C** | **NÃO INTEGRADO** | Pure in-memory, no persistence |
| **Metrics/Insights** | **NÃO INTEGRADO** | Placeholder values, Meta Insights not called |
| **Campaign Governance** | **NÃO INTEGRADO** | Campaigns created directly, no pipeline enforcement |

---

## Root Cause

**The Marketing Platform skills exist as files but are not connected as a governed pipeline in runtime.**

- Agents are instantiated but execute mock logic
- Skills are imported but bypassed via direct service calls
- Workers run in-process (die on restart) except B2B automation
- No contract enforcement between stages
- Quality gates exist in one path (`metaPublisher`) but bypassed in others (`publish-direct`)
- Campaign creation bypasses strategy/planning entirely

---

## Required Before Any Execution

1. **Connect Skills to Runtime** — Each pipeline stage must invoke Skill → Contract → Service → Persistence
2. **Persist All State** — Inbox, MetaPublisher queue, Orchestrator cycle must survive restart
3. **Enforce Quality Gates** — Single path for publication, no bypasses
4. **Separate B2B/B2C** — Metrics, queues, workers, dashboards
5. **Validate Meta Integration** — Real tokens, real publication, real webhooks, real insights
6. **Eliminate Mocks** — `createFallbackImage`, `startVideoGeneration`, hardcoded seeds
7. **Govern Campaign Creation** — Strategy → Planning → Content → Approval → Schedule → Publish

---

## Next Steps (After Approval)

1. Approve this diagnosis
2. Design Skill contracts for each pipeline stage
3. Implement persistent queue (BullMQ/Redis or Supabase pattern)
4. Connect Orchestrator to real Skills (not inline mocks)
5. Implement Scheduler for `scheduled_at`
6. Persist MessagingService to Supabase
7. Validate Meta OAuth + Tokens + Webhooks end-to-end
8. Test B2B cadence with real Evolution API
9. Execute controlled test campaign

---

**NO CAMPAIGNS WILL BE STARTED. NO CONTENT WILL BE PUBLISHED. NO MESSAGES WILL BE SENT.**
This ADR is a diagnosis artifact only.