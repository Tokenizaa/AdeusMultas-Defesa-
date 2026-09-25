# FASE 12.1 — AUDITORIA DO ONBOARDING E CAPTURA DO CASO — 2026-09-25

> **Subfase exclusivamente de AUDITORIA. Nenhuma correção de código de aplicação foi implementada.**
> Nenhuma alteração no Supabase. Nenhuma branch criada. Nenhuma migration aplicada.

---

## 1. Objetivo

Auditar integralmente o fluxo

```
/onboarding → captura → upload/OCR → extração → confirmação → criação/persistência do Case
```

verificando se o código atual ainda contém limitações, suposições, campos ou regras herdadas da antiga
base jurídica incompleta, e se o onboarding captura e preserva tudo o que a nova arquitetura jurídica
(Fases 8–11) precisa para produzir análise e defesa coerentes.

**Pergunta que a fase precisa responder:** o onboarding captura e preserva dados suficientes para que a
nova base jurídica nacional possa ser utilizada corretamente na análise e posteriormente refletida no
documento?

**Resposta: NÃO.** Ver §16.

---

## 2. Checkpoint auditado

| Item | Valor |
|---|---|
| HEAD | `2cff13aa034f06b7644dae1e6804292220af8726` |
| `origin/main` | `2cff13a` (idêntico) |
| ahead / behind | `0 / 0` |
| Arquivos rastreados modificados | **0** |
| Arquivos untracked pré-existentes | **29** (baseline salvo em `/tmp/opencode/untracked-baseline-12.1.txt`, md5 `e9a138254e2b0b2b0432a77b69c9a3b4`) |
| Branch | `main` (nenhuma criada) |
| `loop/` | existe (`CHECKPOINT.md`, `loop.config.json`) |
| `plan/features.json` | existe, **somente fases G0–G6**, sem entrada para a Fase 12 |
| `npx tsc --noEmit` | **63 erros** |
| Gate `vitest run` | **34 falhas / 818 testes** (22 no escopo desta auditoria) |

**Estado das Fases 8–11 (lido de `plan/progress.md`):**
Fase 8 CONCLUÍDA · Fase 9 CONCLUÍDA COM GAPS · Fase 9.1 CONCLUÍDA (drift fechado) · Fase 10 CONCLUÍDA
COM GAPS DOCUMENTADOS · Fase 11 CONCLUÍDA COM GAPS DOCUMENTADOS · Auditoria pós-Fase 11 CONCLUÍDA.

**Base jurídica entregue pelas Fases 8–11:**
39 sources · 66 documents · 66 versions · 58 chunks · 58 embeddings
(provider efetivo `DETERMINISTIC_LOCAL`, `defesai-legal-vectorizer-v1`, 1024d — **não semântico**)
12 UFs CONFIRMADA · 7 PARCIAL · 7 BLOQUEADA_POR_ACESSO (DF, MA, MT, PE, RN, RO, SE) · BA
FORA_DO_ESCOPO · Federal PARCIAL
Defesa Prévia/JARI/CETRAN PARTIALLY_CONFIRMED por UF · suspensão/cassação/conversão UNKNOWN
`relations` = 0 · RLS policies públicas = 0 · RPC `match_knowledge_chunks` ausente do versionamento ·
vigência UNKNOWN em 66/66.

---

## 3. Agents utilizados

| Escopo pedido | Subagent executado | Nota |
|---|---|---|
| @defesa-transito | `backend` | @defesa-transito não existe no registro de subagents; escopo declarado em `AGENTS.md` foi aplicado |
| @ocr-evidencias | `backend` | idem |
| @banco | `banco` | — |
| @backend | `backend` | — |
| @frontend | `frontend` | — |
| @testes | `testes` | — |
| @base-legal | `explore` (read-only) | idem |
| @qualidade | `qualidade` | — |
| @supervisor | supervisor | orquestração, consolidação, verificação |

**Nenhum agente paralelo foi criado.** Nenhuma correção foi implementada.

**Verificações do supervisor (evidence-before-assertion):**
- `wrangler.jsonc:4` → `"main": "cloudflare/worker.ts"`; `:24` → `"run_worker_first": ["/api/*"]`.
  **Confirma que Cloudflare Worker é o runtime de produção.**
- `cloudflare/routes/cases.ts:126` → `delete domainData.analysis`, e o arquivo **não** importa nem chama
  `RagPipeline.analyzeInfraction`. **P0 confirmado.**
- `grep -rn "commercial_offer_id" supabase/` → 3 matches, todos em `commercial_catalog.sql`
  (`commercial_orders`, `orders`, `payments`) e no baseline. `public.cases` (48 colunas no
  `BASELINE-20260923.sql`, terminando em `applicant_json`) **não tem** a coluna.
  `cloudflare/canonical-mapper.ts:162` grava `commercial_offer_id` no payload de `cases`.
  **P0 confirmado.**
- `grep -rn "loadAllFromSupabase"` → `case-repository.ts:130` **nunca é chamado**; só
  `commercial-repository.ts:566` e `commercial-service.ts:133` o invocam, para outro repositório.
  **P0 confirmado.**
- `src/server/routes/cases.ts:146` lê `domainData.isPaid` diretamente. **P0 confirmado.**
- `npx tsc --noEmit | grep -c "error TS"` → **63**. **Confirmado.**

---

## 4. Mapa real do fluxo

```
[USUÁRIO] /novo-caso
   └─ App.tsx:420  <OnboardingWizard />
        └─ OnboardingWizard.tsx:120  step 1..10  (sessionStorage 'defesai_wizard_state', :48-77)

STEP 1 ServiceStep                 :576-581  → USER_SITUATIONS      (rules-matrix.ts:50)
STEP 2 DefenseStageStep             :583-589  → USER_PROCESS_STAGES  (rules-matrix.ts:100)
STEP 3 InfractionCategoryStep       :591-605  → handleCategorySelect :295-350
STEP 4 InfractionIdentificationStep :607-631
   ├─ UPLOAD OCR (NÃO FUNCIONAL)    InfractionIdentificationStep.tsx:90
   │    fetch('/api/ocr/analyze')  ← fetch CRU, sem Authorization
   │    body: { rawText: 'Arquivo de Notificação: ' + file.name }   (:93-96)
   │    │  NUNCA envia os bytes do arquivo
   │    ▼
   │  PRODUÇÃO: cloudflare/worker.ts:71 → cloudflare/routes/ocr.ts:97
   │      Workers AI @cf/moondream/moondream3.1-9B-A2B  (ocr.ts:5,115)
   │      resposta { ok, data:{...} }
   │      ✗ frontend testa data.success (:99) → undefined → merge NUNCA acontece
   │    ▼
   │  DEV: src/server/app.ts:122 → src/server/routes/ocr.ts:28
   │      authenticateToken → 401 para anônimo
   │      Path 2 (rawText) — texto é só o nome do arquivo
   │    ▼
   │  NENHUM DOS DOIS PERSISTE. analysis/ocr/confidence/geminiEnriched DESCARTADOS.
   └─ merge parcial em infractionData/vehicleData  (:99-131)
STEP 5 SpecificInfractionDataStep   :633-643
STEP 6 AnalysisProcessingStep       :645-651
   └─ AnalysisProcessingStep.tsx:49  ExpertRuleEngine.evaluate()  ← 100% NO BROWSER
      setTimeout → :648-649 onAnalysisComplete

═════════════ PONTO DE CRIAÇÃO DO CASE (runtime Express) ═════════════
OnboardingWizard.tsx:372-390  authFetch('POST /api/cases', {...})
   └─ app.ts:103 app.use('/api', casesRoutes)
        └─ cases.ts:114  router.post('/cases', authenticateToken)
             ├─ cases.ts:118  isCanonicalUserId(req.user?.id) → 401 CANONICAL_USER_ID_REQUIRED
             ├─ auth-middleware.ts:114  sanitizeCaseCreateBody  ⚠️ STRIPA ANTES DO HANDLER
             │    STRIP: id, isAnonymous, status, currentStage, analysis,
             │           isPaid, paidAt, payment, timeline, claimToken, userId
             ├─ cases.ts:125  domainData.id ||= `case_${randomUUID()}`
             ├─ cases.ts:127  delete domainData.analysis  (análise do cliente DESCARTADA)
             ├─ cases.ts:143  domainData.analysis = RagPipeline.analyzeInfraction(...)  ← RECALCULA
             ├─ cases.ts:146  if (domainData.isPaid || status==='defesa_pronta') → gera minuta GRÁTIS
             ├─ cases.ts:173  CanonicalMapper.domainToRow(domainData)
             └─ cases.ts:174  await databaseRows.set(row)
                  └─ case-repository.ts:122 set() → :125 toPayload() → :128 persist()
                       client.from('cases').upsert(payload)   ◀══ INSERT/ATUALIZAÇÃO EFETIVA

═════════════ PONTO DE CRIAÇÃO DO CASE (runtime PRODUÇÃO — Cloudflare) ═════════════
cloudflare/worker.ts  →  cloudflare/routes/cases.ts
   ├─ :126  delete domainData.analysis
   ├─ ✗ NÃO importa RagPipeline · NÃO chama analyzeInfraction   ◀══ ANÁLISE NUNCA ACONTECE
   └─ cloudflare/canonical-mapper.ts:162  comercial_offer_id  ◀══ COLUNA INEXISTENTE → INSERT FALHA

STEP 7 FreeAnalysisResultStep      :653-664
STEP 8 RequiredDataStep             :666-676
STEP 9 DocumentReviewStep           :678-689
STEP 10 DocumentCheckoutStep        :691-704
   ├─ :256  authFetch('POST /api/cases', buildCasePayload())  ◀══ 2º INSERT
   │         id do body é STRIPADO ⇒ cases.ts:125 gera case_<uuid> NOVO
   │         ⇒ CASO DUPLICADO: o PIX aponta para X, a defesa é gerada em Y
   └─ :271  POST /api/cases/:id/generate-defense
             └─ cases.ts:399  RagPipeline.generateDefenseDraft
                   └─ :418  runControlledPipeline (ai-orchestrator → Quality Gate Fase 8)
                   └─ :451  computeDefenseIntegrityHash
                   └─ :475  domainToRow → databaseRows.set → upsert
```

### 4.1 O que está morto

| Caminho | Status | Prova |
|---|---|---|
| `src/onboarding/ui/**` (OnboardingRoute, OnboardingPage, useOnboarding) | **100% MORTO** | não importado por nada; `App.tsx:26` importa só `OnboardingWizard` |
| `src/onboarding/domain/transitions.ts` | **MORTO** | `canTransition`/`assertTransition` sem nenhum consumidor |
| `src/server/routes/onboarding-v2.ts` (7 rotas) | **MORTO** | não importado em `app.ts:31`; nenhum `app.use` |
| `src/server/routes/defense.ts` | **MORTO** | 0 imports |
| `src/server/workers/ocr.worker.ts` | **MORTO + QUEBRADO** | `ocrService.processDocument` e `.extractEvidenceFlags` não existem (TS2339) |
| `GET /api/onboarding/rules` | VIVO mas **INERTE** | 0 consumidores |
| `RagPipeline.retrieveContext()` | **MORTO** | `grep -rn "retrieveContext" src/` → só a definição |

### 4.2 Divergências entre arquitetura documentada e implementação real

| # | Documento afirma | Realidade |
|---|---|---|
| D1 | `AGENTS.md`: `POST /api/onboarding-v2/start`, `/claim` | Nenhum dos dois existe; a v2 expõe `/draft`, `/draft/:id`, `/cases/:id/{evidence,analysis,qualification}` |
| D2 | `AGENTS.md`: `GET /api/cases/:id/analysis` | Não existe |
| D3 | `AGENTS.md`: `POST /api/cases/:id/defense` | Não existe (existe `/generate-defense`) |
| D4 | `AGENTS.md` (@ocr-evidencias): `POST /api/ocr/upload`, `/process`, `GET /api/ocr/quality/:fileId` | Nenhum dos três existe. Só `/ocr/analyze` |
| D5 | `docs/audit/ONBOARDING-REBUILD-STATUS.md` F6: "API greenfield isolada em `/api/onboarding-v2/*`", "Upload real de imagem", "OCR real conectado" | Nada disso está montado. O upload de imagem real só existe no código morto |
| D6 | `OnboardingWizard.tsx:36-37`: "Never persist PII in browser storage" | O caminho morto grava o payload inteiro (AIT, placa, `specificFacts`) em `localStorage` sem TTL e sem limpeza (`useOnboarding.ts:19,35`) |
| D7 | `AGENTS.md` documenta um ciclo de vida de onboarding que o código não implementa | `onboarding.ts:49-50` afirma que a v2 "owns the case lifecycle"; a v2 não está montada |
| D8 | `AGENTS.md` (nota): typecheck zerado | `tsc --noEmit` = **63 erros** |

---

## 5. Inventário de arquivos auditados

### 5.1 Runtime de produção (Cloudflare Worker)

| Caminho | Linhas | Papel |
|---|---|---|
| `cloudflare/worker.ts` | — | entrypoint (`wrangler.jsonc:4`); monta `/api/*` |
| `cloudflare/routes/ocr.ts` | 137 | `POST /ocr/analyze` — Workers AI, sem auth, sem persistência |
| `cloudflare/routes/cases.ts` | ~490 | CRUD de Case — **sem recomputar análise**, grava coluna inexistente |
| `cloudflare/canonical-mapper.ts` | — | domain↔row; escreve `commercial_offer_id` |
| `cloudflare/routes/onboarding.ts` | ~57 | espelho dessincronizado de `rules-matrix` |

### 5.2 Runtime Express (dev / legado)

| Caminho | Linhas | Papel | Estado |
|---|---|---|---|
| `src/server/app.ts` | 132 | monta 30 routers; **não** monta `onboarding-v2` nem `defense` | vivo |
| `src/server/routes/cases.ts` | 487 | CRUD + claim + generate-defense | vivo |
| `src/server/routes/onboarding.ts` | 52 | 1 endpoint (`/onboarding/rules`) | vivo, inerte |
| `src/server/routes/onboarding-v2.ts` | 95 | 7 rotas do ciclo canônico | **morto** |
| `src/server/routes/defense.ts` | ~7KB | duplicata de generate-defense | **morto** |
| `src/server/routes/ocr.ts` | 333 | OCR + Gemini + RAG; `presetId` declarado e nunca usado | vivo |
| `src/server/services/ocr-service.ts` | 1491 | OCR.space + Google Vision + parser regex | vivo |
| `src/server/services/image-quality.service.ts` | 295 | quality gate (sharp); **não é chamado por rota de OCR** | órfão |
| `src/server/workers/ocr.worker.ts` | 85 | fila BullMQ de OCR | **morto + quebrado** |
| `src/server/db/case-repository.ts` | 132 | write-through; `loadAllFromSupabase` nunca chamado | vivo |
| `src/server/db/supabase-server.ts` | 74 | client service-role | vivo |
| `src/server/middleware/auth-middleware.ts` | 211 | JWT + `sanitizeCaseCreateBody` (allow-list) | vivo |
| `src/lib/authFetch.ts` | 25 | injeta JWT | vivo |

### 5.3 Domínio (compartilhado por ambos runtimes)

| Caminho | Linhas | Papel |
|---|---|---|
| `src/core/onboarding/rules-matrix.ts` | 234 | 5 situações, 6 estágios, 9 categorias |
| `src/core/rules/rule-engine.ts` | 706 | `EXPERT_RULES` (10 regras), FAIL CLOSED |
| `src/core/rag/rag-pipeline.ts` | 276 | orquestrador determinístico (**não é RAG**) |
| `src/core/arguments/arguments-catalog.ts` | 1392 | 52 teses com `legalBase` literal |
| `src/core/procedures/procedures-catalog.ts` | 363 | 11 procedimentos, prazos literais |
| `src/core/templates/document-blocks.ts` | 709 | 67 referências normativas literais |
| `src/core/templates/templates-catalog.ts` | 472 | 9 templates para 11 procedimentos |
| `src/core/documents/document-assembly-engine.ts` | 443 | montagem da peça |
| `src/core/mappers/canonical-mapper.ts` | 506 | payload↔domain↔row |
| `src/core/legal-base/{organs,ctb-articles,resolutions,jurisprudence,glossary}.ts` | ~1605 | registro canônico nacional |
| `src/core/knowledge/**` | — | registry + Fases 9–11 |
| `src/server/knowledge/**` | 9 arquivos | ingestion/chunking/embedding/vector/rerank/search/rag |
| `src/data/knowledge-base.ts` | 497 | `INFRACTION_CATALOG` + `AUTUADOR_BODIES` (KB antiga) |

### 5.4 Frontend

| Caminho | Linhas | Papel | Estado |
|---|---|---|---|
| `src/components/onboarding/OnboardingWizard.tsx` | 720 | orquestrador de 10 passos | **VIVO** |
| `steps/ServiceStep.tsx` | 114 | passo 1 | vivo |
| `steps/DefenseStageStep.tsx` | 112 | passo 2 | vivo |
| `steps/InfractionCategoryStep.tsx` | 205 | passo 3 | vivo |
| `steps/InfractionIdentificationStep.tsx` | 485 | passo 4 + upload OCR | vivo |
| `steps/SpecificInfractionDataStep.tsx` | 663 | passo 5 | vivo |
| `steps/AnalysisProcessingStep.tsx` | 148 | passo 6 — engine no browser | vivo |
| `steps/FreeAnalysisResultStep.tsx` | 351 | passo 7 | vivo |
| `generation/RequiredDataStep.tsx` | 313 | passo 8 | vivo |
| `generation/DocumentReviewStep.tsx` | 306 | passo 9 | vivo |
| `generation/DocumentCheckoutStep.tsx` | 780 | passo 10 + 2º POST | vivo |
| `AccountVerificationGate.tsx` | 147 | gate de auth | vivo |
| `src/onboarding/ui/{OnboardingRoute,OnboardingPage,useOnboarding}.ts*` | 15+92+116 | slice hexagonal | **MORTO** |
| `src/onboarding/application/{http-application,contracts,types-bridge}.ts` | 57+42+8 | adapter HTTP | **MORTO** |
| `src/onboarding/domain/{state,transitions}.ts` | 29+22 | máquina de estados | **MORTO** |
| `src/context/casesEvents.ts` | 18 | invalidação de cache | vivo |

### 5.5 Banco

| Caminho | Papel |
|---|---|
| `supabase/migrations/**` (49 arquivos) | versionamento |
| `supabase/recovery/BASELINE-20260923*.sql` | baseline canônico (schema, policies, functions) |
| `supabase/recovery/FASE-9-RECONCILIACAO-DETERMINISTICA.sql` | artefato idempotente 39/66/66 |

---

## 6. Matriz completa de dados

`S`=capturado na UI · `O`=OCR · `C`=confirmável pelo usuário · `P`=persistido em `cases` · `A`=chega à análise · `D`=chega ao documento

| Campo | Origem | S | O | C | P | A | D | Observação |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|---|
| `situation` (5 situações) | `ServiceStep` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | **DADO_NAO_CAPTURADO** — nunca sai do mapper |
| `processStage` (6 estágios) | `DefenseStageStep` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | substituído por `current_stage` numérico |
| `category` (9 categorias) | `InfractionCategoryStep` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | nunca mapeado |
| `procedureType` (11 tipos) | derivado | ✅ | ❌ | ✅ | ✅ `service_type` | ⚠️ | ⚠️ | `defesa_previa` e `recurso_cetran` inalcançáveis |
| `aitNumber` | `InfractionIdentificationStep` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | mas OCR pode inventar `AIT-<timestamp>` |
| `infractionCode` | select catálogo | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `findInfraction('')` retorna `745-50` |
| `autuadorBody` | — | ❌ | ✅ | ❌ | ✅ | ✅ | ⚠️ | **NENHUM INPUT na UI** |
| `severity` | deriv. catálogo | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | default `'grave'` se ausente |
| `points` | deriv. catálogo | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | default `0` |
| `fineAmount` | deriv. catálogo | ✅ | ⚠️ | ❌ | ✅ | ✅ | ✅ | `valorMulta` do OCR é extraído e **descartado** |
| `ctbArticle` | deriv. catálogo | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | — |
| `dateTime` (data do fato) | `input-datetime` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | default `new Date()` se ausente |
| `notificationExpeditionDate` | input | ✅ | ⚠️ | ✅ | ✅ | ✅ | ❌ | OCR atribui `= dataInfracao` |
| **`notificationDeliveryDate`** | — | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | **DADO_DESCARTADO** — sem coluna em `cases` |
| `defenseDeadline` | `input-defense-deadline` | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | OCR sobrescreve com `hoje+28d` |
| `location` | texto livre | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | sem componente estruturado |
| **`uf`** | — | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ | **DADO_NAO_CAPTURADO** — deduzido por regex do órgão |
| **`municipality`** | — | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ | **DADO_NAO_CAPTURADO** |
| `vehicle.plate` | `input-vehicle-plate` | ✅ | ✅ | ✅ | ✅ | ❌ | ⚠️ | — |
| `vehicle.brandModel` | — | ❌ | ⚠️ | ❌ | ✅ | ❌ | ✅ | sem input; só via 🧪 test fill |
| `vehicle.renavam/year/color/chassis` | — | ❌ | ❌ | ❌ | ✅ | ❌ | ⚠️ | mesma origem |
| `speedLimit` | `input-speed-limit` | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | `*` sem validação |
| `measuredSpeed` | `input-measured-speed` | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | `*` sem validação |
| `consideredSpeed` | derivado | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | fórmula roda no **browser** |
| `speedMeasured`/`speedConsidered` | — | ❌ | ⚠️ | ❌ | ❌ | ❌ | ✅ | duplicata; nenhuma regra lê |
| `radarEquipmentId` | `input-radar-equipment-id` | ✅ | ⚠️ | ✅ | ✅ | ❌ | ❌ | nenhuma regra lê |
| `inmetroAferitionDate` | `input-inmetro-date` | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | — |
| `hasPsychomotorTerm` | `select-termo-sinais` | ✅ | ❌ | ⚠️ | ❌ | ❌ | ❌ | **DADO_DESCARTADO**; "não entregue" impossível |
| `offeredRetest` / `refusedTest` | botões | ✅ | ❌ | ⚠️ | ❌ | ❌ | ❌ | **DADO_DESCARTADO** |
| `cellphoneCircumstance` | `select-celular` | ✅ | ❌ | ⚠️ | ❌ | ❌ | ❌ | **DADO_DESCARTADO** |
| `yellowPhaseCrossing` | `select-vermelho` | ✅ | ❌ | ⚠️ | ❌ | ❌ | ❌ | 2 de 4 opções somem |
| `hasPhotoProof` | `select-photo-proof` | ✅ | ❌ | ⚠️ | ❌ | ❌ | ❌ | — |
| `hasR19SignageProof` | — | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **DADO_NAO_CAPTURADO**; comentário afirma que é coletado |
| `hasRegulatorySign` | — | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **DADO_NAO_CAPTURADO** |
| `emergencyPassage` | `select-vermelho` | ✅ | ❌ | ⚠️ | ❌ | ❌ | ❌ | **DADO_DESCARTADO** |
| `hasPreviousInfractionsLast12Months` | `chk-no-reoffense` | ✅ | ❌ | ⚠️ | ❌ | ❌ | ❌ | inversão semântica dupla |
| `indicationWithinDeadline` | `select-indication` | ✅ | ❌ | ⚠️ | ❌ | ❌ | ❌ | **DADO_DESCARTADO** |
| `realDriverName/Cpf/Cnh` | `input-real-driver-*` | ✅ | ❌ | ⚠️ | ❌ | ❌ | ❌ | **DADO_DESCARTADO** — PII |
| **`evidenceFlags`** | — | ❌ | ❌ | ❌ | ⚠️ | ❌ | ❌ | **DADO_NAO_CAPTURADO** — produtor inexistente |
| `infraction.notes` (relato livre) | `textarea-relato` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | **DADO_DESCARTADO** e sobrescrito por tokens |
| `ocrAuxiliaryData` | OCR | — | ✅ | ❌ | ⚠️ | ❌ | ❌ | só `extractedText` sobrevive; frontend não envia |
| `leadName` / `leadPhone` | inputs | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | removidos pelo allow-list |
| `applicant.*` (13 campos) | `RequiredDataStep` | ✅ | ❌ | ✅ | ✅ | — | ⚠️ | **`applicant_json` nunca é lido de volta** |
| `addressZipCode` / `Neighborhood` / `Complement` | inputs | ✅ | ❌ | ✅ | ⚠️ | — | ❌ | CEP/bairro omitidos do payload de defesa |
| `nominatedDriver` (7) | — | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ | aceito no allow-list, descartado no mapper |
| `company` (7) | — | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ | idem |
| `processNumbers` (3) | — | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ | idem |
| `factsNarrative` | — | ❌ | ❌ | ❌ | ❌ | — | ❌ | nunca preenchido; bloco FATOS sai vazio |
| `commercialOfferId` | checkout | ✅ | ❌ | ❌ | ❌ | — | ❌ | **grava coluna inexistente no Worker** |

**Totais:** 5 campos com perda total (❌ em P), 18 com perda na fronteira do repositório, 6 nunca
coletados apesar de declarados, 1 destrói dado do usuário (`notes`).

---

## 7. Auditoria OCR / extração

**Duas implementações divergentes na mesma URL `/api/ocr/analyze`:**

| | Express (`src/server/routes/ocr.ts`) | Cloudflare (`cloudflare/routes/ocr.ts`) |
|---|---|---|
| Mount | `app.ts:122` | `worker.ts:71` — **produção** |
| Auth | `authenticateToken` | **nenhuma** |
| Engine | OCR.space engine 2 → Google Vision | Workers AI `@cf/moondream/moondream3.1-9B-A2B` (VLM) |
| Parser | regex determinístico | **não existe**; usa a resposta free-form do LLM |
| Entrada | `{imageUrl\|base64\|rawText, presetId}` | `{image, mimeType}` ou multipart |
| Saída | `{success, extractedData, analysis, ocr, geminiEnriched}` | `{ok, data:{provider, model, rawText, fields}}` |
| Campos | 18+ | 10, com nomes diferentes |
| Validação | — | MIME + 1–12 MB |

| # | Pergunta | Resposta com evidência |
|---|---|---|
| 1 | OCR determinístico? | **Parser sim, engine não.** Cloudflare usa VLM de 9B com `temperature: 0`, o que **não** torna um LLM determinístico para extração tabular. |
| 2 | Fallback? | De provider: OCR.space → Google Vision → `throw` (`ocr-service.ts:1329,1358,1385`). De parser: **não existe** — `parseTrafficTicket` nunca falha e nunca devolve vazio. |
| 3 | Erro → usuário vê erro ou valor inventado? | **Valor inventado, com `success: true`.** `aitNumber = 'AIT-'+Date.now()` (`ocr-service.ts:986`), `placa='N/A'` (:972), `orgaoAutuador='N/A'` (:1229), `localInfracao='N/A'` (:1205), `descricao='Infração de trânsito'` (:1249), e `extractDefenseDeadline` **inventa prazo** (+30 dias, ou +30 de hoje, :1284,1294). |
| 4 | Usuário consegue corrigir? | **Sim, mas antes de qualquer persistência** — os inputs do passo 4 são editáveis. Não existe par "OCR extraiu X / seu valor: Y". |
| 5 | Corrigido substitui? Original preservado? | **Substitui.** Só o texto bruto sobrevive (`ocrAuxiliaryData.extractedText` → `ocr_auxiliary_json`). Nada estruturado é preservado; não há `original_value` nem trilha de auditoria. |
| 6 | Distinção extraído vs confirmado? | **Não existe.** Nenhum campo `confirmed`/`verified`/`reviewedAt`/`source` em `InfractionData`, `CaseRow` ou migration. Único sinal: `confidenceScore` — gravado e **nunca lido**. |
| 7 | `evidenceFlags`? | **Existe e está bem desenhado, mas nunca é escrito.** Coluna `evidence_json` versionada, round-trip testado, consumo fail-closed em `rag-pipeline.ts:178-192`. Produtor único: `ocr.worker.ts:46` → `ocrService.extractEvidenceFlags`, **método inexistente** (TS2339). Consequência: `evidence_json` é sempre `NULL` e **ARG-012, ARG-019 e ARG-020 estão permanentemente indisponíveis**. |
| 8 | Campos extraídos que não chegam ao Case? | **14 de 23.** Chegam 9 (`aitNumber`, `placa`, `codigoInfracao`, `descricao`, `artigoCtb`, `orgaoAutuador`, `dataInfracao`, `localInfracao`, `textoCompleto`). Não chegam: `valorMulta`, `prazoDefesa`, `velocidadePermitida`, `VelocidadeAferida`, `velocidadeConsiderada`, `equipamentoRadar`, `dataAfericao`, `validacaoVelocidade`, `observacoesValidacao`, 4× `confianca*`, `custo`, mais `analysis`/`geminiEnriched`/`rawText`/`confidence` no caminho do frontend. |
| 9 | Quality gate? | `image-quality.service.ts` (sharp, Laplaciano 3×3) **não é chamado por nenhuma rota de OCR**. Só por `ai-media-service` e `meta-publisher.worker`. `failureKind` nunca é lido. |
| 10 | Upload validado no servidor? | **Não.** O frontend nunca envia os bytes; o servidor nunca vê `base64`/`imageUrl`; `MAX_DOWNLOAD_SIZE` e validação de MIME **nunca são exercitados** no caminho do onboarding. |

**Correção de `@qualidade` ao achado do frontend:** o relatório do `@ocr-evidencias` afirma que o
frontend "cai no `else` e mostra caixa verde". Confirmado: `InfractionIdentificationStep.tsx:99`
testa `data.success`, que é `undefined` sob Cloudflare, e `:273-278` exibe `CheckCircle2` +
"Dados preenchidos automaticamente" em **caixa verde de sucesso**. Falha de verdade apresentada como
sucesso.

---

## 8. Auditoria Case / persistência

### 8.1 Schema real de `public.cases` (48 colunas)

Fonte: `supabase/recovery/BASELINE-20260923.sql`. Confirmado por
`20260921000006_fase_19_add_applicant_json_cases.sql` e `src/types/supabase.ts:212-260`.

`id` · `user_id` · `title` · `client_name` · `client_email` · `client_phone` · `client_cpf` ·
`status` (CHECK 9 valores) · `current_stage` (CHECK 1..4) · `service_type` ·
`vehicle_plate` · `vehicle_brand_model` · `vehicle_renavam` · `vehicle_chassis` · `vehicle_year` ·
`vehicle_color` · `ait_number` · `infraction_code` · `infraction_description` · `ctb_article` ·
`severity` (CHECK 4 valores) · `points` · `fine_amount` · `autuador_body` · `date_time` ·
`location` · `speed_limit` · `measured_speed` · `considered_speed` · `radar_equipment_id` ·
`inmetro_aferition_date` · `notification_expedition_date` · `defense_deadline` ·
`formal_flaws_json` · `analysis_json` · `defense_draft_json` · `protocol_info_json` ·
`timeline_json` · `ocr_auxiliary_json` · `is_anonymous` · `claim_token` · `is_paid` · `paid_at` ·
`created_at` · `updated_at` · `app_ref` · `evidence_json` · `applicant_json`

**Não existem:** `uf`, `municipality`, `municipality_ibge`, `jurisdiction`, `situation`, `category`,
`process_stage`, `notification_delivery_date`, `commercial_offer_id`, `data_lineage`, `lineage_json`,
`knowledge_refs`, `deleted_at`, e nenhuma das 15 flags de fato.

### 8.2 Onde o Case é criado

- **Express:** `cases.ts:114` (`POST /cases`) → id em `:125` → `domainToRow` em `:173` → persist em `:174` → insert efetivo em `case-repository.ts:128`
- **Express V2 (morto):** `onboarding-v2.ts:40-50` → persist em `:47`
- **Cloudflare:** `cloudflare/routes/cases.ts` — o runtime de produção

### 8.3 Mapa de persistência `capturado → transformado → persistido → recuperado`

| Capturado | Persistido | Recuperado | Status |
|---|---|---|---|
| `ait_number`, `infraction_code`, `infraction_description`, `ctb_article`, `severity`, `points`, `fine_amount`, `autuador_body`, `location`, `speed_limit`, `measured_speed`, `considered_speed`, `radar_equipment_id`, `inmetro_aferition_date`, `notification_expedition_date`, `defense_deadline` | ✅ | ✅ | OK |
| `vehicle_*` (6) | ✅ | ✅ | OK |
| `procedureType` → `service_type` | ✅ | ✅ | OK |
| `applicant.*` (13) | ✅ | ❌ | **DADO_NAO_RECUPERADO** |
| `evidenceFlags` → `evidence_json` | ✅ | ✅ | OK (mas nunca escrito) |
| `ocrAuxiliaryData` | ✅ | ⚠️ | parcial (`confidenceScore`/`provider`/`mimeType`/`filename` perdidos) |
| 15 flags de fato + `real_driver_*` + `commercial_offer_id` | ❌ | ❌ | **DADO_DESCARTADO** |
| `notificationDeliveryDate` | ❌ | ❌ | **DADO_DESCARTADO** (sem coluna) |
| `situation` | ❌ | ❌ | **DADO_NAO_CAPTURADO** |
| `category` | ❌ | ❌ | **DADO_NAO_CAPTURADO** |
| `uf` / `municipality` | ❌ | ❌ | **DADO_NAO_CAPTURADO** |
| `nominatedDriver` / `company` / `processNumbers` | ❌ | ❌ | **DADO_DESCARTADO** (aceitos no allow-list) |
| `infraction.notes` | ❌ | ❌ | **DADO_DESCARTADO** |
| `CaseDataLineage` (Fase 8) | ❌ | ❌ | **DADO_DESCARTADO** — vive só no request |

### 8.4 Transformações silenciosas

| # | Transformação | Onde | Efeito |
|---|---|---|---|
| T1 | `id` sintético `case_<uuid4>` → UUID v5 determinístico | `case-repository.ts:125` + `uuid-v5.ts:73` | id do domínio ≠ id do banco |
| T2 | `dateTime` ausente → **`new Date().toISOString()`** | `canonical-mapper.ts:463` | **fabrica a data do semáforo** e persiste |
| T3 | `severity` ausente → `'grave'` | `canonical-mapper.ts:459` | **infla gravidade**; bloqueia silenciosamente `RULE_CONVERSAO_ADVERTENCIA_267` |
| T4 | 7 placeholders inventados (`'Condutor'`, `'SEM PLACA'`, `'SEM_AIT'`, `'grave'`) | `canonical-mapper.ts:433-464` | indistinguíveis de dado real após persistência |
| T5 | `is_anonymous`: default canônico `false`, migration `true` | baseline vs `20260908000001:44` | divergência entre código e banco |
| T6 | `hasPreviousInfractionsLast12Months` invertido **duas vezes** | `canonical-mapper.ts:41-46` e `:236` | pode disparar ao contrário |
| T7 | `currentStage` re-derivado só de `payload.applicant ? 2 : 1` | `canonical-mapper.ts:68` | ignora `processStage` |
| T8 | `notificationExpeditionDate = dataInfracao` (via OCR) | `ocr.ts:65` | `daysElapsed` sempre 0 → **decadência estruturalmente inalcançável** |
| T9 | `findInfraction('')` → primeiro item do catálogo | `rag-pipeline.ts:28-36` | OCR mudo carimba gravidade/pontos/multa de `745-50` |
| T10 | `domain.analysis` do cliente descartado e recalculado | `cases.ts:127,143` | correto no Express; **no Cloudflare a análise simplesmente não existe** |

### 8.5 DRIFT e RLS

| # | Achado | Evidência |
|---|---|---|
| E-1 | As **45 colunas núcleo de `cases` não têm `CREATE TABLE` versionado**. `20260908000001` é `CREATE TABLE IF NOT EXISTS` sobre tabela já existente → **no-op integral**. `app_ref UNIQUE`, PK sem default, 3 CHECKs e a FK `user_id` nunca foram versionados. | comentário na própria migration linha 1 admite |
| E-2 | **Ordering quebrado**: `20260817000003` cria índice em `cases` e `20260906134612` altera `cases` — **antes** de qualquer `CREATE TABLE` versionado. `supabase db reset` falha com `relation "public.cases" does not exist`. | ordem cronológica dos arquivos |
| E-3 | **Policies versionadas ≠ canônicas**: 5 versionadas vs 6 canônicas, nomes sem sobreposição. A canônica tem `cases_own_all` (FOR ALL, única com `WITH CHECK`) e `cases_service_full` — **nenhuma das duas existe no versionamento**. | `20260915132153` vs `BASELINE-20260923-POLICIES.sql:71-87` |
| E-4 | `documents.case_id` é `uuid NOT NULL` **sem FK** em toda migration e no baseline; `orders`, `payments`, `commissions` também sem FK. | `20260824164720:113-141,143-155,126-140` |
| E-5 | `documents` versionada com 7 colunas; canônica tem 11. `storage_path`, `mime_type`, `size_bytes`, `content_hash`, `generated_at` **sem versão** — install limpo quebra `documents.ts`. | `grep` dessas colunas em `supabase/migrations/*.sql` → 0 |
| E-6 | `knowledge_*` (Fase 9.1): 7 tabelas, 7× RLS, **0× `CREATE POLICY`**. Canônico tem 18, incluindo `knowledge_documents_select_public` (`FOR SELECT TO public USING (true)`). **Mesma patologia da Fase 9.1 agora em `cases`.** | `grep -c "CREATE POLICY"` → 0 |
| E-7 | `match_knowledge_chunks` — a função que `vector-store.ts:207` chama — só existe no `recovery/`, **sem migration**. Instalação limpa degrada para fallback in-memory com um `logger.warn`. | `grep -rn` → 1 match, no recovery |
| E-8 | `knowledge_embeddings.embedding` no baseline é `vector` **sem typmod**; migration declara `vector(1024)`. Com o CREATE no-op, qualquer dimensão é aceita. | baseline vs `20260924233015` |
| E-9 | `payment_orders.case_id`: migration declara `TEXT NOT NULL UNIQUE`; canônico é `uuid` não-único com FK nomeada. `UNIQUE` impede 2 pedidos para o mesmo caso → quebra retry de checkout. | `20260908000001_create_payment_orders.sql:7` |
| E-10 | `src/types/supabase.ts` stale: sem `evidence_json`, sem `applicant_json`, `Relationships: []` apesar de a FK existir. Origem do `as any` em `case-repository.ts:125`. | `grep -n "evidence_json\|applicant_json" src/types/supabase.ts` → 0 |
| E-11 | `app_ref UNIQUE` **não existe no canônico**. `uuid-v5.ts:25` comenta "o índice único parcial `cases_app_ref_key` está sobre app_ref" — **comentário descreve constraint inexistente**. | `cases_app_ref_key` → 0 matches em SQL |

### 8.6 Idempotência

| Camada | Existe? |
|---|---|
| UNIQUE em `app_ref` | **Não** (só na migration no-op) |
| UNIQUE natural (AIT / placa / CPF) | **Não** |
| PK `id` + UUID v5 | Sim, **condicional**: só se o cliente reenviar o mesmo `id` — e o frontend não envia |
| `Idempotency-Key` HTTP | **Não** |

**Consequência:** duplo clique, retry de rede ou duplo submit criam **N casos** para o mesmo AIT. E o
`DocumentCheckoutStep` faz um **2º POST** porque o `id` é removido pelo allow-list
(`auth-middleware.ts:42-59`) — o caso do passo 6 fica órfão e o PIX aponta para um caso, a defesa é
gerada em outro.

### 8.7 Onde as evidências ficam

| Artefato | Persistência | Funciona? |
|---|---|---|
| `evidenceFlags` | `cases.evidence_json` | round-trip OK, **mas nunca escrito** |
| `evidenceFlags` extraídas por OCR | — | produtor inexistente |
| Bytes do arquivo AIT | — | **nenhum** `file_id`/`url`/`hash`/`storage_path` |
| Metadados de arquivo | `documents.*` + bucket `case-documents` | funciona, **mas desconectado do onboarding** |
| `photoProofUrls` / `declarationFiles` | — | sem destino |
| `CaseDataLineage` | — | vive só no request |

**A rastreabilidade `ONBOARDING → CASO → REGRA → TESE → DOCUMENTO` não sobrevive ao request.**

---

## 9. Legado identificado

| ID | Classificação | Local | Prova de legado |
|---|---|---|---|
| L-1 | LEGADO | `src/onboarding/**` (6 arquivos, 359 linhas) | Slice hexagonal completo, **sem nenhum importador**. `App.tsx:26` importa só `OnboardingWizard` |
| L-2 | LEGADO | `src/onboarding/domain/transitions.ts` | `canTransition`/`assertTransition` sem consumidores; status mutado livremente em 10 pontos |
| L-3 | LEGADO | `src/server/routes/onboarding-v2.ts` | Não montado; comentário em `onboarding.ts:49-50` admite que a v2 "owns the case lifecycle" — **falso** |
| L-4 | LEGADO | `GET /api/onboarding/rules` | Único consumidor de `RULES_MATRIX`; 0 chamadas no frontend |
| L-5 | LEGADO | `src/types/index.ts:715-730` | Bloco `// Compatibility / Portuguese aliases` com 14 campos; `canonical-mapper` faz cascata de aliases em 30 linhas |
| L-6 | LEGADO | `src/types/index.ts:26-27` | `'novo'` e `'aguardando_documentos'` marcados `// Legado/compatibilidade com banco` |
| L-7 | LEGADO | `src/types/index.ts:924-954` | Comentário `Phase 1 & Phase 2` (4 etapas) contradiz `JourneyStage 1..4` e `OnboardingStep` de 8 valores |
| L-8 | LEGADO | `src/core/procedures/procedures-catalog.ts:305-362` | `processo_suspensao`/`processo_cassacao` duplicam `suspensao_cnh`/`cassacao_cnh`; **os dois lados se chamam de "alias" um do outro** |
| L-9 | LEGADO | `src/core/documents/document-roll.ts:31-33` | `LEGACY_PROCEDURE_ALIASES` (`recurso_multa → recurso_jari`). Consistente e funcional — **não remover** |
| L-10 | LEGADO | `src/data/knowledge-base.ts:372-404` | `LEGAL_ARGUMENTS` marcado `@deprecated`, projeção de `ARGUMENTS_CATALOG`. Morto mas inofensivo |
| L-11 | LEGADO | `src/core/ai/ai-orchestrator.ts:53-73` | `runControlledRefinement` **sempre** retorna `PROVIDER_UNAVAILABLE`; comentário admite que "não pode await" |
| L-12 | LEGADO | `cloudflare/routes/onboarding.ts` | Espelho do `rules-matrix` com `mappedProcedure: 'defesa'` (inexistente), `inferredStage: 'applied'` (inexistente) ×2, 5 estágios vs 6, 6 categorias vs 9 |
| L-13 | LEGADO | `DocumentCheckoutStep.tsx.bak` | Backup obsoleto de 284 linhas no repositório |
| L-14 | LEGADO | `src/types/ocr-node-compat.d.ts` | Estreita `ObjectConstructor.entries` **globalmente** para resolver 1 call site |

---

## 10. Limitações artificiais

| ID | Limitação | Evidência |
|---|---|---|
| LIM-1 | **9 categorias** fixas (`rules-matrix.ts:29-38`) mapeando 24 infrações do catálogo; `category` **não é validada** na rota |
| LIM-2 | **11 `ProcedureType`** no union, mas `USER_SITUATIONS` só produz 5; `defesa_previa`, `processo_suspensao`, `processo_cassacao`, `analise_tecnica`, `relatorio_pericial` **nunca** produzidos |
| LIM-3 | `OnboardingWizard.tsx:237,239` compara `processStage` com `'recurso_jari'` e `'recurso_cetran'` — **nenhum dos dois existe** em `UserProcessStage`. Ambos os ramos são **inalcançáveis**; tudo cai no default `'recurso_jari'`. **`defesa_previa` e `recurso_cetran` nunca chegam ao Case** |
| LIM-4 | **9 templates** para 11 procedimentos. `analise_tecnica` e `relatorio_pericial` não têm template → `throw new Error('Template não disponível')`. O próprio `integrity-validator.ts:182` abre exceção para eles |
| LIM-5 | `AUTUADOR_BODIES` (`knowledge-base.ts:406-482`) cobre **7 órgãos** (SP/RJ/MG + PRF/DNIT/CET-SP/DER-SP), enquanto `organs.ts` tem **32 órgãos / 27 UFs** |
| LIM-6 | UF extraída por **regex de 9 prefixos**: `/(?:DETRAN\|CET\|DER\|BHTRANS\|SPTRANS\|TRANSALVADOR\|TRANSPE\|TRANSFOR\|PMT)-([A-Z]{2})/i`. `DER-PR`, `SMTRAN`, `PREFEITURA` → UF vazia → peça sai `CETRAN/` sem UF |
| LIM-7 | `procedures-catalog.ts` tem `deadlineDays` literal por procedimento (30, 10, 15, 5, 2, 720, 360) e **nenhum consumidor** — dado morto com número jurídico dentro |
| LIM-8 | Os 10 `EXPERT_RULES` têm `validUntil: null` **em todas** e `jurisdiction: 'federal'` **em todas**. `getActiveRules` filtra **só por data**; `jurisdiction` **nunca é leld**. **A dimensão estadual da KB não tem consumidor** |
| LIM-9 | `RuleEvaluationContext` tem 17–20 chaves; **6 dos 20 campos lidos nunca são consumidos por nenhuma regra**: `notificationDeliveryDate`, `defenseDeadline`, `speedMeasured`, `speedConsidered`, `radarEquipmentId`, e `aitNumber` só para gate+texto |
| LIM-10 | `RULE_INDICACAO_CONDUTOR_TEMPESTIVA` (`rule-engine.ts:374-396`) **nunca retorna resultado** — os dois ramos de saída são `return null` com o comentário "Fora do escopo desta regra específica". Emite `evaluatedRules` com `status:'PASS'` — ruído falso na árvore de decisão auditável |
| LIM-11 | `overallSuccessRate` (`rule-engine.ts:644-665`) é uma escada de literais (`35` → `98` → `94` → `92` → `88` → `85` → `82` → `78` → `min(90, 50+n*15)`), clamp `[25,99]`, apresentada ao cidadão como **probabilidade técnica sem qualquer base empírica, amostral ou jurisprudencial** |
| LIM-12 | `RagPipeline` devolve **tese genérica de radar** (`Art. 280 §2º CTB + Portaria INMETRO 158/2022`) para **qualquer** infração sem match — inclusive celular, estacionamento e cinto (`rag-pipeline.ts:146-155`) |
| LIM-13 | `severity` ausente → `'grave'`. Isso **bloqueia** `RULE_CONVERSAO_ADVERTENCIA_267` (que só dispara para `leve`/`media`) — o default **bloqueia o direito do cidadão silenciosamente** |
| LIM-14 | Endpoints de simulação (`/simulate-payment`, `/simulate-confirm`, `/sandbox/trigger-webhook`) guardados **só por `NODE_ENV === 'production'`**. Qualquer runtime que não defina exatamente isso falha aberto e marca `isPaid=true` |

---

## 11. Dados ausentes

### 11.1 Capturados mas perdidos antes da análise

| Dado | Onde é capturado | Onde se perde | Consequência jurídica |
|---|---|---|---|
| **Data de entrega da notificação** | contrato (`types/index.ts:74`) | sem coluna; fora do `toPayload` e do `rowToDomain` | **decadência (Art. 281, II CTB) sem o fato que a sustenta** |
| Recusa / oferta de reteste (bafômetro) | `SpecificInfractionDataStep` botões | `toPayload` não envia; sem coluna | Art. 165-A inacessível |
| Nome/CPF/CNH do condutor real | `input-real-driver-*` | idem | **Art. 257 §7º (indicação de condutor) inacessível** |
| `hasR19SignageProof` | — | nunca coletado | regra de sinalização nunca dispara |
| `hasRegulatorySign` | — | nunca coletado | idem |
| `emergencyPassage` / `yellowPhaseCrossing` | selects | `toPayload` | — |
| `cellphoneCircumstance` | select | `toPayload` | — |
| `indicationWithinDeadline` | select | `toPayload` | — |
| `hasPreviousInfractionsLast12Months` | `chk-no-reoffense` | `toPayload` | base da tese de advertência |
| `notes` (relato livre, 663 chars) | `textarea-relato` | `domainToRow` nunca referencia; **e é sobrescrito** por tokens de categoria | relato do condutor, insumo primário de teses |
| Qualificação do requerente | `RequiredDataStep` (13 campos) | gravada em `applicant_json`, **nunca lida de volta** | `GET /cases/:id` → `applicant: undefined` → `cases.ts:377` responde **400 "Dados de qualificação incompletos"**: usuário pagou e não gera a defesa |
| `evidenceFlags` | — | produtor inexistente | **3 teses permanentemente mortas** |
| `leadName` / `leadPhone` | inputs | removidos pelo allow-list | "alertas de prazo via WhatsApp" prometido sem dado |
| `situation` | `ServiceStep` | nunca sai do mapper | sistema não sabe qual das 5 situações o cidadão escolheu |
| `category` | `InfractionCategoryStep` | nunca mapeado | eixo de classificação do produto ausente |
| `uf` / `municipality` | — | nunca coletados | **chave de junção com a KB inexistente** |
| `nominatedDriver` / `company` / `processNumbers` | — | aceitos no allow-list, descartados no mapper | peça sai com placeholders vazios → `validationStatus:'invalid'` |
| `CaseDataLineage` | Fase 8 | vive só no request | auditoria jurídica posterior impossível |

### 11.2 Nunca capturados, mas necessários

| Dado | Por que a KB precisa |
|---|---|
| **UF do local da infração** | `knowledge_*.jurisdiction`; `filterJurisdiction` (única chave de junção Case↔KB) |
| **Município + código IBGE** | competência territorial; única junção confiável com resolução municipal |
| **`processStage` semântico** | a KB classifica cobertura **por procedimento** |
| **Vigência do documento aplicável** | colunas `effective_from/until` existem; nenhum código preenche ou lê |
| **`document_id` aplicável ao caso** | não existe mapeamento `document ↔ procedure` |
| **`kbCoverage` por órgão** | 7 UFs têm portal/endereço/prazo e **zero** norma |

### 11.3 Capturados sem confirmação

| Dado | Risco |
|---|---|
| **Todo o resultado do OCR** | merge silencioso, sem par "extraído vs seu valor", sem preservação do original, com defaults do servidor **sempre verdadeiros** sobrepostos ao que o usuário digitou |
| `defenseDeadline` via OCR | sobrescrito com `hoje + 28 dias` |
| `dateTime` via OCR | sobrescrito com `hoje` |
| `notificationExpeditionDate` via OCR | sobrescrito com a data da **infração** |
| `hasPsychomotorTerm` | "não me entregaram nenhum termo" é **impossível de registrar** — o select reverte sozinho |
| `yellowPhaseCrossing` | 2 de 4 opções somem após a escolha |
| Estacionamento | `<select>` **sem atributo `value`** — escolha nunca reaparece |
| `analysis.recommendedArguments` | o modal anuncia "**3 Teses Mapeadas**" mesmo quando a análise não encontrou nenhuma (`\|\| 3`) |

---

## 12. Testes existentes e gaps

### 12.1 Estado do gate (observado)

```
$ npx vitest run
 Test Files  7 failed | 77 passed (84)
      Tests  34 failed | 784 passed (818)
```

22 dos 34 vermelhos estão no escopo desta auditoria:
`routes-cases-legal-authority-p0.test.ts` **17/17 FAIL** e `case-deletion-lgpd.test.ts` **5/6 FAIL**.

Causa raiz: fixtures com `id` de usuário **não-UUID** contra a rota endurecida por `isCanonicalUserId`
(`cases.ts:27-31`, commit `f5d7068`). Testes de 2026-09-04/06; rota endurecida em 2026-09-06/14.
**Cobertura de IDOR e autoridade jurídica está vermelha e ninguém corrigiu.**

### 12.2 Cobertura por etapa do fluxo

| Etapa / artefato | Vitest | Playwright | Assert real |
|---|---|---|---|
| Onboarding multi-step | **0** | 18 | `#service-option-` → `#btn-proceed-to-document-generation` |
| Anônimo → gate de auth | **0** | 2 | GET real no Supabase (opt-in por env) |
| Validação de obrigatórios (passo 4) | **0** | sim | `#btn-next` disabled/enabled |
| `GET /api/onboarding/rules` | **0** | **0** | — |
| Drift `rules-matrix` ↔ espelho Cloudflare | **0** | **0** | — |
| 6 rotas `onboarding-v2` | **0** | **0** | — |
| **Fronteira frontend↔OCR** | **0** | **0** | — |
| OCR MIME inválido | 2 | — | `status 400` |
| OCR extração normalizada | 2 | — | `provider`, `fields.aitNumber` |
| OCR tamanho 1–12 MB | **0** | — | — |
| OCR provider vazio (502) | **0** | — | — |
| OCR JSON inválido do modelo | **0** | — | — |
| **Confirmação/correção pós-OCR** | **0** | **0** | — |
| OCR SSRF | 35 | — | `rejects.toThrow(/SSRF_BLOCKED/)` |
| `POST /cases` Express | 22 **VERMELHOS** | — | IDOR / mass-assignment |
| `POST /cases` Cloudflare | **0** | — | — |
| `GET/PUT/DELETE /cases/:id` | parcial, vermelho | — | — |
| `POST /cases/:id/claim` | 4 | — | 403 sem token, 200 com token |
| `POST /cases/:id/generate-defense` | **17 VERMELHOS** | — | — |
| `cloudflare/routes/cases.ts` (7 rotas, 337 linhas) | **0** | — | — |

### 12.3 Respostas objetivas

| # | Pergunta | Resposta |
|---|---|---|
| a | Onboarding completo multi-step no vitest? | **NÃO — zero.** Só Playwright. `grep` por `onboarding-v2\|rules-matrix` em testes → 2 matches, ambos só o array `USER_PROCESS_STAGES` |
| b | Persistência real no Supabase? | **No vitest: TUDO MOCK.** `case-evidence-persistence.test.ts` chama `toPayload` (função pura, zero I/O). Fora do vitest: 1 spec Playwright, opt-in |
| c | Confirmação/correção pós-OCR? | **NÃO.** A única spec que toca OCR preenche AIT e placa **antes** do upload e assere só o toast |
| d | Verifica que dado não se perde? | **NÃO, em nenhuma implementação.** `canonical-mapper.test.ts` tem 4 testes e só cobre `autuadorBody`. Não existe round-trip completo |
| e | Múltiplos órgãos/UF? | **Parcial: 1 UF no onboarding** (`DETRAN-SP`). `protocol-coverage.test.ts` cobre 27 UFs, mas só `resolveProtocolInfo` — não é onboarding. Nenhum caso federal/DNIT/PRF/municipal |
| f | 2+ procedimentos? | **3 de 7 com minuta real** (`defesa_previa`, `recurso_jari`, `recurso_cetran`). `suspensao_cnh` e `cassacao_cnh` — os de maior risco — verificados **só por substring jurídica** (`expect(psdd.legalBasis).toContain('Art. 261')`), sem `assemble` |
| g | Testes assumem base antiga? | **SIM, 4 literais**: `infractionCode: '745-50'` (`tests/audit/helpers.ts:10`, único código em 9 suítes), `autuadorBody: 'DETRAN-SP'` (33 arquivos), `mappedProcedure: 'defesa'` e `inferredStage: 'applied'` (`cloudflare/routes/onboarding.ts:12-19`) |
| h | OCR cobre falha? | **NÃO.** O mock sempre resolve com JSON válido. O caso mais perigoso: `parseModelAnswer` em `catch` retorna **HTTP 200 com os 10 campos `null`** — nenhum teste pega |
| i | Dados reais ou fixtures? | **100% inventadas** em `tests/audit/` (CPF `123.456.789-00`, placa `ABC-1D23`, AIT `AIT-TST-001`). Nenhum AIT real, nenhuma foto real, nenhum PDF real |

### 12.4 Falsos verdes

| ID | Falso verde | Evidência |
|---|---|---|
| FG-1 | `tests/invariants/rls-policies-exist.test.ts` faz **regex sobre texto SQL**, não verifica comportamento. Passa com green se a policy for `USING (true)`, se uma migration posterior fez `DROP`, ou se nunca foi aplicada. Zero Postgres | linhas 22-75 |
| FG-2 | `tests/invariants/**` e `tests/core/**` **nunca rodam no gate**. `vitest.config.ts:9-16` não os inclui. `npx vitest list --filesOnly` → 84 arquivos, zero match | `vitest.config.ts:9-16` |
| FG-3 | `cloudflare/routes/ocr.test.ts` — mock que **sempre resolve**. Zero asserts de tratamento de erro | linhas 7-23 |
| FG-4 | 4 specs Playwright são **só `console.log`**, sem assert. Contam como testes verdes no `npm test` | `recon-*.spec.ts`, `debug-wizard.spec.ts` |
| FG-5 | `case-evidence-persistence.test.ts` — nome promete persistência, corpo é mapper puro | 1 assert, 1 campo |
| FG-6 | O gate vermelho é normalizado como "esperado" (22 falhas em `routes-cases-*`), então **qualquer regressão nova passa** | 34 falhas no `vitest run` |

---

## 13. Matriz de achados (TOP 20 por risco)

| # | Sev | Classificação | Achado | Evidência principal |
|---|---|---|---|---|
| 1 | **P0** | DADO_DESCARTADO | **Runtime de produção nunca executa análise jurídica.** `cloudflare/routes/cases.ts:126` apaga `analysis` e não chama `RagPipeline.analyzeInfraction` — a peça é gerada com `recommendedArguments: []`, ou seja **zero teses** | `cloudflare/routes/cases.ts:126`; `wrangler.jsonc:4` |
| 2 | **P0** | HARDCODED | **Worker grava coluna inexistente.** `cloudflare/canonical-mapper.ts:162` escreve `commercial_offer_id` no payload de `cases`; a coluna existe em `commercial_orders`/`orders`/`payments` mas **não em `cases`** (48 colunas, terminando em `applicant_json`) → insert/update falha | `cloudflare/canonical-mapper.ts:162` vs `BASELINE-20260923.sql` |
| 3 | **P0** | RISCO | **`loadAllFromSupabase()` nunca é chamado.** Após restart, `GET /cases` retorna `[]` e `GET/PUT/DELETE /cases/:id` retornam **404** para casos legitimamente persistidos. O comentário de `admin-query-service.ts:6` afirma o oposto | `case-repository.ts:130`; `cases.ts:55,74,197,230,286,338` |
| 4 | **P0** | RISCO | **`POST /cases` aceita `isPaid` do body.** Cliente envia `isPaid:true` + `applicant` completo e recebe a peça paga **sem pagamento**, gravando `is_paid:true` no banco | `src/server/routes/cases.ts:141,146` |
| 5 | **P0** | RISCO | **`PUT /cases/:id` aceita o domain inteiro.** `isPaid`, `status`, `currentStage`, `defense_draft_json` controlados pelo cliente; só `analysis` é recomputado | `src/server/routes/cases.ts:196-222` |
| 6 | **P0** | DADO_DESCARTADO | **`applicant_json` nunca é lido de volta.** Qualificação gravada no Postgres e nunca retorna ao domínio → `cases.ts:377` responde **400** e o usuário pagou sem gerar defesa | `case-repository.ts:50-98` vs `:125` |
| 7 | **P0** | DADO_DESCARTADO | **15 flags de evidência + `real_driver_*` + `commercial_offer_id` descartadas na fronteira do repositório.** O mapper escreve, o `toPayload` não envia, o schema não tem coluna | `canonical-mapper.ts:489-503` vs `case-repository.ts:125` |
| 8 | **P0** | DADO_DESCARTADO | **`notificationDeliveryDate` nunca persistido.** Input do prazo decadencial é usado pelo motor e destruído em todo write — sem coluna, fora do `toPayload` e do `rowToDomain` | `canonical-mapper.ts:98`; ausência em `:170-174` |
| 9 | **P0** | DADO_NAO_CAPTURADO | **`evidenceFlags` não tem produtor funcional.** O único escritor chama método inexistente (`TS2339`). ARG-012, ARG-019, ARG-020 **sempre** filtrados da petição | `ocr.worker.ts:46`; `rag-pipeline.ts:204` |
| 10 | **P0** | DADO_DESCARTADO | **`uf` e `municipality` nunca existem.** Declarados no payload, descartados no mapper, sem coluna no banco, substituídos por parse de texto livre. **Única chave de junção Case↔KB ausente** | `types/index.ts:396-397`; `canonical-mapper.ts:78-119`; `document-assembly-engine.ts:170` |
| 11 | **P0** | DADO_NAO_CAPTURADO | **A KB jurídica nacional está 100% desacoplada do Case.** Zero FK, zero coluna, zero rota, zero chamada no fluxo de decisão. Único consumidor em todo o repositório é um worker de **marketing** | `20260924233015` (0 ocorrências de `case`); `estrategico-agent.worker.ts:370` |
| 12 | **P0** | RISCO | **`findInfraction('')` retorna o primeiro item do catálogo.** Falha de OCR injeta gravidade/pontos/multa de `745-50` (velocidade) num caso de Lei Seca | `rag-pipeline.ts:28-36`; catálogo inicia em `745-50` |
| 13 | **P0** | DADO_DESCARTADO | **Spread destrutivo em `PUT /onboarding-v2/draft`.** `{...current, ...next}` zera `analysis`, `applicant`, `timeline` quando o payload não os traz | `onboarding-v2.ts:57-59` |
| 14 | **P0** | DADO_DESCARTADO | **Upload de OCR é decorativo.** Nunca envia os bytes (só `file.name` como `rawText`), usa `fetch` **sem Authorization** (401), e o fallback Contract diverge do Cloudflare (`data.success` é `undefined`) → merge nunca acontece. Falha de verdade exibida em **caixa verde de sucesso** | `InfractionIdentificationStep.tsx:90-99,273-278` |
| 15 | **P0** | DADO_NAO_CAPTURADO | **Órgão autuador não é perguntado.** `autuadorBody` não tem input em nenhum passo; peça endereçada a lugar nenhum; `AUTUADOR_BODIES` (27+ órgãos) e `organs.ts` (32) existem prontos e não usados | `OnboardingWizard.tsx:152`; `rule-engine.ts:698` |
| 16 | **P0** | HARDCODED | **`procedureType` escolhido pelo cidadão é ignorado pelo motor.** `rule-engine.ts:637-642` tem `'recurso_jari'` hardcoded como default. Um caso aberto como `cassacao_cnh` recebe minuta de JARI | `rule-engine.ts:637-642`; `document-assembly-engine.ts:403-406` detecta `procedureMismatch` e o campo é ignorado |
| 17 | **P0** | DESALINHADO | **3 procedimentos vendidos sem base documental.** `suspensao_cnh`, `cassacao_cnh`, `conversao_advertencia` são oferecidos; a KB tem **0 documentos** para os três (UNKNOWN). Nenhum procedimento é CONFIRMED nacionalmente | `rules-matrix.ts:63,81,88`; `FASE-10-...md:102-106` |
| 18 | **P1** | DADO_NAO_CONFIRMADO | **Vigência é um veto jurídico silenciosamente ausente.** `effective_from/until` existem no schema, **zero código** preenche ou lê. Os 66 docs com `legal_status: UNKNOWN` foram indexados contra o próprio contrato da Fase 10 | `20260924233015:70-71`; `ingestion-service.ts:137-148`; `FASE-10-...md:120` |
| 19 | **P1** | HARDCODED | **Duas bases legais em paralelo, nenhuma versionada como fonte única.** A UI lê `data/knowledge-base.ts` (497 linhas, 34 entradas, tabela fixa); a KB nova (`ctb-articles`, `resolutions`, `organs`, `jurisprudence`) é consumida por **1 arquivo** fora do onboarding. **~405 referências normativas literais** no domínio de trânsito | `grep -rl "core/legal-base" src/` → 1 |
| 20 | **P1** | GAP_DE_TESTE | **22 testes de IDOR/autoridade jurídica/LGPD em vermelho** desde 2026-09-06/14, por fixtures não-UUID. Gate vermelho normalizado ⇒ regressão nova passa | `vitest run` → 34 falhas |

**Achados adicionais registrados** (não entram no TOP 20 por severidade, mas estão confirmados):
`onboarding-v2` e `defense.ts` mortos · `transitions.ts` morto · `ocr.worker.ts` quebrado ·
`image-quality.service.ts` órfão · `RULES_MATRIX` importado e não usado no wizard ·
campos fantasma na `RULES_MATRIX` (`hasSignTerm`, `wasInHolder`, `hadPhysicalApproach`,
`yellowDurationIssue`, `parkingCircumstance`) · espelho Cloudflare com `'defesa'` e `'applied'`
inexistentes · `notes` sobrescrito por tokens · 2 selects sem `value` · `hasPsychomotorTerm` sem
estado "não entregue" · duplicação de Case no passo 10 · `clearWizardState()` antes do claim ·
relatório de perda de estado no reload · `feat("análise gratuita 100%")` para anônimo que recebe 401 ·
`case-repository.ts:122` cold start ⇒ 404 · `match_knowledge_chunks` sem migration ·
`knowledge_embeddings.embedding` sem typmod · 0 policies em `knowledge_*` · `documents` com 4 colunas
sem versão · `app_ref UNIQUE` inexistente · `is_anonymous` default divergente · `date_time` fabricada ·
`severity: 'grave'` default · anonimização LGPD incompleta (placa, chassi, RENAVAM, local sobrevivem) ·
`console.log` de PII em `cases.ts:54` · `catch {}` em `payments.ts:917` · `tsc` com 63 erros.

---

## 14. Riscos

| # | Risco | Probabilidade | Impacto |
|---|---|---|---|
| R-1 | Petição gerada com **zero teses** no runtime de produção | **Certa** (código lido) | Perda total do produto |
| R-2 | Criação/edição de caso **impossível** no Cloudflare (coluna inexistente) | **Certa** | Bloqueio total |
| R-3 | Casos legítimos **invisíveis** após qualquer restart | **Certa** | Perda de acesso a casos pagos |
| R-4 | Peça entregue **sem pagamento** | Alta | Perda financeira |
| R-5 | `decadência` (Art. 281, II CTB) **estruturalmente inalcançável**: OCR põe `expeditionDate = dataInfracao` ⇒ `daysElapsed` sempre 0 | **Certa** | Perda da tese mais comum |
| R-6 | `evidenceFlags` sempre vazio ⇒ 3 teses mortas | **Certa** | Perda de teses de foto/manual |
| R-7 | Recusa de bafômetro e indicação de condutor **não persistem** | **Certa** | Perda de Art. 165-A e Art. 257 §7º |
| R-8 | Usuário **paga e não gera defesa** (400 por `applicant` ausente) | Alta | Reclamação + chargeback |
| R-9 | Código de infração errado do OCR carimba multa de `745-50` | Média | Erro jurídico material |
| R-10 | 7 UFs recebem **instrução de protocolo com base jurídica vazia** | **Certa** | Peça oriented a órgão sem norma |
| R-11 | Norma revogada recuperada com a mesma confiança de norma vigente | Alta | Erro jurídico material |
| R-12 | **`app_ref` sem UNIQUE** + cliente sem `id` ⇒ N casos por AIT | Média | Duplicação, cobrança duplicada |
| R-13 | RLS de `cases` não reproduzível a partir das migrations (falta `cases_own_all` com `WITH CHECK`) | Média | Risco de acesso indevido |
| R-14 | `severity` default `'grave'` bloqueia o direito a advertência sem aviso | Média | Prejuízo ao cidadão |
| R-15 | `tsc` com 63 erros e 22 testes de segurança vermelhos ⇒ **nenhuma rede de proteção** | **Certa** | Regressão silenciosa |

---

## 15. Conclusão

A auditoria **responde negatively** às duas perguntas da fase, com evidência de código.

**O onboarding funciona?** Sim, mecanicamente. O wizard V1 (`OnboardingWizard.tsx`, montado em
`App.tsx:420`) coleta dados, roda o Rule Engine no browser, cria o Case via `POST /api/cases` e
gera a peça. Mas o upload de OCR é decorativo, o órgão autuador nunca é perguntado, `procedureType`
escolhido pelo cidadão é ignorado, e o estado do wizard evapora no reload.

**O onboarding captura e preserva dados suficientes para a nova base jurídica nacional?** **Não.**
Três perdas estruturais e uma ausência:

1. **A UF não existe como dado.** Declarada no contrato, descartada no mapper, sem coluna no banco,
   substituída por parse de texto livre. `filterJurisdiction` — a única chave de junção Case↔KB — não
   tem entrada. A KB nacional entrega documento de 19 UFs; o Case não sabe em qual UF está.
2. **A fase processual não sobrevive.** `processStage` é ignorado na entrada e sobrescrito com `1`; a
   derivação do wizard compara contra dois valores inexistentes, tornando `defesa_previa` e
   `recurso_cetran` inalcançáveis. A KB classifica cobertura **por procedimento**; o Case não sabe
   em que procedimento está.
3. **Não existe ligação Case↔KB.** Zero FK, zero coluna, zero rota, zero chamada. A base foi
   construída e validada em 66 documentos, e **nenhum caso a consulta**.
4. **A vigência é um veto jurídico silenciosamente ausente.** Colunas existem, código não. Os 66
   documentos com `legal_status: UNKNOWN` foram indexados assim mesmo, contra o próprio contrato da
   Fase 10.

**E o inverso do que se esperava:** enquanto o onboarding perde jurisdição, fase e vínculo normativo,
ele **oferece e vende 3 procedimentos para os quais a KB não tem um único documento**, e emite
instruções de protocolo para **7 UFs com base jurídica vazia**.

**As limitações herdadas da base jurídica antiga** não estão onde se esperava. Não são de frontend.
São: (a) `INFRACTION_CATALOG` com 34 entradas cobrindo essencialmente velocidade, celular, álcool e
redes, enquanto 27 DETRANs e as Resoluções listadas em `legal-base/` são read-only para citação, não
para decisão; (b) `jurisdiction: 'federal'` em 10/10 regras e `getActiveRules` filtrando **só por
data** — a dimensão estadual da KB não tem consumidor; (c) `validUntil: null` em 10/10 regras, a
engine temporal inerte; (d) quando o cidadão não informa a data da infração, as regras vigentes são
avaliadas contra `new Date()`; (e) `EVIDENCE_DEPENDENT_ARGUMENTS` com 3 entradas e o motor produzindo
argumentos por `legalArgumentId` fixo — a base cresce, mas **o repertório de teses não cresce na mesma
proporção**. A KB alimenta a lineage e o quality gate, mas não amplia o repertório.

**Achado transversal mais grave:** o sistema tem **três implementações do ciclo de vida do Case**
(`routes/cases.ts` Express, `routes/onboarding-v2.ts` Express, `cloudflare/routes/cases.ts` Worker)
com estratégias de ID e regras de análise diferentes sobre a mesma tabela — e **o deploy é o Worker**.
A auditoria do caminho Express, que é o mais documentado e o mais testado, descreve um sistema que não
é o que roda em produção.

---

## 16. Escopo recomendado para a Fase 12.2

### 16.1 Não deve entrar na 12.2

| # | Item | Motivo |
|---|---|---|
| N-1 | Achados 1 e 2 (runtime Cloudflare) | Decisão de **topologia de deploy** (qual runtime é o canônico), não bug fix. Exige ADR. Corrigir sem decidir duplica o erro |
| N-2 | Achados 4 e 5 (autoridade de pagamento) | Exige definir onde vive a autoridade (`webhook only`? ordem persistida?). Toca `@pagamentos-comercial` |
| N-3 | Achados 6, 7, 8, 10 (persistência) | Exigem **DDL** para ~20 colunas. Precisam de decisão: coluna dedicada vs `jsonb`. Migration mal feita perde dado já gravado |
| N-4 | L-12 (espelho Cloudflare do `rules-matrix`) | Só se resolve junto com N-1. Corrigir separado é trabalho dobrado |
| N-5 | Achado 19 (405 referências normativas literais) | Escopo de reescrita de 5 catálogos. Não cabe em uma subfase |
| N-6 | Achado 11 (ligação Case↔KB) | É a **Fase 12.3**. Exige tabela ponte + decisão de arquitetura |
| N-7 | `tsc` 63 erros | Inclui `src/server/workers/*` inteiro, fora do domínio de defesa |
| N-8 | Achados 17 e 18 (cobertura KB / vigência) | Requer coleta documental (Fase 8) e reprocessamento (Fase 11), não correção de código |

### 16.2 Deve entrar na 12.2

Ordem por (ganho ÷ risco):

| Ordem | Achado | Correção | Risco |
|---|---|---|---|
| 1º | **12** — `findInfraction('')` | Guarda `if (!clean) return undefined` | **Baixo** (1 linha) |
| 2º | **9** — `evidenceFlags` sem produtor | Remover a chamada quebrada do `ocr.worker.ts` ou implementar o método | **Baixo** |
| 3º | **20** — 22 testes vermelhos | Corrigir `vi.mock` para `@/server/stores` | **Baixo-médio** (orçar triagem) |
| 4º | **13** — spread destrutivo | Mesclar `infraction`/`vehicle` campo a campo | **Médio** |
| 5º | **15** — órgão autuador ausente | Select de órgão populado da KB (`organs.ts` já tem 32) | **Baixo** |
| 6º | **14** — OCR decorativo + falso verde | Enviar bytes (`FileReader`→base64), usar `authFetch`, branchar por `res.status` | **Médio** |
| 7º | **16** — `procedureType` ignorado | `procedureType` do onboarding como entrada primária; regra só restringe | **Médio** |
| 8º | L-12 parcial / L-3 | Matar `onboarding-v2` **ou** montá-lo — **decisão de `@supervisor` antes** | **Médio** |
| 9º | **6** — `applicant_json` não lido | Adicionar ao `databaseRowToCaseRow` | **Médio** (toca read path) |
| 10º | `case-repository` cold start | Chamar `loadAllFromSupabase()` no boot | **Médio** |
| 11º | `notes` sobrescrito + 2 selects sem `value` + `hasPsychomotorTerm` sem 3º estado | Correções cirúrgis de UI | **Baixo** |
| 12º | R-5 (decadência) | Nunca aceitar default do servidor em campo já preenchido; merge só em campo **vazio** + marcar "extraído, confirme" | **Médio** |
| 13º | L-13 (campos fantasma da `RULES_MATRIX`) | Remover das listas (caminho curto; nada consome) | **Baixo** |
| 14º | `documentData.factsNarrative` nunca preenchido | Mapear `infractionData.notes` → `customFacts` após corrigir `notes` | **Baixo** |
| 15º | Anonimização LGPD incompleta | Adicionar `vehicle_plate`, `infraction_description`, `location`, `radar_equipment_id` | **Baixo** (aditivo) |

### 16.3 Riscos de regressão da 12.2

| # | Correção | Risco | Mitigação |
|---|---|---|---|
| 1º | 6, 7, 8, 10 (persistência) | **ALTO** — `evidence_json` já existe em produção; mexer no mapper pode reescrever flags existentes como `undefined` | Migration puramente aditiva (`ADD COLUMN`); `toPayload` **deve continuar emitindo** `undefined`→`null`, nunca omitindo a chave |
| 2º | 4, 5 (pagamento) | **ALTO** — testes de `payments.ts` já vermelhos (4 falhas) | Não tocar nesta subfase (N-2) |
| 3º | 7º e 12º da lista 16.2 | **MÉDIO** — adicionar chaves ao contexto do Rule Engine **ativa regras hoje em `DATA_INSUFFICIENT`**. `baseScore` e teses recomendadas mudam | Re-baseline do golden test; não assumir |
| 4º | 13 (spread) | **MÉDIO** — se o frontend envia o rascunho completo, a correção parece no-op nos testes e **não há teste cobrindo a perda**. Falso-negativo é o risco real | Escrever primeiro o teste que falha |
| 5º | 20 (fix dos mocks) | **BAIXO-MÉDIO** — outros 17 casos podem falhar por causas latentes mascaradas pelo 404 | Orçar tempo de triagem, não de correção |
| 6º | 1º (findInfraction) | **BAIXO** — `''` retornando `undefined` pode ter virado dependência implícita de algum teste | `grep -rn "findInfraction"` antes |

### 16.4 Decisões que o `@supervisor` precisa tomar antes da 12.2

1. **Qual runtime é o canônico?** Cloudflare Worker (o deployado) ou Express? Sem essa resposta, os
   achados 1, 2 e L-12 não têm correção definida. **Requer ADR.**
2. **O que fazer com `src/onboarding/**` e `src/server/routes/onboarding-v2.ts`?** Promover (montar a
   v2 e rotear o wizard) ou remover. Enquanto isso não for decidido, consertar qualquer uma das duas
   camadas não muda o produto.
3. **A `RULES_MATRIX` serve frontend, backend ou os dois?** Hoje existem **três** fontes: a matriz
   canônica, o espelho em `cloudflare/routes/onboarding.ts`, e o `phase1CoreFields` literal em
   `src/server/routes/onboarding.ts:29-33`. As três divergem.
4. **Persistência: coluna dedicada ou `jsonb`?** Para as 15 flags de fato e `real_driver_*`.
5. **A KB deve ser vinculável ao Case agora ou na 12.3?** Se sim, a **UF precisa ser capturada primeiro**
   — é pré-requisito absoluto de qualquer amarração.

---

## 17. Registro de preservação

- Nenhum arquivo de código de aplicação foi editado, criado ou removido.
- Nenhuma alteração no Supabase. Nenhuma migration aplicada. Nenhuma consulta de escrita.
- Nenhuma branch criada.
- Nenhum teste novo criado.
- Única alteração no repositório: este relatório + a entrada correspondente em `plan/progress.md`.
- Baseline de arquivos untracked registrado antes da fase: 29 arquivos, md5
  `e9a138254e2b0b2b0432a77b69c9a3b4`.
