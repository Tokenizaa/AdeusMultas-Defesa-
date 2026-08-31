/**
 * national-coverage — AUDITORIA NACIONAL BRASIL (27 UF).
 *
 * Valida a entrega integral da cobertura nacional:
 *  - Registry de órgãos: 27 DETRANs estaduais/distrital + PRF/DNIT/ANTT + CET-SP/DER-SP.
 *  - Todas as 27 UFs (AC..TO) possuem órgãos registrados e resolvem protocolos oficiais.
 *  - Fallback geográfico: Cada UF resolve seus próprios dados, nunca vaza para DETRAN-SP.
 *  - Personalização da análise: inputs diferentes → análises diferentes.
 *  - Isolamento: cada caso retém seu próprio órgão/cidade/UF (sem leakage).
 *  - PDF/export usa dados reais, nunca fabrica AIT/CPF/CNH/placa/renavam.
 */
import { describe, it, expect } from 'vitest';
import { resolveProtocolInfo, ORGANS_DB } from '../../src/core/legal-base/organs';
import { AUTUADOR_BODIES } from '../../src/data/knowledge-base';
import { RagPipeline } from '../../src/core/rag/rag-pipeline';
import { ExpertRuleEngine, EXPERT_RULES } from '../../src/core/rules/rule-engine';
import { DocumentAssemblyEngine } from '../../src/core/documents/document-assembly-engine';
import { CanonicalKnowledgeRegistry } from '../../src/core/knowledge/registry';
import { WeeklyMonitorService } from '../../src/core/knowledge/scheduler/weekly-monitor-service';
import { TemporalKnowledgeEngine } from '../../src/core/knowledge/temporal-engine';
import { makeInfraction, makeVehicle } from './helpers';

const ALL_27_UF = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

// ============ A1: CanonicalKnowledgeRegistry (SSOT) ============

describe('national: CanonicalKnowledgeRegistry centralizado', () => {
  it('contém exatamente todas as 27 Unidades Federativas', () => {
    const states = CanonicalKnowledgeRegistry.getAllStates();
    expect(states.length).toBe(27);
    for (const uf of ALL_27_UF) {
      const state = CanonicalKnowledgeRegistry.getState(uf);
      expect(state, `UF ${uf} deve existir no CanonicalKnowledgeRegistry`).not.toBeNull();
      expect(state?.uf).toBe(uf);
    }
  });

  it('órgãos das 27 UFs são independentes e possuem URLs de portal oficiais', () => {
    for (const uf of ALL_27_UF) {
      const detran = CanonicalKnowledgeRegistry.getDetranByState(uf);
      expect(detran, `DETRAN da UF ${uf} deve existir`).not.toBeNull();
      expect(detran?.state).toBe(uf);
      expect(detran?.onlinePortalUrl).toBeTruthy();
      if (uf !== 'SP') {
        expect(detran?.onlinePortalUrl).not.toContain('detran.sp.gov.br');
      }
    }
  });

  it('todos os 27 Conselhos Estaduais (CETRANs/CONTRANDIFE) estão catalogados', () => {
    const cetrans = CanonicalKnowledgeRegistry.getAllCetrans();
    expect(cetrans.length).toBe(27);
    const df = CanonicalKnowledgeRegistry.getCetranByState('DF');
    expect(df?.isContrandife).toBe(true);
    expect(df?.name).toContain('CONTRANDIFE');
  });

  it('fontes Tier 1 a 3 cobrem todas as 27 UFs e o âmbito Federal', () => {
    const tier1to3 = CanonicalKnowledgeRegistry.getTier1To3Sources();
    expect(tier1to3.length).toBeGreaterThanOrEqual(50);
    for (const uf of ALL_27_UF) {
      const ufSources = CanonicalKnowledgeRegistry.getTier1To3Sources(uf);
      expect(ufSources.length).toBeGreaterThan(0);
    }
  });
});

// ============ A2: KNOWLEDGE_GAP vs Fallback (Fail Closed) ============

describe('national: KNOWLEDGE_GAP e isolamento seguro', () => {
  it('órgão não catalogado resulta em KNOWLEDGE_GAP e nunca dados fictícios', () => {
    const status = CanonicalKnowledgeRegistry.getKnowledgeStatus('ORGAO_FANTASMA_XYZ');
    expect(status.isKnowledgeGap).toBe(true);
    expect(status.isCovered).toBe(false);
    expect(status.code).toBe('KNOWLEDGE_GAP');
    expect(status.organ).toBeNull();
  });

  it('resolveProtocolInfo com órgão inexistente retorna null (sem fallback para SP)', () => {
    const info = CanonicalKnowledgeRegistry.resolveProtocolInfo('ORGAO_DESCONHECIDO_123');
    expect(info).toBeNull();
  });

  it('DETRAN-AM nunca usa portal ou endereço de SP', () => {
    const amInfo = CanonicalKnowledgeRegistry.resolveProtocolInfo('DETRAN-AM');
    expect(amInfo).not.toBeNull();
    expect(amInfo?.portalUrl).toContain('detran.am.gov.br');
    expect(amInfo?.portalUrl).not.toContain('detran.sp.gov.br');
    expect(amInfo?.physicalAddress).toContain('Manaus');
    expect(amInfo?.physicalAddress).not.toContain('São Paulo');
  });

  it('DETRAN-RS nunca usa portal ou endereço do RJ', () => {
    const rsInfo = CanonicalKnowledgeRegistry.resolveProtocolInfo('DETRAN-RS');
    expect(rsInfo).not.toBeNull();
    expect(rsInfo?.portalUrl).toContain('detran.rs.gov.br');
    expect(rsInfo?.portalUrl).not.toContain('detran.rj.gov.br');
    expect(rsInfo?.physicalAddress).toContain('Porto Alegre');
  });
});

// ============ A3: Versionamento Temporal no RuleEngine ============

describe('national: versionamento temporal no RuleEngine (validFrom / validUntil)', () => {
  it('regras possuem metadados de vigência temporal declarados', () => {
    for (const rule of EXPERT_RULES) {
      expect(rule.validFrom).toBeDefined();
      expect(rule.validFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('Lei 14.071/2020 (Conversão em Advertência) NÃO se aplica a fatos anteriores a 12/04/2021', () => {
    // Infração em 2020-05-10 (anterior à Lei 14.071/2020)
    const analysisPreLei = ExpertRuleEngine.evaluate(
      'case_pre_lei',
      makeInfraction({
        infractionCode: '745-50',
        autuadorBody: 'DETRAN-SP',
        dateTime: '2020-05-10T10:00:00',
        hasPreviousInfractionsLast12Months: false,
      }),
    );
    const hasAdvertenciaPre = analysisPreLei.detectedInconsistencies.some(
      (i) => i.legalArgumentId === 'ARG-051'
    );
    expect(hasAdvertenciaPre).toBe(false);

    // Mesma infração em 2022-01-15 (posterior à vigência da Lei 14.071/2020)
    const analysisPosLei = ExpertRuleEngine.evaluate(
      'case_pos_lei',
      makeInfraction({
        infractionCode: '745-50',
        autuadorBody: 'DETRAN-SP',
        dateTime: '2022-01-15T10:00:00',
        hasPreviousInfractionsLast12Months: false,
      }),
    );
    const hasAdvertenciaPos = analysisPosLei.detectedInconsistencies.some(
      (i) => i.legalArgumentId === 'ARG-051'
    );
    expect(hasAdvertenciaPos).toBe(true);
  });

  it('Resolução CONTRAN 985/2022 (MBFT) NÃO se aplica a fatos anteriores a 02/01/2023', () => {
    // Infração sem abordagem em 2021-08-10 (anterioir à vigência da Res. 985/2022).
    // FAIL CLOSED: dado de observação presente, porém fato anterior => regra inativa.
    const analysisPreMbft = ExpertRuleEngine.evaluate(
      'case_pre_mbft',
      makeInfraction({
        infractionCode: '736-62',
        autuadorBody: 'DETRAN-SP',
        dateTime: '2021-08-10T14:00:00',
        hasAgentDetailedObservations: false,
      }),
    );
    const hasMbftPre = analysisPreMbft.detectedInconsistencies.some(
      (i) => i.legalArgumentId === 'ARG-015'
    );
    expect(hasMbftPre).toBe(false);

    // Infração sem abordagem em 2024-04-10 (posterior à vigência, dado confirma ausência)
    const analysisPosMbft = ExpertRuleEngine.evaluate(
      'case_pos_mbft',
      makeInfraction({
        infractionCode: '736-62',
        autuadorBody: 'DETRAN-SP',
        dateTime: '2024-04-10T14:00:00',
        hasAgentDetailedObservations: false,
      }),
    );
    const hasMbftPos = analysisPosMbft.detectedInconsistencies.some(
      (i) => i.legalArgumentId === 'ARG-015'
    );
    expect(hasMbftPos).toBe(true);
  });
});

// ============ A4: WeeklyMonitorService ============

describe('national: WeeklyMonitorService e coleta das 27 UFs', () => {
  it('executa ciclo de monitoramento coletando fontes oficiais Tier 1-3 com SHA-256', async () => {
    const cycle = await WeeklyMonitorService.runWeeklyCycle({
      fetchTimeoutMs: 1000,
      concurrency: 10,
    });

    expect(cycle.summary).toBeDefined();
    expect(cycle.summary.totalSources).toBeGreaterThanOrEqual(50);
    expect(cycle.summary.successfulFetches).toBeGreaterThan(0);
    expect(cycle.summary.snapshotsCreated).toBeGreaterThan(0);
    expect(cycle.reportMarkdown).toContain('RELATÓRIO NACIONAL DE MONITORAMENTO');
  }, 20000);

  it('fornece status e histórico de execução operacional', () => {
    const status = WeeklyMonitorService.getStatus();
    expect(status).toHaveProperty('isRunning');
    expect(status).toHaveProperty('totalCyclesExecuted');
    expect(status.totalCyclesExecuted).toBeGreaterThanOrEqual(1);
  });
});

// ============ A5: cobertura real do registry ============

describe('national: registry de órgãos (organs.ts + AUTUADOR_BODIES)', () => {
  it('registry contém todas as 27 UFs cadastradas', () => {
    expect(ORGANS_DB.length).toBeGreaterThanOrEqual(30);
    for (const uf of ALL_27_UF) {
      const present = ORGANS_DB.some((o) => o.abbreviation === `DETRAN-${uf}` || o.state === uf);
      expect(present, `UF ${uf} deve ter órgão registrado no catálogo nacional`).toBe(true);
    }
  });

  it('AUTUADOR_BODIES (knowledge-base) tem lista de órgãos ativos', () => {
    expect(AUTUADOR_BODIES.length).toBeGreaterThanOrEqual(7);
  });

  it('registry cobre todas as 27 UFs como DETRANs', () => {
    const detranStates = new Set(
      ORGANS_DB.filter((o) => o.abbreviation.startsWith('DETRAN')).map((o) => o.state),
    );
    for (const uf of ALL_27_UF) {
      expect(detranStates.has(uf)).toBe(true);
    }
  });
});

// ============ A6: resolveProtocolInfo por UF ============

describe('national: resolveProtocolInfo nas 27 UF', () => {
  it.each(ALL_27_UF)('UF %s → protocolo oficial resolvido com sucesso', (uf) => {
    const info = resolveProtocolInfo(`DETRAN-${uf}`);
    expect(info).not.toBeNull();
    expect(info!.portalUrl).toMatch(/detran\./);
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

// ============ B2a: isolamento geográfico ============

describe('national adversarial: isolamento geográfico (UF≠SP nunca cai em DETRAN-SP)', () => {
  it.each(['DETRAN-AM', 'DETRAN-RS', 'DETRAN-BA', 'DETRAN-PA', 'DETRAN-CE', 'DETRAN-GO'])(
    '%s → organInfo resolve o estado correto, nunca DETRAN-SP', (orgao) => {
      const ctx = RagPipeline.retrieveContext({ codigoInfracao: '745-50', orgaoAutuador: orgao });
      expect(ctx.organInfo).toBeDefined();
      expect(ctx.organInfo?.nome).not.toBe('Departamento Estadual de Trânsito de São Paulo');
    },
  );

  it('DETRAN-SP mantém seu portal próprio', () => {
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
    // AM tem seu portal próprio
    expect(am.protocolInfo).not.toBeNull();
    expect(am.protocolInfo?.portalUrl).toContain('detran.am.gov.br');
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
    const draft = DocumentAssemblyEngine.assemble({
      caseId: 'case-renavam',
      procedureType: 'recurso_jari',
      infraction: makeInfraction({ autuadorBody: 'DETRAN-SP', aitNumber: 'AIT-SP-REN-77' }),
      vehicle: { plate: 'REN-1A1', model: 'VW Gol', renavam: '85674321098' },
      applicant: { name: 'Zé', cpf: '123.456.789-00', cnh: '98765432100', address: 'Rua', cityState: 'São Paulo/SP' },
      selectedArgumentIds: [],
    });
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
    expect(src).not.toContain("'1B892014'");
    expect(src).not.toContain("'BRA2E19'");
    expect(src).not.toContain("'000.000.000-00'");
    expect(src).toContain(`'Não informado'`);
    expect(src).toContain('caseData.infraction?.aitNumber');
    expect(src).toContain('caseData.infraction?.autuadorBody');
  });
});

