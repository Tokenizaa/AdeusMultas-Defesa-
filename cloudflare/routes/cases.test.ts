import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom, mockAnalyze } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockAnalyze: vi.fn(),
}));

vi.mock('../supabase', () => ({
  createSupabaseAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock('../middleware', () => ({
  authenticateToken: async (_c: unknown, next: () => Promise<void>) => next(),
  requireAdmin: async (_c: unknown, next: () => Promise<void>) => next(),
}));

vi.mock('../rag-adapter', () => ({
  analyzeInfractionCompat: mockAnalyze,
  generateDefenseDraftCompat: vi.fn(),
}));

import { casesRoutes } from './cases';

const intake = {
  title: 'Attacker controlled title',
  isAnonymous: false,
  userId: '00000000-0000-4000-8000-000000000001',
  claimToken: 'attacker-token',
  userNome: 'Pessoa Teste',
  userPhone: '11999999999',
  infraction: {
    aitNumber: 'E2E-ANON-001',
    infractionCode: '745-50',
    description: 'Excesso de velocidade',
    ctbArticle: 'Art. 218 do CTB',
    location: 'Av. Paulista, São Paulo/SP',
  },
  vehicle: { plate: 'ABC1234', brandModel: 'Veículo de teste' },
};

describe('anonymous case intake', () => {
  let insertedRow: any;
  let query: any;

  beforeEach(() => {
    insertedRow = null;
    mockAnalyze.mockReset().mockResolvedValue({ recommendedArguments: [] });
    query = {
      insert: vi.fn((row: unknown) => { insertedRow = row; return query; }),
      select: vi.fn(() => query),
      single: vi.fn(async () => ({ data: insertedRow, error: null })),
    };
    mockFrom.mockReset().mockReturnValue(query);
  });

  it('creates a rate-limited anonymous case with a server-generated claim token', async () => {
    const response = await casesRoutes.request('/cases/anonymous', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.10' },
      body: JSON.stringify(intake),
    }, {
      ANONYMOUS_CASE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) },
    } as any);

    expect(response.status).toBe(201);
    const result = await response.json() as any;
    expect(result.userId).toBeFalsy();
    expect(result.isAnonymous).toBe(true);
    expect(result.claimToken).toMatch(/^[a-f0-9]{64}$/);
    expect(result.claimToken).not.toBe(intake.claimToken);
    expect(insertedRow.user_id).toBeNull();
    expect(insertedRow.is_anonymous).toBe(true);
    expect(insertedRow.claim_token).toBe(result.claimToken);
    expect(insertedRow.is_paid).toBe(false);
    expect(insertedRow.title).not.toBe(intake.title);
  });

  it('rejects new cases after the Cloudflare rate limit is reached', async () => {
    const response = await casesRoutes.request('/cases/anonymous', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.11' },
      body: JSON.stringify(intake),
    }, {
      ANONYMOUS_CASE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: false }) },
    } as any);

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('60');
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockAnalyze).not.toHaveBeenCalled();
  });

  it('fails closed when the rate-limit binding or client IP is unavailable', async () => {
    const response = await casesRoutes.request('/cases/anonymous', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(intake),
    }, {} as any);

    expect(response.status).toBe(503);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockAnalyze).not.toHaveBeenCalled();
  });
});
