import { chromium } from 'playwright';

const BASE_URL = 'https://adeusmulta.defesai.com.br';

const browser = await chromium.launch({ headless: false, slowMo: 300 });
const page = await browser.newPage();

await page.goto(`${BASE_URL}/novo-caso`);
await page.waitForTimeout(2000);

// Selecionar Defesa Prévia
await page.getByRole('button', { name: /Defesa Prévia/i }).click();
await page.waitForTimeout(500);
await page.getByRole('button', { name: /Aceitar e Continuar/i }).click();
await page.waitForTimeout(3000);

console.log('\n=== APÓS ACEITAR - URL:', page.url(), '===');

// Encontrar todos os inputs, comboboxes, botões
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

const labels = await page.locator('label').all();
console.log('\n=== LABELS ===');
for (const el of labels) {
  const text = await el.textContent();
  const forAttr = await el.getAttribute('for');
  console.log(`label for="${forAttr}": "${text?.trim()}"`);
}

await browser.close();
