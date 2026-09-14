import type { Env } from './supabase';
import { createSupabaseAdminClient } from './supabase';
import { createMetaPublisher, type PublishContent } from './publishers';

/**
 * Cron Trigger (a cada 5 min): publica conteúdo agendado vencido.
 * Busca editorial_content status='agendado' com scheduled_at/scheduled_date <= now
 * e delega aos adapters de publicação. Sem filas/Redis (modelo simples confirmado).
 */
export async function scheduledTick(env: Env, at: string = new Date().toISOString()): Promise<{ published: number; failed: number }> {
  const supabase = createSupabaseAdminClient(env);

  const { data: contents, error } = await supabase
    .from('editorial_content')
    .select('*')
    .eq('status', 'agendado')
    .lte('scheduled_at', at);

  if (error || !contents || contents.length === 0) {
    return { published: 0, failed: 0 };
  }

  const publisher = createMetaPublisher({
    accessToken: (env as any).META_ACCESS_TOKEN,
    pageId: (env as any).META_PAGE_ID,
    igUserId: (env as any).IG_USER_ID,
  });

  let published = 0;
  let failed = 0;

  for (const content of contents) {
    const payload: PublishContent = {
      channel: content.channel,
      title: content.title,
      caption: content.caption || content.copy_text,
      copyText: content.copy_text,
      hashtags: content.hashtags || [],
      mediaType: content.media_type || content.format,
      imageUrl: content.image_url,
      videoUrl: content.video_url,
      linkUrl: content.link_url,
    };

    const result = await publisher.publish(payload);
    if (result.ok) {
      published += 1;
      await supabase
        .from('editorial_content')
        .update({ status: 'publicado', published_at: new Date().toISOString(), meta_post_id: result.externalId, external_status: 'published' })
        .eq('id', content.id);
    } else {
      failed += 1;
      await supabase
        .from('editorial_content')
        .update({ external_status: 'failed', external_error: (result.error || '').slice(0, 500) })
        .eq('id', content.id);
    }
  }

  return { published, failed };
}