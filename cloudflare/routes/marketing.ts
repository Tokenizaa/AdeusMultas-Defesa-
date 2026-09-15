import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../supabase';
import { createSupabaseAdminClient } from '../supabase';
import { authenticateToken, requireAdmin, type AuthenticatedUser } from '../middleware';
import { createMetaPublisher, type PublishContent } from '../publishers';

/** CRUD editorial_content + publicação via adapters (Meta agora, abertos p/ mais). */
// Fase 10 — Contrato runtime: publish exige binds META_ACCESS_TOKEN, META_PAGE_ID, IG_USER_ID.
export const marketingRoutes = new Hono<{ Bindings: Env; Variables: { user?: AuthenticatedUser } }>();

marketingRoutes.use('/marketing/*', authenticateToken, requireAdmin);

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
  if (!result.ok) throw new HTTPException(502, { message: result.error || 'Falha na publicação' });

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

marketingRoutes.get('/marketing/status', async (c) => {
  const supabase = createSupabaseAdminClient(c.env);
  const { count: total } = await supabase.from('editorial_content').select('*', { count: 'exact', head: true });
  const { count: agendados } = await supabase.from('editorial_content').select('*', { count: 'exact', head: true }).eq('status', 'agendado');
  const { count: publicados } = await supabase.from('editorial_content').select('*', { count: 'exact', head: true }).eq('status', 'publicado');
  return c.json({ total: total || 0, agendados: agendados || 0, publicados: publicados || 0, engine: 'cloudflare-meta' });
});

marketingRoutes.post('/marketing/media/upload', authenticateToken, requireAdmin, async (c) => {
  const { base64, filename, mimeType } = await c.req.json<any>().catch(() => ({}));
  if (!base64 || typeof base64 !== 'string') throw new HTTPException(400, { message: 'base64 é obrigatório' });

  const clean = base64.replace(/^data:[^;]+;base64,/, '');
  const bytes = Uint8Array.from(atob(clean), (ch) => ch.charCodeAt(0));
  if (bytes.length === 0 || bytes.length > 50 * 1024 * 1024) throw new HTTPException(413, { message: 'Mídia deve ter entre 1 byte e 50MB' });

  const ext = (String(filename || 'arquivo').split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const key = `media/${crypto.randomUUID()}.${ext}`;
  const supabaseUrl = (c.env as any).SUPABASE_URL;
  const serviceKey = (c.env as any).SUPABASE_SERVICE_ROLE_KEY;

  const res = await fetch(`${supabaseUrl}/storage/v1/object/${key}`, {
    method: 'POST',
    headers: {
      'Content-Type': mimeType || 'application/octet-stream',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'x-upsert': 'true',
    },
    body: bytes,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new HTTPException(502, { message: `Upload falhou: ${res.status} ${detail.slice(0, 120)}` });
  }

  return c.json({ url: `${supabaseUrl}/storage/v1/object/public/${key}`, key, sizeBytes: bytes.length }, 201);
});

export default marketingRoutes;