import { Router } from 'express';
import { auditLogs } from '../app';

const router = Router();

// Audit Logs & Compliance Endpoints — full paths for /api mount
router.get('/audit-logs', (req, res) => {
  res.json(auditLogs);
});

// Alias for backward compatibility
router.get('/audit/logs', (req, res) => {
  res.json({ logs: auditLogs.slice(0, 50) });
});

export default router;