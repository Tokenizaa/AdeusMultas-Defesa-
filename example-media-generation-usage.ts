/**
 * Exemplo de uso da nova arquitetura desacoplada: MediaGenerationService
 */

import { mediaGenerationService } from './src/server/media';

async function main() {
  console.log('1. Auditando hardware...');
  const hw = mediaGenerationService.getHardwareAudit();
  console.log(`- SO: ${hw.os}`);
  console.log(`- Classificação: ${hw.classification}`);
  console.log(`- Possui GPU: ${hw.hasGpu ? 'Sim' : 'Não'}`);

  console.log('\n2. Enfileirando job assíncrono de imagem...');
  const job = mediaGenerationService.enqueueImageJob({
    prompt: 'Campanha de conscientização de velocidade - Direitos do motorista',
    aspectRatio: '1:1',
    imageSize: '1K',
    stylePreset: 'editorial photo',
  });

  console.log(`- Job ID: ${job.id}`);
  console.log(`- Status: ${job.status}`);

  console.log('\n3. Consultando status do job...');
  const status = mediaGenerationService.getJob(job.id);
  console.log(`- Status atual: ${status?.status} (Progresso: ${status?.progress}%)`);
}

main().catch(console.error);
