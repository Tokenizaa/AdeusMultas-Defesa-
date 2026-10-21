import { chromium } from 'playwright';

const BASE_URL = 'https://adeusmulta.defesai.com.br';

const browser = await chromium.launch({ headless: false, slowMo: 500 });
const page = await browser.newPage();

await page.goto(`${BASE_URL}/novo-caso`);
await page.waitForTimeout(2000);

// 1. Selecionar Defesa Prévia (Multa de Trânsito)
await page.locator('#service-option-multa_transito').click();
await page.waitForTimeout(300);

// 2. Aceitar e Continuar
await page.getByRole('button', { name: /Aceitar e Continuar/i }).click();
await page.waitForTimeout(1000);

// 3. Selecionar "Recebi a primeira notificação"
await page.locator('#stage-option-primeira_notificacao').click();
await page.waitForTimeout(300);

// 4. Continuar
await page.getByRole('button', { name: /Continuar/i }).last().click();
await page.waitForTimeout(3000);

// === ETAPA 1: PREENCHER ===
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
await page.waitForTimeout(500);

// 5. Clicar Continuar para Perguntas do Caso
await page.locator('#btn-next-to-specifics').click();
await page.waitForTimeout(5000);

console.log('URL após etapa 1:', page.url());
await page.screenshot({ path: 'artifacts/visual/etapa2.png', fullPage: true });

// Encontrar inputs da etapa 2
const inputs = await page.locator('input, textarea, select').all();
console.log('\n=== INPUTS ETAPA 2 ===');
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
console.log('\n=== BOTÕES ETAPA 2 ===');
for (const el of buttons) {
  const text = await el.textContent();
  const disabled = await el.isDisabled();
  const id = await el.getAttribute('id');
  if (text?.trim()) console.log(`button${disabled ? ' [DISABLED]' : ''} id="${id}": "${text?.trim()}"`);
}

await browser.close();
