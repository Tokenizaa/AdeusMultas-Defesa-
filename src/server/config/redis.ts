/**
 * @file redis.ts
 * Redis connection and BullMQ queue configuration
 */

import { Queue, Worker } from 'bullmq';
import { JobScheduler } from 'bullmq';
import { configService } from '../config/config-service';

// ==========================================
// Redis Connection
// ==========================================

let redisConnection: { host: string; port: number; password?: string; tls?: boolean } | null = null;

export function getRedisConnection() {
  if (!redisConnection) {
    const url = configService.get('REDIS_URL');
    if (url) {
      // Parse redis://host:port or rediss://host:port
      const parsed = new URL(url);
      redisConnection = {
        host: parsed.hostname,
        port: parseInt(parsed.port || '6379'),
        password: parsed.password || undefined,
        tls: parsed.protocol === 'rediss:',
      };
    } else {
      // Fallback to individual config
      redisConnection = {
        host: configService.get('REDIS_HOST') || 'localhost',
        port: parseInt(configService.get('REDIS_PORT') || '6379'),
        password: configService.get('REDIS_PASSWORD') || undefined,
        tls: configService.get('REDIS_TLS') === 'true',
      };
    }
  }
  return redisConnection;
}

// ==========================================
// Queue Names (Centralized)
// ==========================================

export const QUEUE_NAMES = {
  OCR: 'ocr-processing',
  MESSAGING: 'whatsapp-messaging',
  MARKETING: 'marketing-automation',
  SCRAPING: 'scraping-jobs',
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

// ==========================================
// Default Job Options
// ==========================================

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 5000, // 5s base delay
  },
  removeOnComplete: {
    age: 3600, // 1 hour
    count: 1000,
  },
  removeOnFail: {
    age: 86400, // 24 hours
    count: 5000,
  },
} as const;

// ==========================================
// DLQ Queue Names
// ==========================================

export const DLQ_NAMES = {
  OCR: 'ocr-processing-dlq',
  MESSAGING: 'whatsapp-messaging-dlq',
  MARKETING: 'marketing-automation-dlq',
  SCRAPING: 'scraping-jobs-dlq',
} as const;

// ==========================================
// Queue Factory
// ==========================================

const queueCache = new Map<QueueName, Queue>();

export function getQueue(name: QueueName): Queue {
  if (!queueCache.has(name)) {
    const connection = getRedisConnection();
    queueCache.set(name, new Queue(name, { connection }));
  }
  return queueCache.get(name)!;
}

// ==========================================
// Worker Factory with Standard Retry/DLQ
// ==========================================

export interface WorkerOptions<T = any> {
  concurrency?: number;
  limiter?: { max: number; duration: number };
  processJob: (job: { data: T; attemptsMade: number }) => Promise<any>;
}

export function createWorker<T = any>(
  name: QueueName,
  options: WorkerOptions<T>
): Worker {
  const connection = getRedisConnection();
  const dlqName = DLQ_NAMES[name as keyof typeof DLQ_NAMES];

  const worker = new Worker(name, async (job) => {
    try {
      return await options.processJob({
        data: job.data,
        attemptsMade: job.attemptsMade,
      });
    } catch (error) {
      // Re-throw to trigger BullMQ retry logic
      throw error;
    }
  }, {
    connection,
    concurrency: options.concurrency || 1,
    limiter: options.limiter,
    // Failed jobs go to DLQ after max attempts
    failedAttempts: 3,
  });

  // Dead Letter Queue handling
  worker.on('failed', async (job, err) => {
    if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
      console.error(`[Worker ${name}] Job ${job.id} failed permanently after ${job.attemptsMade} attempts:`, err);
      
      // Add to DLQ for manual inspection
      try {
        const dlq = getQueue(dlqName as QueueName);
        await dlq.add('failed-job', {
          originalQueue: name,
          originalJobId: job.id,
          originalData: job.data,
          error: err.message,
          stack: err.stack,
          failedAt: new Date().toISOString(),
          attemptsMade: job.attemptsMade,
        });
        console.log(`[Worker ${name}] Job ${job.id} moved to DLQ: ${dlqName}`);
      } catch (dlqError) {
        console.error(`[Worker ${name}] Failed to add job to DLQ:`, dlqError);
      }
    }
  });

  worker.on('error', (err) => {
    console.error(`[Worker ${name}] Worker error:`, err);
  });

  return worker;
}

// ==========================================
// Queue Schedulers (for delayed/repeatable jobs)
// ==========================================

const schedulerCache = new Map<QueueName, JobScheduler>();

export function getScheduler(name: QueueName): JobScheduler {
  if (!schedulerCache.has(name)) {
    const connection = getRedisConnection();
    schedulerCache.set(name, new JobScheduler(name, { connection }));
  }
  return schedulerCache.get(name)!;
}

// ==========================================
// Health Check
// ==========================================

export async function checkRedisHealth(): Promise<{
  healthy: boolean;
  latencyMs?: number;
  error?: string;
}> {
  try {
    const connection = getRedisConnection();
    const testQueue = new Queue('__health_check__', { connection });
    const start = Date.now();
    await testQueue.add('ping', { test: true });
    const latency = Date.now() - start;
    await testQueue.close();
    return { healthy: true, latencyMs: latency };
  } catch (error) {
    return { healthy: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// ==========================================
// Graceful Shutdown
// ==========================================

export async function shutdownQueues(): Promise<void> {
  const promises: Promise<void>[] = [];
  
  for (const [, queue] of queueCache) {
    promises.push(queue.close());
  }
  
  for (const [, scheduler] of schedulerCache) {
    promises.push(scheduler.close());
  }
  
  await Promise.all(promises);
  queueCache.clear();
  schedulerCache.clear();
}

// ==========================================
// Queue Metrics (for monitoring)
// ==========================================

export async function getQueueMetrics(name: QueueName): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}> {
  const queue = getQueue(name);
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);
  
  const isPaused = await queue.isPaused();
  
  return { waiting, active, completed, failed, delayed, paused: isPaused };
}