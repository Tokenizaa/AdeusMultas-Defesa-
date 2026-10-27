import { test, expect } from '@playwright/test';

const ADMIN_ROUTES = [
  // Core admin routes (entries 1-4)
  { route: '/admin', name: 'Visão Geral' },
  { route: '/admin/cases', name: 'Operação — Casos' },
  { route: '/admin/users', name: 'Operação — Usuários' },
  { route: '/admin/payments', name: 'Operação — Pagamentos' },
  
  // Marketing routes (entries 5-11)
  { route: '/admin/marketing?view=dashboard', name: 'Operação de Marketing — Dashboard' },
  { route: '/admin/marketing?view=inbox', name: 'Operação de Marketing — Inbox' },
  { route: '/admin/marketing?view=contents', name: 'Operação de Marketing — Contents' },
  { route: '/admin/marketing?view=studio', name: 'Operação de Marketing — Studio' },
  { route: '/admin/marketing?view=channels', name: 'Operação de Marketing — Channels' },
  { route: '/admin/marketing?view=results', name: 'Operação de Marketing — Results' },
  { route: '/admin/marketing?view=settings', name: 'Operação de Marketing — Settings' },
  
  // Prospecting routes (entries 12-17)
  { route: '/admin/marketing/prospecting', name: 'Prospecção B2B — Visão Geral' },
  { route: '/admin/marketing/prospecting/leads', name: 'Prospecção B2B — Leads' },
  { route: '/admin/marketing/prospecting/campaigns', name: 'Prospecção B2B — Campanhas' },
  { route: '/admin/marketing/prospecting/automation', name: 'Prospecção B2B — Automação' },
  { route: '/admin/marketing/prospecting/queue', name: 'Prospecção B2B — Fila' },
  { route: '/admin/marketing/prospecting/collection', name: 'Prospecção B2B — Coleta' },
  
  // Commercial routes (entries 18-24)
  { route: '/admin/commercial', name: 'Gestão Comercial' },
  { route: '/admin/commercial/prices', name: 'Gestão Comercial — Preços' },
  { route: '/admin/commercial/promotions', name: 'Gestão Comercial — Promoções' },
  { route: '/admin/commercial/coupons', name: 'Gestão Comercial — Cupons' },
  { route: '/admin/commercial/bonuses', name: 'Gestão Comercial — Bônus' },
  { route: '/admin/commercial/referrals', name: 'Gestão Comercial — Referrals' },
  { route: '/admin/commercial/commissions', name: 'Gestão Comercial — Comissões' },
  { route: '/admin/commercial/settings', name: 'Gestão Comercial — Settings' },
  
  // Intelligence routes (entries 25-26)
  { route: '/admin/ai', name: 'Inteligência — IA' },
  { route: '/admin/knowledge', name: 'Inteligência — Base Jurídica' },
  
  // System routes (entries 27-30)
  { route: '/admin/integrations', name: 'Sistema — Integrações' },
  { route: '/admin/settings', name: 'Sistema — Configurações' },
  { route: '/admin/monitoring', name: 'Sistema — Monitoramento' },
  { route: '/admin/audit', name: 'Sistema — Auditoria' },
  
  // E2E tests routes (entries 31-32)
  { route: '/admin/e2e-tests/stats', name: 'E2E Tests — Estatísticas' },
  { route: '/admin/e2e-tests/runs', name: 'E2E Tests — Execuções' },
];

test('admin panel debug - capture console errors per route', async ({ page }) => {
  for (const { route, name } of ADMIN_ROUTES) {
    console.log(`\n===== ${name} (${route}) =====`);
    
    const consoleErrors: string[] = [];
    
    // Capture ALL console messages
    const consoleHandler = async (msg: any) => {
      const text = msg.text();
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        consoleErrors.push(`[${type}] ${text}`);
      }
    };
    page.on('console', consoleHandler);
    
    // Also capture page JS errors
    const jsErrors: string[] = [];
    const pageErrorHandler = async (err: any) => {
      jsErrors.push(err.message);
    };
    page.on('pageerror', pageErrorHandler);
    
    await page.goto(route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Get element counts
    const h1Count = await page.locator('h1').count();
    const h2Count = await page.locator('h2').count();
    const tableCount = await page.locator('table').count();
    const divCount = await page.locator('div').count();
    const buttonCount = await page.locator('button').count();
    
    console.log(`Console errors (${consoleErrors.length}):`);
    consoleErrors.forEach((err, i) => console.log(`  ${i+1}. ${err}`));
    
    console.log(`JS Errors: ${jsErrors.length}`);
    jsErrors.forEach((err, i) => console.log(`  ${i+1}. ${err}`));
    
    console.log(`Elementos: h1=${h1Count}, h2=${h2Count}, table=${tableCount}, div=${divCount}, button=${buttonCount}`);
    
    // Remove listeners for next route
    page.off('console', consoleHandler);
    page.off('pageerror', pageErrorHandler);
  }
});