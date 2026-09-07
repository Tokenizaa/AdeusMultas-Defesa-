import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { caseRepository } from './db/case-repository';
import type { AuditLogEntry } from '../types';
import { CanonicalMapper } from '../core/mappers/canonical-mapper';
import { authenticateToken, requireAdmin } from './middleware/auth-middleware';
import { corsMiddleware } from './config/cors';
import { globalLimiter, strictLimiter } from './middleware/rate-limit';

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
import marketingAutomationRoutes from './routes/marketing-automation';
import scrapeRoutes from './routes/scrape';
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
  app.set('trust proxy', process.env.VERCEL === '1' ? 1 : false);
  const supabaseEnvUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  let supabaseOrigins = ['https://*.supabase.co', 'wss://*.supabase.co'];
  try {
    if (supabaseEnvUrl.startsWith('https://')) {
      const { host } = new URL(supabaseEnvUrl);
      supabaseOrigins = [`https://${host}`, `wss://${host}`, ...supabaseOrigins];
    }
  } catch {}
  app.use(helmet({ frameguard: false, contentSecurityPolicy: { useDefaults: true, directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'", ...(isProd ? [] : ["'unsafe-inline'"])],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
    imgSrc: ["'self'", 'data:', 'blob:', 'https:'], connectSrc: ["'self'", ...(isProd ? [] : ['ws:', 'wss:']), ...supabaseOrigins, 'https://identitytoolkit.googleapis.com', 'https://securetoken.googleapis.com', 'https://firebaseinstallations.googleapis.com', 'https://firebaselogging-pa.googleapis.com', 'https://www.googleapis.com'],
    workerSrc: ["'self'"], objectSrc: ["'none'"], baseUri: ["'self'"], frameAncestors: ["'self'"],
  }}, crossOriginEmbedderPolicy: false, strictTransportSecurity: isProd ? { maxAge: 31536000, includeSubDomains: true } : false }));
  app.use(corsMiddleware);
  app.use(globalLimiter);
  app.use(express.json({ limit: '10mb', verify: (req, _res, buf) => { (req as any).rawBody = buf.toString('utf8'); } }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  const editableCaseFields = new Set(['title','clientName','clientEmail','clientPhone','clientCpf','vehicle','infraction','applicant','nominatedDriver','company','processNumbers','specificFacts','evidence','ocrAuxiliaryData','commercialOfferId','serviceType']);
  app.use('/api', (req, _res, next) => {
    if (req.method !== 'PUT') return next();
    const match = req.path.match(/^\/cases\/([^/]+)$/);
    if (!match) return next();
    const existingRow = databaseRows.get(decodeURIComponent(match[1]));
    if (!existingRow || !req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return next();
    const existingDomain = CanonicalMapper.rowToDomain(existingRow);
    const sanitized: Record<string, unknown> = {};
    for (const field of editableCaseFields) if (Object.prototype.hasOwnProperty.call(req.body, field)) sanitized[field] = req.body[field];
    req.body = { ...existingDomain, ...sanitized, id: existingDomain.id, userId: existingDomain.userId, status: existingDomain.status, currentStage: existingDomain.currentStage, isPaid: existingDomain.isPaid, paidAt: existingDomain.paidAt, payment: existingDomain.payment, analysis: existingDomain.analysis, defenseDraft: existingDomain.defenseDraft, documentGenerationStatus: existingDomain.documentGenerationStatus, protocolInfo: existingDomain.protocolInfo, submissionInstructions: existingDomain.submissionInstructions, timeline: existingDomain.timeline, claimToken: existingDomain.claimToken, isAnonymous: existingDomain.isAnonymous, createdAt: existingDomain.createdAt, updatedAt: existingDomain.updatedAt };
    next();
  });
  app.use('/api/payments', (req, res, next) => {
    if ((req.method === 'GET' && req.path === '/resolve-price') || req.path.startsWith('/webhooks/')) return next();
    return authenticateToken(req, res, next);
  });
  app.use('/api/admin', adminRoutes);
  app.use('/api/admin/commercial', authenticateToken, requireAdmin, commercialRoutes);
  app.use('/api/commercial', authenticateToken, (req,res,next) => { if (isProd && req.body?.userId !== undefined && req.body.userId !== req.user?.id) return res.status(403).json({error:'userId não corresponde ao usuário autenticado.'}); next(); }, commercialRoutes);
  app.use('/api/communication', authenticateToken, (req,res,next) => { const send = req.method === 'POST' && /^\/whatsapp\/(send|send-document|send-media)$/.test(req.path); if (!send || req.user?.role === 'admin') return next(); const caseId=req.body?.caseId; const row=caseId ? databaseRows.get(caseId) : undefined; if (!caseId || !row || row.user_id !== req.user?.id) return res.status(403).json({error:'Você não tem permissão para enviar mensagens neste caso.'}); next(); });
  app.use('/api/marketing', (req,res,next) => { if (req.method === 'GET' && /^\/(?:inbox\/conversations|inbox\/stats|automation\/leads|automation\/export)/.test(req.path)) return authenticateToken(req,res,(err?:any)=>err?next(err):requireAdmin(req,res,next)); next(); });
  app.use('/api/marketing', (req,res,next) => ['POST','PUT','PATCH','DELETE'].includes(req.method) ? authenticateToken(req,res,(err?:any)=>err?next(err):requireAdmin(req,res,next)) : next());
  app.use('/api/notifications', (req,res,next) => { if (req.method === 'GET' && req.path === '/vapid-key') return next(); return authenticateToken(req,res,(err?:any)=>{ if(err)return next(err); if(req.user?.role !== 'admin'){if(req.body?.userId!==undefined&&req.body.userId!==req.user?.id)return res.status(403).json({error:'userId não corresponde ao usuário autenticado.'});if(req.body?.userEmail!==undefined&&req.body.userEmail!==req.user?.email)return res.status(403).json({error:'Email não corresponde ao usuário autenticado.'});} next(); }); });
  app.use('/api', (req,res,next) => { const privileged=/^\/(?:integrations\/meta|meta)\/(?:debug-app|debug-token|connect|select-targets|disconnect|publish|insights|tests|webhooks\/history|webhook\/history)$/.test(req.path); if(!privileged)return next(); return authenticateToken(req,res,(err?:any)=>err?next(err):requireAdmin(req,res,next)); });

  app.use('/api/admin', strictLimiter);
  app.use('/api', healthRoutes);
  app.use('/api', authRoutes);
  app.use('/api', auditRoutes);
  app.use('/api', casesRoutes);
  app.use('/api', aiRoutes);
  app.use('/api', knowledgeRoutes);
  app.use('/api', onboardingRoutes);
  app.use('/api', transitRoutes);
  app.use('/api', governanceRoutes);
  app.use('/api', analyticsRoutes);
  app.use('/api', syncRoutes);
  app.use('/api', metaRoutes);
  app.use('/api', marketingAutomationRoutes);
  app.use('/api', scrapeRoutes);
  app.use('/api', adminRoutes);
  app.use('/api', commercialRoutes);
  app.use('/api', monitoringRoutes);
  app.use('/api', settingsRoutes);
  app.use('/api', logsRoutes);
  app.use('/api', marketingRoutes);
  app.use('/api', agentsRoutes);
  app.use('/api', whatsappRoutes);
  app.use('/api', ocrRoutes);
  app.use('/api', paymentsRoutes);
  app.use('/api', mediaRoutes);
  app.use('/api', notificationsRoutes);
  app.use('/api', documensoRoutes);

  app.get('/api/meta/status', async (_req,res)=>res.json(await metaIntegration.getStatus()));
  app.get('/api/marketing/meta/status', async (_req,res)=>res.json(await metaIntegration.getStatus()));
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => { console.error('[api] unhandled error', err); if(res.headersSent)return; res.status(500).json({error:'Internal server error'}); });
  return app;
}
