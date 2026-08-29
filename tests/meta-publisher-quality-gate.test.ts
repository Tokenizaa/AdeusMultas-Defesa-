/**
 * INTEGRAÇÃO: GATE DE QUALIDADE DE IMAGEM no MetaPublisher.enqueue
 * Rode: npx tsx tests/meta-publisher-quality-gate.test.ts
 *
 * Contrato sob teste (src/server/workers/meta-publisher.worker.ts):
 * - failureKind 'quality' (resolução/borrão) => NÃO enfileira: { queued:false, rejected:true }
 *   + persiste PublisherJobRecord status 'rejected' com error=motivos e resolvedAt (W1)
 * - failureKind 'fetch'|'decode' (infra) => fail-open: enqueue PROSSEGUE como antes (sem rejected)
 * - peça OK => enfileira: { queued:true }
 *
 * Vetores sintéticos via sharp (runtime, nada commitado). Gate real para o
 * caso hard-fail (data URL pequena); fetch real quebrado para o fail-open.
 * metaAdapter.isConnected() = false no ambiente sem creds Meta; para o caso
 * enfileiramento, stub temporário restaurado no finally.
 */

import assert from 'node:assert';
import sharp from 'sharp';
import { MetaPublisher } from '../src/server/workers/meta-publisher.worker';
import { metaAdapter } from '../src/integrations/meta/adapters/meta-adapter';
import type { MetaPublishRequest } from '../src/types';

function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s & 0xff;
  };
}

/** Ruído determinístico em PNG (nítido, passa no gate) */
async function renderNoise(size: number, seed: number): Promise<Buffer> {
  const rand = lcg(seed);
  const gray = new Uint8Array(size * size);
  for (let i = 0; i < gray.length; i++) gray[i] = rand();
  return sharp(Buffer.from(gray), { raw: { width: size, height: size, channels: 1 } })
    .png()
    .toBuffer();
}

/** Data URL (fetch nativo suporta) — sem rede, sem binário comprometido */
function toDataUrl(buf: Buffer, mime = 'image/png'): string {
  return `data:${mime};base64,${buf.toString('base64')}`;
}

const mkReq = (mediaUrl: string): MetaPublishRequest => ({
  destination: 'facebook',
  message: 'teste gate qualidade',
  mediaUrl,
});

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

  console.log('\n=== Integração: MetaPublisher.enqueue x gate de qualidade ===');

  // ── 1) Hard-fail: imagem pequena (quality) => REJEITADA, fila intacta, trilha persistida ──
  const smallPng = await renderNoise(100, 5); // 100px < 500 => resolution_too_low
  const publisherReject = new MetaPublisher();
  const rejectRes = await publisherReject.enqueue(mkReq(toDataUrl(smallPng)));
  check(
    'peça hard-fail => queued:false',
    rejectRes.queued === false,
    JSON.stringify(rejectRes)
  );
  check(
    'peça hard-fail => rejected:true',
    rejectRes.rejected === true,
    JSON.stringify(rejectRes)
  );
  check(
    'peça hard-fail => reasons contém resolution_too_low',
    Array.isArray(rejectRes.reasons) && rejectRes.reasons.includes('resolution_too_low'),
    JSON.stringify(rejectRes.reasons)
  );
  check(
    'peça hard-fail => NÃO adicionada à fila',
    publisherReject.getQueue().length === 0,
    `queue=${publisherReject.getQueue().length}`
  );
  // W1: rejeição PERSISTE — job 'rejected' no histórico (rastreio p/ operador)
  const rejectionJobs = publisherReject.getJobHistory().filter((j) => j.status === 'rejected');
  check(
    'rejeição => 1 job persistido com status rejected + error = motivos',
    rejectionJobs.length === 1 &&
      rejectionJobs[0].error === 'Quality gate: resolution_too_low' &&
      Boolean(rejectionJobs[0].resolvedAt),
    JSON.stringify(publisherReject.getJobHistory())
  );
  check(
    'rejeição => jobId devolvido no resultado',
    typeof rejectRes.jobId === 'string' && rejectRes.jobId.length > 0,
    JSON.stringify(rejectRes)
  );

  // ── 2) Fail-open: fetch quebra => NÃO rejeita, prossegue (como antes) ──
  const publisherFailOpen = new MetaPublisher();
  const failOpenRes = await publisherFailOpen.enqueue(
    mkReq('http://127.0.0.1:1/nope.png') // conexão recusada imediata
  );
  check(
    'fetch quebrado => rejected ausente (gate não bloqueou)',
    failOpenRes.rejected !== true && failOpenRes.reasons === undefined,
    JSON.stringify(failOpenRes)
  );
  // Sem creds Meta no ambiente, isConnected()=false => enqueue cai no ramo "Meta desconectada"
  // (queued:false). itemId 'pub_...' non-empty prova que o fluxo normal construiu o item
  // (linha 86) — ou seja, o gate NÃO abortou o enqueue.
  check(
    'fetch quebrado => enqueue PROSSEGUIU até o fluxo normal (item construído, sem rejected)',
    failOpenRes.queued === false &&
      failOpenRes.itemId.startsWith('pub_') &&
      failOpenRes.rejected !== true,
    JSON.stringify(failOpenRes)
  );

  // ── 3) Peça OK => enfileira (queued:true) ──────────────────────────────
  const goodPng = await renderNoise(1024, 42); // nítida e >= 500px => passa
  const originalIsConnected = metaAdapter.isConnected;
  let queuedRes: Awaited<ReturnType<MetaPublisher['enqueue']>> | null = null;
  try {
    (metaAdapter as any).isConnected = () => true; // stub temporário: só o enqueue, não o publish
    const publisherOk = new MetaPublisher();
    queuedRes = await publisherOk.enqueue(mkReq(toDataUrl(goodPng)));
  } finally {
    (metaAdapter as any).isConnected = originalIsConnected;
  }
  check(
    'peça OK => queued:true',
    queuedRes !== null && queuedRes.queued === true,
    JSON.stringify(queuedRes)
  );

  console.log(`\n${failures === 0 ? 'TODOS OS TESTES PASSARAM' : `${failures} ASSERT(S) FALHARAM`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error('ERRO FATAL no teste:', err);
  process.exit(1);
});