import { Hono } from 'hono';
import type { Env } from '../supabase';
import { createSupabaseAdminClient } from '../supabase';
import { authenticateToken, requireAdmin, type AuthenticatedUser } from '../middleware';

/**
 * Console admin — dados reais do Supabase. Endpoints que dependem de
 * observabilidade/integrações (ai/overview, integrations/overview, e2e-tests)
 * seguem no proxy Vercel (ver worker.ts).
 */
export const adminRoutes = new Hono<{ Bindings: Env; Variables: { user?: AuthenticatedUser } }>();

adminRoutes.use('/admin/*', authenticateToken, requireAdmin);

// GET /api/admin/overview
adminRoutes.get('/admin/overview', async (c) => {
  const supabase = createSupabaseAdminClient(c.env);

  const [{ count: totalCases }, { count: analyzedCases }, { count: defenseReadyCases }, { count: paidCases }] =
    await Promise.all([
      supabase.from('cases').select('*', { count: 'exact', head: true }),
      supabase.from('cases').select('*', { count: 'exact', head: true }).not('analysis_json', 'is', null),
      supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .or('defense_draft_json.not.is.null,status.eq.defesa_pronta'),
      supabase.from('cases').select('*', { count: 'exact', head: true }).eq('is_paid', true),
    ]);

  // Receita: SUM(payment_orders) PAID; fallback 0
  let totalRevenue = 0;
  try {
    const { data } = await supabase.from('payment_orders').select('amount').eq('status', 'PAID');
    totalRevenue = (data || []).reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0);
  } catch {
    totalRevenue = 0;
  }

  // Usuários: distinct user_id em cases + contagem profiles
  const { count: profileCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

  const total = totalCases ?? 0;
  const paid = paidCases ?? 0;
  const analyzed = analyzedCases ?? 0;
  const ready = defenseReadyCases ?? 0;
  const conversionRate = total > 0 ? Number(((paid / total) * 100).toFixed(1)) : 0;
  const analysisToDocRate = analyzed > 0 ? Number(((ready / analyzed) * 100).toFixed(1)) : 0;

  return c.json({
    metrics: {
      totalUsers: profileCount ?? 0,
      totalCases: total,
      analyzedCases: analyzed,
      defenseReadyCases: ready,
      paidCases: paid,
      totalRevenue,
      conversionRate,
      analysisToDocRate,
      aiErrorRatePercent: 0,
      totalAiCalls: 0,
      pendingJobs: 0,
      systemUptimePercent: 100,
      thesesCount: 0,
    },
    aiStatus: {
      primaryProvider: 'nvidia',
      fallbackProvider: '9router',
      nvidiaHealthy: false,
      nineRouterHealthy: false,
      fallbackRatePercent: 0,
      p95LatencyMs: 0,
    },
    integrationsHealth: {
      supabase: 'HEALTHY',
      pagbank: 'UNKNOWN',
      meta: 'UNKNOWN',
      ocr: 'UNKNOWN',
    },
  });
});

// GET /api/admin/users — lista perfis
adminRoutes.get('/admin/users', async (c) => {
  const supabase = createSupabaseAdminClient(c.env);
  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,role,nome,telefone,cpf,cnh,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);
  return c.json({ users: data || [] });
});

// PUT /api/admin/users — atualiza role/perfil
adminRoutes.put('/admin/users', async (c) => {
  const body = await c.req.json<any>().catch(() => ({}));
  const { id, role, name } = body;
  if (!id) throw new Error('id é obrigatório');

  const supabase = createSupabaseAdminClient(c.env);
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (role) patch.role = role;
  if (name) patch.nome = name;

  const { data, error } = await supabase.from('profiles').update(patch).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return c.json({ success: true, user: data });
});

// GET /api/admin/payments — casos pagos + payment_orders
adminRoutes.get('/admin/payments', async (c) => {
  const supabase = createSupabaseAdminClient(c.env);
  const [{ data: cases }, { data: orders }] = await Promise.all([
    supabase.from('cases').select('id,title,client_name,is_paid,paid_at,service_type,fine_amount').order('paid_at', { ascending: false }).limit(200),
    supabase.from('payment_orders').select('*').order('created_at', { ascending: false }).limit(200),
  ]);

  const paidCases = (cases || []).filter((x: any) => x.is_paid);
  const revenue = (orders || [])
    .filter((o: any) => o.status === 'PAID')
    .reduce((acc: number, o: any) => acc + (Number(o.amount) || 0), 0);

  return c.json({ payments: paidCases, orders: orders || [], totalRevenue: revenue });
});

// GET /api/admin/documents — casos com minuta
adminRoutes.get('/admin/documents', async (c) => {
  const supabase = createSupabaseAdminClient(c.env);
  const { data } = await supabase
    .from('cases')
    .select('id,title,client_name,service_type,status,defense_draft_json,created_at')
    .not('defense_draft_json', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200);

  return c.json({
    documents: (data || []).map((d: any) => ({
      id: d.id,
      title: d.title,
      clientName: d.client_name,
      serviceType: d.service_type,
      status: d.status,
      hasDraft: Boolean(d.defense_draft_json),
      createdAt: d.created_at,
    })),
  });
});

export default adminRoutes;