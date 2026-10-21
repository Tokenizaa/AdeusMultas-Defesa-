import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = 'https://adeusmulta.defesai.com.br';
fs.mkdirSync('artifacts/visual', { recursive: true });

const browser = await chromium.launch({ headless: false, slowMo: 600 });
const page = await browser.newPage();

async function shot(name) {
  await page.screenshot({ path: `artifacts/visual/${name}.png`, fullPage: true });
  console.log(`📸 ${name}.png`);
}

try {
  // 0. Home
  await page.goto(BASE_URL);
  await shot('00-home');

  // 1. Novo caso
  await page.goto(`${BASE_URL}/novo-caso`);
  await page.waitForTimeout(2000);
  await shot('01-novo-caso');

  // 2. Selecionar Defesa Prévia
  await page.locator('#service-option-multa_transito').click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /Aceitar e Continuar/i }).click();
  await page.waitForTimeout(2000);
  await shot('02-servico-selecionado');

  // 3. Selecionar fase: Primeira notificação
  await page.locator('#stage-option-primeira_notificacao').click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /Continuar/i }).last().click();
  await page.waitForTimeout(3000);
  await shot('03-fase-selecionada');

  // 4. ETAPA 2 - Identificação da Infração
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
  await shot('04-identificacao-preenchida');

  await page.locator('#btn-next-to-specifics').click();
  await page.waitForTimeout(3000);
  await shot('05-etapa-perguntas');

  // 5. ETAPA 3 - Perguntas do Caso (Radar)
  await page.fill('#input-speed-limit', '60');
  await page.fill('#input-measured-speed', '73');
  await page.fill('#input-considered-speed', '66');
  await page.fill('#input-inmetro-date', '2023-05-15');
  await page.fill('#input-radar-equipment-id', 'RADAR-12345');
  await shot('06-perguntas-radar');

  // 6. Executar Análise
  await page.locator('#btn-run-analysis').click();
  await page.waitForTimeout(12000);
  await shot('07-resultado-analise');

  // Verificar textos-chave do resultado
  const hasDiagnostico = await page.locator('text=/Diagnóstico Preliminar Concluído/i').count();
  const hasPotencial = await page.locator('text=/Alto potencial de anulação/i').count();
  const hasArtigo = await page.locator('text=/Art\\. 218/i').count();
  console.log(`✅ Diagnóstico: ${hasDiagnostico}, Potencial: ${hasPotencial}, Artigo: ${hasArtigo}`);

  // 7. Gerar Minha Defesa -> Auth Gate
  await page.locator('#btn-proceed-to-document-generation').click();
  await page.waitForTimeout(5000);
  await shot('08-auth-gate');

  // Verificar gate
  const hasGate = await page.locator('text=/Acesso à Sua Defesa Jurídica/i').count();
  const hasAuto = await page.locator('text=E2E-TEST-12345').count();
  console.log(`✅ Auth Gate: ${hasGate}, Auto vinculado: ${hasAuto}`);

  console.log('\n🎉 DEMO VISUAL COMPLETA!');
  console.log('📁 Screenshots em: artifacts/visual/');
  console.log('   00-home.png');
  console.log('   01-novo-caso.png');
  console.log('   02-servico-selecionado.png');
  console.log('   03-fase-selecionada.png');
  console.log('   04-identificacao-preenchida.png');
  console.log('   05-etapa-perguntas.png');
  console.log('   06-perguntas-radar.png');
  console.log('   07-resultado-analise.png');
  console.log('   08-auth-gate.png');

} catch (e) {
  console.error('❌ Erro:', e);
  await shot('error');
} finally {
  await browser.close();
}
