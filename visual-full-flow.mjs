import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = 'https://adeusmulta.defesai.com.br';
const TEST_EMAIL = `e2e-teste-${Date.now()}@defesai.com.br`;
const TEST_PASSWORD = 'Teste@123456';
fs.mkdirSync('artifacts/visual-full', { recursive: true });

const browser = await chromium.launch({ headless: false, slowMo: 800 });
const page = await browser.newPage();

async function shot(name) {
  await page.screenshot({ path: `artifacts/visual-full/${name}.png`, fullPage: true });
  console.log(`📸 ${name}.png`);
}

async function fillAuthGate(email, password) {
  // "Criar Nova Conta"
  await page.getByRole('button', { name: /Criar Nova Conta/i }).click();
  await page.waitForTimeout(1000);
  
  // Preencher cadastro
  await page.fill('input[placeholder="Ex: Carlos Eduardo Silveira"]', 'João da Silva Teste E2E');
  await page.fill('input[placeholder="(11) 98765-4321"]', '(11) 99999-9999');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]:first-of-type', password);
  await page.fill('input[type="password"]:last-of-type', password);
  await page.locator('input[type="checkbox"]').check();
  await shot('09-cadastro-preenchido');
  
  await page.getByRole('button', { name: /Criar Conta & Prosseguir/i }).click();
  await page.waitForTimeout(8000);
}

try {
  console.log(`🔐 Email de teste: ${TEST_EMAIL}`);
  
  // ===== ONBOARDING (já validado) =====
  await page.goto(`${BASE_URL}/novo-caso`);
  await page.waitForTimeout(2000);
  await shot('01-inicio');
  
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
  await shot('02-resultado');
  
  // ===== AUTH GATE + CADASTRO =====
  await page.locator('#btn-proceed-to-document-generation').click();
  await page.waitForTimeout(5000);
  await shot('03-auth-gate');
  
  await fillAuthGate(TEST_EMAIL, TEST_PASSWORD);
  await shot('10-pos-cadastro');
  
  // ===== PAGAMENTO (simulação) =====
  // Verificar se chegou na tela de pagamento/oferta
  const urlPosCadastro = page.url();
  console.log('URL pós-cadastro:', urlPosCadastro);
  
  // Botões possíveis: "Pagar", "Simular", "Gerar Documento", "Continuar"
  const botoesPagamento = await page.locator('button:visible').all();
  console.log('\n=== BOTÕES VISÍVEIS PÓS-CADASTRO ===');
  for (const btn of botoesPagamento) {
    const text = await btn.textContent();
    const id = await btn.getAttribute('id');
    if (text?.trim()) console.log(`  id="${id}": "${text?.trim()}"`);
  }
  
  // Tentar encontrar botão de pagamento/geração
  const btnPagar = page.locator('button:has-text("Pagar"), button:has-text("Gerar"), button:has-text("Continuar"), button:has-text("Confirmar")').first();
  if (await btnPagar.count()) {
    await btnPagar.click();
    await page.waitForTimeout(5000);
    await shot('11-pagamento');
  }
  
  // ===== DASHBOARD =====
  // Navegar para dashboard
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForTimeout(5000);
  await shot('12-dashboard');
  
  // Verificar casos do usuário
  const casos = await page.locator('text=/E2E-TEST|12345|ABC1D23/i').count();
  console.log(`\n✅ Casos encontrados no dashboard: ${casos}`);
  
  // Tentar abrir detalhes do caso
  const linkCaso = page.locator('a:has-text("E2E-TEST"), button:has-text("Ver"), a:has-text("Detalhes")').first();
  if (await linkCaso.count()) {
    await linkCaso.click();
    await page.waitForTimeout(3000);
    await shot('13-detalhes-caso');
  }
  
  // ===== DOCUMENTO GERADO =====
  // Procurar link/documento PDF
  const linkDoc = page.locator('a:has-text("PDF"), a:has-text("Documento"), a:has-text("Download"), button:has-text("Visualizar")').first();
  if (await linkDoc.count()) {
    await linkDoc.click();
    await page.waitForTimeout(3000);
    await shot('14-documento');
  }
  
  console.log('\n🎉 FLUXO COMPLETO EXECUTADO!');
  console.log('📁 Screenshots em: artifacts/visual-full/');
  
} catch (e) {
  console.error('❌ Erro:', e);
  await shot('error');
} finally {
  await browser.close();
}
