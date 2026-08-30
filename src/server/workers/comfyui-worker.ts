/**
 * ComfyUI Worker for Marketing OS
 * Handles image and video generation for marketing content
 */

import { logger } from '../observability/logger';
import { eventBus, EventTopics } from '../../core/events/topics';
import { marketingService } from '../services/marketing-service';
import { comfyuiMarketing, ImageGenerationRequest, VideoGenerationRequest } from '../integrations/comfyui-marketing';

export class ComfyUIWorker {
  private id = 'comfyui';
  private lastRun: Date | null = null;
  private isRunning = false;
  private isAvailable = false;

  constructor() {
    // Test connection on initialization
    this.testConnection();
  }

  /**
   * Test connection to ComfyUI server
   */
  async testConnection(): Promise<void> {
    try {
      this.isAvailable = await comfyuiMarketing.testConnection();
      if (this.isAvailable) {
        logger.info('marketing', 'comfyui', 'connection', 'ComfyUI worker connected and ready');
      } else {
        logger.debug('marketing', 'comfyui', 'connection', 'ComfyUI server offline or optional');
      }
    } catch {
      this.isAvailable = false;
    }
  }

  /**
   * Generate image for marketing content
   */
  async generateImage(request: ImageGenerationRequest): Promise<string[]> {
    if (!this.isAvailable) {
      logger.warn('marketing', 'comfyui', 'generateImage', 'ComfyUI not available, skipping image generation');
      return [];
    }

    if (this.isRunning) {
      logger.warn('marketing', 'comfyui', 'generateImage', 'ComfyUI worker busy');
      return [];
    }

    this.isRunning = true;
    const startTime = new Date();

    try {
      logger.info('marketing', 'comfyui', 'generateImage', 'Starting image generation', {
        type: request.type,
        topic: request.topic,
        platform: request.platform
      });

      const images = await comfyuiMarketing.generateImage(request);

      logger.info('marketing', 'comfyui', 'generateImage', 'Image generation completed', {
        count: images.length,
        durationMs: new Date().getTime() - startTime.getTime()
      });

      return images;
    } catch (error) {
      logger.error('marketing', 'comfyui', 'generateImage', 'Image generation failed', { error });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Generate video for marketing content
   */
  async generateVideo(request: VideoGenerationRequest): Promise<string[]> {
    if (!this.isAvailable) {
      logger.warn('marketing', 'comfyui', 'generateVideo', 'ComfyUI not available, skipping video generation');
      return [];
    }

    if (this.isRunning) {
      logger.warn('marketing', 'comfyui', 'generateVideo', 'ComfyUI worker busy');
      return [];
    }

    this.isRunning = true;
    const startTime = new Date();

    try {
      logger.info('marketing', 'comfyui', 'generateVideo', 'Starting video generation', {
        metadata: {
          type: request.type,
          topic: request.topic,
          videoDuration: request.duration
        }
      });

      const videos = await comfyuiMarketing.generateVideo(request);

      logger.info('marketing', 'comfyui', 'generateVideo', 'Video generation completed', {
        count: videos.length,
        durationMs: new Date().getTime() - startTime.getTime()
      });

      return videos;
    } catch (error) {
      logger.error('marketing', 'comfyui', 'generateVideo', 'Video generation failed', { error });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Generate multiple images in batch
   */
  async batchGenerateImages(requests: ImageGenerationRequest[]): Promise<Map<ImageGenerationRequest, string[]>> {
    const results = new Map<ImageGenerationRequest, string[]>();

    for (const request of requests) {
      try {
        const images = await this.generateImage(request);
        results.set(request, images);
      } catch (error) {
        logger.error('marketing', 'comfyui', 'batchGenerate', 'Failed to generate image for request', { 
          request, 
          error 
        });
        results.set(request, []);
      }
    }

    return results;
  }

  /**
   * Generate content for Criador Agent
   */
  async generateContentForCriadorAgent(contentType: string, topic: string, platforms: string[]): Promise<{
    images: Map<string, string[]>;
    videos: Map<string, string[]>;
  }> {
    const images = new Map<string, string[]>();
    const videos = new Map<string, string[]>();

    // Generate images for each platform
    for (const platform of platforms) {
      try {
        const imageRequest: ImageGenerationRequest = {
          type: contentType as any,
          topic,
          platform: platform as any,
          style: 'professional'
        };

        const platformImages = await this.generateImage(imageRequest);
        images.set(platform, platformImages);
      } catch (error) {
        logger.error('marketing', 'comfyui', 'criador', `Failed to generate image for ${platform}`, { error });
        images.set(platform, []);
      }
    }

    // Generate video if requested
    if (contentType === 'video' || contentType === 'reel') {
      try {
        const videoRequest: VideoGenerationRequest = {
          type: 'reel',
          topic,
          duration: '15s'
        };

        const videoFiles = await this.generateVideo(videoRequest);
        videos.set('main', videoFiles);
      } catch (error) {
        logger.error('marketing', 'comfyui', 'criador', 'Failed to generate video', { error });
        videos.set('main', []);
      }
    }

    return { images, videos };
  }

  /**
   * Get worker status
   */
  getStatus() {
    return {
      id: this.id,
      isRunning: this.isRunning,
      isAvailable: this.isAvailable,
      lastRun: this.lastRun
    };
  }
}

// Export singleton instance
export const comfyuiWorker = new ComfyUIWorker();