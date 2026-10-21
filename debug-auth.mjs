import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = 'https://adeusmulta.defesai.com.br';
const TEST_EMAIL = `e2e-teste-${Date.now()}@defesai.com.br`;
const TEST_PASSWORD = 'Teste@123456';
fs.mkdirSync('artifacts/visual-full', { recursive: true });

const browser = await chromium.launch({ headless: false, slowMo: 500 });
const page = await browser.newPage();

// Capturar erros de console e network
page.on('console', msg => console.log(`[CONSOLE ${msg.type()}]`, msg.text()));
page.on('response', resp => {
  if (resp.status() >= 400) console.log(`[NETWORK ${resp.status()}]`, resp.url());
});
page.on('requestfailed', req => console.log(`[REQUEST FAILED]`, req.url(), req.failure()?.errorText));

async function shot(name) {
  await page.screenshot({ path: `artifacts/visual-full/${name}.png`, fullPage: true });
  console.log(`📸 ${name}.png`);
}

try {
  console.log(`🔐 Email de teste: ${TEST_EMAIL}`);
  
  // ===== ONBOARDING RÁPIDO =====
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
  await page.waitForTimeout(12000);
  await shot('01-resultado');
  
  // ===== AUTH GATE =====
  await page.locator('#btn-proceed-to-document-generation').click();
  await page.waitForTimeout(3000);
  await shot('02-auth-gate');
  
  // Click "Criar Nova Conta" tab
  await page.getByRole('tab', { name: /Criar Nova Conta/i }).click();
  await page.waitForTimeout(500);
  await shot('03-tab-cadastro');
  
  // Preencher cadastro
  await page.fill('input[placeholder="Ex: Carlos Eduardo Silveira"]', 'João da Silva Teste E2E');
  await page.fill('input[placeholder="(11) 98765-4321"]', '(11) 99999-9999');
  await page.fill('input[placeholder="seu.email@exemplo.com.br"]', TEST_EMAIL);
  await page.fill('input[placeholder="Mínimo 6 caracteres"]', TEST_PASSWORD);
  await page.fill('input[placeholder="Repita sua senha"]', TEST_PASSWORD);
  await page.locator('input[type="checkbox"]').check();
  await shot('04-cadastro-preenchido');
  
  console.log('\n>>> ENVIANDO CADASTRO...');
  await page.getByRole('button', { name: /Criar Conta & Prosseguir/i }).click();
  
  // Aguardar resposta e capturar erro
  await page.waitForTimeout(10000);
  await shot('05-pos-submit');
  
  // Verificar mensagens de erro na tela
  const errorElements = await page.locator('[role="alert"], .text-red, .error, [class*="error"], [class*="alert"]').all();
  console.log('\n=== ELEMENTOS DE ERRO ===');
  for (const el of errorElements) {
    const text = await el.textContent();
    if (text?.trim()) console.log(`  "${text?.trim()}"`);
  }
  
  // Verificar toasts/notificações
  const toasts = await page.locator('[class*="toast"], [class*="notification"], [role="status"]').all();
  console.log('\n=== TOASTS ===');
  for (const el of toasts) {
    const text = await el.textContent();
    if (text?.trim()) console.log(`  "${text?.trim()}"`);
  }
  
  // Verificar se ainda está no auth gate
  const stillAuthGate = await page.locator('text=/Acesso à Sua Defesa Jurídica/i').count();
  console.log(`\n🔐 Ainda no auth gate: ${stillAuthGate > 0}`);
  
  // URL final
  console.log('📍 URL final:', page.url());
  
} catch (e) {
  console.error('❌ Erro:', e);
  await shot('error');
} finally {
  await browser.close();
}
