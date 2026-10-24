// Release trigger: [DEPLOY-PRODUCTION] publish the consolidated VenoPag/admin version to Cloudflare.
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { createSupabaseAdminClient } from './supabase'
import { authenticateToken, requireAdmin, logRequest } from './middleware'
import { apiBoundary } from '../src/shared/api/boundary'

import { authRoutes } from './routes/auth'
import { onboardingRoutes } from './routes/onboarding'
import { casesRoutes } from './routes/cases'
import { paymentsRoutes } from './routes/payments'
import { notificationsRoutes } from './routes/notifications'
import { auditRoutes } from './routes/audit'
import { settingsRoutes } from './routes/settings'
import { adminRoutes } from './routes/admin'
import { marketingRoutes } from './routes/marketing'
import { communicationRoutes } from './routes/communication'
import { ocrRoutes } from './routes/ocr'
import { knowledgeRoutes } from './routes/knowledge'
import { monitorRoutes } from './routes/monitor'
import { aiRoutes } from './routes/ai'
import { commercialRoutes } from './routes/commercial'
import { documentsRoutes } from './routes/documents'

import { runMonitorCycle, initializeMonitor } from '../src/core/knowledge/scheduler/monitor-runtime'

const app = new Hono()
app.use('*', secureHeaders())
app.use('*', cors())
app.use('*', logRequest)
app.use('/api/*', apiBoundary)

app.get('/api/health', async (c) => {
  const start = Date.now();
  let dbStatus = 'disconnected';
  try {
    const supabase = createSupabaseAdminClient(c.env);
    // Probe an existing, non-sensitive table without fetching application data.
    const { error } = await supabase.from('cases').select('id', { head: true }).limit(0);
    if (error) {
      dbStatus = 'error';
    } else {
      dbStatus = 'connected';
    }
  } catch {
    dbStatus = 'error';
  }
  const latencyMs = Date.now() - start;
  const primaryGateway = c.env.VENO_PRIMARY_GATEWAY || 'venopag'
  const paymentReady = primaryGateway === 'venopag'
    ? Boolean(c.env.VENO_CLIENT_ID && c.env.VENO_CLIENT_SECRET && c.env.VENO_WEBHOOK_SECRET)
    : Boolean(c.env.PAGBANK_TOKEN)
  return c.json({
    status: dbStatus === 'connected' && paymentReady ? 'ok' : 'degraded',
    worker: 'cloudflare-worker',
    timestamp: new Date().toISOString(),
    latency_ms: latencyMs,
    database: { status: dbStatus },
    payments: {
      status: paymentReady ? 'configured' : 'unavailable',
      gateway: primaryGateway,
      environment: primaryGateway === 'pagbank' ? (c.env.PAGBANK_ENV || 'sandbox') : 'production',
    },
  });
});
app.route('/api', authRoutes)
app.route('/api', onboardingRoutes)
app.route('/api', casesRoutes)
app.route('/api', paymentsRoutes)
app.route('/api', notificationsRoutes)
app.route('/api', auditRoutes)
app.route('/api', settingsRoutes)
app.route('/api', adminRoutes)
app.route('/api', marketingRoutes)
app.route('/api', communicationRoutes)
app.route('/api', ocrRoutes)
app.route('/api', knowledgeRoutes)
app.route('/api', monitorRoutes)
app.route('/api', aiRoutes)
app.route('/api', commercialRoutes)
app.route('/api', documentsRoutes)

app.get('/api/admin/test', authenticateToken, requireAdmin, (c) => {
  const user = c.get('user')
  return c.json({ message: 'Admin test successful', user: { id: user.id, email: user.email, role: user.role } })
})

app.all('/api/*', (c) => c.json({ error: 'Rota não implementada no worker (migração Cloudflare pendente).' }, 404))

app.get('*', async (c) => {
  const assetResponse = await c.env.ASSETS.fetch(c.req.raw)
  if (!assetResponse.ok) return c.env.ASSETS.fetch(new Request('/index.html', c.req.raw))
  return assetResponse
})

export default {
  fetch: app.fetch,
  async scheduled(event, env, ctx) {
    // Inicializa o monitor se ainda não estiver (idempotente)
    initializeMonitor(false);
    // Executa um ciclo de monitoramento sob demanda do cron do Cloudflare.
    // ctx.waitUntil garante que o Worker não seja encerrado antes da conclusão.
    ctx.waitUntil(runMonitorCycle(undefined, 6000));
  },
};
export { app };
