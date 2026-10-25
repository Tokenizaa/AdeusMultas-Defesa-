import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom, mockAnalyze } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockAnalyze: vi.fn(),
}));

vi.mock('../supabase', () => ({
  createSupabaseAdminClient: vi.fn(() => ({ from: mockFrom })),
  createSupabaseUserClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock('../middleware', () => ({
  authenticateToken: async (c: any, next: () => Promise<void>) => { c.set('user', { id: '00000000-0000-4000-8000-000000000001', email: 'test@example.com', role: 'citizen' }); await next(); },
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
      eq: vi.fn(() => query),
      is: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({ data: insertedRow, error: null })),
      update: vi.fn((row: unknown) => { insertedRow = { ...insertedRow, ...(row as object) }; return query; }),
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

  it('accepts the actual free-onboarding payload without inventing vehicle make/model', async () => {
    const { vehicle: _vehicle, ...formPayload } = intake;
    const response = await casesRoutes.request('/cases/anonymous', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.12' },
      body: JSON.stringify({ ...formPayload, vehicle: { plate: 'ABC1234' } }),
    }, {
      ANONYMOUS_CASE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) },
    } as any);

    expect(response.status).toBe(201);
    expect(insertedRow.vehicle_brand_model).toBe('Não informado');
  });

  it.each([
    'defesa_previa',
    'recurso_jari',
    'recurso_cetran',
    'suspensao_cnh',
    'cassacao_cnh',
    'indicacao_condutor',
    'conversao_advertencia',
  ])('preserves supported service type %s in the created case', async (serviceType) => {
    const response = await casesRoutes.request('/cases/anonymous', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.13' },
      body: JSON.stringify({ ...intake, serviceType }),
    }, {
      ANONYMOUS_CASE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) },
    } as any);

    expect(response.status).toBe(201);
    expect(insertedRow.service_type).toBe(serviceType);
    expect(insertedRow.is_paid).toBe(false);
  });

  it('rejects an unknown service type before analysis or persistence', async () => {
    const response = await casesRoutes.request('/cases/anonymous', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.14' },
      body: JSON.stringify({ ...intake, serviceType: 'invented_service' }),
    }, {
      ANONYMOUS_CASE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) },
    } as any);

    expect(response.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockAnalyze).not.toHaveBeenCalled();
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


describe('anonymous case recovery', () => {
  let insertedRow: any;
  let query: any;

  beforeEach(() => {
    insertedRow = {
      id: '00000000-0000-4000-8000-000000000099',
      is_anonymous: true,
      user_id: null,
      claim_token: 'a'.repeat(64),
      ait_number: 'E2E-RECOVERY-001',
    };
    query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      is: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({ data: insertedRow, error: null })),
    };
    mockFrom.mockReset().mockReturnValue(query);
  });

  it('recovers a case only with the matching server-issued token and never returns the token', async () => {
    const response = await casesRoutes.request(
      '/cases/anonymous/00000000-0000-4000-8000-000000000099/recover',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.20' },
        body: JSON.stringify({ claimToken: 'a'.repeat(64) }),
      },
      { ANONYMOUS_CASE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) } } as any,
    );

    expect(response.status).toBe(200);
    const result = await response.json() as any;
    expect(result.case.id).toBe(insertedRow.id);
    expect(result.case.claimToken).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain(insertedRow.claim_token);
    expect(query.eq).toHaveBeenCalledWith('id', insertedRow.id);
    expect(query.eq).toHaveBeenCalledWith('is_anonymous', true);
    expect(query.is).toHaveBeenCalledWith('user_id', null);
  });

  it('returns the same not-found response for an invalid token', async () => {
    const response = await casesRoutes.request(
      '/cases/anonymous/00000000-0000-4000-8000-000000000099/recover',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.21' },
        body: JSON.stringify({ claimToken: 'b'.repeat(64) }),
      },
      { ANONYMOUS_CASE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) } } as any,
    );

    expect(response.status).toBe(404);
    expect(await response.text()).toContain('Caso não encontrado ou token inválido.');
  });

  it('fails closed when recovery rate limit is reached', async () => {
    const response = await casesRoutes.request(
      '/cases/anonymous/00000000-0000-4000-8000-000000000099/recover',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.22' },
        body: JSON.stringify({ claimToken: 'a'.repeat(64) }),
      },
      { ANONYMOUS_CASE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: false }) } } as any,
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('60');
    expect(mockFrom).not.toHaveBeenCalled();
  });
});


describe('anonymous case claim', () => {
  let row: any;
  let query: any;

  beforeEach(() => {
    row = {
      id: '00000000-0000-4000-8000-000000000098',
      is_anonymous: true,
      user_id: null,
      claim_token: 'c'.repeat(64),
      client_name: 'Condutor',
      service_type: 'defesa_previa',
      vehicle_plate: 'ABC1D23',
      ait_number: 'E2E-CLAIM-001',
      infraction_code: '745-5',
      location: 'Rua de teste, 10',
      is_paid: false,
    };
    query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      is: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({ data: row, error: null })),
      update: vi.fn((changes: unknown) => { row = { ...row, ...(changes as object) }; return query; }),
      single: vi.fn(async () => ({ data: row, error: null })),
    };
    mockFrom.mockReset().mockReturnValue(query);
  });

  it('claims an anonymous case only with the server-issued token', async () => {
    const response = await casesRoutes.request(
      '/cases/00000000-0000-4000-8000-000000000098/claim',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-user' },
        body: JSON.stringify({ claimToken: 'c'.repeat(64) }),
      },
      {} as any,
    );

    expect(response.status).toBe(200);
    expect(row.user_id).toBe('00000000-0000-4000-8000-000000000001');
    expect(row.is_anonymous).toBe(false);
    expect(query.update).toHaveBeenCalledTimes(1);
    expect(query.is).toHaveBeenCalledWith('user_id', null);
    expect(query.eq).toHaveBeenCalledWith('claim_token', 'c'.repeat(64));
  });

  it('rejects an invalid claim token without modifying ownership', async () => {
    const response = await casesRoutes.request(
      '/cases/00000000-0000-4000-8000-000000000098/claim',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-user' },
        body: JSON.stringify({ claimToken: 'wrong-token' }),
      },
      {} as any,
    );

    expect(response.status).toBe(403);
    expect(row.user_id).toBeNull();
    expect(query.update).not.toHaveBeenCalled();
  });
});


describe('applicant qualification', () => {
  let row: any;
  let query: any;

  beforeEach(() => {
    row = {
      id: '00000000-0000-4000-8000-000000000097',
      user_id: '00000000-0000-4000-8000-000000000001',
      is_anonymous: false,
      client_name: 'Condutor',
      client_email: 'test@example.com',
      client_phone: null,
      client_cpf: null,
    };
    query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({ data: row, error: null })),
      update: vi.fn((changes: unknown) => { row = { ...row, ...(changes as object) }; return query; }),
    };
    mockFrom.mockReset().mockReturnValue(query);
  });

  it('persists validated qualification fields without accepting client ownership', async () => {
    const response = await casesRoutes.request(
      '/cases/00000000-0000-4000-8000-000000000097/qualification',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-user' },
        body: JSON.stringify({
          name: 'Pessoa de Teste',
          cpf: '123.456.789-09',
          email: 'pessoa@example.com',
          phone: '11999999999',
          cnh: '12345678900',
          rg: '1234567',
          cnhCategory: 'B',
          addressStreet: 'Rua de Teste',
          addressNumber: '10',
          addressComplement: 'Apto 2',
          cityState: 'São Paulo/SP',
          userId: 'attacker-controlled-id',
        }),
      },
      {} as any,
    );

    expect(response.status).toBe(200);
    expect(row.user_id).toBe('00000000-0000-4000-8000-000000000001');
    expect(row.client_cpf).toBe('12345678909');
    expect(JSON.parse(row.applicant_json).applicantName).toBe('Pessoa de Teste');
    expect(JSON.parse(row.applicant_json).addressCityState).toBe('São Paulo/SP');
    const result = await response.json() as any;
    expect(result.applicant.applicantCpf).not.toContain('12345678909');
  });

  it('rejects incomplete qualification without writing personal data', async () => {
    const response = await casesRoutes.request(
      '/cases/00000000-0000-4000-8000-000000000097/qualification',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-user' },
        body: JSON.stringify({ name: 'Pessoa de Teste', cpf: '123' }),
      },
      {} as any,
    );

    expect(response.status).toBe(400);
    expect(query.update).not.toHaveBeenCalled();
  });
});
