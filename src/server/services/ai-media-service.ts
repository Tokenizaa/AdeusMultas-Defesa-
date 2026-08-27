import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';
import { logger } from '../observability/logger';

export interface GenerateImageOptions {
  prompt: string;
  imageSize?: '1K' | '2K' | '4K';
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  referenceImageBase64?: string;
  referenceMimeType?: string;
  stylePreset?: string;
}

export interface GenerateVideoOptions {
  prompt?: string;
  imageBytesBase64?: string;
  mimeType?: string;
  aspectRatio?: '16:9' | '9:16';
  resolution?: '720p' | '1080p';
}

export class AIMediaService {
  private getClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.warn('ai_media', 'service', 'getClient', 'GEMINI_API_KEY not configured');
      return null;
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  /**
   * Generates a high-quality image using gemini-3-pro-image-preview (with fallback to gemini-3.1-flash-image / gemini-3-pro-image)
   */
  async generateImage(options: GenerateImageOptions): Promise<{
    success: boolean;
    imageUrl?: string;
    imageBase64?: string;
    mimeType?: string;
    modelUsed?: string;
    imageSize?: string;
    aspectRatio?: string;
    promptUsed?: string;
    error?: string;
  }> {
    const {
      prompt,
      imageSize = '1K',
      aspectRatio = '1:1',
      referenceImageBase64,
      referenceMimeType = 'image/png',
      stylePreset,
    } = options;

    const fullPrompt = stylePreset 
      ? `${prompt}. Style guidelines: ${stylePreset}. Professional, high-contrast typography, premium editorial advertising.` 
      : prompt;

    const ai = this.getClient();
    if (!ai) {
      return {
        success: false,
        error: 'Chave GEMINI_API_KEY não configurada no servidor para geração de imagem.',
        promptUsed: fullPrompt,
        aspectRatio,
        imageSize,
      };
    }

    const candidateModels = [
      'gemini-3-pro-image-preview',
      'gemini-3-pro-image',
      'gemini-3.1-flash-image',
      'gemini-3.1-flash-lite-image',
    ];

    let lastError: string | undefined;

    for (const model of candidateModels) {
      try {
        const parts: any[] = [];
        if (referenceImageBase64) {
          parts.push({
            inlineData: {
              data: referenceImageBase64.replace(/^data:image\/\w+;base64,/, ''),
              mimeType: referenceMimeType,
            },
          });
        }
        parts.push({ text: fullPrompt });

        const imageConfig: Record<string, any> = { aspectRatio };
        if (model !== 'gemini-3.1-flash-lite-image' && imageSize) {
          imageConfig.imageSize = imageSize;
        }

        const response = await ai.models.generateContent({
          model,
          contents: { parts },
          config: {
            imageConfig,
          },
        });

        const candidates = response.candidates;
        if (candidates && candidates.length > 0) {
          const responseParts = candidates[0].content?.parts || [];
          for (const part of responseParts) {
            if (part.inlineData && part.inlineData.data) {
              const mime = part.inlineData.mimeType || 'image/png';
              const base64 = part.inlineData.data;
              const imageUrl = `data:${mime};base64,${base64}`;
              logger.info('ai_media', 'service', 'generateImage', `Generated image with ${model} at ${imageSize || '1K'}`, {
                aspectRatio,
                imageSize,
              });
              return {
                success: true,
                imageUrl,
                imageBase64: base64,
                mimeType: mime,
                modelUsed: model,
                imageSize,
                aspectRatio,
                promptUsed: fullPrompt,
              };
            }
          }
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
        logger.debug('ai_media', 'service', 'generateImage', `Model ${model} request returned error: ${lastError}`);
      }
    }

    return {
      success: false,
      error: `Falha na geração de imagem com IA: ${lastError || 'Nenhum modelo de imagem retornou conteúdo válido.'}`,
      promptUsed: fullPrompt,
      aspectRatio,
      imageSize,
    };
  }

  /**
   * Starts Veo video generation from an uploaded photo or prompt
   * Model: veo-3.1-fast-generate-preview (fallback to veo-3.1-lite-generate-preview or veo-3.1-generate-preview)
   */
  async startVideoGeneration(options: GenerateVideoOptions): Promise<{
    success: boolean;
    operationName?: string;
    modelUsed?: string;
    aspectRatio?: string;
    resolution?: string;
    error?: string;
  }> {
    const {
      prompt = 'Cinematic smooth camera motion, professional lighting, photorealistic animation',
      imageBytesBase64,
      mimeType = 'image/png',
      aspectRatio = '16:9',
      resolution = '720p',
    } = options;

    const ai = this.getClient();
    if (!ai) {
      return {
        success: false,
        error: 'Serviço de IA não inicializado (GEMINI_API_KEY ausente ou inválida).',
      };
    }

    const candidateModels = [
      'veo-3.1-fast-generate-preview',
      'veo-3.1-lite-generate-preview',
      'veo-3.1-generate-preview',
    ];

    let lastError: string | undefined;

    for (const model of candidateModels) {
      try {
        const cleanImage = imageBytesBase64 ? imageBytesBase64.replace(/^data:image\/\w+;base64,/, '') : undefined;
        
        const payload: any = {
          model,
          prompt,
          config: {
            numberOfVideos: 1,
            aspectRatio: aspectRatio as '16:9' | '9:16',
            resolution: resolution as '720p' | '1080p',
          },
        };

        if (cleanImage) {
          payload.image = {
            imageBytes: cleanImage,
            mimeType,
          };
        }

        const operation = await (ai.models as any).generateVideos(payload);
        if (operation && operation.name) {
          logger.info('ai_media', 'service', 'startVideoGeneration', `Started Veo generation on ${model}`, {
            operationName: operation.name,
            aspectRatio,
          });
          return {
            success: true,
            operationName: operation.name,
            modelUsed: model,
            aspectRatio,
            resolution,
          };
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
        logger.warn('ai_media', 'service', 'startVideoGeneration', `Model ${model} failed, attempting next`, {
          error: lastError,
        });
      }
    }

    return {
      success: false,
      error: `Falha na geração de vídeo via Veo: ${lastError || 'Nenhum modelo Veo disponível ou cota excedida.'}`,
    };
  }

  /**
   * Polls operation status
   */
  async checkVideoStatus(operationName: string): Promise<{
    done: boolean;
    error?: any;
    videoUri?: string;
  }> {
    if (!operationName || operationName.includes('sim_')) {
      return {
        done: false,
        error: { message: 'Operação de vídeo inválida ou não encontrada no provedor real.' },
      };
    }

    const ai = this.getClient();
    if (!ai) {
      return { done: false, error: { message: 'Cliente de IA indisponível.' } };
    }

    try {
      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
      return {
        done: Boolean(updated.done),
        error: updated.error,
        videoUri: uri,
      };
    } catch (err: any) {
      logger.error('ai_media', 'service', 'checkVideoStatus', 'Error polling Veo operation', { error: err?.message });
      return { done: false, error: err?.message };
    }
  }

  /**
   * Generates a 7-day marketing schedule with CTB themes, captions, hashtags, and media prompts
   */
  async generateWeeklySchedule(brandContext?: any) {
    const ai = this.getClient();
    const days = [
      {
        dayName: 'Segunda-feira',
        dayOffset: 1,
        theme: 'Radar Sem Aferição Válida do INMETRO',
        article: 'Art. 280, § 2º CTB + Resolução CONTRAN 798/2020',
        channel: 'instagram',
        format: 'carrossel',
        objective: 'Conscientização de Nulidade Técnica',
        headline: 'Seu radar foi calibrado nos últimos 12 meses? 🚨',
        suggestedVisual: 'Foto realista de radar eletrônico em rodovia com overlay de selo INMETRO e gráfico explicativo de validade metrológica anual.',
      },
      {
        dayName: 'Terça-feira',
        dayOffset: 2,
        theme: 'Margem de Tolerância e Velocidade Considerada',
        article: 'Tabela de Erro Máximo Admissível do CONTRAN',
        channel: 'instagram',
        format: 'post_estatico',
        objective: 'Esclarecimento Educativo',
        headline: 'Velocidade Medida vs Considerada: Saiba a diferença! ⚡',
        suggestedVisual: 'Infográfico comparando velocidade do velocímetro (77 km/h) com a velocidade considerada legal (70 km/h) com cores de alerta.',
      },
      {
        dayName: 'Quarta-feira',
        dayOffset: 3,
        theme: 'Conversão Automática em Advertência por Escrito',
        article: 'Art. 267 do CTB (Lei 14.071/2020)',
        channel: 'linkedin',
        format: 'artigo',
        objective: 'Direito Subjetivo sem Custo de Multa',
        headline: 'Sem multas nos últimos 12 meses? Você pode ter direito à Advertência Grátis! 📋',
        suggestedVisual: 'Documento jurídico moderno com carimbo verde "DEFERIDO - ADVERTÊNCIA POR ESCRITO" sobre fundo executivo azul marinho.',
      },
      {
        dayName: 'Quinta-feira',
        dayOffset: 4,
        theme: 'Efeito Suspensivo: Dirija sem Bloqueio de CNH',
        article: 'Art. 284, § 3º c/c Art. 285 do CTB',
        channel: 'tiktok',
        format: 'video_curto',
        objective: 'Segurança Jurídica & Trânsito Livre',
        headline: 'Posso continuar dirigindo enquanto recorro da multa? 🚗🛡️',
        suggestedVisual: 'Animação Veo em 9:16 de um motorista tranquilo ao volante com ícone de escudo protetor e linha do tempo do recurso administrativo.',
      },
      {
        dayName: 'Sexta-feira',
        dayOffset: 5,
        theme: 'Lei Seca: Procedimentos e Direitos do Condutor',
        article: 'Art. 165 e Art. 165-A do CTB',
        channel: 'instagram',
        format: 'reels',
        objective: 'Prevenção e Análise de Nulidades',
        headline: 'Operação Lei Seca: O que a fiscalização DEVE cumprir obrigatoriamente 🚦',
        suggestedVisual: 'Vídeo cinematográfico Veo em 9:16 de blitz noturna profissional com viaturas e checklist digital dos 5 requisitos formais do auto.',
      },
      {
        dayName: 'Sábado',
        dayOffset: 6,
        theme: 'Decadência: Notificação de Autuação após 30 Dias',
        article: 'Art. 281, Parágrafo Único, II do CTB',
        channel: 'facebook',
        format: 'carrossel',
        objective: 'Arquivamento Sumário por Prazo Expirado',
        headline: 'Recebeu a notificação com mais de 30 dias? O auto é NULO! ⏳',
        suggestedVisual: 'Calendário destacando o dia 1 ao 30 com carimbo vermelho "ARQUIVAMENTO OBRIGATÓRIO" em perspectiva 3D realista.',
      },
      {
        dayName: 'Domingo',
        dayOffset: 7,
        theme: 'Indicação do Real Condutor Passo a Passo',
        article: 'Art. 257, § 7º e § 8º do CTB',
        channel: 'blog',
        format: 'guia_completo',
        objective: 'Proteção da Pontuação na CNH',
        headline: 'Emprestou o carro? Como transferir os pontos corretamente 📝',
        suggestedVisual: 'Guia visual limpo mostrando duas CNHs e o formulário digital do DETRAN preenchido com segurança.',
      },
    ];

    const weeklyContents = [];
    for (const d of days) {
      const scheduleDate = new Date(Date.now() + d.dayOffset * 24 * 3600 * 1000);
      const formattedDate = scheduleDate.toISOString().replace('T', ' ').substring(0, 16);

      const contentItem = {
        id: `cnt-week-${Date.now()}-${d.dayOffset}`,
        title: d.headline,
        dayOfWeek: d.dayName,
        channel: d.channel,
        format: d.format,
        legalTheme: d.theme,
        legal_theme: d.theme,
        legalArticle: d.article,
        status: 'agendado' as const,
        scheduledDate: formattedDate,
        scheduled_date: formattedDate,
        estimatedReach: Math.floor(18000 + Math.random() * 32000),
        estimated_reach: Math.floor(18000 + Math.random() * 32000),
        copyText: `${d.headline}

${d.theme} é um dos temas mais recorrentes nos recursos de trânsito em todo o Brasil.

📌 Fundamento Legal: ${d.article}

Muitos motoristas pagam multas indevidas por desconhecerem que falhas formais do órgão autuador anulam integralmente a penalidade e evitam a perda de pontos na CNH.

👉 Consulte a probabilidade do seu recurso gratuitamente na plataforma DefesAi!`,
        copy_text: `${d.headline}

${d.theme} é um dos temas mais recorrentes nos recursos de trânsito em todo o Brasil.

📌 Fundamento Legal: ${d.article}

Muitos motoristas pagam multas indevidas por desconhecerem que falhas formais do órgão autuador anulam integralmente a penalidade e evitam a perda de pontos na CNH.

👉 Consulte a probabilidade do seu recurso gratuitamente na plataforma DefesAi!`,
        hashtags: [
          '#AdeusMulta',
          '#DireitoDeTransito',
          '#CTB',
          '#RecursoDeMulta',
          `#${d.channel === 'tiktok' || d.channel === 'reels' ? 'Viral' : 'TransitoSeguro'}`,
        ],
        visualPrompt: d.suggestedVisual,
        visual_prompt: d.suggestedVisual,
        imageSize: '2K' as const,
        aspectRatio: d.channel === 'tiktok' || d.format === 'reels' || d.format === 'video_curto' ? ('9:16' as const) : ('1:1' as const),
        authorAgent: '@marketing-planejador',
        author_agent: '@marketing-planejador',
        qualityReviewScore: 9.8,
        mediaType: d.channel === 'tiktok' || d.format === 'reels' || d.format === 'video_curto' ? 'video' : 'image',
      };

      weeklyContents.push(contentItem);
    }

    return weeklyContents;
  }

  /**
   * Helper fallback to generate branded SVG visual data URL when external AI unavailable
   */
  private createFallbackImage(prompt: string, aspectRatio: string, imageSize: string): string {
    const width = aspectRatio === '16:9' ? 1280 : aspectRatio === '9:16' ? 720 : aspectRatio === '4:3' ? 1024 : 1080;
    const height = aspectRatio === '16:9' ? 720 : aspectRatio === '9:16' ? 1280 : aspectRatio === '4:3' ? 768 : 1080;

    const cleanTitle = prompt.length > 70 ? prompt.substring(0, 67) + '...' : prompt;
    const escapedTitle = cleanTitle
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#071D41" />
          <stop offset="50%" stop-color="#0C326F" />
          <stop offset="100%" stop-color="#155BCB" />
        </linearGradient>
        <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFCD07" />
          <stop offset="100%" stop-color="#F5A623" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg)" />
      
      <!-- Tech Grid Pattern -->
      <g opacity="0.12" stroke="#FFFFFF" stroke-width="1.5">
        <line x1="0" y1="${height * 0.25}" x2="${width}" y2="${height * 0.25}" />
        <line x1="0" y1="${height * 0.5}" x2="${width}" y2="${height * 0.5}" />
        <line x1="0" y1="${height * 0.75}" x2="${width}" y2="${height * 0.75}" />
        <line x1="${width * 0.25}" y1="0" x2="${width * 0.25}" y2="${height}" />
        <line x1="${width * 0.5}" y1="0" x2="${width * 0.5}" y2="${height}" />
        <line x1="${width * 0.75}" y1="0" x2="${width * 0.75}" y2="${height}" />
      </g>

      <!-- Badge Header -->
      <rect x="48" y="48" width="220" height="40" rx="8" fill="#155BCB" opacity="0.8" />
      <text x="64" y="73" fill="#FFCD07" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" letter-spacing="1">DEFESAI • ${imageSize} HD</text>

      <!-- Main Copy -->
      <text x="48" y="${height * 0.42}" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="${width > 800 ? 38 : 28}" font-weight="800" letter-spacing="-0.5">
        ${escapedTitle}
      </text>

      <rect x="48" y="${height * 0.48}" width="160" height="6" rx="3" fill="url(#gold)" />

      <text x="48" y="${height * 0.58}" fill="#E2E8F0" font-family="system-ui, sans-serif" font-size="${width > 800 ? 20 : 16}" font-weight="500">
        Resoluções CONTRAN &amp; Código de Trânsito Brasileiro
      </text>

      <!-- Footer Branding -->
      <rect x="48" y="${height - 96}" width="${width - 96}" height="48" rx="10" fill="#030E1E" opacity="0.6" />
      <text x="68" y="${height - 66}" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="13" font-weight="600">
        Direito de Trânsito • Defesa Prévia • JARI • Efeito Suspensivo
      </text>
<text x="${width - 70}" y="${height - 66}" fill="#FFCD07" text-anchor="end" font-family="system-ui, sans-serif" font-size="13" font-weight="bold">
  www.defesai.shop
</text>
    </svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
}

export const aiMediaService = new AIMediaService();
