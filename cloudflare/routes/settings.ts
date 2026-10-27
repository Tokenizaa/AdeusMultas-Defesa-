import { Hono } from 'hono';
import type { Env } from '../supabase';
import { createSupabaseAdminClient } from '../supabase';
import { authenticateToken, requireAdmin, type AuthenticatedUser } from '../middleware';
import { recordAuditLog } from './audit';

const AI_MODEL = '@cf/openai/gpt-oss-20b';
const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5';
const VECTORIZE_INDEX = 'adeusmulta-knowledge';

export const settingsRoutes = new Hono<{ Bindings: Env; Variables: { user?: AuthenticatedUser } }>();

function runtimeSetting(
  key: string,
  name: string,
  category: string,
  type: 'string' | 'number' | 'boolean' | 'select' | 'secret' | 'json',
  description: string,
  value: unknown,
  options: { secret?: boolean; required?: boolean; configuredOverride?: boolean } = {},
) {
  const isSecret = options.secret === true;
  const configured = options.configuredOverride ?? (value !== undefined && value !== null && value !== '');
  return {
    key,
    name,
    category,
    type,
    description,
    defaultValue: isSecret ? '' : (value ?? ''),
    currentValue: isSecret ? (configured ? '••••••••••••••••' : '') : (value ?? ''),
    isSecret,
    isRequired: options.required === true,
    // Cloudflare Worker bindings are provisioned through Cloudflare, not app_settings.
    isEditable: false,
    isConfigured: configured,
    updatedBy: 'Cloudflare Runtime Binding',
  };
}

function getRuntimeSettings(env: Env) {
  const primaryGateway = env.VENO_PRIMARY_GATEWAY || 'venopag';
  return [
    runtimeSetting('AI_RUNTIME', 'Runtime de Inferência', 'ai', 'string', 'Inferência executada pelo binding Cloudflare Workers AI.', 'Cloudflare Workers AI', { required: true, configuredOverride: Boolean(env.AI) }),
    runtimeSetting('AI_MODEL', 'Modelo de Inferência', 'ai', 'string', 'Modelo usado pelo runtime Cloudflare Workers AI.', AI_MODEL, { required: true }),
    runtimeSetting('VECTORIZE_INDEX', 'Índice Vetorial', 'ai', 'string', 'Índice configurado para busca vetorial jurídica.', VECTORIZE_INDEX, { required: true, configuredOverride: Boolean(env.VECTORIZE) }),
    runtimeSetting('EMBEDDING_MODEL', 'Modelo de Embeddings', 'ai', 'string', 'Modelo de embeddings configurado no Worker.', EMBEDDING_MODEL, { required: true }),
    runtimeSetting('SUPABASE_URL', 'Supabase URL', 'supabase', 'string', 'Endpoint do projeto Supabase usado pelo Worker.', env.SUPABASE_URL, { required: true }),
    runtimeSetting('SUPABASE_SECRET_KEY', 'Supabase Service Secret', 'supabase', 'secret', 'Credencial privilegiada do Worker; o valor nunca é retornado.', '', { secret: true, required: true, configuredOverride: Boolean(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY) }),
    runtimeSetting('SUPABASE_ANON_KEY', 'Supabase Anon Key', 'supabase', 'string', 'Chave pública usada para validar sessões; o valor não é exibido.', env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY ? 'Configurada (valor oculto)' : 'Não configurada', { required: true, configuredOverride: Boolean(env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY) }),
    runtimeSetting('VENO_PRIMARY_GATEWAY', 'Gateway de Pagamento', 'payments', 'string', 'Gateway primário configurado para pagamentos.', primaryGateway, { required: true }),
    runtimeSetting('VENO_CLIENT_ID', 'VenoPag Client ID', 'payments', 'secret', 'Identificador de integração VenoPag; o valor nunca é retornado.', '', { secret: true, required: true, configuredOverride: Boolean(env.VENO_CLIENT_ID) }),
    runtimeSetting('VENO_CLIENT_SECRET', 'VenoPag Client Secret', 'payments', 'secret', 'Credencial VenoPag; o valor nunca é retornado.', '', { secret: true, required: true, configuredOverride: Boolean(env.VENO_CLIENT_SECRET) }),
    runtimeSetting('VENO_WEBHOOK_SECRET', 'VenoPag Webhook Secret', 'payments', 'secret', 'Segredo de validação de webhook; o valor nunca é retornado.', '', { secret: true, required: true, configuredOverride: Boolean(env.VENO_WEBHOOK_SECRET) }),
    runtimeSetting('PAYMENT_MODE', 'Modo de Pagamento', 'payments', 'string', 'Modo de operação configurado no Worker.', env.PAYMENT_MODE || 'production', { required: true }),
    runtimeSetting('APP_URL', 'Origens Permitidas', 'system', 'string', 'Origens autorizadas pela política CORS do Worker.', env.APP_URL || 'Não configurado', { required: true, configuredOverride: Boolean(env.APP_URL?.trim()) }),
  ];
}

settingsRoutes.get('/settings/health', (c) =>
  c.json({ status: 'ok', service: 'settings', runtime: 'cloudflare-worker', timestamp: new Date().toISOString() })
);

// GET /api/settings — fonte de verdade: bindings do Worker e trilha persistida.
settingsRoutes.get('/settings', authenticateToken, requireAdmin, async (c) => {
  const supabase = createSupabaseAdminClient(c.env);
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id,action,actor,target_resource,details,timestamp')
    .order('timestamp', { ascending: false })
    .limit(200);

  const auditHistory = (error ? [] : (data || []))
    .filter((row: any) => /settings|setting|secret/i.test(String(row.action || '') + ' ' + String(row.target_resource || '')))
    .slice(0, 50)
    .map((row: any) => ({
      id: row.id,
      key: row.target_resource || 'runtime',
      category: 'system',
      isSecret: /secret|token|key/i.test(String(row.target_resource || '')),
      action: String(row.action || 'settings.event'),
      updatedBy: row.actor || 'unknown',
      timestamp: row.timestamp,
      environment: 'cloudflare',
      details: typeof row.details === 'string' ? row.details : JSON.stringify(row.details || {}),
    }));

  return c.json({
    settings: getRuntimeSettings(c.env),
    auditHistory,
    total: getRuntimeSettings(c.env).length,
    environment: 'cloudflare',
    readOnly: true,
    warning: error ? 'Configurações de runtime foram lidas, mas o histórico de auditoria está indisponível.' : undefined,
  });
});

// Runtime bindings are deliberately read-only. Writing app_settings does not change
// Cloudflare secrets/vars and must never be reported as a successful runtime update.
settingsRoutes.put('/settings', authenticateToken, requireAdmin, (c) =>
  c.json({
    success: false,
    error: {
      code: 'RUNTIME_BINDINGS_READ_ONLY',
      message: 'A configuração efetiva é gerenciada em Cloudflare Workers > Settings > Variables and Secrets. Nenhuma alteração foi aplicada.',
    },
  }, 409)
);

settingsRoutes.post('/settings/reset-default', authenticateToken, requireAdmin, (c) =>
  c.json({
    success: false,
    error: {
      code: 'RUNTIME_BINDINGS_READ_ONLY',
      message: 'Bindings do Cloudflare não possuem reset por este painel. Nenhuma alteração foi aplicada.',
    },
  }, 409)
);

// Checks real runtime dependencies without creating payments or changing configuration.
settingsRoutes.post('/settings/test-integration', authenticateToken, requireAdmin, async (c) => {
  const body = await c.req.json<any>().catch(() => ({}));
  const serviceId = typeof body.serviceId === 'string' ? body.serviceId : '';
  const startedAt = Date.now();
  let serviceName = serviceId;
  let success = false;
  let message = '';
  const checks: { label: string; passed: boolean; detail: string }[] = [];

  try {
    if (serviceId === 'cloudflare-ai' || serviceId === 'ai') {
      serviceName = 'Cloudflare Workers AI';
      checks.push({ label: 'Binding AI', passed: Boolean(c.env.AI), detail: c.env.AI ? 'Binding disponível no Worker.' : 'Binding AI ausente.' });
      if (!c.env.AI) throw new Error('Binding Cloudflare Workers AI não configurado.');
      await c.env.AI.run(AI_MODEL, { messages: [{ role: 'user', content: 'Responda apenas OK.' }], max_tokens: 8 });
      success = true;
      message = 'Inferência de teste concluída pelo binding Cloudflare Workers AI.';
    } else if (serviceId === 'supabase') {
      serviceName = 'Supabase';
      const supabase = createSupabaseAdminClient(c.env);
      const { error } = await supabase.from('cases').select('id', { head: true }).limit(0);
      success = !error;
      checks.push({ label: 'Banco de dados', passed: !error, detail: error ? error.message : 'Consulta de saúde concluída sem ler dados de usuários.' });
      message = error ? 'Não foi possível consultar o Supabase.' : 'Conexão com Supabase confirmada.';
    } else if (serviceId === 'venopag') {
      serviceName = 'VenoPag';
      const configured = Boolean(c.env.VENO_CLIENT_ID && c.env.VENO_CLIENT_SECRET && c.env.VENO_WEBHOOK_SECRET);
      success = configured;
      checks.push({ label: 'Client ID', passed: Boolean(c.env.VENO_CLIENT_ID), detail: c.env.VENO_CLIENT_ID ? 'Configurado.' : 'Ausente.' });
      checks.push({ label: 'Client Secret', passed: Boolean(c.env.VENO_CLIENT_SECRET), detail: c.env.VENO_CLIENT_SECRET ? 'Configurado; valor oculto.' : 'Ausente.' });
      checks.push({ label: 'Webhook Secret', passed: Boolean(c.env.VENO_WEBHOOK_SECRET), detail: c.env.VENO_WEBHOOK_SECRET ? 'Configurado; valor oculto.' : 'Ausente.' });
      message = configured
        ? 'Credenciais VenoPag configuradas. A conectividade externa não foi testada e nenhuma transação foi criada.'
        : 'Credenciais VenoPag incompletas. Nenhuma transação foi criada.';
    } else {
      return c.json({ success: false, error: { code: 'UNSUPPORTED_INTEGRATION', message: 'Integração não suportada pelo runtime Cloudflare.' } }, 400);
    }
  } catch (error: any) {
    success = false;
    message = error?.message || 'Falha ao verificar a integração.';
    checks.push({ label: 'Execução', passed: false, detail: message });
  }

  const user = c.get('user') as AuthenticatedUser | undefined;
  await recordAuditLog(c.env, {
    actor: user?.email || user?.id || 'unknown',
    actorRole: user?.role || 'admin',
    action: 'settings.integration_tested',
    targetResource: 'runtime-settings',
    targetId: serviceId,
    details: { success, message, latencyMs: Date.now() - startedAt },
    gdprCompliant: true,
  });

  return c.json({ success, serviceName, latencyMs: Date.now() - startedAt, message, checks });
});

export default settingsRoutes;
