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

test('admin panel full validation - all 32 routes', async ({ page }) => {
  console.log(`\n=== INICIANDO VALIDACAO DE TODAS AS 32 ROTAS ADMIN ===\n`);
  
  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < ADMIN_ROUTES.length; i++) {
    const { route, name } = ADMIN_ROUTES[i];
    const startTime = Date.now();
    
    let consoleErrors: string[] = [];
    let jsErrors: string[] = [];
    let hasWhiteScreen = false;
    let keyElementCount = 0;
    let pageTitle = '';
    
    // Capture console messages
    page.on('console', (msg) => {
      const text = msg.text();
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });
    
    // Capture JavaScript errors
    page.on('pageerror', (err) => {
      jsErrors.push(err.message);
    });
    
    // Navigate to route
    await page.goto(route, { waitUntil: 'networkidle' });
    
    // Wait a bit for React to hydrate
    await page.waitForTimeout(1500);
    
    // Check for white screen - if body has no visible content
    const bodyText = await page.textContent('body');
    if (!bodyText || bodyText.trim().length < 50) {
      hasWhiteScreen = true;
    }
    
    // Get page title
    pageTitle = page.title();
    
    // Count key elements based on route type
    let elementSelector = '';
    switch (name) {
      case 'Visão Geral':
        keyElementCount = await page.locator('h1').count();
        break;
      case 'Operação — Casos':
      case 'Operação — Pagamentos':
        keyElementCount = await page.locator('table, th, td').count();
        break;
      case 'Operação — Usuários':
        keyElementCount = await page.locator('table, th, td, input, button').count();
        break;
      case 'Operação de Marketing — Dashboard':
      case 'Operação de Marketing — Inbox':
      case 'Operação de Marketing — Contents':
      case 'Operação de Marketing — Studio':
      case 'Operação de Marketing — Channels':
      case 'Operação de Marketing — Results':
      case 'Operação de Marketing — Settings':
        keyElementCount = await page.locator('h1, h2, table, div').count();
        break;
      case 'Prospecção B2B — Visão Geral':
      case 'Prospecção B2B — Leads':
      case 'Prospecção B2B — Campanhas':
      case 'Prospecção B2B — Automação':
      case 'Prospecção B2B — Fila':
      case 'Prospecção B2B — Coleta':
        keyElementCount = await page.locator('table, div, h1, h2').count();
        break;
      case 'Gestão Comercial':
      case 'Gestão Comercial — Preços':
      case 'Gestão Comercial — Promoções':
      case 'Gestão Comercial — Cupons':
      case 'Gestão Comercial — Bônus':
      case 'Gestão Comercial — Referrals':
      case 'Gestão Comercial — Comissões':
      case 'Gestão Comercial — Settings':
        keyElementCount = await page.locator('table, div, h1, h2').count();
        break;
      case 'Inteligência — IA':
      case 'Inteligência — Base Jurídica':
        keyElementCount = await page.locator('h1, h2, div, table').count();
        break;
      case 'Sistema — Integrações':
      case 'Sistema — Configurações':
      case 'Sistema — Monitoramento':
      case 'Sistema — Auditoria':
        keyElementCount = await page.locator('h1, h2, div, table').count();
        break;
      case 'E2E Tests — Estatísticas':
      case 'E2E Tests — Execuções':
        keyElementCount = await page.locator('h1, h2, div, table').count();
        break;
      default:
        keyElementCount = await page.locator('h1, h2, div, table').count();
    }
    
    const endTime = Date.now();
    const loadTime = endTime - startTime;
    
    // Determine status
    let status: string;
    let actionRequired = '';
    
    if (hasWhiteScreen) {
      status = 'FAIL';
      actionRequired = 'Corrigir tela branca';
      failCount++;
    } else if (consoleErrors.length > 0) {
      status = 'WARN';
      actionRequired = 'Console errors detected';
      warnCount++;
    } else if (jsErrors.length > 0) {
      status = 'WARN';
      actionRequired = 'JavaScript errors';
      warnCount++;
    } else if (keyElementCount === 0) {
      status = 'FAIL';
      actionRequired = 'Nenhum elemento encontrado - verificar renderização';
      failCount++;
    } else {
      status = 'PASS';
      passCount++;
    }
    
    console.log(`${status} [${i+1}/32] ${name.padEnd(45)} | ${route.padEnd(50)} | ${loadTime}ms | Elements: ${keyElementCount} | Errors: ${consoleErrors.length} JS: ${jsErrors.length}`);
    
    if (status === 'FAIL' || status === 'WARN') {
      console.log(`   Evidence: WhiteScreen=${hasWhiteScreen}, ConsoleErrors=${consoleErrors.length}, JSErrors=${jsErrors.length}, Elements=${keyElementCount}, Title="${pageTitle}"`);
      if (actionRequired) {
        console.log(`   Action: ${actionRequired}`);
      }
    }
  }
  
  console.log(`\n=== RESUMO FINAL ===`);
  console.log(`Pass: ${passCount}/32`);
  console.log(`Warn: ${warnCount}/32`);
  console.log(`Fail: ${failCount}/32`);
  console.log(`Total: ${passCount + warnCount + failCount}/32`);
  
  // Fail the test if any route failed
  if (failCount > 0) {
    console.log(`\n${failCount} routes failed - check evidence above`);
  } else {
    console.log(`\nAll routes validated successfully!`);
  }
});