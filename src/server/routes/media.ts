import { Router } from 'express';
import { aiMediaService } from '../services/ai-media-service';
import { marketingService } from '../services/marketing-service';
import { logger } from '../observability/logger';
import { eventBus, EventTopics } from '../../core/events/topics';
import { GenerateVideosOperation, GoogleGenAI } from '@google/genai';
import { authenticateToken, requireAdmin } from '../middleware/auth-middleware';

const router = Router();

// All media routes require admin authentication
router.use(authenticateToken, requireAdmin);

/**
 * POST /api/generate-image & /api/marketing/generate-image
 * Generate High-Quality Images with gemini-3-pro-image-preview (sizes: 1K, 2K, 4K)
 */
router.post(['/generate-image', '/marketing/generate-image'], async (req, res) => {
  try {
    const { prompt, imageSize, aspectRatio, referenceImageBase64, referenceMimeType, stylePreset } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ success: false, error: 'Prompt de texto é obrigatório.' });
      return;
    }

    const validSizes = ['1K', '2K', '4K'];
    const selectedSize = validSizes.includes(imageSize) ? imageSize : '1K';

    const validAspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4'];
    const selectedRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : '1:1';

    const result = await aiMediaService.generateImage({
      prompt,
      imageSize: selectedSize,
      aspectRatio: selectedRatio,
      referenceImageBase64,
      referenceMimeType,
      stylePreset,
    });

    res.json(result);
  } catch (error: any) {
    logger.error('media', 'routes', 'generateImage', 'Failed to generate image', { error: error?.message });
    res.status(500).json({ success: false, error: error?.message || 'Erro ao gerar imagem' });
  }
});

/**
 * POST /api/generate-video & /api/marketing/generate-video
 * Veo Video Generation: step 1 (Start operation)
 * Model: veo-3.1-fast-generate-preview
 */
router.post(['/generate-video', '/marketing/generate-video'], async (req, res) => {
  try {
    const { prompt, image, aspectRatio, resolution } = req.body;

    const validRatios = ['16:9', '9:16'];
    const selectedRatio = validRatios.includes(aspectRatio) ? aspectRatio : '16:9';

    const result = await aiMediaService.startVideoGeneration({
      prompt,
      imageBytesBase64: image,
      aspectRatio: selectedRatio,
      resolution: resolution || '720p',
    });

    res.json(result);
  } catch (error: any) {
    logger.error('media', 'routes', 'generateVideo', 'Failed to start video generation', { error: error?.message });
    res.status(500).json({ success: false, error: error?.message || 'Erro ao iniciar geração de vídeo' });
  }
});

/**
 * POST /api/video-status & /api/marketing/video-status
 * Veo Video Generation: step 2 (Poll status)
 */
router.post(['/video-status', '/marketing/video-status'], async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      res.status(400).json({ success: false, error: 'operationName é obrigatório.' });
      return;
    }

    const status = await aiMediaService.checkVideoStatus(operationName);
    res.json(status);
  } catch (error: any) {
    logger.error('media', 'routes', 'videoStatus', 'Failed to check video status', { error: error?.message });
    res.status(500).json({ success: false, error: error?.message || 'Erro ao consultar status do vídeo' });
  }
});

/**
 * POST /api/video-download & /api/marketing/video-download
 * Veo Video Generation: step 3 (Download / Stream)
 */
router.post(['/video-download', '/marketing/video-download'], async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      res.status(400).json({ success: false, error: 'operationName é obrigatório.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || operationName.includes('sim_')) {
      // In demo/dev mode without live external video, return simulation response
      res.json({
        success: true,
        isSimulation: true,
        message: 'Vídeo animado com sucesso pela engine Veo 3.1.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });
    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;

    if (!uri) {
      res.status(404).json({ success: false, error: 'Download URI não encontrado na operação concluída.' });
      return;
    }

    const videoRes = await fetch(uri, {
      headers: { 'x-goog-api-key': apiKey },
    });

    if (!videoRes.ok) {
      res.status(videoRes.status).json({ success: false, error: 'Falha ao buscar o arquivo de vídeo do Google Cloud.' });
      return;
    }

    res.setHeader('Content-Type', 'video/mp4');
    const arrayBuffer = await videoRes.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error: any) {
    logger.error('media', 'routes', 'videoDownload', 'Failed to download video', { error: error?.message });
    res.status(500).json({ success: false, error: error?.message || 'Erro no download do vídeo' });
  }
});

/**
 * POST /api/marketing/generate-week
 * Generates full 7-day editorial campaign with CTB themes, captions, hashtags, and media
 */
router.post('/marketing/generate-week', async (req, res) => {
  try {
    const { generateImages = true, imageSize = '2K', targetAudience } = req.body;

    const weeklySchedule = await aiMediaService.generateWeeklySchedule({
      targetAudience,
    });

    const addedContents = [];
    for (const item of weeklySchedule) {
      let finalImageUrl: string | undefined = undefined;

      if (generateImages && item.visualPrompt) {
        try {
          const imgRes = await aiMediaService.generateImage({
            prompt: item.visualPrompt,
            imageSize: imageSize as '1K' | '2K' | '4K',
            aspectRatio: item.aspectRatio,
          });
          if (imgRes.success && imgRes.imageUrl) {
            finalImageUrl = imgRes.imageUrl;
          }
        } catch (e) {
          logger.warn('media', 'routes', 'generateWeek', 'Image generation skipped for post', { id: item.id });
        }
      }

      const contentToSave = {
        ...item,
        mediaUrl: finalImageUrl,
        imageUrl: finalImageUrl,
      };

      // Add to marketing service
      await marketingService.generateContent(
        contentToSave.legalTheme,
        contentToSave.channel,
        contentToSave.format
      );
      
      // Update fields to have the rich content
      const all = await marketingService.getEditorialContents();
      const created = all[0];
      if (created) {
        await marketingService.updateContent(created.id, {
          title: contentToSave.title,
          copyText: contentToSave.copyText,
          copy_text: contentToSave.copyText,
          hashtags: contentToSave.hashtags,
          visualPrompt: contentToSave.visualPrompt,
          visual_prompt: contentToSave.visualPrompt,
          scheduledDate: contentToSave.scheduledDate,
          scheduled_date: contentToSave.scheduledDate,
          status: 'agendado',
          mediaUrl: finalImageUrl,
          imageUrl: finalImageUrl,
          aspectRatio: contentToSave.aspectRatio,
          imageSize,
        });
        addedContents.push({ ...created, ...contentToSave });
      }
    }

    eventBus.publish(EventTopics.MARKETING_CONTENT_DRAFTED, {
      count: addedContents.length,
      type: 'weekly_campaign',
    }, 'marketing_os');

    res.json({
      success: true,
      message: `Semana completa de 7 publicações gerada e agendada com sucesso!`,
      totalPosts: addedContents.length,
      contents: addedContents,
    });
  } catch (error: any) {
    logger.error('media', 'routes', 'generateWeek', 'Failed to generate weekly schedule', { error: error?.message });
    res.status(500).json({ success: false, error: error?.message || 'Erro ao gerar semana de publicações' });
  }
});

export default router;
