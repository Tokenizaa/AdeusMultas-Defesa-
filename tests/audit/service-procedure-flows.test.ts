/**
 * service-procedure-flows — para cada (ProcedureType × órgão) com dados REAIS:
 * dados preservados → minuta montada → protocolInfo do órgão correto.
 * Suíte VERDE: prova que o caminho canônico funciona end-to-end.
 */
import { describe, it, expect } from 'vitest';
import { DocumentAssemblyEngine } from '../../src/core/documents/document-assembly-engine';
import { RagPipeline } from '../../src/core/rag/rag-pipeline';
import { ExpertRuleEngine } from '../../src/core/rules/rule-engine';
import { resolveProtocolInfo } from '../../src/core/legal-base/organs';
import { makeInfraction, makeVehicle, makeApplicant } from './helpers';

const ORGANS: { autuador: string; uf: string; cityState: string; portalContains: string; addressContains: string }[] = [
  { autuador: 'DETRAN-SP', uf: 'SP', cityState: 'São Paulo/SP', portalContains: 'detran.sp.gov.br', addressContains: 'Rua Boa Vista, 209' },
  { autuador: 'DETRAN-RJ', uf: 'RJ', cityState: 'Rio de Janeiro/RJ', portalContains: 'detran.rj.gov.br', addressContains: 'Av. Presidente Vargas, 817' },
  { autuador: 'DETRAN-MG', uf: 'MG', cityState: 'Belo Horizonte/MG', portalContains: 'detran.mg.gov.br', addressContains: 'Av. João Pinheiro, 417' },
  { autuador: 'PRF', uf: 'DF', cityState: 'Brasília/DF', portalContains: 'sistemas.prf.gov.br', addressContains: 'Setor Policial Sul' },
  { autuador: 'DNIT', uf: 'DF', cityState: 'Brasília/DF', portalContains: 'servicos.dnit.gov.br', addressContains: 'SAN Quadra 3' },
  { autuador: 'CET-SP / DSV', uf: 'SP', cityState: 'São Paulo/SP', portalContains: 'dsv.prefeitura.sp.gov.br', addressContains: 'Rua Sumidouro, 740' },
  { autuador: 'DER-SP', uf: 'SP', cityState: 'São Paulo/SP', portalContains: 'der.sp.gov.br', addressContains: 'Av. do Estado, 777' },
];

const PROCEDURES: string[] = [
  'recurso_jari', 'recurso_cetran', 'conversao_advertencia', 'indicacao_condutor',
  'suspensao_cnh', 'cassacao_cnh', 'processo_suspensao', 'processo_cassacao',
] as const;

describe.each(ORGANS)('fluxo órgão $autuador ($uf)', ({ autuador, uf, cityState, portalContains, addressContains }) => {
  it('análise preserva órgão autuador (sem fallback)', () => {
    const analysis = ExpertRuleEngine.evaluate('case_x', makeInfraction({ autuadorBody: autuador }));
    expect(analysis.competentBody).toBe(autuador);
    expect(analysis.competentBody).not.toBe('DETRAN / JARI');
  });

  it('protocolInfo → portal e endereço do registry do órgão', () => {
    const info = resolveProtocolInfo(autuador);
    expect(info).not.toBeNull();
    expect(info!.portalUrl).toContain(portalContains);
    expect(info!.physicalAddress).toContain(addressContains);
  });

  it('minuta com dados reais preserva órgão, cidade e UF', () => {
    const draft = RagPipeline.generateDefenseDraft(
      'case_x',
      makeInfraction({ autuadorBody: autuador }),
      makeVehicle('ABC-1D23').plate,
      makeVehicle().brandModel,
      { name: 'João da Silva', cpf: '123.456.789-00', cnh: '12345678900', address: 'Rua das Flores, 123', cityState },
      analysisArgs(autuador),
      'recurso_jari',
    );
    expect(draft.fullDraftText).toContain(autuador.toUpperCase());
    expect(draft.fullDraftText).toContain(cityState);
    expect(draft.applicantCityState).toBe(cityState);
    expect(draft.protocolInfo?.portalUrl).toContain(portalContains);
  });

  it('UF vem da cidade/estado do usuário, nunca hardcoded', () => {
    const draft = DocumentAssemblyEngine.assemble({
      caseId: 'case_x',
      procedureType: 'recurso_jari',
      infraction: makeInfraction({ autuadorBody: autuador, location: `Via Principal, 100 - ${cityState}` }),
      vehicle: makeVehicle(),
      applicant: { name: 'J', cpf: '123.456.789-00', cnh: '12345678900', address: 'Rua X, 1', cityState },
      selectedArgumentIds: analysisArgs(autuador).map((a) => a.id),
    });
    expect(draft.fullDraftText).toContain(cityState);
    if (cityState !== 'São Paulo/SP') {
      expect(draft.fullDraftText).not.toContain('São Paulo/SP');
    }
  });
});

describe.each(PROCEDURES)('fluxo procedimento $procedure com dados reais', (procedure) => {
  it('gera minuta (template do procedimento) sem exceção', () => {
    const draft = RagPipeline.generateDefenseDraft(
      'case_p',
      makeInfraction({ autuadorBody: 'DETRAN-SP' }),
      'ABC-1D23',
      'Honda Civic',
      { name: 'João da Silva', cpf: '123.456.789-00', cnh: '12345678900', address: 'Rua das Flores, 123', cityState: 'São Paulo/SP' },
      [],
      procedure as any,
    );
    expect(draft).toBeDefined();
    expect(draft.fullDraftText.length).toBeGreaterThan(200);
    expect(draft.validation.isValid).toBe(true);
  });
});

/** Argumentos recomendados pela análise (para dados completos de radar). */
function analysisArgs(autuador: string) {
  const analysis = ExpertRuleEngine.evaluate('case_x', makeInfraction({ autuadorBody: autuador }));
  return analysis.recommendedArguments;
}