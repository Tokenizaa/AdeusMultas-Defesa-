import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
await page.addInitScript(() => {
  localStorage.setItem('defesai_auth_session_v1', JSON.stringify({
    id: 'admin-test-id', name: 'Admin Teste', email: 'admin@defesai.com',
    role: 'admin', isAdmin: true,
  }));
});
await page.route('**/*', (route) => {
  const url = route.request().url();
  if (url.includes('supabase.co') || url.includes('supabase')) return route.abort();
  return route.continue();
});
await page.goto('http://localhost:3000/novo-caso', { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(3000);
console.log('H1 count:', await page.locator('h1').count());
for (let i = 0; i < 5; i++) {
  const t = await page.locator('h1').nth(i).innerText().catch(() => 'N/A');
  console.log('H1[' + i + ']:', JSON.stringify(t));
}
console.log('BODY:', JSON.stringify((await page.locator('body').innerText()).slice(0, 400)));
console.log('ERRORS:', errs.slice(0, 5));
await browser.close();
