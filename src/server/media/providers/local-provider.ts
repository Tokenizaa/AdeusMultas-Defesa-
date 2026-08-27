/**
 * @file local-provider.ts
 * Adapter para execução de modelos locais open-source (Wan 2.2, SDXL, LTX)
 * quando MEDIA_LOCAL_ENABLED=true e houver hardware ou endpoint local ativo.
 */

import {
  ImageGenerationOptions,
  ImageToVideoOptions,
  MediaOutput,
  MediaProviderInterface,
  ProviderKind,
  VideoGenerationOptions,
} from '../types';
import { HardwareDetector } from '../hardware-detector';

export class LocalMediaProvider implements MediaProviderInterface {
  public readonly id = 'local_opensource';
  public readonly name = 'Local Open-Source Model Runner';
  public readonly kind: ProviderKind = 'local';

  private endpointUrl: string;

  constructor() {
    this.endpointUrl = process.env.MEDIA_LOCAL_ENDPOINT || 'http://127.0.0.1:8000';
  }

  public async isAvailable(): Promise<boolean> {
    const isEnabled = process.env.MEDIA_LOCAL_ENABLED === 'true';
    if (!isEnabled) return false;

    const hw = HardwareDetector.getHardwareInfo();
    // Se o hardware for classificado como CPU only e não houver endpoint remoto customizado
    if (hw.classification === 'LOCAL_CPU_ONLY' || hw.classification === 'REMOTE_REQUIRED') {
      try {
        const ping = await fetch(`${this.endpointUrl}/health`, { method: 'GET', signal: AbortSignal.timeout(1000) });
        return ping.ok;
      } catch {
        return false;
      }
    }

    return true;
  }

  public async generateImage(options: ImageGenerationOptions): Promise<MediaOutput> {
    const available = await this.isAvailable();
    if (!available) {
      throw new Error('Local Media Provider não está disponível ou hardware local é insuficiente.');
    }

    const response = await fetch(`${this.endpointUrl}/v1/images/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: options.prompt,
        aspect_ratio: options.aspectRatio || '1:1',
        negative_prompt: options.negativePrompt,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      throw new Error(`Erro na inferência local de imagem: ${await response.text()}`);
    }

    const data = await response.json();
    return {
      url: data.url || (data.base64 ? `data:image/png;base64,${data.base64}` : undefined),
      base64: data.base64,
      mimeType: data.mimeType || 'image/png',
      metadata: {
        provider: this.id,
        model: data.model || 'sdxl-lightning',
        local: true,
      },
    };
  }

  public async generateVideo(
    options: VideoGenerationOptions,
    onProgress?: (progress: number) => void
  ): Promise<MediaOutput> {
    const available = await this.isAvailable();
    if (!available) {
      throw new Error('Local Media Provider para vídeo não está disponível.');
    }

    if (onProgress) onProgress(20);

    const response = await fetch(`${this.endpointUrl}/v1/videos/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: options.prompt,
        duration: options.durationSeconds || 4,
        aspect_ratio: options.aspectRatio || '16:9',
      }),
      signal: AbortSignal.timeout(300000),
    });

    if (!response.ok) {
      throw new Error(`Erro na inferência local de vídeo: ${await response.text()}`);
    }

    const data = await response.json();
    if (onProgress) onProgress(100);

    return {
      url: data.url,
      mimeType: 'video/mp4',
      durationSeconds: options.durationSeconds || 4,
      metadata: {
        provider: this.id,
        model: data.model || 'wan-2.2-ti2v-5b',
        local: true,
      },
    };
  }

  public async generateImageToVideo(
    options: ImageToVideoOptions,
    onProgress?: (progress: number) => void
  ): Promise<MediaOutput> {
    const available = await this.isAvailable();
    if (!available) {
      throw new Error('Local Image-to-Video Provider não está disponível.');
    }

    if (onProgress) onProgress(25);

    const response = await fetch(`${this.endpointUrl}/v1/videos/image-to-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: options.prompt,
        image_base64: options.referenceImageBase64,
        image_url: options.referenceImageUrl,
        duration: options.durationSeconds || 4,
      }),
      signal: AbortSignal.timeout(300000),
    });

    if (!response.ok) {
      throw new Error(`Erro na inferência local Image-to-Video: ${await response.text()}`);
    }

    const data = await response.json();
    if (onProgress) onProgress(100);

    return {
      url: data.url,
      mimeType: 'video/mp4',
      durationSeconds: options.durationSeconds || 4,
      metadata: {
        provider: this.id,
        model: data.model || 'wan-2.2-i2v',
        local: true,
      },
    };
  }
}
