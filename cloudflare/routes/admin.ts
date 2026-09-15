import { Hono } from 'hono';
import type { Env } from '../supabase';
import { createSupabaseAdminClient } from '../supabase';
import { authenticateToken, requireAdmin, type AuthenticatedUser } from '../middleware';

const AI_MODEL = '@cf/openai/gpt-oss-20b';
const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5';
const VECTORIZE_INDEX = 'adeusmulta-knowledge';

export const adminRoutes = new Hono<{ Bindings: Env; Variables: { user?: AuthenticatedUser } }>();

adminRoutes.use('/admin/*', authenticateToken, requireAdmin);

adminRoutes.get('/admin/ai/overview', (c) => c.json({
  provider: { name: 'Cloudflare Workers AI', runtime: 'cloudflare', model: AI_MODEL, fallback: null },
  rag: { provider: 'Cloudflare Vectorize', index: VECTORIZE_INDEX, embeddingModel: EMBEDDING_MODEL, dimensions: 768, status: 'configured' },
  capabilities: { infractionAnalysis: '/api/ai/analyze-infraction', defenseGeneration: '/api/ai/generate-defense', ocr: '/api/ocr/analyze' },
  observability: { historicalMetrics: false, metricsPhase: 13 },
}));

adminRoutes.get('/admin/overview', async (c) => {
  const supabase = createSupabaseAdminClient(c.env);
  const [{ count: totalCases }, { count: analyzedCases }, { count: defenseReadyCases }, { count: paidCases }] = await Promise.all([
    supabase.from('cases').select('*', { count: 'exact', head: true }),
    supabase.from('cases').select('*', { count: 'exact', head: true }).not('analysis_json', 'is', null),
    supabase.from('cases').select('*', { count: 'exact', head: true }).or('defense_draft_json.not.is.null,status.eq.defesa_pronta'),
    supabase.from('cases').select('*', { count: 'exact', head: true }).eq('is_paid', true),
  ]);
  let totalRevenue = 0;
  try {
    const { data } = await supabase.from('payment_orders').select('amount').eq('status', 'PAID');
    totalRevenue = (data || []).reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0);
  } catch { totalRevenue = 0; }
  const { count: profileCount } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true });
  const total = totalCases ?? 0;
  const paid = paidCases ?? 0;
  const analyzed = analyzedCases ?? 0;
  const ready = defenseReadyCases ?? 0;
  return c.json({
    metrics: {
      totalUsers: profileCount ?? 0,
      totalCases: total,
      analyzedCases: analyzed,
      defenseReadyCases: ready,
      paidCases: paid,
      totalRevenue,
      conversionRate: total > 0 ? Number(((paid / total) * 100).toFixed(1)) : 0,
      analysisToDocRate: analyzed > 0 ? Number(((ready / analyzed) * 100).toFixed(1)) : 0,
    },
    observability: {
      historicalMetrics: false,
      metricsPhase: 13,
    },
  });
});

adminRoutes.get('/admin/users', async (c) => {
  const supabase = createSupabaseAdminClient(c.env);
  const { data, error } = await supabase.from('user_profiles').select('user_id,name,email,role,cpf,phone,cnh,city_state,avatar_url,created_at').order('created_at', { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  return c.json({ users: (data || []).map((user: any) => ({ id: user.user_id, name: user.name, email: user.email || '', role: user.role, cpf: user.cpf || undefined, phone: user.phone || undefined, cnh: user.cnh || undefined, cityState: user.city_state || undefined, avatarUrl: user.avatar_url || undefined, createdAt: user.created_at })) });
});

adminRoutes.put('/admin/users', async (c) => {
  const body = await c.req.json<any>().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const role = body.role;
  if (!email || !['admin', 'citizen'].includes(role)) return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'email e role válidos são obrigatórios' } }, 400);
  const supabase = createSupabaseAdminClient(c.env);
  const { data: target, error: lookupError } = await supabase.from('user_profiles').select('user_id,name,email,role,cpf,phone,cnh,city_state,avatar_url,created_at').eq('email', email).maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (!target) return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Usuário não encontrado' } }, 404);
  const { data, error } = await supabase.from('user_profiles').update({ role, updated_at: new Date().toISOString() }).eq('user_id', target.user_id).select('user_id,name,email,role,cpf,phone,cnh,city_state,avatar_url,created_at').single();
  if (error) throw new Error(error.message);
  return c.json({ success: true, user: { id: data.user_id, name: data.name, email: data.email || '', role: data.role, cpf: data.cpf || undefined, phone: data.phone || undefined, cnh: data.cnh || undefined, cityState: data.city_state || undefined, avatarUrl: data.avatar_url || undefined, createdAt: data.created_at } });
});

adminRoutes.get('/admin/payments', async (c) => {
  const supabase = createSupabaseAdminClient(c.env);
  const [{ data: cases }, { data: orders }] = await Promise.all([
    supabase.from('cases').select('id,title,client_name,is_paid,paid_at,service_type,fine_amount').order('paid_at', { ascending: false }).limit(200),
    supabase.from('payment_orders').select('*').order('created_at', { ascending: false }).limit(200),
  ]);
  const paidCases = (cases || []).filter((x: any) => x.is_paid);
  const revenue = (orders || []).filter((o: any) => o.status === 'PAID').reduce((acc: number, o: any) => acc + (Number(o.amount) || 0), 0);
  return c.json({ payments: paidCases, orders: orders || [], totalRevenue: revenue });
});

adminRoutes.get('/admin/documents', async (c) => {
  const supabase = createSupabaseAdminClient(c.env);
  const { data } = await supabase.from('cases').select('id,title,client_name,service_type,status,defense_draft_json,created_at').not('defense_draft_json', 'is', null).order('created_at', { ascending: false }).limit(200);
  return c.json({ documents: (data || []).map((d: any) => ({ id: d.id, title: d.title, clientName: d.client_name, serviceType: d.service_type, status: d.status, hasDraft: Boolean(d.defense_draft_json), createdAt: d.created_at })) });
});

export default adminRoutes;
