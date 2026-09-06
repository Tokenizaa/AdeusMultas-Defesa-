import { Router } from 'express';
import { auditLogs } from '../app';
import { authenticateToken, requireAdmin } from '../middleware/auth-middleware';

const router = Router();

// Audit logs are privileged compliance data and must never be publicly exposed.
router.use(authenticateToken, requireAdmin);

// Audit Logs & Compliance Endpoints — full paths for /api mount
router.get('/audit-logs', (_req, res) => {
  res.json(auditLogs);
});

// Alias for backward compatibility
router.get('/audit/logs', (_req, res) => {
  res.json({ logs: auditLogs.slice(0, 50) });
});

export default router;
