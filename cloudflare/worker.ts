import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import type { Env } from './supabase'
import { authenticateToken, requireAdmin, type AuthenticatedUser } from './middleware'

// Route modules
import { authRoutes } from './routes/auth'
import { onboardingRoutes } from './routes/onboarding'
import { casesRoutes } from './routes/cases'
import { paymentsRoutes } from './routes/payments'
import { notificationsRoutes } from './routes/notifications'
import { auditRoutes } from './routes/audit'
import { settingsRoutes } from './routes/settings'
import { adminRoutes } from './routes/admin'

// Create Hono app
const app = new Hono<{ Bindings: Env; Variables: { user?: AuthenticatedUser } }>()

// Apply middleware
app.use('*', secureHeaders())
app.use('*', cors())

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ status: 'worker_is_working_v3', timestamp: new Date().toISOString() })
})

// Mount route modules
app.route('/api', authRoutes)
app.route('/api', onboardingRoutes)
app.route('/api', casesRoutes)
app.route('/api', paymentsRoutes)
app.route('/api', notificationsRoutes)
app.route('/api', auditRoutes)
app.route('/api', settingsRoutes)
app.route('/api', adminRoutes)

// Admin test route (protected)
app.get('/api/admin/test', authenticateToken, requireAdmin, (c) => {
  const user = c.get('user') as AuthenticatedUser
  return c.json({
    message: 'Admin test successful',
    user: { id: user.id, email: user.email, role: user.role },
  })
})

// Proxy transitório: console admin/marketing ainda vivem na Vercel (Fase 2C).
async function proxyToVercel(c: any): Promise<Response> {
  const origin = c.env.API_ORIGIN_FALLBACK || 'https://www.defesai.shop'
  const incoming = new URL(c.req.url)
  const target = new URL(incoming.pathname + incoming.search, origin)
  const headers = new Headers(c.req.raw.headers)
  headers.set('origin', origin)
  headers.set('referer', `${origin}${incoming.pathname}`)
  headers.set('x-forwarded-host', incoming.host)
  headers.set('x-forwarded-proto', incoming.protocol.replace(':', ''))
  const init: RequestInit = { method: c.req.method, headers, redirect: 'manual' }
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    init.body = await c.req.raw.text()
  }
  return fetch(target, init as any)
}
app.all('/api/admin/*', proxyToVercel)
app.all('/api/marketing/*', proxyToVercel)

// Rotas /api não portadas → 404 JSON claro (sem cair no SPA)
app.all('/api/*', (c) => c.json({ error: 'Rota não implementada no worker (migração Cloudflare pendente).' }, 404))

// SPA fallback: try static asset, fall back to index.html
app.get('*', async (c) => {
  const assetResponse = await c.env.ASSETS.fetch(c.req.raw)
  if (!assetResponse.ok) {
    return c.env.ASSETS.fetch(new Request('/index.html', c.req.raw))
  }
  return assetResponse
})

export default app