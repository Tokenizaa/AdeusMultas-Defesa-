import { test, expect } from '@playwright/test';

test.describe('Admin — Gerenciamento de Preços via Frontend', () => {
  test('login admin e edita preço do recurso_jari para R$2,00', async ({ page }) => {
    // 1. Navegar para a página de login
    await page.goto('http://localhost:3000/login?redirect=%2Fadmin%2Fcommercial%2Fprices');
    await page.waitForLoadState('networkidle');
    console.log('Na página de login:', page.url());

    // 2. Preencher credenciais do admin
    await page.locator('input[name="email"], input[type="email"], input#input-email').fill('admin@teste.local');
    await page.locator('input[name="password"], input[type="password"], input#input-password').fill('test-password');
    await page.locator('button[type="submit"], button:contains("Entrar"), button:contains("Login"), button#btn-login').click();

    // 3. Aguardar redirecionamento para o admin
    await page.waitForURL('**/admin**', { timeout: 15000 });
    console.log('Após login:', page.url());

    // 4. Navegar para Gestão Comercial → Preços
    await page.waitForTimeout(2000);
    
    // Verificar se estamos no dashboard admin, navegar para preços
    if (!page.url().includes('/commercial/prices')) {
      await page.goto('http://localhost:3000/admin/commercial/prices');
      await page.waitForLoadState('networkidle');
    }
    
    console.log('Na página de preços:', page.url());

    // 5. Verificar que cards de preço carregaram
    const pricingCards = page.locator('.bg-slate-900/90.border-slate-800');
    await expect(pricingCards.first()).toBeVisible({ timeout: 10000 });
    
    const cardCount = await pricingCards.count();
    console.log('Quantidade de cards de preço:', cardCount);

    // 6. Pegar preço atual do primeiro card
    const firstCard = pricingCards.first();
    const currentPrice = await firstCard.locator('text=R$').first().textContent();
    console.log('Preço atual antes da edição:', currentPrice);

    // 7. Clicar em "Alterar Preço"
    await firstCard.locator('text=Alterar Preço').click();
    await page.waitForTimeout(1000);
    
    // Verificar se modal abriu
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    console.log('Modal de edição aberto');

    // 8. Preencher novo preço R$2,00
    await page.locator('input[step="0.01"][min="1"]').first().fill('2');
    await page.locator('input[step="0.01"][placeholder*="Deixar em branco"]').fill('2');
    await page.locator('textarea[required]').fill('Ajuste de teste R$2 via Playwright E2E');
    console.log('Campos preenchidos com R$2,00');

    // 9. Clicar em "Salvar Alteração"
    await page.locator('button:contains("Salvar Alteração")').click();
    await page.waitForTimeout(3000);

    // 10. Verificar mensagem de sucesso
    const successMsg = page.locator('.bg-emerald-500/20, .text-emerald-300');
    const successVisible = await successMsg.isVisible();
    console.log('Mensagem de sucesso visível:', successVisible);
    if (successVisible) {
      const successText = await successMsg.textContent();
      console.log('Texto de sucesso:', successText);
    }

    // 11. Verificar se o preço foi atualizado no card
    const updatedPrice = await firstCard.locator('text=R$').first().textContent();
    console.log('Preço após edição:', updatedPrice);

    const priceValue = parseFloat(updatedPrice?.replace('R$', '').replace(',', '.').trim() || '0');
    console.log('Valor numérico do preço:', priceValue);

    // 12. Fechar modal ou navegar away
    try {
      await page.locator('button:contains("Fechar")').first().click();
    } catch {
      // Modal pode ter fechado automaticamente
    }

    // 13. Verificar que o preço mudou de R$89,90 para R$2,00
    expect(priceValue).toBe(2);

    console.log('✅ Teste concluído: preço alterado com sucesso para R$2,00');
  });
});
