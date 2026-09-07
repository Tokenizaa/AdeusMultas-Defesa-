import { test, expect } from '@playwright/test';

test.describe('acessibilidade — landmarks e teclado', () => {
  test('expõe skip link, landmarks e controles nomeados', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('a[href="#conteudo-principal"]')).toHaveCount(1);
    await expect(page.locator('main#main-content')).toHaveCount(1);
    await expect(page.locator('#conteudo-principal')).toHaveCount(1);
    await expect(page.locator('#menu-navegacao')).toHaveCount(1);
    await expect(page.locator('#rodape')).toHaveCount(1);

    await expect(page.getByRole('navigation', { name: 'Atalhos e ferramentas de acessibilidade' })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Diminuir tamanho da fonte' })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Redefinir tamanho da fonte' })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Aumentar tamanho da fonte' })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Alternar modo de alto contraste' })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Abrir menu de navegação' })).toHaveCount(1);
  });

  test('atalhos Alt+1, Alt+2 e Alt+4 alcançam alvos persistentes', async ({ page }) => {
    await page.goto('/');

    await page.keyboard.press('Alt+1');
    await expect(page.locator('#conteudo-principal')).toBeFocused();

    await page.keyboard.press('Alt+2');
    await expect(page.locator('#menu-navegacao-trigger')).toBeFocused();

    await page.keyboard.press('Alt+4');
    await expect(page.locator('#rodape')).toBeFocused();
  });

  test('Alt+3 mantém busca como alvo quando disponível', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await page.keyboard.press('Alt+3');
    await expect(page.locator('#main-search')).toBeFocused();
  });
});
