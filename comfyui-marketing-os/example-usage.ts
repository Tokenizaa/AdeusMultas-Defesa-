/**
 * Exemplo de uso da integração ComfyUI Marketing OS
 * 
 * Este script demonstra como usar a integração para gerar
 * conteúdo marketing para o escritório de Direito de Trânsito.
 */

import { ComfyUIMarketing } from './comfyui-integration.js';

async function main() {
  // Inicializar integração
  const comfyui = new ComfyUIMarketing({
    serverUrl: 'http://localhost:8188',
    outputDir: './output',
    quality: 'production'
  });

  console.log('=== ComfyUI Marketing OS - Exemplo de Uso ===\n');

  // 1. Verificar status do servidor
  console.log('1. Verificando status do servidor...');
  const status = await comfyui.checkStatus();
  
  if (!status.online) {
    console.error('❌ Servidor ComfyUI offline!');
    console.log('Inicie o ComfyUI com: python main.py --listen 0.0.0.0 --port 8188');
    process.exit(1);
  }
  
  console.log('✅ Servidor online\n');

  // 2. Gerar post para Instagram
  console.log('2. Gerando post para Instagram...');
  const instagramPost = await comfyui.generateImage({
    type: 'social-media',
    topic: 'defesa de multa por velocidade',
    platform: 'instagram',
    style: 'professional'
  });
  
  if (instagramPost.success) {
    console.log(`✅ Post gerado: ${instagramPost.outputPath}`);
    console.log(`   Duração: ${instagramPost.duration}ms\n`);
  } else {
    console.error(`❌ Erro: ${instagramPost.error}\n`);
  }

  // 3. Gerar header para blog
  console.log('3. Gerando header para blog...');
  const blogHeader = await comfyui.generateImage({
    type: 'blog-header',
    topic: 'consultoria jurídica em trânsito',
    platform: 'youtube'
  });
  
  if (blogHeader.success) {
    console.log(`✅ Header gerado: ${blogHeader.outputPath}`);
    console.log(`   Duração: ${blogHeader.duration}ms\n`);
  } else {
    console.error(`❌ Erro: ${blogHeader.error}\n`);
  }

  // 4. Gerar infográfico
  console.log('4. Gerando infográfico jurídico...');
  const infographic = await comfyui.generateImage({
    type: 'infographic',
    topic: 'pontuação da CNH',
    style: 'modern'
  });
  
  if (infographic.success) {
    console.log(`✅ Infográfico gerado: ${infographic.outputPath}`);
    console.log(`   Duração: ${infographic.duration}ms\n`);
  } else {
    console.error(`❌ Erro: ${infographic.error}\n`);
  }

  // 5. Gerar card de frase
  console.log('5. Gerando card de frase...');
  const quoteCard = await comfyui.generateImage({
    type: 'quote-card',
    topic: 'dica jurídica para motoristas'
  });
  
  if (quoteCard.success) {
    console.log(`✅ Card gerado: ${quoteCard.outputPath}`);
    console.log(`   Duração: ${quoteCard.duration}ms\n`);
  } else {
    console.error(`❌ Erro: ${quoteCard.error}\n`);
  }

  // 6. Gerar carrossel educativo
  console.log('6. Gerando carrossel educativo...');
  const carousel = await comfyui.generateImage({
    type: 'carousel',
    topic: '5 passos para contestar multa',
    platform: 'instagram'
  });
  
  if (carousel.success) {
    console.log(`✅ Carrossel gerado: ${carousel.outputPath}`);
    console.log(`   Duração: ${carousel.duration}ms\n`);
  } else {
    console.error(`❌ Erro: ${carousel.error}\n`);
  }

  // 7. Gerar reel para TikTok
  console.log('7. Gerando reel para TikTok...');
  const reel = await comfyui.generateVideo({
    type: 'reel',
    topic: '5 dicas para evitar multas',
    duration: '15s'
  });
  
  if (reel.success) {
    console.log(`✅ Reel gerado: ${reel.outputPath}`);
    console.log(`   Duração: ${reel.duration}ms\n`);
  } else {
    console.error(`❌ Erro: ${reel.error}\n`);
  }

  // 8. Gerar vídeo explicativo
  console.log('8. Gerando vídeo explicativo...');
  const explainer = await comfyui.generateVideo({
    type: 'explainer',
    topic: 'processo de defesa de multa',
    duration: '30s'
  });
  
  if (explainer.success) {
    console.log(`✅ Vídeo explicativo gerado: ${explainer.outputPath}`);
    console.log(`   Duração: ${explainer.duration}ms\n`);
  } else {
    console.error(`❌ Erro: ${explainer.error}\n`);
  }

  // 9. Gerar infográfico animado
  console.log('9. Gerando infográfico animado...');
  const animatedInfographic = await comfyui.generateVideo({
    type: 'animated-infographic',
    topic: 'estatísticas de multas no Brasil',
    duration: '15s'
  });
  
  if (animatedInfographic.success) {
    console.log(`✅ Infográfico animado gerado: ${animatedInfographic.outputPath}`);
    console.log(`   Duração: ${animatedInfographic.duration}ms\n`);
  } else {
    console.error(`❌ Erro: ${animatedInfographic.error}\n`);
  }

  // 10. Exemplo de geração em lote
  console.log('10. Exemplo de geração em lote...');
  const batchResults = await comfyui.batchGenerate({
    items: [
      {
        type: 'social-media',
        topic: 'CNH suspensa',
        platform: 'facebook'
      },
      {
        type: 'social-media',
        topic: 'defesa de trânsito',
        platform: 'linkedin'
      },
      {
        type: 'quote-card',
        topic: 'alerta legal para motoristas'
      }
    ],
    concurrency: 2
  });
  
  const successCount = batchResults.filter(r => r.success).length;
  console.log(`✅ Lote concluído: ${successCount}/${batchResults.length} sucesso\n`);

  console.log('=== Exemplo concluído ===');
  console.log('Arquivos gerados em: ./output/');
}

// Executar exemplo
main().catch(console.error);
