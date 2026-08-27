import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function validateBrandingAndOG() {
  console.log('====================================================');
  console.log('🔍 INICIANDO VALIDAÇÃO DE LOGO + OPEN GRAPH META');
  console.log('====================================================\n');

  let hasErrors = false;

  // 1. Validar existência dos arquivos de branding
  const expectedFiles = [
    'public/logo.svg',
    'public/logo.png',
    'public/logo-light.svg',
    'public/logo-light.png',
    'public/logo-dark.svg',
    'public/logo-dark.png',
    'public/logo-icon.svg',
    'public/logo-icon.png',
    'public/favicon.svg',
    'public/favicon.png',
    'public/og-image.svg',
    'public/og-image.png',
    'public/og-image.jpg',
  ];

  console.log('1️⃣  Verificando integridade dos assets no sistema de arquivos:');
  for (const relPath of expectedFiles) {
    const fullPath = path.resolve(relPath);
    if (!fs.existsSync(fullPath)) {
      console.error(`  ❌ Arquivo ausente: ${relPath}`);
      hasErrors = true;
    } else {
      const stats = fs.statSync(fullPath);
      console.log(`  ✅ ${relPath} (${stats.size} bytes)`);
    }
  }

  // 2. Validar dimensões da imagem de Open Graph
  console.log('\n2️⃣  Verificando dimensões e proporção da imagem OG (1200x630):');
  try {
    const metadata = await sharp(path.resolve('public/og-image.png')).metadata();
    if (metadata.width === 1200 && metadata.height === 630) {
      console.log(`  ✅ og-image.png possui dimensões exatas: ${metadata.width}x${metadata.height}px (Formato: ${metadata.format})`);
    } else {
      console.error(`  ❌ og-image.png com dimensões incorretas: ${metadata.width}x${metadata.height}px (esperado 1200x630)`);
      hasErrors = true;
    }
  } catch (err) {
    console.error('  ❌ Erro ao inspecionar og-image.png com sharp:', err);
    hasErrors = true;
  }

  // 3. Validar index.html e tags Open Graph / Twitter Card
  console.log('\n3️⃣  Verificando meta tags no index.html:');
  const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf-8');

  const requiredPatterns = [
    { name: 'og:title', pattern: /<meta property="og:title" content="[^"]+"/ },
    { name: 'og:description', pattern: /<meta property="og:description" content="[^"]+"/ },
    { name: 'og:image', pattern: /<meta property="og:image" content="https:\/\/[^"]+\/og-image\.png"/ },
    { name: 'og:url', pattern: /<meta property="og:url" content="https:\/\/[^"]+"/ },
    { name: 'og:type', pattern: /<meta property="og:type" content="website"/ },
    { name: 'og:site_name', pattern: /<meta property="og:site_name" content="Adeus Multas"/ },
    { name: 'og:locale', pattern: /<meta property="og:locale" content="pt_BR"/ },
    { name: 'twitter:card', pattern: /<meta name="twitter:card" content="summary_large_image"/ },
    { name: 'twitter:title', pattern: /<meta name="twitter:title" content="[^"]+"/ },
    { name: 'twitter:description', pattern: /<meta name="twitter:description" content="[^"]+"/ },
    { name: 'twitter:image', pattern: /<meta name="twitter:image" content="https:\/\/[^"]+\/og-image\.png"/ },
    { name: 'favicon svg', pattern: /<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg"/ },
    { name: 'favicon png', pattern: /<link rel="icon" type="image\/png" sizes="64x64" href="\/favicon\.png"/ },
    { name: 'canonical url', pattern: /<link rel="canonical" href="https:\/\/[^"]+"/ },
  ];

  for (const { name, pattern } of requiredPatterns) {
    if (pattern.test(indexHtml)) {
      console.log(`  ✅ Tag obrigatória presente: ${name}`);
    } else {
      console.error(`  ❌ Tag ausente ou inválida: ${name}`);
      hasErrors = true;
    }
  }

  // 4. Checagem de Proibições: Sem localhost ou 127.0.0.1 nas tags OG
  console.log('\n4️⃣  Verificando conformidade de segurança e URLs canônicas:');
  const forbiddenPatterns = [
    { name: 'localhost no index.html', pattern: /content="[^"]*localhost[^"]*"/ },
    { name: '127.0.0.1 no index.html', pattern: /content="[^"]*127\.0\.0\.1[^"]*"/ },
    { name: 'caminho relativo em og:image', pattern: /<meta property="og:image" content="(?!\s*https?:\/\/)/ },
  ];

  for (const { name, pattern } of forbiddenPatterns) {
    if (pattern.test(indexHtml)) {
      console.error(`  ❌ Violação encontrada: ${name}`);
      hasErrors = true;
    } else {
      console.log(`  ✅ Conforme (sem violações): ${name}`);
    }
  }

  console.log('\n====================================================');
  if (hasErrors) {
    console.error('❌ VALIDAÇÃO FALHOU COM ERROS');
    console.log('====================================================\n');
    process.exit(1);
  } else {
    console.log('✅ TODAS AS VALIDAÇÕES FORAM CONCLUÍDAS COM SUCESSO!');
    console.log('====================================================\n');
  }
}

validateBrandingAndOG().catch((err) => {
  console.error('Erro na validação:', err);
  process.exit(1);
});
