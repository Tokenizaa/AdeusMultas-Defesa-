import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = 'https://adeusmulta.defesai.com.br';
fs.mkdirSync('artifacts/visual', { recursive: true });

const browser = await chromium.launch({ headless: false, slowMo: 400 });
const page = await browser.newPage();

async function shot(name) {
  await page.screenshot({ path: `artifacts/visual/${name}.png`, fullPage: true });
  console.log(`📸 ${name}.png`);
}

try {
  // 1. Home
  await page.goto(BASE_URL);
  await shot('01-home');

  // 2. Novo caso (wizard carrega direto)
  await page.goto(`${BASE_URL}/novo-caso`);
  await page.waitForSelector('textbox[name="Ex: Carlos Eduardo Silveira"]', { timeout: 15000 });
  await shot('02-wizard-inicio');

  // 3. Etapa 1: Identificação (Nome + WhatsApp + AIT + Placa + Órgão + Código + Data + Local)
  await page.fill('textbox[name="Ex: Carlos Eduardo Silveira"]', 'João da Silva Teste E2E');
  await page.fill('textbox[name="(11) 98765-4321"]', '(11) 99999-9999');
  await page.fill('textbox[name="Ex: 1B892014 ou R459201"]', 'E2E-TEST-12345');
  await page.fill('textbox[name="Ex: BRA2E19 ou ABC1234"]', 'ABC1D23');
  await page.locator('combobox[name="Ex: DETRAN-SP, CET-SP, PRF ou órgão municipal"]').selectOption({ label: /DETRAN.*SP/i });
  await page.locator('combobox:has(option[value="745-50"])').selectOption('745-50');
  await page.fill('textbox:near(:text("Data da Ocorrência"))', '15/10/2023');
  await page.fill('textbox[name="Ex: Av. Paulista, 1000 - São Paulo/SP"]', 'Av. Paulista, 1000 - São Paulo/SP');
  await shot('03-identificacao');

  // 4. Continuar para Perguntas do Caso
  await page.getByRole('button', { name: /Continuar para Perguntas/i }).click();
  await page.waitForSelector('text=/Perguntas do Caso|Etapa 2/i', { timeout: 15000 });
  await shot('04-perguntas-caso');

  // 5. Perguntas do caso (velocidade, radar, etc.)
  // Preencher campos de velocidade se existirem
  const velMedida = page.locator('textbox:near(:text("Velocidade medida"))').first();
  if (await velMedida.count()) {
    await velMedida.fill('75');
    await page.fill('textbox:near(:text("Velocidade considerada"))', '68');
    await page.fill('textbox:near(:text("Limite"))', '60');
    await page.fill('textbox:near(:text("Equipamento"))', 'RADAR-12345');
  }
  await shot('05-detalhes-radar');

  // 6. Continuar (pode ter várias etapas)
  for (let i = 0; i < 3; i++) {
    const btn = page.getByRole('button', { name: /Continuar|Analisar/i }).first();
    if (await btn.count() && await btn.isEnabled()) {
      await btn.click();
      await page.waitForTimeout(2000);
      await shot(`06-continua-${i}`);
    } else break;
  }

  // 7. Análise
  const btnAnalisar = page.getByRole('button', { name: /Analisar/i });
  if (await btnAnalisar.count() && await btnAnalisar.isEnabled()) {
    await btnAnalisar.click();
    await page.waitForURL(/\/caso\/[^/]+/, { timeout: 30000 });
    await shot('07-analise');
  }

  // 8. Resultado
  await page.waitForSelector('text=/Análise conclu|Resultado/i', { timeout: 30000 });
  await shot('08-resultado');

  // 9. Gate de documento
  await page.getByRole('button', { name: /Prosseguir.*documento|Gerar documento|Documento/i }).click();
  await page.waitForSelector('text=/Acesso à Sua Defesa Jurídica/i', { timeout: 10000 });
  await shot('09-auth-gate');

  console.log('✅ Demo completa! Screenshots em artifacts/visual/');
} catch (e) {
  console.error('❌', e);
  await shot('error');
} finally {
  await browser.close();
}
