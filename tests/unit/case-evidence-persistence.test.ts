import { describe, expect, it } from 'vitest';
import type { CaseRow } from '../../src/types';
import { CaseRepository } from '../../src/server/db/case-repository';

describe('Case → Evidence persistence', () => {
  it('includes explicit evidenceFlags in the Supabase cases payload', () => {
    const repository = new CaseRepository();
    const row: CaseRow = {
      id: 'case_evidence_persistence',
      title: 'Evidence persistence',
      client_name: 'Teste',
      user_id: '11111111-1111-4111-8111-111111111111',
      status: 'novo',
      current_stage: 1,
      service_type: 'recurso_jari',
      vehicle_plate: 'ABC1234',
      vehicle_brand_model: 'Fiat Uno',
      ait_number: 'AIT-1',
      infraction_code: '745-50',
      infraction_description: 'Teste',
      ctb_article: 'Art. 218',
      severity: 'media',
      points: 4,
      fine_amount: 130.16,
      autuador_body: 'DETRAN-SP',
      date_time: '2026-09-06T10:00:00.000Z',
      location: 'São Paulo',
      evidence_json: JSON.stringify({
        foto_ait: true,
        placa_visivel: false,
      }),
      is_anonymous: false,
      is_paid: false,
      created_at: '2026-09-06T10:00:00.000Z',
      updated_at: '2026-09-06T10:00:00.000Z',
    };

    const payload = (repository as any).toPayload(row);

    expect(payload.evidence_json).toEqual({
      foto_ait: true,
      placa_visivel: false,
    });
  });
});
