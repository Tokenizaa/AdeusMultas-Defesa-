import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom, mockAnalyze, mockGenerate } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockAnalyze: vi.fn(),
  mockGenerate: vi.fn(),
}));

vi.mock('../supabase', () => ({
  createSupabaseAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock('../middleware', () => ({
  authenticateToken: async (c: any, next: () => Promise<void>) => {
    c.set('user', {
      id: '00000000-0000-4000-8000-000000000001',
      email: 'certification@example.invalid',
      role: 'citizen',
    });
    await next();
  },
  requireAdmin: async (_c: unknown, next: () => Promise<void>) => next(),
}));

vi.mock('../rag-adapter', () => ({
  analyzeInfractionCompat: mockAnalyze,
  generateDefenseDraftCompat: mockGenerate,
}));

import { casesRoutes } from './cases';

describe('greenfield certification: document generation payment gate', () => {
  const caseId = '00000000-0000-4000-8000-000000000041';
  let row: Record<string, any>;
  let query: Record<string, any>;

  beforeEach(() => {
    row = {
      id: caseId,
      user_id: '00000000-0000-4000-8000-000000000001',
      is_anonymous: false,
      is_paid: false,
      service_type: 'defesa_previa',
      ait_number: 'AIT-CERT-GREENFIELD-041',
      infraction_code: '745-50',
    };
    query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({ data: row, error: null })),
      update: vi.fn(() => query),
      single: vi.fn(async () => ({ data: row, error: null })),
    };
    mockFrom.mockReset().mockReturnValue(query);
    mockAnalyze.mockReset();
    mockGenerate.mockReset();
  });

  it('blocks an unpaid case before analysis, document generation, or persistence writes', async () => {
    const response = await casesRoutes.request(
      `/cases/${caseId}/generate-defense`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer synthetic-certification-token',
        },
        body: JSON.stringify({
          applicantData: {
            name: 'Pessoa Sintética',
            cpf: '52998224725',
            cnh: '12345678901',
            address: 'Rua Sintética, 100',
            cityState: 'São Paulo/SP',
          },
        }),
      },
      {} as any,
    );

    expect(response.status).toBe(402);
    expect(await response.text()).toContain('Pagamento ainda não foi confirmado');
    expect(mockAnalyze).not.toHaveBeenCalled();
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(query.update).not.toHaveBeenCalled();
  });
});
