import { describe, it, expect } from 'vitest';
import { CanonicalMapper } from './canonical-mapper';

describe('CanonicalMapper autuadorBody normalization', () => {
  it('should prioritize autuadorBody over orgaoAutuador', () => {
    const domain = {
      id: 'case_123',
      infraction: {
        aitNumber: 'AIT-123',
        autuadorBody: 'DETRAN-SP',
        orgaoAutuador: 'DETRAN-RJ', // Legacy/OCR value
      },
      vehicle: { plate: 'ABC-1234', brandModel: 'Civic' },
      status: 'novo' as const,
      currentStage: 1,
      serviceType: 'recurso_jari' as const,
      timeline: [],
      isAnonymous: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const row = CanonicalMapper.domainToRow(domain);
    expect(row.autuador_body).toBe('DETRAN-SP');
    expect(row.autuador_body).not.toBe('DETRAN-RJ');
  });

  it('should fall back to orgaoAutuador when autuadorBody is missing', () => {
    const domain = {
      id: 'case_123',
      infraction: {
        aitNumber: 'AIT-123',
        autuadorBody: undefined,
        orgaoAutuador: 'DETRAN-RJ', // Only legacy value available
      },
      vehicle: { plate: 'ABC-1234', brandModel: 'Civic' },
      status: 'novo' as const,
      currentStage: 1,
      serviceType: 'recurso_jari' as const,
      timeline: [],
      isAnonymous: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const row = CanonicalMapper.domainToRow(domain);
    expect(row.autuador_body).toBe('DETRAN-RJ');
  });

  it('should not use hardcoded DETRAN fallback', () => {
    const domain = {
      id: 'case_123',
      infraction: {
        aitNumber: 'AIT-123',
        autuadorBody: undefined,
        orgaoAutuador: undefined,
      },
      vehicle: { plate: 'ABC-1234', brandModel: 'Civic' },
      status: 'novo' as const,
      currentStage: 1,
      serviceType: 'recurso_jari' as const,
      timeline: [],
      isAnonymous: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const row = CanonicalMapper.domainToRow(domain);
    // Should be undefined, not 'DETRAN'
    expect(row.autuador_body).toBeUndefined();
    expect(row.autuador_body).not.toBe('DETRAN');
  });

  it('should correctly map rowToDomain preserving autuadorBody', () => {
    const row = {
      id: 'case_123',
      title: 'Teste',
      client_name: 'João',
      client_email: 'joao@test.com',
      client_phone: '11999999999',
      client_cpf: '123.456.789-00',
      user_id: 'user_123',
      status: 'novo',
      current_stage: 1,
      service_type: 'recurso_jari',
      vehicle_plate: 'ABC-1234',
      vehicle_brand_model: 'Civic',
      vehicle_renavam: '12345678900',
      vehicle_chassis: null,
      vehicle_year: '2020',
      vehicle_color: 'Preto',
      ait_number: 'AIT-123',
      infraction_code: '745-50',
      infraction_description: 'Excesso velocidade',
      ctb_article: 'Art. 218',
      severity: 'media',
      points: 4,
      fine_amount: 130.16,
      autuador_body: 'DETRAN-SP',
      date_time: '2026-01-15T10:30:00',
      location: 'Av. Paulista',
      speed_limit: 60,
      measured_speed: 78,
      considered_speed: 71,
      radar_equipment_id: 'RADAR-001',
      inmetro_aferition_date: '2025-01-01',
      notification_expedition_date: '2026-01-20',
      defense_deadline: '2026-02-20',
      formal_flaws_json: '[]',
      analysis_json: null,
      defense_draft_json: null,
      protocol_info_json: null,
      commercial_offer_id: null,
      timeline_json: '[]',
      is_anonymous: false,
      claim_token: null,
      is_paid: false,
      paid_at: null,
      created_at: '2026-01-15T10:30:00',
      updated_at: '2026-01-15T10:30:00',
    };

    const domain = CanonicalMapper.rowToDomain(row);
    expect(domain.infraction.autuadorBody).toBe('DETRAN-SP');
  });
});