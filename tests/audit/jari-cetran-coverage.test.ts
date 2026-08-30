/**
 * jari-cetran-coverage.test.ts
 *
 * Suíte de Auditoria das Instâncias Recursais (JARI vs CETRAN vs Federal).
 * Valida que:
 *  1. JARI (1ª Instância) e CETRAN (2ª Instância) são instâncias distintas no catálogo.
 *  2. Procedimentos para JARI e CETRAN possuem bases legais e fluxos distintos.
 *  3. Minutas geradas distinguem as instâncias e cabeçalhos correspondentes.
 */

import { describe, it, expect } from 'vitest';
import { PROCEDURES_CATALOG } from '../../src/core/procedures/procedures-catalog';
import { DocumentAssemblyEngine } from '../../src/core/documents/document-assembly-engine';
import { makeInfraction, makeVehicle } from './helpers';

describe('jari-cetran-coverage: separação de instâncias e competências', () => {
  it('PROCEDURES_CATALOG distingue Recurso JARI de Recurso CETRAN', () => {
    const jariProc = PROCEDURES_CATALOG.find((p) => p.id === 'recurso_jari');
    const cetranProc = PROCEDURES_CATALOG.find((p) => p.id === 'recurso_cetran');

    expect(jariProc).toBeDefined();
    expect(cetranProc).toBeDefined();

    expect(jariProc!.code).not.toEqual(cetranProc!.code);
    expect(jariProc!.legalBasis).toContain('Art. 285');
    expect(cetranProc!.legalBasis).toContain('Art. 288');
  });

  it('minuta para Recurso JARI endereça à Junta Administrativa de Recursos de Infrações', () => {
    const infraction = makeInfraction({
      autuadorBody: 'DETRAN-SP',
      aitNumber: 'TEST-JARI-001',
    });
    const vehicle = makeVehicle();

    const draft = DocumentAssemblyEngine.assemble({
      caseId: 'case_test_jari',
      infraction,
      vehicle: {
        plate: vehicle.plate,
        model: vehicle.brandModel,
        renavam: vehicle.renavam,
      },
      procedureType: 'recurso_jari',
      applicant: {
        name: 'Recorrente Teste',
        cpf: '123.456.789-00',
        rg: '12.345.678-9',
        cnh: '12345678900',
        address: 'Rua Principal, 100',
        cityState: 'São Paulo/SP',
      },
    });

    expect(draft.fullDraftText).toMatch(/JARI|JUNTA ADMINISTRATIVA DE RECURSOS/i);
    expect(draft.fullDraftText).not.toMatch(/CONSELHO ESTADUAL DE TRÂNSITO/i);
  });

  it('minuta para Recurso CETRAN endereça ao Conselho de 2ª Instância', () => {
    const infraction = makeInfraction({
      autuadorBody: 'DETRAN-SP',
      aitNumber: 'TEST-CETRAN-001',
    });
    const vehicle = makeVehicle();

    const draft = DocumentAssemblyEngine.assemble({
      caseId: 'case_test_cetran',
      infraction,
      vehicle: {
        plate: vehicle.plate,
        model: vehicle.brandModel,
        renavam: vehicle.renavam,
      },
      procedureType: 'recurso_cetran',
      applicant: {
        name: 'Recorrente Teste',
        cpf: '123.456.789-00',
        rg: '12.345.678-9',
        cnh: '12345678900',
        address: 'Rua Principal, 100',
        cityState: 'São Paulo/SP',
      },
    });

    expect(draft.fullDraftText).toMatch(/CETRAN|CONSELHO ESTADUAL DE TRÂNSITO/i);
  });

  it('procedimentos de habilitação (PSDD e PCDD) possuem estruturas próprias e competência do DETRAN', () => {
    const psdd = PROCEDURES_CATALOG.find((p) => p.id === 'suspensao_cnh');
    const pcdd = PROCEDURES_CATALOG.find((p) => p.id === 'cassacao_cnh');

    expect(psdd).toBeDefined();
    expect(pcdd).toBeDefined();
    expect(psdd!.legalBasis).toContain('Art. 261');
    expect(pcdd!.legalBasis).toContain('Art. 263');
  });
});
