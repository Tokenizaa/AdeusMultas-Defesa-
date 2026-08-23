import { test, expect } from '@playwright/test';

test('debug: check what is rendered after navigation', async ({ page }) => {
    // Simulate a logged-in user via the localStorage auth fallback.
    async function forceLocalAuth(page: Page, user: Record<string, unknown>) {
        await page.addInitScript((mockUser) => {
            localStorage.setItem('defesai_auth_session_v1', JSON.stringify(mockUser));
        }, user);
    }

    const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

    // Set admin auth
    const ADMIN_USER = {
        id: 'admin-test-id',
        name: 'Admin Teste',
        email: 'admin@defesai.com',
        cpf: '000.000.000-00',
        phone: '(11) 90000-0000',
        role: 'admin',
    };
    await forceLocalAuth(page, ADMIN_USER);
    
    // Go to onboarding page
    await page.goto(`${BASE_URL}/novo-caso`, { waitUntil: 'networkidle' });
    
    // Wait a bit to make sure things are rendered
    await page.waitForTimeout(1000);
    
    // Check what h1/h2/h3 elements are present
    const headers = await page.locator('h1, h2, h3').all();
    console.log(`Found ${headers.length} header elements`);
    for (let i = 0; i < headers.length; i++) {
        const text = await headers[i].textContent();
        console.log(`Header ${i}: "${text}"`);
    }
    
    // Check if service option button exists
    const serviceButton = page.locator('#service-option-multa_transito');
    const count = await serviceButton.count();
    console.log(`Service option button count: ${count}`);
    
    if (count > 0) {
        const isVisible = await serviceButton.isVisible();
        console.log(`Service option button is visible: ${isVisible}`);
    } else {
        // Check what buttons with id starting with 'service-option' exist
        const allServiceButtons = await page.locator('[id^="service-option"]').all();
        console.log(`Found ${allServiceButtons.length} buttons with id starting with 'service-option'`);
        for (let i = 0; i < allServiceButtons.length; i++) {
            const id = await allServiceButtons[i].getAttribute('id');
            const text = await allServiceButtons[i].textContent();
            console.log(`  Button ${i}: id="${id}", text="${text}"`);
        }
    }
    
    // Take a screenshot for debugging
    await page.screenshot({ path: '/tmp/debug-screenshot.png' });
});