import { test, expect, type APIRequestContext } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://adeusmulta.defesai.com.br';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RUN_ID = (process.env.E2E_RUN_ID || `onboarding-wizard-${Date.now()}`).replace(/[^A-Za-z0-9-]/g, '-').slice(0, 35);
const AIT = `E2E-WIZARD-${RUN_ID}`.slice(0, 80);
let createdCaseId: string | undefined;
let cleanupReport: Record<string, unknown> = { status: 'NOT_STARTED' };

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function supabaseRows(request: APIRequestContext, table: string, filter: string) {
  const response = await request.get(
    `${required('SUPABASE_URL', SUPABASE_URL)}/rest/v1/${table}?select=*&${filter}`,
    { headers: {
      apikey: required('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY),
      Authorization: `Bearer ${required('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY)}`,
      'User-Agent': 'AdeusMultas-E2E/1.0 (onboarding-wizard-reconciliation)',
    } },
  );
  expect(response.ok(), `${table} query failed: HTTP ${response.status()}`).toBeTruthy();
  return response.json() as Promise<Record<string, any>[]>;
}

test.describe.configure({ retries: 0 });

test.afterEach(async ({ request }) => {
  const byAit = await supabaseRows(request, 'cases', `ait_number=eq.${encodeURIComponent(AIT)}`);
  if (byAit.length === 0) {
    cleanupReport = { status: 'NO_RESIDUE_VERIFIED', runId: RUN_ID, ait: AIT };
    console.log(`[E2E cleanup] ${JSON.stringify(cleanupReport)}`);
    createdCaseId = undefined;
    return;
  }
  if (byAit.length !== 1) {
    cleanupReport = { status: 'REFUSED_MULTIPLE_MATCHES', runId: RUN_ID, ait: AIT, matches: byAit.length };
    console.error(`[E2E cleanup] ${JSON.stringify(cleanupReport)}`);
    throw new Error(`Cleanup refused: expected at most one run-owned AIT ${AIT}, found ${byAit.length} rows.`);
  }

  const row = byAit[0];
  const canonicalId = typeof row.id === 'string' ? row.id : '';
  const key = required('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY);
  if (!canonicalId
    || (createdCaseId && row.id !== createdCaseId)
    || row.ait_number !== AIT
    || row.user_id != null
    || row.is_anonymous !== true
    || row.is_paid === true) {
    cleanupReport = { status: 'REFUSED_IDENTITY_OR_STATE_MISMATCH', runId: RUN_ID, caseId: row.id, expectedCaseId: createdCaseId, ait: AIT, row };
    console.error(`[E2E cleanup] ${JSON.stringify(cleanupReport)}`);
    throw new Error(`Cleanup refused: AIT ${AIT} no longer matches this run's anonymous, unpaid case identity.`);
  }

  const response = await request.delete(
    `${required('SUPABASE_URL', SUPABASE_URL)}/rest/v1/cases?id=eq.${encodeURIComponent(canonicalId)}&ait_number=eq.${encodeURIComponent(AIT)}&is_anonymous=eq.true&user_id=is.null&is_paid=eq.false`,
    { headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'return=representation',
      'User-Agent': 'AdeusMultas-E2E/1.0 (identity-checked cleanup)',
    } },
  );
  expect(response.ok(), `Cleanup failed: HTTP ${response.status()}`).toBeTruthy();
  const deleted = await response.json() as Record<string, unknown>[];
  expect(deleted.length, 'cleanup must delete exactly the case created by this run').toBe(1);

  const remaining = await supabaseRows(request, 'cases', `id=eq.${encodeURIComponent(canonicalId)}`);
  expect(remaining, 'deleted case must be absent after cleanup').toHaveLength(0);
  cleanupReport = { status: 'DELETED_AND_VERIFIED', runId: RUN_ID, caseId: canonicalId, deletedRows: deleted.length, remainingRows: 0 };
  console.log(`[E2E cleanup] ${JSON.stringify(cleanupReport)}`);
  createdCaseId = undefined;
});

test('novo onboarding guiado em produção → análise gratuita concluída → persistência reconciliada → parada segura antes de autenticação/pagamento', async ({ page, request, context }) => {
  test.setTimeout(90_000);
  const baseUrl = required('PLAYWRIGHT_BASE_URL', BASE_URL);
  expect(baseUrl).toBe('https://adeusmulta.defesai.com.br');

  await context.clearCookies();
  await page.goto('/novo-caso', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });

  // This checkpoint confirms the new guided onboarding (OnboardingWizard) has reached production.
  // Do not fall back to the legacy /novo-caso wizard.
  await expect(
    page.getByRole('heading', { name: 'Qual situação você quer resolver?' }),
    'Production does not serve the new guided onboarding at /novo-caso; no case was created.',
  ).toBeVisible({ timeout: 10_000 });

  // ============================================================
  // Stage 1: Seleção da Situação (Step 1 do wizard)
  // ============================================================
  // "Multa de Trânsito" é a situação mais completa, passando por todas as etapas.
  // Outros cenários: conversao_advertencia (pula etapas 2/3), indicacao_condutor (pula 2/3),
  // suspensao_cnh/cassacao_cnh (campos específicos).
  await page.getByRole('button', { name: 'Multa de Trânsito' }).click();

  // After selecting multa_transito: no inferredStage → advances to step 2 (stage selection)
  // OU pode precisar clicar em "Continuar" dependendo do componente. Verificar se avançou.
  await expect(
    page.getByRole('heading', { name: '2. Fase do Processo' }),
    'Stage selection step not reached after situation select.',
    { timeout: 5_000 }
  ).toBeVisible();

  // ============================================================
  // Stage 2: Seleção da Fase Processual (Step 2)
  // ============================================================
  // Selecionar "primeira_notificacao" para defesa preliminar
  await page.getByRole('button', { name: 'Recebi a primeira notificação (Sem boleto)' }).click();

  // Avança para step 3 (categoria da infração)
  await expect(
    page.getByRole('heading', { name: '3. Tipo da Infração' }),
    'Infraction category step not reached after stage select.',
    { timeout: 5_000 }
  ).toBeVisible();

  // ============================================================
  // Stage 3: Seleção da Categoria da Infração (Step 3)
  // ============================================================
  // Selecionar "excesso_velocidade" - a mais comum
  await page.getByRole('button', { name: 'Velocidade / Radar' }).click();

  // Avança para step 4 (identificação da autuação)
  await expect(
    page.getByRole('heading', { name: '4. Identificação da Autuação & Veículo' }),
    'Infraction identification step not reached after category select.',
    { timeout: 5_000 }
  ).toBeVisible();

  // ============================================================
  // Stage 4: Identificação da Autuação (Step 4)
  // ============================================================
  // Preencher dados sintéticos válidos
  const testAIT = `AIT-${RUN_ID}`;
  await page.getByLabel(/Número do auto de infração \(AIT\)/).fill(testAIT);
  await page.getByLabel('Placa do veículo').fill('E2E1A23');
  await page.getByLabel('Órgão autuador').fill('DETRAN-SP');
  await page.getByLabel('Local da infração').fill('Av. Paulista, 1000 - São Paulo/SP');

  // Selecionar código da infração no catálogo (745-50 = excesso_velocidade)
  await page.locator('#input-infraction-code').selectOption('745-50');

  // Preencher data da ocorrência, data de expedição e prazo de defesa
  await page.getByLabel('Data da Ocorrência').fill('2026-10-01');
  await page.getByLabel('Data de Expedição da Notificação').fill('2026-10-01');
  await page.getByLabel('Prazo Final p/ Defesa').fill('2026-10-30');

  // Avançar para próxima etapa (SpecificInfractionDataStep)
  await page.getByRole('button', { name: 'Continuar para Perguntas do Caso' }).click();

  // ============================================================
  // Stage 5: Dados Específicos do Caso (Step 5)
  // ============================================================
  // Pode haver botão de "Preencher com dados de teste" ou campos de lead
  // Verificar se o passo avançou ou se há interação necessária
  await expect(
    page.getByRole('heading', { name: '5. Perguntas Específicas do Seu Caso' }),
    'Specific infraction data step not reached.',
    { timeout: 5_000 }
  ).toBeVisible();

  // Clicar no botão de preenchimento de teste (se disponível) ou prosseguir
  const testFillExists = await page.getByRole('button', { name: 'Preencher com dados de teste' }).isVisible();
  if (testFillExists) {
    await page.getByRole('button', { name: 'Preencher com dados de teste' }).click();
  }

  // Prosseguir para a análise
  await page.getByRole('button', { name: 'Continuar para Análise Jurídica' }).click();

  // ============================================================
  // Stage 6: Processamento da Análise Jurídica (Step 6)
  // ============================================================
  // O AnalysisProcessingStep executa o ExpertRuleEngine com estágios cronometrados.
  // Espere os estágios concluírem e o resultado aparecer.
  await expect(
    page.getByRole('heading', { name: 'Diagnóstico Preliminar Concluído' }),
    'Analysis processing step not reached or timed out.',
    { timeout: 30_000 }
  ).toBeVisible();

  // ============================================================
  // Stage 7: Resultado da Análise Gratuita (Step 7 - FreeAnalysisResultStep)
  // ============================================================
  // Verificar que o diagnóstico foi exibido com sucesso
  await expect(
    page.getByRole('heading', { name: 'Diagnóstico Jurídico Gratuito Concluído' }),
    'Free analysis result step not displayed.',
    { timeout: 10_000 }
  ).toBeVisible();

  // Verificar probabilidade de sucesso e teses jurídicas
  await expect(
    page.getByText('Probabilidade de Êxito'),
    'Success rate not displayed in analysis result.',
    { timeout: 5_000 }
  ).toBeVisible();

  // Verificar que o caso foi persistido no Supabase
  // O handleAnalysisComplete faz POST /api/cases/anonymous e retorna case ID + claimToken
  await expect(
    page.getByText(testAIT),
    `Test AIT ${testAIT} not found in UI after analysis.`,
    { timeout: 5_000 }
  ).toBeVisible();

  // Verificar sessionStorage persistence
  const storedCaseId = await page.evaluate(() => sessionStorage.getItem('defesai_wizard_state'));
  expect(storedCaseId).not.toBeNull();
  const parsedState = JSON.parse(storedCaseId!);
  expect(parsedState.step).toBe(7);

  // Verificar persistência no banco de dados (Supabase)
  // O caso deve ter sido criado com is_anonymous=true, user_id=null
  const rows = await supabaseRows(request, 'cases', `ait_number=eq.${encodeURIComponent(testAIT)}`);
  expect(rows, `exactly one row matching the synthetic AIT ${testAIT} must exist in Supabase`).toHaveLength(1);
  expect(rows[0].id).toBeDefined();
  expect(rows[0].ait_number).toBe(testAIT);
  expect(rows[0].user_id).toBeFalsy();
  expect(rows[0].is_anonymous).toBe(true);
  expect(rows[0].is_paid).toBe(false);
  expect(rows[0].service_type).toBe('defesa_previa'); // mappedProcedure de multa_transito = recurso_jari, mas o backend pode normalizar
  expect(rows[0].vehicle_plate).toBe('E2E1A23');

  // Confirmar que nenhum order de pagamento foi criado antes de autenticação/explicit purchase
  const orders = await supabaseRows(request, 'payment_orders', `case_id=eq.${encodeURIComponent(rows[0].id)}`);
  expect(orders, 'no payment order may be created before authentication and explicit purchase').toHaveLength(0);

  // Verificar heading "Próxima etapa: vincular à sua conta" ou equivalente
  // Para casos anônimos, após análise concluída, o wizard pode avançar para a auth gate ou finalizar
  // Verificar estado atual do wizard
  const finalStep = await page.evaluate(() => {
    // O step state pode estar em sessionStorage ou estado React
    const storage = sessionStorage.getItem('defesai_wizard_state');
    if (storage) {
      return JSON.parse(storage).step;
    }
    // fallback: ler do DOM se exposto
    return undefined;
  });

  console.log(`[E2E] OnboardingWizard test completed. Final step state: ${finalStep}`);

  // Registrar evidências completas para identificar em qual etapa ocorreu uma falha
  cleanupReport = { 
    status: 'TEST_COMPLETED', 
    runId: RUN_ID, 
    ait: AIT, 
    finalStep: finalStep,
    caseId: rows[0].id,
    serviceType: rows[0].service_type,
    vehiclePlate: rows[0].vehicle_plate
  };
  console.log(`[E2E] ${JSON.stringify(cleanupReport)}`);
});