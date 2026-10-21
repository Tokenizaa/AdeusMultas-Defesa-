/**
 * Explicit local-development lifecycle hooks.
 *
 * Side effects that used to be started implicitly by server.ts belong here so
 * the canonical createApp() remains an HTTP composition root.
 *
 * Production/serverless bootstrap must not start these long-lived loops.
 */
import { logger } from '../observability/logger';
import { contranCollector } from '../services/legislation-collector';
import { marketingOrchestrator } from '../workers/marketing-orchestrator.worker';
import { startMetaTokenRenewal } from '../workers/meta-token-renewal.worker';
import { scrapeWorker } from '../services/scrape-worker';
import { marketingAutomationWorker } from '../services/marketing-automation/worker';

let started = false;

export async function startDevLifecycle(): Promise<void> {
  if (started) return;
  started = true;

  // O worker de automação de marketing drena a fila marketing_automation_queue
  // em todos os ambientes. Inicia automaticamente no bootstrap — não depende
  // do endpoint manual POST /api/marketing/automation/start. start() é
  // idempotente: se o estado já for RUNNING, não duplica o timer.
  await marketingAutomationWorker.start().catch((err) => {
    logger.warn('marketing', 'automation', 'bootstrap', 'Não foi possível auto-iniciar o marketingAutomationWorker no bootstrap.', {
      error: err instanceof Error ? err.message : String(err),
    });
  });

  if (process.env.NODE_ENV === 'production') return;

  // Existing lifecycle (somente dev / non-serverless)
  contranCollector.start();
  marketingOrchestrator.start();
  startMetaTokenRenewal();
  scrapeWorker.start();
}
