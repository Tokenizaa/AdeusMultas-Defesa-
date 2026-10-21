import { chromium } from 'playwright';

const BASE_URL = 'https://adeusmulta.defesai.com.br';

const browser = await chromium.launch({ headless: false, slowMo: 500 });
const page = await browser.newPage();

await page.goto(`${BASE_URL}/novo-caso`);
await page.waitForTimeout(2000);

await page.locator('#service-option-multa_transito').click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: /Aceitar e Continuar/i }).click();
await page.waitForTimeout(1000);
await page.locator('#stage-option-primeira_notificacao').click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: /Continuar/i }).last().click();
await page.waitForTimeout(3000);

// Etapa 1
await page.fill('#input-lead-name', 'João da Silva Teste E2E');
await page.fill('#input-lead-phone', '(11) 99999-9999');
await page.fill('#input-ait-number', 'E2E-TEST-12345');
await page.fill('#input-vehicle-plate', 'ABC1D23');
await page.fill('#input-autuador-body', 'DETRAN-SP');
await page.selectOption('#input-infraction-code', '745-50');
await page.fill('#input-datetime', '2023-10-15');
await page.fill('#input-notification-expedition-date', '2023-10-20');
await page.fill('#input-defense-deadline', '2023-11-10');
await page.fill('#input-location', 'Av. Paulista, 1000 - São Paulo/SP');
await page.locator('#btn-next-to-specifics').click();
await page.waitForTimeout(3000);

// Etapa 2 - Radar
await page.fill('#input-speed-limit', '60');
await page.fill('#input-measured-speed', '73');
await page.fill('#input-considered-speed', '66');
await page.fill('#input-inmetro-date', '2023-05-15');
await page.fill('#input-radar-equipment-id', 'RADAR-12345');
await page.waitForTimeout(300);

// 6. Executar Análise
await page.locator('#btn-run-analysis').click();
await page.waitForTimeout(10000);

console.log('URL após análise:', page.url());
await page.screenshot({ path: 'artifacts/visual/resultado.png', fullPage: true });

// Encontrar elementos do resultado
const buttons = await page.locator('button').all();
console.log('\n=== BOTÕES RESULTADO ===');
for (const el of buttons) {
  const text = await el.textContent();
  const disabled = await el.isDisabled();
  const id = await el.getAttribute('id');
  if (text?.trim()) console.log(`button${disabled ? ' [DISABLED]' : ''} id="${id}": "${text?.trim()}"`);
}

// Textos principais
const texts = await page.locator('h1, h2, h3, .text-lg, .text-xl').all();
console.log('\n=== TEXTOS DESTAQUE ===');
for (const el of texts) {
  const text = await el.textContent();
  if (text?.trim()) console.log(`"${text?.trim()}"`);
}

await browser.close();
