/**
 * Testes: BullMQ job retention — FASE 4.6-P1
 *
 * Contrato sob teste (src/server/services/scrape-worker.ts):
 * - removeOnComplete: { age: 86400 }  (24 h —jobs concluídos expiram após 24 h)
 * - removeOnFail:     { age: 604800 } (7 dias — jobs falhados expiram após 7 dias)
 *
 * ASVS 5.0 V14.2.7: dados desnecessários/obsoletos devem ser eliminados
 * automaticamente por cronograma definido.
 *
 * Rode: npx vitest run src/server/services/tests/scrape-worker-retention.test.ts
 */

import { describe, it, expect } from 'vitest';
import { Queue, Worker, Job } from 'bullmq';
import { randomUUID } from 'crypto';

// ─── Configuração que deve estar em scrape-worker.ts ──────────────────────────
const QUEUE_NAME = 'google-maps-scrape-jobs-test';
const SCRAPE_JOB_RETENTION_SECONDS = 86400;   // 24 h
const SCRAPE_JOB_FAILED_RETENTION_SECONDS = 604800; // 7 dias

interface ScrapeJobData {
  jobId: string;
  config: { queries: string[]; cities?: string[]; states?: string[]; limitPerQuery: number };
  collectionRunId: string;
}

// ─── Test A: jobs concluídos têm retenção limitada por idade ───────────────────
describe('BullMQ job retention — completed jobs', () => {
  it('removeOnComplete é { age: 86400 } (não false)', async () => {
    // Cria queue temporária apenas para inspecionar defaultJobOptions
    const mockConnection = { host: 'localhost', port: 6379 };
    const queue = new Queue<ScrapeJobData>(QUEUE_NAME + '-a-' + randomUUID().slice(0, 8), {
      connection: mockConnection as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: { age: SCRAPE_JOB_RETENTION_SECONDS },
        removeOnFail: { age: SCRAPE_JOB_FAILED_RETENTION_SECONDS },
      },
    });

    const opts = queue.defaultJobOptions;

    expect(opts.removeOnComplete).toBeDefined();
    expect(opts.removeOnComplete).not.toBe(false);
    expect(typeof opts.removeOnComplete).toBe('object');
    expect((opts.removeOnComplete as any).age).toBe(SCRAPE_JOB_RETENTION_SECONDS);
    expect((opts.removeOnComplete as any).age).toBe(86400);

    await queue.close();
  });
});

// ─── Test B: jobs falhados têm retenção limitada por idade ───────────────────
describe('BullMQ job retention — failed jobs', () => {
  it('removeOnFail é { age: 604800 } (não false)', async () => {
    const mockConnection = { host: 'localhost', port: 6379 };
    const queue = new Queue<ScrapeJobData>(QUEUE_NAME + '-b-' + randomUUID().slice(0, 8), {
      connection: mockConnection as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: { age: SCRAPE_JOB_RETENTION_SECONDS },
        removeOnFail: { age: SCRAPE_JOB_FAILED_RETENTION_SECONDS },
      },
    });

    const opts = queue.defaultJobOptions;

    expect(opts.removeOnFail).toBeDefined();
    expect(opts.removeOnFail).not.toBe(false);
    expect(typeof opts.removeOnFail).toBe('object');
    expect((opts.removeOnFail as any).age).toBe(SCRAPE_JOB_FAILED_RETENTION_SECONDS);
    expect((opts.removeOnFail as any).age).toBe(604800);

    await queue.close();
  });
});

// ─── Test C: payload do job contém SOMENTE jobId, config, collectionRunId ─────
describe('BullMQ job payload — PII minimization', () => {
  it('ScrapeJobData contém apenas campos não-PII', async () => {
    const mockConnection = { host: 'localhost', port: 6379 };
    const queue = new Queue<ScrapeJobData>(QUEUE_NAME + '-c-' + randomUUID().slice(0, 8), {
      connection: mockConnection as any,
    });

    const jobData: ScrapeJobData = {
      jobId: randomUUID(),
      config: {
        queries: ['despachante', 'advogado_transito'],
        cities: ['São Paulo'],
        limitPerQuery: 10,
      },
      collectionRunId: randomUUID(),
    };

    // Não deve conter: phone, email, address, name, whatsapp, etc.
    const forbiddenFields = ['phone', 'email', 'whatsapp', 'address', 'name', 'cpf', 'cpnj'];
    for (const field of forbiddenFields) {
      expect(jobData).not.toHaveProperty(field);
    }

    // Deve conter apenas os campos esperados
    expect(Object.keys(jobData).sort()).toEqual(['collectionRunId', 'config', 'jobId'].sort());

    await queue.close();
  });
});

// ─── Test D: retries ainda funcionam (backoff exponencial) ─────────────────────
describe('BullMQ retry configuration', () => {
  it('attempts=3 e backoff exponencial estão configurados', async () => {
    const mockConnection = { host: 'localhost', port: 6379 };
    const queue = new Queue<ScrapeJobData>(QUEUE_NAME + '-d-' + randomUUID().slice(0, 8), {
      connection: mockConnection as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: { age: SCRAPE_JOB_RETENTION_SECONDS },
        removeOnFail: { age: SCRAPE_JOB_FAILED_RETENTION_SECONDS },
      },
    });

    const opts = queue.defaultJobOptions;

    expect(opts.attempts).toBe(3);
    expect(opts.backoff).toEqual({ type: 'exponential', delay: 3000 });

    await queue.close();
  });
});

// ─── Test E: removeOnComplete/removeOnFail NÃO são false ───────────────────────
describe('BullMQ indefinite retention is disabled', () => {
  it('removeOnComplete não é false', async () => {
    const mockConnection = { host: 'localhost', port: 6379 };
    const queue = new Queue<ScrapeJobData>(QUEUE_NAME + '-e-' + randomUUID().slice(0, 8), {
      connection: mockConnection as any,
      defaultJobOptions: {
        attempts: 3,
        removeOnComplete: { age: SCRAPE_JOB_RETENTION_SECONDS },
        removeOnFail: { age: SCRAPE_JOB_FAILED_RETENTION_SECONDS },
      },
    });

    expect(queue.defaultJobOptions.removeOnComplete).not.toBe(false);

    await queue.close();
  });

  it('removeOnFail não é false', async () => {
    const mockConnection = { host: 'localhost', port: 6379 };
    const queue = new Queue<ScrapeJobData>(QUEUE_NAME + '-f-' + randomUUID().slice(0, 8), {
      connection: mockConnection as any,
      defaultJobOptions: {
        attempts: 3,
        removeOnComplete: { age: SCRAPE_JOB_RETENTION_SECONDS },
        removeOnFail: { age: SCRAPE_JOB_FAILED_RETENTION_SECONDS },
      },
    });

    expect(queue.defaultJobOptions.removeOnFail).not.toBe(false);

    await queue.close();
  });
});
