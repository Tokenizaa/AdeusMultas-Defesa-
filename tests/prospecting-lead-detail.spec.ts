import { test, expect, Page } from '@playwright/test';

/**
 * E2E — Prospecting Lead Detail (ProspectingLeadsTab + ProspectingLeadDrawer)
 *
 * Valida o fluxo de exibição de detalhe de um lead do módulo de prospecção:
 *   1. Abre /admin/marketing/prospecting/leads como admin (localStorage auth fallback — padrão do projeto)
 *   2. Localiza um lead COM dados (Despachante do Detran Bittencourt — Curitiba) e abre o drawer
 *   3. Assere que exibe os dados reais servidos pelo backend (CEP, telefone BR, website, cidade)
 *   4. Valida o comportamento honesto: lead SEM dados mostra "Não informado" (e não inventa número)
 *   5. Bonus: filtro de fonte dinâmico lista "google_maps"
 *
 * Ambiente (obrigatório — igual ao dos specs existentes onboarding.spec.ts etc.):
 *   O servidor deve estar rodando com VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY VAZIAS
 *   (exatamente o comando do playwright.config.ts `webServer`). Nesse modo o AuthContext
 *   cai no branch `else` (linha ~122 em AuthContext.tsx): lê `defesai_auth_session_v1` do
 *   localStorage e NUNCA se inscreve em `onAuthStateChange` — portanto a sessão admin local
 *   persiste e o guard `/admin/*` libera a página.
 *
 *   IMPORTANTE (documentado): se o servidor rodar COM envs VITE Supabase reais, o AuthContext
 *   entra no branch `if (isSupabaseConfigured && supabase)` e, sem sessão real, o
 *   `onAuthStateChange(null)` limpa a sessão local (setUser(null); setStoredSession(null)) e o
 *   guard admin redireciona para /login. Bloquear reqs a *.supabase.co NÃO contorna isso, porque
 *   a limpeza é um evento LOCAL de storage (getSession/onAuthStateChange leem localStorage), não
 *   uma chamada HTTP. O bloco abaixo falha com mensagem clara nesse caso, em vez de timeout opaco.
 *
 * Os leads vêm do backend real (Express -> Supabase via SUPABASE_URL/SERVICE_ROLE_KEY do .env).
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const EVIDENCE_DIR = '.superpowers/evidence';

const ADMIN_USER = {
  id: 'admin-e2e-id',
  name: 'Admin Teste',
  email: 'admin@defesai.com',
  cpf: '000.000.000-00',
  phone: '(11) 90000-0000',
  role: 'admin',
  isAdmin: true,
};

// Simulate a logged-in admin via the localStorage auth fallback (padrão do projeto).
async function forceLocalAuth(page: Page, user: Record<string, unknown>) {
  await page.addInitScript((mockUser) => {
    localStorage.setItem('defesai_auth_session_v1', JSON.stringify(mockUser));
  }, user);
}

// Guarda honesta do ambiente: garante que chegamos na página admin (e não fomos
// redirecionados para /login pelo wipe de sessão do Supabase ativo).
async function reachAdminLeadsPage(page: Page) {
  await page.goto(`${BASE_URL}/admin/marketing/prospecting/leads`, { waitUntil: 'domcontentloaded' });

  const loginHeading = page.getByRole('heading', { name: 'Acesse sua Conta' });
  const search = page.getByPlaceholder(/Buscar por nome da empresa/);

  try {
    await expect(
      search.or(loginHeading).first(),
      'Aguardando render de /admin/marketing/prospecting/leads',
    ).toBeVisible({ timeout: 15000 });
  } catch (e) {
    throw e;
  }

  if (await loginHeading.isVisible().catch(() => false)) {
    throw new Error(
      'BLOQUEIO DE AMBIENTE: a página /admin/marketing/prospecting/leads redirecionou para /login. ' +
        'Isso ocorre porque o servidor está rodando COM as envs VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ' +
        'ativas, e o AuthContext limpa a sessão admin do localStorage (onAuthStateChange(null)). ' +
        'Reinicie o servidor com as envs VAZIAS, exatamente como o playwright.config.ts define no webServer: ' +
        '`VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npm run dev`. ' +
        'Os leads continuam reais, pois o backend usa SUPABASE_URL/SERVICE_ROLE_KEY do .env.',
    );
  }

  await expect(search, 'Barra de busca da lista de leads deve estar visível').toBeVisible();
}

// Coleta page errors + console.error para garantir que a UI não mente nem quebra.
function watchForErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  return errors;
}

// Lead alvo COM dados (verificado na base via /api/marketing/automation/leads).
const FULL_LEAD_NAME = 'Despachante do Detran Bittencourt';
// Lead vazio (city/zip/phone/whatsapp/email/website NULOS -> drawer mostra "Não informado").
// Existem 2 linhas idênticas com este nome na base -> usa sempre .first().
const EMPTY_LEAD_NAME = 'JP DESPACHANTE';

test.describe('Prospecting Lead Detail — E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await forceLocalAuth(page, ADMIN_USER);
  });

  test('lead com dados: drawer exibe endereço, CEP, telefone BR e website reais', async ({ page }) => {
    const errors = watchForErrors(page);

    await reachAdminLeadsPage(page);

    // 1. Filtra a lista pelo nome estável do lead alvo (filtro client-side).
    const search = page.getByPlaceholder(/Buscar por nome da empresa/);
    await search.fill(FULL_LEAD_NAME);

    // 2. Localiza a linha na tabela (nome estável, foi confirmado único na base).
    const row = page.locator('tr', { hasText: FULL_LEAD_NAME });
    await expect(row).toBeVisible();
    await page.waitForTimeout(300); // deixa o filtro debounce assentar

    // 3. Clique no botão "Ver" da linha (botão que abre o drawer).
    await row.getByRole('button', { name: 'Ver' }).click();

    // 4. Drawer visível: cabeçalho com o nome do lead.
    const drawerName = page.getByRole('heading', { name: FULL_LEAD_NAME });
    await expect(drawerName).toBeVisible();

    // Screenshot ANTES das asserções de valor (artefato de evidência).
    await page.screenshot({ path: `${EVIDENCE_DIR}/lead-detail-full-bittencourt.png`, fullPage: true });

    // 5. Assere os dados reais.
    // Cidade (Curitiba) aparece no cabeçalho do drawer e na seção Endereço.
    await expect(page.getByText('Curitiba').first()).toBeVisible();

    // CEP: 8 dígitos (dados reais -> 82560320). Usa a linha do DetailRow cujo label é "CEP".
    const cepRow = page.locator('div', { hasText: 'CEP' }).filter({ hasText: /CEP/ }).last();
    const cepText = await cepRow.textContent();
    const cepMatch = (cepText || '').match(/\b\d{8}\b/);
    expect(cepMatch, `CEP deve ter 8 dígitos (recebido: ${cepText?.trim()})`).not.toBeNull();

    // Telefone: formato BR (DDD 41 + 9 dígitos, digitos crus na base -> 41996121509).
    const phoneRow = page.locator('div', { hasText: 'Telefone Fixo / Celular' }).last();
    const phoneText = await phoneRow.textContent();
    const phoneDigits = (phoneText || '').replace(/\D/g, '');
    expect(phoneDigits, `Telefone deve ter 11 dígitos BR (recebido: ${phoneText?.trim()})`).toMatch(/^99?41\d{8,9}$/);

    // Website: link "Site" real com esquema http(s).
    const websiteLink = page.getByRole('link', { name: 'Site' });
    await expect(websiteLink).toBeVisible();
    const websiteHref = (await websiteLink.getAttribute('href')) || '';
    expect(websiteHref, `Website deve ter esquema http(s) (recebido: ${websiteHref})`).toMatch(/^https?:\/\//i);

    // Drawer NÃO deve mentir: não mostra "Não informado" para campos preenchidos.
    await expect(page.getByText('Não informado', { exact: true })).not.toBeVisible();

    // 6. Zero page errors / console errors no fluxo.
    expect(errors, `Erros de console/page não devem ocorrer: ${errors.join(' | ')}`).toEqual([]);
  });

  test('lead sem dados: comportamento honesto mostra "Não informado" para telefone', async ({ page }) => {
    const errors = watchForErrors(page);

    await reachAdminLeadsPage(page);

    const search = page.getByPlaceholder(/Buscar por nome da empresa/);
    await search.fill(EMPTY_LEAD_NAME);

    // São 2 linhas idênticas na base -> abre a primeira.
    const row = page.locator('tr', { hasText: EMPTY_LEAD_NAME }).first();
    await expect(row).toBeVisible();
    await page.waitForTimeout(300);
    await row.getByRole('button', { name: 'Ver' }).click();

    const drawerName = page.getByRole('heading', { name: EMPTY_LEAD_NAME });
    await expect(drawerName).toBeVisible();

    await page.screenshot({ path: `${EVIDENCE_DIR}/lead-detail-empty-phone.png`, fullPage: true });

    // A honestidade: sem telefone no banco, o drawer exibe "Não informado"
    // (não inventa um número). Verifica ao menos em "Canais de Contato".
    const contactSection = page.locator('div', { hasText: 'Canais de Contato' }).last();
    await expect(contactSection.getByText('Não informado').first()).toBeVisible();

    // Também valida que NÃO há link de "Ligar" (sem número real para ligar).
    await expect(contactSection.getByRole('link', { name: 'Ligar' })).toHaveCount(0);

    expect(errors, `Erros de console/page não devem ocorrer: ${errors.join(' | ')}`).toEqual([]);
  });

  test('bonus: filtro de fonte dinâmico lista "google_maps"', async ({ page }) => {
    await reachAdminLeadsPage(page);

    // Aguarda os leads carregarem; o select de fonte é populado dinamicamente a
    // partir das fontes presentes na base (distinctSources) -> todas são google_maps.
    const sourceSelect = page.locator('select').filter({ hasText: 'Todas as Fontes' });
    await expect(sourceSelect).toBeVisible();
    await expect(sourceSelect.locator('option', { hasText: 'google_maps' })).toHaveCount(1);

    await page.screenshot({ path: `${EVIDENCE_DIR}/lead-source-filter.png`, fullPage: true });
  });
});
