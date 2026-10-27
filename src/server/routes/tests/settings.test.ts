import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';

const { mockSettingsService, mockAuditLogs } = vi.hoisted(() => ({
  mockSettingsService: {
    getSettings: vi.fn(),
    getAuditHistory: vi.fn(),
    updateSetting: vi.fn(),
    resetToDefault: vi.fn(),
  },
  mockAuditLogs: [] as any[],
}));

vi.mock('../../services/settings-service', () => ({ settingsService: mockSettingsService }));
vi.mock('../../stores', () => ({ auditLogs: mockAuditLogs }));
vi.mock('../../observability/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../../observability/health-service', () => ({
  healthService: { testIntegration: vi.fn() },
}));
vi.mock('../../middleware/auth-middleware', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: 'admin-123', email: 'admin@example.com', role: 'admin' };
    next();
  },
  requireAdmin: (_req: any, _res: any, next: any) => next(),
}));

import settingsRoutes from '../settings';

describe('admin settings audit identity', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/settings', settingsRoutes);
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server did not bind a TCP port');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuditLogs.length = 0;
    mockSettingsService.getSettings.mockResolvedValue([]);
    mockSettingsService.getAuditHistory.mockResolvedValue([]);
    mockSettingsService.updateSetting.mockResolvedValue({ success: true, message: 'saved' });
    mockSettingsService.resetToDefault.mockResolvedValue({ success: true, message: 'reset' });
  });

  it('ignores client-supplied updatedBy on setting updates', async () => {
    const response = await fetch(`${baseUrl}/api/settings`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: 'AI_ENABLE_FALLBACK', value: false, updatedBy: 'spoofed@example.com' }),
    });

    expect(response.status).toBe(200);
    expect(mockSettingsService.updateSetting).toHaveBeenCalledWith({
      key: 'AI_ENABLE_FALLBACK',
      value: false,
      updatedBy: 'admin@example.com',
    });
    expect(mockAuditLogs[0].actor).toBe('admin@example.com');
    expect(mockAuditLogs[0].ipHash).toBeUndefined();
  });

  it('ignores client-supplied updatedBy on setting resets', async () => {
    const response = await fetch(`${baseUrl}/api/settings/reset-default`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: 'AI_ENABLE_FALLBACK', updatedBy: 'spoofed@example.com' }),
    });

    expect(response.status).toBe(200);
    expect(mockSettingsService.resetToDefault).toHaveBeenCalledWith('AI_ENABLE_FALLBACK', 'admin@example.com');
  });
});
