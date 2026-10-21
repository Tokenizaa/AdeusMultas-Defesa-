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

await page.fill('#input-speed-limit', '60');
await page.fill('#input-measured-speed', '73');
await page.fill('#input-considered-speed', '66');
await page.fill('#input-inmetro-date', '2023-05-15');
await page.fill('#input-radar-equipment-id', 'RADAR-12345');
await page.locator('#btn-run-analysis').click();
await page.waitForTimeout(10000);

// 7. Gerar Minha Defesa -> Auth Gate
await page.locator('#btn-proceed-to-document-generation').click();
await page.waitForTimeout(5000);

console.log('URL auth gate:', page.url());
await page.screenshot({ path: 'artifacts/visual/auth-gate.png', fullPage: true });

// Encontrar elementos do auth gate
const buttons = await page.locator('button').all();
console.log('\n=== BOTÕES AUTH GATE ===');
for (const el of buttons) {
  const text = await el.textContent();
  const disabled = await el.isDisabled();
  const id = await el.getAttribute('id');
  if (text?.trim()) console.log(`button${disabled ? ' [DISABLED]' : ''} id="${id}": "${text?.trim()}"`);
}

const inputs = await page.locator('input, textarea, select').all();
console.log('\n=== INPUTS AUTH GATE ===');
for (const el of inputs) {
  const tag = await el.evaluate(e => e.tagName);
  const type = await el.getAttribute('type');
  const name = await el.getAttribute('name');
  const placeholder = await el.getAttribute('placeholder');
  const id = await el.getAttribute('id');
  console.log(`${tag}${type ? `[${type}]` : ''} name="${name}" id="${id}" placeholder="${placeholder}"`);
}

const texts = await page.locator('h1, h2, h3, h4, p').all();
console.log('\n=== TEXTOS AUTH GATE ===');
for (const el of texts) {
  const text = await el.textContent();
  if (text?.trim() && text.length > 5) console.log(`"${text?.trim()}"`);
}

await browser.close();
