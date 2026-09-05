/**
 * Documenso Integration Routes
 * REST API endpoints for envelope management and webhooks
 */

import { Router, Request, Response, NextFunction } from 'express';
import express from 'express';
import { authenticateToken, AuthenticatedUser } from '../middleware/auth-middleware';
import { getDocumensoClient, DocumensoClient, isDocumensoConfigured } from '../lib/documenso/client';
import { getEnvelopeService, EnvelopeService } from '../lib/documenso/envelope-service';
import { getWebhookHandler, WebhookHandler, documensoWebhookMiddleware } from '../lib/documenso/webhook-handler';
import { getPollingJob, PollingJob } from '../lib/documenso/polling-job';
import { caseRepository } from '../db/case-repository';
import { envelopeRepository } from '../db/envelope-repository';
import { domainIdToUuid } from '../db/uuid-v5';
import {
  CreateEnvelopeRequest,
  EnvelopeStatus,
  DocumensoError,
} from '@/types/documenso';
import { logger, LogService } from '@/server/observability/logger';

const router = Router();

// Lazy initialization: services created on first request, not at import time.
let envelopeService: EnvelopeService;
let webhookHandler: WebhookHandler;
let pollingJob: PollingJob;

// FASE 1.2 CORREÇÃO: envelopeOwnership era Map em memória (perdido em restart).
// Substituído por persistência em Supabase via envelopeRepository.
// Permite authorization sobreviver a restarts e funcionar em multi-instância.

// Centralized case ownership check (mirrors cases.ts)
export function canAccessCase(user: AuthenticatedUser | undefined, row: any): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (!row.user_id) return false;
  return row.user_id === user.id || (!!user.email && row.user_id === user.email);
}

function denyAccess(user: AuthenticatedUser | undefined, res: Response): boolean {
  if (!user) { res.status(401).json({ error: 'Não autenticado' }); return true; }
  res.status(403).json({ error: 'Você não tem permissão para acessar este recurso' }); return true;
}

/**
 * Authorize envelope access via persisted ownership in Supabase.
 *
 * FASE 1.2 CORREÇÃO: usa envelopeRepository.belongsToUser() que consulta o banco,
 * não mais o Map em memória.
 * - Admin bypass: admins podem acessar qualquer envelope.
 * - Fail closed: envelope não encontrado no banco → false.
 */
async function authorizeEnvelope(envelopeId: string, user: AuthenticatedUser | undefined): Promise<boolean> {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return envelopeRepository.belongsToUser(envelopeId, user.id);
}

function ensureServices(): void {
  if (!envelopeService) {
    if (!isDocumensoConfigured()) {
      throw new Error('Documenso environment variables are not configured');
    }
    const documensoClient = getDocumensoClient();
    envelopeService = new EnvelopeService(documensoClient);
    webhookHandler = new WebhookHandler(documensoClient, envelopeService);
    pollingJob = new PollingJob({}, documensoClient, envelopeService, webhookHandler);
  }
}

// Guard: return 503 if Documenso env vars are not configured
router.use((req: Request, res: Response, next: NextFunction) => {
  try {
    ensureServices();
  } catch (err) {
    logger.warn('documenso' as LogService, 'routes', 'init', 'Documenso not configured - integration disabled', {
      err: err instanceof Error ? err.message : String(err),
      path: req.path,
    });
    res.status(503).json({
      error: 'Documenso integration not configured',
      code: 'DOCUMENSO_NOT_CONFIGURED',
    });
    return;
  }
  next();
});

/**
 * POST /api/documenso/envelopes
 * Create a new envelope for a case
 */
router.post('/envelopes', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      caseId,
      pdfBase64,
      signers,
      title,
      fields,
      settings,
      metadata,
    } = req.body as {
      caseId: string;
      pdfBase64: string;
      signers: Array<{ email: string; name: string }>;
      title?: string;
      fields?: Partial<any>[];
      settings?: Partial<any>;
      metadata?: Record<string, any>;
    };

    // Validate required fields
    if (!caseId) {
      return res.status(400).json({ error: 'caseId is required' });
    }
    if (!pdfBase64) {
      return res.status(400).json({ error: 'pdfBase64 is required' });
    }
    if (!signers || signers.length === 0) {
      return res.status(400).json({ error: 'At least one signer is required' });
    }

    // FASE 1.2: authorize that authenticated user owns this case
    const caseRow = caseRepository.get(caseId);
    if (!caseRow) {
      return res.status(404).json({ error: 'Caso não encontrado' });
    }
    if (!canAccessCase(req.user, caseRow)) {
      return denyAccess(req.user, res);
    }

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    // Create envelope
    const envelope = await envelopeService.createEnvelopeFromCase(
      caseId,
      pdfBuffer,
      signers,
      { title, fields, settings, metadata }
    );

    // FASE 1.2 CORREÇÃO: persistir ownership em Supabase (sobrevive a restart/multi-instância)
    const caseUuid = domainIdToUuid(caseId);
    if (!caseUuid) {
      return res.status(400).json({ error: 'ID do caso inválido' });
    }
    await envelopeRepository.register({
      documensoEnvelopeId: envelope.id,
      externalId: caseId,
      caseId: caseUuid,
      userId: req.user!.id,
      envelopeData: envelope,
    });

    res.status(201).json({
      success: true,
      envelope: {
        id: envelope.id,
        title: envelope.title,
        status: envelope.status,
        externalId: envelope.externalId,
        documents: envelope.documents,
        recipients: envelope.recipients,
        createdAt: envelope.createdAt,
      },
    });
  } catch (err) {
    logger.error('documenso' as LogService, 'envelope-service', 'create-envelope', 'Create envelope failed', {
      err,
      body: req.body,
    });

    if (err instanceof DocumensoError) {
      return res.status(err.statusCode).json({
        error: err.message,
        code: err.code,
        details: err.details,
      });
    }

    res.status(500).json({ error: 'Failed to create envelope' });
  }
});

/**
 * POST /api/documenso/envelopes/:id/send
 * Send envelope for signing
 */
router.post('/envelopes/:id/send', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // FASE 1.2 CORREÇÃO: authorization via banco (supervive a restart)
    if (!(await authorizeEnvelope(id, req.user))) {
      return denyAccess(req.user, res);
    }

    const envelope = await envelopeService.sendEnvelope(id);

    res.json({
      success: true,
      envelope: {
        id: envelope.id,
        status: envelope.status,
        sentAt: envelope.sentAt,
        recipients: envelope.recipients,
      },
    });
  } catch (err) {
    logger.error('documenso' as LogService, 'envelope-service', 'send-envelope', 'Send envelope failed', {
      err,
      envelopeId: req.params.id,
    });

    if (err instanceof DocumensoError) {
      return res.status(err.statusCode).json({
        error: err.message,
        code: err.code,
      });
    }

    res.status(500).json({ error: 'Failed to send envelope' });
  }
});

/**
 * GET /api/documenso/envelopes/:id/status
 * Get envelope status
 */
router.get('/envelopes/:id/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // FASE 1.2 CORREÇÃO: authorization via banco (supervive a restart)
    if (!(await authorizeEnvelope(id, req.user))) {
      return denyAccess(req.user, res);
    }

    const status = await envelopeService.getEnvelopeStatus(id);

    res.json({ status });
  } catch (err) {
    logger.error('documenso' as LogService, 'envelope-service', 'get-envelope-status', 'Get envelope status failed', {
      err,
      envelopeId: req.params.id,
    });

    if (err instanceof DocumensoError) {
      return res.status(err.statusCode).json({ error: err.message });
    }

    res.status(500).json({ error: 'Failed to get envelope status' });
  }
});

/**
 * GET /api/documenso/envelopes/:id
 * Get full envelope details
 */
router.get('/envelopes/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // FASE 1.2 CORREÇÃO: authorization via banco (supervive a restart)
    if (!(await authorizeEnvelope(id, req.user))) {
      return denyAccess(req.user, res);
    }

    const envelope = await envelopeService.getEnvelope(id);

    res.json(envelope);
  } catch (err) {
    logger.error('documenso' as LogService, 'envelope-service', 'get-envelope', 'Get envelope failed', {
      err,
      envelopeId: req.params.id,
    });

    if (err instanceof DocumensoError) {
      return res.status(err.statusCode).json({ error: err.message });
    }

    res.status(500).json({ error: 'Failed to get envelope' });
  }
});

/**
 * GET /api/documenso/envelopes/:id/signing-url/:recipientId
 * Get signing URL for a specific recipient
 */
router.get(
  '/envelopes/:id/signing-url/:recipientId',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { id, recipientId } = req.params;

      // FASE 1.2 CORREÇÃO: authorization via banco (supervive a restart)
      if (!(await authorizeEnvelope(id, req.user))) {
        return denyAccess(req.user, res);
      }

      const signingUrl = await envelopeService.getSigningUrl(id, recipientId);

      res.json({ signingUrl, recipientId });
    } catch (err) {
    logger.error('documenso' as LogService, 'envelope-service', 'get-signing-url', 'Get signing URL failed', {
      err,
      envelopeId: req.params.id,
    });

      if (err instanceof DocumensoError) {
        return res.status(err.statusCode).json({ error: err.message });
      }

      res.status(500).json({ error: 'Failed to get signing URL' });
    }
  }
);

/**
 * GET /api/documenso/envelopes/:id/download
 * Download completed PDF
 */
router.get('/envelopes/:id/download', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // FASE 1.2 CORREÇÃO: authorization via banco (supervive a restart)
    if (!(await authorizeEnvelope(id, req.user))) {
      return denyAccess(req.user, res);
    }

    // Check if envelope is completed
    const status = await envelopeService.getEnvelopeStatus(id);
    if (status !== 'COMPLETED') {
      return res.status(400).json({
        error: 'Envelope not completed',
        status,
      });
    }

    const pdfBuffer = await envelopeService.downloadCompleted(id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="envelope-${id}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    logger.error('documenso' as LogService, 'envelope-service', 'download-envelope', 'Download envelope failed', {
      err,
      envelopeId: req.params.id,
    });

    if (err instanceof DocumensoError) {
      return res.status(err.statusCode).json({ error: err.message });
    }

    res.status(500).json({ error: 'Failed to download envelope' });
  }
});

/**
 * POST /api/documenso/embedding-token
 * Create embedding token for iframe signing
 */
router.post('/embedding-token', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { envelopeId, recipientId, redirectUrl } = req.body;

    if (!envelopeId || !recipientId) {
      return res.status(400).json({ error: 'envelopeId and recipientId are required' });
    }

    // FASE 1.2 CORREÇÃO: authorization via banco (supervive a restart)
    if (!(await authorizeEnvelope(envelopeId, req.user))) {
      return denyAccess(req.user, res);
    }

    const token = await envelopeService.createEmbeddingToken(envelopeId, recipientId, redirectUrl);

    res.json({ token });
  } catch (err) {
    logger.error('documenso' as LogService, 'envelope-service', 'create-embedding-token', 'Create embedding token failed', {
      err,
      body: req.body,
    });

    if (err instanceof DocumensoError) {
      return res.status(err.statusCode).json({ error: err.message });
    }

    res.status(500).json({ error: 'Failed to create embedding token' });
  }
});

/**
 * POST /api/documenso/webhook
 * Webhook endpoint for Documenso events
 * Uses raw body parser for HMAC verification
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  (req: Request, res: Response, next: NextFunction) => {
    // Guard middleware ensures webhookHandler is initialized here
    return documensoWebhookMiddleware(webhookHandler!)(req, res, next);
  }
);

/**
 * GET /api/documenso/polling/status
 * Get polling job status (admin only)
 */
router.get('/polling/status', authenticateToken, async (req: Request, res: Response) => {
  // Check admin role
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const status = pollingJob.getStatus();
  res.json(status);
});

/**
 * POST /api/documenso/polling/trigger
 * Manually trigger polling for a specific envelope (admin only)
 */
router.post('/polling/trigger', authenticateToken, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { envelopeId } = req.body;
  if (!envelopeId) {
    return res.status(400).json({ error: 'envelopeId is required' });
  }

  const envelope = await pollingJob.pollSpecificEnvelope(envelopeId);

  if (!envelope) {
    return res.status(404).json({ error: 'Envelope not found' });
  }

  res.json({
    success: true,
    envelope: {
      id: envelope.id,
      status: envelope.status,
    },
  });
});

/**
 * POST /api/documenso/polling/start
 * Start polling job (admin only)
 */
router.post('/polling/start', authenticateToken, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  pollingJob.start();
  res.json({ success: true, message: 'Polling job started' });
});

/**
 * POST /api/documenso/polling/stop
 * Stop polling job (admin only)
 */
router.post('/polling/stop', authenticateToken, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  pollingJob.stop();
  res.json({ success: true, message: 'Polling job stopped' });
});

export default router;