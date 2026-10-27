import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { once } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getHealth: vi.fn(),
  getOverview: vi.fn(),
  getRecentTraces: vi.fn(),
  getAlerts: vi.fn(),
}));

vi.mock('../observability/health-service', () => ({
  healthService: { getHealth: mocks.getHealth },
}));
vi.mock('../observability/metrics-service', () => ({
  metricsService: { getOverview: mocks.getOverview },
}));
vi.mock('../observability/ai-provider-manager', () => ({
  aiProviderManager: { getRecentTraces: mocks.getRecentTraces },
}));
vi.mock('../observability/alerts-service', () => ({
  alertsService: { getAlerts: mocks.getAlerts, acknowledge: vi.fn() },
}));
vi.mock('../middleware/auth-middleware', () => ({
  authenticateToken: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAdmin: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import monitoringRoutes from './monitoring';

describe('admin monitoring health endpoint', () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((error) => error ? reject(error) : resolve());
      });
      server = undefined;
    }
    vi.clearAllMocks();
  });

  it('returns the detailed health report at /api/monitoring/health', async () => {
    const report = {
      status: 'degraded',
      services: [{ id: 'supabase_db', status: 'HEALTHY' }],
      checkedAt: '2026-10-26T00:00:00.000Z',
    };
    mocks.getHealth.mockResolvedValue(report);

    const app = express();
    app.use('/api/monitoring', monitoringRoutes);
    server = app.listen(0);
    await once(server, 'listening');

    const address = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/api/monitoring/health`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(report);
    expect(mocks.getHealth).toHaveBeenCalledWith(false);
  });
});
