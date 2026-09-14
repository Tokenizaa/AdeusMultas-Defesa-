/**
 * Adapters de publicação — arquitetura aberta (interface Publisher).
 * Implementações: Meta Graph API. Novas plataformas registram em `publishers`.
 */

export interface PublishContent {
  channel: string;          // instagram | facebook | blog | tiktok | linkedin | email
  title: string;
  caption?: string;
  copyText?: string;
  hashtags: string[];
  mediaType?: string;       // image | video | carousel | reel
  imageUrl?: string;
  videoUrl?: string;
  linkUrl?: string;
}

export interface PublishResult {
  ok: boolean;
  externalId?: string;
  permalink?: string;
  error?: string;
}

export interface Publisher {
  canHandle(channel: string, mediaType?: string): boolean;
  publish(content: PublishContent): Promise<PublishResult>;
}

// ---------------------------------------------------------------------------
// Meta Graph API
// ---------------------------------------------------------------------------

async function graphRequest(graphApiBase: string, accessToken: string, path: string, body?: Record<string, unknown>): Promise<any> {
  const url = `${graphApiBase}/${path}`;
  const form = new URLSearchParams();
  if (body) for (const [k, v] of Object.entries(body)) if (v !== undefined) form.set(k, String(v));
  form.set('access_token', accessToken);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(`Graph API: ${data.error?.message || res.statusText}`);
  }
  return data;
}

export class MetaPublisherAdapter implements Publisher {
  constructor(private cfg: { graphApiBase?: string; accessToken?: string; igUserId?: string; pageId?: string }) {}

  private get token(): string {
    const t = this.cfg.accessToken || '';
    if (!t) throw new Error('META_ACCESS_TOKEN não configurado. Configure o secret no Cloudflare.');
    return t;
  }
  private get base(): string {
    return this.cfg.graphApiBase || 'https://graph.facebook.com/v21.0';
  }

  canHandle(channel: string): boolean {
    return channel === 'instagram' || channel === 'facebook';
  }

  async publish(content: PublishContent): Promise<PublishResult> {
    const token = this.token;

    try {
      if (content.channel === 'instagram') {
        return await this.publishInstagram(content, token);
      }
      return await this.publishFacebook(content, token);
    } catch (err: any) {
      return { ok: false, error: String(err?.message || err) };
    }
  }

  /** Instagram: cria container (imagem/vídeo/reel/story) e publica. */
  private async publishInstagram(content: PublishContent, token: string): Promise<PublishResult> {
    const igUserId = this.cfg.igUserId;
    if (!igUserId) {
      return { ok: false, error: 'Instagram requer IG_USER_ID configurado no Cloudflare.' };
    }
    const caption = `${content.caption || content.copyText || content.title}\n\n${content.hashtags.join(' ')}`.trim();

    const mediaType =
      content.mediaType === 'reel' ? 'REELS'
      : content.mediaType === 'video' ? 'VIDEO'
      : content.mediaType === 'stories' || content.mediaType === 'story' ? 'STORIES'
      : 'IMAGE';

    const container = await graphRequest(this.base, token, `${igUserId}/media`, {
      image_url: content.imageUrl,
      video_url: content.videoUrl,
      media_type: mediaType,
      caption,
    } as any);

    const published = await graphRequest(this.base, token, `${igUserId}/media_publish`, {
      creation_id: container.id,
    } as any);

    return { ok: true, externalId: published.id };
  }

  /** Facebook: feed (texto), fotos, ou post simples. */
  private async publishFacebook(content: PublishContent, token: string,): Promise<PublishResult> {
    const pageId = this.cfg.pageId;
    if (!pageId) {
      const me = await graphRequest(this.base, token, 'me');
      return this.publishFacebookWithPage(content, token, me.id);
    }
    return this.publishFacebookWithPage(content, token, pageId);
  }

  private async publishFacebookWithPage(content: PublishContent, token: string, pageId: string): Promise<PublishResult> {
    const message = `${content.caption || content.copyText || content.title}\n\n${content.hashtags.join(' ')}`.trim();

    if (content.mediaType === 'image' && content.imageUrl) {
      const res = await graphRequest(this.base, token, `${pageId}/photos`, {
        url: content.imageUrl,
        caption: message,
      } as any);
      return { ok: true, externalId: res.id };
    }
    if (content.mediaType === 'video' && content.videoUrl) {
      const res = await graphRequest(this.base, token, `${pageId}/videos`, {
        file_url: content.videoUrl,
        description: message,
      } as any);
      return { ok: true, externalId: res.id };
    }
    const res = await graphRequest(this.base, token, `${pageId}/feed`, {
      message,
      link: content.linkUrl,
    } as any);
    return { ok: true, externalId: res.id };
  }
}

// Registry — aberto para novas plataformas (LinkedIn/TikTok/etc.)
const metaAdapter = new MetaPublisherAdapter({} as any);

export const publishers: Publisher[] = [metaAdapter];

/** Fábrica com configuração runtime (feita no worker via secrets). */
export function createMetaPublisher(cfg: {
  accessToken?: string;
  pageId?: string;
  igUserId?: string;
  graphApiBase?: string;
}): MetaPublisherAdapter {
  return new MetaPublisherAdapter(cfg);
}