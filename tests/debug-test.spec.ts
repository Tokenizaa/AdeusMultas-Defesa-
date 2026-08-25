import { test, expect } from '@playwright/test';

test('simple copy of happy-path test', async ({ page }) => {
    // Simulate a logged-in user via the localStorage auth fallback.
    // The dev server is launched WITHOUT Supabase env vars (see playwright.config.ts),
    // so AuthContext reads this storage key directly with no network calls.
    async function forceLocalAuth(page: Page, user: Record<string, unknown>) {
        await page.addInitScript((mockUser) => {
            localStorage.setItem('defesai_auth_session_v1', JSON.stringify(mockUser));
        }, user);
    }

    const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

    async function navigateToOnboarding(page: Page) {
        await page.goto(`${BASE_URL}/novo-caso`, { waitUntil: 'networkidle' });
        await waitForStep(page, 1);
    }

    function getStepTitle(step: number): string {
        const titles: Record<number, string> = {
            1: 'Qual situação você quer resolver?',
            2: 'Em que situação está sua multa?',
            3: 'Sobre o tipo da infração',
            4: 'Qual é o auto de infração e o condutor?',
            5: 'Detalhes técnicos da sua autuação',
            6: 'Processando Análise Jurídica',
            7: 'Diagnóstico Jurídico Gratuito Concluído', // badge div in FreeAnalysisResultStep
            8: 'Qualificação do Requerente para a Peça',
            9: 'Revisão dos Dados da Petição',
            10: 'Liberação da Petição & Checklist de Protocolo',
        };
        return titles[step] || `Etapa ${step}`;
    }

    async function waitForStep(page: Page, step: number) {
        const title = getStepTitle(step);
        await expect(
            page.locator(`h1:has-text("${title}"), h2:has-text("${title}"), h3:has-text("${title}")`)
        ).toBeVisible();
    }

    // Test exactly like the working happy-path test
    await navigateToOnboarding(page);

    // Step 1: service selection
    await expect(page.locator('#service-option-multa_transito')).toBeVisible();
    await page.click('#service-option-multa_transito');
    await waitForStep(page, 2); // Now at step 2: stage selection

    // Step 2: stage selection
    await expect(page.locator('#stage-option-primeira_notificacao')).toBeVisible();
    await page.click('#stage-option-primeira_notificacao');
    await waitForStep(page, 3); // Now at step 3: infraction category selection

    // Step 3: category selection (Velocidade)
    await expect(page.locator('#category-card-excesso_velocidade')).toBeVisible();
    await page.click('#category-card-excesso_velocidade');
    await page.click('#btn-next-to-identification');
    await waitForStep(page, 4); // Now at step 4: infraction identification

    // Step 4: fill identification form
    await page.fill('#input-lead-name', 'João Pereira Lima');
    await page.fill('#input-lead-phone', '(11) 98765-4321');
    await page.fill('#input-ait-number', '1B892014');
    await page.fill('#input-vehicle-plate', 'BRA2E19');
    await page.selectOption('#input-infraction-code', '745-50');
    await page.selectOption('#input-autuador-body', 'DETRAN-SP');
    await page.fill('#input-datetime', '2024-01-15');

    const nextBtn = page.locator('#btn-next-to-specifics');
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();
    await waitForStep(page, 5); // Now at step 5: specific infraction data

    // Step 5: speed fields + run analysis (clock fast-forwards step 6)
    await page.fill('#input-speed-limit', '60');
    await page.fill('#input-measured-speed', '73');
    await page.waitForTimeout(300);
    await page.click('#btn-run-analysis');
    await waitForStep(page, 6);
    // Step 7 badge is raw text inside a div (FreeAnalysisResultStep), not a heading
    const badge = page.getByText(getStepTitle(7)).first();
    for (let i = 0; i < 8 && !(await badge.isVisible().catch(() => false)); i++) {
        await page.clock.fastForward(1000);
        await page.waitForTimeout(50);
    }
    await expect(badge).toBeVisible();

    // Step 7: free result visible with probability + CTA
    await expect(page.locator('text=Probabilidade de Êxito')).toBeVisible();
    await expect(page.locator('#btn-proceed-to-document-generation')).toBeVisible();
});