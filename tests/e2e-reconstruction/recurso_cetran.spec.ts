import { test, expect } from '@playwright/test';
import { openService, fillIdentification, createCaseThroughAnalysis, expectNoPiiInWizardStorage, baseURL, type CanonicalService } from './support';
const service: CanonicalService = {
  "id": "recurso_cetran",
  "situationId": "multa_transito",
  "stageId": "recurso_jari_negado",
  "categoryId": "excesso_velocidade",
  "procedure": "recurso_cetran"
};
test.describe('recurso_cetran — dez cenários canônicos', () => {
  test('E2E-RECURSO_CETRAN-01 caminho válido: abre a identificação do serviço', async ({page}) => {
    await openService(page, service);
    await expect(page.locator('#input-lead-name')).toBeVisible();
    await expect(page.locator('#input-lead-phone')).toBeVisible();
    await expect(page.locator('#input-vehicle-plate')).toBeVisible();
  });

  test('E2E-RECURSO_CETRAN-02 obrigatórios: impede avanço sem nome e telefone', async ({page}) => {
    await openService(page, service);
    await expect(page.locator('#btn-next-to-specifics')).toBeDisabled();
    await expect(page.locator('#input-lead-name')).toHaveValue('');
    await expect(page.locator('#input-lead-phone')).toHaveValue('');
  });

  test('E2E-RECURSO_CETRAN-03 inválidos: placa curta não libera avanço', async ({page}) => {
    await openService(page, service);
    await fillIdentification(page, 'placa-invalida', { plate: 'ABC' });
    await expect(page.locator('#btn-next-to-specifics')).toBeDisabled();
  });

  test('E2E-RECURSO_CETRAN-04 intake: cria caso pela análise e confere serviço persistido', async ({page}) => {
    await openService(page, service);
    const created = await createCaseThroughAnalysis(page, 'intake', service);
    expect(created.id).not.toBe('');
    expect(created.body.serviceType).toBe(service.procedure);
  });

  test('E2E-RECURSO_CETRAN-05 segurança de recuperação: token de claim inválido é recusado', async ({page}) => {
    await openService(page, service);
    test.skip(!process.env.E2E_AUTH_EMAIL || !process.env.E2E_AUTH_PASSWORD, 'BLOCKED: credenciais de uma identidade sintética autorizada são necessárias para testar o handoff de autenticação.');
    const created = await createCaseThroughAnalysis(page, 'claim-security', service);
    const invalid = await page.request.post(new URL('/api/cases/anonymous/' + encodeURIComponent(created.id) + '/recover', baseURL).toString(), {
      data: { claimToken: 'invalid-e2e-claim-token' }, headers: { 'content-type': 'application/json' },
    });
    expect([403, 404]).toContain(invalid.status());
    expect(await invalid.text()).not.toContain(String(created.body.claimToken || 'never-match'));
    await page.locator('#btn-proceed-to-document-generation').click();
    await expect(page.getByText('Acesso à Sua Defesa Jurídica')).toBeVisible();
    await page.getByRole('button', { name: /Já Tenho Conta/i }).click();
    await page.getByPlaceholder('motorista@defesai.com.br').fill(process.env.E2E_AUTH_EMAIL!);
    await page.getByPlaceholder('••••••••').fill(process.env.E2E_AUTH_PASSWORD!);
    const claimPromise = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/cases/' + created.id + '/claim');
    await page.getByRole('button', { name: /Entrar & Vincular Defesa à Minha Conta/i }).click();
    const claim = await claimPromise;
    expect(claim.status()).toBe(200);
    const claimed = await claim.json();
    expect(claimed.id).toBe(created.id);
    expect(claimed.isAnonymous).toBe(false);
    expect(claimed.userId).toBeTruthy();
    expect(claimed.serviceType).toBe(service.procedure);
  });

  test('E2E-RECURSO_CETRAN-06 persistência: reload não cria um segundo caso', async ({page}) => {
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

  test('E2E-RECURSO_CETRAN-07 análise: resultado contém procedimento esperado', async ({page}) => {
    await openService(page, service);
    const created = await createCaseThroughAnalysis(page, 'analysis-oracle', service);
    expect(created.body.analysis).toBeTruthy();
    expect(created.body.analysis.recommendedProcedure ?? created.body.serviceType).toBe(service.procedure);
  });

  test('E2E-RECURSO_CETRAN-08 documento e integridade: dados sintéticos chegam à revisão', async ({page}) => {
    test.skip(!process.env.E2E_AUTH_EMAIL || !process.env.E2E_AUTH_PASSWORD, 'BLOCKED: exige identidade sintética autorizada para abrir a qualificação documental.');
    await openService(page, service);
    const created = await createCaseThroughAnalysis(page, 'document-review', service);
    await expectNoPiiInWizardStorage(page);
    await page.locator('#btn-proceed-to-document-generation').click();
    await expect(page.getByText('Acesso à Sua Defesa Jurídica')).toBeVisible();
    await page.getByRole('button', { name: /Já Tenho Conta/i }).click();
    await page.getByPlaceholder('motorista@defesai.com.br').fill(process.env.E2E_AUTH_EMAIL!);
    await page.getByPlaceholder('••••••••').fill(process.env.E2E_AUTH_PASSWORD!);
    const claimPromise = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/cases/' + created.id + '/claim');
    await page.getByRole('button', { name: /Entrar & Vincular Defesa à Minha Conta/i }).click();
    expect((await claimPromise).status()).toBe(200);
    await expect(page.locator('#input-applicant-name')).toBeVisible();
    await page.locator('#input-applicant-name').fill(created.input.name);
    await page.locator('#input-applicant-cpf').fill('52998224725');
    await page.locator('#input-applicant-cnh').fill('E2E-CNH-' + runId);
    await page.locator('#input-applicant-email').fill('e2e-' + runId + '@example.com');
    await page.locator('#input-applicant-phone').fill(created.input.phone);
    await page.locator('#input-address-street').fill('Rua de Teste E2E');
    await page.locator('#input-address-number').fill('100');
    await page.locator('#input-address-citystate').fill('São Paulo/SP');
    
    await page.locator('#btn-next-to-review').click();
    await expect(page.locator('#btn-proceed-to-checkout')).toBeVisible();
    await expect(page.getByText(created.input.name)).toBeVisible();
    await expect(page.getByText(/529[.]982[.]247-25|52998224725/)).toBeVisible();
    expect(created.body.serviceType).toBe(service.procedure);
    // Não avançar ao checkout: geração paga só é certificada com adaptador/sandbox autorizado.
  });

  test('E2E-RECURSO_CETRAN-09 pagamento seguro: preview recusa cobrança sem gateway', async ({page}) => {
    await openService(page, service);
    test.skip(process.env.E2E_SAFE_PREVIEW !== 'true' || !process.env.E2E_AUTH_TOKEN, 'BLOCKED: exige E2E_SAFE_PREVIEW=true e token de identidade sintética autorizado; nenhuma chamada de pagamento será feita sem essas garantias.');
    const created = await createCaseThroughAnalysis(page, 'payment-safe', service);
    const response = await page.request.post(new URL('/api/payments/pix/create', baseURL).toString(), {
      data: { caseId: created.id, serviceType: service.procedure },
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + process.env.E2E_AUTH_TOKEN },
    });
    expect(response.status()).toBe(503);
    expect(await response.text()).toMatch(/Cobranças estão desativadas|Nenhuma transação foi enviada/i);
  });

  test('E2E-RECURSO_CETRAN-10 repetição: preencher e voltar não cria caso', async ({page}) => {
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
