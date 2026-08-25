import { test, expect } from '@playwright/test';

test('debug: check localStorage setting', async ({ page }) => {
    // Simulate a logged-in user via the localStorage auth fallback.
    async function forceLocalAuth(page: Page, user: Record<string, unknown>) {
        await page.addInitScript((mockUser) => {
            console.log('Setting localStorage with user:', mockUser);
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
    
    // Check what's in localStorage
    const storedUser = await page.evaluate(() => {
        const raw = localStorage.getItem('defesai_auth_session_v1');
        return raw ? JSON.parse(raw) : null;
    });
    console.log('Retrieved from localStorage:', storedUser);
    
    // Check if service option button exists
    const serviceButton = page.locator('#service-option-multa_transito');
    const count = await serviceButton.count();
    console.log(`Service option button count: ${count}`);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: '/tmp/debug-localstorage.png' });
});