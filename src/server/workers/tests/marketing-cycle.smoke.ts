/**
 * Smoke test FASE 4.9 — Ciclo autônomo roda sem browser e estado real é refletido.
 * Executar: npx tsx src/server/workers/tests/marketing-cycle.smoke.ts
 */
import assert from 'node:assert';
import { marketingOrchestrator } from '../marketing-orchestrator.worker';
import { marketingService } from '../../services/marketing-service';
import { metaPublisher } from '../meta-publisher.worker';

async function main() {
  const beforeCount = marketingService.getCycleCount();

  // 1º ciclo: 7 agentes rodam, orquestrador conta
  const r1 = await marketingOrchestrator.runCycle();
  assert.ok(r1.success, 'ciclo 1 deve ser success');
  assert.ok(r1.cycle > beforeCount, 'cycleCount deve incrementar');
  assert.strictEqual(marketingService.getCycleCount(), r1.cycle, 'service reflete o ciclo');

  // 2º ciclo: torna estado observável (sem dependência de timing de timer real)
  const r2 = await marketingOrchestrator.runCycle();
  assert.strictEqual(r2.cycle, r1.cycle + 1, 'ciclo2=r1+1 | r2=' + r2.cycle + ' r1=' + r1.cycle);
  assert.strictEqual(marketingOrchestrator.getStatus().cycleCount, r2.cycle, 'status reflete cycleCount');

  // Proteção contra reentrância: runCycle simultâneo NÃO roda agentes (traveler guard)
  const [a1, a2] = await Promise.all([marketingOrchestrator.runCycle(), marketingOrchestrator.runCycle()]);
  const successCount = [a1, a2].filter((c) => c.success).length;
  assert.strictEqual(successCount, 1, 'apenas um runCycle simultâneo deve executar agentes');
  const statusAfter = marketingOrchestrator.getStatus();
  assert.strictEqual(statusAfter.cycleCount, a1.success ? a1.cycle : a2.cycle, 'ciclo nao duplicado: status=' + statusAfter.cycleCount + ' a1=' + a1.cycle + ' a2=' + a2.cycle);

  // Fila publica conteúdo e status avança p/ publicado
  const contents = await marketingService.getEditorialContents();
  assert.ok(contents.some((c) => c.status === 'publicado'), 'ao menos um conteúdo publicado no pipeline');
  const queueState = metaPublisher.getQueue();
  assert.ok(Array.isArray(queueState), 'fila de publicação acessível');

  // Status do orquestrador reflete o ciclo real (verificado acima pós r2)

  console.log(`✅ FASE 4.9 smoke OK — ${r2.cycle} ciclos, ${contents.length} conteúdos, ${contents.filter((c) => c.status === 'publicado').length} publicados, nenhum browser envolvido.`);
}

main().catch((err) => {
  console.error('❌ FASE 4.9 smoke FAIL:', err.message);
  process.exit(1);
});