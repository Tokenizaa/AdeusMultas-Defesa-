/**
 * Runnable check — BUG A: inbound WhatsApp reply from a prospecting lead must
 * mark marketing_lead_campaigns='responded' and persist an inbound
 * marketing_messages row (idempotent). Run: npx tsx src/server/services/tests/check-prospecting-responder.ts
 */
import { strict as assert } from 'node:assert';
import { persistProspectingResponse, normalizeBrPhone, ProspectingResponseResult } from '../prospecting-responder';

type Row = Record<string, any>;

/** Fake chainable supabase client (subset usado pelo responder). */
function makeFakeClient(seed: Record<string, Row[]>): any {
  const tables: Record<string, Row[]> = JSON.parse(JSON.stringify(seed));
  const log: string[] = [];
  const client: any = {};
  client.from = (table: string) => {
    let rows = tables[table] || [];
    const query: any = {};
    const terminal = async () => ({ data: rows, error: null });
    query.select = () => query;
    query.eq = (col: string, val: any) => {
      rows = rows.filter((r) => r[col] === val);
      return query;
    };
    query.in = (col: string, vals: any[]) => {
      rows = rows.filter((r) => vals.includes(r[col]));
      return query;
    };
    query.order = () => query;
    query.limit = (n: number) => {
      rows = rows.slice(0, n);
      return query;
    };
    query.maybeSingle = async () => ({ data: rows[0] ?? null, error: null });
    query.single = async () => ({ data: rows[0] ?? null, error: null });
    query.insert = async (row: Row | Row[]) => {
      log.push(`insert:${table}`);
      (tables[table] ??= []).push(...(Array.isArray(row) ? row : [row]));
      return { error: null };
    };
    query.update = (updates: Row) => {
      log.push(`update:${table}`);
      rows.forEach((r) => Object.assign(r, updates));
      // supabase: update() é chainable e resolve no fim (eq(...) é awaited pelo responder)
      return { eq: async () => ({ error: null }) };
    };
    query.upsert = async (row: Row) => {
      log.push(`upsert:${table}`);
      (tables[table] ??= []).push(row);
      return { error: null };
    };
    // Supabase builders são thenable em qualquer ponto da cadeia: `await chain` resolve {data,error}
    query.then = (resolve: (v: any) => void, reject: (e: any) => void) => terminal().then(resolve, reject);
    return query;
  };
  client.__tables = tables;
  client.__log = log;
  return client;
}

const seedProspecting = {
  marketing_leads: [{ id: 'L1', phone: '5511987654321', whatsapp: null }],
  marketing_lead_campaigns: [
    { id: 'LC1', campaign_id: 'C1', lead_id: 'L1', status: 'sent', updated_at: '2026-01-01T00:00:00.000Z' },
  ],
  marketing_messages: [],
};

const inbound = {
  externalContactId: '5511987654321',
  externalMessageId: 'wamid_AAA_123',
  text: 'Quero contratar!',
  channel: 'whatsapp_evolution',
  timestamp: '2026-01-02T00:00:00.000Z',
};

const checks: Array<[string, () => void]> = [];

checks.push(['normalizeBrPhone: 55-prefix BR', () => {
  assert.equal(normalizeBrPhone('5511987654321'), '11987654321');
  assert.equal(normalizeBrPhone('+55 (11) 98765-4321'), '11987654321');
  assert.equal(normalizeBrPhone('551234567890'), '1234567890'); // 55 + 10 dígitos
  assert.equal(normalizeBrPhone('11987654321'), '11987654321'); // já sem 55
  assert.equal(normalizeBrPhone('14445556666'), '14445556666'); // não-BR intacto
  assert.equal(normalizeBrPhone(null), '');
}]);

checks.push(['BUG A: reply de lead prospectado → status responded + mensagem inbound persistida', async () => {
  const client = makeFakeClient(seedProspecting);
  const res: ProspectingResponseResult = await persistProspectingResponse(inbound, client);
  assert.deepStrictEqual(res, { matched: true, messageInserted: true, statusUpdated: true });

  const msgs = client.__tables.marketing_messages;
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].direction, 'inbound');
  assert.equal(msgs[0].external_id, 'wamid_AAA_123');
  assert.equal(msgs[0].lead_id, 'L1');
  assert.equal(msgs[0].campaign_id, 'C1');
  assert.equal(msgs[0].lead_campaign_id, 'LC1');
  assert.equal(msgs[0].status, 'delivered');
  assert.equal(client.__tables.marketing_lead_campaigns[0].status, 'responded');
}]);

checks.push(['BUG A: idempotência — webhook reentregue NÃO duplica/reescreve', async () => {
  const client = makeFakeClient(seedProspecting);
  await persistProspectingResponse(inbound, client);
  const res2: ProspectingResponseResult = await persistProspectingResponse(inbound, client);
  // Após 1º processamento, lc não está mais ativo (responded) → nenhuma ação adicional.
  assert.equal(res2.matched, false);
  assert.equal(res2.messageInserted, false);
  assert.equal(res2.statusUpdated, false);
  const writes = client.__log.filter((l) => l.startsWith('insert:') || l.startsWith('update:'));
  assert.equal(writes.length, 2, `esperado insert+update do 1º envio apenas, log=${JSON.stringify(client.__log)}`);
  assert.equal(client.__tables.marketing_messages.length, 1, 'nenhuma mensagem duplicada');
  assert.equal(client.__tables.marketing_lead_campaigns[0].status, 'responded', 'status preservado');
}]);

checks.push(['BUG A: dedupe por external_id com lc ainda ativo → sem duplicar, mas garante responded', async () => {
  const client = makeFakeClient({
    marketing_leads: [{ id: 'L1', phone: '5511987654321', whatsapp: null }],
    marketing_lead_campaigns: [
      { id: 'LC1', campaign_id: 'C1', lead_id: 'L1', status: 'sent', updated_at: '2026-01-01T00:00:00.000Z' },
    ],
    // msg já persistida (ex.: crash entre insert e update no 1º processamento)
    marketing_messages: [{ id: 'M1', lead_id: 'L1', campaign_id: 'C1', lead_campaign_id: 'LC1', external_id: 'wamid_AAA_123' }],
  });
  const res = await persistProspectingResponse(inbound, client);
  assert.deepStrictEqual(res, { matched: true, messageInserted: false, statusUpdated: true });
  assert.equal(client.__tables.marketing_messages.length, 1, 'nenhuma duplicação');
  assert.equal(client.__tables.marketing_lead_campaigns[0].status, 'responded');
}]);

checks.push(['BUG A: sem match de lead → nenhum write', async () => {
  const client = makeFakeClient(seedProspecting);
  const res: ProspectingResponseResult = await persistProspectingResponse(
    { ...inbound, externalContactId: '5511900000000', externalMessageId: 'wamid_NO_MATCH' },
    client
  );
  assert.deepStrictEqual(res, { matched: false, messageInserted: false, statusUpdated: false });
  assert.equal(client.__tables.marketing_messages.length, 0);
  assert.equal(client.__tables.marketing_lead_campaigns[0].status, 'sent');
}]);

checks.push(['BUG A: lead sem 55 no phone + inbound com 55 → match por normalização', async () => {
  const client = makeFakeClient({
    marketing_leads: [{ id: 'L2', phone: '11987654321', whatsapp: null }],
    marketing_lead_campaigns: [
      { id: 'LC2', campaign_id: 'C2', lead_id: 'L2', status: 'sent', updated_at: '2026-01-01T00:00:00.000Z' },
    ],
    marketing_messages: [],
  });
  const res = await persistProspectingResponse({ ...inbound, externalContactId: '5511987654321' }, client);
  assert.equal(res.matched, true);
  assert.equal(client.__tables.marketing_lead_campaigns[0].status, 'responded');
}]);

checks.push(['BUG A: client nulo (env não configurado) → skip silencioso', async () => {
  const res = await persistProspectingResponse(inbound, null);
  assert.deepStrictEqual(res, { matched: false, messageInserted: false, statusUpdated: false });
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