# ADR-017: Marketing Platform Governance Audit — Runtime vs Documentation

**Date:** 2026-08-29
**Status:** AUDIT COMPLETE — NO EXECUTION AUTHORIZED
**Purpose:** Determine if `@marketing`, `@backend`, `@ad`, and `agents/marketing-platform` are actually governing production execution

---

## A. Mapa dos Agents (Runtime vs Documentado)

| Agent (Runtime) | Responsabilidade | Skill Utilizada | Chamado Por | Status |
|-----------------|------------------|-----------------|-------------|--------|
| `marketingOrchestrator` | Orquestra 7 agents (ciclo 5min) | **Nenhuma** (inline) | `server.ts` boot | ✅ **EXECUTA EM PROCESSO** |
| `estrategicoAgent` | Análise legislativa, tendências, oportunidades | **Nenhuma** (inline) | Orchestrator | ✅ **EXECUTA EM PROCESSO** |
| `planejamentoAgent` | Planejamento editorial | **Nenhuma** (inline) | Orchestrator | ✅ **EXECUTA EM PROCESSO** |
| `criadorAgent` | Criação de conteúdo + geração visual | **Nenhuma** (chama `mediaGenerationService` direto) | Orchestrator | ✅ **EXECUTA EM PROCESSO** |
| `qualidadeAgent` | Revisão legal, brand, precisão | **Nenhuma** (inline rules) | Orchestrator | ✅ **EXECUTA EM PROCESSO** |
| `publicacaoAgent` | Publicação agendada | **Nenhuma** (chama `metaPublisher` direto) | Orchestrator | ⚠️ **FILA EM MEMÓRIA** |
| `inteligenciaAgent` | Métricas e insights | **Nenhuma** (placeholder) | Orchestrator | ✅ **EXECUTA EM PROCESSO** |
| `aprendizadoAgent` | Aprendizado contínuo | **Nenhuma** (inline) | Orchestrator | ✅ **EXECUTA EM PROCESSO** |
| `marketingAutomationWorker` | Cadência B2B WhatsApp | **Nenhuma** (inline + Supabase queue) | API `/automation/start` | ✅ **PERSISTENTE (ÚNICO)** |
| `metaPublisher` | Publicação Meta (FB/IG) | **Nenhuma** (chama `metaAdapter` direto) | API `/marketing/publish` | ❌ **QUEUE IN MEMORY** |
| `messagingService` | Inbox omnichannel (4 adapters) | **Nenhuma** (Maps em memória) | Webhooks + API | ❌ **IN MEMORY ONLY** |

| Agent (Documentado) | Local | Usado em Runtime? |
|---------------------|-------|-------------------|
| `marketing-platform` (AGENT.md) | `agents/marketing-platform/AGENT.md` | ❌ **NÃO** — zero imports em `src/` |
| `@marketing` (agent-marketing skill) | `.config/opencode/skills/agent-marketing/` | ❌ **NÃO** — skill não carregada em runtime |
| `@backend` (agent-backend skill) | `.config/opencode/skills/agent-backend/` | ❌ **NÃO** — skill não carregada em runtime |
| `@supervisor` (agent-supervisor skill) | `.config/opencode/skills/agent-supervisor/` | ❌ **NÃO** — skill não carregada em runtime |

---

## B. Mapa das Skills (Documentadas vs Runtime)

| Skill (Documentada) | Local | Quem Utiliza (Doc) | Runtime? | Produção? |
|---------------------|-------|-------------------|----------|-----------|
| `adeus-multa-marketing` | `agents/marketing-platform/skills/adeus-multa-marketing/SKILL.md` | `marketing-platform` agent | ❌ **NÃO** | ❌ **NÃO** |
| `content-flow` | `agents/marketing-platform/skills/content-flow/SKILL.md` | `marketing-platform` agent | ❌ **NÃO** | ❌ **NÃO** |
| `inbox-integration` | `agents/marketing-platform/skills/inbox-integration/SKILL.md` | `marketing-platform` agent | ❌ **NÃO** | ❌ **NÃO** |
| `social-media-management` | `agents/marketing-platform/skills/social-media-management/SKILL.md` | `marketing-platform` agent | ❌ **NÃO** | ❌ **NÃO** |
| `supabase-repository-pattern` | `agents/marketing-platform/skills/supabase-repository-pattern/SKILL.md` | `marketing-platform` agent | ❌ **NÃO** | ❌ **NÃO** |
| `rls-invariant-suite` | `agents/marketing-platform/skills/rls-invariant-suite/SKILL.md` | `marketing-platform` agent | ❌ **NÃO** | ❌ **NÃO** |

| Skill (Runtime Real) | Local | Usada Por | Produção? |
|---------------------|-------|-----------|-----------|
| `marketing-service` | `src/server/services/marketing-service.ts` | 7 agents + API routes | ✅ Sim |
| `ai-media-service` | `src/server/services/ai-media-service.ts` | `criadorAgent`, Studio UI | ⚠️ Mock fallbacks |
| `metaAdapter` | `src/integrations/meta/adapters/meta-adapter.ts` | `metaPublisher`, API | ⚠️ Configurado, não testado |
| `metaPublishingService` | `src/integrations/meta/publishing/meta-publishing-service.ts` | `metaAdapter` | ❌ Não executado |
| `metaWebhookService` | `src/integrations/meta/webhooks/meta-webhook-service.ts` | Webhook endpoint | ❌ Não validado em prod |
| `whatsappService` | `src/server/services/whatsapp-service.ts` | `messagingService`, B2B worker | ❌ Evolution não rodando |
| `marketingAutomationWorker` | `src/server/services/marketing-automation/worker.ts` | API routes | ✅ **Único worker persistente** |

---

## C. Pipeline Real (Runtime Atual)

```
MARKETING STRATEGY (estrategicoAgent)
       ↓ inline: monitorLegislativeChangesReal() + analyzeSearchTrendsReal()
       ↓知识库: knowledgeService.getAllInfractions() + getAllCtbArticles()
       ↓
RESEARCH / PLANNING (planejamentoAgent)
       ↓ inline: lógica de planejamento hardcoded
       ↓
CONTENT CREATION (criadorAgent)
       ↓ marketingService.generateContent(theme, channel, format)
       ↓ HARDCODED: selectRelevantLegalTheme() [random], selectOptimalChannel() [random]
       ↓ mediaGenerationService.enqueueImageJob() → ComfyUI (NÃO RODA)
       ↓ FALLBACK: createFallbackImage() → SVG MOCK BASE64
       ↓
QUALITY / REVIEW (qualidadeAgent)
       ↓ marketingService.getEditorialContents() → filter status='rascunho'
       ↓ checkLegalCompliance() [knowledgeService lookup]
       ↓ validateBrandGuidelines() [disallowed words list inline]
       ↓ reviewContentForAccuracy() [placeholder checks inline]
       ↓ SE PASSA: marketingService.updateContent(status='aprovado_qualidade')
       ↓ SE FALHA: log warn, mantém 'rascunho'
       ↓ STATUS DB CONFLICT: 'aprovado_qualidade' NÃO EXISTE em editorial_content CHECK (apenas 4 valores)
       ↓
APPROVAL
       ↓ MANUAL ONLY: UI drag-drop em ContentKanban → status='aprovado_qualidade'
       ↓ NENHUM GATE AUTOMÁTICO APÓS qualidadeAgent
       ↓
SCHEDULING
       ↓ editorial_content.scheduled_at SET MANUALLY
       ↓ NENHUM SCHEDULER (cron/Redis/BullMQ) — scheduled_at IGNORADO
       ↓
PUBLICATION
       ↓ API POST /marketing/publish → metaPublisher.enqueue()
       ↓ metaPublisher.queue (ARRAY EM MEMÓRIA) → process()
       ↓ metaAdapter.publishContent() → metaPublishingService.publish()
       ↓ Meta Graph API (FB Page / IG Business)
       ↓ RETORNO: facebookPostId / instagramMediaId
       ↓ MARKETING_SERVICE.updateContent(status='publicado', published_at, meta_post_id)
       ↓ WEBHOOK META: metaWebhookService → updateContentByMetaPostId() [NÃO TESTADO EM PROD]
       ↓
METRICS
       ↓ marketingMetricsCollector (PLACEHOLDER VALUES)
       ↓ Dashboard mostra monthlyReach, conversionRate = MOCK
```

---

## D. Bypasses Encontrados (Código Ignorando Governança)

| # | Bypass | Local | Governança Ignorada |
|---|--------|-------|---------------------|
| 1 | **Agent → Service Direto** | `criadorAgent.run()` → `marketingService.generateContent()` | Deveria: Agent → Skill `adeus-multa-marketing` → Contrato → Service |
| 2 | **Worker → Service Direto** | `metaPublisher.enqueue()` → `metaAdapter.publishContent()` | Deveria: Worker → Skill → Contrato → Service |
| 3 | **Frontend → Singleton Direto** | `MarketingOSView` → `metaPublisher.getQueue()` | Deveria: API Route |
| 4 | **Publication → Bypass Quality Gate** | `POST /marketing/publish-direct` chama `metaPublishingService` direto | Quality gate em `metaPublisher.enqueue()` CIRCUNVENIDO |
| 5 | **Campaign → Criação Direta** | `POST /marketing/automation/campaigns` cria direto no Supabase | Sem `estrategicoAgent`/`planejamentoAgent` envolvidos |
| 6 | **Meta → Pub sem Campaign** | `metaPublisher.enqueue()` aceita `contentId` mas não valida `campaign_id` | Governança de campanha ausente |
| 7 | **WhatsApp B2C → In Memory** | `messagingService` Maps (contacts, conversations, messages) | Sem persistência = sem governança |
| 8 | **Scheduler → Ausente** | `editorial_content.scheduled_at` nunca consumido automaticamente | Conteúdo agendado nunca auto-publica |
| 9 | **B2B/B2C Métricas Misturadas** | `MarketingDashboard` + `marketingMetricsCollector` | Governança exige separação |
| 10 | **Quality Agent → Status Inválido** | `qualidadeAgent` escreve `status='aprovado_qualidade'` | DB CHECK permite apenas `rascunho`,`aprovado_qualidade`,`agendado`,`publicado` — **mas** `content_versions` permite 7 valores incluindo `em_revisao`,`reprovado_qualidade` |
| 11 | **Content Flow → Inline** | `criadorAgent`/`qualidadeAgent` implementam fluxo inline | Skill `content-flow` define Kanban 6 colunas mas agents usam status diferentes |
| 12 | **Inbox → Simulado** | `inboxIntegration` skill diz "simulado" + contrato | `messagingService` implementa próprio, não usa skill |

---

## E. Duplicidades Identificadas

| Tipo | Instâncias | Impacto |
|------|------------|---------|
| **Agents Autônomos Paralelos** | 7 orchestrator agents + 1 B2B worker = 2 sistemas autônomos | Controle conflitante, estado inconsistente |
| **Queues** | `metaPublisher.queue` (memory array) + `marketing_automation_queue` (Supabase) | Confiabilidade inconsistente |
| **Inbox State** | `messagingService` Maps + `editorial_content` (domínios diferentes) | B2C conversations lost on restart |
| **Content Status** | `editorial_content.status` (4 valores) vs `content_versions.status` (7 valores) | Constraint violations em produção |
| **Meta Auth** | `metaAdapter` env token + `metaAuthService` OAuth + `metaTokens` table | Source of truth unclaro |
| **WhatsApp** | Evolution API (B2B) + Meta Cloud API (B2C) + MessagingService unified | Dupla integração, confusão de responsabilidade |
| **Skills vs Runtime** | 6 skills documentadas + 7 agents inline = governança duplicada | Skills não usadas, agents não governados |

---

## F. Veredito de Integração

| Camada | Veredito | Evidência |
|--------|----------|-----------|
| **Strategy → Research → Planning** | **NÃO INTEGRADO** | Agents produzem lógica inline hardcoded/random; skills `adeus-multa-marketing`/`content-flow` não invocadas |
| **Content Creation** | **PARCIALMENTE INTEGRADO** | Service chamado mas mock fallbacks (`createFallbackImage`, `startVideoGeneration`) em caminho de produção |
| **Creative/Media** | **NÃO INTEGRADO** | ComfyUI não roda, modelos ausentes, fallback SVG mock |
| **Quality/Review** | **NÃO INTEGRADO** | `qualidadeAgent` executa mas escreve status que DB rejeita; skill `content-flow` não usada |
| **Approval** | **MANUAL ONLY** | UI drag-drop apenas, nenhum gate automatizado pós-quality |
| **Scheduling** | **NÃO INTEGRADO** | Nenhum scheduler; `scheduled_at` ignorado |
| **Publication (Meta)** | **NÃO INTEGRADO** | Queue em memória, worker parado, IDs internos (`pub_*`) vazam para Meta Insights |
| **Publication (WhatsApp B2B)** | **PARCIALMENTE INTEGRADO** | Única queue persistente; Evolution API não roda |
| **Inbox/WhatsApp B2C** | **NÃO INTEGRADO** | Puro in-memory, zero persistência |
| **Metrics/Insights** | **NÃO INTEGRADO** | Placeholders hardcoded; Meta Insights nunca chamado |
| **Campaign Governance** | **NÃO INTEGRADO** | Campanhas criadas via API direta, sem pipeline strategy→planning→content→approval |

---

## Resposta à Pergunta Fundamental

> **As skills @marketing, @backend, @ad e agents/marketing-platform estão realmente governando a execução de produção ou são apenas arquivos que o sistema não utiliza?**

**RESPOSTA: SÃO APENAS ARQUIVOS QUE O SISTEMA NÃO UTILIZA.**

**Evidência conclusiva:**
1. **Zero imports** de `agents/marketing-platform/` em todo `src/`
2. **7 agents inline** em `src/server/workers/agents/` executam toda a lógica sem invocar skills
3. **Skills documentadas** (`adeus-multa-marketing`, `content-flow`, `inbox-integration`, etc.) nunca carregadas em runtime
4. **Agentes de governança** (`@marketing`, `@backend`, `@supervisor`) existem apenas como skills OpenCode, não como processos de produção
5. **Pipeline real** é hardcoded nos agents inline, não segue contratos das skills
6. **Quality gates** falham por status mismatch com DB (skill define 7 valores, DB aceita 4)
7. **Edge Functions de produção** listadas no AGENT.md (`campaign-orchestrator`, `publication-worker`, etc.) **não existem** no Supabase

---

## Próximos Passos (APÓS APROVAÇÃO EXPLÍCITA)

Conforme instruções, **NENHUMA CORREÇÃO SERÁ FEITA AGORA**. Somente após diagnóstico aprovado:

1. **Conectar Skills ao Runtime** — Cada stage do pipeline deve invocar Skill → Contrato → Service → Persistência
2. **Persistir Todo Estado** — Inbox, MetaPublisher queue, Orchestrator cycle devem sobreviver a restart
3. **Impor Quality Gates** — Único caminho para publicação, sem bypasses (`publish-direct`)
4. **Separar B2B/B2C** — Métricas, queues, workers, dashboards
5. **Validar Meta Integration** — Tokens reais, publicação real, webhooks reais, insights reais
6. **Eliminar Mocks** — `createFallbackImage`, `startVideoGeneration`, seeds hardcoded
7. **Governar Criação de Campanha** — Strategy → Planning → Content → Approval → Schedule → Publish

---

**NENHUMA CAMPANHA SERÁ INICIADA. NENHUM CONTEÚDO SERÁ PUBLICADO. NENHUMA MENSAGEM SERÁ ENVIADA.**
Este ADR é um artefato de diagnóstico exclusivamente.