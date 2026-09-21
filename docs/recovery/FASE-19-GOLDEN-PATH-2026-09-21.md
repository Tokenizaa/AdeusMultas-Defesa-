# FASE 19 — GOLDEN PATH (E2E contra Supabase canônico)

**Data**: 2026-09-21
**Projeto Supabase canônico**: `llmxnpgjpxcvyrqjkfwb` (`supabase/config.toml`)
**Proibido / histórico**: `sgomwklorpzdwdubtmgg` — nenhuma query usou
**Repo**: Tokenizaa/AdeusMultas-Defesa- (branch `main`, HEAD inicial `772e024`)
**Escopo**: wirear e provar a jornada vertical real do Golden Path: auth → profile → case → análise → documentos/storage → defesa, contra o Supabase canônico, respeitando RLS/policies da FASE 18.

---

## 1. Objetivo (mensurável, extraído dos docs)

1. **Fluxo E2E real funcionando contra o canônico**: `auth (login real) → POST /api/cases (persistência em public.cases com user_id do JWT) → análise (determinística, server-side) → upload de documento em storage case-documents → list → download (URL assinada) → delete` com isolamento entre usuários.
2. **Storage wireado**: `case-documents` com upload/list/download funcionando sob as policies FASE 18 (cadeia case→user, path `case-documents/<case_id uuid>/<arquivo>`), bucket privado, `allowed_mime_types=['application/pdf']` respeitado, `public.documents` com storage_path/mime_type/size_bytes/content_hash.
3. **Build ok**: `npm run build` verde; `tsc --noEmit` com exatamente os 59 erros pré-existentes (zero novos).
4. **Sem segredos no git**; commits por etapa; docs + plan/progress.md atualizados; push em main.

Escopo NÃO incluído (PENDENTE, sem invenção): pagamento PIX real + webhook (cadeia comercial — P0 da Fase 4 de auditoria, fora do critério desta fase), geração de defesa com refinamento de IA (depende de análise canônica + credenciais de IA; a rota real `generate-defense` exige `applicant` qualificado + teses canônicas — cobertura parcial registrada), E2E Playwright de tela (exige PLAYWRIGHT_BASE_URL https / deploy + secrets de Actions).

## 2. Estado encontrado (E1 — verificação DB)

- `public.documents` já possuía `storage_path`, `mime_type`, `size_bytes`, `content_hash`, `generated_at` no canônico (DB à frente dos types — tipos sincronizados nesta fase).
- Policies FASE 18 confirmadas no canônico: `documents_select_own` + `documents_admin_all`; storage `case documents read own` / `case documents insert own` / `case documents admin all`; settings e demais intocados.
- Bucket `case-documents`: privado, `file_size_limit = 10485760`, `allowed_mime_types = ['application/pdf']` — config real respeitada (upload de image/* é rejeitado pelo próprio bucket).
- 4 usuários Auth (2 admin, 2 citizen), 47 cases (44 com user_id, 3 anônimos) — contagens apenas, sem dados pessoais.
- **GAP de schema real encontrado**: coluna `applicant_json` de cases não existia no canônico (migration `20260908141600_add_applicant_json_to_cases.sql` versionada no repo mas nunca aplicada/registrada no canônico). `POST /api/cases` falhava com `Could not find the 'applicant_json' column of 'cases' in the schema cache`. Corrigido com migration nova `20260921000006_fase_19_add_applicant_json_cases.sql` (ADD COLUMN IF NOT EXISTS, aditiva/idempotente) aplicada no canônico.

## 3. Etapas executadas

| Etapa | Entregue | Evidência |
|---|---|---|
| E1 — Verificação DB + migration drift | gap `applicant_json` identificado e aplicado (migration 2026…0006) | MCP `execute_sql`/`apply_migration` (saída acima); migration versionada no repo |
| E2 — Backend wire storage | `src/server/routes/documents.ts` (GET list, POST upload, GET download URL assinada, DELETE) + montagem em `src/server/app.ts`; sync de types `documents` em `src/types/supabase.ts` + `src/lib/supabase.ts` | tsc zero erros novos; teste de integração 6/6 |
| E3 — Frontend fluxo documentos | `src/components/cases/CaseDocumentsSection.tsx` (upload/list/download/delete por caso) montada na `CaseDetailView` (stage 4, junto ao checklist de documentos) | tsc zero erros novos; componente reutiliza `supabase` session do AuthContext, sem service_role |
| E4 — Validação | `tests/integration/golden-path-documents.integration.test.ts` 6 cenários contra o canônico com limpeza total (rollback) | vitest 6/6 PASS (saídas abaixo) |
| E5 — Docs + Git | `docs/recovery/FASE-19-…md` + `plan/progress.md` + commits | commits abaixo |

**Máquina de estados** (gates de saída verificados):
`E1 DB_VERIFY [gate: schema/policies/bucket confirmados no canônico; gaps→migration versionada aplicada] → E2 BACKEND_WIRE [gate: tsc 0 novos + rota responde no teste real] → E3 FRONTEND_FLOW [gate: tsc 0 novos + componente montado] → E4 VALIDATION [gate: vitest 6/6 contra canônico + suíte completa sem regressão nova] → E5 DOCS_COMMIT [gate: build verde + docs + commits push]`.

## 4. Evidências por etapa (comandos → saídas-chave)

- **Schema real** (MCP, canônico): colunas de `cases` sem `applicant_json`; `documents` com colunas de storage; buckets: `case-documents` privado (allowed `application/pdf`, 10MB); policies documents/storage conforme FASE 18 (nomes acima, `pg_policy`).
- **Migration aplicada**: `fase_19_add_applicant_json_cases` → `{"success":true}`; arquivo versionado `supabase/migrations/20260921000006_fase_19_add_applicant_json_cases.sql`.
- **tsc**: `npx tsc --noEmit` → `59` erros, **0 nos arquivos da FASE 19** (distribuição: workers 38, cloudflare 8, hooks 6, case-repository 2, OnboardingPage 2, redis 1, http.ts 2).
- **Teste de integração (canônico, limpeza total)**: 6/6 PASS
  1. cria caso autenticado → 201, `userId` = uid do JWT, `analysis.recommendedArguments` não-vazio (determinística)
  2. upload PDF → 201, `storage_path = <case_id uuid>/evidencia-multa.pdf`, `status=uploaded`, sha256 64 hex, size>0
  3. list → 200, 1+ documento
  4. download → 200, `signedUrl` https
  5. isolamento → outro usuário: list 403, download 403, delete 403 (guard server + RLS)
  6. delete dono → 200, list vazio, `storage.list(case_id)` = 0 objetos (objeto removido)
  - apósAll: caso + documento + 2 usuários temp deletados (nenhum dado fake persistido).
- **Suíte completa** `npx vitest run`: 778 passed / 34 failed — **as 34 falhas são PRÉ-EXISTENTES**, confirmadas rodando os mesmos arquivos no HEAD limpo `772e024` via `git stash` (auth-middleware-p0, routes-cases-legal-authority-p0, case-deletion-lgpd, payments/gateway-manager+phase6-webhook-security, webhook-verification = exatamente 34). Nenhuma falha em arquivos da FASE 19 (golden path 6/6).
- **Build**: `npm run build` → exit 0, `✓ built in 27.34s` (+ api/index.mjs).

## 5. Problemas encontrados e resolvidos

1. **Drift de schema `applicant_json`** (migration repo não aplicada no canônico) → migration nova idempotente aplicada; causa raiz registrada.
2. **Mount duplicado `/api`** em `documents.ts` (path interno com `/api` + montagem em `/api` → `/api/api/...` nunca matcheava, 404) → padronizado paths sem `/api` (padrão `cases.ts`).
3. **Resolução de caso por `app_ref`** (formato `case_*`) vs id uuid — adotado padrão do `caseRepository` (`app_ref` primeiro, `id` se uuid); storage path sempre usa o **id uuid real** (exigência da policy RLS `(foldername(name))[1]::uuid`).
4. **Mime do bucket**: `case-documents` aceita apenas `application/pdf` (10MB) — respeitado no teste e documentado como contrato do bucket (upload de outros tipos é rejeitado pelo próprio storage).

## 6. Migrations criadas

| Arquivo | Conteúdo |
|---|---|
| `supabase/migrations/20260921000006_fase_19_add_applicant_json_cases.sql` | `ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS applicant_json jsonb;` (aplicada no canônico; aditiva; replay idempotente) |

## 7. Build/testes executados

- `npx tsc --noEmit` → 59 erros (todos pré-existentes; 0 novos)
- `npx vitest run tests/integration/golden-path-documents.integration.test.ts` → 6/6 PASS
- `npx vitest run` → 778 pass / 34 fail (34 = baseline HEAD, zero regressão)
- `npm run build` → exit 0 (27.34s)

## 8. Pendências

1. **E2E Playwright de tela** (golden path visual): requer `PLAYWRIGHT_BASE_URL` https (config exige https; sem deploy local) + credenciais de Actions. **PENDENTE** — cobertura atual: integração API-level real contra canônico + componente UI montado.
2. **Defesa com refinamento de IA** (`generate-defense` com `enrichDefenseWithGemini`): depende de análise canônica + credenciais de IA no runtime; rota existente preservada (não alterada). Caso com `applicant` qualificado cobre o caminho determinístico via `POST /cases` (analysis+defenseDraft gerados server-side). **PENDENTE** validação com IA real.
3. **Pagamento PIX/webhook real**: fora do critério desta fase (P0 da auditoria Fase 4); código de pagamentos não tocado.
4. **Pré-existentes não tocados**: 59 erros tsc (workers/cloudflare/hooks/case-repository/OnboardingPage/redis/http) e 34 falhas de suíte (taxa documentada acima).
5. **Rotação de chaves / leaked password protection / extensões em public**: pendências herdadas da FASE 18 — intocadas.

## 9. Conclusão

**FASE 19 CONCLUÍDA (core) com pendências registradas.** A cadeia vertical real auth → case (persistência canônica + análise determinística) → documentos/storage (upload/list/download/delete com policies FASE 18 e configuração do bucket respeitadas) foi **provada por teste de integração 6/6 contra o Supabase canônico**, com isolamento entre usuários (403) e limpeza total (nenhum dado fake persistido). Build verde; tsc sem erros novos; migration de drift aplicada e versionada; docs + progress atualizados; commits pushados. Itens que exigem deploy/IA/pagamento real ficam PENDENTES com motivo, sem inventar sucesso.

---

*Gerado pelo @supervisor — FASE 19 Golden Path. Dados pessoais mascarados; nenhum segredo em arquivo.*