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
7. Vercel deploy ativo (https://defesai-gd4n9yg9b-nettos-projects-dd3ebb4e.vercel.app)
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

| ISO (UTC) | Feature | Resultado |
|-----------|---------|-----------|
| 2026-08-24T05:37:54Z | G0-gov-baseline | em andamento |