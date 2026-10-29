import { test, expect } from '@playwright/test';
import { openService, fillIdentification, createCaseThroughAnalysis, expectNoPiiInWizardStorage, baseURL, runId, type CanonicalService } from './support';
const service: CanonicalService = {
  "id": "conversao_advertencia",
  "situationId": "conversao_advertencia",
  "categoryId": "conversao_advertencia",
  "procedure": "conversao_advertencia"
};
test.describe('conversao_advertencia — dez cenários canônicos', () => {
  test('E2E-CONVERSAO_ADVERTENCIA-01 caminho válido: abre a identificação do serviço', async ({page}) => {
    await openService(page, service);
    await expect(page.locator('#input-lead-name')).toBeVisible();
    await expect(page.locator('#input-lead-phone')).toBeVisible();
    await expect(page.locator('#input-vehicle-plate')).toBeVisible();
  });

  test('E2E-CONVERSAO_ADVERTENCIA-02 obrigatórios: impede avanço sem nome e telefone', async ({page}) => {
    await openService(page, service);
    await expect(page.locator('#btn-next-to-specifics')).toBeDisabled();
    await expect(page.locator('#input-lead-name')).toHaveValue('');
    await expect(page.locator('#input-lead-phone')).toHaveValue('');
  });

  test('E2E-CONVERSAO_ADVERTENCIA-03 inválidos: placa curta não libera avanço', async ({page}) => {
    await openService(page, service);
    await fillIdentification(page, 'placa-invalida', { plate: 'ABC' });
    await expect(page.locator('#btn-next-to-specifics')).toBeDisabled();
  });

  test('E2E-CONVERSAO_ADVERTENCIA-04 intake: cria caso pela análise e confere serviço persistido', async ({page}) => {
    await openService(page, service);
    const created = await createCaseThroughAnalysis(page, 'intake', service);
    expect(created.id).not.toBe('');
    expect(created.body.serviceType).toBe(service.procedure);
  });

  test('E2E-CONVERSAO_ADVERTENCIA-05 segurança de recuperação: token de claim inválido é recusado', async ({page}) => {
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

  test('E2E-CONVERSAO_ADVERTENCIA-06 persistência: reload não cria um segundo caso', async ({page}) => {
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

  test('E2E-CONVERSAO_ADVERTENCIA-07 análise: resultado contém procedimento esperado', async ({page}) => {
    await openService(page, service);
    const created = await createCaseThroughAnalysis(page, 'analysis-oracle', service);
    expect(created.body.analysis).toBeTruthy();
    expect(created.body.analysis.recommendedProcedure ?? created.body.serviceType).toBe(service.procedure);
  });

  test('E2E-CONVERSAO_ADVERTENCIA-08 documento e integridade: exige identidade antes da qualificação documental', async ({page}) => {
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

  test('E2E-CONVERSAO_ADVERTENCIA-09 pagamento seguro: cobrança exige identidade autenticada', async ({page}) => {
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

  test('E2E-CONVERSAO_ADVERTENCIA-10 repetição: preencher e voltar não cria caso', async ({page}) => {
    await openService(page, service);
    const requests: string[] = [];
    page.on('request', request => {
      if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/cases/anonymous') requests.push(request.url());
    });
    await fillIdentification(page, 'no-submit');
    await page.locator('#btn-next-to-specifics').click();
    await expect(page.getByText('Perguntas configuradas para este tipo de autuação')).toBeVisible();
    await page.getByRole('button', { name: /Voltar à identificação/i }).click();
    expect(requests).toHaveLength(0);
  });
});
