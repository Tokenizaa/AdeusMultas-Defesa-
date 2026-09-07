# 🔎 E2E CONTRACT MAP — ADEUS MULTA

## 🟢 O QUE FOI CONFIRMADO

### Fluxo de Entrada e Autenticação
1. **Primeira rota**: `/` (LandingPageView) → `/novo-caso` (OnboardingWizard) — public area, no auth required.
2. **Autenticação**: Supabase Auth (email/password + Facebook OAuth). Session em `localStorage['defesai_auth_session_v1']` + JWT `access_token`. `AuthContext` inicializa com `supabase.auth.getSession()` + `onAuthStateChange` (src/core/auth/AuthContext.tsx:63-104).
3. **Identidade**: `user.id` = Supabase UUID. `role` via `GET /api/auth/me` (user_profiles) ou `user_metadata.role` fallback ('citizen'). `isAdmin = role==='admin'`.
4. **Usuário anônimo**: Permitido no wizard (isAnonymous=true). Caso criado sem `user_id`. Vinculação posterior via `POST /api/cases/claim`.
5. **Cookies/Storage**: Nenhum cookie. Tudo `localStorage`: `defesai_auth_session_v1`, `defesai_wizard_state` (24h TTL), `defesai_registered_users_v1` (passwordHash indevido), `defesai_cookie_consent`. `sessionStorage['defesai_ref']` só no CheckoutView admin.

### Onboarding Real (10 passos dinâmicos)
| Etapa | Componente | Rota (wizard) | Estado principal | Campos obrigatórios | Validação | Seletores (id) | Ação avanço | API |
|---|---|---|---|---|---|---|---|---|
| 1 | ServiceStep | step=1 | situation | situation (multa_transito, conversao_advertencia, indicacao_condutor, suspensao_cnh, cassacao_cnh) | radio select | service-option-{id} | handleSituationSelect | — |
| 2 | DefenseStageStep | step=2 | processStage | processStage (primeira_notificacao, recurso_jari, etc) | radio select | stage-option-{id} | handleStageSelect | — |
| 3 | InfractionCategoryStep | step=3 | infractionCategory | infractionCategory (excesso_velocidade, lei_seca, celular, vermelho, estacionamento) | card select | category-card-{cat} | handleCategorySelect | — |
| 4 | InfractionIdentificationStep | step=4 | vehicleData, infractionData, leadName, leadPhone | AIT, placa, veículo, código infração, data/hora, local, data expedição notificação, prazo defesa, nome/telefone lead | inputs + OCR opcional | input-ait-number, input-vehicle-plate, input-infraction-code, input-datetime, input-location, input-lead-name, input-lead-phone, photo-ocr-upload | btn-next-to-specifics | — |
| 5 | SpecificInfractionDataStep | step=5 | infractionData (campos específicos) | Velocidades, INMETRO, sinalização R-19, reteste, circunstâncias celular/vermelho, condutor real, relato | selects + inputs por categoria | input-speed-limit, select-termo-sinais, select-reteste, select-celular-circunstancia, select-vermelho-motivo, select-estacionamento-tipo, textarea-relato | btn-run-analysis | — |
| 6 | AnalysisProcessingStep | step=6 | caseAnalysis | **Local ExpertRuleEngine.evaluate()** — 390 regras CTB/CONTRAN | progress animation 6 stages | (none) | auto onComplete | — |
| 7 | FreeAnalysisResultStep | step=7 | caseAnalysis (result) | overallSuccessRate, detectedInconsistencies, recommendedArguments, competentBody | display only | (heading "Probabilidade de Êxito") | handleProceedToDocumentGeneration / handleSaveToDashboard | — |
| 8 | RequiredDataStep | step=8 | documentData | applicantName, applicantCpf, applicantCnh, applicantEmail, RG, CNH cat, phone, endereço completo | form validation | input-applicant-name, -cpf, -cnh, -email, -rg, -cnh-category, address fields | onNext | — |
| 9 | DocumentReviewStep | step=9 | documentData + infractionData + analysis | review full petition preview | visual | (scroll) | onNext | — |
| 10 | DocumentCheckoutStep | step=10 | payment | PIX QR / credit card | gateway status | btn-confirm-payment-pix, copy-pix-button, CreditCardForm | onPaymentSuccess | POST /api/payments/pix/create → poll /api/payments/pix/status/:txId |

**Criação do caso**: ocorre no **fim da Etapa 6 (gratuita)**, `POST /api/cases` com `status:'analisado', currentStage:2, analysis`. Retorna `savedCaseId`. `emitCasesChanged()` invalida cache do App.

### Criação do Caso (Backend)
- **Endpoint**: `POST /api/cases` (src/server/routes/cases.ts:113). Auth: `authenticateToken`.
- **Payload**: title, serviceType, infraction, vehicle, isAnonymous, userId (req.user.id se autenticado), userNome, userEmail, status, currentStage, analysis.
- **ID**: server gera `case_<ts>_<rand>` se ausente. `databaseRows.set()` → write-through Supabase (FAIL CLOSED).
- **Persistência**: `public.cases` (UUID v5 PK, app_ref guarda id original). `user_id` = req.user.id (UUID). Anônimo = `user_id=NULL`.
- **Store divergence**: `server.ts` usa `casesStore` (Map em memória, seed demo). `app.ts` (Vercel) usa `databaseRows` (CaseRepository + Supabase). **Dois backends distintos**.

### Análise Jurídica
- **Frontend**: `ExpertRuleEngine.evaluate()` (src/core/rules/rule-engine.ts) — **local, síncrono, zero API**. 390 regras, regras de decadência, INMETRO, sinalização R-19, advertência.
- **Backend**: `RagPipeline.analyzeInfraction()` (src/core/rag/rag-pipeline.ts:174) — roda no `POST /api/cases` e `PUT /api/cases/:id`. Persiste em `cases.analysis_json`.
- **ID análise**: não há tabela dedicada; análise vive em `cases.analysis_json` (JSONB). `case_analysis` não existe.
- **Pipeline**: `RagPipeline` → `aiProviderManager.executeLegalReasoning()` (NVIDIA NIM → 9Router fallback, 15s race, temp 0.2) enriquece `fullDraftText` na geração de defesa.

### Pagamento
- **Criação PIX**: `POST /api/payments/pix/create` (também `/api/pagbank/orders`). `prodAuth` (auth só se PAYMENT_MODE=production). Resolve preço via catálogo comercial (`/resolve-price`). Gateway ativo: PagBank (sandbox) ou GGPIXAPI (prod).
- **Webhook PagBank**: `POST /api/webhooks/pagbank` — HMAC-SHA256 + idempotency (`pagbank_event_id`). Em PAID: `case.isPaid=true, status='defesa_pronta', currentStage=3`, gera `defenseDraft` automático (non-blocking). Atualiza `payment_orders`, `payment_webhook_events`, `commercialService`.
- **Cartão**: `POST /api/payments/credit-card/create` — só PagBank, 3DS CHALLENGE.
- **Simulação**: `POST /api/payments/simulate-payment` — **501 em produção**. Usa fallback `TEST-123456`, `Condutor Teste`, CPF `123.456.789-09`.

### Geração do Documento
- **Endpoint**: `POST /api/cases/:id/generate-defense` (auth, requires `isPaid=true`, max 3 gerações).
- **Serviço**: `RagPipeline.generateDefenseDraft()` (determinístico) → `aiProviderManager` (enriquecimento IA, 15s). BLK-068: appende "ROL DE DOCUMENTOS" dinâmico por procedimento.
- **FAIL CLOSED**: `applicantData` precisa name, CPF, CNH, addressStreet, addressCityState — senão erro.
- **Saída**: `defenseDraft.fullDraftText` + metadados. **PDF gerado no cliente** via `exportDefenseToPDF()` (src/lib/pdf-export.ts). **Nenhum URL de download no servidor**.

### Dados — Linhagem Completa

| Dado | Origem UI | Estado | Request | Endpoint | Backend | Banco | Consumidor |
|---|---|---|---|---|---|---|---|
| user_id | Supabase session | AuthContext.user.id | Bearer token + x-user-id | /api/cases, /api/auth/me | req.user.id (JWT verificado) | cases.user_id, user_profiles.user_id | cases, payments, documents |
| case_id | server gerado | wizard.savedCaseId | POST /api/cases body.id | /api/cases, /api/payments/pix/create | CanonicalMapper ↔ domainIdToUuid | cases.id (UUID v5), cases.app_ref | wizard, checkout, case detail |
| AIT | Step 4 input | infractionData.aitNumber | POST /api/cases infraction.aitNumber | /api/cases | cases.ait_number | cases.ait_number | analysis, defense, doc |
| analysis | ExpertRuleEngine (FE) + RagPipeline (BE) | caseAnalysis | POST /api/cases analysis | /api/cases | cases.analysis_json (JSONB) | cases.analysis_json | defense generation |
| payment_id | gateway (txId) | pixData.txId | POST /pix/create → poll /pix/status | /api/payments | payment_orders.gateway_transaction_id | payment_orders.id, .gateway_transaction_id | webhook, case.isPaid |
| document_id | — (client-side PDF) | defenseDraft | POST /cases/:id/generate-defense | /api/cases/:id/generate-defense | cases.defense_draft_json | cases.defense_draft_json | CaseDetailView PDF export |

---

## 🔴 GAPS / CONTRADIÇÕES ENCONTRADAS

1. **Dois backends, duas fontes de verdade** — `server.ts` (dev: `tsx server.ts`) usa `casesStore` (Map em memória + seed demo). `app.ts` (Vercel: `api/index.mjs`) usa `databaseRows` (CaseRepository + Supabase write-through). Handlers inline de `/api/cases` em `server.ts` (L664-893) **não existem no app.ts**. Em dev, POST /api/cases grava só memória; em prod, grava Supabase. Comportamento divergente.

2. **Identidade anônima em produção** — Frontend envia `local_*` token + `x-user-*` headers para usuários sem sessão. Backend `authenticateToken` **ignora** esses headers em produção (P0 hardening). `req.user = undefined` → 401. Caso anônimo **não cria em produção** (exceto se ADMIN_TEST_LOGIN bypass).

3. **Pagamento sem caso persistido** — `DocumentCheckoutStep` usa `currentCaseId || `case_${Date.now()}``. Se `savedCaseId` não existe (ex: usuário pula para checkout sem concluir análise), cria ID local. `persistCase` POST /api/cases resolve ID real **após** pagamento. Risco: webhook chega antes do persist, FK `payment_orders.case_id` viola.

4. **Nenhum storage bucket para documentos do caso** — Migrations têm buckets `marketing-assets`, `ai-policy`, `lgpd-exports`, `skill-assets`, `whatsapp-media`. **Zero bucket para petições/evidências do usuário**. `documents` table não tem coluna de path. `documenso_envelopes` usa Documenso externo.

5. **RLS de cases não auditável** — Migrations não criam policies de usuário em `cases`. Acesso próprio via baseline não versionada. `payment_orders`, `payments`, `documents` só têm policies admin. Usuário lê próprio caso via policy fantasma.

6. **Defesa só após pagamento confirmado** — `generate-defense` exige `isPaid=true` (server.ts:762). Webhook gera automaticamente, mas se falhar (try/catch non-blocking), `isPaid=true` sem `defenseDraft`. Frontend `DocumentCheckoutStep` chama `generate-defense` novamente no `finalizeAfterPayment`. Dupla geração possível.

7. **PDF client-side only** — Nenhum endpoint `GET /api/cases/:id/document` ou `/api/documents/:id/download`. Download = `exportDefenseToPDF()` no browser. Sem assinatura digital server-side, sem Documenso para petição (só envelopes de assinatura de terceiros).

8. **user_profiles armazena passwordHash** — `defesai_registered_users_v1` em localStorage guarda `passwordHash` em texto plano (supabase.ts:2026, AuthContext.tsx:339). Vazamento local.

9. **Zero data-testid** — Testes usam `id=` atributos (`service-option-{id}`, `input-ait-number`, etc). Frágeis a refatoração.

10. **E2E não testa pagamento real** — `onboarding.spec.ts:526` `test.skip(true)` "requires live PagBank API keys". `doc-audit.spec.ts` usa botão admin `#btn-admin-direct-approve` (bypass). Pagamento-as-a-user **não coberto**.

---

## 🟡 RISCOS

1. **Fallback local_* vaza para prod?** — `authFetch` injeta `Bearer local_${id}_${role}` se não houver token Supabase. Se usuário abre app sem VITE_SUPABASE_URL (ex: build erro), identidade sintética vai para backend. Backend ignora em prod (req.user undefined), mas logs podem expor.

2. **passwordHash no localStorage** — `defesai_registered_users_v1` persiste hash simples. XSS = roubo credencial.

3. **Race webhook vs case persist** — PaymentRepository.createOrder usa `domainIdToUuid(order.caseId)` para FK. Se case ainda não em `cases` table, FK violation. Código "engole" erro (best-effort). Case pode ficar órfão de payment_order.

4. **domainIdToUuid duplicado** — Duas migrations criam `domain_to_uuid()` (20260905000001 + 20260830000002) com digest qualification diferente. Conflito em fresh DB.

5. **Migrations incompletas** — Tabelas core (`cases`, `user_profiles`, `payment_orders`) **não têm CREATE TABLE** nas migrations. Schema depende de baseline desconhecido (aplicado direto no prod llmxnpgjpxcvyrqjkfwb). Drift risk.

6. **Mock token PagBank em prod** — `PAGBANK_TOKEN=mock_...` bloqueia em `isProductionMode()` (pagbank.ts:236,345). Se env mal configurado, pagamento falha silenciosamente em dev, explode em prod.

---

## ⚫ NÃO VERIFICÁVEL NESTA FASE

- Execução real do webhook PagBank com assinatura HMAC válida.
- Geração de defesa com `aiProviderManager` (NVIDIA NIM/9Router) — requer chaves de API.
- Fluxo completo anônimo → login → claim em produção (requer Supabase real).
- Documenso envelope signing end-to-end.
- RLS policies de `cases` em Supabase real (baseline não versionada).
- Concorrência: dois usuários editando mesmo caso, race conditions.
- Performance: `ExpertRuleEngine` 390 regras no browser vs server.
- LGPD anonimização `DELETE /api/cases/:id` em produção.

---

## FLUXO REAL (Descoberto no Código)

```text
PRIMEIRO ACESSO (/)
      ↓
LANDING PAGE → clica "Iniciar Defesa"
      ↓
/novo-caso → OnboardingWizard (localStorage defesai_wizard_state)
      ↓
ETAPA 1: Situação (multa_transito / conversao / indicacao / suspensao / cassacao)
      ↓
ETAPA 2: Fase do Processo (pulável se situação infere)
      ↓
ETAPA 3: Tipo Infração (excesso_velocidade / lei_seca / celular / vermelho / estacionamento)
      ↓
ETAPA 4: Identificação AIT + Veículo + Lead (nome/telefone)
      ↓
ETAPA 5: Perguntas Específicas (velocidades, INMETRO, R-19, reteste, circunstâncias)
      ↓
ETAPA 6: ExpertRuleEngine.evaluate() LOCAL → caseAnalysis (overallSuccessRate, teses)
      ↓
ETAPA 7: Diagnóstico Gratuito → Botão "Gerar Peça Formal"
      ↓
AUTH GATE (se não autenticado) → AccountVerificationGate (login/register/email confirm)
      ↓
ETAPA 8: Qualificação Requerente (dados pessoais completos p/ petição)
      ↓
ETAPA 9: Revisão da Petição (preview)
      ↓
ETAPA 10: Checkout PIX / Cartão → POST /api/payments/pix/create → QR Code
      ↓
USUÁRIO PAGA (app banco) → Webhook PagBank (HMAC) → PAID
      ↓
BACKEND: case.isPaid=true, status=defesa_pronta, currentStage=3, defenseDraft AUTO
      ↓
FRONTEND: poll /pix/status → PAID → POST /api/cases/:id/generate-defense (regenera se quiser)
      ↓
onPaymentSuccess(finalCase) → emitCasesChanged() → navigate /cases/:id
      ↓
CaseDetailView → "Petição Pronta" → Botão "Exportar PDF" (client-side)
      ↓
PDF baixado (nenhum storage server, nenhuma URL permanente)
```

---

## DATA LINEAGE

| Dado | Origem | Estado | API | Backend | Banco | Consumidor |
| ---- | ------ | ------ | --- | ------- | ----- | ---------- |
| user_id | Supabase Auth | AuthContext.user.id | Authorization Bearer + x-user-id | req.user.id (JWT verificado) | auth.users.id → user_profiles.user_id → cases.user_id | cases, payments, documents, claims |
| case_id | server (case_<ts>_<rand>) | wizard.savedCaseId | POST /api/cases → returns id | CanonicalMapper.domainToRow → domainIdToUuid | cases.id (UUID v5 PK), cases.app_ref (domain id) | wizard, checkout, case detail, webhook |
| AIT | Step 4 input-ait-number | infractionData.aitNumber | POST /api/cases infraction.aitNumber | cases.ait_number | cases.ait_number | analysis, defense, doc, timeline |
| analysis | ExpertRuleEngine (FE) + RagPipeline (BE) | caseAnalysis (state) | POST /api/cases analysis | cases.analysis_json (JSONB) | cases.analysis_json | defense generation, display |
| payment_id | gateway (txId) | pixData.txId | POST /pix/create → GET /pix/status/:txId | payment_orders.gateway_transaction_id | payment_orders.id, .gateway_transaction_id | webhook confirmation, case.isPaid |
| document_id | — (client PDF) | defenseDraft (state) | POST /cases/:id/generate-defense | cases.defense_draft_json | cases.defense_draft_json | CaseDetailView exportDefenseToPDF |

---

## MATRIZ DE COBERTURA

| Etapa | Código identificado | Persistência identificada | Teste existente | E2E real comprovado |
| --------------- | ------------------- | ------------------------- | --------------- | ------------------- |
| Primeiro acesso | ✅ LandingPageView, RouterContext | — | ❌ | 🟠 NÃO COMPROVADO |
| Auth | ✅ AuthContext, /api/auth/me, supabase | ✅ localStorage + Supabase | ⚠️ localStorage mock only | 🟠 NÃO COMPROVADO |
| Serviço (situação) | ✅ ServiceStep, RULES_MATRIX | ✅ wizard state (localStorage) | ✅ onboarding.spec.ts | 🟠 NÃO COMPROVADO |
| Dados (AIT, veículo, lead) | ✅ InfractionIdentificationStep | ✅ wizard state | ✅ onboarding.spec.ts | 🟠 NÃO COMPROVADO |
| Case (criação) | ✅ POST /api/cases (2 handlers!) | ⚠️ casesStore (dev) vs databaseRows (prod) | ⚠️ in-memory only | 🔴 NÃO COMPROVADO |
| Análise | ✅ ExpertRuleEngine (FE) + RagPipeline (BE) | ✅ cases.analysis_json | ✅ onboarding.spec.ts (FE only) | 🟠 NÃO COMPROVADO |
| Pagamento | ✅ /pix/create, webhook, /simulate-payment | ✅ payment_orders + webhook_events | ❌ **SKIPPED** (live keys) | 🔴 NÃO COMPROVADO |
| Documento | ✅ generate-defense, RagPipeline, aiProviderManager | ✅ cases.defense_draft_json | ⚠️ admin bypass only | 🔴 NÃO COMPROVADO |
| Resultado final | ✅ CaseDetailView + exportDefenseToPDF | ❌ client-side only | ❌ | 🔴 NÃO COMPROVADO |

---

## CONCLUSÃO

```text
🟢 CONFIRMADO
- Estrutura completa do wizard (10 etapas, validações, seletores)
- Contratos de API (rotas, payloads, responses) mapeados
- Linhagem de dados UI → estado → request → backend → banco
- Persistência Supabase (write-through FAIL CLOSED) no app.ts
- Webhook PagBank com HMAC + idempotência
- Geração de defesa determinística + IA (15s race) + ROL DINÂMICO
- Claim de caso anônimo funcional

🔴 BLOQUEADORES
- Dois backends divergentes (server.ts vs app.ts) → caso cria em memória no dev, Supabase no prod
- Usuário anônimo não cria caso em produção (authMiddleware FAIL CLOSED)
- Pagamento real não testado E2E (skip + admin bypass)
- Nenhum storage para documentos finais (PDF client-side only)
- RLS de cases não auditável (baseline não versionada)
- passwordHash em localStorage

🟡 RISCOS
- Race webhook vs case persist (FK violation silenciosa)
- domainIdToUuid duplicado em migrations
- Mock token PagBank explode em prod se mal configurado
- Zero data-testid → testes frágeis

⚫ PENDÊNCIAS
- Unificar server.ts e app.ts (single source of truth)
- Implementar bucket storage para petições
- Adicionar RLS policies versionadas para cases/user_profiles
- Remover passwordHash do localStorage
- Criar teste E2E real de pagamento (sandbox PagBank)
- Endpoint GET /api/cases/:id/document com URL assinada
```

**Golden Path atualmente: 🟡 NÃO MAPEADO SUFICIENTEMENTE PARA EXECUÇÃO REAL**

O fluxo existe no código, mas a divergência dev/prod (dois stores, dois handlers), a impossibilidade de usuário anônimo criar caso em produção, a ausência de teste de pagamento real e a geração de PDF apenas client-side impedem declarar o caminho como comprovado executável ponta-a-ponta.

---

## 📄 DOCUMENTO

`docs/audit/E2E-CONTRACT-MAP.md`

## 🔗 COMMIT

```text
<after-commit-sha>
docs(audit): map e2e product contract
```

## 🎯 PRÓXIMA FASE

**FASE 1 — UNIFICAÇÃO DE BACKEND E CORREÇÃO DE BLOQUEADORES**

1. Eliminar `server.ts` inline handlers; usar apenas `app.ts` + `casesRoutes` + `CaseRepository` (Supabase) em todos ambientes.
2. Permitir criação de caso anônimo em produção (endpoint público `POST /api/cases` sem `requireAuth`, com rate-limit + validação).
3. Adicionar bucket Supabase Storage `case-documents` + RLS policies + coluna `storage_path` em `documents`.
4. Implementar `GET /api/cases/:id/document` que retorna signed URL (ou gera PDF server-side via Puppeteer/Chromium).
5. Versionar RLS policies de `cases`, `payment_orders`, `documents` em nova migration.
6. Remover `passwordHash` de `defesai_registered_users_v1`.
7. Adicionar `data-testid` estáveis nos componentes do wizard/checkout.
8. Criar teste E2E PagBank sandbox (credenciais de teste) cobrindo: create PIX → webhook mock → paid → defenseDraft → PDF.

Só após esses itens o Golden Path pode ser executado e validado de ponta a ponta.