import { chromium } from 'playwright';

const BASE_URL = 'https://adeusmulta.defesai.com.br';

const browser = await chromium.launch({ headless: false, slowMo: 500 });
const page = await browser.newPage();

await page.goto(`${BASE_URL}/novo-caso`);
await page.waitForTimeout(3000);

console.log('URL inicial:', page.url());

// Clicar no botão "Continuar" dentro do card de Defesa Prévia
// O botão tem id="service-option-conversao_advertencia" para Conversão, mas Defesa Prévia é "service-option-multa_transito"
const btnDefesaPrevia = page.locator('#service-option-multa_transito');
await btnDefesaPrevia.click();
console.log('Clicou no card Defesa Prévia');
await page.waitForTimeout(1000);

// Agora clicar em "Aceitar e Continuar"
await page.getByRole('button', { name: /Aceitar e Continuar/i }).click();
console.log('Clicou em Aceitar e Continuar');
await page.waitForTimeout(5000);

console.log('URL final:', page.url());

// Capturar screenshot
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
