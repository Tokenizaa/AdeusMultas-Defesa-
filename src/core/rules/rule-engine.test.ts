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
});