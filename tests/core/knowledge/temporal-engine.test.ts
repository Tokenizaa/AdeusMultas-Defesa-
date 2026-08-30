import { describe, it, expect } from 'vitest';
import { TemporalKnowledgeEngine } from '../../../src/core/knowledge/temporal-engine';

describe('Temporal Knowledge Engine & Versioning', () => {
  it('must resolve effective organ and CETRAN based on UF and date', () => {
    const result = TemporalKnowledgeEngine.getEffectiveKnowledge({
      uf: 'RJ',
      infractionDate: '2026-04-15',
    });

    expect(result.organ).not.toBeNull();
    expect(result.organ?.abbreviation).toBe('DETRAN-RJ');
    expect(result.cetran).not.toBeNull();
    expect(result.cetran?.abbreviation).toBe('CETRAN-RJ');
    expect(result.state?.capital).toBe('Rio de Janeiro');
    expect(result.isHistoricRule).toBe(false);
    expect(result.effectiveDateUsed).toBe('2026-04-15');
    expect(result.standardDeadlineDays).toBe(30);
  });

  it('must flag historical infraction dates prior to 2026', () => {
    const result = TemporalKnowledgeEngine.getEffectiveKnowledge({
      uf: 'SP',
      infractionDate: '2024-11-20',
    });

    expect(result.isHistoricRule).toBe(true);
    expect(result.organ?.state).toBe('SP');
  });

  it('must find organ valid at target date', () => {
    const organ = TemporalKnowledgeEngine.findOrganValidAtDate('DETRAN-SP', '2026-06-01');
    expect(organ).not.toBeNull();
    expect(organ?.abbreviation).toBe('DETRAN-SP');
  });

  it('must resolve CONTRANDIFE for DF infractions', () => {
    const result = TemporalKnowledgeEngine.getEffectiveKnowledge({
      uf: 'DF',
      infractionDate: '2026-03-01',
    });

    expect(result.cetran?.id).toBe('CONTRANDIFE_DF');
    expect(result.cetran?.abbreviation).toBe('CONTRANDIFE');
  });
});
