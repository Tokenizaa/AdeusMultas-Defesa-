/**
 * @file doc-audit.spec.ts
 * Document Audit E2E Suite — FASE E2E MASSIVE DE DOCUMENTOS
 *
 * Tests the complete document generation pipeline for all canonical procedure types.
 * Each case: Playwright → /novo-caso → analysis → document generation → quality audit.
 *
 * Auth: localStorage mock (same pattern as comprehensive-case-creation.spec.ts).
 * Document capture: intercept POST /api/cases/:id/generate-defense response.
 * Quality: deterministic assertions (document-quality.ts).
 * Persistence: Supabase via document-audit-db.ts.
 */

import { test, expect, Page, Route } from '@playwright/test';
import { generateMatrix, countMatrix, AUDIT_MATRIX, CASES_PER_SUBTYPE } from './doc-audit/document-audit-fixtures';
import { assessDocumentQuality } from './doc-audit/document-quality';
import { saveAuditResult, buildMatrixSummary, saveAuditRun } from './doc-audit/document-audit-db';
import type { AuditCaseData, AuditTestRun } from './doc-audit/document-audit.types';

// ─── Configuration ────────────────────────────────────────────────────────────

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

/** Set to 'first' to run only the first case of each subtype (pilot). */
const PILOT_MODE = process.env.DOC_AUDIT_PILOT ?? 'false';

/** Parallel cases per worker. Keep low to avoid rate limiting. */
const PARALLEL_CASES = parseInt(process.env.DOC_AUDIT_PARALLEL || '2', 10);

// ─── Auth helpers (same pattern as comprehensive-case-creation.spec.ts) ─────────

async function blockSupabaseRequests(page: Page) {
  await page.route('**/*', (route) => {
    const url = route.request().url();
    try {
      const hostname = new URL(url).hostname;
      if (hostname.endsWith('supabase.co') || hostname.includes('.supabase.co')) {
        return route.abort();
      }
    } catch (_) { /* ignore invalid URL */ }
    return route.continue();
  });
}

const TEST_USERS: Array<{ name: string; phone: string; role: string }> = [
  { name: 'Audit User 01', phone: '11990000001', role: 'admin' },
  { name: 'Audit User 02', phone: '11990000002', role: 'admin' },
  { name: 'Audit User 03', phone: '11990000003', role: 'admin' },
  { name: 'Audit User 04', phone: '11990000004', role: 'admin' },
  { name: 'Audit User 05', phone: '11990000005', role: 'admin' },
];

function getTestUser(index: number) {
  return TEST_USERS[index % TEST_USERS.length];
}

async function forceLocalAuth(page: Page, user: { name: string; phone: string; role: string }) {
  await page.addInitScript((mockUser) => {
    localStorage.setItem('defesai_auth_session_v1', JSON.stringify(mockUser));
    localStorage.removeItem('defesai_wizard_state');
  }, user);
}

// ─── Wizard navigation helpers ─────────────────────────────────────────────────

async function navigateToOnboarding(page: Page) {
  await page.goto(`${BASE_URL}/novo-caso`, { waitUntil: 'networkidle' });
}

function getStepTitle(step: number): string {
  const titles: Record<number, string> = {
    1: 'Qual situação você quer resolver?',
    2: 'Em que situação está sua multa?',
    3: 'Sobre o tipo da infração',
    4: 'Qual é o auto de infração e o condutor?',
    5: 'Detalhes técnicos da sua autuação',
  };
  return titles[step] || `Etapa ${step}`;
}

async function waitForStep(page: Page, step: number) {
  const title = getStepTitle(step);
  await expect(page.locator(`h1:has-text("${title}"), h2:has-text("${title}"), h3:has-text("${title}")`)).toBeVisible({ timeout: 15000 });
}

async function fillInput(page: Page, id: string, value: string) {
  const locator = page.locator(`#${id}`);
  await locator.waitFor({ state: 'visible', timeout: 10000 });
  await locator.fill(value);
  await page.waitForTimeout(100);
}

async function selectNativeOption(page: Page, id: string, value: string) {
  // Wait for the option to exist in the select before selecting
  await page.waitForFunction(
    ([sel, val]) => {
      const el = document.querySelector(sel) as HTMLSelectElement | null;
      return !!el && Array.from(el.options).some((o) => o.value === val);
    },
    [`#${id}`, value]
  );
  await page.selectOption(`#${id}`, value);
  await page.waitForTimeout(100);
}

// ─── Service → Stage → Category selection ─────────────────────────────────────

async function selectService(page: Page, serviceId: string) {
  const btn = page.locator(`#service-option-${serviceId}`);
  await btn.waitFor({ state: 'visible', timeout: 10000 });
  await btn.click();
}

async function selectStage(page: Page, stageId: string) {
  const btn = page.locator(`#stage-option-${stageId}`);
  await btn.waitFor({ state: 'visible', timeout: 10000 });
  await btn.click();
}

async function selectCategory(page: Page, categoryId: string) {
  const card = page.locator(`#category-card-${categoryId}`);
  await card.waitFor({ state: 'visible', timeout: 10000 });
  await card.click();
}

// ─── Map procedureType + category to wizard IDs ────────────────────────────────

/**
 * Returns the wizard selection IDs for a given procedureType + category.
 * These come from the USER_SITUATIONS and USER_PROCESS_STAGES mappings
 * in src/core/onboarding/rules-matrix.ts.
 */
function getWizardIds(caseData: AuditCaseData): {
  serviceId: string;
  stageId: string;
  categoryId: string;
} {
  const { procedureType, category } = caseData;

  // ── SERVICE selection ──────────────────────────────────────────────────────
  const serviceMap: Record<string, string> = {
    recurso_jari: 'multa_transito',
    recurso_cetran: 'multa_transito',
    defesa_previa: 'multa_transito',
    conversao_advertencia: 'conversao_advertencia',
    indicacao_condutor: 'indicacao_condutor',
    suspensao_cnh: 'suspensao_cnh',
    cassacao_cnh: 'cassacao_cnh',
    processo_suspensao: 'suspensao_cnh',
    processo_cassacao: 'cassacao_cnh',
  };

  // ── STAGE selection (only for multa_transito) ──────────────────────────────
  const stageMap: Record<string, string> = {
    recurso_jari: 'notificacao_penalidade',
    recurso_cetran: 'recurso_jari_negado',
    defesa_previa: 'primeira_notificacao',
    conversao_advertencia: 'primeira_notificacao',
    indicacao_condutor: 'primeira_notificacao',
    suspensao_cnh: 'primeira_notificacao',
    cassacao_cnh: 'primeira_notificacao',
    processo_suspensao: 'primeira_notificacao',
    processo_cassacao: 'primeira_notificacao',
  };

  // ── CATEGORY selection ─────────────────────────────────────────────────────
  // For some procedures, category is pre-selected and not shown in wizard
  // Map InfractionCategory to wizard category card ID
  const categoryMap: Record<string, string> = {
    excesso_velocidade: 'excesso_velocidade',
    lei_seca: 'lei_seca',
    celular: 'celular',
    vermelho: 'vermelho',
    estacionamento: 'estacionamento',
    indicacao_condutor: 'indicacao_condutor',
    conversao_advertencia: 'conversao_advertencia',
    cnh_geral: 'cnh_geral',
    outro: 'outro',
  };

  return {
    serviceId: serviceMap[procedureType] ?? 'multa_transito',
    stageId: stageMap[procedureType] ?? 'primeira_notificacao',
    categoryId: categoryMap[category] ?? category,
  };
}

// ─── Run a single case through the wizard ─────────────────────────────────────

async function runCaseWizard(
  page: Page,
  caseData: AuditCaseData,
  userIndex: number
): Promise<{ documentText: string; durationMs: number }> {
  const startTime = Date.now();
  const user = getTestUser(userIndex);

  await forceLocalAuth(page, user);
  await blockSupabaseRequests(page);
  await navigateToOnboarding(page);

  const { serviceId, stageId, categoryId } = getWizardIds(caseData);

  // ── Step 1: Service ──────────────────────────────────────────────────────────
  await selectService(page, serviceId);
  await waitForStep(page, 2);

  // ── Step 2: Stage ───────────────────────────────────────────────────────────
  await selectStage(page, stageId);
  await waitForStep(page, 3);

  // ── Step 3: Category ────────────────────────────────────────────────────────
  // Conversao_advertencia and indicacao_condutor skip category selection
  // (they have defaultCategory set in USER_SITUATIONS)
  const skipsCategory = ['conversao_advertencia', 'indicacao_condutor'];
  if (!skipsCategory.includes(serviceId)) {
    // Category selection auto-advances to step 4 — just click the card and wait
    await selectCategory(page, categoryId);
    await waitForStep(page, 4);
  } else {
    // These services go directly to identification after stage
    await page.click('#btn-next-to-identification');
    await waitForStep(page, 4);
  }

  // ── Step 4: Identification ────────────────────────────────────────────────────
  // Wait for the identification form to be fully loaded
  await page.locator('#input-lead-name').waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(300); // Allow React to finish rendering

  const { applicant, vehicle, infraction } = caseData;

  // Fill identification fields - use direct page.fill for reliability
  await page.fill('#input-lead-name', applicant.name);
  await page.waitForTimeout(150);
  await page.fill('#input-lead-phone', applicant.phone);
  await page.waitForTimeout(150);
  await page.fill('#input-ait-number', infraction.aitNumber);
  await page.waitForTimeout(150);
  await page.fill('#input-vehicle-plate', vehicle.plate);
  await page.waitForTimeout(150);

  // Select infraction code - wait for options to be available
  await page.waitForFunction(() => {
    const sel = document.querySelector('#input-infraction-code') as HTMLSelectElement | null;
    return sel && Array.from(sel.options).some(o => o.value === '745-50');
  }, { timeout: 10000 }).catch(() => {});
  await page.selectOption('#input-infraction-code', infraction.infractionCode);
  await page.waitForTimeout(150);

  // Parse date — infraction.dateTime is YYYY-MM-DD
  const dateStr = infraction.dateTime ?? '2024-01-15';
  await page.fill('#input-datetime', dateStr);
  await page.waitForTimeout(150);

  // Location field is required for form validation (min 5 chars)
  await page.fill('#input-location', infraction.location);
  await page.waitForTimeout(300); // Allow React to process all inputs

  // ── Step 5: Specific data (test-fill if available, else manual) ──────────────
  // Check if button is enabled — if not, log state
  const nextBtn = page.locator('#btn-next-to-specifics');
  await nextBtn.waitFor({ state: 'visible', timeout: 10000 });
  const isBtnEnabled = await nextBtn.isEnabled();
  console.log('[doc-audit] Step 4: #btn-next-to-specifics enabled:', isBtnEnabled);
  if (!isBtnEnabled) {
    // Capture state for debugging
    const plateVal = await page.locator('#input-vehicle-plate').inputValue().catch(() => 'N/A');
    const nameVal = await page.locator('#input-lead-name').inputValue().catch(() => 'N/A');
    const codeVal = await page.locator('#input-infraction-code').inputValue().catch(() => 'N/A');
    console.log('[doc-audit] Step 4: plate=', plateVal, 'name=', nameVal, 'code=', codeVal);
  }
  await nextBtn.waitFor({ state: 'enabled', timeout: 10000 });
  await nextBtn.click();
  console.log('[doc-audit] Step 4: clicked #btn-next-to-specifics');
  await waitForStep(page, 5);

  // For subtypes with extra fields (lei_seca, celular, etc.),
  // use the "Preencher com dados de teste" button if available
  const testFillBtn = page.locator('button:has-text("Preencher com dados de teste")');
  if (await testFillBtn.count() > 0) {
    await testFillBtn.click();
    await page.waitForTimeout(500);
  }

  // ── Run analysis ────────────────────────────────────────────────────────────
  const runAnalysisBtn = page.locator('#btn-run-analysis');
  await runAnalysisBtn.waitFor({ state: 'visible', timeout: 10000 });
  await runAnalysisBtn.click({ force: true });

  // Wait for analysis to complete (Step 7: Diagnóstico Jurídico Gratuito)
  await expect(
    page.locator('h1:has-text("Diagnóstico Jurídico Gratuito"), h2:has-text("Diagnóstico Jurídico Gratuito"), h3:has-text("Diagnóstico Jurídico Gratuito")'),
    { timeout: 90000 }
  ).toBeVisible();

  // ── Step 7: After analysis — click "Gerar Minha Defesa" ──────────────────────
  // btn-proceed-to-document-generation advances to step 8 (qualification)
  await page.waitForTimeout(500);
  const proceedToDocBtn = page.locator('#btn-proceed-to-document-generation');
  await proceedToDocBtn.waitFor({ state: 'visible', timeout: 10000 });
  console.log('[doc-audit] Step 7: clicking proceed to document generation');
  await proceedToDocBtn.click({ force: true });
  await page.waitForTimeout(1000);

  // ── Step 8: Check step state ──────────────────────────────────────────────
  // Check what heading is visible to understand where we are
  const step8Headings = await page.locator('h1, h2, h3').allTextContents();
  console.log('[doc-audit] Step 8 headings:', step8Headings.slice(0, 5));
  const reqTestFillBtn = page.locator('button:has-text("Preencher com dados de teste")');
  console.log('[doc-audit] TestFillButton count at step 8:', await reqTestFillBtn.count());

  // ── Step 8: Fill qualification form (RequiredDataStep) ─────────────────────
  // RequiredDataStep has an admin TestFillButton that auto-fills all qualification fields.
  // This is more reliable than manual fill (especially since TEST_USERS have no cpf).
  if (await reqTestFillBtn.count() > 0) {
    console.log('[doc-audit] Step 8: clicking TestFillButton');
    await reqTestFillBtn.click();
    await page.waitForTimeout(1000);
    console.log('[doc-audit] Step 8: TestFillButton clicked');
  } else {
    // Manual fallback: fill applicant qualification fields
    console.log('[doc-audit] Step 8: TestFillButton not found, using manual fill');
    const qualFields: Array<{ id: string; value: string }> = [
      { id: '#input-applicant-name', value: applicant.name },
      { id: '#input-applicant-cpf', value: applicant.cpf },
      { id: '#input-applicant-cnh', value: applicant.cnh },
      { id: '#input-applicant-email', value: applicant.email },
      { id: '#input-applicant-phone', value: applicant.phone },
      { id: '#input-address-street', value: applicant.address || 'Rua Exemplo' },
      { id: '#input-address-number', value: '100' },
    ];
    for (const { id, value } of qualFields) {
      const input = page.locator(id);
      if (await input.count() > 0) {
        await input.fill(value);
        await page.waitForTimeout(100);
      }
    }
    // Set city/state (id is input-address-citystate, no hyphens)
    const cityInput = page.locator('#input-address-citystate, #input-address-city-state');
    if (await cityInput.count() > 0) {
      await cityInput.first().fill(applicant.cityState);
    }
  }

  // Advance from qualification → document review (step 9)
  const nextToReviewBtn = page.locator('#btn-next-to-review');
  await nextToReviewBtn.waitFor({ state: 'visible', timeout: 10000 });
  const isEnabled = await nextToReviewBtn.isEnabled();
  console.log('[doc-audit] Step 8: #btn-next-to-review enabled:', isEnabled);
  await nextToReviewBtn.waitFor({ state: 'enabled', timeout: 10000 });
  await nextToReviewBtn.click({ force: true });
  console.log('[doc-audit] Step 8: clicked #btn-next-to-review');
  await page.waitForTimeout(2000);

  // ── Step 9: Document review — advance to checkout (step 10) ─────────────────
  // The "Revisão da Petição Formal" step has a button to proceed to payment.
  // Try multiple possible selectors.
  const toPaymentBtn = page.locator(
    '#btn-proceed-to-payment, #btn-next-to-checkout, #btn-go-to-payment, button:has-text("Pagamento"), button:has-text("ir.*pagamento")'
  );
  const toPaymentCount = await toPaymentBtn.count();
  console.log('[doc-audit] Step 9: toPaymentBtn count:', toPaymentCount);
  if (toPaymentCount > 0 && await toPaymentBtn.first().isVisible()) {
    await toPaymentBtn.first().click({ force: true });
    console.log('[doc-audit] Step 9: clicked toPaymentBtn');
  } else {
    // Fallback: any button mentioning payment or checkout
    const anyBtn = page.getByRole('button').filter({ hasText: /pagamento|checkout|prosseguir/i });
    const anyBtnCount = await anyBtn.count();
    console.log('[doc-audit] Step 9: anyBtn count:', anyBtnCount);
    if (anyBtnCount > 0) {
      await anyBtn.first().click({ force: true });
      console.log('[doc-audit] Step 9: clicked anyBtn');
    }
  }
  await page.waitForTimeout(2000);

  // ── Step 10: Checkout — use admin direct-approve to bypass payment ──────────
  // All test users have role=admin, so DocumentCheckoutStep shows admin toolbar.
  // btn-admin-direct-approve → finalizeAfterPayment() → POST /api/cases/:id/generate-defense
  const adminApproveBtn = page.locator('#btn-admin-direct-approve');
  await adminApproveBtn.waitFor({ state: 'visible', timeout: 15000 });

  // Set up document capture BEFORE clicking the button
  let documentText = '';
  const routePromise = page.waitForRoute(
    (route) => route.request().url().includes('/generate-defense') && route.request().method() === 'POST',
    { timeout: 90000 }
  ).then(async (route) => {
    await route.continue();
    const response = await route.response();
    if (response && response.status() === 200) {
      try {
        const json = await response.json();
        const text = json?.defenseDraft?.fullDraftText ?? '';
        console.log('[doc-audit] routePromise captured text length:', text.length, 'status:', response.status());
        return text;
      } catch (e) {
        console.log('[doc-audit] routePromise parse error:', e);
        return '';
      }
    }
    console.log('[doc-audit] routePromise non-200 status:', response?.status());
    return '';
  }).catch((e) => {
    console.log('[doc-audit] routePromise error:', e.message);
    return '';
  });

  const responseListenerPromise = page.waitForResponse(
    (res) => res.url().includes('/generate-defense') && res.status() === 200,
    { timeout: 90000 }
  ).then(async (res) => {
    try {
      const json = await res.json();
      const text = json?.defenseDraft?.fullDraftText ?? '';
      console.log('[doc-audit] responseListener text length:', text.length, 'status:', res.status());
      return text;
    } catch (e) {
      console.log('[doc-audit] responseListener parse error:', e);
      return '';
    }
  }).catch((e) => {
    console.log('[doc-audit] responseListener error:', e.message);
    return '';
  });

  // Click admin direct approve — this triggers document generation
  console.log('[doc-audit] Clicking #btn-admin-direct-approve');
  await adminApproveBtn.click({ force: true });
  console.log('[doc-audit] Clicked, waiting for promises...');

  // Wait for either capture method
  documentText = await Promise.any([routePromise, responseListenerPromise]).catch(() => '');
  await page.waitForTimeout(500);
  console.log('[doc-audit] After promise capture, documentText length:', documentText.trim().length);

  // Fallback: if document still empty, try to extract from case detail page
  // (after payment success, wizard navigates to /cases/:id)
  if (!documentText || documentText.trim().length < 50) {
    console.log('[doc-audit] Falling back to case detail page...');
    await page.waitForURL(/\/cases\//, { timeout: 30000 }).catch(() => {});
    const currentUrl = page.url();
    console.log('[doc-audit] Current URL after nav:', currentUrl);
    await page.waitForTimeout(2000);
    // Try to get document from case detail page
    const docEls = page.locator('[data-document-text], [data-testid="document"], .document-text, pre, .prose');
    const docCount = await docEls.count();
    console.log('[doc-audit] Document elements found:', docCount);
    if (docCount > 0) {
      const txt = await docEls.first().textContent();
      console.log('[doc-audit] First doc element text length:', txt?.trim().length ?? 0);
      if (txt && txt.trim().length > 50) documentText = txt;
    }
    // Also try to read from case API response
    const caseIdMatch = currentUrl.match(/\/cases\/([a-zA-Z0-9_-]+)/);
    if (caseIdMatch) {
      const caseId = caseIdMatch[1];
      // The case API returns the case with defenseDraft
      // We can try to get it from the page context or via a direct fetch
      const caseData = await page.evaluate(async (id) => {
        const res = await fetch(`/api/cases/${id}`);
        if (res.ok) {
          const c = await res.json();
          return c?.defenseDraft?.fullDraftText ?? '';
        }
        return '';
      }, caseId);
      console.log('[doc-audit] Case API fallback returned length:', caseData?.trim().length ?? 0);
      if (caseData && caseData.trim().length > 50) documentText = caseData;
    }
  }

  console.log('[doc-audit] Final documentText length:', documentText.trim().length);

  const durationMs = Date.now() - startTime;
  return { documentText, durationMs };
}

// ─── Matrix generation ────────────────────────────────────────────────────────

const MATRIX = generateMatrix();
const MATRIX_COUNT = countMatrix();

// Log matrix summary at start of suite
console.log(`[doc-audit] Matrix: ${MATRIX_COUNT.combinations} subtypes × ${CASES_PER_SUBTYPE} = ${MATRIX_COUNT.totalCases} cases`);
console.log('[doc-audit] Per procedure:', JSON.stringify(MATRIX_COUNT.byProcedure));

// ─── Test suite ───────────────────────────────────────────────────────────────

test.describe('Document Audit — Full Matrix', () => {
  // One test per case, running serially
  // Using test.extend pattern to generate tests dynamically from the matrix

  for (let i = 0; i < MATRIX.length; i++) {
    const caseData = MATRIX[i];

    // Pilot mode: only run first case of each subtype
    if (PILOT_MODE === 'true' && caseData.caseIndex > 0) continue;

    const testName = `AUDIT ${caseData.auditId} [${caseData.procedureType}/${caseData.category}]`;

    test(testName, async ({ page }) => {
      const startedAt = Date.now();

      // ── 1. Run wizard and capture document ─────────────────────────────────
      let documentText = '';
      let durationMs = 0;
      let wizardError: Error | null = null;

      try {
        const result = await runCaseWizard(page, caseData, i);
        documentText = result.documentText;
        durationMs = result.durationMs;
      } catch (err) {
        wizardError = err instanceof Error ? err : new Error(String(err));
        // Try to recover document text even on wizard error
        documentText = '';
      }

      // ── 2. Quality assessment ─────────────────────────────────────────────
      const qualityResult = assessDocumentQuality(documentText, caseData, MATRIX);

      // ── 3. Persist to Supabase ────────────────────────────────────────────
      const runId = caseData.runWatermark.replace('AUDIT-2026-', '');
      await saveAuditResult(runId, caseData, qualityResult, durationMs);

      // ── 4. Assertions ──────────────────────────────────────────────────────
      const p0Failures = qualityResult.failures.filter((f) => f.severity === 'P0');

      // Document must not be empty
      expect(documentText.trim().length, 'Document must not be empty').toBeGreaterThan(100);

      // No P0 failures
      expect(p0Failures.length, `P0 failures: ${p0Failures.map((f) => f.check).join(', ')}`).toBe(0);

      // Overall score ≥ 60
      expect(qualityResult.scores.overall, `Overall score too low: ${qualityResult.scores.overall}%`).toBeGreaterThanOrEqual(60);

      // Score log for CI output
      console.log(`[doc-audit] ${caseData.auditId} → overall=${qualityResult.scores.overall}% ` +
        `identity=${qualityResult.scores.identity}% ` +
        `dataFidelity=${qualityResult.scores.dataFidelity}% ` +
        `procedureFit=${qualityResult.scores.procedureFit}% ` +
        `structure=${qualityResult.scores.structure}% ` +
        `placeholders=${qualityResult.scores.placeholders}% ` +
        `xContam=${qualityResult.scores.crossContamination}% ` +
        `${p0Failures.length === 0 ? '✅ PASS' : '❌ FAIL: ' + p0Failures.map((f) => f.check).join(', ')}`
      );

      if (wizardError) {
        console.warn(`[doc-audit] Wizard error for ${caseData.auditId}: ${wizardError.message}`);
      }
    });
  }
});
