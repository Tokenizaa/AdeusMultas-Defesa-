/**
 * Meta Publishing Service (Facebook Pages & Instagram Professional)
 * Implements 2-step Container API for Instagram and Direct Feed/Photos API for Facebook.
 */

import { logger } from '../../../server/observability/logger';
import { metaGraphClient } from '../client/meta-graph-client';
import { MetaPublishParams, MetaPublishResponse } from '../types';
import { MetaIntegrationError, MetaContentPolicyRejectionError } from '../errors/meta-errors';

export class MetaPublishingService {
  /**
   * Publishes content to Facebook Page
   */
  public async publishToFacebook(
    pageId: string,
    pageAccessToken: string,
    params: { message: string; mediaUrl?: string; linkUrl?: string }
  ): Promise<{ postId: string }> {
    const { message, mediaUrl, linkUrl } = params;

    try {
      if (mediaUrl) {
        // Publish as Photo post
        const result = await metaGraphClient.request<{ id: string; post_id?: string }>({
          method: 'POST',
          endpoint: `${pageId}/photos`,
          accessToken: pageAccessToken,
          body: {
            url: mediaUrl,
            caption: message,
          },
        });
        const postId = result.post_id || result.id;
        logger.info('meta', 'publishing', 'fb_photo_published', `Foto publicada na página FB ${pageId}`, { postId });
        return { postId };
      } else {
        // Publish as Feed text / link post
        const body: Record<string, any> = { message };
        if (linkUrl) body.link = linkUrl;

        const result = await metaGraphClient.request<{ id: string }>({
          method: 'POST',
          endpoint: `${pageId}/feed`,
          accessToken: pageAccessToken,
          body,
        });
        logger.info('meta', 'publishing', 'fb_feed_published', `Texto publicado na página FB ${pageId}`, { postId: result.id });
        return { postId: result.id };
      }
    } catch (err: any) {
      logger.error('meta', 'publishing', 'fb_publish_failed', `Falha ao publicar no Facebook: ${err.message}`);
      throw err;
    }
  }

  /**
   * Troca user token por page token de longa duração (quando necessário).
   * Se pageId for fornecido, consulta a Graph API para obter o page token.
   * Retorna o page token se o token original for um user token, senão retorna o mesmo token.
   */
  private async resolvePageToken(pageId: string, token: string): Promise<string> {
    if (!pageId) return token;
    try {
      const result = await metaGraphClient.request<{ access_token: string }>({
        method: 'GET',
        endpoint: `${pageId}`,
        accessToken: token,
        params: { fields: 'access_token' },
      });
      if (result.access_token) return result.access_token;
    } catch (err) {
      logger.warn('meta', 'publishing', 'page_token_resolve_failed', 'Não foi possível obter page token, usando token original');
    }
    return token;
  }

  /**
   * Publishes content to Instagram Business via 2-step Media Container API
   */
  public async publishToInstagram(
    instagramAccountId: string,
    pageAccessToken: string,
    params: { caption: string; imageUrl: string },
    pageId?: string
  ): Promise<{ mediaId: string }> {
    const { caption, imageUrl } = params;

    if (!imageUrl) {
      throw new MetaIntegrationError(
        'O Instagram exige uma URL pública de imagem para publicações no feed.',
        'META_INSTAGRAM_IMAGE_REQUIRED',
        400
      );
    }

    // Resolve page token se necessário (user token → page token)
    const resolvedToken = pageId ? await this.resolvePageToken(pageId, pageAccessToken) : pageAccessToken;

    try {
      // Step 1: Create media container
      const containerRes = await metaGraphClient.request<{ id: string }>({
        method: 'POST',
        endpoint: `${instagramAccountId}/media`,
        accessToken: resolvedToken,
        body: {
          image_url: imageUrl,
          caption,
        },
      });

      const creationId = containerRes.id;
      logger.info('meta', 'publishing', 'ig_container_created', `Container Instagram criado: ${creationId}`);

      // Step 2: Poll container status (wait until FINISHED)
      let isReady = false;
      let attempts = 0;
      while (!isReady && attempts < 5) {
        attempts++;
        const statusRes = await metaGraphClient.request<{ status_code?: string; status?: string }>({
          endpoint: creationId,
          accessToken: pageAccessToken,
          params: { fields: 'status_code,status' },
        });

        const status = statusRes.status_code || statusRes.status;
        if (status === 'FINISHED' || !status) {
          isReady = true;
          break;
        } else if (status === 'ERROR' || status === 'EXPIRED') {
          throw new MetaContentPolicyRejectionError(`Container Instagram falhou com status ${status}`);
        }

        await new Promise((r) => setTimeout(r, 1500));
      }

      // Step 3: Publish media container
      const publishRes = await metaGraphClient.request<{ id: string }>({
        method: 'POST',
        endpoint: `${instagramAccountId}/media_publish`,
        accessToken: pageAccessToken,
        body: {
          creation_id: creationId,
        },
      });

      logger.info('meta', 'publishing', 'ig_published', `Mídia publicada no Instagram: ${publishRes.id}`);
      return { mediaId: publishRes.id };
    } catch (err: any) {
      logger.error('meta', 'publishing', 'ig_publish_failed', `Falha ao publicar no Instagram: ${err.message}`);
      throw err;
    }
  }

  /**
   * Orchestrates publishing according to destination ('facebook', 'instagram', or 'both')
   */
  public async publish(
    page: { id: string; accessToken: string; instagramAccountId?: string },
    params: MetaPublishParams
  ): Promise<MetaPublishResponse> {
    const { destination, message, mediaUrl, linkUrl } = params;
    let facebookPostId: string | undefined;
    let instagramMediaId: string | undefined;

    const errors: string[] = [];

    // 1. Facebook Publish
    if (destination === 'facebook' || destination === 'both') {
      try {
        const fbResult = await this.publishToFacebook(page.id, page.accessToken, {
          message,
          mediaUrl,
          linkUrl,
        });
        facebookPostId = fbResult.postId;
      } catch (err: any) {
        errors.push(`Facebook: ${err.message}`);
      }
    }

    // 2. Instagram Publish
    if (destination === 'instagram' || destination === 'both') {
      const igId = params.instagramAccountId || page.instagramAccountId;
      if (!igId) {
        errors.push('Instagram: Nenhuma conta Instagram vinculada à página selecionada.');
      } else if (!mediaUrl) {
        errors.push('Instagram: Imagem obrigatória para feed do Instagram.');
      } else {
        try {
          const igResult = await this.publishToInstagram(igId, page.accessToken, {
            caption: message,
            imageUrl: mediaUrl,
          }, page.id);
          instagramMediaId = igResult.mediaId;
        } catch (err: any) {
          errors.push(`Instagram: ${err.message}`);
        }
      }
    }

    const hasSuccess = Boolean(facebookPostId || instagramMediaId);
    return {
      success: hasSuccess,
      facebookPostId,
      instagramMediaId,
      publishedAt: new Date().toISOString(),
      destination,
      status: hasSuccess ? 'published' : 'failed',
      error: errors.length > 0 ? errors.join(' | ') : undefined,
    };
  }
}

export const metaPublishingService = new MetaPublishingService();
