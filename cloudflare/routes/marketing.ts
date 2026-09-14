import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../supabase';
import { createSupabaseAdminClient } from '../supabase';
import { authenticateToken, requireAdmin, type AuthenticatedUser } from '../middleware';
import { createMetaPublisher, type PublishContent } from '../publishers';

/** CRUD editorial_content + publicação via adapters (Meta agora, abertos p/ mais). */
export const marketingRoutes = new Hono<{ Bindings: Env; Variables: { user?: AuthenticatedUser } }>();

marketingRoutes.use('/marketing/*', authenticateToken, requireAdmin);

// GET /api/marketing/contents — lista com filtros
marketingRoutes.get('/marketing/contents', async (c) => {
  const { status, channel, limit = '100' } = c.req.query();
  const supabase = createSupabaseAdminClient(c.env);
  let q = supabase.from('editorial_content').select('*').order('created_at', { ascending: false }).limit(Number(limit) || 100);
  if (status) q = q.eq('status', status);
  if (channel) q = q.eq('channel', channel);
  const { data, error } = await q;
  if (error) throw new HTTPException(500, { message: error.message });
  return c.json({ contents: data || [] });
});

// POST /api/marketing/contents — cria conteúdo (agenda por scheduled_at)
marketingRoutes.post('/marketing/contents', async (c) => {
  const body = await c.req.json<any>().catch(() => ({}));
  const supabase = createSupabaseAdminClient(c.env);
  const row = {
    title: body.title,
    channel: body.channel || 'instagram',
    format: body.format || 'post_imagem',
    copy_text: body.copyText ?? body.caption ?? '',
    caption: body.caption,
    hashtags: body.hashtags || [],
    image_url: body.imageUrl,
    video_url: body.videoUrl,
    media_type: body.mediaType,
    scheduled_at: body.scheduledAt || body.scheduled_date || null,
    scheduled_date: body.scheduledAt || body.scheduled_date || null,
    status: body.scheduledAt || body.scheduled_date ? 'agendado' : (body.status || 'rascunho'),
    author_agent: body.authorAgent || 'estrategico',
  };
  const { data, error } = await supabase.from('editorial_content').insert(row).select().single();
  if (error) throw new HTTPException(400, { message: error.message });
  return c.json({ content: data }, 201);
});

// PUT /api/marketing/contents/:id — atualiza
marketingRoutes.put('/marketing/contents/:id', async (c) => {
  const body = await c.req.json<any>().catch(() => ({}));
  const supabase = createSupabaseAdminClient(c.env);
  const { error } = await supabase
    .from('editorial_content')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', c.req.param('id'));
  if (error) throw new HTTPException(400, { message: error.message });
  return c.json({ success: true });
});

// POST /api/marketing/publish/:id — publicação imediata
marketingRoutes.post('/marketing/publish/:id', async (c) => {
  const supabase = createSupabaseAdminClient(c.env);
  const { data: content } = await supabase.from('editorial_content').select('*').eq('id', c.req.param('id')).maybeSingle();
  if (!content) throw new HTTPException(404, { message: 'Conteúdo não encontrado' });

  const env = c.env as any;
  const publisher = createMetaPublisher({
    accessToken: env.META_ACCESS_TOKEN,
    pageId: env.META_PAGE_ID,
    igUserId: env.IG_USER_ID,
  });

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
  if (!result.ok) {
    throw new HTTPException(502, { message: result.error || 'Falha na publicação' });
  }

  await supabase
    .from('editorial_content')
    .update({
      status: 'publicado',
      published_at: new Date().toISOString(),
      meta_post_id: result.externalId,
      external_status: 'published',
    })
    .eq('id', content.id);

  return c.json({ success: true, externalId: result.externalId });
});

// GET /api/marketing/status — resumo simples
marketingRoutes.get('/marketing/status', async (c) => {
  const supabase = createSupabaseAdminClient(c.env);
  const { count: total } = await supabase.from('editorial_content').select('*', { count: 'exact', head: true });
  const { count: agendados } = await supabase.from('editorial_content').select('*', { count: 'exact', head: true }).eq('status', 'agendado');
  const { count: publicados } = await supabase.from('editorial_content').select('*', { count: 'exact', head: true }).eq('status', 'publicado');
  return c.json({ total: total || 0, agendados: agendados || 0, publicados: publicados || 0, engine: 'nvidia-only' });
});

export default marketingRoutes;