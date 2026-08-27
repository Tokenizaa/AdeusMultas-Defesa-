import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateBrandAssets() {
  console.log('[Asset-Gen] Gerando assets de imagem em alta resolução para Adeus Multas...');

  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 1. Open Graph Image: 1200 x 630 PNG & JPG
  const ogSvg = fs.readFileSync(path.join(publicDir, 'og-image.svg'));
  await sharp(ogSvg)
    .resize(1200, 630)
    .png({ quality: 95, compressionLevel: 8 })
    .toFile(path.join(publicDir, 'og-image.png'));
  console.log('✅ Criado: public/og-image.png (1200x630)');

  await sharp(ogSvg)
    .resize(1200, 630)
    .jpeg({ quality: 90 })
    .toFile(path.join(publicDir, 'og-image.jpg'));
  console.log('✅ Criado: public/og-image.jpg (1200x630)');

  // 2. Main Logo PNG
  const logoSvg = fs.readFileSync(path.join(publicDir, 'logo.svg'));
  await sharp(logoSvg)
    .resize(880, 192)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'logo.png'));
  console.log('✅ Criado: public/logo.png');

  // 3. Logo Light PNG
  const logoLightSvg = fs.readFileSync(path.join(publicDir, 'logo-light.svg'));
  await sharp(logoLightSvg)
    .resize(880, 192)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'logo-light.png'));
  console.log('✅ Criado: public/logo-light.png');

  // 4. Logo Dark PNG
  const logoDarkSvg = fs.readFileSync(path.join(publicDir, 'logo-dark.svg'));
  await sharp(logoDarkSvg)
    .resize(880, 192)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'logo-dark.png'));
  console.log('✅ Criado: public/logo-dark.png');

  // 5. Logo Icon PNG (512x512)
  const iconSvg = fs.readFileSync(path.join(publicDir, 'logo-icon.svg'));
  await sharp(iconSvg)
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'logo-icon.png'));
  console.log('✅ Criado: public/logo-icon.png (512x512)');

  // 6. Favicon PNG (64x64 & 32x32)
  const favSvg = fs.readFileSync(path.join(publicDir, 'favicon.svg'));
  await sharp(favSvg)
    .resize(64, 64)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('✅ Criado: public/favicon.png (64x64)');

  console.log('[Asset-Gen] Todos os assets foram gerados com sucesso!');
}

generateBrandAssets().catch((err) => {
  console.error('[Asset-Gen] Erro ao gerar assets:', err);
  process.exit(1);
});
