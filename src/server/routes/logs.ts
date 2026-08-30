import { Router } from 'express';
import { logger } from '../observability/logger';
import { authenticateToken, requireAdmin } from '../middleware/auth-middleware';

const router = Router();

// Public health check - no auth required
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'logs', timestamp: new Date().toISOString() });
});

// Protected admin routes
router.use(authenticateToken, requireAdmin);

// Central Structured Log Explorer Endpoints
router.get(['/', '/logs'], (req, res) => {
  const {
    level,
    service,
    provider,
    status,
    correlationId,
    caseId,
    requestId,
    search,
    startDate,
    endDate,
    limit,
    offset,
  } = req.query as any;

  const result = logger.query({
    level,
    service,
    provider,
    status,
    correlationId,
    caseId,
    requestId,
    search,
    startDate,
    endDate,
    limit: limit ? Number(limit) : 50,
    offset: offset ? Number(offset) : 0,
  });

  res.json(result);
});

router.get(['/trace/:correlationId', '/logs/trace/:correlationId'], (req, res) => {
  const { correlationId } = req.params;
  const traceLogs = logger.getTrace(correlationId);
  res.json({
    correlationId,
    count: traceLogs.length,
    logs: traceLogs,
  });
});

router.post(['/clear', '/logs/clear'], (req, res) => {
  logger.clear();
  res.json({ success: true, message: 'Logs operacionais limpos com sucesso.' });
});

export default router;