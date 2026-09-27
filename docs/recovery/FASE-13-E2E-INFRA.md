# FASE 13.2 — E2E INFRAESTRUTURA PLAYWRIGHT REAL USER

**Data**: 2026-09-27  
**Branch**: fix/golden-provenance-observability  
**Commit**: —  
**Orquestrador**: agent-testing (subagente e2e-infra)

---

## 1. RESUMO

Infraestrutura mínima criada para Playwright testar o **front-end REAL** (zero bypass, zero localStorage injection, zero clock fake, zero bloqueio de rede). Baseada nas descobertas da auditoria (FASE 13.1).

---

## 2. ARQUIVOS CRIADOS

### 2.1 Configuração Unificada — `playwright.config.ts`

```typescript
// Substitui playwright.config.ts + playwright.local.config.ts
export default defineConfig({
  testDir: './tests/e2e/golden-path',
  testIgnore: [...], // ignora testes de bypass (C/D), unit, integration
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['html', { outputFolder: '.superpowers/evidence/html-report' }],
    ['json', { outputFile: '.superpowers/evidence/results.json' }],
    ['list'],
  ],
  use: {
    actionTimeout: 30000,
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'local', use: { ...devices['Desktop Chrome'] } },
    { name: 'cloudflare', use: { ...devices['Desktop Chrome'] } },
    { 
      name: 'mobile-chromium', 
      use: { 
        ...devices['Pixel 5'], 
        viewport: { width: 393, height: 851 },
        deviceScaleFactor: 2.75,
        isMobile: true,
        hasTouch: true,
      } 
    },
  ],
  webServer: !isProduction ? {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  } : undefined,
  outputDir: '.superpowers/evidence/test-results',
});
```

**Mudanças vs anterior**:
- ✅ Removida exigência HTTPS obrigatório (bloqueava local)
- ✅ Referência "Vercel" → "Cloudflare" corrigida
- ✅ `testDir` → `tests/e2e/golden-path` (nova suíte real)
- ✅ 3 projects: `local`, `cloudflare`, `mobile-chromium`
- ✅ Traces/screenshots/video policy alinhada com quality gates
- ✅ `webServer` só sobe em local (não em Cloudflare)

### 2.2 Helpers de Fluxo REAL — `tests/e2e/golden-path/helpers/real-flow-helpers.ts`

| Helper | Descrição | Evidência |
|--------|-----------|-----------|
| `generateE2EUser()` | Gera usuário único: `e2e-{timestamp}-{random}@test.local` + CPF válido | Retorna `{email, password, name, cpf}` + registra em `createdE2EUsers[]` |
| `signupViaForm(page, userData)` | Preenche `/signup`, submete, aguarda redirect para onboarding | Screenshot antes/depois + console.errors + network.failures |
| `loginViaForm(page, email, password)` | Login real via `/login`, aguarda dashboard/onboarding | Screenshot antes/depois + console.errors + network.failures |
| `logoutViaUI(page)` | Logout via menu do usuário (ou `/logout`) | Screenshot antes/depois |
| `waitForAnalysis(page, caseId)` | Polling real até heading "Diagnóstico/Análise" + score visível (sem `clock.fastForward`) | Screenshot a cada poll + console.errors + network.failures |
| `uploadDocument(page, filePath, docType)` | Upload real via `input[type="file"]`, aguarda confirmação OCR | Screenshot antes/depois + console.errors + network.failures |
| `navigateFromLanding(page, utmParams?)` | Landing → CTA → onboarding; suporta `?utm_source=facebook&...` | Screenshot landing + onboarding start |
| `claimAnonymousCase(page)` | Botão "Já tenho conta / Reivindicar" → redirect login | Screenshot antes/depois |
| `checkoutSandbox(page)` | Fluxo pagamento modo teste/sandbox, aguarda status Pago | Screenshot antes/depois + console.errors + network.failures |
| `fillOnboardingStep1/2/4(page, data)` | Preenchimento determinístico steps 1, 2, 4 (labels estáveis) | Screenshot antes/depois |
| `proceedThroughReview(page)` | Step 5 Review → Continuar | Screenshot antes/depois |
| `generateDocument(page)` | Clica "Gerar documento", aguarda link, retorna href | Screenshot antes/depois |

**Padrão de evidência (obrigatório em cada helper)**:
```typescript
// 1. Screenshot ANTES de asserção crítica
await attachScreenshot(page, 'nome-do-passo-before');

// 2. Trace habilitado via config (on-first-retry)

// 3. Captura console.error + requestfailed
const errors = captureConsoleErrors(page);
const networkFailures = captureNetworkFailures(page);

// 4. Anexa ao testInfo se houver erros
if (consoleErrors.length > 0) {
  await test.info().attach('console-errors.txt', { body: consoleErrors.join('\n') });
}
if (networkFailures.length > 0) {
  await test.info().attach('network-failures.txt', { body: networkFailures.join('\n') });
}
```

### 2.3 Identificação Única Usuários E2E

```typescript
// Padrão: e2e-{timestamp}-{random}@test.local
const user = generateE2EUser();
// {
//   email: 'e2e-1727443200000-abc123@test.local',
//   password: 'E2E_Test_1727443200000_abc123!',
//   name: 'E2E User 1727443200000',
//   cpf: '123.456.789-09'  // CPF válido com dígitos verificadores
// }
```

**Cleanup controlado**:
- Usuários registrados em `createdE2EUsers[]` (array global no módulo)
- `getCreatedE2EUsers()` → lista para cleanup via Supabase Admin
- `clearCreatedE2EUsers()` → limpa array
- **Cleanup SÓ no `globalTeardown`** (não entre testes)

### 2.4 Fixtures Reais — `tests/e2e/golden-path/fixtures/real-documents/`

| Arquivo | Tipo | Conteúdo (texto extraível OCR) |
|---------|------|--------------------------------|
| `ait-sample.pdf` | AIT | "Auto de Infraccao de Transito Numero: 1234567890 Orgao: DETRAN-SP Placa: ABC1D23" |
| `cnh-sample.pdf` | CNH | "Carteira Nacional de Habilitacao Nome: Joao da Silva CPF: 123.456.789-00" |
| `crlv-sample.pdf` | CRLV | "Certificado de Registro e Licenciamento de Veiculo Placa: ABC1D23 Renavam: 12345678901" |

**Validade**: PDF 1.4 válidos, 1 página, fonte Helvetica, texto extraível por OCR real.

**Geração**: `node make-pdfs.cjs` (CommonJS por causa de `"type": "module"` no package.json)

---

## 3. ESTRUTURA DE DIRETÓRIOS

```
tests/
├── e2e/
│   └── golden-path/
│       ├── helpers/
│       │   └── real-flow-helpers.ts    # ← NOVO: helpers fluxo real
│       ├── fixtures/
│       │   └── real-documents/
│       │       ├── ait-sample.pdf      # ← NOVO: PDF real AIT
│       │       ├── cnh-sample.pdf      # ← NOVO: PDF real CNH
│       │       ├── crlv-sample.pdf     # ← NOVO: PDF real CRLV
│       │       └── make-pdfs.cjs       # script geração
│       └── *.spec.ts                   # ← NOVOS TESTES AQUI (próxima fase)
├── golden-path-production.spec.ts      # mantido como referência
├── golden-path-local.spec.ts           # mantido
├── onboarding-anonymous-production.spec.ts # mantido
└── playwright.config.ts                # ← ATUALIZADO (unificado)
```

---

## 4. COMO EXECUTAR

### Local (dev server sobe automaticamente)
```bash
npx playwright test --project=local
```

### Cloudflare (produção/staging)
```bash
PLAYWRIGHT_BASE_URL=https://defesai.pages.dev npx playwright test --project=cloudflare
```

### Mobile
```bash
npx playwright test --project=mobile-chromium
```

### Com variáveis de ambiente
```bash
E2E_TEST_EMAIL=e2e-123@test.local \
E2E_TEST_PASSWORD=Secret123! \
npx playwright test --project=local
```

---

## 5. EVIDÊNCIAS GERADAS

Todas em `.superpowers/evidence/`:
- `html-report/` — HTML report Playwright
- `results.json` — JSON results
- `test-results/` — screenshots, traces, videos (só falhas)
- `console-errors.txt` — anexado por helper
- `network-failures.txt` — anexado por helper

---

## 6. PRÓXIMA FASE

**FASE 13.3 — GOLDEN PATH REAL TESTS**

Criar testes na nova suíte `tests/e2e/golden-path/` usando **exclusivamente** os helpers de `real-flow-helpers.ts`:

1. `signup-login-flow.spec.ts` — Signup → email confirmation (mock) → login → onboarding completo
2. `anonymous-claim-flow.spec.ts` — Landing (UTM) → onboarding anônimo → claim → login
3. `full-golden-path.spec.ts` — Login → case → facts → evidence (PDFs reais) → analysis → qualification → review → checkout sandbox → document → Supabase reconciliation
4. `multi-user-isolation.spec.ts` — 2 usuários E2E paralelos, validar isolamento na UI
5. `mobile-viewport.spec.ts` — Mesmo fluxo no project `mobile-chromium`

**Critério de aceite**: Zero `forceLocalAuth`, zero `page.clock.install()`, zero `page.route('**/*')` bloqueando Supabase, zero `ADMIN_USER` hardcoded, zero PDFs sintéticos, zero `e2e-infrastructure.ts`.

---

## 7. CHECKLIST DE CONFORMIDADE (AUDITORIA 13.1)

| Item Auditoria | Status | Evidência |
|----------------|--------|-----------|
| Config unificada (local + Cloudflare + mobile) | ✅ | `playwright.config.ts` projects |
| Referência Vercel removida | ✅ | Erro menciona "produção/Cloudflare" |
| `testDir` em `tests/e2e/golden-path` | ✅ | Config |
| Helpers fluxo real (signup, login, upload, analysis, checkout, claim, logout) | ✅ | `real-flow-helpers.ts` |
| Screenshot antes de asserção crítica | ✅ | Padrão `attachScreenshot(page, '...-before')` |
| Trace on-first-retry | ✅ | Config |
| Console.error + requestfailed capturados | ✅ | `captureConsoleErrors` + `captureNetworkFailures` |
| Usuários únicos `e2e-{ts}-{rand}@test.local` | ✅ | `generateE2EUser()` |
| CPF válido gerado | ✅ | Algoritmo dígitos verificadores |
| Fixtures PDF reais (não sintéticos) | ✅ | `real-documents/*.pdf` válidos |
| Cleanup só no globalTeardown | ✅ | `createdE2EUsers` array + `getCreatedE2EUsers()` |
| Docs `FASE-13-E2E-INFRA.md` | ✅ | Este arquivo |

---

**STATUS: INFRAESTRUTURA PRONTA** — Próxima fase: escrever testes golden path reais.