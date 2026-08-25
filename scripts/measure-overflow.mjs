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
const ADMIN_SESSION = {
  id: 'usr_admin_defesai', name: 'Administrador DefesAi', email: 'admin@www.defesai.shop',
  role: 'admin', cpf: '000.111.222-33', phone: '(11) 99999-0000', cityState: 'Brasília/DF',
  createdAt: '2026-01-01T08:00:00.000Z',
};

for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
  const context = await browser.newContext({ viewport: vp, isMobile: vp.width <= 430 });
  const pg = await context.newPage();
  // restore auth seed using the correct storage key
  await pg.goto('http://localhost:3000/login');
  await pg.evaluate((session) => {
    localStorage.setItem('defesai_auth_session_v1', JSON.stringify(session));
  }, ADMIN_SESSION);
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
        const layout =
          document.querySelector('#menu-navegacao aside') || document.querySelector('#menu-navegacao') ? 'nav' : '';
        const hasUserBottomNav = !!document.querySelector('[class*="fixed bottom-0"]');
        return { overflow: doc, worst, layout, hasUserBottomNav, title: document.title.slice(0, 40) };
      });
      results.push({ vp: vpName, route, overflow: m.overflow, worst: m.worst, layout: m.layout, title: m.title, bottomNav: m.hasUserBottomNav });
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