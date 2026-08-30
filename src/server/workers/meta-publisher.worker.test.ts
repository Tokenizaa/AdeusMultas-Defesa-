/**
 * Testes: MetaPublisher — fila persistente via publisher_jobs (restart survival).
 * Rode: npx tsx src/server/workers/meta-publisher.worker.test.ts
 *
 * Contrato sob teste (src/server/workers/meta-publisher.worker.ts):
 * - enqueue() persiste job em publisher_jobs (job_payload + status pending)
 * - loadPendingJobs() (chamado no construtor) recupera jobs pendentes após restart
 *
 * Supabase mockado com store em memória — não depende de rede nem de credenciais.
 */

import assert from 'node:assert';
import { MetaPublisher } from './meta-publisher.worker';
import { metaAdapter } from '../../integrations/meta/adapters/meta-adapter';

// ─── Mock Supabase Client (store em memória) ────────────────────────────────
const mockStore: Record<string, any[]> = { publisher_jobs: [] };

class MockQueryBuilder {
  private filters: Array<(row: any) => boolean> = [];
  private orderBy: { col: string; asc: boolean } | null = null;
  private limitVal: number | null = null;
  private isSingle = false;
  private isDelete = false;

  constructor(private table: string) {}

  select() { return this; }
  in(col: string, vals: any[]) { this.filters.push((r) => vals.includes(r[col])); return this; }
  eq(col: string, val: any) { this.filters.push((r) => r[col] === val); return this; }
  lte(col: string, val: any) { this.filters.push((r) => r[col] <= val); return this; }
  gte(col: string, val: any) { this.filters.push((r) => r[col] >= val); return this; }
  order(col: string, opts: { ascending?: boolean } = {}) { this.orderBy = { col, asc: opts.ascending ?? false }; return this; }
  limit(n: number) { this.limitVal = n; return this; }
  single() { this.isSingle = true; return this; }
  delete() { this.isDelete = true; return this; }

  insert(data: any) {
    const table = mockStore[this.table] || (mockStore[this.table] = []);
    const items = Array.isArray(data) ? data : [data];
    table.push(...items);
    return Promise.resolve({ data: items, error: null });
  }

  upsert(data: any) {
    const table = mockStore[this.table] || (mockStore[this.table] = []);
    const items = Array.isArray(data) ? data : [data];
    for (const item of items) {
      const idx = table.findIndex((r) => r.id === item.id);
      if (idx >= 0) table[idx] = { ...table[idx], ...item };
      else table.push(item);
    }
    return Promise.resolve({ data: items, error: null });
  }

  async then(resolve: any) {
    const table = mockStore[this.table] || [];

    if (this.isDelete) {
      for (let i = table.length - 1; i >= 0; i--) {
        if (this.filters.every((f) => f(table[i]))) table.splice(i, 1);
      }
      return resolve({ data: null, error: null });
    }

    let rows = table.filter((r) => this.filters.every((f) => f(r)));
    if (this.orderBy) {
      rows.sort((a, b) => {
        const av = a[this.orderBy!.col];
        const bv = b[this.orderBy!.col];
        if (av < bv) return this.orderBy!.asc ? -1 : 1;
        if (av > bv) return this.orderBy!.asc ? 1 : -1;
        return 0;
      });
    }
    if (this.limitVal) rows = rows.slice(0, this.limitVal);
    if (this.isSingle) rows = rows.length > 0 ? [rows[0]] : [];
    return resolve({ data: rows, error: null });
  }
}

const mockSupabase: any = {
  from(table: string) { return new MockQueryBuilder(table); },
};

// ─── Runner ─────────────────────────────────────────────────────────────────
let failures = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) {
    console.log(`  [PASS] ${name}`);
  } else {
    failures++;
    console.error(`  [FAIL] ${name} ${detail}`);
  }
}

async function main() {
  console.log('\n=== MetaPublisher — fila persistente via publisher_jobs ===');

  // Stubs para o metaAdapter (enqueue exige isConnected; process chama publishContent)
  const originalIsConnected = metaAdapter.isConnected;
  const originalPublish = metaAdapter.publishContent;
  (metaAdapter as any).isConnected = () => true;
  (metaAdapter as any).publishContent = async () => {
    // Falha não-auth => deliver() entra no caminho de retry (status permanece pending
    // com scheduled_at futuro) — permite testar restart recovery sem rede.
    throw new Error('Test error: Meta API indisponível (simulado)');
  };

  try {
    // ── Teste 1: enqueue persiste em publisher_jobs ──
    mockStore.publisher_jobs = [];
    const publisher = new MetaPublisher(mockSupabase);

    const result = await publisher.enqueue({
      destination: 'instagram',
      message: 'Test message',
    }, 'test-content-id');

    check('enqueue => queued:true', result.queued === true, JSON.stringify(result));
    check('enqueue => itemId não-vazio', typeof result.itemId === 'string' && result.itemId.length > 0, JSON.stringify(result));

    // Aguarda persist (await em persistJobRecord dentro de enqueue) + process() fire-and-forget
    await new Promise((r) => setTimeout(r, 150));

    const rows = mockStore.publisher_jobs;
    check('publisher_jobs tem 1 row', rows.length >= 1, `count=${rows.length}`);
    check('job tem status DB-válido', rows[0] && ['pending', 'retry', 'published', 'failed', 'blocked', 'processing'].includes(rows[0].status), `status=${rows[0]?.status}`);
    check('job tem job_payload', Boolean(rows[0]?.job_payload), JSON.stringify(rows[0]?.job_payload));
    check('job_payload.destination = instagram', rows[0]?.job_payload?.destination === 'instagram', JSON.stringify(rows[0]?.job_payload));
    check('job tem attempt_count', rows[0]?.attempt_count !== undefined, `attempt_count=${rows[0]?.attempt_count}`);
    check('job tem scheduled_at', Boolean(rows[0]?.scheduled_at), `scheduled_at=${rows[0]?.scheduled_at}`);
    check('enqueue => histórico tem 1 job', publisher.getJobHistory().length >= 1, `history=${publisher.getJobHistory().length}`);

    // ── Teste 2: restart recupera jobs pendentes do publisher_jobs ──
    mockStore.publisher_jobs = [
      {
        id: 'test-restart-job-id',
        content_id: 'test-content-id-2',
        channel: 'instagram',
        destination: 'instagram',
        status: 'pending',
        attempt_count: 0,
        max_attempts: 3,
        scheduled_at: new Date().toISOString(),
        job_payload: { destination: 'instagram', message: 'Restart test' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Simula restart: nova instância com a MESMA store (o construtor chama loadPendingJobs)
    const restarted = new MetaPublisher(mockSupabase);
    await restarted.loadPendingJobs();

    const queue = restarted.getQueue();
    check('restart => fila carrega job pendente', queue.length >= 1, `queue=${JSON.stringify(queue)}`);
    check('restart => id do job preservado', queue[0]?.id === 'test-restart-job-id', JSON.stringify(queue));
    check('restart => destination preservada', queue[0]?.destination === 'instagram', JSON.stringify(queue));
    check('restart => attempts restaurado', queue[0]?.attempts === 0, JSON.stringify(queue));

    // ── Teste 3: job recuperado do DB preserva created_at original (não o de delivery) ──
    const ORIGINAL_CREATED_AT = '2026-01-01T00:00:00.000Z';
    mockStore.publisher_jobs = [
      {
        id: 'restart-created-at-id',
        content_id: 'test-content-id-3',
        channel: 'instagram',
        destination: 'instagram',
        status: 'pending',
        attempt_count: 0,
        max_attempts: 3,
        scheduled_at: new Date().toISOString(),
        job_payload: { destination: 'instagram', message: 'CreatedAt test' },
        created_at: ORIGINAL_CREATED_AT,
        updated_at: ORIGINAL_CREATED_AT,
      },
    ];

    const createdAtPub = new MetaPublisher(mockSupabase);
    await createdAtPub.loadPendingJobs();
    // publishContent stub lança (não-auth) => deliver() cai no retry => findOrCreateRec usa item.createdAt
    await (createdAtPub as any).process();

    const createdAtRec = createdAtPub.getJobHistory().find((r) => r.id === 'restart-created-at-id');
    check('recuperado => created_at original preservado', createdAtRec?.createdAt === ORIGINAL_CREATED_AT, JSON.stringify(createdAtRec));
    check('recuperado => status segue retrying (pending no DB)', createdAtRec?.status === 'retrying', JSON.stringify(createdAtRec));

    console.log(`\n${failures === 0 ? 'TODOS OS TESTES PASSARAM' : `${failures} ASSERT(S) FALHARAM`}`);
    process.exitCode = failures === 0 ? 0 : 1;
  } finally {
    (metaAdapter as any).isConnected = originalIsConnected;
    (metaAdapter as any).publishContent = originalPublish;
  }
}

main().catch((err) => {
  console.error('ERRO FATAL no teste:', err);
  process.exit(1);
});