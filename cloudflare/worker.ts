import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import type { Env } from './supabase'
import { authenticateToken, requireAdmin, type AuthenticatedUser } from './middleware'
import { apiBoundary } from '../src/shared/api/boundary'

import { authRoutes } from './routes/auth'
import { onboardingRoutes } from './routes/onboarding'
import { casesRoutes } from './routes/cases'
import { paymentsRoutes } from './routes/payments'
import { notificationsRoutes } from './routes/notifications'
import { auditRoutes } from './routes/audit'
import { settingsRoutes } from './routes/settings'
import { scheduledTick } from './cron'
import { adminRoutes } from './routes/admin'
import { marketingRoutes } from './routes/marketing'
import { ocrRoutes } from './routes/ocr'
import { knowledgeRoutes } from './routes/knowledge'
import { aiRoutes } from './routes/ai'
import { commercialRoutes } from './routes/commercial'
import { documentsRoutes } from './routes/documents'

const app = new Hono<{ Bindings: Env; Variables: { user?: AuthenticatedUser } }>()
app.use('*', secureHeaders())
app.use('*', cors())
app.use('/api/*', apiBoundary)

app.get('/api/health', (c) => c.json({ status: 'worker_is_working_v3', timestamp: new Date().toISOString() }))
app.route('/api', authRoutes)
app.route('/api', onboardingRoutes)
app.route('/api', casesRoutes)
app.route('/api', paymentsRoutes)
app.route('/api', notificationsRoutes)
app.route('/api', auditRoutes)
app.route('/api', settingsRoutes)
app.route('/api', adminRoutes)
app.route('/api', marketingRoutes)
app.route('/api', ocrRoutes)
app.route('/api', knowledgeRoutes)
app.route('/api', aiRoutes)
app.route('/api', commercialRoutes)
app.route('/api', documentsRoutes)

app.get('/api/admin/test', authenticateToken, requireAdmin, (c) => {
  const user = c.get('user') as AuthenticatedUser
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
  scheduled: async (event: any, env: Env, _ctx: any) => {
    const result = await scheduledTick(env)
    console.log('[cron] tick:', JSON.stringify(result))
  },
}