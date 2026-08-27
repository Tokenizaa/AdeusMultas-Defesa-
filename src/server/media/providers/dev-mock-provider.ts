/**
 * @file dev-mock-provider.ts
 * Provedor de desenvolvimento/mock explicitamente identificado.
 * Utilizado para testes de integração de UI sem consumir cota de IA.
 */

import {
  ImageGenerationOptions,
  ImageToVideoOptions,
  MediaOutput,
  MediaProviderInterface,
  ProviderKind,
  VideoGenerationOptions,
} from '../types';

export class DevMockMediaProvider implements MediaProviderInterface {
  public readonly id = 'dev_mock';
  public readonly name = 'Development Mock Media Provider';
  public readonly kind: ProviderKind = 'dev_mock';

  public async isAvailable(): Promise<boolean> {
    return process.env.NODE_ENV === 'development' || process.env.MEDIA_PROVIDER === 'dev_mock';
  }

  public async generateImage(options: ImageGenerationOptions): Promise<MediaOutput> {
    // Gerar um placeholder SVG de alta fidelidade simulando a peça de trânsito
    const width = options.aspectRatio === '9:16' ? 576 : options.aspectRatio === '16:9' ? 1024 : 768;
    const height = options.aspectRatio === '9:16' ? 1024 : options.aspectRatio === '16:9' ? 576 : 768;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="50%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#334155"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <rect x="20" y="20" width="${width - 40}" height="${height - 40}" rx="16" fill="none" stroke="#e2e8f0" stroke-width="2" stroke-dasharray="6,6" opacity="0.3"/>
      <circle cx="${width / 2}" cy="${height / 2 - 40}" r="48" fill="#3b82f6" opacity="0.2"/>
      <polygon points="${width / 2},${height / 2 - 68} ${width / 2 + 28},${height / 2 - 20} ${width / 2 - 28},${height / 2 - 20}" fill="#60a5fa"/>
      <text x="${width / 2}" y="${height / 2 + 40}" font-family="system-ui, sans-serif" font-size="20" font-weight="bold" fill="#f8fafc" text-anchor="middle">
        [DEV MOCK] Geração de Imagem
      </text>
      <text x="${width / 2}" y="${height / 2 + 70}" font-family="system-ui, sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">
        Prompt: ${options.prompt.slice(0, 45)}...
      </text>
      <text x="${width / 2}" y="${height - 40}" font-family="system-ui, sans-serif" font-size="11" fill="#64748b" text-anchor="middle">
        Provider: development/mock (Sem custo / Sem GPU)
      </text>
    </svg>`;

    const b64 = Buffer.from(svg).toString('base64');
    return {
      base64: b64,
      mimeType: 'image/svg+xml',
      url: `data:image/svg+xml;base64,${b64}`,
      metadata: {
        provider: this.id,
        isDevelopmentMock: true,
        prompt: options.prompt,
      },
    };
  }

  public async generateVideo(
    options: VideoGenerationOptions,
    onProgress?: (progress: number) => void
  ): Promise<MediaOutput> {
    if (onProgress) {
      onProgress(30);
      await new Promise((r) => setTimeout(r, 200));
      onProgress(70);
      await new Promise((r) => setTimeout(r, 200));
      onProgress(100);
    }

    return {
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      mimeType: 'video/mp4',
      durationSeconds: options.durationSeconds || 5,
      metadata: {
        provider: this.id,
        isDevelopmentMock: true,
        prompt: options.prompt,
      },
    };
  }

  public async generateImageToVideo(
    options: ImageToVideoOptions,
    onProgress?: (progress: number) => void
  ): Promise<MediaOutput> {
    if (onProgress) {
      onProgress(40);
      await new Promise((r) => setTimeout(r, 200));
      onProgress(100);
    }

    return {
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      mimeType: 'video/mp4',
      durationSeconds: options.durationSeconds || 5,
      metadata: {
        provider: this.id,
        isDevelopmentMock: true,
        mode: 'image_to_video',
      },
    };
  }
}
