/**
 * Runnable check — BUG C: processed_count incrementa SÓ em envio real bem-sucedido
 * (não em ticks/RUNNING) + status honesto quando worker morto (timer inativo).
 * Run: npx tsx src/server/services/tests/check-worker-state.ts
 */
import { strict as assert } from 'node:assert';
import {
  loadAutomationState,
  updateAutomationState,
  recordSuccessfulSend,
  resolveEffectiveStatus,
  AUTOMATION_STATE_ID,
} from '../marketing-automation/state';

type Row = Record<string, any>;

function makeFakeStateClient(seedState?: Row): any {
  const tables: Record<string, Row[]> = {
    marketing_automation_state: [...(seedState ? [seedState] : [])],
  };
  const upserts: Row[] = [];
  const client: any = {};
  client.from = (table: string) => {
    let rows = tables[table] || [];
    const query: any = {};
    query.select = () => query;
    query.eq = (col: string, val: any) => {
      rows = rows.filter((r) => r[col] === val);
      return query;
    };
    query.single = async () => ({ data: rows[0] ?? null, error: null });
    query.upsert = async (row: Row) => {
      upserts.push(row);
      tables[table] ??= [];
      const existing = tables[table].find((r) => r.id === row.id);
      if (existing) Object.assign(existing, row);
      else tables[table].push(row);
      return { error: null };
    };
    return query;
  };
  client.__upserts = upserts;
  client.__tables = tables;
  return client;
}

const checks: Array<[string, () => void]> = [];

checks.push(['BUG C: loadAutomationState default → STOPPED, count 0', async () => {
  const client = makeFakeStateClient();
  const s = await loadAutomationState(client);
  assert.deepStrictEqual(s, { status: 'STOPPED', last_error: undefined, last_processed_at: undefined, processed_count: 0 });
}]);

checks.push(['BUG C: updateAutomationState(RUNNING) NÃO toca processed_count (era bug do tick)', async () => {
  const client = makeFakeStateClient({ id: AUTOMATION_STATE_ID, status: 'STOPPED', processed_count: 153 });
  await updateAutomationState(client, 'RUNNING');
  const payload = client.__upserts[client.__upserts.length - 1];
  assert.equal(payload.status, 'RUNNING');
  assert.ok(!('processed_count' in payload), 'RUNNING NÃO deve incrementar processed_count');
  assert.ok('last_processed_at' in payload);
  // estado do DB permanece com count original
  assert.equal(client.__tables.marketing_automation_state[0].processed_count, 153);
}]);

checks.push(['BUG C: recordSuccessfulSend incrementa +1 (envio real bem-sucedido)', async () => {
  const client = makeFakeStateClient({ id: AUTOMATION_STATE_ID, status: 'RUNNING', processed_count: 153 });
  const n1 = await recordSuccessfulSend(client);
  const n2 = await recordSuccessfulSend(client);
  assert.equal(n1, 154);
  assert.equal(n2, 155);
  assert.equal(client.__tables.marketing_automation_state[0].processed_count, 155);
}]);

checks.push(['BUG C: RUNNING sem status change (tick) não altera count — sequência completa', async () => {
  const client = makeFakeStateClient({ id: AUTOMATION_STATE_ID, status: 'RUNNING', processed_count: 10 });
  await updateAutomationState(client, 'RUNNING'); // tick (3x)
  await updateAutomationState(client, 'RUNNING');
  await updateAutomationState(client, 'RUNNING');
  assert.equal(client.__tables.marketing_automation_state[0].processed_count, 10, 'ticks não contam');
  await recordSuccessfulSend(client); // 1 envio real
  assert.equal(client.__tables.marketing_automation_state[0].processed_count, 11);
}]);

checks.push(['BUG C: resolveEffectiveStatus — RUNNING com timer morto → STOPPED (não auto-inicia)', () => {
  assert.equal(resolveEffectiveStatus('RUNNING', false), 'STOPPED');
  assert.equal(resolveEffectiveStatus('RUNNING', true), 'RUNNING');
  assert.equal(resolveEffectiveStatus('PAUSED', false), 'PAUSED');
  assert.equal(resolveEffectiveStatus('ERROR', false), 'ERROR');
  assert.equal(resolveEffectiveStatus('STOPPED', false), 'STOPPED');
}]);

(async () => {
  let failed = 0;
  for (const [name, fn] of checks) {
    try {
      await fn();
      console.log(`PASS  ${name}`);
    } catch (err: any) {
      failed++;
      console.error(`FAIL  ${name}\n      ${err && err.message ? err.message : err}`);
    }
  }
  console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
  if (failed > 0) process.exitCode = 1;
})();