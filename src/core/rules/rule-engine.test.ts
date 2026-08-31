import { describe, it, expect } from 'vitest';
import { ExpertRuleEngine } from './rule-engine';

describe('ExpertRuleEngine validation', () => {
  const validInfraction = {
    aitNumber: 'AIT-123456',
    infractionCode: '745-50',
    description: 'Excesso de velocidade',
    ctbArticle: 'Art. 218, I do CTB',
    severity: 'media' as const,
    points: 4,
    fineAmount: 130.16,
    autuadorBody: 'DETRAN-SP',
    dateTime: '2026-01-15T10:30:00',
    location: 'Av. Paulista, 1000',
    speedLimit: 60,
    measuredSpeed: 78,
    consideredSpeed: 71,
  };

  it('should evaluate successfully with valid infraction', () => {
    const result = ExpertRuleEngine.evaluate('case_123', validInfraction);
    expect(result).toBeDefined();
    expect(result.caseId).toBe('case_123');
    expect(result.competentBody).toBe('DETRAN-SP');
    expect(result.overallSuccessRate).toBeGreaterThanOrEqual(25);
    expect(result.overallSuccessRate).toBeLessThanOrEqual(99);
  });

  it('should throw Error when autuadorBody is missing', () => {
    const invalidInfraction = { ...validInfraction, autuadorBody: '' };
    
    expect(() => ExpertRuleEngine.evaluate('case_123', invalidInfraction))
      .toThrow('autuadorBody obrigatório para avaliação do motor de regras');
  });

  it('should throw Error when autuadorBody is undefined', () => {
    const invalidInfraction = { ...validInfraction, autuadorBody: undefined as any };
    
    expect(() => ExpertRuleEngine.evaluate('case_123', invalidInfraction))
      .toThrow('autuadorBody obrigatório para avaliação do motor de regras');
  });

  it('should not use fallback DETRAN / JARI for competentBody', () => {
    const autuadores = ['DETRAN-SP', 'DETRAN-RJ', 'PRF', 'DNIT', 'CET-SP / DSV', 'DER-SP', 'DETRAN-MG'];
    
    for (const autuador of autuadores) {
      const result = ExpertRuleEngine.evaluate('case_123', { ...validInfraction, autuadorBody: autuador });
      expect(result.competentBody).toBe(autuador);
      expect(result.competentBody).not.toBe('DETRAN / JARI');
    }
  });

  it('should detect radar calibration rule for speed infractions', () => {
    const infractionWithOldCalibration = {
      ...validInfraction,
      inmetroAferitionDate: '2024-01-01', // More than 12 months ago
      radarEquipmentId: 'RADAR-001',
    };
    
    const result = ExpertRuleEngine.evaluate('case_123', infractionWithOldCalibration);
    const hasRadarRule = result.detectedInconsistencies.some(i => i.legalArgumentId === 'ARG-001');
    expect(hasRadarRule).toBe(true);
  });

  it('should detect conversion to warning for eligible infractions', () => {
    const lightInfraction = {
      ...validInfraction,
      infractionCode: '735-80',
      severity: 'leve' as const,
      points: 3,
      hasPreviousInfractionsLast12Months: false,
    };
    
    const result = ExpertRuleEngine.evaluate('case_123', lightInfraction);
    const hasConversionRule = result.detectedInconsistencies.some(i => i.legalArgumentId === 'ARG-051');
    expect(hasConversionRule).toBe(true);
    expect(result.recommendedProcedure).toBe('conversao_advertencia');
  });

  it('should always include constitutional due process argument', () => {
    const result = ExpertRuleEngine.evaluate('case_123', validInfraction);
    const hasConstArg = result.recommendedArguments.some(a => a.id === 'ARG-049');
    expect(hasConstArg).toBe(true);
  });

  // ===== Fase 2: FAIL CLOSED — dados insuficientes nunca viram vício =====

  it('should NOT conclude Lei Seca termo vício without data (FAIL CLOSED + DATA_INSUFFICIENT)', () => {
    const leiSeca = { ...validInfraction, infractionCode: '516-91' };
    const result = ExpertRuleEngine.evaluate('case_124', leiSeca);
    const termoVicio = result.detectedInconsistencies.find(i => i.legalArgumentId === 'ARG-025');
    expect(termoVicio).toBeUndefined();
    const gap = result.dataGaps?.find(g => g.ruleId === 'RULE_LEI_SECA_TERMO_432');
    expect(gap).toBeDefined();
    expect(gap?.missingData).toContain('hasPsychomotorTerm');
  });

  it('should detect Lei Seca termo vício ONLY when data confirms absence (ARG-025)', () => {
    const leiSeca = { ...validInfraction, infractionCode: '516-91', hasPsychomotorTerm: false };
    const result = ExpertRuleEngine.evaluate('case_125', leiSeca);
    const ids = result.detectedInconsistencies.map(i => i.legalArgumentId);
    expect(ids).toContain('ARG-025');
    expect(ids).not.toContain('ARG-010'); // semáforo não pode aparecer em Lei Seca
  });

  it('should NOT detect MBFT sem-abordagem without observations data', () => {
    const celular = { ...validInfraction, infractionCode: '736-62' };
    const result = ExpertRuleEngine.evaluate('case_126', celular);
    expect(result.detectedInconsistencies.some(i => i.legalArgumentId === 'ARG-015')).toBe(false);
    expect(result.dataGaps?.some(g => g.ruleId === 'RULE_AUTUACAO_SEM_ABORDAGEM_MBFT')).toBe(true);
  });

  it('should detect MBFT sem-abordagem when observations confirmed absent (ARG-015)', () => {
    const celular = { ...validInfraction, infractionCode: '736-62', hasAgentDetailedObservations: false };
    const result = ExpertRuleEngine.evaluate('case_127', celular);
    const ids = result.detectedInconsistencies.map(i => i.legalArgumentId);
    expect(ids).toContain('ARG-015');
    expect(ids).not.toContain('ARG-006'); // foto múltiplos veículos não se aplica a celular
  });

  it('should NOT grant conversion when record data is missing (no invented clean record)', () => {
    const light = { ...validInfraction, infractionCode: '735-80', severity: 'leve' as const, points: 3 };
    const result = ExpertRuleEngine.evaluate('case_128', light);
    expect(result.detectedInconsistencies.some(i => i.legalArgumentId === 'ARG-051')).toBe(false);
    expect(result.dataGaps?.some(g => g.ruleId === 'RULE_CONVERSAO_ADVERTENCIA_267')).toBe(true);
  });

  it('should not map rules to semáforo/celular/radar-foto arguments by mistake', () => {
    const radar = { ...validInfraction, measuredSpeed: 90, consideredSpeed: 80, speedLimit: 80 };
    const result = ExpertRuleEngine.evaluate('case_129', radar);
    const ids = result.detectedInconsistencies.map(i => i.legalArgumentId);
    // ARG-009 (semáforo retenção), ARG-013 (semáforo defeito) e ARG-010 (amarelo)
    // nunca podem ser produzidos por regras de velocidade/Medida INMETRO.
    expect(ids).not.toContain('ARG-009');
    expect(ids).not.toContain('ARG-013');
    expect(ids).not.toContain('ARG-010');
  });

  it('should not invent a defense deadline when the notification has none', () => {
    const result = ExpertRuleEngine.evaluate('case_130', validInfraction);
    expect(result.procedureDeadline).toBeUndefined();
  });
});