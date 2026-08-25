/* Measure horizontal overflow across routes + viewports.
   Uses the running dev server (localhost:3000) with localStorage-auth fallback. */
import { chromium } from '@playwright/test';

const VIEWPORTS = {
  'mobile-320':  { width: 320,  height: 568 },
  'mobile-390':  { width: 390,  height: 844 },
  'mobile-430':  { width: 430,  height: 932 },
  'tablet-768':  { width: 768,  height: 1024 },
  'desktop-1440':{ width: 1440, height: 900 },
  'desktop-1920':{ width: 1920, height: 1080 },
};

const ROUTES = ['/', '/login', '/cadastro', '/novo-caso', '/dashboard', '/cases', '/perfil', '/checkout', '/admin'];

const browser = await chromium.launch();
const results = [];

// Seed an authenticated session (localStorage fallback) so /dashboard,/cases,/admin render.
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/login');
await page.evaluate(() => {
  localStorage.setItem('defesai_auth_user', JSON.stringify({ id: 'seed', name: 'Condutor Teste', email: 'c@t.com', role: 'admin', isAdmin: true }));
});
await page.close();
await ctx.close();

for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
  const context = await browser.newContext({ viewport: vp, isMobile: vp.width <= 430 });
  const pg = await context.newPage();
  // restore auth seed
  await pg.goto('http://localhost:3000/login');
  await pg.evaluate(() => {
    localStorage.setItem('defesai_auth_user', JSON.stringify({ id: 'seed', name: 'Condutor Teste', email: 'c@t.com', role: 'admin', isAdmin: true }));
  });
  for (const route of ROUTES) {
    try {
      await pg.goto('http://localhost:3000' + route, { waitUntil: 'networkidle' });
      await pg.waitForTimeout(300);
      const m = await pg.evaluate(() => {
        const de = document.documentElement;
        const doc = de.scrollWidth - de.clientWidth;
        // find widest element causing overflow
        let worst = null, worstOverflow = 0;
        if (doc > 0) {
          const all = document.querySelectorAll('*');
          for (const el of all) {
            const r = el.getBoundingClientRect();
            const overflow = Math.max(0, r.right - de.clientWidth, 0 - r.left);
            if (overflow > worstOverflow) { worstOverflow = overflow; worst = `${el.tagName}.${el.className?.toString().slice(0,60)}`; }
          }
        }
        return { overflow: doc, worst, title: document.title.slice(0, 40) };
      });
      results.push({ vp: vpName, route, overflow: m.overflow, worst: m.worst, title: m.title });
    } catch (e) {
      results.push({ vp: vpName, route, error: String(e.message).slice(0, 60) });
    }
  }
  await context.close();
}
await browser.close();

// Report
console.log('\n=== HORIZONTAL OVERFLOW REPORT ===');
let hasOverflow = 0;
for (const r of results) {
  const flag = r.overflow > 0 ? '❌ OVERFLOW' : (r.error ? '❌ ERROR' : '✅ ok');
  if (r.overflow > 0 || r.error) hasOverflow++;
  console.log(`${flag.padEnd(12)} ${(r.vp||'').padEnd(14)} ${(r.route||'').padEnd(14)} overflow=${r.overflow ?? '-'}${r.worst ? ' worst=' + r.worst : ''}${r.error ? ' err=' + r.error : ''}`);
}
console.log(`\nTotal issues: ${hasOverflow}/${results.length}`);