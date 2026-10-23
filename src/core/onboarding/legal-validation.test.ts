/**
 * Teste de validação jurídica substancial das teses do onboarding.
 *
 * Objetivo: comprovar que cada afirmação jurídica renderizada ao usuário tem
 * lastro em fonte oficial (CTB, Resolução CONTRAN), dispositivo aplicável,
 * vigência, fatos do caso e limitações. Não se considera uma referência
 * correta apenas porque existe no catálogo de argumentos.
 *
 * Execução: npm run test (vitest).
 */

import { describe, expect, it } from 'vitest';
import {
  validateLegalThesis,
  validateAllTheses,
  summarizeLegalValidation,
  LEGAL_THESES_VALIDATION,
} from './legal-validation';
import type { CaseAnalysis } from '../../../types';

// ---------------------------------------------------------------------------
// Fixtures de análise
// ---------------------------------------------------------------------------

const analysisWithArg051AndFacts: CaseAnalysis = {
  id: 'an_legal_001',
  caseId: 'case_legal_001',
  createdAt: new Date().toISOString(),
  overallSuccessRate: 94,
  detectedInconsistencies: [
    {
      ruleId: 'RULE_CONVERSAO_ADVERTENCIA_267',
      title: 'Conversão em Advertência por Escrito (Art. 267 CTB)',
      description: 'Infração de natureza leve ou média sem reincidência no prontuário nos últimos 12 meses é candidata à conversão em advertência por escrito.',
      severity: 'alta',
      legalArgumentId: 'ARG-051',
      impact: 'Conversão em advertência por escrito: sem multa e sem pontuação, se confirmada pelo órgão autuador e comprovado o prontuário.',
      statutoryBasis: 'Artigo 267 do CTB (Redação pela Lei nº 14.071/2020)',
    },
  ],
  recommendedArguments: [
    {
      id: 'ARG-051',
      title: 'Conversão em Advertência por Escrito (Art. 267 CTB)',
      legalBase: 'Art. 267 do CTB (Lei 14.071/2020)',
      requiredDocuments: ['Extrato de prontuário de CNH'],
    },
  ],
  recommendedProcedure: 'conversao_advertencia',
  competentBody: 'DETRAN-SP',
  summaryReasoning:
    'A infração é de natureza média e o condutor declara não ter reincidência nos últimos 12 meses.',
} as any;

const analysisWithArg001: CaseAnalysis = {
  id: 'an_legal_002',
  caseId: 'case_legal_002',
  createdAt: new Date().toISOString(),
  overallSuccessRate: 92,
  detectedInconsistencies: [
    {
      ruleId: 'RULE_INMETRO_CONSIDERED_SPEED_ERROR',
      title: 'Erro na Medida Considerada pelo INMETRO',
      description: 'Verifica se a velocidade considerada foi corretamente calculada.',
      severity: 'alta',
      legalArgumentId: 'ARG-001',
      impact: 'Radar com vistoria vencida.',
      statutoryBasis: 'Resolução CONTRAN nº 798/2020',
    },
  ],
  recommendedArguments: [
    {
      id: 'ARG-001',
      title: 'O radar estava com a medição válida na data da infração?',
      legalBase: 'Resolução CONTRAN nº 798/2020, art. 4º, III',
      requiredDocuments: ['Certidão do INMETRO'],
    },
  ],
  recommendedProcedure: 'defesa_previa',
  competentBody: 'DETRAN-SP',
  summaryReasoning: 'O radar não tinha vistoria em dia.',
} as any;

const analysisWithUnknownThesis: CaseAnalysis = {
  id: 'an_legal_003',
  caseId: 'case_legal_003',
  createdAt: new Date().toISOString(),
  overallSuccessRate: 50,
  detectedInconsistencies: [],
  recommendedArguments: [
    {
      id: 'ARG-999',
      title: 'Tese não mapeada',
      legalBase: 'Não especificada',
      requiredDocuments: [],
    },
  ],
  recommendedProcedure: 'defesa_previa',
  competentBody: 'DETRAN-SP',
  summaryReasoning: '',
} as any;

const analysisWithNoArguments: CaseAnalysis = {
  id: 'an_legal_004',
  caseId: 'case_legal_004',
  createdAt: new Date().toISOString(),
  overallSuccessRate: 35,
  detectedInconsistencies: [],
  recommendedArguments: [],
  recommendedProcedure: 'defesa_previa',
  competentBody: 'DETRAN-SP',
  summaryReasoning: '',
} as any;

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('Validação jurídica — LEGAL_THESES_VALIDATION', () => {
  it('contém critérios para as teses principais (ARG-051, ARG-001, ARG-002, ARG-005, ARG-048, ARG-025, ARG-015)', () => {
    for (const thesisId of [
      'ARG-051',
      'ARG-001',
      'ARG-002',
      'ARG-005',
      'ARG-048',
      'ARG-025',
      'ARG-015',
      'RULE_CONSTITUTIONAL_DUE_PROCESS',
    ]) {
      expect(LEGAL_THESES_VALIDATION[thesisId]).toBeDefined();
      expect(LEGAL_THESES_VALIDATION[thesisId]!.source.name).toBeTruthy();
      expect(LEGAL_THESES_VALIDATION[thesisId]!.source.device).toBeTruthy();
      expect(LEGAL_THESES_VALIDATION[thesisId]!.source.inForce).toBe(true);
      expect(LEGAL_THESES_VALIDATION[thesisId]!.requiredFacts.length).toBeGreaterThan(0);
      expect(LEGAL_THESES_VALIDATION[thesisId]!.limitations.length).toBeGreaterThan(0);
    }
  });

  it('ARG-051 tem fonte oficial CTB Art. 267 com Lei 14.071/2020', () => {
    const criteria = LEGAL_THESES_VALIDATION['ARG-051'];
    expect(criteria.source.name).toContain('CTB');
    expect(criteria.source.device).toContain('Art. 267');
    expect(criteria.source.device).toContain('14.071/2020');
    expect(criteria.source.inForce).toBe(true);
  });

  it('ARG-001 tem fonte oficial Resolução CONTRAN 798/2020', () => {
    const criteria = LEGAL_THESES_VALIDATION['ARG-001'];
    expect(criteria.source.name).toContain('CONTRAN');
    expect(criteria.source.name).toContain('798/2020');
    expect(criteria.source.inForce).toBe(true);
  });

  it('ARG-048 tem fonte oficial CTB Art. 281, §1º, II', () => {
    const criteria = LEGAL_THESES_VALIDATION['ARG-048'];
    expect(criteria.source.name).toContain('CTB');
    expect(criteria.source.device).toContain('281');
    expect(criteria.source.inForce).toBe(true);
  });
});

describe('validateLegalThesis', () => {
  it('retorna veredito "valid" para ARG-051 com fatos na análise', () => {
    const result = validateLegalThesis(
      'ARG-051',
      'Conversão em Advertência por Escrito (Art. 267 CTB)',
      analysisWithArg051AndFacts,
    );
    expect(result.thesisId).toBe('ARG-051');
    expect(result.source.name).toContain('CTB');
    expect(result.verdict).toBe('valid');
    expect(result.rationale).toContain('lastro na fonte oficial');
  });

  it('retorna veredito "unverified" para tese não mapeada (ARG-999)', () => {
    const result = validateLegalThesis(
      'ARG-999',
      'Tese não mapeada',
      analysisWithUnknownThesis,
    );
    expect(result.verdict).toBe('unverified');
    expect(result.rationale).toContain('Não há critério');
  });

  it('inclui limitações para ARG-051 (órgão autuador, prontuário, autodeclaração)', () => {
    const result = validateLegalThesis(
      'ARG-051',
      'Conversão em Advertência por Escrito (Art. 267 CTB)',
      analysisWithArg051AndFacts,
    );
    expect(result.limitations.length).toBeGreaterThan(0);
    const limitationsText = result.limitations.join(' ');
    expect(limitationsText).toContain('órgão autuador');
    expect(limitationsText).toContain('prontuário');
  });
});

describe('validateAllTheses', () => {
  it('valida todas as teses de uma análise com ARG-051', () => {
    const results = validateAllTheses(analysisWithArg051AndFacts);
    expect(results.length).toBe(1);
    expect(results[0].thesisId).toBe('ARG-051');
    expect(results[0].verdict).toBe('valid');
  });

  it('valida todas as teses de uma análise com ARG-001', () => {
    const results = validateAllTheses(analysisWithArg001);
    expect(results.length).toBe(1);
    expect(results[0].thesisId).toBe('ARG-001');
  });

  it('marca tese não mapeada como unverified', () => {
    const results = validateAllTheses(analysisWithUnknownThesis);
    expect(results.length).toBe(1);
    expect(results[0].verdict).toBe('unverified');
  });

  it('retorna array vazio para análise sem argumentos', () => {
    const results = validateAllTheses(analysisWithNoArguments);
    expect(results.length).toBe(0);
  });
});

describe('summarizeLegalValidation', () => {
  it('resume corretamente múltiplos resultados', () => {
    const r1 = validateLegalThesis('ARG-051', 'Claim A', analysisWithArg051AndFacts);
    const r2 = validateLegalThesis('ARG-001', 'Claim B', analysisWithArg001);
    const r3 = validateLegalThesis('ARG-999', 'Claim C', analysisWithUnknownThesis);
    const summary = summarizeLegalValidation([r1, r2, r3]);
    expect(summary.total).toBe(3);
    expect(summary.valid).toBe(2);
    expect(summary.unverified).toBe(1);
    expect(summary.byThesis['ARG-051'].verdict).toBe('valid');
    expect(summary.byThesis['ARG-999'].verdict).toBe('unverified');
  });
});
