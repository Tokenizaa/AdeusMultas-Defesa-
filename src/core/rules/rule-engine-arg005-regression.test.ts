import { describe, expect, it } from 'vitest';
import { classifyInfraction } from './infraction-classifier';
import { ExpertRuleEngine } from './rule-engine';

const SPEED_CODES = ['745-50', '746-30', '745-70', '747-10'] as const;

const validInfraction = {
  aitNumber: 'AIT-ARG005-REGRESSION',
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

describe('ARG-005 eligibility regression for speed infractions', () => {
  it.each(SPEED_CODES)('classifies code %s as exact excess-speed family', (infractionCode) => {
    const classification = classifyInfraction({ ...validInfraction, infractionCode });

    expect(classification.family).toBe('excesso_velocidade');
    expect(classification.basis).toBe('CATALOG_CODE');
    expect(classification.confidence).toBe('EXACT');
  });

  it.each(SPEED_CODES)('keeps ARG-005 eligible for code %s', (infractionCode) => {
    const classification = classifyInfraction({ ...validInfraction, infractionCode });
    expect(classification.eligibleArgumentIds).toContain('ARG-005');
  });

  it('surfaces a legitimate ARG-005 finding instead of discarding it as ineligible', () => {
    const infraction = {
      ...validInfraction,
      infractionCode: '746-30',
      ctbArticle: 'Art. 218, II do CTB',
      severity: 'grave' as const,
      points: 5,
      fineAmount: 195.23,
      consideredSpeed: 73,
    };
    const result = ExpertRuleEngine.evaluate('case_arg005_inconsistent', infraction);
    const speedRule = result.evaluatedRules.find((rule) => rule.ruleId === 'RULE_INMETRO_CONSIDERED_SPEED_ERROR');

    expect(speedRule?.status).toBe('FAIL');
    expect(result.detectedInconsistencies.some((item) => item.legalArgumentId === 'ARG-005')).toBe(true);
    expect(result.recommendedArguments.some((argument) => argument.id === 'ARG-005')).toBe(true);
    expect(result.evaluatedRules.some((rule) =>
      rule.status === 'NOT_APPLICABLE' &&
      rule.reason?.includes('Tese ARG-005 inelegível para família "excesso_velocidade"')
    )).toBe(false);
  });

  it('handles the exact production code 745-50 without an eligibility rejection', () => {
    const infraction = {
      ...validInfraction,
      infractionCode: '745-50',
      ctbArticle: 'Art. 218, I do CTB',
      consideredSpeed: 60,
    };
    const result = ExpertRuleEngine.evaluate('case_arg005_production_74550', infraction);
    const speedRule = result.evaluatedRules.find((rule) => rule.ruleId === 'RULE_INMETRO_CONSIDERED_SPEED_ERROR');

    expect(classifyInfraction(infraction).eligibleArgumentIds).toContain('ARG-005');
    expect(speedRule?.status).toBe('FAIL');
    expect(result.recommendedArguments.some((argument) => argument.id === 'ARG-005')).toBe(true);
    expect(result.evaluatedRules.some((rule) =>
      rule.status === 'NOT_APPLICABLE' &&
      rule.reason?.includes('Tese ARG-005 inelegível para família "excesso_velocidade"')
    )).toBe(false);
  });

  it('labels a notification deadline finding as preliminary until official documents are checked', () => {
    const infraction = {
      ...validInfraction,
      infractionCode: '745-50',
      dateTime: '2026-01-15T10:30:00',
      notificationExpeditionDate: '2026-03-04',
    };
    const result = ExpertRuleEngine.evaluate('case_deadline_preliminary_wording', infraction);
    const deadlineRule = result.evaluatedRules.find((rule) => rule.ruleId === 'RULE_DECADENCIA_30_DIAS');

    expect(deadlineRule?.reason).toContain('indício preliminar');
    expect(deadlineRule?.reason).toContain('confirme a data oficial de expedição');
  });

  it('does not recommend ARG-005 when considered speed and ticket bracket are consistent', () => {
    const result = ExpertRuleEngine.evaluate('case_arg005_consistent', validInfraction);
    const speedRule = result.evaluatedRules.find((rule) => rule.ruleId === 'RULE_INMETRO_CONSIDERED_SPEED_ERROR');

    expect(speedRule?.status).toBe('PASS');
    expect(result.detectedInconsistencies.some((item) => item.legalArgumentId === 'ARG-005')).toBe(false);
    expect(result.recommendedArguments.some((argument) => argument.id === 'ARG-005')).toBe(false);
  });

  it('does not describe a preliminary finding as sufficient legal and technical grounds to file', () => {
    const infraction = {
      ...validInfraction,
      dateTime: '2026-01-15T10:30:00',
      notificationExpeditionDate: '2026-03-04',
    };
    const result = ExpertRuleEngine.evaluate('case_summary_preliminary_finding', infraction);

    expect(result.summaryReasoning).toContain('hipóteses preliminares');
    expect(result.summaryReasoning).toContain('não comprovam, por si só');
    expect(result.summaryReasoning).toContain('Confira os documentos oficiais');
    expect(result.summaryReasoning).not.toContain('Há fundamentação legal e técnica para protocolo');
  });

  it('marks a no-findings result as inconclusive when required data is missing', () => {
    const infraction = {
      ...validInfraction,
      hasPreviousInfractionsLast12Months: undefined,
      radarCalibrationDate: undefined,
      inmetroAferitionDate: undefined,
    };
    const result = ExpertRuleEngine.evaluate('case_summary_no_findings_with_gaps', infraction);

    expect(result.detectedInconsistencies).toHaveLength(0);
    expect((result.dataGaps ?? []).length).toBeGreaterThan(0);
    expect(result.summaryReasoning).toContain('ficou inconclusiva');
    expect(result.summaryReasoning).toContain('não foi possível avaliar');
    expect(result.summaryReasoning).toContain('A ausência de achados confirmados não significa que a autuação esteja correta');
    expect(result.summaryReasoning).not.toContain('não identificou inconsistências jurídicas');
  });

  it('records required speed data as a gap instead of a clean PASS', () => {
    const infraction = { ...validInfraction, consideredSpeed: undefined };
    const result = ExpertRuleEngine.evaluate('case_speed_required_data_gap', infraction);
    const speedRule = result.evaluatedRules.find((rule) => rule.ruleId === 'RULE_INMETRO_CONSIDERED_SPEED_ERROR');

    expect(speedRule?.status).toBe('DATA_GAP');
    expect(speedRule?.status).not.toBe('PASS');
    expect(result.dataGaps?.some((gap) => gap.ruleId === 'RULE_INMETRO_CONSIDERED_SPEED_ERROR')).toBe(true);
  });

  it('does not emit the exact ineligibility message for ARG-005 in the current catalog', () => {
    const result = ExpertRuleEngine.evaluate('case_arg005_message_guard', validInfraction);
    const messages = result.evaluatedRules.filter((rule) =>
      rule.status === 'NOT_APPLICABLE' &&
      rule.reason?.includes('Tese ARG-005 inelegível para família "excesso_velocidade"')
    );

    expect(messages).toHaveLength(0);
  });
});
