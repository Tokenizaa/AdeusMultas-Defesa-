import { test, expect } from '@playwright/test';
import { openService, fillIdentification, createCaseThroughAnalysis, expectNoPiiInWizardStorage, continueAfterReload, baseURL, runId, type CanonicalService } from './support';
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
    await continueAfterReload(page);
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

  test("E2E-CONVERSAO_ADVERTENCIA-07 análise substantiva: motor considera dados fornecidos e produz output estruturado", async ({page}) => {\n    await openService(page, service);\n    const created = await createCaseThroughAnalysis(page, "full-analysis", service);\n\n    // 1. Verificar se a análise foi gerada\n    expect(created.body.analysis).toBeTruthy();\n\n    // 2. Validar se o procedimento recomendado corresponde ao serviço\n    const procedure = created.body.analysis.recommendedProcedure ?? created.body.serviceType;\n    expect(procedure).toBe(service.procedure);\n\n    // 3. Verificar se a justificativa existe e tem conteúdo\n    expect(created.body.analysis.summaryReasoning).toBeTruthy();\n    expect(created.body.analysis.summaryReasoning.length).toBeGreaterThan(50);\n\n    // 4. Verificar se regras foram avaliadas\n    expect(created.body.analysis.evaluatedRules).toBeTruthy();\n    expect(created.body.analysis.evaluatedRules.length).toBeGreaterThan(0);\n\n    // 5. Verificar inconsistências detectadas (podem ser vazias, mas devem ser array)\n    expect(Array.isArray(created.body.analysis.detectedInconsistencies)).toBeTruthy();\n\n    // 6. Verificar lacunas de dados identificadas\n    expect(Array.isArray(created.body.analysis.dataGaps)).toBeTruthy();\n\n    // 7. Verificar argumentos recomendados\n    expect(Array.isArray(created.body.analysis.recommendedArguments)).toBeTruthy();\n\n    // 8. Verificar que o procedimento está coerente com os dados de entrada\n    const procedureMatchesData = \n      created.body.analysis.recommendedProcedure === service.procedure;\n    expect(procedureMatchesData).toBeTruthy();\n\n    // 9. Verificar que inconsistências apontam para dados concretos (se existirem)\n    if (created.body.analysis.detectedInconsistencies.length > 0) {\n      created.body.analysis.detectedInconsistencies.forEach(inconsistency => {\n        expect(inconsistency.description).toBeTruthy();\n        expect(inconsistency.rule).toBeTruthy();\n      });\n    }\n\n    // 10. Verificar que lacunas de dados, se existirem, explicam o que está faltando\n    if (created.body.analysis.dataGaps.length > 0) {\n      created.body.analysis.dataGaps.forEach(gap => {\n        expect(gap.field).toBeTruthy();\n        expect(gap.description || gap.reason).toBeTruthy();\n      });\n    }\n  );
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
