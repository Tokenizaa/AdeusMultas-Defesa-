/**
 * @file job-queue.ts
 * Fila assíncrona e resiliente de geração de mídia.
 */

import { randomUUID } from 'crypto';
import {
  ImageGenerationOptions,
  ImageToVideoOptions,
  MediaJob,
  MediaOutput,
  MediaType,
  VideoGenerationOptions,
} from './types';
import { ProviderRouter } from './provider-router';

export class MediaJobQueue {
  private jobs: Map<string, MediaJob> = new Map();
  private router: ProviderRouter;
  private maxConcurrent: number;
  private activeJobsCount: number = 0;
  private cancelledJobIds: Set<string> = new Set();

  constructor(router: ProviderRouter) {
    this.router = router;
    const configuredMax = parseInt(process.env.MEDIA_MAX_CONCURRENT_JOBS || '2', 10);
    this.maxConcurrent = isNaN(configuredMax) || configuredMax < 1 ? 2 : configuredMax;
  }

  public createJob(
    type: MediaType,
    prompt: string,
    options: ImageGenerationOptions | VideoGenerationOptions | ImageToVideoOptions,
    inputMedia?: MediaJob['inputMedia'],
    explicitProvider?: string
  ): MediaJob {
    const id = `job_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const job: MediaJob = {
      id,
      type,
      provider: explicitProvider || 'auto',
      providerKind: 'remote',
      model: 'auto',
      prompt,
      options,
      inputMedia,
      status: 'QUEUED',
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    this.jobs.set(id, job);
    this.scheduleNext();
    return job;
  }

  public getJob(id: string): MediaJob | undefined {
    return this.jobs.get(id);
  }

  public listJobs(limit: number = 50): MediaJob[] {
    return Array.from(this.jobs.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  public cancelJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;

    if (job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED') {
      return false;
    }

    this.cancelledJobIds.add(id);
    job.status = 'CANCELLED';
    job.completedAt = new Date().toISOString();
    return true;
  }

  private scheduleNext(): void {
    if (this.activeJobsCount >= this.maxConcurrent) {
      return;
    }

    const queuedJob = Array.from(this.jobs.values()).find((j) => j.status === 'QUEUED');
    if (!queuedJob) {
      return;
    }

    this.processJob(queuedJob);
  }

  private async processJob(job: MediaJob): Promise<void> {
    this.activeJobsCount++;
    job.status = 'PROCESSING';
    job.startedAt = new Date().toISOString();
    job.progress = 5;

    try {
      if (this.cancelledJobIds.has(job.id)) {
        job.status = 'CANCELLED';
        return;
      }

      const provider = await this.router.resolveProvider(
        job.type,
        job.provider !== 'auto' ? job.provider : undefined
      );

      job.provider = provider.id;
      job.providerKind = provider.kind;

      let output: MediaOutput;

      const onProgress = (p: number) => {
        if (!this.cancelledJobIds.has(job.id)) {
          job.progress = Math.max(job.progress, p);
        }
      };

      if (job.type === 'image') {
        output = await provider.generateImage(job.options as ImageGenerationOptions);
      } else if (job.type === 'video') {
        output = await provider.generateVideo(job.options as VideoGenerationOptions, onProgress);
      } else {
        const i2vOpts = job.options as ImageToVideoOptions;
        if (!i2vOpts.referenceImageBase64 && job.inputMedia?.imageBase64Preview) {
          i2vOpts.referenceImageBase64 = job.inputMedia.imageBase64Preview;
        }
        if (!i2vOpts.referenceImageUrl && job.inputMedia?.imageUrl) {
          i2vOpts.referenceImageUrl = job.inputMedia.imageUrl;
        }
        output = await provider.generateImageToVideo(i2vOpts, onProgress);
      }

      if (this.cancelledJobIds.has(job.id)) {
        job.status = 'CANCELLED';
      } else {
        job.status = 'COMPLETED';
        job.progress = 100;
        job.output = output;
        job.model = output.metadata?.model || job.model;
        job.completedAt = new Date().toISOString();
      }
    } catch (err: any) {
      if (this.cancelledJobIds.has(job.id)) {
        job.status = 'CANCELLED';
      } else {
        job.status = 'FAILED';
        job.error = err?.message || String(err);
        job.completedAt = new Date().toISOString();
      }
    } finally {
      this.activeJobsCount--;
      this.scheduleNext();
    }
  }
}
