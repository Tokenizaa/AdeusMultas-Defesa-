/**
 * AUTO-RUN: Enfileira 7 dias de campanha no MetaPublisher e roda 1 ciclo do orchestrator.
 * Uso: npx tsx src/scripts/auto-run-campaign.ts
 */

import { marketingService } from '../server/services/marketing-service';
import { metaPublisher } from '../server/workers/meta-publisher.worker';
import { marketingOrchestrator } from '../server/workers/marketing-orchestrator.worker';

const SEVEN_DAYS_IDS = [
  '17e1f2ef-e775-4478-b4e6-38cfa960eb9f', // Dia 1 - Apresentacao
  '6d246b93-d6e7-466d-a2d5-b1a2efdd1324', // Dia 2 - 5 erros
  '40bd46d6-12ed-41df-a41e-d6e1ec62db64', // Dia 3 - O que fazer primeiro
  '22bd4696-1feb-4465-a640-577fc356e9b3', // Dia 4 - Mito ou verdade
  'e8e498f4-509d-4e7c-902e-2f0aac56cbdd', // Dia 5 - Checklist
  'be623f95-af80-425b-b60a-45b0e8e76a2d', // Dia 6 - 3 pontos
  '5d26abae-fc97-418a-a8ec-ebde0ee4cae3', // Dia 7 - Veja como ajudar
];

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('=== Auto-Run Campaign: 7 Dias ===\n');

  // 1. Reload dados do Supabase
  console.log('[1] Reloading marketingService from Supabase...');
  await marketingService.reload();
  const contents = await marketingService.getEditorialContents();
  console.log(`     Conteudos carregados: ${contents.length}`);

  // 2. Enfileirar os 7 posts
  console.log('\n[2] Enfileirando 7 posts no MetaPublisher...\n');
  const results: { id: string; queued: boolean; itemId: string }[] = [];

  for (const id of SEVEN_DAYS_IDS) {
    const content = contents.find((c) => c.id === id);
    if (!content) {
      console.log(`     [SKIP] ${id} — conteudo nao encontrado`);
      continue;
    }

    const message = `${content.copyText}\n\n${(content.hashtags || []).join(' ')}`.trim();
    const result = metaPublisher.enqueue(
      {
        destination: 'instagram',
        message,
        mediaUrl: content.image_url || undefined,
        linkUrl: 'https://www.defesai.shop',
        instagramAccountId: '17841400928374829',
      },
      content.id
    );

    results.push({ id: content.id, ...result });
    console.log(`     [${result.queued ? 'OK ' : 'FAIL'}] ${content.title.substring(0, 40)}... => ${result.itemId}`);
    await sleep(300); // 300ms entre enqueues
  }

  // 3. Status da fila
  console.log('\n[3] Fila atual:');
  const queue = metaPublisher.getQueue();
  console.log(`     Total na fila: ${queue.length}`);
  queue.forEach((q) => {
    console.log(`       - ${q.id} | ${q.destination} | attempts: ${q.attempts}`);
  });

  // 4. Rodar 1 ciclo do orchestrator
  console.log('\n[4] Disparando 1 ciclo do orchestrator...');
  const cycleResult = await marketingOrchestrator.runCycle();
  console.log(`     Ciclo: ${cycleResult.cycle} | Sucesso: ${cycleResult.success}`);

  // 5. Status final
  console.log('\n[5] Status final:');
  const finalQueue = metaPublisher.getQueue();
  const jobHistory = metaPublisher.getJobHistory();
  console.log(`     Fila restante: ${finalQueue.length}`);
  console.log(`     Jobs no historico: ${jobHistory.length}`);
  jobHistory.slice(0, 7).forEach((j) => {
    console.log(`       - ${j.id} | ${j.channel} | ${j.status} | attempts: ${j.attempts}${j.error ? ` | ${j.error.substring(0, 50)}` : ''}`);
  });

  console.log('\n=== Fim ===');
}

main().catch((err) => {
  console.error('ERRO FATAL:', err);
  process.exit(1);
});