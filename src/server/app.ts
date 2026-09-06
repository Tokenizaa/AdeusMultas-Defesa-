import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { caseRepository } from './db/case-repository';
import type { AuditLogEntry } from '../types';
import { CanonicalMapper } from '../core/mappers/canonical-mapper';
import { authenticateToken, requireAdmin } from './middleware/auth-middleware';
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
import documensoRoutes from './routes/documenso';
import { metaIntegration } from './integrations/meta';

export const databaseRows = caseRepository;
export const auditLogs: AuditLogEntry[] = [];

export function createApp() {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production';
  const supabaseEnvUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  let supabaseOrigins = ['https://*.supabase.co', 'wss://*.supabase.co'];
  try {
    if (supabaseEnvUrl.startsWith('https://')) {
      const { host } = new URL(supabaseEnvUrl);
      supabaseOrigins = [`https://${host}`, `wss://${host}`, ...supabaseOrigins];
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
          scriptSrc: ["'self'", ...(isProd ? [] : ["'unsafe-inline'"])],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: [
            "'self'",
            ...(isProd ? [] : ['ws:', 'wss:']),
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
      strictTransportSecurity: isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
    })
  );

  app.use(corsMiddleware);
  app.use(globalLimiter);
  app.use(
    express.json({
      limit: '10mb',
      verify: (req, _res, buf) => {
        (req as any).rawBody = buf.toString('utf8');
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // FASE 2 — Broken Object Property Level Authorization / Mass Assignment.
  const editableCaseFields = new Set([
    'title', 'clientName', 'clientEmail', 'clientPhone', 'clientCpf',
    'vehicle', 'infraction', 'applicant', 'nominatedDriver', 'company',
    'processNumbers', 'specificFacts', 'evidence', 'ocrAuxiliaryData',
    'commercialOfferId', 'serviceType',
  ]);

  app.use('/api', (req, _res, next) => {
    if (req.method !== 'PUT') return next();
    const match = req.path.match(/^\/cases\/([^/]+)$/);
    if (!match) return next();

    const caseId = decodeURIComponent(match[1]);
    const existingRow = databaseRows.get(caseId);
    if (!existingRow || !req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return next();

    const existingDomain = CanonicalMapper.rowToDomain(existingRow);
    const sanitized: Record<string, unknown> = {};
    for (const field of editableCaseFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) sanitized[field] = req.body[field];
    }

    req.body = {
      ...existingDomain,
      ...sanitized,
      id: existingDomain.id,
      userId: existingDomain.userId,
      status: existingDomain.status,
      currentStage: existingDomain.currentStage,
      isPaid: existingDomain.isPaid,
      paidAt: existingDomain.paidAt,
      payment: existingDomain.payment,
      analysis: existingDomain.analysis,
      defenseDraft: existingDomain.defenseDraft,
      documentGenerationStatus: existingDomain.documentGenerationStatus,
      protocolInfo: existingDomain.protocolInfo,
      submissionInstructions: existingDomain.submissionInstructions,
      timeline: existingDomain.timeline,
      claimToken: existingDomain.claimToken,
      isAnonymous: existingDomain.isAnonymous,
      createdAt: existingDomain.createdAt,
      updatedAt: existingDomain.updatedAt,
    };
    return next();
  });

  // Payment mutation/status endpoints are never anonymous.
  app.use('/api/payments', (req, res, next) => {
    const isPublicPriceLookup = req.method === 'GET' && req.path === '/resolve-price';
    const isGatewayWebhook = req.path.startsWith('/webhooks/');
    if (isPublicPriceLookup || isGatewayWebhook) return next();
    return authenticateToken(req, res, next);
  });

  app.use('/api/admin', adminRoutes);
  app.use('/api/admin/commercial', authenticateToken, requireAdmin, commercialRoutes);

  // Public commercial operations remain authenticated. In production, client-supplied
  // userId must match the authenticated identity.
  app.use('/api/commercial', authenticateToken, (req, res, next) => {
    if (isProd && req.body?.userId !== undefined && req.body.userId !== req.user?.id) {
      return res.status(403).json({ error: 'userId não corresponde ao usuário autenticado.' });
    }
    next();
  }, commercialRoutes);

  // WhatsApp sends require authentication and, for non-admins, ownership of the case.
  app.use('/api/communication', authenticateToken, (req, res, next) => {
    const isSendAction = req.method === 'POST' && /^\/whatsapp\/(send|send-document|send-media)$/.test(req.path);
    if (!isSendAction || req.user?.role === 'admin') return next();

    const caseId = req.body?.caseId;
    if (!caseId || typeof caseId !== 'string') {
      return res.status(403).json({ error: 'caseId é obrigatório para envio de WhatsApp por usuário não administrador.' });
    }

    const row = databaseRows.get(caseId);
    const ownerId = row?.user_id;
    if (!row || !ownerId || ownerId !== req.user?.id) {
      return res.status(403).json({ error: 'Você não tem permissão para enviar mensagens neste caso.' });
    }

    return next();
  });

  // Marketing mutations are administrative operations; public GET status remains available.
  app.use('/api/marketing', (req, res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
    return authenticateToken(req, res, (err?: any) => {
      if (err) return next(err);
      return requireAdmin(req, res, next);
    });
  });

  // Notification mutations/history require authentication. VAPID public key remains public.
  app.use('/api/notifications', (req, res, next) => {
    if (req.method === 'GET' && req.path === '/vapid-key') return next();
    return authenticateToken(req, res, (err?: any) => {
      if (err) return next(err);
      if (req.user?.role !== 'admin') {
        const requestedUserId = req.body?.userId;
        const requestedEmail = req.body?.userEmail || req.body?.email;
        if (requestedUserId !== undefined && requestedUserId !== req.user?.id) {
          return res.status(403).json({ error: 'userId não corresponde ao usuário autenticado.' });
        }
        if (requestedEmail !== undefined && requestedEmail !== req.user?.email) {
          return res.status(403).json({ error: 'Email não corresponde ao usuário autenticado.' });
        }
      }
      next();
    });
  });

  app.use('/api/agents', agentsRoutes);
  app.use('/api/monitoring', monitoringRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/logs', logsRoutes);
  app.use('/api/media', mediaRoutes);
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
  app.use('/api', healthRoutes);
  app.use('/api', casesRoutes);
  app.use('/api', auditRoutes);
  app.use('/api', onboardingRoutes);
  app.use('/api', transitRoutes);
  app.use('/api', governanceRoutes);
  app.use('/api', analyticsRoutes);
  app.use('/api/ai', strictLimiter);
  app.use('/api/auth', strictLimiter);
  app.use('/api', aiRoutes);
  app.use('/api', syncRoutes);
  app.use('/api/documenso', documensoRoutes);
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Endpoint não encontrado' });
  });

  return app;
}
