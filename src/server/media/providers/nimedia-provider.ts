/**
 * @file nimedia-provider.ts
 * Adapter para geração de mídia usando o serviço NVIDIA NIM (via ai_mediaService).
 */
import {
  ImageGenerationOptions,
  ImageToVideoOptions,
  MediaOutput,
  MediaProviderInterface,
  ProviderKind,
  VideoGenerationOptions,
} from '../types';
import { ai_mediaService } from '../../services/nimedia-service';
import { logger } from '../../observability/logger';

export class NIMediaProvider implements MediaProviderInterface {
  public readonly id = 'nimedia';
  public readonly name = 'NVIDIA NIM Media Provider';
  public readonly kind: ProviderKind = 'nimedia';

  public async isAvailable(): Promise<boolean> {
    // Verifica se a configuração necessária está presente
    const hasKey = Boolean(process.env.NVIDIA_API_KEY && process.env.NVIDIA_API_KEY.length > 0);
    const hasModel = Boolean(process.env.NVIDIA_IMAGE_MODEL && process.env.NVIDIA_IMAGE_MODEL.length > 0);
    // NVIDIA_BASE_URL tem padrão, então não é obrigatório definir
    return hasKey && hasModel;
  }

  public async generateImage(options: ImageGenerationOptions): Promise<MediaOutput> {
    const available = await this.isAvailable();
    if (!available) {
      throw new Error('NVIDIA NIM Media Provider não está disponível: verifique NVIDIA_API_KEY e NVIDIA_IMAGE_MODEL.');
    }

    const result = await ai_mediaService.generateImage({
      prompt: options.prompt,
      imageSize: options.imageSize as '1K' | '2K' | '4K',
      aspectRatio: options.aspectRatio as '1:1' | '16:9' | '9:16' | '4:3' | '3:4',
      stylePreset: options.stylePreset,
      allowFallback: options.allowFallback ?? false, // não permitir fallback SVG; se quiser, deixar explícito
    });

    if (!result.success) {
      throw new Error(result.error ?? 'Falha desconhecida na geração de imagem via NVIDIA NIM.');
    }

    // Montar MediaOutput conforme contrato
    const output: MediaOutput = {
      // NVIDIA NIM retorna URL, não base64
      url: result.imageUrl ?? undefined,
      base64: result.imageBase64 ?? undefined,
      mimeType: result.mimeType ?? undefined,
      metadata: {
        provider: this.id,
        model: result.modelUsed ?? undefined,
        imageSize: result.imageSize ?? undefined,
        aspectRatio: result.aspectRatio ?? undefined,
        promptUsed: result.promptUsed ?? undefined,
        isFallback: result.isFallback ?? false,
        quality: result.quality ?? undefined,
      },
    };

    return output;
  }

  public async generateVideo(
    options: VideoGenerationOptions,
    onProgress?: (progress: number) => void
  ): Promise<MediaOutput> {
    // NVIDIA NIM não suporta geração de vídeo neste implementação
    throw new Error('Geração de vídeo não suportada pelo NVIDIA NIM neste momento.');
  }

  public async generateImageToVideo(
    options: ImageToVideoOptions,
    onProgress?: (progress: number) => void
  ): Promise<MediaOutput> {
    throw new Error('Geração Image-to-Video não suportada pelo NVIDIA NIM neste momento.');
  }
}