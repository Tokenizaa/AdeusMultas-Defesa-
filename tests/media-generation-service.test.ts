/**
 * @file media-generation-service.test.ts
 * Suíte completa de testes para a arquitetura MediaGenerationService.
 */

import { HardwareDetector } from '../src/server/media/hardware-detector';
import { ProviderRouter } from '../src/server/media/provider-router';
import { MediaJobQueue } from '../src/server/media/job-queue';
import { mediaGenerationService } from '../src/server/media/media-generation-service';

async function runTests() {
  console.log('--- [TEST SUITE] Media Generation Service ---\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Teste de Hardware Detector
  try {
    const hw = HardwareDetector.getHardwareInfo();
    assert(typeof hw.os === 'string' && hw.os.length > 0, 'HardwareDetector detecta SO');
    assert(typeof hw.cpuCount === 'number' && hw.cpuCount > 0, 'HardwareDetector detecta CPUs');
    assert(
      ['LOCAL_GPU_READY', 'LOCAL_GPU_LIMITED', 'LOCAL_CPU_ONLY', 'REMOTE_REQUIRED'].includes(hw.classification),
      `HardwareDetector classifica ambiente corretamente (${hw.classification})`
    );
  } catch (err: any) {
    assert(false, `HardwareDetector error: ${err.message}`);
  }

  // 2. Teste de Provider Router
  try {
    const router = new ProviderRouter();
    const providers = router.getAvailableProviders();
    assert(providers.length >= 3, 'ProviderRouter registra Remote, Local e DevMock providers');

    // Testar resolução explícita de DevMock
    const mockProvider = await router.resolveProvider('image', 'dev_mock');
    assert(mockProvider.id === 'dev_mock', 'ProviderRouter resolve provedor dev_mock explicitamente');

    // Testar geração pelo DevMock
    const mockImg = await mockProvider.generateImage({ prompt: 'Teste de placa de trânsito' });
    assert(!!mockImg.base64 || !!mockImg.url, 'DevMockProvider gera imagem (SVG/Base64)');

    const mockVid = await mockProvider.generateVideo({ prompt: 'Carro em alta velocidade' });
    assert(!!mockVid.url, 'DevMockProvider gera vídeo com URL válida');
  } catch (err: any) {
    assert(false, `ProviderRouter error: ${err.message}`);
  }

  // 3. Teste de Fila Assíncrona e Jobs
  try {
    const router = new ProviderRouter();
    const queue = new MediaJobQueue(router);

    const job = queue.createJob('image', 'Post sobre Lei Seca', { prompt: 'Post sobre Lei Seca' }, undefined, 'dev_mock');
    assert(job.status === 'QUEUED' || job.status === 'PROCESSING', 'Job criado entra em QUEUED ou PROCESSING');
    assert(typeof job.id === 'string' && job.id.startsWith('job_'), 'Job possui ID estruturado');

    // Aguardar processamento do mock
    await new Promise((r) => setTimeout(r, 600));

    const updatedJob = queue.getJob(job.id);
    assert(updatedJob?.status === 'COMPLETED', `Job assíncrono completa com sucesso (${updatedJob?.status})`);
    assert(!!updatedJob?.output?.url, 'Job concluído possui output de mídia');

    // Teste de cancelamento
    const jobToCancel = queue.createJob('video', 'Video longo para cancelamento', { prompt: 'Video longo' }, undefined, 'dev_mock');
    const cancelled = queue.cancelJob(jobToCancel.id);
    assert(cancelled, 'Job pode ser cancelado via queue.cancelJob');
    const cancelledJob = queue.getJob(jobToCancel.id);
    assert(cancelledJob?.status === 'CANCELLED', 'Estado do job após cancelamento é CANCELLED');
  } catch (err: any) {
    assert(false, `MediaJobQueue error: ${err.message}`);
  }

  // 4. Teste da Fachada MediaGenerationService
  try {
    const hwAudit = mediaGenerationService.getHardwareAudit();
    assert(!!hwAudit.classification, 'MediaGenerationService expõe auditoria de hardware');

    const providersInfo = mediaGenerationService.getProvidersInfo();
    assert(providersInfo.providers.length >= 3, 'MediaGenerationService expõe lista de provedores');

    // Enfileirar via Service
    const imgJob = mediaGenerationService.enqueueImageJob({ prompt: 'Multa de radar 60km/h' }, 'dev_mock');
    assert(!!imgJob.id, 'MediaGenerationService.enqueueImageJob retorna job');

    const v2vJob = mediaGenerationService.enqueueImageToVideoJob(
      { prompt: 'Animar radar piscando' },
      { imageUrl: 'https://example.com/radar.png' },
      'dev_mock'
    );
    assert(v2vJob.type === 'image_to_video', 'MediaGenerationService.enqueueImageToVideoJob configura tipo correto');

    // Geração direta síncrona com fallback/mock
    const directImg = await mediaGenerationService.generateImageDirect(
      { prompt: 'Banner CTB Artigo 165' },
      'dev_mock'
    );
    assert(!!directImg.url, 'MediaGenerationService.generateImageDirect retorna mídia direta');
  } catch (err: any) {
    assert(false, `MediaGenerationService error: ${err.message}`);
  }

  console.log(`\n--- RESULTADO: ${passed} passaram, ${failed} falharam ---\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
