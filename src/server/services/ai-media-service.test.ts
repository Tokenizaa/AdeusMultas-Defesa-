/**
 * P0 FIX TASK 4: aiMediaService não devolve mocks em produção.
 * Rode: npx tsx src/server/services/ai-media-service.test.ts
 *
 * Contrato:
 * - Em produção (NODE_ENV=production), generateImage com allowFallback NÃO devolve
 *   SVG placeholder — lança erro explícito.
 * - Em dev (DEV_ALLOW_MOCKS=true), allowFallback segue devolvendo SVG placeholder.
 * - startVideoGeneration NÃO tem mock/fake URL: sem cliente Veo devolve {success:false}
 *   (nunca URL fake).
 *
 * Para alcançar o caminho do mock (models falham => allowFallback) sem rede,
 * stub getClient() com cliente cujo models.generateContent lança.
 */

import assert from 'node:assert';
import { AIMediaService } from './ai-media-service';

// Cliente cuja geração de imagem SEMPRE falha => cai no ramo allowFallback.
const failingClient = {
  models: {
    generateContent: async () => {
      throw new Error('simulated provider outage');
    },
  },
} as any;

const mk = () => {
  const s = new AIMediaService();
  (s as any).getClient = () => failingClient;
  return s;
};

async function main() {
  let failures = 0;
  const check = (name: string, cond: boolean, detail = '') => {
    if (cond) {
      console.log(`  [PASS] ${name}`);
    } else {
      failures++;
      console.error(`  [FAIL] ${name} ${detail}`);
    }
  };

  console.log('\n=== P0 Task 4: aiMediaService não devolve mocks em produção ===');

  const savedNodeEnv = process.env.NODE_ENV;
  const savedMocks = process.env.DEV_ALLOW_MOCKS;
  const restore = () => {
    process.env.NODE_ENV = savedNodeEnv;
    if (savedMocks === undefined) delete process.env.DEV_ALLOW_MOCKS;
    else process.env.DEV_ALLOW_MOCKS = savedMocks;
  };

  // ── 1) Produção + allowFallback + provider falho => THROW (nunca SVG) ──
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.DEV_ALLOW_MOCKS;
    let threw = false;
    let result: any = null;
    try {
      result = await mk().generateImage({ prompt: 'teste', allowFallback: true });
    } catch {
      threw = true;
    }
    check(
      'produção + allowFallback + provider falho => lança erro (não devolve SVG)',
      threw,
      JSON.stringify(result)
    );
  } finally {
    restore();
  }

  // ── 2) Dev + DEV_ALLOW_MOCKS=true + allowFallback + provider falho => SVG placeholder ──
  try {
    process.env.NODE_ENV = 'development';
    process.env.DEV_ALLOW_MOCKS = 'true';
    const res: any = await mk().generateImage({ prompt: 'teste dev', allowFallback: true });
    check(
      'dev + DEV_ALLOW_MOCKS + allowFallback => devolve SVG placeholder',
      res && res.success === true && res.isFallback === true && res.mimeType === 'image/svg+xml',
      JSON.stringify(res)
    );
  } finally {
    restore();
  }

  // ── 3) Produção, provider falho, SEM allowFallback => success:false sem SVG ──
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.DEV_ALLOW_MOCKS;
    const res: any = await mk().generateImage({ prompt: 'sem fallback', allowFallback: false });
    check(
      'produção sem allowFallback => success:false e SEM SVG',
      res && res.success === false && res.isFallback === false && !res.imageUrl,
      JSON.stringify(res)
    );
  } finally {
    restore();
  }

  // ── 4) startVideoGeneration sem cliente Veo => {success:false}, NUNCA URL fake ──
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.DEV_ALLOW_MOCKS;
    delete process.env.GEMINI_API_KEY;
    const real = new AIMediaService(); // sem stub => sem cliente
    const res: any = await real.startVideoGeneration({ prompt: 'teste' });
    check(
      'startVideoGeneration sem Veo => success:false e SEM fake URL',
      res && res.success === false && !res.operationName && !res.error?.includes('commondatastorage'),
      JSON.stringify(res)
    );
  } finally {
    restore();
  }

  console.log(`\n${failures === 0 ? 'TODOS OS TESTES PASSARAM' : `${failures} ASSERT(S) FALHARAM`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error('ERRO FATAL no teste:', err);
  process.exit(1);
});
