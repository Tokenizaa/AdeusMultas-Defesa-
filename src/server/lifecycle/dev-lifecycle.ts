/**
 * Explicit local-development lifecycle hooks.
 *
 * Side effects that used to be started implicitly by server.ts belong here so
 * the canonical createApp() remains an HTTP composition root.
 *
 * Production/serverless bootstrap must not start these long-lived loops.
 *
 * Redis/BullMQ workers removed — see docs/architecture/REDIS-DECISION.md
 * ScrapeWorker runs via Supabase fallback (no Redis required).
 */
import { contranCollector } from '../services/legislation-collector';
import { marketingOrchestrator } from '../workers/marketing-orchestrator.worker';
import { startMetaTokenRenewal } from '../workers/meta-token-renewal.worker';
import { scrapeWorker } from '../services/scrape-worker';

let started = false;

export async function startDevLifecycle(): Promise<void> {
  if (process.env.NODE_ENV === 'production' || started) return;
  started = true;

  // Existing lifecycle (no Redis/BullMQ)
  contranCollector.start();
  marketingOrchestrator.start();
  startMetaTokenRenewal();
  scrapeWorker.start(); // Uses Supabase fallback when Redis unavailable
}
