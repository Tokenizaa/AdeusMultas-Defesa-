/**
 * @file marketing.worker.ts
 * Marketing Automation Worker — handles campaigns, lead nurturing, scraping triggers
 */

import { createWorker, getQueue, QUEUE_NAMES } from '../config/redis';
import { marketingService } from '../services/marketing-service';
import { scraperJobQueue } from '../services/scraper-job-queue';

const QUEUE = QUEUE_NAMES.MARKETING;

// ==========================================
// Job Types
// ==========================================

interface CampaignJobData {
  campaignId: string;
  type: 'carrossel' | 'reel' | 'article' | 'infographic' | 'newsletter';
  topic: string;
  targetAudience?: string;
  scheduledFor?: string;
}

interface LeadNurtureJobData {
  leadId: string;
  stage: 'awareness' | 'consideration' | 'decision' | 'retention';
  channel: 'email' | 'whatsapp' | 'push';
  templateId: string;
  params?: Record<string, string>;
}

interface ScrapingJobData {
  source: 'google-maps' | 'facebook' | 'instagram' | 'linkedin' | 'website';
  query: string;
  location?: string;
  maxResults?: number;
  filters?: Record<string, any>;
}

interface AdOptimizationJobData {
  campaignId: string;
  metric: 'roas' | 'cpa' | 'ctr' | 'cpm';
  action: 'pause' | 'increase_budget' | 'decrease_budget' | 'refresh_creative';
}

// ==========================================
// Campaign Generation Worker
// ==========================================

export const campaignWorker = createWorker<CampaignJobData>(QUEUE, async ({ data, attemptsMade }) => {
  console.log(`[Marketing Worker] Generating ${data.type} for campaign ${data.campaignId} (attempt ${attemptsMade + 1})`);
  
  const content = await marketingService.generateContent({
    type: data.type,
    topic: data.topic,
    targetAudience: data.targetAudience,
  });
  
  if (data.scheduledFor) {
    await marketingService.scheduleContent(data.campaignId, content, data.scheduledFor);
  } else {
    await marketingService.publishContent(data.campaignId, content);
  }
  
  return { campaignId: data.campaignId, contentId: content.id, status: 'published' };
}, {
  concurrency: 2,
  limiter: { max: 5, duration: 60000 },
});

// ==========================================
// Lead Nurturing Worker
// ==========================================

export const leadNurtureWorker = createWorker<LeadNurtureJobData>(`${QUEUE}-nurture`, async ({ data }) => {
  console.log(`[Marketing Worker] Nurturing lead ${data.leadId} via ${data.channel} (stage: ${data.stage})`);
  
  if (data.channel === 'email') {
    await marketingService.sendEmailNurture(data.leadId, data.templateId, data.params);
  } else if (data.channel === 'whatsapp') {
    await marketingService.sendWhatsAppNurture(data.leadId, data.templateId, data.params);
  } else if (data.channel === 'push') {
    await marketingService.sendPushNurture(data.leadId, data.templateId, data.params);
  }
  
  return { leadId: data.leadId, channel: data.channel, status: 'sent' };
}, {
  concurrency: 10,
});

// ==========================================
// Scraping Trigger Worker
// ==========================================

export const scrapingWorker = createWorker<ScrapingJobData>(`${QUEUE}-scraping`, async ({ data }) => {
  console.log(`[Marketing Worker] Triggering scraping: ${data.source} - ${data.query}`);
  
  await scraperJobQueue.addJob({
    source: data.source,
    query: data.query,
    location: data.location,
    maxResults: data.maxResults || 50,
    filters: data.filters,
  });
  
  return { status: 'queued' };
}, {
  concurrency: 3,
});

// ==========================================
// Ad Optimization Worker
// ==========================================

export const adOptimizationWorker = createWorker<AdOptimizationJobData>(`${QUEUE}-ads`, async ({ data, attemptsMade }) => {
  console.log(`[Marketing Worker] Optimizing ad ${data.campaignId} for metric ${data.metric} (attempt ${attemptsMade + 1})`);
  
  let actionTaken = false;
  
  switch (data.action) {
    case 'pause':
      await marketingService.pauseCampaign(data.campaignId);
      actionTaken = true;
      break;
    case 'increase_budget':
      await marketingService.increaseBudget(data.campaignId);
      actionTaken = true;
      break;
    case 'decrease_budget':
      await marketingService.decreaseBudget(data.campaignId);
      actionTaken = true;
      break;
    case 'refresh_creative':
      await marketingService.refreshCreative(data.campaignId);
      actionTaken = true;
      break;
  }
  
  if (!actionTaken) {
    throw new Error(`Unsupported ad optimization action: ${data.action}`);
  }
  
  return { campaignId: data.campaignId, action: data.action, status: 'completed' };
}, {
  concurrency: 5,
});

// ==========================================
// Scheduler
// ==========================================

const marketingScheduler = getQueue(QUEUE);

// Daily evergreen content
marketingScheduler.add('daily-evergreen', { 
  type: 'article',
  topic: 'dicas de defesa de multas',
  targetAudience: 'motoristas'
}, {
  repeat: { pattern: '0 9 * * *' }, // 9 AM daily
});

// Hourly nurture leads
marketingScheduler.add('hourly-nurture', { 
  channel: 'email',
  stage: 'consideration'
}, {
  repeat: { pattern: '0 * * * *' }, // Every hour
});

// Weekly ad review
marketingScheduler.add('weekly-ad-review', { 
  action: 'review_performance'
}, {
  repeat: { pattern: '0 10 * * 0' }, // Sunday 10 AM
});

export { QUEUE as MARKETING_QUEUE };