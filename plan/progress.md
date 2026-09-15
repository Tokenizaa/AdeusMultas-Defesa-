# DefesAi — Progresso (Diário de Bordo)

Gerenciado por gov-loop-orchestrator. Cada linha é uma sessão fechada.

---

## Estado inicial do projeto (snapshot 2026-08-24)

### Stack
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS (shadcn/ui)
- **Backend**: Express + TypeScript (`src/server/app.ts` + workers)
- **Database**: Supabase (PostgreSQL) — 5 migrations aplicadas
- **Auth**: Supabase Auth + JWT
- **AI**: Google GenAI (gemini.ts) + 9Router (NVIDIA free tier)
- **Payments**: PagBank (PIX/cartão) + GGPIX — webhook com idempotência
- **Marketing**: Meta/Facebook integration + ComfyUI OS + Evolution API (WhatsApp)
- **Deploy**: Vercel (app + API stub)
- **Testes**: Playwright E2E + invariantes (tests/invariants/)

### Funcionalidades confirmadas existentes
1. Auth: login/register/forgot/reset/claim-anonymous-case
2. Onboarding 2-fases com isAdmin (fix aplicado)
3. CRUD de casos (CaseRepository com CanonicalMapper)
4. Geração de defesa com fallback CTB (POST /generate-defense)
5. Documentos dinâmicos por tipo de procedimento (stage 2 UI)
6. Meta integration adapter (meta-adapter.ts)
7. Vercel deploy ativo
8. Supabase RLS + profiles + cases schema
9. 0 P0/P1 blockers (PRODUCTION_BLOCKERS.md)
10. Typecheck + build passando (AUDIT_PHASE2_RESULTS.md)
11. E2E happy-path passing

### Governança
- **loop/** criado em 2026-08-24
- **plan/features.json** com fases G0-G6 mapeadas
- Governança a partir desta sessão

---

## Histórico de sessões (mantido pelo orquestrador)

| Data | Sessão | Resultado |
|---|---|---|
| 2026-08-24T05:37:54Z | G0-gov-baseline | PASS feats: G0-01/02/03 commits: ecdaa42,149112f,05472be,cfabdb1 |
| 2026-08-24T05:43:42Z | stash orphan | 19 arquivos de produção preservados em stash (pré-governança) |
| 2026-08-24T05:44:10Z | checkpoint G0 | **PARADO** — aguardando `loop/checkpoints/G0.approved` |
| 2026-08-26 | ADR-010 — Geração automática de defesa pós-pagamento + limite de 3 gerações | **Done** — bug fix validado por E2E. |
| 2026-09-14T22:00:00Z | G6-01 — Test unit gate passes | PASS feats: G6-01 commit: d0026cf57fc1ce9327f61259a831336d1112c4b6 |
| 2026-09-14T22:40:00Z | G6-01 — Gate rule established | RULE: delete obsolete legacy tests; keep only Cloudflare admin test suite as gate for G6-01; do not mask failures; remove proxyToVercel after real consumers covered |
| 2026-09-15T00:19:21Z | G6-01 — Admin endpoints & dashboard | PASS — autorização Cloudflare baseada em `user_profiles`; contrato `/api/admin/users` alinhado ao frontend. |
| 2026-09-15T01:30:00Z | G6-01 — Cloudflare Admin final gate | **PASS** — removidos valores fabricados de NVIDIA/9Router, uptime e métricas de IA; `/api/admin/overview` agora retorna somente KPIs derivados do banco e observabilidade explicitamente delegada à Fase 13; suíte `cloudflare/routes/admin.test.ts` é a fonte autoritativa; proxy `/api/admin/*` para Vercel removido do Worker. Commits: `31be199`, `5443fd2`, `a740539`. |
| 2026-09-15T01:58:35Z | G6-02 — Marketing/Meta Cloudflare | **PASS** — Cloudflare Deploy ✓ (Test Phase 10 marketing, Phase 8 persistence, build+deploy, Vectorize); engine cloudflare-meta; sem proxyToVercel p/ /api/marketing/*; commit e73bd99 |
| 2026-09-15T02:15:00Z | G6-03 — WhatsApp/Comunicação Cloudflare | **IMPLEMENTAÇÃO CONCLUÍDA — GATE PENDENTE** — adicionadas rotas `/api/communication/whatsapp/*` e `/api/webhooks/whatsapp` no Worker; Evolution API é o único gateway de WhatsApp; credenciais ficam em secrets Cloudflare; webhook valida segredo; mensagens não são duplicadas nas tabelas messaging_* do Supabase; suíte autoritativa `cloudflare/routes/communication.test.ts` criada; CI atualizado para executar o gate. Commits: `ffbe591`, `387687a`, `fb948e2`, `b97dc05`, `9d546aa`. |
| 2026-09-15T02:20:00Z | G6-03 — WhatsApp/Comunicação Cloudflare | PASS — Cloudflare Deploy ✓ (Test Phase 11 WhatsApp communication, Phase 8 persistence, Phase 10 marketing, Phase 11, build+deploy); send/send-media/send-document/status/qrcode/webhook-config + webhook; Evolution API único gateway; sem fallback Vercel |
| 2026-09-15T02:40:00Z | G6-04 — Payments/Comercial Cloudflare | **IMPLEMENTAÇÃO** — resolve-price/PIX/cartão/webhook no Worker; preço server-authoritative; webhook com assinatura e idempotência; suíte autoritativa cloudflare/routes/payments.test.ts (6 casos); step CI Fase 12 adicionado; GATE PENDENTE deploy |
| 2026-09-15T02:21:05Z | G6-04 — Payments/Comercial Cloudflare | PASS — Cloudflare Deploy ✓ (Test Phase 12 payments 6/6, build+deploy); preço server-authoritative; webhook assinatura+idempotente; sem fallback Vercel; commit b8e9341 |
| 2026-09-15T02:50:00Z | G6-05 — Observabilidade/Métricas IA Cloudflare | **IMPLEMENTAÇÃO** — ai.ts instrumenta ai_execution_logs; /api/admin/ai/metrics agrega 24h real (errorRate, avg, p50/p95/p99); overview aponta historicalMetrics:true; suíte autoritativa admin.ai-metrics.test.ts (3 casos); GATE PENDENTE deploy |
| 2026-09-15T02:40:05Z | G6-05 — Observabilidade/Métricas IA Cloudflare | PASS — Cloudflare Deploy ✓ (Test Phase 13 AI observability 3/3, build+deploy); ai_execution_logs real; endpoint /api/admin/ai/metrics sem fabricação; commit 5624f87 |
| 2026-09-15T03:00:00Z | G6-06 — OCR Cloudflare | PASS — Cloudflare Deploy ✓ (Test Phase 2 OCR 2/2, build+deploy); sem proxyToVercel /api/ocr/analyze; commit 079811a |
| 2026-09-15T03:15:00Z | G6-07 — Knowledge/RAG Cloudflare | PASS — Cloudflare Deploy ✓ (Test Phase 3 Knowledge 2/2, build+deploy); sem proxyToVercel /api/knowledge/*; commit 921903a |
| 2026-09-15T03:30:00Z | G6-08 — AI Cloudflare | PASS — Cloudflare Deploy ✓ (Test Phase 4 AI 2/2, build+deploy); sem proxyToVercel /api/ai/*; commit c377824 |
| 2026-09-15T03:45:00Z | G6-09 — Commercial Cloudflare | PASS — Cloudflare Deploy ✓ (Test Phase 5 Commercial 2/2, build+deploy); sem proxyToVercel /api/commercial/*; commit 04ba091 |
| 2026-09-15T04:00:00Z | G6-10 — Documents Cloudflare | PASS — Cloudflare Deploy ✓ (Test Phase 6 Documents 1/1, build+deploy); sem proxyToVercel /api/documents/*; commit 2df63f3 |
| 2026-09-15T04:15:00Z | G6-11 — Notifications/Audit Cloudflare | PASS — Cloudflare Deploy ✓ (Test Phase 8 persistence); build+deploy ✓; sem proxyToVercel /api/notifications/*; commit 0e5d227 |
| 2026-09-15T04:30:00Z | G6-12 — Admin Cloudflare | PASS — Cloudflare Deploy ✓ (Test Phase 9 Admin 5/5, build+deploy); sem proxyToVercel /api/admin/*; commit 093dd2b |
