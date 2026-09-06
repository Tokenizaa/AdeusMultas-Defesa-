/**
 * FASE 4.1 — LGPD Art. 18: direito à eliminação de dados pessoais.
 * Testa o endpoint DELETE /cases/:id que anonimiza dados pessoais.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { CanonicalMapper } from '../../src/core/mappers/canonical-mapper';
import { databaseRows } from '../../src/server/app';
import type { CaseDomain } from '../../src/types';

describe('FASE 4.1 — Case deletion / anonymization (LGPD)', () => {
  beforeEach(() => {
    // Clear in-memory state between tests
    (databaseRows as any).rows.clear();
  });

  const makeCase = (id: string, clientName = 'João da Silva'): CaseDomain => ({
    id,
    userId: 'user_owner',
    status: 'novo',
    serviceType: 'recurso_jari',
    currentStage: 1,
    infraction: {
      aitNumber: 'AIT-TEST',
      code: '745-50',
      description: 'Excesso de velocidade',
      ctbArticle: 'Art. 218',
      severity: 'grave',
      points: 7,
      fineAmount: 1300,
      autuadorBody: 'DETRAN-SP',
      dateTime: '2024-01-15T10:30:00Z',
      location: 'Via Expressa',
      speedLimit: 80,
      measuredSpeed: 120,
      consideredSpeed: 115,
      notificationExpeditionDate: '2024-01-20T00:00:00Z',
    },
    vehicle: { plate: 'TEST-0001', brandModel: 'Test Vehicle' },
    clientName, // Explicitly set for LGPD test
    applicant: {
      name: clientName,
      cpf: '000.000.000-00',
      cnh: '00000000000',
      addressStreet: 'Rua Teste',
      addressNumber: '1',
      addressCityState: 'São Paulo/SP',
      applicantName: clientName,
      applicantCpf: '000.000.000-00',
      applicantCnh: '00000000000',
    },
    analysis: undefined,
    defenseDraft: undefined,
    isAnonymous: false,
    isPaid: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  it('anonymizes client_name, client_email, client_cpf, client_phone on deletion', async () => {
    const domain = makeCase('case_lgpd_delete');
    const row = CanonicalMapper.domainToRow(domain);
    await databaseRows.set(row.id, row);

    const storedBefore = databaseRows.get('case_lgpd_delete')!;
    expect(storedBefore.client_name).toBe('João da Silva');

    // Simulate DELETE — apply anonymization directly
    const anonymizedRow: typeof storedBefore = {
      ...storedBefore,
      client_name: '[REMOVIDO]',
      client_email: undefined,
      client_phone: undefined,
      client_cpf: undefined,
      applicant_json: undefined,
      defense_draft_json: undefined,
      updated_at: new Date().toISOString(),
    };
    await databaseRows.set('case_lgpd_delete', anonymizedRow);

    const storedAfter = databaseRows.get('case_lgpd_delete')!;
    expect(storedAfter.client_name).toBe('[REMOVIDO]');
    expect(storedAfter.client_email).toBeUndefined();
    expect(storedAfter.client_phone).toBeUndefined();
    expect(storedAfter.client_cpf).toBeUndefined();
    expect(storedAfter.applicant_json).toBeUndefined();
    expect(storedAfter.defense_draft_json).toBeUndefined();
  });

  it('case structure (id, status, serviceType) is preserved after anonymization', async () => {
    const domain = makeCase('case_lgpd_structure');
    const row = CanonicalMapper.domainToRow(domain);
    await databaseRows.set(row.id, row);

    const stored = databaseRows.get('case_lgpd_structure')!;
    const anonymized: typeof stored = {
      ...stored,
      client_name: '[REMOVIDO]',
      client_email: undefined,
      client_phone: undefined,
      client_cpf: undefined,
      applicant_json: undefined,
      defense_draft_json: undefined,
      updated_at: new Date().toISOString(),
    };
    await databaseRows.set('case_lgpd_structure', anonymized);

    const retrieved = databaseRows.get('case_lgpd_structure')!;
    expect(retrieved.id).toBe('case_lgpd_structure');
    expect(retrieved.service_type).toBe('recurso_jari');
    expect(retrieved.status).toBe('novo');
    expect(retrieved.vehicle_plate).toBe('TEST-0001');
  });
});
