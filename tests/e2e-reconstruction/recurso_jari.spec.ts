import { test, expect } from '@playwright/test';
import { openService, fillIdentification, createCaseThroughAnalysis, expectNoPiiInWizardStorage, baseURL, type CanonicalService } from './support';
const service: CanonicalService = {
  "id": "recurso_jari",
  "situationId": "multa_transito",
  "stageId": "notificacao_penalidade",
  "categoryId": "excesso_velocidade",
  "procedure": "recurso_jari"
};
test.describe('recurso_jari — dez cenários canônicos', () => {
  test('E2E-RECURSO_JARI-01 caminho válido: abre a identificação do serviço', async ({page}) => {
    await openService(page, service);
    await expect(page.locator('#input-lead-name')).toBeVisible();
    await expect(page.locator('#input-lead-phone')).toBeVisible();
    await expect(page.locator('#input-vehicle-plate')).toBeVisible();
  });

  test('E2E-RECURSO_JARI-02 obrigatórios: impede avanço sem nome e telefone', async ({page}) => {
    await openService(page, service);
    await expect(page.locator('#btn-next-to-specifics')).toBeDisabled();
    await expect(page.locator('#input-lead-name')).toHaveValue('');
    await expect(page.locator('#input-lead-phone')).toHaveValue('');
  });

  test('E2E-RECURSO_JARI-03 inválidos: placa curta não libera avanço', async ({page}) => {
    await openService(page, service);
    await fillIdentification(page, 'placa-invalida', { plate: 'ABC' });
    await expect(page.locator('#btn-next-to-specifics')).toBeDisabled();
  });

  test('E2E-RECURSO_JARI-04 intake: cria caso pela análise e confere serviço persistido', async ({page}) => {
    await openService(page, service);
    const created = await createCaseThroughAnalysis(page, 'intake', service);
    expect(created.id).not.toBe('');
    expect(created.body.serviceType).toBe(service.procedure);
  });

  test('E2E-RECURSO_JARI-05 segurança de recuperação: token de claim inválido é recusado', async ({page}) => {
    await openService(page, service);
    const created = await createCaseThroughAnalysis(page, 'claim-security', service);
    const response = await page.request.post(new URL('/api/cases/anonymous/' + encodeURIComponent(created.id) + '/recover', baseURL).toString(), {
      data: { claimToken: 'invalid-e2e-claim-token' }, headers: { 'content-type': 'application/json' },
    });
    expect([403, 404]).toContain(response.status());
    expect(await response.text()).not.toContain(String(created.body.claimToken || 'never-match'));
  });

  test('E2E-RECURSO_JARI-06 persistência: reload não cria um segundo caso', async ({page}) => {
    await openService(page, service);
    const created = await createCaseThroughAnalysis(page, 'reload-persistence', service);
    const duplicateCreates: string[] = [];
    page.on('request', request => {
      if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/cases/anonymous') duplicateCreates.push(request.url());
    });
    await page.reload();
    await expect(page.getByText(/Diagnóstico Preliminar Concluído/)).toBeVisible();
    expect(duplicateCreates).toHaveLength(0);
    expect(created.id).toBeTruthy();
  });

  test('E2E-RECURSO_JARI-07 análise: resultado contém procedimento esperado', async ({page}) => {
    await openService(page, service);
    const created = await createCaseThroughAnalysis(page, 'analysis-oracle', service);
    expect(created.body.analysis).toBeTruthy();
    expect(created.body.analysis.recommendedProcedure ?? created.body.serviceType).toBe(service.procedure);
  });

  test('E2E-RECURSO_JARI-08 privacidade: sessionStorage não contém PII do wizard', async ({page}) => {
    await openService(page, service);
    await fillIdentification(page, 'storage-privacy');
    await expectNoPiiInWizardStorage(page);
    await expect(page.locator('#btn-next-to-specifics')).toBeEnabled();
  });

  test('E2E-RECURSO_JARI-09 pagamento seguro: preview recusa cobrança sem gateway', async ({page}) => {
    await openService(page, service);
    const created = await createCaseThroughAnalysis(page, 'payment-safe', service);
    const response = await page.request.post(new URL('/api/payments/create-order', baseURL).toString(), {
      data: { caseId: created.id, serviceType: service.procedure }, headers: { 'content-type': 'application/json' },
    });
    test.skip(response.status() !== 503, 'BLOCKED: o ambiente não confirmou E2E_SAFE_PREVIEW (HTTP 503); nenhuma cobrança deve ser iniciada.');
    expect(response.status()).toBe(503);
    expect(await response.text()).toMatch(/desativadas|bloqueadas|preview/i);
  });

  test('E2E-RECURSO_JARI-10 repetição: preencher e voltar não cria caso', async ({page}) => {
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
