import { test, expect } from '@playwright/test';

const enabled = process.env.RUN_MANUAL_REBUILD_E2E === '1';

test.describe('rotas públicas canônicas do onboarding', () => {
  test('a rota pública canônica abre o formulário manual', async ({ page }) => {
    await page.goto('/novo-caso');
    await expect(page).toHaveURL(/\/novo-caso$/);
    await expect(page.getByRole('heading', { name: 'Informe os dados da autuação' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Registrar dados' })).toBeVisible();
  });

  test('a rota antiga é normalizada para a URL canônica', async ({ page }) => {
    await page.goto('/novo-caso-rebuild');
    await expect(page).toHaveURL(/\/novo-caso$/);
    await expect(page.getByRole('heading', { name: 'Informe os dados da autuação' })).toBeVisible();
  });

  test('uma rota pública inexistente exibe 404 e permite voltar ao início', async ({ page }) => {
    await page.goto('/rota-inexistente-certificacao');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await expect(page.getByText('Pagina nao encontrada')).toBeVisible();
    await page.getByRole('button', { name: 'Voltar ao inicio' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: /Descubra se o seu auto de infração/ })).toBeVisible();
  });
});

test.describe('onboarding manual greenfield — fluxo novo', () => {
  test.skip(!enabled, 'Execute com playwright.manual-onboarding.config.ts e RUN_MANUAL_REBUILD_E2E=1; as APIs são mockadas.');

  test('valida os campos no navegador e não envia formulário incompleto', async ({ page }) => {
    const intakeRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/cases/anonymous')) intakeRequests.push(request.url());
    });

    await page.goto('/novo-caso');
    await page.getByRole('button', { name: 'Registrar dados' }).click();

    await expect(page.getByText('Informe o número do auto de infração.')).toBeVisible();
    await expect(page.getByText('Informe o código da infração.')).toBeVisible();
    await expect(page.getByText('Informe o local da infração com pelo menos 5 caracteres.')).toBeVisible();
    await expect(page.getByText('Informe uma placa válida com 7 ou 8 caracteres.')).toBeVisible();
    expect(intakeRequests).toHaveLength(0);
  });

  test('registra dados manualmente, preserva token de recuperação e não chama OCR', async ({ page }) => {
    let submittedPayload: Record<string, any> | undefined;
    const forbiddenRequests: string[] = [];

    await page.route('**/api/cases/anonymous', async (route) => {
      submittedPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'e2e-manual-case-001',
          claimToken: 'a'.repeat(64),
          status: 'analisado',
          isAnonymous: true,
        }),
      });
    });
    page.on('request', (request) => {
      if (/\/api\/(ocr|documents\/extract)|ocr\/upload|ocr\/analyze/i.test(request.url())) {
        forbiddenRequests.push(request.url());
      }
    });

    await page.goto('/novo-caso');
    await page.getByLabel(/Número do auto de infração/).fill('E2E-MANUAL-001');
    await page.getByLabel('Código da infração').fill('745-5');
    await page.getByLabel('Local da infração').fill('Av. Paulista, 1000 - São Paulo/SP');
    await page.getByLabel('Placa do veículo').fill('ABC1D23');
    await page.getByLabel('Órgão autuador').fill('Órgão de teste');
    await page.getByRole('button', { name: 'Registrar dados' }).click();

    await expect(page.getByRole('heading', { name: 'Seu caso foi registrado' })).toBeVisible();
    await expect(page.getByText('e2e-manual-case-001')).toBeVisible();
    expect(submittedPayload).toMatchObject({
      infraction: {
        aitNumber: 'E2E-MANUAL-001',
        infractionCode: '745-5',
        autuadorBody: 'Órgão de teste',
        location: 'Av. Paulista, 1000 - São Paulo/SP',
      },
      vehicle: { plate: 'ABC1D23' },
      serviceType: 'defesa_previa',
    });
    expect(await page.evaluate(() => sessionStorage.getItem('defesai_manual_onboarding_case_id'))).toBe('e2e-manual-case-001');
    expect(await page.evaluate(() => sessionStorage.getItem('defesai_manual_onboarding_claim_token'))).toBe('a'.repeat(64));
    expect(forbiddenRequests).toEqual([]);
  });


  test('oferece e preserva os sete serviços no payload sem criar mais de um caso por envio', async ({ page }) => {
    const services = [
      'defesa_previa',
      'recurso_jari',
      'recurso_cetran',
      'suspensao_cnh',
      'cassacao_cnh',
      'indicacao_condutor',
      'conversao_advertencia',
    ];
    let createCount = 0;
    let lastService = '';
    await page.route('**/api/cases/anonymous', async (route) => {
      createCount += 1;
      lastService = route.request().postDataJSON().serviceType;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: `e2e-manual-service-${createCount}`,
          claimToken: String(createCount).padStart(64, 'a').slice(-64),
          status: 'analisado',
          isAnonymous: true,
        }),
      });
    });

    await page.goto('/novo-caso');
    const actualOptions = await page.locator('#serviceType option').evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value),
    );
    expect(actualOptions).toEqual(services);

    for (const [index, service] of services.entries()) {
      if (index > 0) {
        await page.getByRole('button', { name: 'Iniciar outro caso' }).click();
      }
      await page.getByLabel(/Número do auto de infração/).fill(`E2E-SERVICE-${index + 1}`);
      await page.getByLabel('Código da infração').fill('745-5');
      await page.getByLabel('Local da infração').fill('Rua de teste, 10 - São Paulo/SP');
      await page.getByLabel('Placa do veículo').fill('ABC1D23');
      await page.locator('#serviceType').selectOption(service);
      await page.getByRole('button', { name: 'Registrar dados' }).click();
      await expect(page.getByRole('heading', { name: 'Seu caso foi registrado' })).toBeVisible();
      expect(lastService).toBe(service);
      expect(createCount).toBe(index + 1);
    }
    expect(createCount).toBe(services.length);
  });

  test('oferece login ou cadastro antes de vincular o caso anônimo', async ({ page }) => {
    await page.route('**/api/cases/anonymous', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'e2e-manual-claim-001',
          claimToken: 'c'.repeat(64),
          status: 'analisado',
          isAnonymous: true,
        }),
      });
    });

    await page.goto('/novo-caso');
    await page.getByLabel(/Número do auto de infração/).fill('E2E-MANUAL-CLAIM');
    await page.getByLabel('Código da infração').fill('745-5');
    await page.getByLabel('Local da infração').fill('Rua de teste, 10 - São Paulo/SP');
    await page.getByLabel('Placa do veículo').fill('ABC1D23');
    await page.getByRole('button', { name: 'Registrar dados' }).click();

    await expect(page.getByRole('heading', { name: 'Próxima etapa: vincular à sua conta' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar para vincular' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Criar conta' })).toBeVisible();
    await page.getByRole('button', { name: 'Entrar para vincular' }).click();
    await expect(page).toHaveURL(/login/);
    expect(await page.evaluate(() => sessionStorage.getItem('defesai_manual_onboarding_case_id'))).toBe('e2e-manual-claim-001');
    expect(await page.evaluate(() => sessionStorage.getItem('defesai_manual_onboarding_claim_token'))).toBe('c'.repeat(64));
  });

  test('recupera o registro depois de recarregar a página usando ID e token da sessão', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('defesai_manual_onboarding_case_id', 'e2e-manual-recovered-001');
      sessionStorage.setItem('defesai_manual_onboarding_claim_token', 'b'.repeat(64));
    });
    let recoveryPayload: Record<string, unknown> | undefined;
    await page.route('**/api/cases/anonymous/*/recover', async (route) => {
      recoveryPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          case: {
            id: 'e2e-manual-recovered-001',
            status: 'analisado',
            serviceType: 'recurso_jari',
            vehicle: { plate: 'ABC1D23' },
            infraction: {
              aitNumber: 'E2E-RECOVERED-001',
              infractionCode: '745-5',
              location: 'Rua de teste, 10 - São Paulo/SP',
            },
          },
        }),
      });
    });

    await page.goto('/novo-caso');
    await expect(page.getByRole('heading', { name: 'Seu caso foi recuperado' })).toBeVisible();
    await expect(page.getByText('E2E-RECOVERED-001')).toBeVisible();
    await expect(page.getByText('ABC1D23')).toBeVisible();
    await expect(page.getByText('Recurso à JARI').first()).toBeVisible();
    expect(recoveryPayload).toEqual({ claimToken: 'b'.repeat(64) });
  });

  test('mostra erro de API sem declarar caso criado', async ({ page }) => {
    await page.route('**/api/cases/anonymous', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Criação anônima temporariamente indisponível.' }),
      });
    });

    await page.goto('/novo-caso');
    await page.getByLabel(/Número do auto de infração/).fill('E2E-MANUAL-503');
    await page.getByLabel('Código da infração').fill('745-5');
    await page.getByLabel('Local da infração').fill('Rua de teste, 10 - São Paulo/SP');
    await page.getByLabel('Placa do veículo').fill('ABC1D23');
    await page.getByRole('button', { name: 'Registrar dados' }).click();

    await expect(page.getByRole('alert')).toContainText('Criação anônima temporariamente indisponível.');
    await expect(page.getByRole('heading', { name: 'Seu caso foi registrado' })).toHaveCount(0);
  });
});
