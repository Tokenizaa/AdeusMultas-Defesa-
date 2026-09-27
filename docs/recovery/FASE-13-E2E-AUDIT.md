# FASE 13.1 — AUDITORIA E2E FRONT-END REAL USER / GOLDEN PATH

**Data**: 2026-09-27  
**Branch**: fix/golden-provenance-observability (atual) / feat/e2e-real-user-golden-path (target)  
**Commit**: 58a941e fix(golden-facts): preserve ISO calendar date and time  
**Orquestrador**: agent-testing (subagente e2e-auditor)

---

## 1. RESUMO EXECUTIVO

Auditoria completa da suíte Playwright existente no repositório AdeusMultas/DefesaAI. O projeto possui **múltiplas camadas de testes E2E** com diferentes graus de realismo. A maioria dos testes **não executa o fluxo real de usuário** — utilizam `localStorage` injection, usuários admin hardcoded, blocos de requisições Supabase, e dados pré-criados no banco.

---

## 2. INVENTÁRIO DE ARQUIVOS DE TESTE

### 2.1 Configurações Playwright

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `playwright.config.ts` | Produção | Exige `PLAYWRIGHT_BASE_URL` HTTPS; ignora testes locais/unitários; `workers: 1`, `retries: 1` no CI |
| `playwright.local.config.ts` | Local | Aponta para `localhost:3000`; sobe `npm run dev` via `webServer`; `reuseExistingServer: true` |

**Problema identificado**: `playwright.config.ts` linha 5 lança erro se `PLAYWRIGHT_BASE_URL` não for HTTPS — impede execução local sem variável de ambiente. Referência a "Vercel/produção" no erro está desatualizada (produção é Cloudflare).

### 2.2 Testes Principais (raiz de `tests/`)

| Arquivo | Linhas | Classificação | Observações |
|---------|--------|---------------|-------------|
| `onboarding.spec.ts` | 552 | **C - Bypass** | Usa `forceLocalAuth` (localStorage injection), `ADMIN_USER` hardcoded, `page.clock.install()`, bloqueia Supabase via `page.route` |
| `comprehensive-onboarding.spec.ts` | 308 | **C - Bypass** | Mesmo padrão: localStorage auth, admin user, clock fake, limpa localStorage no `beforeEach` |
| `comprehensive-case-creation.spec.ts` | 336 | **C - Bypass** | Bloqueia **todas** requisições Supabase (`page.route('**/*')`); admin user; localStorage auth |
| `golden-path-production.spec.ts` | 148 | **A - Real Front-end** | Login real via formulário; upload real; análise real; pagamento real (aguarda webhook); reconciliação Supabase via API REST |
| `golden-path-local.spec.ts` | 137 | **B - Parcialmente Front-end** | Login real; mas exige `LOCAL_E2E_PAYMENT_CONFIRMED=true` manual; sandbox PIX |
| `e2e-runner.spec.ts` | 305 | **D - Criação direta no banco** | `E2ETestManager` cria usuários via `supabase.auth.admin.createUser()`, perfis e cases via `insert` direto; depois executa onboarding com `forceLocalAuth` (localStorage) |
| `onboarding-anonymous-production.spec.ts` | 5434 | **A - Real Front-end** | Testa fluxo anônimo → claim → login; usa API real; sem bypass de auth |
| `recon-novo-caso.spec.ts` | 1184 | **B - Parcialmente** | Reconhecimento de fluxo; mistura front-end e API |
| `recon-wizard-depth.spec.ts` | 3945 | **B - Parcialmente** | Teste de profundidade do wizard |
| `recon-wizard-depth2.spec.ts` | 3318 | **B - Parcialmente** | Continuação do anterior |

### 2.3 Infraestrutura de Suporte (em `tests/`)

| Arquivo | Função | Classificação |
|---------|--------|---------------|
| `e2e-infrastructure.ts` | **D - Criação direta no banco** | `E2ETestManager`: cria 28 usuários via Admin API, insere profiles + cases no banco; gera CPF/CNH/placas sintéticos |
| `e2e-fixtures.ts` | Geração de PDFs sintéticos | Gera AIT, CNH, CRLV, NA, NIP, PSDD como PDFs mínimos (não reais) |
| `e2e-setup.ts` | Script de inicialização | Chama `getE2ETestManager().initialize()` + gera fixtures |
| `e2e-onboarding-executor.ts` | Executor do fluxo | **C - Bypass**: usa `forceLocalAuth` (localStorage), navega por `/novo-caso` com IDs fixos (`#input-*`, `#btn-*`) |
| `e2e-validator.ts` | Validação pós-execução | Valida `analysis_json`, `defense_draft_json`, `protocol_info_json` no banco; detecta contaminação cruzada |
| `golden-path-production-data.ts` | Dados de teste | Dados hardcoded para golden path produção |

### 2.4 Testes em `tests/e2e/` (services + helpers)

| Arquivo | Classificação | Observações |
|---------|---------------|-------------|
| `tests/e2e/services/*.spec.ts` | **C - Bypass / D - Banco** | Testes por serviço (defesa_previa, recurso_jari, etc.); usam fixtures factory; não está claro se executam front-end real |
| `tests/e2e/helpers/onboarding.ts` | Helper genérico | Seletores baseados em `data-testid` que podem não existir no front-end real |
| `tests/e2e/helpers/documents.ts` | Validação determinística | Executa `DocumentAssemblyEngine` direto (Node), não via front-end |
| `tests/e2e/fixtures/case.factory.ts` | Factory de cenários | 10 serviços × variações; watermarks únicos por caso |
| `tests/e2e/fixtures/user.factory.ts` | Factory de usuários | 10 UFs rotativas; CPF/CNH determinísticos válidos |

### 2.5 Testes Diversos

| Arquivo | Classificação |
|---------|---------------|
| `accessibility.spec.ts` | A - Real (axe-core) |
| `visual-ux-regression.spec.ts` | A - Real (screenshots) |
| `defense-integrity.test.ts` | Unit/Integration (não E2E) |
| `image-quality.test.ts` | Unit/Integration |
| `meta-publisher-quality-gate.test.ts` | Unit/Integration |
| `media-generation-service.test.ts` | Unit/Integration |
| `prospecting-lead-detail.spec.ts` | B - Parcialmente |
| `debug-*.spec.ts` | Debug (não contar) |
| `overflow-regression.spec.ts` | B - Parcialmente |

---

## 3. CLASSIFICAÇÃO DOS TESTES EXISTENTES

### A. REALMENTE FRONT-END (Zero bypass, usuário real)
- ✅ `golden-path-production.spec.ts` — Login via formulário, upload real, análise backend real, pagamento real (aguarda webhook), reconciliação via API REST
- ✅ `golden-path-local.spec.ts` — Login real; único gap: pagamento sandbox requer flag manual
- ✅ `onboarding-anonymous-production.spec.ts` — Fluxo anônimo completo; claim via link; login posterior
- ✅ `accessibility.spec.ts` / `visual-ux-regression.spec.ts` — Testes visuais/acessibilidade reais

### B. PARCIALMENTE FRONT-END (Mistura front-end + API/banco)
- ⚠️ `recon-novo-caso.spec.ts` — Navega front-end mas valida via API Supabase
- ⚠️ `recon-wizard-depth*.spec.ts` — Profundidade do wizard; mistura camadas
- ⚠️ `prospecting-lead-detail.spec.ts` — Lead capture + API

### C. TESTES COM BYPASS (localStorage injection, clock fake, bloqueio de rede)
- ❌ `onboarding.spec.ts` — `forceLocalAuth`, `ADMIN_USER`, `page.clock.install()`, `page.route` bloqueia Supabase
- ❌ `comprehensive-onboarding.spec.ts` — Mesmo padrão
- ❌ `comprehensive-case-creation.spec.ts` — Bloqueia **todo** tráfego Supabase; admin user; localStorage
- ❌ `e2e-onboarding-executor.ts` — `forceLocalAuth` (localStorage); IDs CSS hardcoded; não testa login real

### D. TESTES QUE CRIAM DADOS DIRETAMENTE NO BANCO (Admin API)
- ❌ `e2e-infrastructure.ts` — `supabase.auth.admin.createUser()`, `insert` em `profiles` e `cases`
- ❌ `e2e-runner.spec.ts` — Usa `E2ETestManager` para pré-criar tudo; depois executa onboarding com bypass
- ❌ `e2e-setup.ts` — Script que roda a criação em massa

---

## 4. PROBLEMAS CRÍTICOS IDENTIFICADOS

### 4.1 Autenticação Não Real (BLOQUEIO)
- **3 arquivos** usam `forceLocalAuth` → injeta `defesai_auth_session_v1` no localStorage
- **1 arquivo** usa `ADMIN_USER` hardcoded (`admin-test-id`, role: admin)
- **Nenhum** testa o fluxo real: landing → CTA → onboarding → criação de conta → email confirmation → login → claim

### 4.2 Criação de Usuário Via Admin API (BLOQUEIO)
- `e2e-infrastructure.ts` cria **28 usuários** via `supabase.auth.admin.createUser({ email_confirm: true })`
- Isso **ignora completamente**: validação de email, fluxo de signup, onboarding de novo usuário, claim de caso anônimo

### 4.3 Bloqueio de Requisições de Rede (BLOQUEIO)
- `comprehensive-case-creation.spec.ts` linha 52-64: `page.route('**/*')` aborta **todas** requisições para `*.supabase.co`
- Isso quebra: auth real, upload Storage real, análise backend real, webhooks de pagamento

### 4.4 Clock Fake / Timers Artificiais (BLOQUEIO)
- `page.clock.install()` em múltiplos testes — acelera `setTimeout` do step 6 (análise)
- Não testa latência real, loading states, timeouts de rede

### 4.5 Seletores CSS Hardcoded / Frágeis
- IDs como `#input-lead-name`, `#btn-next-to-specifics`, `#service-option-multa_transito` — acoplados à implementação atual
- `tests/e2e/helpers/onboarding.ts` usa `data-testid` que **não existem** no front-end real (verificado em `src/components`)

### 4.6 Fixtures PDF Sintéticos (Não Reais)
- `e2e-fixtures.ts` gera PDFs com estrutura mínima `%PDF-1.4` — não testam OCR real, validação de qualidade, parsers
- OCR real exige PDFs válidos com texto extraível

### 4.7 Referência Incorreta a Vercel (Produção)
- `playwright.config.ts` linha 5: "implantação Vercel/produção" — **produção é Cloudflare**
- `vercel.json` existe na raiz mas não é usado em produção

### 4.8 Isolamento de Usuário Não Testado
- `e2e-validator.ts` tem `validateContamination` mas só verifica `defense_draft_json` no banco
- Não testa: logout → login → outro usuário → vazamento de dados na UI

### 4.9 Mobile Viewport Não Coberto
- Nenhum teste configura `deviceScaleFactor`, `viewport`, `isMobile` via `projects` no Playwright config
- `devices['Desktop Chrome']` apenas

### 4.10 Aquisição (UTM) Não Testada
- Nenhum teste navega com `?utm_source=facebook&utm_medium=cpc&utm_campaign=e2e`
- Não valida preservação de contexto UTM através do onboarding

---

## 5. MAPEAMENTO DE FUNCIONALIDADES vs COBERTURA REAL

| Funcionalidade | Testada Real (A) | Testada Parcial (B) | Com Bypass (C) | Banco Direto (D) | Não Testada |
|----------------|------------------|---------------------|----------------|------------------|-------------|
| Landing page | ❌ | ❌ | ❌ | ❌ | ✅ |
| CTA → Onboarding | ❌ | ❌ | ❌ | ❌ | ✅ |
| Onboarding Steps 1-5 | ✅ (golden-path) | ⚠️ | ❌ (bypass) | ❌ | |
| Onboarding Steps 6-7 (Análise) | ✅ | ⚠️ | ❌ (clock fake) | ❌ | |
| Upload/OCR Real | ✅ (golden-path) | ❌ | ❌ (PDF fake) | ❌ | |
| Criação de Conta (Signup) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Confirmação Email | ❌ | ❌ | ❌ | ❌ | ✅ |
| Login Real (Formulário) | ✅ (golden-path) | ❌ | ❌ (localStorage) | ❌ | |
| Claim Caso Anônimo | ✅ (anon spec) | ❌ | ❌ | ❌ | |
| Checkout/Pagamento Real | ✅ (golden-path) | ⚠️ (sandbox manual) | ❌ | ❌ | |
| Geração Documento | ✅ (golden-path) | ⚠️ | ❌ | ❌ | |
| Dashboard / Cases List | ❌ | ⚠️ (recon) | ❌ | ❌ | ✅ |
| Abrir Caso Existente | ❌ | ⚠️ (recon) | ❌ | ❌ | ✅ |
| Logout / Login Novamente | ❌ | ❌ | ❌ | ❌ | ✅ |
| Persistência Pós-Login | ❌ | ❌ | ❌ | ❌ | ✅ |
| Múltiplos Usuários Isolados | ❌ | ❌ | ❌ (validator só DB) | ❌ | ✅ |
| Mobile Viewport | ❌ | ❌ | ❌ | ❌ | ✅ |
| UTM Acquisition | ❌ | ❌ | ❌ | ❌ | ✅ |
| Console Errors / Network Failures | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 6. EVIDÊNCIAS DE CÓDIGO

### 6.1 Bypass de Auth (localStorage) — `tests/onboarding.spec.ts:32-36`
```typescript
async function forceLocalAuth(page: Page, user: Record<string, unknown>) {
  await page.addInitScript((mockUser) => {
    localStorage.setItem('defesai_auth_session_v1', JSON.stringify(mockUser));
  }, user);
}
```

### 6.2 Admin User Hardcoded — `tests/onboarding.spec.ts:38-46`
```typescript
const ADMIN_USER = {
  id: 'admin-test-id',
  name: 'Admin Teste',
  email: 'admin@defesai.com',
  cpf: '000.000.000-00',
  phone: '(11) 90000-0000',
  role: 'admin',
  isAdmin: true,
};
```

### 6.3 Bloqueio Total Supabase — `tests/comprehensive-case-creation.spec.ts:52-64`
```typescript
async function blockSupabaseRequests(page: Page) {
  await page.route('**/*', (route) => {
    const url = route.request().url();
    try {
      const hostname = new URL(url).hostname;
      if (hostname.endsWith('supabase.co') || hostname.includes('.supabase.co')) {
        return route.abort();
      }
    } catch (_) {}
    return route.continue();
  });
}
```

### 6.4 Criação Direta no Banco — `tests/e2e-infrastructure.ts:235-255`
```typescript
private async createUsersInAuth(): Promise<void> {
  for (const user of this.testUsers) {
    const { data, error } = await this.supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,  // <-- BYPASS confirmação email
      user_metadata: { ... },
    });
    user.id = data.user.id;
  }
}
```

### 6.5 Clock Fake — `tests/onboarding.spec.ts:143-145`
```typescript
test.beforeEach(async ({ page }) => {
  await page.clock.install();  // <-- Acelera setTimeout da análise
});
```

### 6.6 Referência Vercel Incorreta — `playwright.config.ts:5`
```typescript
throw new Error('PLAYWRIGHT_BASE_URL é obrigatório. A suíte E2E Golden Path deve executar contra uma implantação Vercel/produção, nunca contra localhost.');
```

---

## 7. ARQUIVOS QUE PRECISAM SER SUBSTITUÍDOS/REMOVIDOS (Não apenas corrigidos)

| Arquivo | Motivo | Ação |
|---------|--------|------|
| `tests/e2e-infrastructure.ts` | Cria usuários/cases via Admin API; conceito oposto a "usuário real" | **Remover** — substituir por fluxo real de signup |
| `tests/e2e-runner.spec.ts` | Orquestra testes baseados em dados pré-criados no banco | **Remover** — novo runner baseado em fluxo real |
| `tests/e2e-onboarding-executor.ts` | Usa `forceLocalAuth`; seletores hardcoded | **Remover** — novo executor sem bypass |
| `tests/e2e-validator.ts` | Valida apenas banco; não valida UI real | **Substituir** — validação via UI + API |
| `tests/e2e-setup.ts` | Inicializa infraestrutura de bypass | **Remover** |
| `tests/onboarding.spec.ts` | Suite inteira baseada em bypass | **Arquivar** — manter como referência legada |
| `tests/comprehensive-onboarding.spec.ts` | Mesmo padrão de bypass | **Arquivar** |
| `tests/comprehensive-case-creation.spec.ts` | Bloqueia Supabase totalmente | **Arquivar** |
| `playwright.config.ts` | Erro referencia Vercel; exige HTTPS obrigatório | **Corrigir** — suportar local + Cloudflare; remover menção Vercel |
| `tests/e2e/fixtures/*.ts` | Factories para dados sintéticos de bypass | **Arquivar** — novos dados via fluxo real |
| `tests/e2e/helpers/onboarding.ts` | Seletores `data-testid` inexistentes | **Remover** |

---

## 8. ARQUIVOS QUE PODEM SER MANTIDOS/APROVEITADOS

| Arquivo | Motivo | Ação |
|---------|--------|------|
| `golden-path-production.spec.ts` | **Único teste verdadeiramente real** | **Manter como modelo** — base para nova suíte |
| `golden-path-local.spec.ts` | Login real; gap apenas no pagamento sandbox | **Manter** — corrigir flag manual |
| `onboarding-anonymous-production.spec.ts` | Fluxo anônimo → claim real | **Manter como modelo** |
| `accessibility.spec.ts` / `visual-ux-regression.spec.ts` | Testes visuais/acessibilidade reais | **Manter** |
| `playwright.local.config.ts` | Config local funcional (com `webServer`) | **Manter e estender** |
| `tests/e2e-fixtures.ts` | Geração de PDFs para upload (pode servir para upload real) | **Avaliar** — PDFs sintéticos podem não passar OCR real |

---

## 9. RECOMENDAÇÕES PARA PRÓXIMA FASE (e2e-infra)

### 9.1 Nova Configuração Playwright
- Unificar `playwright.config.ts` e `playwright.local.config.ts` em um só com `projects`: `chromium-local`, `chromium-cloudflare`, `mobile-chrome`, `mobile-safari`
- `baseURL` via env: `PLAYWRIGHT_BASE_URL` (produção Cloudflare) ou `LOCAL_PLAYWRIGHT_BASE_URL` (localhost)
- Remover exigência de HTTPS obrigatório; validar apenas em produção
- `webServer` para local: `npm run dev` (já existe)
- Traces: `on-first-retry`; screenshots: `only-on-failure`; video: `retain-on-failure`
- `workers: 1`, `fullyParallel: false`, `retries: 0` (conforme quality gates)

### 9.2 Identificação Única de Usuários E2E
- Prefixo `e2e-` no email: `e2e-{timestamp}-{random}@test.local`
- Tag no `user_metadata`: `test_run_id`, `is_e2e: true`
- Cleanup via API Admin **apenas no teardown global** (não no meio dos testes)

### 9.3 Helpers de Front-end Real
- `loginViaForm(page, email, password)` — navega `/login`, preenche, submete, espera redirect
- `signupViaForm(page, userData)` — fluxo completo de cadastro
- `waitForAnalysis(page)` — espera step 7 sem `clock.fastForward`
- `uploadDocument(page, filePath)` — upload real via `input[type="file"]`
- `fillOnboardingStep(page, step, data)` — seletores robustos (role, label, test-id estáveis)

### 9.4 Evidência Obrigatória
- Screenshot full-page **antes** de cada asserção crítica
- Trace automático em falha
- Console errors + network failures capturados em `testInfo.attachments`

---

## 10. CONCLUSÃO DA AUDITORIA

**STATUS: BLOCKED** — A suíte atual **não valida o produto como usuário real**. A maioria dos testes (C e D) usa bypasses que mascaram falhas reais de: autenticação, signup, claim, isolamento multi-usuário, mobile, UTM acquisition, console errors.

**Apenas 3 testes** (`golden-path-production.spec.ts`, `golden-path-local.spec.ts`, `onboarding-anonymous-production.spec.ts`) executam fluxo real front-to-back.

**Próxima fase (e2e-infra)** deve:
1. Criar nova configuração Playwright unificada
2. Criar helpers de fluxo real (signup, login, onboarding, upload, checkout)
3. Estabelecer padrão de evidência (screenshot + trace + console)
4. Preparar ambiente para 5+ usuários independentes

---

**PRÓXIMA FASE**: e2e-infra — Criar infraestrutura mínima necessária para Playwright real-user testing.