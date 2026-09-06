import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { caseRepository } from './db/case-repository';
import type { AuditLogEntry } from '../types';
import { CanonicalMapper } from '../core/mappers/canonical-mapper';
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
  // PUT /cases/:id may only bind fields explicitly intended for user editing.
  // Server-authoritative state is reconstructed from the persisted canonical case.
  const editableCaseFields = new Set([
    'title',
    'clientName',
    'clientEmail',
    'clientPhone',
    'clientCpf',
    'vehicle',
    'infraction',
    'applicant',
    'nominatedDriver',
    'company',
    'processNumbers',
    'specificFacts',
    'evidence',
    'ocrAuxiliaryData',
    'commercialOfferId',
    'serviceType',
  ]);

  app.use('/api', (req, _res, next) => {
    if (req.method !== 'PUT') return next();

    const match = req.path.match(/^\/cases\/([^/]+)$/);
    if (!match) return next();

    const caseId = decodeURIComponent(match[1]);
    const existingRow = databaseRows.get(caseId);
    if (!existingRow || !req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return next();
    }

    const existingDomain = CanonicalMapper.rowToDomain(existingRow);
    const sanitized: Record<string, unknown> = {};
    for (const field of editableCaseFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        sanitized[field] = req.body[field];
      }
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

  app.use('/api/admin', adminRoutes);
  app.use('/api/admin/commercial', commercialRoutes);
  app.use('/api/commercial', commercialRoutes);
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