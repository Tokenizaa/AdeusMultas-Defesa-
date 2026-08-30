/**
 * @file watermark-trace.test.ts
 * End-to-End Pipeline Integrity & Watermark Trace Test
 * Verifies that all user inputs (qualifications, vehicle, infraction, facts)
 * flow completely without loss, replacement, or hallucination into the final legal document.
 */

import { describe, it, expect } from 'vitest';
import { RagPipeline } from '../../src/core/rag/rag-pipeline';
import { DocumentAssemblyEngine } from '../../src/core/documents/document-assembly-engine';
import { CanonicalMapper } from '../../src/core/mappers/canonical-mapper';
import { CaseDomain, InfractionData } from '../../src/types';

describe('Watermark Trace Test — Full Pipeline Integrity', () => {
  const WATERMARK_DATA = {
    name: 'NETTO TESTE 84721',
    cpf: '123.456.789-00',
    rg: '98765432-1 SSP/SP',
    cnh: '01234567890',
    category: 'AB',
    address: 'AVENIDA TESTE 123, APTO 42',
    cityState: 'São Paulo - SP',
    vehiclePlate: 'ABC8X21',
    vehicleModel: 'HONDA CIVIC TOURING 2022',
    aitNumber: 'AUTO-TESTE-938472',
    infractionCode: '7455-0',
    description: 'Transitar em velocidade superior à máxima permitida em até 20%',
    ctbArticle: 'Art. 218, I do CTB',
    autuadorBody: 'DETRAN-SP',
    dateTime: '17/03/2026 14:30',
    location: 'AVENIDA TESTE 123, KM 4',
    speedLimit: 60,
    measuredSpeed: 74,
    consideredSpeed: 67,
    radarEquipmentId: 'RADAR-SP-9872',
    inmetroDate: '10/01/2025',
  };

  it('Step 1: Analyzes infraction accurately with Expert Rule Engine', () => {
    const infraction: InfractionData = {
      aitNumber: WATERMARK_DATA.aitNumber,
      infractionCode: WATERMARK_DATA.infractionCode,
      description: WATERMARK_DATA.description,
      ctbArticle: WATERMARK_DATA.ctbArticle,
      severity: 'media',
      points: 4,
      fineAmount: 130.16,
      autuadorBody: WATERMARK_DATA.autuadorBody,
      dateTime: WATERMARK_DATA.dateTime,
      location: WATERMARK_DATA.location,
      speedLimit: WATERMARK_DATA.speedLimit,
      measuredSpeed: WATERMARK_DATA.measuredSpeed,
      consideredSpeed: WATERMARK_DATA.consideredSpeed,
      radarEquipmentId: WATERMARK_DATA.radarEquipmentId,
      inmetroAferitionDate: WATERMARK_DATA.inmetroDate,
    };

    const analysis = RagPipeline.analyzeInfraction('case_test_watermark', infraction);
    expect(analysis).toBeDefined();
    expect(analysis.overallSuccessRate).toBeGreaterThan(0);
    expect(analysis.recommendedArguments.length).toBeGreaterThan(0);
  });

  it('Step 2: Generates defense with exact watermark values and zero placeholders', () => {
    const infraction: InfractionData = {
      aitNumber: WATERMARK_DATA.aitNumber,
      infractionCode: WATERMARK_DATA.infractionCode,
      description: WATERMARK_DATA.description,
      ctbArticle: WATERMARK_DATA.ctbArticle,
      severity: 'media',
      points: 4,
      fineAmount: 130.16,
      autuadorBody: WATERMARK_DATA.autuadorBody,
      dateTime: WATERMARK_DATA.dateTime,
      location: WATERMARK_DATA.location,
      speedLimit: WATERMARK_DATA.speedLimit,
      measuredSpeed: WATERMARK_DATA.measuredSpeed,
      consideredSpeed: WATERMARK_DATA.consideredSpeed,
      radarEquipmentId: WATERMARK_DATA.radarEquipmentId,
      inmetroAferitionDate: WATERMARK_DATA.inmetroDate,
    };

    const analysis = RagPipeline.analyzeInfraction('case_test_watermark', infraction);

    const draft = RagPipeline.generateDefenseDraft(
      'case_test_watermark',
      infraction,
      WATERMARK_DATA.vehiclePlate,
      WATERMARK_DATA.vehicleModel,
      {
        name: WATERMARK_DATA.name,
        cpf: WATERMARK_DATA.cpf,
        rg: WATERMARK_DATA.rg,
        cnh: WATERMARK_DATA.cnh,
        category: WATERMARK_DATA.category,
        address: WATERMARK_DATA.address,
        cityState: WATERMARK_DATA.cityState,
      },
      analysis.recommendedArguments,
      'recurso_jari'
    );

    expect(draft).toBeDefined();
    expect(draft.fullDraftText).toBeDefined();

    // Check all watermarks in the generated document text
    expect(draft.fullDraftText).toContain(WATERMARK_DATA.name);
    expect(draft.fullDraftText).toContain(WATERMARK_DATA.cpf);
    expect(draft.fullDraftText).toContain(WATERMARK_DATA.cnh);
    expect(draft.fullDraftText).toContain(WATERMARK_DATA.vehiclePlate);
    expect(draft.fullDraftText).toContain(WATERMARK_DATA.vehicleModel);
    expect(draft.fullDraftText).toContain(WATERMARK_DATA.aitNumber);
    expect(draft.fullDraftText).toContain(WATERMARK_DATA.address);
    expect(draft.fullDraftText).toContain(WATERMARK_DATA.cityState);
    expect(draft.fullDraftText).toContain(WATERMARK_DATA.location);

    // Check header addressing
    expect(draft.fullDraftText).toContain('JUNTA ADMINISTRATIVA DE RECURSOS DE INFRAÇÕES – JARI DO(A) DETRAN-SP');
    expect(draft.fullDraftText).toContain('DETRAN-SP');

    // Confirm ZERO placeholder strings
    expect(draft.fullDraftText).not.toContain('[NOME');
    expect(draft.fullDraftText).not.toContain('[PLACA');
    expect(draft.fullDraftText).not.toContain('[AUTO');
    expect(draft.fullDraftText).not.toContain('[CIDADE');
    expect(draft.fullDraftText).not.toContain('undefined');
    expect(draft.fullDraftText).not.toContain('null');
  });

  it('Step 3: Preserves data roundtrip via CanonicalMapper', () => {
    const domainCase: CaseDomain = {
      id: 'case_watermark_roundtrip',
      title: `Recurso Auto ${WATERMARK_DATA.aitNumber}`,
      clientName: WATERMARK_DATA.name,
      clientCpf: WATERMARK_DATA.cpf,
      clientPhone: '(11) 99999-8888',
      clientEmail: 'netto@teste.com',
      status: 'defesa_pronta',
      currentStage: 3,
      serviceType: 'recurso_jari',
      vehicle: {
        plate: WATERMARK_DATA.vehiclePlate,
        brandModel: WATERMARK_DATA.vehicleModel,
      },
      infraction: {
        aitNumber: WATERMARK_DATA.aitNumber,
        infractionCode: WATERMARK_DATA.infractionCode,
        description: WATERMARK_DATA.description,
        ctbArticle: WATERMARK_DATA.ctbArticle,
        severity: 'media',
        points: 4,
        fineAmount: 130.16,
        autuadorBody: WATERMARK_DATA.autuadorBody,
        dateTime: WATERMARK_DATA.dateTime,
        location: WATERMARK_DATA.location,
      },
      applicant: {
        applicantName: WATERMARK_DATA.name,
        applicantCpf: WATERMARK_DATA.cpf,
        applicantRg: WATERMARK_DATA.rg,
        applicantCnh: WATERMARK_DATA.cnh,
        cnhCategory: WATERMARK_DATA.category,
        applicantPhone: '(11) 99999-8888',
        applicantEmail: 'netto@teste.com',
        addressStreet: 'AVENIDA TESTE 123',
        addressNumber: 'APTO 42',
        addressNeighborhood: 'Jardins',
        addressZipCode: '01234-567',
        addressCityState: WATERMARK_DATA.cityState,
      },
      isAnonymous: false,
      isPaid: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const row = CanonicalMapper.domainToRow(domainCase);
    expect(row.ait_number).toBe(WATERMARK_DATA.aitNumber);
    expect(row.vehicle_plate).toBe(WATERMARK_DATA.vehiclePlate);
    expect(row.client_name).toBe(WATERMARK_DATA.name);
    expect(row.client_cpf).toBe(WATERMARK_DATA.cpf);

    const rehydrated = CanonicalMapper.rowToDomain(row);
    expect(rehydrated.clientName).toBe(WATERMARK_DATA.name);
    expect(rehydrated.clientCpf).toBe(WATERMARK_DATA.cpf);
    expect(rehydrated.vehicle.plate).toBe(WATERMARK_DATA.vehiclePlate);
    expect(rehydrated.vehicle.brandModel).toBe(WATERMARK_DATA.vehicleModel);
    expect(rehydrated.infraction.aitNumber).toBe(WATERMARK_DATA.aitNumber);
    expect(rehydrated.applicant?.applicantName).toBe(WATERMARK_DATA.name);
    expect(rehydrated.applicant?.applicantCnh).toBe(WATERMARK_DATA.cnh);
    expect(rehydrated.applicant?.addressCityState).toBe(WATERMARK_DATA.cityState);
  });

  it('Step 4: Variation Tests — Adapts procedure and state authority headers properly', () => {
    const baseInfraction: InfractionData = {
      aitNumber: 'PR-998877',
      infractionCode: '5169-1',
      description: 'Dirigir sob a influência de álcool',
      ctbArticle: 'Art. 165 do CTB',
      severity: 'gravissima',
      points: 7,
      fineAmount: 2934.70,
      autuadorBody: 'DETRAN-PR',
      dateTime: '20/04/2026 23:00',
      location: 'BR-277 KM 10 - Curitiba/PR',
    };

    // Test Defesa Prévia (DETRAN)
    const draftPrevia = DocumentAssemblyEngine.assemble({
      caseId: 'case_var_1',
      procedureType: 'defesa_previa',
      infraction: baseInfraction,
      vehicle: { plate: 'XYZ9A99', model: 'VW GOLF GTI' },
      applicant: {
        name: 'CARLOS SILVA',
        cpf: '222.333.444-55',
        cnh: '9988776655',
        address: 'RUA XV DE NOVEMBRO, 100',
        cityState: 'Curitiba - PR',
      },
      selectedArgumentIds: ['ARG-001', 'ARG-008'],
    });

    expect(draftPrevia.fullDraftText).toContain('ILUSTRÍSSIMO SENHOR DIRETOR / AUTORIDADE DE TRÂNSITO DO(A) DETRAN-PR');
    expect(draftPrevia.fullDraftText).toContain('DEFESA PRÉVIA');

    // Test Recurso CETRAN (2ª Instância)
    const draftCetran = DocumentAssemblyEngine.assemble({
      caseId: 'case_var_2',
      procedureType: 'recurso_cetran',
      infraction: baseInfraction,
      vehicle: { plate: 'XYZ9A99', model: 'VW GOLF GTI' },
      applicant: {
        name: 'CARLOS SILVA',
        cpf: '222.333.444-55',
        cnh: '9988776655',
        address: 'RUA XV DE NOVEMBRO, 100',
        cityState: 'Curitiba/PR',
      },
      selectedArgumentIds: ['ARG-001', 'ARG-008'],
    });

    expect(draftCetran.fullDraftText).toContain('CONSELHO ESTADUAL DE TRÂNSITO – CETRAN/PR');
    expect(draftCetran.fullDraftText).toContain('RECURSO ADMINISTRATIVO EM 2ª INSTÂNCIA');
  });
});
