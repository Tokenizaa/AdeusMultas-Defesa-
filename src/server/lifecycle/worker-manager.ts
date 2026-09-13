/**
 * @file worker-manager.ts
 * Initializes and manages all BullMQ workers
 */

import { 
  getRedisConnection, 
  checkRedisHealth, 
  shutdownQueues,
  getQueueMetrics 
} from '../config/redis';

// Import all workers to register them
import '../workers/ocr.worker';
import '../workers/messaging.worker';
import '../workers/marketing.worker';
import '../workers/scraping.worker';

let initialized = false;
let healthCheckInterval: NodeJS.Timeout | null = null;

// ==========================================
// Initialize All Workers
// ==========================================

export async function initializeWorkers(): Promise<void> {
  if (initialized) {
    console.log('[Worker Manager] Workers already initialized');
    return;
  }

  const redisConfig = getRedisConnection();
  console.log('[Worker Manager] Initializing workers with Redis:', `${redisConfig.host}:${redisConfig.port}`);

  // Verify Redis connection
  const health = await checkRedisHealth();
  if (!health.healthy) {
    console.warn('[Worker Manager] Redis health check failed:', health.error);
    console.warn('[Worker Manager] Workers will start but may fail until Redis is available');
  } else {
    console.log('[Worker Manager] Redis healthy, latency:', health.latencyMs, 'ms');
  }

  // Workers are auto-registered via imports above
  // They attach to their respective queues immediately
  
  initialized = true;
  console.log('[Worker Manager] All workers initialized');

  // Start periodic health check
  startHealthCheck();
}

// ==========================================
// Periodic Health Check
// ==========================================

function startHealthCheck(): void {
  healthCheckInterval = setInterval(async () => {
    const health = await checkRedisHealth();
    if (!health.healthy) {
      console.error('[Worker Manager] Redis unhealthy:', health.error);
    }
  }, 60000); // Every minute
}

// ==========================================
// Get All Queue Metrics (for admin dashboard)
// ==========================================

export async function getAllQueueMetrics(): Promise<Record<string, any>> {
  const { QUEUE_NAMES } = await import('../config/redis');
  
  const metrics: Record<string, any> = {};
  
  for (const [name, queueName] of Object.entries(QUEUE_NAMES)) {
    try {
      metrics[name.toLowerCase()] = await getQueueMetrics(queueName);
    } catch (error) {
      metrics[name.toLowerCase()] = { error: String(error) };
    }
  }
  
  return metrics;
}

// ==========================================
// Graceful Shutdown
// ==========================================

export async function shutdownWorkers(): Promise<void> {
  console.log('[Worker Manager] Shutting down workers...');
  
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
  
  await shutdownQueues();
  initialized = false;
  console.log('[Worker Manager] Workers shut down complete');
}

// ==========================================
// Worker Status (for health endpoint)
// ==========================================

export function getWorkerStatus(): {
  initialized: boolean;
  redisConnected: boolean;
  workers: string[];
} {
  return {
    initialized,
    redisConnected: initialized, // Simplified
    workers: [
      'ocr-processing',
      'ocr-processing-quality',
      'whatsapp-messaging',
      'whatsapp-messaging-template',
      'whatsapp-messaging-status',
      'marketing-automation',
      'marketing-automation-nurture',
      'marketing-automation-scraping',
      'marketing-automation-ads',
      'scraping-jobs',
    ],
  };
}

// ==========================================
// Auto-initialize on import (for server startup)
// ==========================================

if (process.env.NODE_ENV !== 'test') {
  // Initialize asynchronously but don't await
  initializeWorkers().catch((err) => {
    console.error('[Worker Manager] Failed to initialize workers:', err);
  });
}

// Handle shutdown signals
process.on('SIGTERM', shutdownWorkers);
process.on('SIGINT', shutdownWorkers);