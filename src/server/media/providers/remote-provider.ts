/**
 * @file remote-provider.ts
 * Provedor de geração de mídia remota de alta qualidade (Google GenAI / Imagen / Veo / Remote Worker).
 */

import { GoogleGenAI } from '@google/genai';
import {
  ImageGenerationOptions,
  ImageToVideoOptions,
  MediaOutput,
  MediaProviderInterface,
  ProviderKind,
  VideoGenerationOptions,
} from '../types';

export class RemoteMediaProvider implements MediaProviderInterface {
  public readonly id = 'remote_genai';
  public readonly name = 'Remote Cloud Media Generator';
  public readonly kind: ProviderKind = 'remote';

  private aiClient: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    if (!this.aiClient) {
      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
      this.aiClient = new GoogleGenAI({ apiKey });
    }
    return this.aiClient;
  }

  public async isAvailable(): Promise<boolean> {
    const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    return !!key && key.trim().length > 0;
  }

  public async generateImage(options: ImageGenerationOptions): Promise<MediaOutput> {
    const client = this.getClient();
    const model = 'imagen-3.0-generate-002';

    let prompt = options.prompt;
    if (options.stylePreset) {
      prompt += `, style: ${options.stylePreset}`;
    }

    try {
      const response = await client.models.generateImages({
        model,
        prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: options.aspectRatio || '1:1',
        },
      });

      const base64Data = response.generatedImages?.[0]?.image?.imageBytes;
      if (!base64Data) {
        throw new Error('A API remota não retornou bytes de imagem válidos.');
      }

      return {
        base64: base64Data,
        mimeType: 'image/jpeg',
        url: `data:image/jpeg;base64,${base64Data}`,
        metadata: {
          provider: this.id,
          model,
          aspectRatio: options.aspectRatio || '1:1',
        },
      };
    } catch (err: any) {
      // Fallback para geração via gemini-2.5-flash se imagen falhar
      if (options.allowFallback !== false) {
        try {
          const fallbackRes = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Gere uma descrição visual ultra-detalhada e SVG semântico profissional para o seguinte briefing de marketing de trânsito: "${prompt}". Retorne apenas o código SVG puro sem formatação markdown.`,
          });
          const svgText = fallbackRes.text?.replace(/```xml|```svg|```/gi, '').trim() || '';
          if (svgText.includes('<svg')) {
            const b64Svg = Buffer.from(svgText).toString('base64');
            return {
              base64: b64Svg,
              mimeType: 'image/svg+xml',
              url: `data:image/svg+xml;base64,${b64Svg}`,
              isFallback: true,
              metadata: {
                provider: this.id,
                model: 'gemini-2.5-flash-svg',
                fallbackReason: err.message,
              },
            };
          }
        } catch {
          // segue para erro original
        }
      }
      throw new Error(`Falha no provedor remoto de imagem: ${err?.message || err}`);
    }
  }

  public async generateVideo(
    options: VideoGenerationOptions,
    onProgress?: (progress: number) => void
  ): Promise<MediaOutput> {
    const client = this.getClient();
    const model = 'veo-2.0-generate-001';

    if (onProgress) onProgress(15);

    try {
      let operation = await client.models.generateVideos({
        model,
        prompt: options.prompt,
        config: {
          aspectRatio: options.aspectRatio || '16:9',
          personGeneration: 'allow_adult',
        },
      });

      let pollCount = 0;
      const maxPolls = 60;

      while (!operation.done && pollCount < maxPolls) {
        pollCount++;
        await new Promise((resolve) => setTimeout(resolve, 5000));
        if (onProgress) {
          const simulatedProgress = Math.min(90, 20 + Math.round((pollCount / maxPolls) * 70));
          onProgress(simulatedProgress);
        }
        operation = await client.operations.getVideosOperation({
          operation: operation,
        });
      }

      if (!operation.done) {
        throw new Error('A geração remota de vídeo excedeu o tempo limite.');
      }

      if (onProgress) onProgress(100);

      const videoResult = operation.response?.generatedVideos?.[0];
      const videoUri = videoResult?.video?.uri;

      if (!videoUri) {
        throw new Error('Nenhum URI de vídeo retornado pelo modelo de vídeo remoto.');
      }

      return {
        url: videoUri,
        mimeType: 'video/mp4',
        durationSeconds: options.durationSeconds || 5,
        metadata: {
          provider: this.id,
          model,
          aspectRatio: options.aspectRatio,
        },
      };
    } catch (err: any) {
      throw new Error(`Falha no provedor remoto de vídeo (${model}): ${err?.message || err}`);
    }
  }

  public async generateImageToVideo(
    options: ImageToVideoOptions,
    onProgress?: (progress: number) => void
  ): Promise<MediaOutput> {
    const client = this.getClient();
    const model = 'veo-2.0-generate-001';

    if (!options.referenceImageBase64 && !options.referenceImageUrl) {
      throw new Error('Image-to-Video requer uma imagem de referência em base64 ou URL.');
    }

    if (onProgress) onProgress(15);

    try {
      let imageBytes = options.referenceImageBase64;
      let mimeType = options.referenceMimeType || 'image/jpeg';

      if (!imageBytes && options.referenceImageUrl) {
        const fetchRes = await fetch(options.referenceImageUrl);
        const arrayBuf = await fetchRes.arrayBuffer();
        imageBytes = Buffer.from(arrayBuf).toString('base64');
        mimeType = fetchRes.headers.get('content-type') || mimeType;
      }

      let operation = await client.models.generateVideos({
        model,
        prompt: options.prompt || 'Animate this scene naturally with realistic motion and high fidelity',
        image: {
          imageBytes: imageBytes!,
          mimeType,
        },
        config: {
          aspectRatio: options.aspectRatio || '16:9',
          personGeneration: 'allow_adult',
        },
      });

      let pollCount = 0;
      const maxPolls = 60;

      while (!operation.done && pollCount < maxPolls) {
        pollCount++;
        await new Promise((resolve) => setTimeout(resolve, 5000));
        if (onProgress) {
          const simulatedProgress = Math.min(92, 20 + Math.round((pollCount / maxPolls) * 72));
          onProgress(simulatedProgress);
        }
        operation = await client.operations.getVideosOperation({
          operation: operation,
        });
      }

      if (!operation.done) {
        throw new Error('A geração Image-to-Video remota excedeu o tempo limite.');
      }

      if (onProgress) onProgress(100);

      const videoResult = operation.response?.generatedVideos?.[0];
      const videoUri = videoResult?.video?.uri;

      if (!videoUri) {
        throw new Error('Nenhum URI de vídeo retornado pelo modelo remoto Image-to-Video.');
      }

      return {
        url: videoUri,
        mimeType: 'video/mp4',
        durationSeconds: options.durationSeconds || 5,
        metadata: {
          provider: this.id,
          model,
          mode: 'image_to_video',
        },
      };
    } catch (err: any) {
      throw new Error(`Falha no provedor remoto Image-to-Video: ${err?.message || err}`);
    }
  }
}
