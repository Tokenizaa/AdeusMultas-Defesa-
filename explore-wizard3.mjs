import { chromium } from 'playwright';

const BASE_URL = 'https://adeusmulta.defesai.com.br';

const browser = await chromium.launch({ headless: false, slowMo: 500 });
const page = await browser.newPage();

await page.goto(`${BASE_URL}/novo-caso`);
await page.waitForTimeout(2000);

// 1. Selecionar Defesa Prévia (Multa de Trânsito)
await page.locator('#service-option-multa_transito').click();
await page.waitForTimeout(500);

// 2. Aceitar e Continuar
await page.getByRole('button', { name: /Aceitar e Continuar/i }).click();
await page.waitForTimeout(2000);

// 3. Selecionar "Recebi a primeira notificação (Sem boleto)" - Defesa Prévia
await page.locator('#stage-option-primeira_notificacao').click();
await page.waitForTimeout(500);

// 4. Continuar
await page.getByRole('button', { name: /Continuar/i }).last().click();
await page.waitForTimeout(5000);

console.log('URL final:', page.url());
await page.screenshot({ path: 'artifacts/visual/wizard-loaded.png', fullPage: true });

// Encontrar inputs
const inputs = await page.locator('input, textarea, select').all();
console.log('\n=== INPUTS/SELECTS ===');
for (const el of inputs) {
  const tag = await el.evaluate(e => e.tagName);
  const type = await el.getAttribute('type');
  const name = await el.getAttribute('name');
  const placeholder = await el.getAttribute('placeholder');
  const id = await el.getAttribute('id');
  const ariaLabel = await el.getAttribute('aria-label');
  const value = await el.inputValue().catch(() => '');
  console.log(`${tag}${type ? `[${type}]` : ''} name="${name}" id="${id}" placeholder="${placeholder}" aria-label="${ariaLabel}" value="${value}"`);
}

const buttons = await page.locator('button').all();
console.log('\n=== BOTÕES ===');
for (const el of buttons) {
  const text = await el.textContent();
  const disabled = await el.isDisabled();
  const id = await el.getAttribute('id');
  console.log(`button${disabled ? ' [DISABLED]' : ''} id="${id}": "${text?.trim()}"`);
}

await browser.close();
