/**
 * @file scraping.worker.ts
 * Scraping Worker — handles Google Maps, Facebook, Instagram, LinkedIn scraping
 */

import { createWorker, getQueue, QUEUE_NAMES } from '../config/redis';
import { scrapeWorker } from '../services/scrape-worker';

const QUEUE = QUEUE_NAMES.SCRAPING;

// ==========================================
// Job Types
// ==========================================

interface ScrapingJobData {
  source: 'google-maps' | 'facebook' | 'instagram' | 'linkedin' | 'website';
  query: string;
  location?: string;
  maxResults?: number;
  filters?: Record<string, any>;
  jobId: string;
}

// ==========================================
// Scraping Worker
// ==========================================

export const scrapingWorker = createWorker<ScrapingJobData>(QUEUE, async ({ data, attemptsMade }) => {
  console.log(`[Scraping Worker] ${data.source}: "${data.query}" ${data.location ? `in ${data.location}` : ''} (attempt ${attemptsMade + 1})`);
  
  const results = await scrapeWorker.execute({
    source: data.source,
    query: data.query,
    location: data.location,
    maxResults: data.maxResults || 50,
    filters: data.filters,
  });
  
  console.log(`[Scraping Worker] Completed job ${data.jobId}: ${results.length} results`);
  
  return {
    jobId: data.jobId,
    source: data.source,
    resultsCount: results.length,
    completedAt: new Date().toISOString(),
  };
}, {
  concurrency: 2,
  limiter: { max: 10, duration: 60000 }, // Respect rate limits
});

// ==========================================
// Schedulers
// ==========================================

const scrapingScheduler = getQueue(QUEUE);

// Daily prospecting scrape (weekdays 9 AM)
scrapingScheduler.add('daily-prospecting', {
  source: 'google-maps',
  query: 'escritorio advocacia transito',
  location: 'São Paulo, SP',
  maxResults: 100,
}, {
  repeat: { pattern: '0 9 * * 1-5' }, // Weekdays 9 AM
});

// Weekly competitor monitoring
scrapingScheduler.add('weekly-competitors', {
  source: 'website',
  query: 'competitor analysis',
  maxResults: 50,
}, {
  repeat: { pattern: '0 10 * * 1' }, // Monday 10 AM
});

export { QUEUE as SCRAPING_QUEUE };