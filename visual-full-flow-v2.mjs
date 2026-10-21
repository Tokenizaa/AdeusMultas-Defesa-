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

try {
  console.log(`🔐 Email de teste: ${TEST_EMAIL}`);
  
  // ===== ONBOARDING =====
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
  
  // ===== AUTH GATE =====
  await page.locator('#btn-proceed-to-document-generation').click();
  await page.waitForTimeout(5000);
  await shot('03-auth-gate');
  
  // Click "Criar Nova Conta" tab
  await page.getByRole('tab', { name: /Criar Nova Conta/i }).click();
  await page.waitForTimeout(1000);
  await shot('04-tab-cadastro');
  
  // Preencher cadastro (inputs sem ID, usar placeholder)
  await page.fill('input[placeholder="Ex: Carlos Eduardo Silveira"]', 'João da Silva Teste E2E');
  await page.fill('input[placeholder="(11) 98765-4321"]', '(11) 99999-9999');
  await page.fill('input[placeholder="seu.email@exemplo.com.br"]', TEST_EMAIL);
  await page.fill('input[placeholder="Mínimo 6 caracteres"]', TEST_PASSWORD);
  await page.fill('input[placeholder="Repita sua senha"]', TEST_PASSWORD);
  await page.locator('input[type="checkbox"]').check();
  await shot('05-cadastro-preenchido');
  
  // Submit
  await page.getByRole('button', { name: /Criar Conta & Prosseguir/i }).click();
  await page.waitForTimeout(15000);
  await shot('06-pos-cadastro');
  
  // ===== PÓS-CADASTRO: Verificar para onde foi =====
  const urlPosCadastro = page.url();
  console.log('\n📍 URL pós-cadastro:', urlPosCadastro);
  
  const botoes = await page.locator('button:visible').all();
  console.log('\n=== BOTÕES VISÍVEIS ===');
  for (const btn of botoes) {
    const text = await btn.textContent();
    const id = await btn.getAttribute('id');
    if (text?.trim()) console.log(`  id="${id}": "${text?.trim()}"`);
  }
  
  // ===== TENTAR ACESSAR DASHBOARD =====
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForTimeout(5000);
  await shot('07-dashboard');
  
  // Verificar casos
  const pageContent = await page.textContent('body');
  const temCaso = pageContent?.includes('E2E-TEST') || pageContent?.includes('ABC1D23');
  console.log(`\n✅ Caso encontrado no dashboard: ${temCaso}`);
  
  // Listar elementos do dashboard
  const links = await page.locator('a, button').all();
  console.log('\n=== LINKS/BOTÕES DASHBOARD ===');
  for (const el of links.slice(0, 30)) {
    const text = await el.textContent();
    const href = await el.getAttribute('href');
    if (text?.trim() && text.length > 2) console.log(`  "${text?.trim()}" ${href?`→ ${href}`:''}`);
  }
  
  // ===== TENTAR ACESSAR MEUS CASOS / MINHAS DEFESAS =====
  const urlsTentar = [
    `${BASE_URL}/meus-casos`,
    `${BASE_URL}/minhas-defesas`,
    `${BASE_URL}/casos`,
    `${BASE_URL}/painel`,
  ];
  
  for (const url of urlsTentar) {
    try {
      await page.goto(url);
      await page.waitForTimeout(3000);
      const content = await page.textContent('body');
      if (content?.includes('E2E-TEST') || content?.includes('12345')) {
        console.log(`\n🎯 Caso encontrado em: ${url}`);
        await shot(`08-caso-${url.split('/').pop()}`);
        break;
      }
    } catch (e) {}
  }
  
  console.log('\n🎉 FLUXO EXECUTADO!');
  console.log('📁 Screenshots em: artifacts/visual-full/');
  
} catch (e) {
  console.error('❌ Erro:', e);
  await shot('error');
} finally {
  await browser.close();
}
