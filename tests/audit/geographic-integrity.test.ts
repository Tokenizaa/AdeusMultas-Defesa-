/**
 * geographic-integrity — isolamento total entre casos.
 * Sequência SP → RJ → SP → PR → RJ → SP: cada caso deve reter
 * seu próprio órgão/cidade/UF/portal. Contaminação = falha.
 */
import { describe, it, expect } from 'vitest';
import { RagPipeline } from '../../src/core/rag/rag-pipeline';
import { resolveProtocolInfo } from '../../src/core/legal-base/organs';
import { makeInfraction } from './helpers';

const seq = [
  { id: 'c1', autuador: 'DETRAN-SP', cityState: 'São Paulo/SP', portal: 'detran.sp.gov.br' },
  { id: 'c2', autuador: 'DETRAN-RJ', cityState: 'Rio de Janeiro/RJ', portal: 'detran.rj.gov.br' },
  { id: 'c3', autuador: 'DETRAN-SP', cityState: 'São Paulo/SP', portal: 'detran.sp.gov.br' },
  { id: 'c4', autuador: 'DETRAN-PR', cityState: 'Curitiba/PR', portal: 'detran.pr.gov.br' },
  { id: 'c5', autuador: 'DETRAN-RJ', cityState: 'Rio de Janeiro/RJ', portal: 'detran.rj.gov.br' },
  { id: 'c6', autuador: 'DETRAN-SP', cityState: 'São Paulo/SP', portal: 'detran.sp.gov.br' },
];

describe('geographic-integrity: cada caso é independente', () => {
  it.each(seq)('caso $id ($autuador) mantém seu órgão e portal', ({ autuador, cityState, portal }) => {
    const info = resolveProtocolInfo(autuador);
    const draft = RagPipeline.generateDefenseDraft(
      'case_' + autuador,
      makeInfraction({ autuadorBody: autuador, aitNumber: 'AIT-' + autuador.replace(/[^A-Z]/gi, '') }),
      'ABC-1D23',
      'Honda Civic',
      { name: 'João da Silva', cpf: '123.456.789-00', cnh: '12345678900', address: 'Rua das Flores, 123', cityState },
      [],
      'recurso_jari',
    );
    // órgão e cidade do próprio caso
    expect(draft.fullDraftText).toContain(autuador.toUpperCase());
    expect(draft.fullDraftText).toContain(cityState);
    // portal do próprio órgão (ou ausência limpa p/ órgão não registrado)
    if (portal) {
      expect(draft.protocolInfo?.portalUrl).toContain(portal);
    } else {
      expect(draft.protocolInfo).toBeNull();
    }
  });

  it('SP após RJ não herda portal/endereço do RJ', () => {
    // caso RJ primeiro
    const rj = RagPipeline.generateDefenseDraft(
      'case_rj',
      makeInfraction({ autuadorBody: 'DETRAN-RJ', aitNumber: 'AIT-RJ' }),
      'RJX-2222',
      'Honda Civic',
      { name: 'Maria', cpf: '987.654.321-00', cnh: '99887766554', address: 'Av. Atlântica, 100', cityState: 'Rio de Janeiro/RJ' },
      [],
      'recurso_jari',
    );
    expect(rj.protocolInfo?.portalUrl).toContain('detran.rj.gov.br');
    expect(rj.fullDraftText).toContain('Rio de Janeiro/RJ');

    // caso SP em seguida
    const sp = RagPipeline.generateDefenseDraft(
      'case_sp',
      makeInfraction({ autuadorBody: 'DETRAN-SP', aitNumber: 'AIT-SP' }),
      'SPX-1111',
      'Honda Civic',
      { name: 'João', cpf: '123.456.789-00', cnh: '12345678900', address: 'Rua das Flores, 123', cityState: 'São Paulo/SP' },
      [],
      'recurso_jari',
    );
    expect(sp.protocolInfo?.portalUrl).toContain('detran.sp.gov.br');
    expect(sp.protocolInfo?.portalUrl).not.toContain('detran.rj.gov.br');
    expect(sp.fullDraftText).toContain('São Paulo/SP');
    expect(sp.fullDraftText).not.toContain('Rio de Janeiro/RJ');
  });

  it('caso com órgão fora do registry não recebe portal alheio (sem contaminação)', () => {
    const unknown = RagPipeline.generateDefenseDraft(
      'case_unknown',
      makeInfraction({ autuadorBody: 'ORGAO_INEXISTENTE', aitNumber: 'AIT-UNK' }),
      'UNK-3333',
      'Honda Civic',
      { name: 'Ana', cpf: '111.222.333-44', cnh: '11122233344', address: 'Rua Desconhecida, 50', cityState: 'Desconhecida/XX' },
      [],
      'recurso_jari',
    );
    expect(unknown.protocolInfo).toBeNull();
    const info = resolveProtocolInfo('ORGAO_INEXISTENTE');
    expect(info).toBeNull();
  });
});
