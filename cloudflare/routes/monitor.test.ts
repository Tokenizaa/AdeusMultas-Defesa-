import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const { mockCycleHistory, mockAlertsHistory } = vi.hoisted(() => ({
  mockCycleHistory: vi.fn(),
  mockAlertsHistory: vi.fn(),
}));

vi.mock('../middleware', () => ({
  authenticateToken: async (_c: any, next: any) => next(),
  requireAdmin: async (_c: any, next: any) => next(),
}));
vi.mock('../../src/core/knowledge/scheduler/weekly-monitor-scheduler', () => ({
  WeeklyMonitorScheduler: {
    runCycle: vi.fn(),
    getCycleHistory: mockCycleHistory,
    getLatestReport: vi.fn(),
  },
}));
vi.mock('../../src/core/knowledge/scheduler/weekly-monitor-service', () => ({
  WeeklyMonitorService: {},
}));
vi.mock('../../src/core/knowledge/validation/review-queue-service', () => ({
  ReviewQueueService: { getAll: vi.fn(() => []), getPending: vi.fn(() => []) },
}));
vi.mock('../../src/core/knowledge/scheduler/notification-alert-service', () => ({
  NotificationAlertService: { getAlertsHistory: mockAlertsHistory },
}));

import { monitorRoutes } from './monitor';

function app() {
  const instance = new Hono();
  instance.route('/api', monitorRoutes);
  return instance;
}

describe('Cloudflare monitor API contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns alert history using the shared API envelope', async () => {
    const alerts = [{
      id: 'ALT_1',
      timestamp: '2026-10-26T12:00:00.000Z',
      level: 'WARNING',
      title: 'Fonte normativa alterada',
      body: 'Revisão humana necessária',
      sourceUrl: 'https://example.gov.br/norma',
      requiresImmediateAction: false,
    }];
    mockAlertsHistory.mockReturnValue(alerts);

    const response = await app().request('/api/monitor/alerts');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, data: alerts });
  });

  it('returns scheduler history without inventing uptime or service metrics', async () => {
    const cycles = [{
      cycleId: 'CYC_1',
      startedAt: '2026-10-26T11:00:00.000Z',
      completedAt: '2026-10-26T11:01:00.000Z',
      totalSources: 12,
      successfulFetches: 10,
      failedFetches: 2,
      changesDetected: 1,
      sentToReviewQueue: 1,
    }];
    mockCycleHistory.mockReturnValue(cycles);

    const response = await app().request('/api/monitor/history');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, data: cycles });
  });
});
