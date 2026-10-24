import { Hono } from 'hono';
import type { Env } from '../supabase';
import { authenticateToken, requireAdmin } from '../middleware';
import { adapterError, adapterOk } from '../../src/shared/api/adapters';
import { WeeklyMonitorScheduler } from '../../src/core/knowledge/scheduler/weekly-monitor-scheduler';
import { WeeklyMonitorService } from '../../src/core/knowledge/scheduler/weekly-monitor-service';
import { ReviewQueueService } from '../../src/core/knowledge/validation/review-queue-service';
import { NotificationAlertService } from '../../src/core/knowledge/scheduler/notification-alert-service';

const routes = new Hono<{ Bindings: Env }>();

routes.post(
  '/monitor/run',
  authenticateToken,
  requireAdmin,
  async (c) => {
    try {
      const body = (await c.req.json().catch(() => ({}))) as { timeoutMs?: number };
      const timeoutMs = Math.min(Math.max(Number(body.timeoutMs) || 5000, 1000), 30000);
      const result = await WeeklyMonitorScheduler.runCycle(undefined, timeoutMs);
      return adapterOk(c, result);
    } catch (error) {
      return adapterError(c, 'UPSTREAM_ERROR', error instanceof Error ? error.message : 'Failed to run monitoring cycle', 500);
    }
  }
);

routes.get('/monitor/history', authenticateToken, requireAdmin, async (c) => {
  try {
    const history = WeeklyMonitorScheduler.getCycleHistory();
    return adapterOk(c, history);
  } catch (error) {
    return adapterError(c, 'UPSTREAM_ERROR', error instanceof Error ? error.message : 'Failed to fetch monitor history', 500);
  }
});

routes.get('/monitor/latest-report', authenticateToken, requireAdmin, async (c) => {
  try {
    const report = WeeklyMonitorScheduler.getLatestReport();
    return adapterOk(c, { reportMarkdown: report });
  } catch (error) {
    return adapterError(c, 'UPSTREAM_ERROR', error instanceof Error ? error.message : 'Failed to fetch latest report', 500);
  }
});

routes.get('/monitor/review-queue', authenticateToken, requireAdmin, async (c) => {
  try {
    const items = ReviewQueueService.getAll();
    const pending = ReviewQueueService.getPending();
    return adapterOk(c, { items, pendingCount: pending.length });
  } catch (error) {
    return adapterError(c, 'UPSTREAM_ERROR', error instanceof Error ? error.message : 'Failed to fetch review queue', 500);
  }
});

routes.post(
  '/monitor/review-queue/:id/approve',
  authenticateToken,
  requireAdmin,
  async (c) => {
    try {
      const body = await c.req.json<{ reviewer?: string; notes?: string }>();
      const success = ReviewQueueService.approve(c.req.param('id'), body.reviewer, body.notes);
      if (!success) {
        return adapterError(c, 'NOT_FOUND', 'Review item not found', 404);
      }
      return adapterOk(c, { success: true, message: 'Item approved and applied to active registry.' });
    } catch (error) {
      return adapterError(c, 'UPSTREAM_ERROR', error instanceof Error ? error.message : 'Failed to approve review item', 500);
    }
  }
);

routes.post(
  '/monitor/review-queue/:id/reject',
  authenticateToken,
  requireAdmin,
  async (c) => {
    try {
      const body = await c.req.json<{ reviewer?: string; reason?: string }>();
      const success = ReviewQueueService.reject(c.req.param('id'), body.reviewer, body.reason);
      if (!success) {
        return adapterError(c, 'NOT_FOUND', 'Review item not found', 404);
      }
      return adapterOk(c, { success: true, message: 'Item rejected.' });
    } catch (error) {
      return adapterError(c, 'UPSTREAM_ERROR', error instanceof Error ? error.message : 'Failed to reject review item', 500);
    }
  }
);

routes.post(
  '/monitor/review-queue/:id/adjust',
  authenticateToken,
  requireAdmin,
  async (c) => {
    try {
      const body = await c.req.json<{ adjustedData?: Record<string, unknown>; reviewer?: string; notes?: string }>();
      const success = ReviewQueueService.adjustAndApprove(c.req.param('id'), body.adjustedData, body.reviewer, body.notes);
      if (!success) {
        return adapterError(c, 'NOT_FOUND', 'Review item not found', 404);
      }
      return adapterOk(c, { success: true, message: 'Item adjusted and approved.' });
    } catch (error) {
      return adapterError(c, 'UPSTREAM_ERROR', error instanceof Error ? error.message : 'Failed to adjust review item', 500);
    }
  }
);

routes.post(
  '/monitor/review-queue/:id/false-positive',
  authenticateToken,
  requireAdmin,
  async (c) => {
    try {
      const body = await c.req.json<{ notes?: string }>();
      const success = ReviewQueueService.markFalsePositive(c.req.param('id'), body.notes);
      if (!success) {
        return adapterError(c, 'NOT_FOUND', 'Review item not found', 404);
      }
      return adapterOk(c, { success: true, message: 'Item marked as false positive.' });
    } catch (error) {
      return adapterError(c, 'UPSTREAM_ERROR', error instanceof Error ? error.message : 'Failed to mark false positive', 500);
    }
  }
);

routes.get('/monitor/alerts', authenticateToken, requireAdmin, async (c) => {
  try {
    const alerts = NotificationAlertService.getAlertsHistory();
    return adapterOk(c, alerts);
  } catch (error) {
    return adapterError(c, 'UPSTREAM_ERROR', error instanceof Error ? error.message : 'Failed to fetch alerts', 500);
  }
});

export const monitorRoutes = routes;