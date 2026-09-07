# 🔎 E2E CONTRACT MAP — ADEUS MULTA

## 🟢 O QUE FOI CONFIRMADO

1. **Rota de entrada**: /novo-caso (PublicLayout) -> OnboardingWizard (src/App.tsx:393-399)
2. **Autenticação**: Supabase Auth + JWT validation via authenticateToken middleware (src/server/middleware/auth-middleware.ts:78-211)
3. **Sessão**: Armazenada em localStorage (defesai_auth_session_v1) + Supabase session cookies; backend usa service_role para RLS bypass
4. **User ID**: UUID do Supabase Auth (session.user.id) -- validado como UUID v4 antes de persistir (src/server/db/case-repository.ts:48-51)
5. **Onboarding em 10 passos dinâmicos** (OnboardingWizard.tsx:271-282):
   - Step 1: Situação (multa_transito, suspensao_cnh, etc.)
   - Step 2: Fase do processo (condicional -- pulado se inferredStage)
   - Step 3: Categoria de infração (condicional -- pulado se defaultInfractionCategory)
   - Step 4: Identificação da autuação (AIT, código, data, órgão)
   - Step 5: Dados específicos por categoria (velocidade, bafômetro, etc.)
   - Step 6: Análise processando (ExpertRuleEngine client-side)
   - Step 7: Resultado da análise gratuita (tese, probabilidade, procedimento)
   - Step 8: Dados de qualificação do condutor (nome, CPF, CNH, endereço)
   - Step 9: Revisão da petição
   - Step 10: Checkout (PIX/Cartão)
6. **Persistência de estado do wizard**: localStorage chave defesai_wizard_state (TTL 24h) (OnboardingWizard.tsx:37-79)
7. **Análise jurídica**: ExpertRuleEngine roda no frontend (AnalysisProcessingStep.tsx:49) E no backend (RagPipeline.analyzeInfraction em cases.ts:141)
8. **Criação de caso**: POST /api/cases (cases.ts:113-192) -> CaseRepository.write-through obrigatório para Supabase (case-repository.ts:76-80)
9. **Pagamento**: /api/payments/create-pix-order (payments.ts:223-317) -> webhook /api/webhooks/pagbank ou /api/webhooks/ggpix (payments.ts:508-630)
10. **Geração de documento**: Automática no webhook PAID via generateDefenseDraftForDomain (payments.ts:105-143) usando DocumentAssemblyEngine (document-assembly-engine.ts)
11. **Armazenamento**: cases tabela no Supabase (src/lib/supabase.ts:212-308) + CaseRepository dual engine (memória + Postgres write-through)
12. **Autorização**: RLS no Supabase + middleware canAccessCase (cases.ts:28-33) + denyCaseAccess (cases.ts:35-45)
13. **Defense Integrity**: Hash determinístico + validação hasValidDefenseIntegrity (cases.ts:85-93)

## 🔴 GAPS / CONTRADIÇÕES ENCONTRADAS

1. **Duas fontes de verdade para análise**: 
   - Frontend: ExpertRuleEngine.evaluate() em AnalysisProcessingStep.tsx:49
   - Backend: RagPipeline.analyzeInfraction() em cases.ts:141
   - Podem divergir; backend é a autoridade final mas frontend mostra resultado primeiro

2. **Criação de caso no DocumentCheckoutStep**: Gera CaseDomain localmente (DocumentCheckoutStep.tsx:197-248) com id: case_${Date.now()}_${Math.random()} ANTES de persistir -- backend recria ID se não for UUID válido (cases.ts:116-118)

3. **CheckoutView só acessível para admins** (CheckoutView.tsx:44-65) -- usuários comuns NÃO podem usar /checkout; fluxo real usa DocumentCheckoutStep (step 10 do wizard)

4. **User ID inconsistente**: 
   - Frontend: authUser.id (UUID Supabase)
   - Backend: aceita UUID ou email (cases.ts:123-133)
   - CaseRepository valida UUID v4 apenas (case-repository.ts:48-51) -- emails viram NULL no banco

5. **DocumentCheckoutStep envia userId opcional** (DocumentCheckoutStep.tsx:47) mas não garante que seja UUID válido

6. **Webhook gera defesa automaticamente** (payments.ts:572-591) mas falha é "não-bloqueante" -- caso fica isPaid=true SEM defenseDraft

7. **Fallback local de autenticação** em AuthContext.tsx:147-148, 173, 243, 288 -- em produção "não há fallback" mas código permite

8. **Dois fluxos de pagamento**: 
   - Admin: /checkout (CheckoutView) 
   - Usuário: DocumentCheckoutStep (wizard step 10)
   - Diferentes componentes, mesma API backend

9. **Claim de caso anônimo**: /api/cases/claim (OnboardingWizard.tsx:502-518) usa claimToken = caseId -- token previsível

10. **TestFillButton** exposto para admins em produção (RequiredDataStep.tsx:60-68) -- gera dados aleatórios válidos

## 🟡 RISCOS

1. **Análise divergente**: Frontend mostra análise otimista; backend pode gerar defesa com teses diferentes
2. **Race condition**: loadCases() no App.tsx (linha 88-90) vs emitCasesChanged() -- cache pode mostrar dado stale
3. **Payment webhook não-bloqueante**: Se generateDefenseDraftForDomain falhar, usuário pagou mas não tem documento
4. **Claim token previsível**: claimToken = caseId permite claim não autorizado se ID vazado
5. **User ID email vs UUID**: Backend aceita email mas CaseRepository descarta (viola FK se email não for UUID)
6. **Duas rotas de criação de caso**: POST /api/cases (cases.ts) + DocumentCheckoutStep local build -- payloads podem divergir
7. **localStorage wizard state**: Persiste dados sensíveis (CPF, CNH, endereço) no browser sem criptografia
8. **Fallback auth em produção**: Código em AuthContext.tsx permite fallback local se Supabase falhar

## ⚫ NÃO VERIFICÁVEL NESTA FASE

1. Execução real de pagamento PIX (requer credenciais PagBank/GGPIX)
2. Webhook real de confirmação de pagamento
3. Geração de PDF real (exportDefenseToPDF)
4. RLS policies no Supabase (precisa inspeção no dashboard)
5. Concorrência de usuários no mesmo caso
6. Fluxo completo anônimo -> autenticado -> pagamento -> documento
7. Renovação de token Supabase em sessões longas
8. Rate limiting efetivo em /api/cases e /api/payments

---

# FLUXO REAL

PRIMEIRO ACESSO (/)
    ↓
LANDING PAGE (LandingPageView)
    ↓
CLICA "INICIAR" -> /novo-caso (rota pública)
    ↓
ONBOARDING WIZARD (OnboardingWizard) -- 10 passos dinâmicos
    ├── Step 1: Situação (USER_SITUATIONS)
    ├── Step 2: Fase Processual (condicional -- inferredStage)
    ├── Step 3: Categoria Infração (condicional -- defaultInfractionCategory)
    ├── Step 4: Dados AIT (número, código, data, órgão, local)
    ├── Step 5: Dados Específicos por Categoria (velocidade, bafômetro, etc.)
    ├── Step 6: Análise Processando (ExpertRuleEngine client-side)
    ├── Step 7: Resultado Análise Gratuita (tese, probabilidade, procedimento)
    │   ├── Botão "Salvar no Painel" -> AuthGate (login/cadastro)
    │   └── Botão "Gerar Defesa Completa" -> Step 8
    ├── Step 8: Qualificação Condutor (nome, CPF, CNH, endereço, email, telefone)
    ├── Step 9: Revisão Petição (DocumentReviewStep)
    └── Step 10: Checkout (DocumentCheckoutStep)
        ├── Resolve preço via /api/payments/resolve-price
        ├── Gera PIX via /api/payments/create-pix-order
        ├── Usuário paga QR Code / Copia-e-cola
        ├── Webhook PAID -> /api/webhooks/pagbank|ggpix
        │   ├── Atualiza case: isPaid=true, status=defesa_pronta, currentStage=3
        │   ├── Gera defenseDraft automaticamente (RagPipeline.generateDefenseDraft)
        │   └── Persiste via CaseRepository (write-through Supabase)
        └── Emite CASES_CHANGED -> App.tsx recarrega cases
    ↓
CASO CRIADO (CaseDomain) -- ID retornado pelo backend
    ↓
DASHBOARD (/dashboard) -> CasesListView -> CaseDetailView
    ↓
DOCUMENTO DISPONÍVEL (defenseDraft.fullDraftText + integrityHash)
    ↓
DOWNLOAD PDF / Google Drive / WhatsApp

---

# DATA LINEAGE

| Dado | Origem (UI) | Estado (Frontend) | API Request | Backend Handler | Banco (Supabase) | Consumidor |
|------|-------------|-------------------|-------------|-----------------|------------------|------------|
| user_id | Supabase Auth (login) | AuthContext.user.id | Header Authorization: Bearer <jwt> | authenticateToken -> req.user.id | cases.user_id (UUID) + user_profiles.user_id | Cases, Payments, Documents |
| case_id | Gerado frontend (case_${ts}_${rand}) ou backend | OnboardingWizard.savedCaseId | POST /api/cases body.id | cases.ts:116-118 (recria se inválido) | cases.id (app_ref se não-UUID) | Cases, Payments, Documents, Webhooks |
| AIT | Step 4 (InfractionIdentificationStep) | infractionData.aitNumber | POST /api/cases body.infraction.aitNumber | CanonicalMapper.domainToRow | cases.ait_number | Análise, Documento, Webhook |
| analysis_id | an_${Date.now()} (frontend) | caseAnalysis.id | Incluído em CaseDomain | RagPipeline.analyzeInfraction (backend) | cases.analysis_json (JSONB) | DocumentReviewStep, DocumentAssemblyEngine |
| payment_id | Gateway (txId/orderId) | pixData.txId / creditCardResult.orderId | Webhook payload | webhookResult.orderId | payment_orders.id + cases.timeline_json | AdminPaymentsView, CaseDetailView |
| document_id | Não existe ID separado | defenseDraft.fullDraftText | N/A (gerado no webhook) | generateDefenseDraftForDomain | cases.defense_draft_json (JSONB) | CaseDetailView, PDF Export |

---

# MATRIZ DE COBERTURA

| Etapa | Código Identificado | Persistência Identificada | Teste Existente | E2E Real Comprovado |
|-------|---------------------|---------------------------|-----------------|---------------------|
| Primeiro acesso | ✅ LandingPageView, PublicLayout, RouterContext | ❌ (stateless) | ❌ | 🟠 NÃO COMPROVADO |
| Auth (login/cadastro) | ✅ LoginPageView, RegisterPageView, AuthContext, /api/auth/me | ✅ Supabase Auth + localStorage session | ⚠️ Unit: auth-middleware-p0.test.ts | 🟠 NÃO COMPROVADO |
| Serviço (situação) | ✅ ServiceStep, USER_SITUATIONS, rules-matrix | ✅ localStorage wizard_state | ✅ comprehensive-onboarding.spec.ts | 🟠 NÃO COMPROVADO |
| Dados infração (AIT) | ✅ InfractionIdentificationStep, SpecificInfractionDataStep | ✅ localStorage wizard_state | ✅ comprehensive-onboarding.spec.ts | 🟠 NÃO COMPROVADO |
| Análise gratuita | ✅ AnalysisProcessingStep, ExpertRuleEngine, FreeAnalysisResultStep | ✅ localStorage wizard_state | ⚠️ Unit: rule-engine.test.ts | 🟠 NÃO COMPROVADO |
| Case creation | ✅ POST /api/cases, CaseRepository, CanonicalMapper | ✅ Supabase cases table (write-through) | ✅ comprehensive-case-creation.spec.ts | 🟠 NÃO COMPROVADO |
| Pagamento | ✅ DocumentCheckoutStep, /api/payments/create-pix-order, webhooks | ✅ payment_orders table + cases.is_paid | ⚠️ Unit: webhook-verification.test.ts | 🟠 NÃO COMPROVADO |
| Documento | ✅ DocumentAssemblyEngine, RagPipeline.generateDefenseDraft | ✅ cases.defense_draft_json + integrityHash | ✅ document-assembly-fail-closed-p0.test.ts | 🟠 NÃO COMPROVADO |
| Resultado final | ✅ CaseDetailView, PDF export, Google Drive | ✅ Supabase + local timeline | ❌ | 🟠 NÃO COMPROVADO |

---

# CONCLUSÃO

🟢 CONFIRMADO
- Fluxo completo mapeado no código (roteamento, componentes, APIs, banco)
- Autenticação Supabase + JWT + middleware
- Onboarding 10 passos com regras condicionais
- Criação de caso com persistência write-through obrigatória
- Pagamento via PIX/Cartão com webhook automático
- Geração de documento determinística (DocumentAssemblyEngine)
- Integridade de defesa com hash + validação

🔴 BLOQUEADORES
- CheckoutView restrito a admins -- usuários reais usam DocumentCheckoutStep (wizard step 10)
- Webhook geração de defesa não-bloqueante -> caso pago sem documento
- Claim token previsível (caseId)
- Duas fontes de análise (frontend/backend) podem divergir
- User ID: backend aceita email mas banco exige UUID

🟡 RISCOS
- Race condition loadCases vs emitCasesChanged
- localStorage expõe dados sensíveis (CPF, CNH, endereço)
- TestFillButton exposto para admins em produção
- Fallback auth local em código de produção

⚫ PENDÊNCIAS
- Execução real E2E com pagamentos
- Validação RLS no Supabase
- Teste de concorrência
- Renovação de token longa duração

Golden Path atualmente:
🟡 NÃO MAPEADO SUFICIENTEMENTE -- Fluxo existe no código mas tem gaps críticos (webhook não-bloqueante, claim token, dual analysis, admin-only checkout) que impedem garantia de funcionamento real sem execução.
