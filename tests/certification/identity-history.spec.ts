import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

type CertificationUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string;
};

type ServiceJourney = {
  serviceType: string;
  situation: string;
  stage?: string;
  category?: string;
};

const users = parseUsers();
const registrationMode = process.env.E2E_CERTIFICATION_REGISTER_USERS === 'true';

function parseUsers(): CertificationUser[] {
  const raw = process.env.E2E_CERTIFICATION_USERS;
  if (!raw) throw new Error('E2E_CERTIFICATION_USERS deve conter sete identidades de teste via secret/variável protegida.');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error('E2E_CERTIFICATION_USERS precisa ser JSON válido.'); }
  if (!Array.isArray(parsed) || parsed.length !== 7) {
    throw new Error('A certificação exige exatamente sete usuários persistentes U1–U7.');
  }
  const normalized = parsed as CertificationUser[];
  const ids = normalized.map((user) => user.id);
  if (new Set(ids).size !== 7 || !['U1','U2','U3','U4','U5','U6','U7'].every((id) => ids.includes(id))) {
    throw new Error('Os usuários devem ter IDs únicos U1, U2, U3, U4, U5, U6 e U7.');
  }
  for (const user of normalized) {
    if (!user.name || !user.email || !user.password || !user.phone) {
      throw new Error('Cada usuário precisa de nome, email, senha e telefone de teste.');
    }
  }
  return normalized;
}

const journeys: Record<string, ServiceJourney[]> = {
  U1: [
    { serviceType: 'defesa_previa', situation: 'multa_transito', stage: 'primeira_notificacao', category: 'excesso_velocidade' },
    { serviceType: 'recurso_jari', situation: 'multa_transito', stage: 'notificacao_penalidade', category: 'excesso_velocidade' },
  ],
  U2: [
    { serviceType: 'recurso_jari', situation: 'multa_transito', stage: 'notificacao_penalidade', category: 'excesso_velocidade' },
    { serviceType: 'recurso_cetran', situation: 'multa_transito', stage: 'recurso_jari_negado', category: 'excesso_velocidade' },
  ],
  U3: [
    { serviceType: 'defesa_previa', situation: 'multa_transito', stage: 'primeira_notificacao', category: 'excesso_velocidade' },
    { serviceType: 'indicacao_condutor', situation: 'indicacao_condutor' },
  ],
  U4: [
    { serviceType: 'suspensao_cnh', situation: 'suspensao_cnh' },
    { serviceType: 'recurso_jari', situation: 'multa_transito', stage: 'notificacao_penalidade', category: 'excesso_velocidade' },
  ],
  U5: [
    { serviceType: 'cassacao_cnh', situation: 'cassacao_cnh' },
    { serviceType: 'defesa_previa', situation: 'multa_transito', stage: 'primeira_notificacao', category: 'excesso_velocidade' },
  ],
  U6: [
    { serviceType: 'conversao_advertencia', situation: 'conversao_advertencia' },
    { serviceType: 'recurso_cetran', situation: 'multa_transito', stage: 'recurso_jari_negado', category: 'excesso_velocidade' },
  ],
  U7: [
    { serviceType: 'defesa_previa', situation: 'multa_transito', stage: 'primeira_notificacao', category: 'excesso_velocidade' },
    { serviceType: 'cassacao_cnh', situation: 'cassacao_cnh' },
    { serviceType: 'indicacao_condutor', situation: 'indicacao_condutor' },
  ],
};

async function registerUser(page: Page, user: CertificationUser) {
  await page.goto('/cadastro');
  await expect(page.getByRole('heading', { name: 'Criar Nova Conta' })).toBeVisible();
  await page.getByPlaceholder('Ex: Carlos Eduardo Silveira').fill(user.name);
  await page.getByPlaceholder('(11) 98765-4321').first().fill(user.phone);
  await page.getByPlaceholder('seu.email@exemplo.com.br').fill(user.email);
  await page.getByPlaceholder('Mínimo 6 caracteres').fill(user.password);
  await page.getByPlaceholder('Repita sua senha').fill(user.password);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Criar Minha Conta no DefesAi' }).click();

  const confirmation = page.getByText(/link de confirmação|verifique sua caixa de entrada/i);
  await expect(page).toHaveURL(/dashboard|cadastro|login/, { timeout: 20_000 });
  if (await confirmation.isVisible().catch(() => false)) {
    throw new Error(`BLOCKED: ${user.id} exige confirmação de e-mail. Conclua a confirmação real antes de certificar o login.`);
  }
  await expect(page).toHaveURL(/dashboard|cases/, { timeout: 20_000 });
}

async function loginUser(page: Page, user: CertificationUser): Promise<any[]> {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Acesse sua Conta' })).toBeVisible();
  await page.getByPlaceholder('seu.email@exemplo.com').fill(user.email);
  await page.getByPlaceholder('••••••••').fill(user.password);
  const casesResponse = page.waitForResponse((response) =>
    response.url().includes('/api/cases') &&
    response.request().method() === 'GET' &&
    response.status() === 200,
    { timeout: 30_000 },
  );
  await page.getByRole('button', { name: 'Entrar no DefesAi' }).click();
  await expect(page).toHaveURL(/dashboard|cases/, { timeout: 30_000 });
  const response = await casesResponse;
  const history = await response.json();
  expect(Array.isArray(history), 'GET /api/cases must return the authenticated account history.').toBe(true);
  return history;
}

async function chooseJourney(page: Page, journey: ServiceJourney) {
  await page.goto('/novo-caso');
  await expect(page.getByRole('heading', { name: 'Qual situação você quer resolver?' })).toBeVisible();
  await page.locator(`#service-option-${journey.situation}`).click();

  if (journey.stage) {
    await page.locator(`#stage-option-${journey.stage}`).click();
  }
  if (journey.category) {
    await page.locator(`#category-card-${journey.category}`).click();
    const nextToIdentification = page.locator('#btn-next-to-identification');
    if (await nextToIdentification.isVisible().catch(() => false)) {
      await nextToIdentification.click();
    }
  }

  await expect(page.locator('#input-ait-number')).toBeVisible({ timeout: 15_000 });
  const unique = randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
  const ait = `E2E${unique}`;

  await page.locator('#input-lead-name').fill('Usuário Sintético Certificação');
  await page.locator('#input-lead-phone').fill('(11) 90000-0000');
  await page.locator('#input-ait-number').fill(ait);
  await page.locator('#input-vehicle-plate').fill(`E${unique.slice(0, 6)}`.slice(0, 7));
  await page.locator('#input-autuador-body').fill('DETRAN-SP');
  await page.locator('#input-infraction-code').selectOption('745-50');
  await page.locator('#input-datetime').fill('2026-03-10T10:30');
  await page.locator('#input-notification-expedition-date').fill('2026-03-18');
  await page.locator('#input-defense-deadline').fill('2026-04-20');
  await page.locator('#input-location').fill('Rodovia de teste, km 20, São Paulo/SP');
  await page.locator('#btn-next-to-specifics').click();
  await expect(page.getByRole('heading', { name: 'Detalhes técnicos da sua autuação' })).toBeVisible();
  const createResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith('/api/cases') &&
    response.request().method() === 'POST',
    { timeout: 60_000 },
  );
  await page.locator('#btn-run-analysis').click();
  // The analysis processing screen performs the canonical persistence request.
  const createResponse = await createResponsePromise;
  expect(createResponse.ok(), `Case creation failed: HTTP ${createResponse.status()}`).toBe(true);
  const created = await createResponse.json();
  expect(typeof created.id).toBe('string');
  expect(created.id.length).toBeGreaterThan(0);
  expect(created.serviceType).toBe(journey.serviceType);
  expect(created.infraction?.aitNumber).toBe(ait);
  expect(created.analysis).toBeTruthy();

  // Server-truth check after reload: case and analysis must survive a new UI state.
  const listResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/cases') &&
    response.request().method() === 'GET' &&
    response.status() === 200,
    { timeout: 30_000 },
  );
  await page.reload();
  const listResponse = await listResponsePromise;
  const cases = await listResponse.json();
  expect(Array.isArray(cases)).toBe(true);
  const persisted = cases.find((item: any) => item.id === created.id);
  expect(persisted, `Case ${created.id} was not recovered from server after reload.`).toBeTruthy();
  expect(persisted.serviceType).toBe(journey.serviceType);
  expect(persisted.infraction?.aitNumber).toBe(ait);
  expect(persisted.analysis, 'Persisted analysis is required; UI success alone is not evidence.').toBeTruthy();

  return { caseId: created.id as string, ait };
}

if (registrationMode) {
  test.describe('Greenfield certification — initial account registration', () => {
    for (const user of users) {
      test(`${user.id}: register through the real UI`, async ({ page }) => {
        await registerUser(page, user);
      });
    }
  });
} else {
  test.describe('Greenfield certification — persistent user journeys', () => {
    for (const user of users) {
      test(`${user.id}: login, create cross-service cases, and recover history`, async ({ page }) => {
        await loginUser(page, user);
        const userJourneys = journeys[user.id];
        expect(userJourneys.length).toBeGreaterThanOrEqual(2);

        const createdCases: Array<{ caseId: string; ait: string }> = [];
        for (const journey of userJourneys) {
          createdCases.push(await chooseJourney(page, journey));
        }

        expect(new Set(createdCases.map((item) => item.caseId)).size).toBe(createdCases.length);
        expect(new Set(createdCases.map((item) => item.ait)).size).toBe(createdCases.length);

        // Return to the same account in a new browser context and verify each case remains isolated.
        const secondContext = await page.context().browser()!.newContext();
        try {
          const secondPage = await secondContext.newPage();
          const history = await loginUser(secondPage, user);
          for (const item of createdCases) {
            const recovered = history.find((entry: any) => entry.id === item.caseId);
            expect(recovered, `Missing prior case ${item.caseId} after a fresh login.`).toBeTruthy();
            expect(recovered.infraction?.aitNumber).toBe(item.ait);
            expect(recovered.analysis).toBeTruthy();
          }
        } finally {
          await secondContext.close();
        }
      });
    }
  });
}
