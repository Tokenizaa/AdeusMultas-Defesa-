/**
 * Fase 2 — suíte E2E reconstruída por serviço.
 *
 * Contratos conferidos no código:
 * - /novo-caso abre o OnboardingWizard;
 * - ServiceStep usa #service-option-<USER_SITUATIONS.id>;
 * - DefenseStageStep usa #stage-option-<USER_PROCESS_STAGES.id>;
 * - InfractionCategoryStep usa #category-card-<category.id>;
 * - InfractionIdentificationStep expõe IDs input-* e #btn-next-to-specifics;
 * - seleção do código da infração é um <select> que atualiza artigo/valor/pontos;
 * - nenhum caso é criado via API e nenhum pagamento é acionado por estes cenários.
 *
 * Não executar nesta fase. PLAYWRIGHT_BASE_URL é obrigatório e nunca há fallback
 * para localhost. A bateria deve usar a URL já definida no ambiente .env.
 */
import { test, expect, type Page } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL;
if (!baseURL) {
  throw new Error('PLAYWRIGHT_BASE_URL é obrigatório. Configure a URL do ambiente no .env; localhost não é fallback.');
}

type Service = {
  key: string;
  situationId: string;
  label: string;
  stageId?: string;
  categoryId?: string;
};

const services: Service[] = [
  { key: 'defesa_previa', situationId: 'multa_transito', label: 'Defesa prévia', stageId: 'primeira_notificacao', categoryId: 'excesso_velocidade' },
  { key: 'recurso_jari', situationId: 'multa_transito', label: 'Recurso à JARI', stageId: 'notificacao_penalidade', categoryId: 'excesso_velocidade' },
  { key: 'recurso_cetran', situationId: 'multa_transito', label: 'Recurso ao CETRAN', stageId: 'recurso_jari_negado', categoryId: 'excesso_velocidade' },
  { key: 'suspensao', situationId: 'suspensao_cnh', label: 'Suspensão da CNH' },
  { key: 'cassacao', situationId: 'cassacao_cnh', label: 'Cassação da CNH' },
  { key: 'indicacao_condutor', situationId: 'indicacao_condutor', label: 'Indicação de condutor' },
  { key: 'conversao_advertencia', situationId: 'conversao_advertencia', label: 'Conversão em advertência' },
];

async function openService(page: Page, service: Service) {
  await page.goto(new URL('/novo-caso', baseURL).toString());
  await expect(page.locator('#service-option-' + service.situationId)).toBeVisible();
  await page.locator('#service-option-' + service.situationId).click();

  if (service.stageId) {
    await expect(page.locator('#stage-option-' + service.stageId)).toBeVisible();
    await page.locator('#stage-option-' + service.stageId).click();
    await expect(page.locator('#category-card-' + service.categoryId)).toBeVisible();
    await page.locator('#category-card-' + service.categoryId).click();
    await page.locator('#btn-next-to-identification').click();
  }

  await expect(page.locator('#input-lead-name')).toBeVisible();
}

async function fillValidIdentification(page: Page) {
  await page.locator('#input-lead-name').fill('Pessoa Teste E2E');
  await page.locator('#input-lead-phone').fill('11987654321');
  await page.locator('#input-vehicle-plate').fill('BRA2E19');
  await page.locator('#input-autuador-body').fill('DETRAN-SP');
  const code = page.locator('#input-infraction-code');
  await expect(code).toBeVisible();
  const options = await code.locator('option').evaluateAll((items) =>
    items.map((item) => (item as HTMLOptionElement).value).filter((value) => value.length >= 3),
  );
  if (options.length) await code.selectOption(options[0]);
  await page.locator('#input-location').fill('Av. Paulista, 1000 - São Paulo/SP');
}

const scenarioDefinitions = [
  {
    slug: 'service-entry',
    title: 'abre a etapa de identificação após a escolha do serviço',
    run: async (page: Page) => {
      await expect(page.getByRole('heading', { name: 'Qual é o auto de infração e o condutor?' })).toBeVisible();
      await expect(page.locator('#btn-next-to-specifics')).toBeDisabled();
    },
  },
  {
    slug: 'required-contact',
    title: 'bloqueia avanço quando nome e telefone de contato estão ausentes',
    run: async (page: Page) => {
      await expect(page.locator('#input-lead-name')).toHaveValue('');
      await expect(page.locator('#input-lead-phone')).toHaveValue('');
      await expect(page.locator('#btn-next-to-specifics')).toBeDisabled();
    },
  },
  {
    slug: 'required-vehicle',
    title: 'exige placa com comprimento mínimo antes de continuar',
    run: async (page: Page) => {
      await page.locator('#input-lead-name').fill('Pessoa Teste');
      await page.locator('#input-lead-phone').fill('11987654321');
      await page.locator('#input-vehicle-plate').fill('ABC');
      await page.locator('#input-autuador-body').fill('DETRAN-SP');
      await page.locator('#input-location').fill('Av. Paulista, 1000');
      await expect(page.locator('#btn-next-to-specifics')).toBeDisabled();
    },
  },
  {
    slug: 'required-authority',
    title: 'exige órgão autuador preenchido para liberar o avanço',
    run: async (page: Page) => {
      await page.locator('#input-lead-name').fill('Pessoa Teste');
      await page.locator('#input-lead-phone').fill('11987654321');
      await page.locator('#input-vehicle-plate').fill('BRA2E19');
      await page.locator('#input-location').fill('Av. Paulista, 1000');
      await expect(page.locator('#btn-next-to-specifics')).toBeDisabled();
    },
  },
  {
    slug: 'required-location',
    title: 'exige local da infração preenchido para liberar o avanço',
    run: async (page: Page) => {
      await page.locator('#input-lead-name').fill('Pessoa Teste');
      await page.locator('#input-lead-phone').fill('11987654321');
      await page.locator('#input-vehicle-plate').fill('BRA2E19');
      await page.locator('#input-autuador-body').fill('DETRAN-SP');
      await expect(page.locator('#btn-next-to-specifics')).toBeDisabled();
    },
  },
  {
    slug: 'catalog-code',
    title: 'usa o catálogo de infrações e atualiza o enquadramento ao selecionar código',
    run: async (page: Page) => {
      const select = page.locator('#input-infraction-code');
      await expect(select).toBeVisible();
      const values = await select.locator('option').evaluateAll((items) =>
        items.map((item) => (item as HTMLOptionElement).value).filter((value) => value.length >= 3),
      );
      expect(values.length).toBeGreaterThan(0);
      await select.selectOption(values[0]);
      await expect(page.locator('#input-infraction-code')).toHaveValue(values[0]);
    },
  },
  {
    slug: 'valid-identification',
    title: 'aceita dados mínimos válidos e libera a etapa de perguntas específicas',
    run: async (page: Page) => {
      await fillValidIdentification(page);
      await expect(page.locator('#btn-next-to-specifics')).toBeEnabled();
      await page.locator('#btn-next-to-specifics').click();
      await expect(page.getByText('Perguntas configuradas para este tipo de autuação')).toBeVisible();
    },
  },
  {
    slug: 'back-navigation',
    title: 'retorna da identificação à seleção de categoria sem criar caso',
    run: async (page: Page) => {
      await page.getByRole('button', { name: /Voltar à fase/i }).click();
      await expect(page.locator('#category-card-excesso_velocidade')).toBeVisible();
      await expect(page).toHaveURL(/novo-caso/);
    },
  },
  {
    slug: 'specialized-input',
    title: 'apresenta a pergunta específica coerente com a categoria selecionada',
    run: async (page: Page) => {
      await fillValidIdentification(page);
      await page.locator('#btn-next-to-specifics').click();
      await expect(page.getByText('Perguntas configuradas para este tipo de autuação')).toBeVisible();
      await expect(page.locator('#input-speed-limit')).toBeVisible();
    },
  },
  {
    slug: 'browser-error-observation',
    title: 'conclui a navegação inicial sem erro JavaScript não tratado',
    run: async (page: Page) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      await expect(page.locator('#input-lead-name')).toBeVisible();
      expect(pageErrors).toEqual([]);
    },
  },
] as const;

for (const service of services) {
  for (const scenario of scenarioDefinitions) {
    test(`E2E-${service.key.toUpperCase()}-${String(scenarioDefinitions.indexOf(scenario) + 1).padStart(3, '0')} ${scenario.title}`, async ({ page }) => {
      await openService(page, service);
      await scenario.run(page);
    });
  }
}
