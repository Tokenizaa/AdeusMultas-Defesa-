# Baseline — Fase 0 (Congelamento)

Auditoria de correções — registro do estado anterior a qualquer correção.

## Dados da auditoria

| Campo | Valor |
|---|---|
| Data/hora | 2026-09-04 21:31:00 -03 |
| Branch | `main` |
| Commit (BASELINE) | `e11cc7a8817f6880e218a30061c119b5abb87737` |
| Commit message | `feat: implement infrastructure and base services` |
| Remote | `origin` → `https://github.com/Tokenizaa/AdeusMultas-Defesa-.git` |

## Estado inicial do Git (antes de qualquer alteração)

- Branch atual: `main`
- HEAD: `e11cc7a8817f6880e218a30061c119b5abb87737`
- Working tree: **NÃO limpo** — existem alterações não commitadas pré-existentes.
- Nenhuma alteração foi descartada; nenhum `git reset` / `git clean` foi executado.

Resumo das alterações não commitadas (227 entradas):

| Tipo | Quantidade |
|---|---|
| Modificados (unstaged) | 15 |
| Deletados (unstaged) | 185 |
| Untracked | 27 |
| Staged | 0 |

Amostra de arquivos modificados:

```
 .agent-loop/state.json
 AGENTS.md
 ARCHITECTURE_GAPS.md
 AUDITORIA-MARKETING.md
 AUDIT_PHASE2_RESULTS.md
 AUDIT_SUMMARY.md
 CAMPO_ORIGEM_TRANSFORMACAO.md
 CLOUDFLARE.md
 COMFYUI-INTEGRATION.md
 COMFYUI-RESUMO.md
 ...
```

Amostra de arquivos untracked:

```
 .agent-loop/pnboxai-task.json
 PnboxAi/
 README.md
 agents/pnbox/
 create-pnboxai-business-plan.cjs
 docs/README.md
 docs/adr/ADR-018-PNBOX-Controlled-Execution-System.md
 docs/architecture/
 docs/archive/DOCUMENTATION_CLASSIFICATION.md
 docs/archive/GGpixpay.md
 ...
```

Lista completa das 227 entradas do `git status --porcelain=v1` reproduzida ao final deste documento.

## Verificações executadas

Comandos disponíveis em `package.json` no momento da auditoria:

- `test` → `playwright test --project=chromium` (E2E)
- `test:unit` → `vitest run`
- `lint` → `tsc --noEmit` (typecheck; não existe script `typecheck` no projeto)
- `build` → `node scripts/generate-brand-assets.mjs && vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs && node scripts/build-api.mjs`

### Testes E2E — `npm test`

**RESULTADO: FALHOU** — exit code `1` (executado em 2026-09-04 21:33–21:34 -03).

Comando: `npm test` → `playwright test --project=chromium`

A suíte abortou na fase de coleta/importação dos testes; nenhum resumo final de pass/fail do Playwright foi impresso. Erros registrados (sem nenhuma tentativa de correção):

1. `Error: Cannot find module '.../tests/e2e/e2e-infrastructure'` — em 9 arquivos: `tests/e2e/services/{analise-tecnica,cassacao,conversao-advertencia,defesa-previa,indicacao-condutor,recurso-cetran,recurso-jari,relatorio-pericial,suspensao}/*.spec.ts`.
2. `Error: Vitest failed to find the runner. One of the following is possible: ...` — arquivos de teste Vitest (`tests/unit/*.test.ts`) foram coletados pelo runner do Playwright.
3. `Error: Vitest mocker was not initialized in this environment. vi.queueMock() is forbidden.` — em `tests/unit/webhook-verification.test.ts` e `tests/unit/envelope-service.test.ts`.
4. `TypeError: Cannot read properties of undefined (reading 'config')` — em `tests/unit/prospecting-campaign-whatsapp-e2e.test.ts:20` e `tests/unit/scrape-e2e.test.ts:20`.
5. `Error: test file "comprehensive-onboarding.spec.ts" should not import test file "onboarding.spec.ts"` — em `tests/comprehensive-onboarding.spec.ts:2`.

### Testes unitários — `npm run test:unit`

**RESULTADO: PASSOU** — exit code `0` (executado em 2026-09-04 21:33 -03).

Comando: `npm run test:unit` → `vitest run`

```
Tests  451 passed (451)
Duration  39.95s
```

### Typecheck — `npm run lint` (`tsc --noEmit`)

**RESULTADO: PASSOU** — exit code `0`. Zero erros TypeScript.

### Build — `npm run build`

**RESULTADO: PASSOU** — exit code `0` (executado em 2026-09-04 ~21:31–21:34 -03).

Comando: `npm run build` → `node scripts/generate-brand-assets.mjs && vite build && esbuild server.ts ... && node scripts/build-api.mjs`

- `generate-brand-assets.mjs`: OK (8 assets gerados)
- `vite build`: OK — 1895 módulos; `dist/index.html`, `dist/assets/index-*.css` (193 kB), `dist/assets/index-*.js` (1.99 MB / gzip 459 kB)
- `esbuild server.ts`: OK — `dist/server.cjs` (1.6 MB)
- `build-api.mjs`: OK — `api/index.mjs` (1.4 MB)

Única advertência (não bloqueante): chunk JS > 500 kB após minificação — `1,991.78 kB`.

## Falhas encontradas

Nenhuma correção foi tentada nesta fase. Falhas registradas tal qual ocorreram, sem alteração de código:

1. **`npm test` (Playwright E2E) falha** — exit `1`. Causas registradas:
   - 9 spec files em `tests/e2e/services/*` não resolvem módulo `tests/e2e/e2e-infrastructure`;
   - runner do Playwright coleta arquivos de teste Vitest (`tests/unit/*.test.ts`), que usam `vi.*`/`describe` e quebram no ambiente Playwright;
   - `tests/comprehensive-onboarding.spec.ts` importa fixture de outro arquivo de teste (`./onboarding.spec`).
2. **Advertência de build (não bloqueante)** — chunk JS de 1.99 MB (> 500 kB).

Typecheck (`tsc --noEmit`), testes unitários (Vitest, 451/451) e build: sem falhas.

## Observação

Esta baseline representa o estado **anterior às correções** (Fase 1+). A única alteração promovida por esta fase é o presente documento; todo o código de produção, arquitetura, autenticação, autorização, onboarding, Rule Engine, RAG, geração de documentos, pagamentos, webhooks, Documenso, banco de dados, migrations, configurações de produção e testes existentes permanecem intocados.

---

## Anexo — `git status --porcelain=v1` (lista completa, 227 entradas)

```
 M .agent-loop/state.json
 M AGENTS.md
 D ARCHITECTURE_GAPS.md
 D AUDITORIA-MARKETING.md
 D AUDIT_PHASE2_RESULTS.md
 D AUDIT_SUMMARY.md
 D CAMPO_ORIGEM_TRANSFORMACAO.md
 D CLOUDFLARE.md
 D COMFYUI-INTEGRATION.md
 D COMFYUI-RESUMO.md
 D DATABASE_AUDIT.md
 D DEAD_CODE_AUDIT.md
 D FINAL_VERIFICATION.md
 D FIX_SUMMARY.md
 D FRONTEND_BACKEND_BOUNDARY.md
 D GGpixpay.md
 D IMPLEMENTATION_SUMMARY.md
 D INTEGRATION_AUDIT.md
 D MODELOS-GRAUITOS-GUIA.md
 D ONBOARDING_TEST_SCENARIOS.md
 D ONBOARDING_V1_REPORT.md
 D PAYMENT-AUDIT.md
 D PRODUCTION_BLOCKERS.md
 D PRODUCTION_FIX_PLAN.md
 D PRODUCTION_READINESS_AUDIT.md
 D SECURITY_AUDIT.md
 D TESTING_SUMMARY.md
 D TEST_PLAN.md
 D VERIFICATION_CONFIRMATION.md
 D VERIFICATION_SUMMARY.md
 D VERSIONING.md
 D agents/adeus-multa-design-system/SKILL.md
 D agents/admin-agent.md
 D agents/ai-analysis-agent.md
 D agents/ai-analysis-agent.ts
 D agents/automation-agent.md
 D agents/base-agent.ts
 D agents/case-agent.md
 D agents/communication-agent.md
 D agents/communication-agent.ts
 D agents/crm-agent.md
 D agents/document-agent.md
 D agents/document-agent.ts
 D agents/document/citation/agent.md
 D agents/document/citation/agent.ts
 D agents/document/drafter/agent.md
 D agents/document/drafter/agent.ts
 D agents/document/layout/agent.md
 D agents/document/layout/agent.ts
 D agents/document/planner/agent.md
 D agents/document/planner/agent.ts
 D agents/document/reviewer/agent.md
 D agents/infrastructure-agent.md
 D agents/knowledge-agent.md
 D agents/legal-style-reviewer/agent.ts
 D agents/legal-ux-reviewer/agent.md
 D agents/legal-ux-reviewer/agent.ts
 D agents/legal/classifier/agent.md
 D agents/legal/classifier/agent.ts
 D agents/legal/researcher/agent.md
 D agents/legal/researcher/agent.ts
 D agents/legal/strategist/agent.md
 D agents/legal/strategist/agent.ts
 D agents/marketing-agent.md
 D agents/marketing-platform/AGENT.md
 D agents/marketing-platform/skills/adeus-multa-design-system/SKILL.md
 D agents/marketing-platform/skills/adeus-multa-marketing/SKILL.md
 D agents/marketing-platform/skills/adeus-multa-marketing/evals/evals.json
 D agents/marketing-platform/skills/adeus-multa-marketing/examples/carousel-example-passo-a-passo.md
 D agents/marketing-platform/skills/adeus-multa-marketing/examples/reel-example-educativo.md
 D agents/marketing-platform/skills/adeus-multa-marketing/examples/story-example-sequencia-educativa.md
 D agents/marketing-platform/skills/adeus-multa-marketing/references/autonomy-guardrails.md
 D agents/marketing-platform/skills/adeus-multa-marketing/references/carousels.md
 D agents/marketing-platform/skills/adeus-multa-marketing/references/content-calendar.md
 D agents/marketing-platform/skills/adeus-multa-marketing/references/content-checklist.md
 D agents/marketing-platform/skills/adeus-multa-marketing/references/content-framework.md
 D agents/marketing-platform/skills/adeus-multa-marketing/references/cta-library.md
 D agents/marketing-platform/skills/adeus-multa-marketing/references/cta-matrix-by-action.md
 D agents/marketing-platform/skills/adeus-multa-marketing/references/editorial-pillars.md
 D agents/marketing-platform/skills/adeus-multa-marketing/references/instagram.md
 D agents/marketing-platform/skills/adeus-multa-marketing/references/personas.md
 D agents/marketing-platform/skills/adeus-multa-marketing/references/planning-policy.md
 D agents/marketing-platform/skills/adeus-multa-marketing/references/positioning.md
 D agents/marketing-platform/skills/adeus-multa-marketing/references/prohibited-claims.md
 D agents/marketing-platform/skills/adeus-multa-marketing/references/reels.md
 D agents/marketing-platform/skills/adeus-multa-marketing/references/references.md
 D agents/marketing-platform/skills/adeus-multa-marketing/references/seo.md
 D agents/marketing-platform/skills/adeus-multa-marketing/references/stories.md
 D agents/marketing-platform/skills/adeus-multa-marketing/references/visual-identity.md
 D agents/marketing-platform/skills/content-flow/SKILL.md
 D agents/marketing-platform/skills/inbox-integration/SKILL.md
 D agents/marketing-platform/skills/rls-invariant-suite/SKILL.md
 D agents/marketing-platform/skills/social-media-management/SKILL.md
 D agents/marketing-platform/skills/supabase-repository-pattern/SKILL.md
 D agents/ocr/classifier/agent.md
 D agents/ocr/classifier/agent.ts
 D agents/ocr/extractor/agent.md
 D agents/ocr/extractor/agent.ts
 D agents/ocr/validator/agent.md
 D agents/ocr/validator/agent.ts
 D agents/onboarding-copywriter/agent.md
 D agents/onboarding-copywriter/agent.ts
 D agents/onboarding-ux/agent.md
 D agents/onboarding-ux/agent.ts
 D agents/payment-agent.md
 D agents/pipeline/index.ts
 D agents/pipeline/orchestrator.md
 D agents/pipeline/runner.ts
 D agents/product/analytics/agent.md
 D agents/product/analytics/agent.ts
 D agents/product/pricing/agent.md
 D agents/product/pricing/agent.ts
 D agents/product/retention/agent.md
 D agents/product/retention/agent.ts
 D agents/quality/auditor/agent.md
 D agents/quality/auditor/agent.ts
 D agents/quality/completeness/agent.md
 D agents/quality/completeness/agent.ts
 D agents/quality/consistency/agent.md
 D agents/quality/consistency/agent.ts
 D agents/quality/hallucination/agent.md
 D agents/quality/hallucination/agent.ts
 M api/index.mjs
 D debug/scraper/2026-08-27T16-41-04-094Z/metadata.json
 D debug/scraper/2026-08-27T16-41-04-094Z/page.html
 D debug/scraper/diagnostics/2026-08-27T21-32-44-758Z/00-stats.json
 D debug/scraper/diagnostics/2026-08-27T21-32-44-758Z/01-inicial.html
 D debug/scraper/diagnostics/2026-08-27T21-32-44-758Z/01-inicial.png
 D debug/scraper/diagnostics/2026-08-27T21-32-44-758Z/02-final.html
 D debug/scraper/diagnostics/2026-08-27T21-32-44-758Z/02-final.png
 D debug/scraper/diagnostics/2026-08-27T21-32-44-758Z/99-summary.json
 D debug/scraper/diagnostics/2026-08-27T22-12-10-428Z/00-stats.json
 D debug/scraper/diagnostics/2026-08-27T22-12-10-428Z/01-inicial.html
 D debug/scraper/diagnostics/2026-08-27T22-12-10-428Z/01-inicial.png
 D debug/scraper/diagnostics/2026-08-27T22-12-10-428Z/02-final.html
 D debug/scraper/diagnostics/2026-08-27T22-12-10-428Z/02-final.png
 D debug/scraper/diagnostics/2026-08-27T22-12-10-428Z/99-summary.json
 D debug/scraper/diagnostics/2026-08-27T22-24-55-170Z/00-stats.json
 D debug/scraper/diagnostics/2026-08-27T22-24-55-170Z/01-inicial.html
 D debug/scraper/diagnostics/2026-08-27T22-24-55-170Z/01-inicial.png
 D debug/scraper/diagnostics/2026-08-27T22-24-55-170Z/02-final.html
 D debug/scraper/diagnostics/2026-08-27T22-24-55-170Z/02-final.png
 D debug/scraper/diagnostics/2026-08-27T22-24-55-170Z/99-summary.json
 D docs/META-INTEGRATION.md
 D docs/adr/ADR-010-Automatic-Defense-Generation-and-Limit.ticket.md
 M docs/adr/decision-log.md
 D docs/archive/ai-provider-manager.ts.backup
 D docs/archive/commercial-repository.ts.backup
 D docs/archive/embedding-service.ts.backup
 D docs/archive/ocr.ts.backup
 D docs/archive/ocr.ts.modernized
 D docs/audit/AUDITORIA-FLUXOS-JURIDICOS.md
 D docs/audit/AUDITORIA-NACIONAL-BRASIL.md
 D docs/audit/FASE-8-SISTEMA-JURIDICO-NACIONAL.md
 D docs/audit/JARI-CETRAN-BRASIL.md
 D docs/audit/MATRIZ-COBERTURA-27-UF.md
 D docs/audit/ORGAOS-AUTUADORES-BRASIL.md
 D docs/audit/PROTOCOLOS-27-UF.md
 D docs/audit/REGRAS-ESTADUAIS-27-UF.md
 D docs/marketing/quality-gate-daily-template.csv
 D docs/marketing/quality-gate-monitoring.md
 D docs/research/DOCUMENSO_RESEARCH_REPORT.md
 D docs/research/DOCUMENSO_SOURCE_MATRIX.md
 D docs/specs/DOCUMENSO_INTEGRATION_SPEC.md
 M package.json
 D playwright-evidence/V1_unpaid_response.json
 M public/logo-dark.png
 M public/logo-light.png
 M public/logo.png
 M public/og-image.jpg
 M public/og-image.png
 D scripts/measure-overflow.mjs
 D scripts/tagscan.js
 D scripts/test-evolution-webhook-config.ts
 D scripts/test-scraper-mcp-compare.mjs
 D scripts/test-send-message.ts
 D scripts/validate-branding-og.mjs
 D src/components/onboarding/generation/DocumentCheckoutStep.tsx.bak
 D src/server/routes/admin.ts.bak
 D src/server/routes/admin.ts.fix
 D stderr.txt
 D stdout.txt
 M supabase/.temp/gotrue-version
 M supabase/.temp/linked-project.json
 M supabase/.temp/pooler-url
 M supabase/.temp/project-ref
 D test-api-workflow.json
 D test-qwen-workflow.json
 D test-sd15-workflow.json
 D tests/e2e-runner.spec.ts.backup
 D tests/e2e/services/analise-tecnica/analise-tecnica.spec.ts.backup
 D tests/e2e/services/cassacao/cassacao.spec.ts.backup
 D tests/e2e/services/conversao-advertencia/conversao-advertencia.spec.ts.backup
 D tests/e2e/services/defesa-previa/defesa-previa.spec.ts.backup
 D tests/e2e/services/indicacao-condutor/indicacao-condutor.spec.ts.backup
 D tests/e2e/services/recurso-cetran/recurso-cetran.spec.ts.backup
 D tests/e2e/services/recurso-jari/recurso-jari.spec.ts.backup
 D tests/e2e/services/relatorio-pericial/relatorio-pericial.spec.ts.backup
 D tests/e2e/services/suspensao/suspensao.spec.ts.backup
 M tsconfig.json
?? .agent-loop/pnboxai-task.json
?? PnboxAi/
?? README.md
?? agents/pnbox/
?? create-pnboxai-business-plan.cjs
?? docs/README.md
?? docs/adr/ADR-018-PNBOX-Controlled-Execution-System.md
?? docs/architecture/
?? docs/archive/DOCUMENTATION_CLASSIFICATION.md
?? docs/archive/GGpixpay.md
?? docs/archive/historical-audits/
?? docs/archive/legacy-agents/
?? docs/audit/BASELINE-FASE-0.md
?? docs/audit/FINAL_AUDIT_REPORT.md
?? docs/integrations/
?? docs/legal/
?? docs/marketing/AUDITORIA-MARKETING.md
?? docs/operations/
?? docs/pnbox/
?? docs/testing/
?? generate_pnboxai_business_plan.py
?? package-lock.json
?? pnbox_cliente_de_mercado_current_snapshot.yml
?? pnbox_cliente_de_mercado_snapshot.yml
?? pnbox_initial_snapshot.yml
?? scripts/pnbox/
?? skills/
```
