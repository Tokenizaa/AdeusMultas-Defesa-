/**
 * @file ocr.worker.ts
 * OCR Processing Worker — handles document upload, OCR extraction, quality gate
 */

import { createWorker, getQueue, QUEUE_NAMES } from '../config/redis';
import { ocrService } from '../services/ocr-service';
import { validateImageQuality } from '../services/image-quality.service';

const QUEUE = QUEUE_NAMES.OCR;

// ==========================================
// Job Types
// ==========================================

interface OCRJobData {
  fileId: string;
  caseId: string;
  documentType: 'AIT' | 'CNH' | 'COMPROVANTE' | 'OUTRO';
  fileUrl: string;
  mimeType: string;
}

interface OCRQualityJobData {
  fileId: string;
  caseId: string;
}

// ==========================================
// OCR Processing Worker
// ==========================================

export const ocrWorker = createWorker<OCRJobData>(QUEUE, async ({ data, attemptsMade }) => {
  console.log(`[OCR Worker] Processing job for file ${data.fileId} (attempt ${attemptsMade + 1})`);
  
  // Step 1: Quality gate
  const qualityResult = await validateImageQuality({ imageUrl: data.fileUrl });
  if (!qualityResult.pass) {
    throw new Error(`Image quality gate failed: ${qualityResult.reasons.join(', ')}`);
  }
  
  // Step 2: OCR extraction
  const ocrResult = await ocrService.processDocument(data.fileUrl, data.documentType);
  
  // Step 3: Extract evidence flags for Rule Engine
  const evidenceFlags = ocrService.extractEvidenceFlags(ocrResult, data.documentType);
  
  // Step 4: Store results (Supabase handled by service)
  console.log(`[OCR Worker] Completed file ${data.fileId}: ${ocrResult.text.length} chars, flags: ${Object.keys(evidenceFlags).length}`);
  
  return {
    fileId: data.fileId,
    text: ocrResult.text,
    confidence: ocrResult.confidence,
    evidenceFlags,
    processedAt: new Date().toISOString(),
  };
}, {
  concurrency: 2,
  limiter: { max: 10, duration: 60000 }, // 10 jobs/min max
});

// ==========================================
// Quality Check Worker (lighter, for pre-checks)
// ==========================================

export const ocrQualityWorker = createWorker<OCRQualityJobData>(`${QUEUE}-quality`, async ({ data }) => {
  const qualityResult = await validateImageQuality({ imageUrl: data.fileId });
  return { fileId: data.fileId, ...qualityResult };
}, {
  concurrency: 5,
});

// ==========================================
// Scheduler for periodic cleanup
// ==========================================

const ocrScheduler = getQueue(QUEUE);

// Clean up old completed jobs daily
ocrScheduler.add('cleanup', { action: 'cleanup' }, {
  repeat: { pattern: '0 3 * * *' }, // 3 AM daily
});

export { QUEUE as OCR_QUEUE };