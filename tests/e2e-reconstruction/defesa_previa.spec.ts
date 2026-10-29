import { test, expect } from '@playwright/test';
import { openService, fillIdentification, createCaseThroughAnalysis, expectNoPiiInWizardStorage, baseURL, runId, type CanonicalService } from './support';
const service: CanonicalService = {
  "id": "defesa_previa",
  "situationId": "multa_transito",
  "stageId": "primeira_notificacao",
  "categoryId": "excesso_velocidade",
  "procedure": "defesa_previa"
};
test.describe('defesa_previa — dez cenários canônicos', () => {
  test('E2E-DEFESA_PREVIA-01 caminho válido: abre a identificação do serviço', async ({page}) => {
    await openService(page, service);
    await expect(page.locator('#input-lead-name')).toBeVisible();
    await expect(page.locator('#input-lead-phone')).toBeVisible();
    await expect(page.locator('#input-vehicle-plate')).toBeVisible();
  });

  test('E2E-DEFESA_PREVIA-02 obrigatórios: impede avanço sem nome e telefone', async ({page}) => {
    await openService(page, service);
    await expect(page.locator('#btn-next-to-specifics')).toBeDisabled();
    await expect(page.locator('#input-lead-name')).toHaveValue('');
    await expect(page.locator('#input-lead-phone')).toHaveValue('');
  });

  test('E2E-DEFESA_PREVIA-03 inválidos: placa curta não libera avanço', async ({page}) => {
    await openService(page, service);
    await fillIdentification(page, 'placa-invalida', { plate: 'ABC' });
    await expect(page.locator('#btn-next-to-specifics')).toBeDisabled();
  });

  test('E2E-DEFESA_PREVIA-04 intake: cria caso pela análise e confere serviço persistido', async ({page}) => {
    await openService(page, service);
    const created = await createCaseThroughAnalysis(page, 'intake', service);
    expect(created.id).not.toBe('');
    expect(created.body.serviceType).toBe(service.procedure);
  });

  test('E2E-DEFESA_PREVIA-05 segurança de recuperação: token de claim inválido é recusado', async ({page}) => {
    await openService(page, service);
    const created = await createCaseThroughAnalysis(page, 'claim-security', service);
    const invalid = await page.request.post(new URL('/api/cases/anonymous/' + encodeURIComponent(created.id) + '/recover', baseURL).toString(), {
      data: { claimToken: 'invalid-e2e-claim-token' }, headers: { 'content-type': 'application/json' },
    });
    expect([403, 404]).toContain(invalid.status());
    expect(await invalid.text()).not.toContain(String(created.body.claimToken || 'never-match'));
    // Handoff de identidade: sem autenticação, o wizard exige login antes de vincular o caso.
    await page.locator('#btn-proceed-to-document-generation').click();
    await expect(page.getByText('Acesso à Sua Defesa Jurídica')).toBeVisible();
    // O caso permanece anônimo e recuperável apenas pelo token original.
    const still = await page.request.post(new URL('/api/cases/anonymous/' + encodeURIComponent(created.id) + '/recover', baseURL).toString(), {
      data: { claimToken: created.body.claimToken }, headers: { 'content-type': 'application/json' },
    });
    expect(still.status()).toBe(200);
    expect((await still.json()).case.id).toBe(created.id);
  });

  test('E2E-DEFESA_PREVIA-06 persistência: reload não cria um segundo caso', async ({page}) => {
    await openService(page, service);
    const created = await createCaseThroughAnalysis(page, 'reload-persistence', service);
    const duplicateCreates: string[] = [];
    page.on('request', request => {
      if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/cases/anonymous') duplicateCreates.push(request.url());
    });
    await page.reload();
    await expect(page.getByText(/Diagnóstico Preliminar Concluído/)).toBeVisible();
    const recoveredResponse = await page.request.post(new URL('/api/cases/anonymous/' + encodeURIComponent(created.id) + '/recover', baseURL).toString(), {
      data: { claimToken: created.body.claimToken }, headers: { 'content-type': 'application/json' },
    });
    expect(recoveredResponse.status()).toBe(200);
    const recovered = await recoveredResponse.json();
    expect(recovered.case.id).toBe(created.id);
    expect(recovered.case.serviceType).toBe(service.procedure);
    expect(recovered.case.claimToken).toBeUndefined();
    expect(duplicateCreates).toHaveLength(0);
  });

  test('E2E-DEFESA_PREVIA-07 análise: resultado contém procedimento esperado', async ({page}) => {
    await openService(page, service);
    const created = await createCaseThroughAnalysis(page, 'analysis-oracle', service);
    expect(created.body.analysis).toBeTruthy();
    expect(created.body.analysis.recommendedProcedure ?? created.body.serviceType).toBe(service.procedure);
  });

  test('E2E-DEFESA_PREVIA-08 documento e integridade: exige identidade antes da qualificação documental', async ({page}) => {
    await openService(page, service);
    const created = await createCaseThroughAnalysis(page, 'document-review', service);
    await expectNoPiiInWizardStorage(page);
    await page.locator('#btn-proceed-to-document-generation').click();
    await expect(page.getByText('Acesso à Sua Defesa Jurídica')).toBeVisible();
    // Sem login não há claim: o caso segue anônimo e a qualificação documental não é liberada.
    const recovered = await page.request.post(new URL('/api/cases/anonymous/' + encodeURIComponent(created.id) + '/recover', baseURL).toString(), {
      data: { claimToken: created.body.claimToken }, headers: { 'content-type': 'application/json' },
    });
    expect(recovered.status()).toBe(200);
    expect((await recovered.json()).case.isAnonymous).toBe(true);
  });

  test('E2E-DEFESA_PREVIA-09 pagamento seguro: cobrança exige identidade autenticada', async ({page}) => {
    await openService(page, service);
    const created = await createCaseThroughAnalysis(page, 'payment-safe', service);
    const response = await page.request.post(new URL('/api/payments/pix/create', baseURL).toString(), {
      data: { caseId: created.id, serviceType: service.procedure },
      headers: { 'content-type': 'application/json' },
    });
    expect(response.status()).toBe(401);
    expect(await response.text()).toMatch(/UNAUTHENTICATED|N.o autenticado/);
    // Nenhuma transação foi enviada: sem token válido a cobrança falha antes do gateway.
  });

  test('E2E-DEFESA_PREVIA-10 etapa 5: avança com INMETRO vazio e com todos os dados', async ({page}) => {
    await openService(page, service);
    await fillIdentification(page, 'step5-inmetro-optional');
    await page.locator('#btn-next-to-specifics').click();
    await expect(page.getByText('Perguntas configuradas para este tipo de autuação')).toBeVisible();

    // Intercepta somente a gravação final para não criar casos reais no ambiente E2E.
    const submittedPayloads: any[] = [];
    let submission = 0;
    await page.route('**/api/cases/anonymous', async route => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      submittedPayloads.push(route.request().postDataJSON());
      submission += 1;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'e2e-step5-case-' + submission,
          claimToken: 'e2e-step5-claim-' + submission,
        }),
      });
    });

    // Cenário A: velocidades informadas, campos opcionais do INMETRO vazios.
    await page.locator('#input-speed-limit').fill('60');
    await page.locator('#input-measured-speed').fill('73');
    await expect(page.locator('#input-considered-speed')).not.toHaveValue('');
    await expect(page.locator('#input-inmetro-date')).toHaveValue('');
    await expect(page.locator('#input-radar-equipment-id')).toHaveValue('');
    await page.locator('#btn-run-analysis').click();
    await expect(page.getByText(/Diagnóstico Preliminar Concluído/)).toBeVisible({ timeout: 15_000 });
    expect(submittedPayloads).toHaveLength(1);
    expect(submittedPayloads[0].infraction.inmetroAferitionDate ?? '').toBe('');
    expect(submittedPayloads[0].infraction.radarEquipmentId ?? '').toBe('');

    // Volta à etapa 5 e confirma que o formulário continua editável.
    await page.getByRole('button', { name: /Voltar e corrigir dados/i }).click();
    await expect(page.locator('#input-inmetro-date')).toBeVisible();
    await page.locator('#input-inmetro-date').fill('2023-05-15');
    await page.locator('#input-radar-equipment-id').fill('RADAR-12345');
    await expect(page.locator('#input-speed-limit')).toHaveValue('60');
    await expect(page.locator('#input-measured-speed')).toHaveValue('73');
    await expect(page.locator('#input-considered-speed')).not.toHaveValue('');

    // Cenário B: todos os campos preenchidos, incluindo data e identificação do INMETRO.
    await page.locator('#btn-run-analysis').click();
    await expect(page.getByText(/Diagnóstico Preliminar Concluído/)).toBeVisible({ timeout: 15_000 });
    expect(submittedPayloads).toHaveLength(2);
    expect(submittedPayloads[1].infraction.inmetroAferitionDate).toBe('2023-05-15');
    expect(submittedPayloads[1].infraction.radarEquipmentId).toBe('RADAR-12345');
  });
});
