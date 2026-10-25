import { Hono } from 'hono';
import type { Env } from '../supabase';
import { createSupabaseAdminClient } from '../supabase';
import { authenticateToken, requireAdmin, type AuthenticatedUser } from '../middleware';
import {
  getRetentionPolicies,
  updateRetentionPolicy,
  getRetentionExecutions,
  runRetention,
} from '../retention';
import { recordAuditLog } from './audit';

const AI_MODEL = '@cf/openai/gpt-oss-20b';
const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5';
const VECTORIZE_INDEX = 'adeusmulta-knowledge';

export const adminRoutes = new Hono<{ Bindings: Env; Variables: { user?: AuthenticatedUser } }>();

adminRoutes.use('/admin/*', authenticateToken, requireAdmin);

adminRoutes.get('/admin/ai/overview', (c) => c.json({
  provider: { name: 'Cloudflare Workers AI', runtime: 'cloudflare', model: AI_MODEL, fallback: null },
  rag: { provider: 'Cloudflare Vectorize', index: VECTORIZE_INDEX, embeddingModel: EMBEDDING_MODEL, dimensions: 768, status: 'configured' },
  capabilities: { infractionAnalysis: '/api/ai/analyze-infraction', defenseGeneration: '/api/ai/generate-defense', ocr: '/api/ocr/analyze' },
  observability: { historicalMetrics: true, metricsEndpoint: '/api/admin/ai/metrics' },
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
      historicalMetrics: true,
      metricsEndpoint: '/api/admin/ai/metrics',
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

adminRoutes.get('/admin/ai/metrics', async (c) => {
  const supabase = createSupabaseAdminClient(c.env);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('ai_execution_logs')
    .select('operation,status,latency_ms')
    .gte('created_at', since);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<{ operation: string; status: string; latency_ms: number }>;
  const latencies = rows.map((r) => Number(r.latency_ms) || 0).sort((a, b) => a - b);
  const pct = (p: number) => {
    if (!latencies.length) return 0;
    const idx = Math.min(latencies.length - 1, Math.floor((p / 100) * latencies.length));
    return latencies[idx];
  };
  const errors = rows.filter((r) => r.status === 'error').length;
  const byOperation: Record<string, number> = {};
  for (const r of rows) byOperation[r.operation] = (byOperation[r.operation] ?? 0) + 1;
  return c.json({
    available: true,
    windowHours: 24,
    totalCalls: rows.length,
    errorRatePercent: rows.length ? Number(((errors / rows.length) * 100).toFixed(2)) : 0,
    avgLatencyMs: rows.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / rows.length) : 0,
    p50LatencyMs: pct(50),
    p95LatencyMs: pct(95),
    p99LatencyMs: pct(99),
    byOperation,
  });
});

adminRoutes.get('/admin/payments', async (c) => {
  const supabase = createSupabaseAdminClient(c.env);
  const [{ data: rawOrders, error: ordersError }, { count: total }, { count: paid }, { count: pending }, { count: reversed }, { data: paidAmounts, error: revenueError }] = await Promise.all([
    supabase.from('payment_orders').select('*').order('created_at', { ascending: false }).limit(500),
    supabase.from('payment_orders').select('id', { count: 'exact', head: true }),
    supabase.from('payment_orders').select('id', { count: 'exact', head: true }).eq('status', 'PAID'),
    supabase.from('payment_orders').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
    supabase.from('payment_orders').select('id', { count: 'exact', head: true }).in('status', ['REFUNDED', 'CONTESTED', 'CHARGEDBACK']),
    supabase.from('payment_orders').select('id,amount').eq('status', 'PAID').limit(2000),
  ]);
  if (ordersError) throw new Error(ordersError.message);
  if (revenueError) throw new Error(revenueError.message);
  const orders = (rawOrders || []).map((order: any) => ({ ...order, is_test: false }));
  const revenue = (paidAmounts || []).reduce((sum: number, order: any) => sum + (Number(order.amount) || 0), 0);
  return c.json({
    orders,
    summary: {
      revenue: Number(revenue.toFixed(2)),
      paid: Math.max(0, paid || 0),
      pending: Math.max(0, pending || 0),
      total: Math.max(0, total || 0),
      refunded: Math.max(0, reversed || 0),
    },
    testOrders: 0,
    gateway: c.env.VENO_PRIMARY_GATEWAY || 'venopag',
  });
});

adminRoutes.get('/admin/payments/gateway', (c) => {
  const gateway = c.env.VENO_PRIMARY_GATEWAY || 'venopag';
  const configured = gateway === 'venopag'
    ? Boolean(c.env.VENO_CLIENT_ID && c.env.VENO_CLIENT_SECRET && c.env.VENO_WEBHOOK_SECRET)
    : Boolean(c.env.PAGBANK_TOKEN);
  return c.json({ gateway, configured, environment: gateway === 'venopag' ? 'production' : (c.env.PAGBANK_ENV || 'sandbox') });
});

adminRoutes.get('/admin/payments/affiliates', async (c) => {
  const supabase = createSupabaseAdminClient(c.env);
  const [{ data: relations, error: relationError }, { data: mappings, error: mappingError }] = await Promise.all([
    supabase.from('referral_relations').select('referrer_id,referred_id,level,status').eq('status', 'active').in('level', [1, 2, 3]).limit(5000),
    supabase.from('affiliate_gateway_profiles').select('user_id,venopag_username,split_percent,is_active').limit(1000),
  ]);
  if (relationError) throw new Error(relationError.message);
  if (mappingError) throw new Error(mappingError.message);
  const referrals = relations || [];
  const mappingByUser = new Map((mappings || []).map((row: any) => [String(row.user_id), row]));
  const ids = [...new Set([
    ...referrals.map((row: any) => String(row.referrer_id)),
    ...(mappings || []).map((row: any) => String(row.user_id)),
  ].filter(Boolean))];
  const [{ data: profiles, error: profileError }, { data: ledger, error: ledgerError }, { data: availableUsers, error: usersError }] = await Promise.all([
    ids.length
      ? supabase.from('user_profiles').select('user_id,name,email,referral_code').in('user_id', ids)
      : Promise.resolve({ data: [], error: null }),
    ids.length
      ? supabase.from('commission_ledger').select('beneficiary_id,commission_amount,status').in('beneficiary_id', ids).limit(5000)
      : Promise.resolve({ data: [], error: null }),
    supabase.from('user_profiles').select('user_id,name,email,referral_code').order('created_at', { ascending: false }).limit(500),
  ]);
  if (profileError) throw new Error(profileError.message);
  if (ledgerError) throw new Error(ledgerError.message);
  if (usersError) throw new Error(usersError.message);
  const profileByUser = new Map((profiles || []).map((row: any) => [String(row.user_id), row]));
  const affiliates = ids.map((userId) => {
    const profile: any = profileByUser.get(userId) || {};
    const mapping: any = mappingByUser.get(userId) || {};
    const userRelations = referrals.filter((row: any) => String(row.referrer_id) === userId);
    const earned = (ledger || []).filter((row: any) => String(row.beneficiary_id) === userId && !['REVERSED', 'CANCELLED'].includes(String(row.status).toUpperCase()))
      .reduce((sum: number, row: any) => sum + (Number(row.commission_amount) || 0), 0);
    return {
      userId, name: profile.name || '', email: profile.email || '', referralCode: profile.referral_code || '',
      referrals: userRelations.length, commissions: Number(earned.toFixed(2)),
      venopagUsername: mapping.venopag_username || '', splitPercent: Number(mapping.split_percent) || 0,
      active: Boolean(mapping.is_active), configured: Boolean(mapping.venopag_username),
    };
  }).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return c.json({
    affiliates,
    availableUsers: (availableUsers || []).map((user: any) => ({
      userId: String(user.user_id), name: user.name || '', email: user.email || '',
      referralCode: user.referral_code || '',
    })),
  });
});

adminRoutes.put('/admin/payments/affiliates/:userId', async (c) => {
  const userId = c.req.param('userId');
  const body = await c.req.json<any>().catch(() => ({}));
  const username = typeof body.venopagUsername === 'string' ? body.venopagUsername.trim() : '';
  const splitPercent = Number(body.splitPercent);
  const active = body.active === true;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: 'ID de afiliado inválido.' } }, 400);
  }
  if (!username || username.length > 120 || !Number.isFinite(splitPercent) || splitPercent < 0 || splitPercent > 100) {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Username VenoPag e percentual entre 0 e 100 são obrigatórios.' } }, 400);
  }
  const supabase = createSupabaseAdminClient(c.env);
  const { data: user, error: userError } = await supabase.from('user_profiles').select('user_id,referral_code').eq('user_id', userId).maybeSingle();
  if (userError) throw new Error(userError.message);
  if (!user) return c.json({ error: { code: 'NOT_FOUND', message: 'Usuário afiliado não encontrado.' } }, 404);
  const referralCode = user.referral_code || `REF_${userId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  if (!user.referral_code) {
    const { error: referralCodeError } = await supabase.from('user_profiles').update({
      referral_code: referralCode, updated_at: new Date().toISOString(),
    }).eq('user_id', userId);
    if (referralCodeError) throw new Error(referralCodeError.message);
  }
  const { error } = await supabase.from('affiliate_gateway_profiles').upsert({
    user_id: userId, venopag_username: username, split_percent: splitPercent, is_active: active, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) {
    if (error.code === '23505') return c.json({ error: { code: 'CONFLICT', message: 'Esse username VenoPag já está associado a outro afiliado.' } }, 409);
    throw new Error(error.message);
  }
  return c.json({ success: true, userId, referralCode, venopagUsername: username, splitPercent, active });
});

adminRoutes.get('/admin/payments/commissions', async (c) => {
  const supabase = createSupabaseAdminClient(c.env);
  const { data: ledger, error } = await supabase.from('commission_ledger').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) throw new Error(error.message);
  const rows = ledger || [];
  const ids = [...new Set(rows.flatMap((row: any) => [row.beneficiary_id, row.buyer_user_id]).filter(Boolean).map(String))];
  const { data: profiles, error: profileError } = ids.length
    ? await supabase.from('user_profiles').select('user_id,name,email').in('user_id', ids)
    : { data: [], error: null };
  if (profileError) throw new Error(profileError.message);
  const profileByUser = new Map((profiles || []).map((row: any) => [String(row.user_id), row]));
  return c.json({ commissions: rows.map((row: any) => ({
    ...row,
    beneficiaryName: (profileByUser.get(String(row.beneficiary_id)) as any)?.name || (profileByUser.get(String(row.beneficiary_id)) as any)?.email || row.beneficiary_id,
    buyerName: (profileByUser.get(String(row.buyer_user_id)) as any)?.name || (profileByUser.get(String(row.buyer_user_id)) as any)?.email || row.buyer_user_id,
  })) });
});

adminRoutes.get('/admin/documents', async (c) => {
  const supabase = createSupabaseAdminClient(c.env);
  const { data } = await supabase.from('cases').select('id,title,client_name,service_type,status,defense_draft_json,created_at').not('defense_draft_json', 'is', null).order('created_at', { ascending: false }).limit(200);
  return c.json({ documents: (data || []).map((d: any) => ({ id: d.id, title: d.title, clientName: d.client_name, serviceType: d.service_type, status: d.status, hasDraft: Boolean(d.defense_draft_json), createdAt: d.created_at })) });
});

// ---------------------------------------------------------------------------
// Políticas de retenção de dados pessoais (LGPD)
// Somente administradores. Define por quanto tempo cada categoria de dado
// é mantida antes da exclusão automática, com base legal documentada.
// ---------------------------------------------------------------------------

// GET /admin/retention/policy — lista políticas de retenção
adminRoutes.get('/admin/retention/policy', async (c) => {
  const policies = await getRetentionPolicies(c.env);
  return c.json({ policies });
});

// PUT /admin/retention/policy/:category — atualiza política de retenção
adminRoutes.put('/admin/retention/policy/:category', async (c) => {
  const user = c.get('user');
  if (!user || user.role !== 'admin') {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Acesso restrito a administradores' } }, 403);
  }
  const category = c.req.param('category');
  const body = await c.req.json<any>().catch(() => ({}));
  const allowed = new Set([
    'retention_days',
    'description',
    'legal_basis',
    'legal_basis_article',
    'applies_to_anonymous',
    'applies_to_authenticated',
    'hard_delete_after_days',
  ]);
  const fields: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) fields[key] = body[key];
  }
  if (Object.keys(fields).length === 0) {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Nenhum campo válido para atualização.' } }, 400);
  }
  if (fields.retention_days !== undefined && (!Number.isFinite(Number(fields.retention_days)) || Number(fields.retention_days) <= 0)) {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: 'retention_days deve ser um inteiro positivo.' } }, 400);
  }
  if (fields.hard_delete_after_days !== undefined && fields.hard_delete_after_days !== null && (!Number.isFinite(Number(fields.hard_delete_after_days)) || Number(fields.hard_delete_after_days) <= 0)) {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: 'hard_delete_after_days deve ser um inteiro positivo ou null.' } }, 400);
  }
  const updated = await updateRetentionPolicy(c.env, category, fields as any, user.id);
  await recordAuditLog(c.env, {
    actor: user.id,
    actorRole: user.role,
    action: 'retention.policy.updated',
    targetResource: 'data_retention_policies',
    targetId: category,
    details: { category, updatedFields: Object.keys(fields), legalBasis: 'LGPD Art. 6º, II e Art. 18, VI' },
    correlationId: c.req.header('x-request-id') ?? null,
    gdprCompliant: true,
  });
  return c.json({ success: true, policy: updated });
});

// POST /admin/retention/run — executa job de retenção manualmente
adminRoutes.post('/admin/retention/run', async (c) => {
  const user = c.get('user');
  if (!user || user.role !== 'admin') {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Acesso restrito a administradores' } }, 403);
  }
  const result = await runRetention(c.env, 'manual', user.id);
  return c.json({ success: result.status === 'completed', result });
});

// GET /admin/retention/executions — histórico de execuções de retenção
adminRoutes.get('/admin/retention/executions', async (c) => {
  const limit = Math.min(Number(c.req.query('limit') || 50), 500);
  const executions = await getRetentionExecutions(c.env, limit);
  return c.json({ executions });
});

export default adminRoutes;
