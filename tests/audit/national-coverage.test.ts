/**
 * national-coverage — AUDITORIA NACIONAL BRASIL (27 UF).
 *
 * Prova o que a plataforma REALMENTE entrega em cobertura nacional:
 *  - Registry de órgãos: só SP/RJ/MG + PRF/DNIT + CET-SP/DER-SP.
 *  - 24 UFs (AC..TO) existem SÓ no dropdown (CATALOG_ONLY): aceitam dado,
 *    processam minuta federal, mas NÃO resolvem protocolo (null), sem
 *    fabricação nem contaminação (fallback honesto).
 *  - Fallback geográfico: UF fora do registry NUNCA cai em DETRAN-SP.
 *  - Personalização da análise: inputs diferentes → análises diferentes.
 *  - Isolamento: cada caso retém seu próprio órgão/cidade/UF (sem leakage).
 *  - PDF/export usa dados reais, nunca fabrica AIT/CPF/CNH/placa/renavam.
 *
 * NÃO toca produção. Só evidência → classificação honesta.
 * Ver docs/audit/AUDITORIA-NACIONAL-BRASIL.md.
 */
import { describe, it, expect } from 'vitest';
import { resolveProtocolInfo, ORGANS_DB } from '../../src/core/legal-base/organs';
import { AUTUADOR_BODIES } from '../../src/data/knowledge-base';
import { RagPipeline } from '../../src/core/rag/rag-pipeline';
import { ExpertRuleEngine } from '../../src/core/rules/rule-engine';
import { DocumentAssemblyEngine } from '../../src/core/documents/document-assembly-engine';
import { makeInfraction, makeVehicle } from './helpers';

const ALL_27_UF = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

/** UFs com órgão + protocolo resolvido (SUPPORTED_PARTIAL). */
const SUPPORTED_UFS = new Set(['SP', 'RJ', 'MG']);

// ============ A2: cobertura real do registry ============

describe('national: registry de órgãos (organs.ts + AUTUADOR_BODIES)', () => {
  it('registry contém 27 órgãos estaduais? → NÃO (7 órgãos somente; 24 UF CATALOG_ONLY)', () => {
    expect(ORGANS_DB.length).toBe(7);
    // Evidência do gap N-01: 24 UFs não têm DETRAN no registry.
    const states = new Set(ORGANS_DB.map((o) => o.state).filter(Boolean));
    for (const uf of ALL_27_UF) {
      const present = ORGANS_DB.some((o) => o.abbreviation === `DETRAN-${uf}` || o.state === uf);
      if (SUPPORTED_UFS.has(uf)) {
        expect(present, `UF ${uf} deveria ter órgão registrado`).toBe(true);
      } else {
        // UF regional não-suportada: DETRAN-XX não pode existir no registry
        // (senão a cobertura seria real). Documenta o COVERAGE GAP.
        expect(ORGANS_DB.some((o) => o.abbreviation === `DETRAN-${uf}`),
          `DETRAN-${uf} não deve estar no registry (cobertura real ausente)`).toBe(false);
      }
    }
  });

  it('AUTUADOR_BODIES (knowledge-base) tem o mesmo universo de órgãos (7, 3 UFs)', () => {
    expect(AUTUADOR_BODIES.length).toBe(7);
  });

  it('registry cobre exatamente SP, RJ, MG como DETRANs estaduais', () => {
    const detranStates = new Set(
      ORGANS_DB.filter((o) => o.abbreviation.startsWith('DETRAN')).map((o) => o.state),
    );
    expect([...detranStates].sort()).toEqual(['MG', 'RJ', 'SP']);
  });
});

// ============ A2: resolveProtocolInfo por UF ============

describe('national: resolveProtocolInfo nas 27 UF', () => {
  it.each(ALL_27_UF)('UF %s → protocolo honesto (null p/ não-suportada, portal p/ suportada)', (uf) => {
    const info = resolveProtocolInfo(`DETRAN-${uf}`);
    if (SUPPORTED_UFS.has(uf)) {
      expect(info).not.toBeNull();
      expect(info!.portalUrl).toMatch(/detran\./);
    } else {
      // NÃO fabricar protocolo: UF não-suportada NÃO tem portal inventado.
      expect(info).toBeNull();
    }
  });
});

describe('national: órgãos federais e municipais suportados', () => {
  it.each([
    ['PRF', 'sistemas.prf.gov.br'],
    ['DNIT', 'servicos.dnit.gov.br'],
    ['CET-SP / DSV', 'dsv.prefeitura.sp.gov.br'],
    ['DER-SP', 'der.sp.gov.br'],
  ])('%s → protocolo resolvido (%s)', (abbr, portal) => {
    const info = resolveProtocolInfo(abbr);
    expect(info).not.toBeNull();
    expect(info!.portalUrl).toContain(portal);
  });
});

// ============ B2a: fallback geográfico ============

describe('national adversarial: fallback geográfico (UF≠SP nunca cai em DETRAN-SP)', () => {
  it.each(['DETRAN-AM', 'DETRAN-RS', 'DETRAN-BA', 'DETRAN-PA', 'DETRAN-CE', 'DETRAN-GO'])(
    '%s → organInfo indefinido no RAG, nunca DETRAN-SP', (orgao) => {
      const ctx = RagPipeline.retrieveContext({ codigoInfracao: '745-50', orgaoAutuador: orgao });
      if (ctx.organInfo) {
        expect(ctx.organInfo.nome).not.toBe('Departamento Estadual de Trânsito de São Paulo');
      } else {
        // fail-closed honesto: sem órgão, sem portal falso
        expect(ctx.organInfo).toBeUndefined();
      }
    },
  );

  it('DETRAN-SP mantém seu portal próprio (não vaza p/ outro)', () => {
    const ctx = RagPipeline.retrieveContext({ codigoInfracao: '745-50', orgaoAutuador: 'DETRAN-SP' });
    expect(ctx.organInfo?.nome).toContain('São Paulo');
    expect(ctx.organInfo?.portalUrl).toContain('detran.sp.gov.br');
  });
});

// ============ B9 + B2c: isolamento nacional (AM→RS→BA→PR→PE→GO→SP→PA→MG→CE) ============

describe('national: isolamento sequência AM→RS→BA→PR→PE→GO→SP→PA→MG→CE', () => {
  const seq = [
    { uf: 'AM', cityState: 'Manaus/AM' },
    { uf: 'RS', cityState: 'Porto Alegre/RS' },
    { uf: 'BA', cityState: 'Salvador/BA' },
    { uf: 'PR', cityState: 'Curitiba/PR' },
    { uf: 'PE', cityState: 'Recife/PE' },
    { uf: 'GO', cityState: 'Goiânia/GO' },
    { uf: 'SP', cityState: 'São Paulo/SP' },
    { uf: 'PA', cityState: 'Belém/PA' },
    { uf: 'MG', cityState: 'Belo Horizonte/MG' },
    { uf: 'CE', cityState: 'Fortaleza/CE' },
  ];

  it.each(seq)('caso UF=$uf retém sua próprio cidade e órgão (sem leakage)', ({ uf, cityState }) => {
    const autuador = `DETRAN-${uf}`;
    const draft = RagPipeline.generateDefenseDraft(
      `case_${uf}`,
      makeInfraction({ autuadorBody: autuador, aitNumber: `AIT-${uf}-001` }),
      `PLA-${uf}-1`,
      'Honda Civic',
      { name: `Cidadão ${uf}`, cpf: `123.456.789-${uf.charCodeAt(0) % 10}`, cnh: `${uf}123456`, address: `Rua X, 1`, cityState },
      [],
      'recurso_jari',
    );
    expect(draft.fullDraftText).toContain(cityState);
    expect(draft.fullDraftText).toContain(autuador.toUpperCase());
    // Nenhuma contaminação com outro estado da sequência
    for (const other of seq) {
      if (other.uf !== uf) {
        expect(draft.fullDraftText).not.toContain(other.cityState);
      }
    }
  });

  it('casos SP e AM lado a lado sem cruzamento de protocolo', () => {
    const am = RagPipeline.generateDefenseDraft(
      'case_am',
      makeInfraction({ autuadorBody: 'DETRAN-AM', aitNumber: 'AIT-AM-001' }),
      'AAA-1A11', 'Honda Civic',
      { name: 'Ana', cpf: '111.222.333-44', cnh: '11122233344', address: 'Rua 1', cityState: 'Manaus/AM' },
      [], 'recurso_jari',
    );
    const sp = RagPipeline.generateDefenseDraft(
      'case_sp',
      makeInfraction({ autuadorBody: 'DETRAN-SP', aitNumber: 'AIT-SP-001' }),
      'BBB-2B22', 'Honda Civic',
      { name: 'Bruno', cpf: '555.666.777-88', cnh: '55566677788', address: 'Rua 2', cityState: 'São Paulo/SP' },
      [], 'recurso_jari',
    );
    // AM não herda portal de SP
    expect(am.protocolInfo).toBeNull();
    expect(am.fullDraftText).not.toContain('São Paulo/SP');
    // SP tem seu portal próprio, não o de AM
    expect(sp.protocolInfo?.portalUrl).toContain('detran.sp.gov.br');
    expect(sp.fullDraftText).not.toContain('Manaus/AM');
  });
});

// ============ B5: personalização da análise ============

describe('national: análise é personalizada por dados do caso (não genérica)', () => {
  it('radar 745-50 vs lei seca 516-91 → procedimentos e inconsistências distintos', () => {
    const base = (over: any) => makeInfraction({ ...over, autuadorBody: 'DETRAN-SP' });
    const radar = ExpertRuleEngine.evaluate('c-radar', base({ infractionCode: '745-50' }));
    const seco = ExpertRuleEngine.evaluate('c-seco', base({ infractionCode: '516-91' }));

    // Procedimentos diferentes
    expect(radar.recommendedProcedure).not.toBe(seco.recommendedProcedure);
    // Conjuntos de inconsistências diferentes
    const rT = radar.detectedInconsistencies.map((i) => i.title);
    const sT = seco.detectedInconsistencies.map((i) => i.title);
    expect(rT.join('|')).not.toBe(sT.join('|'));
    // Scores distintos (não é template estático)
    expect(radar.overallSuccessRate).not.toBe(seco.overallSuccessRate);
  });

  it('mesma infração com dados de decadência (30d) vs sem → análise muda', () => {
    const infDate = '2026-01-01T10:00:00';
    const notif = '2026-02-15T10:00:00'; // 45 dias → decadência
    const comDecadencia = ExpertRuleEngine.evaluate('c-d',
      makeInfraction({
        infractionCode: '745-50', autuadorBody: 'DETRAN-SP',
        dateTime: infDate, notificationExpeditionDate: notif,
      }));
    const semNotif = ExpertRuleEngine.evaluate('c-s',
      makeInfraction({ infractionCode: '745-50', autuadorBody: 'DETRAN-SP', dateTime: infDate }));
    expect(comDecadencia.detectedInconsistencies.length).toBeGreaterThan(semNotif.detectedInconsistencies.length);
    expect(comDecadencia.overallSuccessRate).toBeGreaterThan(semNotif.overallSuccessRate);
  });
});

// ============ B6 + B4: minuta preserva identidade/veículo/infração ============

describe('national: minuta preserva identidade/veículo/infração reais (B4/B6)', () => {
  const cit = {
    name: 'Maria Oliveira', cpf: '529.982.247-25', cnh: '12345678900',
    address: 'Av. Principal, 100', cityState: 'Manaus/AM',
  };

  it('dados do case → minuta 1:1 (sem fabricação nem fallback)', () => {
    const draft = RagPipeline.generateDefenseDraft(
      'case-ident',
      makeInfraction({ autuadorBody: 'DETRAN-AM', aitNumber: 'AIT-AM-IDENT-001', infractionCode: '745-50', ctbArticle: 'Art. 218, I do CTB', description: 'Velocidade até 20%', severity: 'media', points: 4, fineAmount: 130.16, speedLimit: 60, measuredSpeed: 71, consideredSpeed: 64, dateTime: '2026-03-10', location: 'Av. das Torres' }),
      'NQQ-9K11', 'Toyota Corolla', cit, [], 'recurso_jari',
    );
    expect(draft.applicantName).toBe('Maria Oliveira');
    expect(draft.applicantCpf).toBe('529.982.247-25');
    expect(draft.applicantCnh).toBe('12345678900');
    expect(draft.applicantCityState).toBe('Manaus/AM');
    expect(draft.vehiclePlate).toBe('NQQ-9K11');
    expect(draft.aitNumber).toBe('AIT-AM-IDENT-001');
    // texto contém dados reais
    expect(draft.fullDraftText).toContain('AIT-AM-IDENT-001');
    expect(draft.fullDraftText).toContain('NQQ-9K11');
    expect(draft.fullDraftText).toContain('Maria Oliveira');
    expect(draft.fullDraftText).toContain('Manaus/AM');
    expect(draft.fullDraftText).toContain('DETRAN-AM');
  });

  it('RENAVAM real preservado (via assemble), nunca fake "12345678900"', () => {
    // CNH distinta do renavam fake para não gerar falso positivo.
    const draft = DocumentAssemblyEngine.assemble({
      caseId: 'case-renavam',
      procedureType: 'recurso_jari',
      infraction: makeInfraction({ autuadorBody: 'DETRAN-SP', aitNumber: 'AIT-SP-REN-77' }),
      vehicle: { plate: 'REN-1A1', model: 'VW Gol', renavam: '85674321098' },
      applicant: { name: 'Zé', cpf: '123.456.789-00', cnh: '98765432100', address: 'Rua', cityState: 'São Paulo/SP' },
      selectedArgumentIds: [],
    });
    // renavam real aparece (correto); fake não
    expect(draft.vehicleRenavam).toBe('85674321098');
    expect(draft.vehicleRenavam).not.toBe('12345678900');
  });
});

// ============ B2d: dados ausentes → erro (não fabrica) ============

describe('national adversarial: dados ausentes → erro, nunca fabrica (B2d)', () => {
  const cit = { name: 'A', cpf: '123.456.789-00', cnh: '1', address: 'R', cityState: 'São Paulo/SP' };

  it('autuadorBody="" → erro na minuta', () => {
    expect(() => DocumentAssemblyEngine.assemble({
      caseId: 'c', procedureType: 'recurso_jari',
      infraction: { ...makeInfraction(), autuadorBody: '' },
      vehicle: makeVehicle(), applicant: cit, selectedArgumentIds: [],
    })).toThrow(/autuadorBody/);
  });

  it('cityState="" → erro na minuta', () => {
    expect(() => DocumentAssemblyEngine.assemble({
      caseId: 'c', procedureType: 'recurso_jari',
      infraction: makeInfraction(), vehicle: makeVehicle(),
      applicant: { ...cit, cityState: '' }, selectedArgumentIds: [],
    })).toThrow(/cityState/);
  });
});

// ============ B7: PDF usa dados reais, nunca fabrica (P0-10 guard) ============

describe('national: template do PDF usa dados reais (sem fabricação)', () => {
  it('pdf-export.ts não contém AIT/placa/CPF/CNH fabricados (fabricação removida)', () => {
    const src = require('fs').readFileSync(
      require('path').resolve(__dirname, '../../src/lib/pdf-export.ts'), 'utf8',
    );
    // Guardas contra fabricação da auditoria anterior (P0-10)
    expect(src).not.toContain("'1B892014'");
    expect(src).not.toContain("'BRA2E19'");
    expect(src).not.toContain("'000.000.000-00'");
    // Fallback honesto p/ ausentes (não inventa dado)
    expect(src).toContain(`'Não informado'`);
    // Usa dados reais do case
    expect(src).toContain('caseData.infraction?.aitNumber');
    expect(src).toContain('caseData.infraction?.autuadorBody');
  });
});
