import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { caseRepository } from './db/case-repository';
import type { AuditLogEntry } from '../types';
import { corsMiddleware } from './config/cors';
import { globalLimiter, strictLimiter } from './middleware/rate-limit';

// Route modules
import adminRoutes from './routes/admin';
import metaRoutes from './routes/meta';
import commercialRoutes from './routes/commercial';
import monitoringRoutes from './routes/monitoring';
import settingsRoutes from './routes/settings';
import logsRoutes from './routes/logs';
import marketingRoutes from './routes/marketing';
import agentsRoutes from './routes/agents';
import whatsappRoutes from './routes/whatsapp';
import ocrRoutes from './routes/ocr';
import paymentsRoutes from './routes/payments';
import knowledgeRoutes from './routes/knowledge';
import mediaRoutes from './routes/media';
import notificationsRoutes from './routes/notifications';
import healthRoutes from './routes/health';
import casesRoutes from './routes/cases';
import auditRoutes from './routes/audit';
import onboardingRoutes from './routes/onboarding';
import transitRoutes from './routes/transit';
import governanceRoutes from './routes/governance';
import analyticsRoutes from './routes/analytics';
import aiRoutes from './routes/ai';
import syncRoutes from './routes/sync';
import authRoutes from './routes/auth';
import { metaIntegration } from './integrations/meta';

// ---------------------------------------------------------------------------
// Shared instances (imported by route modules via '../app')
// ---------------------------------------------------------------------------
export const databaseRows = caseRepository;
export const auditLogs: AuditLogEntry[] = [];

// ---------------------------------------------------------------------------
// createApp() — factory that wires middleware + all routes
// ---------------------------------------------------------------------------
export function createApp() {
  const app = express();

  // Security headers
  // GOV.BR 08-seguranca: CSP + X-Frame-Options + nosniff + HSTS.
  // CSP cobre os consumidores reais do bundle browser:
  //   - Google Fonts (index.html: fonts.googleapis.com css2 + fonts.gstatic.com)
  //   - Supabase JS (src/lib/supabase.ts ← VITE_SUPABASE_URL / SUPABASE_URL)
  //   - Firebase Auth (src/lib/google-auth.ts: identitytoolkit/securetoken/installations)
  //   - Google Drive REST (src/core/integrations/google-drive-service.ts)
  //   - Imagens remotas (api.qrserver.com, stc.pagseguro.uol.com.br, images.unsplash.com → https:)
  const isProd = process.env.NODE_ENV === 'production';
  const supabaseEnvUrl =
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  let supabaseOrigins = ['https://*.supabase.co', 'wss://*.supabase.co'];
  try {
    if (supabaseEnvUrl.startsWith('https://')) {
      const { host } = new URL(supabaseEnvUrl);
      supabaseOrigins = [
        `https://${host}`,
        `wss://${host}`,
        ...supabaseOrigins,
      ];
    }
  } catch {
    // URL malformada no env: mantém apenas o wildcard
  }
  app.use(
    helmet({
      frameguard: false,
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          // Dev: @vitejs/plugin-react injeta preamble react-refresh inline;
          // Prod build do Vite só emite scripts externos hashados.
          // Nota: 'unsafe-inline' em scriptSrc só existe em dev por causa do
          // preamble inline do plugin-react; upgrade path = nonce gerado no server +
          // transformIndexHtml. Em prod fica 'self' puro. Idem ws:/wss: para HMR.
          scriptSrc: ["'self'", ...(isProd ? [] : ["'unsafe-inline'"])],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com',
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: [
            "'self'",
            ...(isProd ? [] : ['ws:', 'wss:']), // Vite HMR (dev)
            ...supabaseOrigins,
            'https://identitytoolkit.googleapis.com',
            'https://securetoken.googleapis.com',
            'https://firebaseinstallations.googleapis.com',
            'https://firebaselogging-pa.googleapis.com',
            'https://www.googleapis.com',
          ],
          workerSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      strictTransportSecurity: isProd
        ? { maxAge: 31536000, includeSubDomains: true }
        : false,
    })
  );

  // CORS
  app.use(corsMiddleware);

  // Rate limiting
  app.use(globalLimiter);

  // Body parsing
  // verify: anexa `req.rawBody` (bytes brutos como string) para verificacao de
  // assinatura HMAC em webhooks (ex: Evolution API /api/webhooks/whatsapp).
  // Aditivo — nao altera o parse nem o req.body; apenas captura o buffer.
  app.use(
    express.json({
      limit: '10mb',
      verify: (req, _res, buf) => {
        (req as any).rawBody = buf.toString('utf8');
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ----- Modular API Routes -----

  // ─── Routers with global requireAdmin — mount ONLY at specific prefix ───
  // (Dual-mount at /api was blocking ALL subsequent routes via requireAdmin)
  app.use('/api/admin', adminRoutes);
  app.use('/api/admin/commercial', commercialRoutes);
  app.use('/api/commercial', commercialRoutes);
  app.use('/api/agents', agentsRoutes);
  app.use('/api/monitoring', monitoringRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/logs', logsRoutes);
  app.use('/api/media', mediaRoutes);

  // ─── Routers with per-route auth (safe to mount at /api) ─────────────────
  app.use('/api/integrations', metaRoutes);
  app.use('/api', metaRoutes);
  app.use('/api/marketing', marketingRoutes);
  app.use('/api/communication', whatsappRoutes);
  app.use('/api', whatsappRoutes);
  app.use('/api/ocr', ocrRoutes);
  app.use('/api/payments', paymentsRoutes);
  app.use('/api/knowledge', knowledgeRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/auth', authRoutes);

  // Health check
  app.use('/api', healthRoutes);

  // Cases CRUD
  app.use('/api', casesRoutes);

  // Audit logs
  app.use('/api', auditRoutes);

  // Onboarding rules
  app.use('/api', onboardingRoutes);

  // Transit database queries
  app.use('/api', transitRoutes);

  // Governance (law-enforcement, manual-override)
  app.use('/api', governanceRoutes);

  // Analytics dashboard
  app.use('/api', analyticsRoutes);

  // AI endpoints (rate-limited via strictLimiter)
  app.use('/api/ai', strictLimiter);
  app.use('/api/auth', strictLimiter);
  app.use('/api', aiRoutes);

  // Sync
  app.use('/api', syncRoutes);

  // API 404 fallback — garante que nenhum endpoint /api/* responda HTML
  // (evita "Expected JSON response" no cliente quando a rota não existe).
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Endpoint não encontrado' });
  });

  return app;
}
