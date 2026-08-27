/**
 * @file media-generation-service.ts
 * Fachada principal e unificada para geração de mídia (imagens, vídeos, I2V).
 * Desacopla toda a aplicação de qualquer modelo ou provider específico.
 */

import { HardwareDetector } from './hardware-detector';
import { MediaJobQueue } from './job-queue';
import { ProviderRouter } from './provider-router';
import {
  HardwareInfo,
  ImageGenerationOptions,
  ImageToVideoOptions,
  MediaJob,
  MediaOutput,
  VideoGenerationOptions,
} from './types';

export class MediaGenerationService {
  private static instance: MediaGenerationService;
  private router: ProviderRouter;
  private queue: MediaJobQueue;

  private constructor() {
    this.router = new ProviderRouter();
    this.queue = new MediaJobQueue(this.router);
  }

  public static getInstance(): MediaGenerationService {
    if (!MediaGenerationService.instance) {
      MediaGenerationService.instance = new MediaGenerationService();
    }
    return MediaGenerationService.instance;
  }

  /**
   * Enfileira job assíncrono para geração de imagem.
   */
  public enqueueImageJob(options: ImageGenerationOptions, explicitProvider?: string): MediaJob {
    return this.queue.createJob('image', options.prompt, options, undefined, explicitProvider);
  }

  /**
   * Enfileira job assíncrono para geração de vídeo.
   */
  public enqueueVideoJob(options: VideoGenerationOptions, explicitProvider?: string): MediaJob {
    return this.queue.createJob('video', options.prompt, options, undefined, explicitProvider);
  }

  /**
   * Enfileira job assíncrono para Image-to-Video.
   */
  public enqueueImageToVideoJob(
    options: ImageToVideoOptions,
    inputMedia?: MediaJob['inputMedia'],
    explicitProvider?: string
  ): MediaJob {
    return this.queue.createJob(
      'image_to_video',
      options.prompt || 'Animate this image',
      options,
      inputMedia,
      explicitProvider
    );
  }

  /**
   * Consulta o estado e progresso de um job.
   */
  public getJob(id: string): MediaJob | undefined {
    return this.queue.getJob(id);
  }

  /**
   * Cancela um job em fila ou em execução.
   */
  public cancelJob(id: string): boolean {
    return this.queue.cancelJob(id);
  }

  /**
   * Lista os jobs recentes.
   */
  public listJobs(limit: number = 50): MediaJob[] {
    return this.queue.listJobs(limit);
  }

  /**
   * Geração direta síncrona/await de imagem (quando o chamador necessita de resposta imediata).
   */
  public async generateImageDirect(
    options: ImageGenerationOptions,
    explicitProvider?: string
  ): Promise<MediaOutput> {
    const provider = await this.router.resolveProvider('image', explicitProvider);
    return provider.generateImage(options);
  }

  /**
   * Geração direta de vídeo (aguarda conclusão).
   */
  public async generateVideoDirect(
    options: VideoGenerationOptions,
    explicitProvider?: string,
    onProgress?: (progress: number) => void
  ): Promise<MediaOutput> {
    const provider = await this.router.resolveProvider('video', explicitProvider);
    return provider.generateVideo(options, onProgress);
  }

  /**
   * Geração direta Image-to-Video.
   */
  public async generateImageToVideoDirect(
    options: ImageToVideoOptions,
    explicitProvider?: string,
    onProgress?: (progress: number) => void
  ): Promise<MediaOutput> {
    const provider = await this.router.resolveProvider('image_to_video', explicitProvider);
    return provider.generateImageToVideo(options, onProgress);
  }

  /**
   * Retorna informações e classificação de hardware do ambiente.
   */
  public getHardwareAudit(): HardwareInfo {
    return HardwareDetector.getHardwareInfo();
  }

  /**
   * Retorna os provedores registrados e estado de roteamento.
   */
  public getProvidersInfo() {
    return {
      providers: this.router.getAvailableProviders(),
      hardware: this.getHardwareAudit(),
      config: {
        MEDIA_PROVIDER: process.env.MEDIA_PROVIDER || 'auto',
        MEDIA_IMAGE_PROVIDER: process.env.MEDIA_IMAGE_PROVIDER || 'auto',
        MEDIA_VIDEO_PROVIDER: process.env.MEDIA_VIDEO_PROVIDER || 'auto',
        MEDIA_LOCAL_ENABLED: process.env.MEDIA_LOCAL_ENABLED === 'true',
        MEDIA_REMOTE_ENABLED: process.env.MEDIA_REMOTE_ENABLED !== 'false',
        MEDIA_MAX_CONCURRENT_JOBS: process.env.MEDIA_MAX_CONCURRENT_JOBS || '2',
      },
    };
  }
}

export const mediaGenerationService = MediaGenerationService.getInstance();
