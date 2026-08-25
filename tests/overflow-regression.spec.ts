import { test, expect, Page } from '@playwright/test';

/**
 * FASE 8 — Visual Regression: horizontal overflow across breakpoints.
 *
 * O objetivo é garantir que NENHUMA rota (pública, usuário ou admin) apresente
 * overflow horizontal (scroll lateral) em nenhum viewport mobile/tablet/desktop.
 * Mede document.scrollWidth vs clientWidth via getBoundingClientRect (ferramenta,
 * nunca "a olho") e, se houver overflow, identifica o elemento mais largo.
 *
 * O servidor é iniciado SEM variáveis Supabase (ver playwright.config.ts), então
 * o AuthContext usa o fallback determinístico de localStorage (sem rede externa).
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

const VIEWPORTS = [
  { name: 'mobile-360', width: 360, height: 740 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-414', width: 414, height: 896 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1280', width: 1280, height: 800 },
  { name: 'desktop-1440', width: 1440, height: 900 },
] as const;

// Rotas públicas (sem auth)
const PUBLIC_ROUTES = ['/', '/login', '/cadastro', '/novo-caso'];

// Rotas que exigem sessão (user) para renderizar o layout correto
const USER_ROUTES = ['/dashboard', '/cases', '/perfil', '/configuracoes'];

// Rota admin
const ADMIN_ROUTES = ['/admin'];

const ADMIN_SESSION = {
  id: 'usr_admin_defesai',
  name: 'Administrador DefesAi',
  email: 'admin@www.defesai.shop',
  role: 'admin',
  cpf: '000.111.222-33',
  phone: '(11) 99999-0000',
  cityState: 'Brasília/DF',
  createdAt: '2026-01-01T08:00:00.000Z',
};

const CITIZEN_SESSION = {
  id: 'usr_motorista_carlos',
  name: 'Carlos Eduardo Silveira',
  email: 'motorista@www.defesai.shop',
  role: 'citizen',
  cpf: '123.456.789-00',
  phone: '(11) 98765-4321',
  cnh: '05492817492',
  cityState: 'São Paulo/SP',
  createdAt: '2026-06-10T10:00:00.000Z',
};

/** Seeds localStorage auth BEFORE the page scripts run (fallback determinístico). */
async function seedAuth(page: Page, session: Record<string, unknown>) {
  await page.addInitScript((user) => {
    localStorage.setItem('defesai_auth_session_v1', JSON.stringify(user));
  }, session);
}

/**
 * Mede overflow horizontal de forma objetiva:
 *  - docScroll: scrollWidth - clientWidth do documentElement (0 = sem overflow)
 *  - se > 0, varre o DOM e retorna o elemento que mais ultrapassa o viewport
 */
async function measureOverflow(page: Page) {
  return page.evaluate(() => {
    const de = document.documentElement;
    const docOverflow = de.scrollWidth - de.clientWidth;

    let worst: { tag: string; cls: string; overflow: number } | null = null;
    if (docOverflow > 0) {
      const all = document.querySelectorAll('*');
      for (const el of all) {
        const r = el.getBoundingClientRect();
        const overflow = Math.max(0, r.right - de.clientWidth, 0 - r.left);
        if (!worst || overflow > worst.overflow) {
          const cls =
            typeof el.className === 'string' ? el.className.slice(0, 80) : '';
          worst = { tag: el.tagName, cls, overflow };
        }
      }
    }

    return {
      docOverflow,
      worst: worst ? `${worst.tag}.${worst.cls} (+${worst.overflow.toFixed(1)}px)` : null,
      bottomNav: !!document.querySelector('[class*="fixed bottom-0"]'),
      hasSafeArea: getComputedStyle(document.body).paddingBottom !== '',
    };
  });
}

// Constrói o caminho de teste: viewport × rota
function describeCell(vpName: string, route: string) {
  return `${vpName} ${route}`;
}

test.describe('Overflow visual regression (FASE 8)', () => {
  test.describe('Público', () => {
    for (const vp of VIEWPORTS) {
      for (const route of PUBLIC_ROUTES) {
        test(`${describeCell(vp.name, route)} sem overflow horizontal`, async ({
          page,
        }) => {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
          // Deixa a hidratação/efeitos assentarem sem depender de rede (que pode pendurar).
          await page.waitForTimeout(400);

          const m = await measureOverflow(page);
          expect(m.docOverflow, `overflow em ${route} (${vp.name}): ${m.worst}`).toBeLessThanOrEqual(0);
        });
      }
    }
  });

  test.describe('Usuário (autenticado)', () => {
    for (const vp of VIEWPORTS) {
      for (const route of USER_ROUTES) {
        test(`${describeCell(vp.name, route)} sem overflow horizontal`, async ({
          page,
        }) => {
          await seedAuth(page, CITIZEN_SESSION);
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(400);

          const m = await measureOverflow(page);
          expect(m.docOverflow, `overflow em ${route} (${vp.name}): ${m.worst}`).toBeLessThanOrEqual(0);
        });
      }
    }
  });

  test.describe('Admin (autenticado)', () => {
    for (const vp of VIEWPORTS) {
      for (const route of ADMIN_ROUTES) {
        test(`${describeCell(vp.name, route)} sem overflow horizontal`, async ({
          page,
        }) => {
          await seedAuth(page, ADMIN_SESSION);
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(400);

          const m = await measureOverflow(page);
          expect(m.docOverflow, `overflow em ${route} (${vp.name}): ${m.worst}`).toBeLessThanOrEqual(0);
        });
      }
    }
  });

  test.describe('Acessibilidade & layout mobile', () => {
    test('bottom nav presente no mobile do usuário e oculto no desktop', async ({ page }) => {
      await seedAuth(page, CITIZEN_SESSION);

      // Mobile 390 — bottom nav (fixed bottom-0) VISÍVEL e com safe-area
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });

      // Espera o UserLayout renderizar (bottom nav contém o rótulo "Meus Casos").
      const navMobile = page.locator('div.fixed.bottom-0:has-text("Meus Casos")');
      await expect(navMobile).toBeVisible();
      // safe-area: .bottom-nav-safe adiciona padding-bottom calc(env(safe-area...) + 0.75rem)
      const paddingBottom = await navMobile.evaluate((el) => getComputedStyle(el).paddingBottom);
      expect(paddingBottom, 'bottom nav deve ter padding bottom (safe-area)').not.toBe('0px');

      // Desktop 1280 — bottom nav deve estar OCULTO (md:hidden → display:none), não apenas ausente do DOM
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
      const navDesktop = page.locator('div.md\:hidden.fixed.bottom-0:has-text("Meus Casos")');
      await expect(navDesktop).toBeHidden();
    });
  });
});