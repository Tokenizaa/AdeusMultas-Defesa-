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
