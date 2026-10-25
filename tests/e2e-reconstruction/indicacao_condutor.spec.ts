import { test, expect } from '@playwright/test';
import { openService, fillIdentification, createCaseThroughAnalysis, expectNoPiiInWizardStorage, baseURL, runId, type CanonicalService } from './support';
import { runTextAudit, assertTextAudit } from './text-audit-runner';
const service: CanonicalService = {
  "id": "indicacao_condutor",
  "situationId": "indicacao_condutor",
  "categoryId": "indicacao_condutor",
  "procedure": "indicacao_condutor"
};
test.describe('indicacao_condutor — dez cenários canônicos', () => {
  test('E2E-INDICACAO_CONDUTOR-01 caminho válido: abre a identificação do serviço', async ({page}) => {
    await openService(page, service);
    await expect(page.locator('#input-lead-name')).toBeVisible();
    await expect(page.locator('#input-lead-phone')).toBeVisible();
    await expect(page.locator('#input-vehicle-plate')).toBeVisible();
  });

  test('E2E-INDICACAO_CONDUTOR-02 obrigatórios: impede avanço sem nome e telefone', async ({page}) => {
    await openService(page, service);
    await expect(page.locator('#btn-next-to-specifics')).toBeDisabled();
    await expect(page.locator('#input-lead-name')).toHaveValue('');
    await expect(page.locator('#input-lead-phone')).toHaveValue('');
  });

  test('E2E-INDICACAO_CONDUTOR-03 inválidos: placa curta não libera avanço', async ({page}) => {
    await openService(page, service);
    await fillIdentification(page, 'placa-invalida', { plate: 'ABC' });
    await expect(page.locator('#btn-next-to-specifics')).toBeDisabled();
  });

  test('E2E-INDICACAO_CONDUTOR-04 intake: cria caso pela análise e confere serviço persistido', async ({page}) => {
    await openService(page, service);
    const created = await createCaseThroughAnalysis(page, 'intake', service);
    expect(created.id).not.toBe('');
    expect(created.body.serviceType).toBe(service.procedure);
  });

  test('E2E-INDICACAO_CONDUTOR-05 segurança de recuperação: token de claim inválido é recusado', async ({page}) => {
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

  test('E2E-INDICACAO_CONDUTOR-06 persistência: reload não cria um segundo caso', async ({page}) => {
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

  test('E2E-INDICACAO_CONDUTOR-07 análise: resultado contém procedimento esperado', async ({page}) => {
    await openService(page, service);
    const created = await createCaseThroughAnalysis(page, 'analysis-oracle', service);
    expect(created.body.analysis).toBeTruthy();
    expect(created.body.analysis.recommendedProcedure ?? created.body.serviceType).toBe(service.procedure);
  });

  test('E2E-INDICACAO_CONDUTOR-08 documento e integridade: exige identidade antes da qualificação documental', async ({page}) => {
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

  test('E2E-INDICACAO_CONDUTOR-09 pagamento seguro: cobrança exige identidade autenticada', async ({page}) => {
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

  test('E2E-INDICACAO_CONDUTOR-10 repetição: preencher e voltar não cria caso', async ({page}) => {
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

  // ==========================================
  // Auditoria Textual (Onda 5+)
  // ==========================================
  
  test('E2E-INDICACAO_CONDUTOR-11 auditoria textual: infraestrutura captura entrada → API → UI → validação', async ({page}) => {
    const evidence = await runTextAudit(page, {
      service,
      runId: 'e2e-text-audit',
      specificAnswers: {
        // indicacao_condutor — dados básicos
        realDriverName: 'JOÃO DA SILVA',
        realDriverCpf: '12345678901',
        realDriverCnh: '123456789012',
        indicationWithinDeadline: true,
      },
      saveEvidence: true,
      outputDir: 'artifacts/text-audit',
      expectFullFlow: false,
    });
    
    expect(evidence.metadata.status).not.toBe('blocked');
    expect(evidence.apiResponse.caseId).toBeTruthy();
    expect(evidence.apiResponse.claimToken).toBeTruthy();
    expect(evidence.apiResponse.analysis).toBeDefined();
    
    const analysis = evidence.apiResponse.analysis;
    expect(analysis.recommendedProcedure).toBe(service.procedure);
    expect(typeof analysis.overallSuccessRate).toBe('number');
    expect(Array.isArray(analysis.recommendedArguments)).toBe(true);
    expect(Array.isArray(analysis.dataGaps)).toBe(true);
    expect(analysis.dataCompleteness).toBeDefined();
    
    const rt = evidence.renderedText;
    expect(rt.identification.labels.length).toBeGreaterThan(0);
    expect(rt.specificQuestions.questions.length).toBeGreaterThan(0);
    expect(rt.analysisResult.header.title).toContain('diagnóstico');
    expect(typeof rt.analysisResult.strengthIndicator.rate === 'number' || rt.analysisResult.strengthIndicator.rate === null).toBe(true);
    expect(Array.isArray(rt.analysisResult.summaryCards)).toBe(true);
    expect(Array.isArray(rt.analysisResult.nextSteps)).toBe(true);
    
    assertTextAudit(evidence, { failOnWarning: false });
  });

  test('E2E-INDICACAO_CONDUTOR-12 auditoria textual: forbidden patterns detection', async ({page}) => {
    const evidence = await runTextAudit(page, {
      service,
      runId: 'e2e-text-audit',
      specificAnswers: {
        realDriverName: 'JOÃO DA SILVA',
        realDriverCpf: '12345678901',
        realDriverCnh: '123456789012',
        indicationWithinDeadline: true,
      },
      saveEvidence: true,
      outputDir: 'artifacts/text-audit',
      expectFullFlow: false,
    });
    
    const { comparison } = evidence;
    
    if (comparison.forbiddenPatterns.length > 0) {
      console.log('Padrões proibidos detectados:', comparison.forbiddenPatterns.map(f => `${f.pattern}: ${f.foundIn}`));
    }
    
    expect(evidence.metadata.status).not.toBe('blocked');
  });

  test('E2E-INDICACAO_CONDUTOR-13 navegação: permite voltar do resultado para corrigir respostas', async ({page}) => {
    await openService(page, service);
    await createCaseThroughAnalysis(page, 'result-back-navigation', service);
    await expect(page.getByRole('heading', { name: 'Resultado do seu diagnóstico' })).toBeVisible();
    await page.locator('#btn-back-to-edit-diagnosis').click();
    await expect(page.getByText('Perguntas Específicas do Seu Caso')).toBeVisible();
    await expect(page.locator('#btn-run-analysis')).toBeVisible();
  });
});
