/**
 * @file reference-cases.ts
 * Casos de referência para os 7 serviços/procedimentos do onboarding.
 *
 * Cada caso registra: procedimento, situação, dados de entrada (completos /
 * ausentes / contraditórios), teses esperadas, e se o cenário é executável
 * no ambiente atual (requer PLAYWRIGHT_BASE_URL + E2E_ALLOW_PERSISTENT_WRITES
 * para E2E contra produção).
 *
 * Este arquivo é usado pelos testes de regressão e pelo relatório de validação.
 * Não altera o comportamento de produção.
 */

import type { CaseAnalysis } from '../../types';

/** Tipo de cenário de teste. */
export type ScenarioType =
  | 'completos'
  | 'dados_ausentes'
  | 'evidencias_contraditorias'
  | 'sem_tese_defensiva';

/** Caso de referência para um procedimento. */
export interface ReferenceCase {
  procedure: string;
  situation: string;
  stage: string;
  category: string;
  scenario: ScenarioType;
  infractionData: Record<string, unknown>;
  expectedThesis?: string;
  expectedArgumentsCount: number;
  executable: boolean;
  blocker?: string;
}

/** Sete serviços/procedimentos do onboarding (conforme mapeamento em rules-matrix.ts). */
export const PROCEDURES: string[] = [
  'defesa_previa',
  'recurso_jari',
  'recurso_cetran',
  'suspensao_cnh',
  'cassacao_cnh',
  'indicacao_condutor',
  'conversao_advertencia',
];

/**
 * Gera casos de referência para os 7 procedimentos, cobrindo:
 * - dados completos (tese defensiva sustentada)
 * - dados ausentes (campos obrigatórios faltando)
 * - evidências contraditórias (ex: velocidade medida < considerada)
 * - ausência de tese defensiva sustentada (caso sem argumentos)
 */
export function generateReferenceCases(): ReferenceCase[] {
  const cases: ReferenceCase[] = [];

  // ── 1. defesa_previa (primeira_notificacao / excesso_velocidade) ──
  cases.push({
    procedure: 'defesa_previa',
    situation: 'multa_transito',
    stage: 'primeira_notificacao',
    category: 'excesso_velocidade',
    scenario: 'completos',
    infractionData: {
      infractionCode: '745-50',
      ctbArticle: 'Art. 218, II, CTB',
      severity: 'media',
      points: 4,
      fineAmount: 130.16,
      measuredSpeed: 73,
      consideredSpeed: 66,
      speedLimit: 60,
      inmetroAferitionDate: '2023-01-15',
      hasR19SignageProof: false,
      notificationExpeditionDate: '2026-09-15T00:00:00Z',
      defenseDeadline: '2026-10-15T00:00:00Z',
      dateTime: '2026-09-10T14:30:00Z',
      location: 'Av. Paulista, 1000 - São Paulo/SP',
      autuadorBody: 'DETRAN-SP',
      aitNumber: 'AIT-REF-001',
    },
    expectedThesis: 'ARG-001',
    expectedArgumentsCount: 2,
    executable: false,
    blocker: 'PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados.',
  });

  cases.push({
    procedure: 'defesa_previa',
    situation: 'multa_transito',
    stage: 'primeira_notificacao',
    category: 'excesso_velocidade',
    scenario: 'dados_ausentes',
    infractionData: {
      infractionCode: '745-50',
      severity: 'media',
      dateTime: '2026-09-10T14:30:00Z',
      location: 'Av. Paulista, 1000 - São Paulo/SP',
      autuadorBody: 'DETRAN-SP',
      aitNumber: 'AIT-REF-002',
    },
    expectedThesis: undefined,
    expectedArgumentsCount: 0,
    executable: false,
    blocker: 'PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados.',
  });

  cases.push({
    procedure: 'defesa_previa',
    situation: 'multa_transito',
    stage: 'primeira_notificacao',
    category: 'excesso_velocidade',
    scenario: 'evidencias_contraditorias',
    infractionData: {
      infractionCode: '745-50',
      severity: 'media',
      measuredSpeed: 66,
      consideredSpeed: 73, // considerada maior que a medida → contradição
      speedLimit: 60,
      dateTime: '2026-09-10T14:30:00Z',
      location: 'Av. Paulista, 1000 - São Paulo/SP',
      autuadorBody: 'DETRAN-SP',
      aitNumber: 'AIT-REF-003',
    },
    expectedThesis: 'ARG-005',
    expectedArgumentsCount: 1,
    executable: false,
    blocker: 'PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados.',
  });

  cases.push({
    procedure: 'defesa_previa',
    situation: 'multa_transito',
    stage: 'primeira_notificacao',
    category: 'excesso_velocidade',
    scenario: 'sem_tese_defensiva',
    infractionData: {
      infractionCode: '746-30', // excesso > 50% (gravíssima) — sem tese de advertência
      severity: 'gravissima',
      measuredSpeed: 120,
      consideredSpeed: 115,
      speedLimit: 60,
      dateTime: '2026-09-10T14:30:00Z',
      location: 'Av. Paulista, 1000 - São Paulo/SP',
      autuadorBody: 'DETRAN-SP',
      aitNumber: 'AIT-REF-004',
    },
    expectedThesis: undefined,
    expectedArgumentsCount: 0,
    executable: false,
    blocker: 'PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados.',
  });

  // ── 2. recurso_jari (notificacao_penalidade) ──
  cases.push({
    procedure: 'recurso_jari',
    situation: 'multa_transito',
    stage: 'notificacao_penalidade',
    category: 'celular',
    scenario: 'completos',
    infractionData: {
      infractionCode: '736-62',
      ctbArticle: 'Art. 252, VI, CTB',
      severity: 'media',
      points: 4,
      fineAmount: 130.16,
      hasAgentDetailedObservations: false,
      cellphoneCircumstance: 'sem_abordagem',
      notificationExpeditionDate: '2026-08-01T00:00:00Z',
      defenseDeadline: '2026-08-31T00:00:00Z',
      dateTime: '2026-07-15T10:00:00Z',
      location: 'Av. das Nações Unidas, 5000 - São Paulo/SP',
      autuadorBody: 'CET-SP',
      aitNumber: 'AIT-REF-005',
    },
    expectedThesis: 'ARG-015',
    expectedArgumentsCount: 1,
    executable: false,
    blocker: 'PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados.',
  });

  // ── 3. recurso_cetran (recurso_jari_negado) ──
  cases.push({
    procedure: 'recurso_cetran',
    situation: 'multa_transito',
    stage: 'recurso_jari_negado',
    category: 'vermelho',
    scenario: 'completos',
    infractionData: {
      infractionCode: '605-01',
      ctbArticle: 'Art. 208, CTB',
      severity: 'gravissima',
      points: 7,
      fineAmount: 293.47,
      hasPhotoProof: false,
      yellowPhaseCrossing: true,
      notificationExpeditionDate: '2026-07-01T00:00:00Z',
      defenseDeadline: '2026-07-31T00:00:00Z',
      dateTime: '2026-06-15T08:00:00Z',
      location: 'Rua Augusta, 2000 - São Paulo/SP',
      autuadorBody: 'CETRAN-SP',
      aitNumber: 'AIT-REF-006',
    },
    expectedThesis: 'ARG-010',
    expectedArgumentsCount: 1,
    executable: false,
    blocker: 'PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados.',
  });

  // ── 4. suspensao_cnh (suspensao_cnh / lei_seca) ──
  cases.push({
    procedure: 'suspensao_cnh',
    situation: 'suspensao_cnh',
    stage: 'primeira_notificacao',
    category: 'lei_seca',
    scenario: 'completos',
    infractionData: {
      infractionCode: '757-90',
      ctbArticle: 'Art. 165-A, CTB',
      severity: 'gravissima',
      points: 7,
      fineAmount: 2934.70,
      refusedTest: true,
      hasPsychomotorTerm: false,
      notificationExpeditionDate: '2026-08-10T00:00:00Z',
      defenseDeadline: '2026-09-09T00:00:00Z',
      dateTime: '2026-08-05T22:00:00Z',
      location: 'Av. Ibirapuera, 3000 - São Paulo/SP',
      autuadorBody: 'DETRAN-SP',
      aitNumber: 'AIT-REF-007',
    },
    expectedThesis: 'ARG-025',
    expectedArgumentsCount: 1,
    executable: false,
    blocker: 'PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados.',
  });

  // ── 5. cassacao_cnh (cassacao_cnh) ──
  cases.push({
    procedure: 'cassacao_cnh',
    situation: 'cassacao_cnh',
    stage: 'primeira_notificacao',
    category: 'cnh_geral',
    scenario: 'sem_tese_defensiva',
    infractionData: {
      infractionCode: '757-90',
      ctbArticle: 'Art. 165-A, CTB',
      severity: 'gravissima',
      points: 7,
      fineAmount: 2934.70,
      refusedTest: true,
      hasPreviousInfractionsLast12Months: false,
      notificationExpeditionDate: '2026-08-10T00:00:00Z',
      defenseDeadline: '2026-09-09T00:00:00Z',
      dateTime: '2026-08-05T22:00:00Z',
      location: 'Av. Ibirapuera, 3000 - São Paulo/SP',
      autuadorBody: 'DETRAN-SP',
      aitNumber: 'AIT-REF-008',
    },
    expectedThesis: undefined,
    expectedArgumentsCount: 0,
    executable: false,
    blocker: 'PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados.',
  });

  // ── Cassação CNH — completos com tese de inocorrência de direção (ARG-045) ──
  cases.push({
    procedure: 'cassacao_cnh',
    situation: 'cassacao_cnh',
    stage: 'primeira_notificacao',
    category: 'cnh_geral',
    scenario: 'completos',
    infractionData: {
      infractionCode: '757-90',
      ctbArticle: 'Art. 165-A, CTB',
      severity: 'gravissima',
      points: 7,
      fineAmount: 2934.70,
      refusedTest: true,
      hasPreviousInfractionsLast12Months: false,
      thirdPartyDriverDeclaration: true, // condutor suspenso não dirigia; terceiro declarou direção
      notificationExpeditionDate: '2026-08-10T00:00:00Z',
      defenseDeadline: '2026-09-09T00:00:00Z',
      dateTime: '2026-08-05T22:00:00Z',
      location: 'Av. Ibirapuera, 3000 - São Paulo/SP',
      autuadorBody: 'DETRAN-SP',
      aitNumber: 'AIT-REF-029',
    },
    expectedThesis: 'ARG-045',
    expectedArgumentsCount: 1,
    executable: false,
    blocker: 'PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados.',
  });

  // ── 6. indicacao_condutor ──
  cases.push({
    procedure: 'indicacao_condutor',
    situation: 'indicacao_condutor',
    stage: 'primeira_notificacao',
    category: 'indicacao_condutor',
    scenario: 'completos',
    infractionData: {
      infractionCode: '745-50',
      ctbArticle: 'Art. 218, II, CTB',
      severity: 'media',
      points: 4,
      fineAmount: 130.16,
      realDriverName: 'JOÃO DA SILVA',
      realDriverCpf: '12345678901',
      realDriverCnh: '123456789012',
      indicationWithinDeadline: true,
      notificationExpeditionDate: '2026-09-01T00:00:00Z',
      defenseDeadline: '2026-09-30T00:00:00Z',
      dateTime: '2026-08-20T14:00:00Z',
      location: 'Av. Paulista, 1000 - São Paulo/SP',
      autuadorBody: 'DETRAN-SP',
      aitNumber: 'AIT-REF-009',
    },
    expectedThesis: undefined,
    expectedArgumentsCount: 0,
    executable: false,
    blocker: 'PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados.',
  });

  // ── 7. conversao_advertencia ──
  cases.push({
    procedure: 'conversao_advertencia',
    situation: 'conversao_advertencia',
    stage: 'conversao_advertencia',
    category: 'conversao_advertencia',
    scenario: 'completos',
    infractionData: {
      infractionCode: '735-80', // média
      ctbArticle: 'Art. 221, CTB',
      severity: 'media',
      points: 4,
      fineAmount: 130.16,
      hasPreviousInfractionsLast12Months: false,
      notificationExpeditionDate: '2026-09-01T00:00:00Z',
      defenseDeadline: '2026-09-30T00:00:00Z',
      dateTime: '2026-08-25T16:00:00Z',
      location: 'Rua Oscar Freire, 500 - São Paulo/SP',
      autuadorBody: 'DETRAN-SP',
      aitNumber: 'AIT-REF-010',
    },
    expectedThesis: 'ARG-051',
    expectedArgumentsCount: 1,
    executable: false,
    blocker: 'PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados.',
  });

  // ── Dados ausentes para todos os 7 procedimentos ──
  const incompleteCases: ReferenceCase[] = [
    {
      procedure: 'recurso_jari',
      situation: 'multa_transito',
      stage: 'notificacao_penalidade',
      category: 'celular',
      scenario: 'dados_ausentes',
      infractionData: {
        infractionCode: '736-62',
        severity: 'media',
        dateTime: '2026-07-15T10:00:00Z',
        location: 'Av. das Nações Unidas, 5000 - São Paulo/SP',
        autuadorBody: 'CET-SP',
        aitNumber: 'AIT-REF-011',
      },
      expectedThesis: undefined,
      expectedArgumentsCount: 0,
      executable: false,
      blocker: 'PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados.',
    },
    {
      procedure: 'recurso_cetran',
      situation: 'multa_transito',
      stage: 'recurso_jari_negado',
      category: 'vermelho',
      scenario: 'dados_ausentes',
      infractionData: {
        infractionCode: '605-01',
        severity: 'gravissima',
        dateTime: '2026-06-15T08:00:00Z',
        location: 'Rua Augusta, 2000 - São Paulo/SP',
        autuadorBody: 'CETRAN-SP',
        aitNumber: 'AIT-REF-012',
      },
      expectedThesis: undefined,
      expectedArgumentsCount: 0,
      executable: false,
      blocker: 'PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados.',
    },
    {
      procedure: 'suspensao_cnh',
      situation: 'suspensao_cnh',
      stage: 'primeira_notificacao',
      category: 'lei_seca',
      scenario: 'dados_ausentes',
      infractionData: {
        infractionCode: '757-90',
        severity: 'gravissima',
        dateTime: '2026-08-05T22:00:00Z',
        location: 'Av. Ibirapuera, 3000 - São Paulo/SP',
        autuadorBody: 'DETRAN-SP',
        aitNumber: 'AIT-REF-013',
      },
      expectedThesis: undefined,
      expectedArgumentsCount: 0,
      executable: false,
      blocker: 'PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados.',
    },
    {
      procedure: 'cassacao_cnh',
      situation: 'cassacao_cnh',
      stage: 'primeira_notificacao',
      category: 'cnh_geral',
      scenario: 'dados_ausentes',
      infractionData: {
        infractionCode: '757-90',
        severity: 'gravissima',
        dateTime: '2026-08-05T22:00:00Z',
        location: 'Av. Ibirapuera, 3000 - São Paulo/SP',
        autuadorBody: 'DETRAN-SP',
        aitNumber: 'AIT-REF-014',
      },
      expectedThesis: undefined,
      expectedArgumentsCount: 0,
      executable: false,
      blocker: 'PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados.',
    },
    {
      procedure: 'indicacao_condutor',
      situation: 'indicacao_condutor',
      stage: 'primeira_notificacao',
      category: 'indicacao_condutor',
      scenario: 'dados_ausentes',
      infractionData: {
        infractionCode: '745-50',
        severity: 'media',
        dateTime: '2026-08-20T14:00:00Z',
        location: 'Av. Paulista, 1000 - São Paulo/SP',
        autuadorBody: 'DETRAN-SP',
        aitNumber: 'AIT-REF-015',
      },
      expectedThesis: undefined,
      expectedArgumentsCount: 0,
      executable: false,
      blocker: 'PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados.',
    },
    {
      procedure: 'conversao_advertencia',
      situation: 'conversao_advertencia',
      stage: 'conversao_advertencia',
      category: 'conversao_advertencia',
      scenario: 'dados_ausentes',
      infractionData: {
        infractionCode: '735-80',
        severity: 'media',
        dateTime: '2026-08-25T16:00:00Z',
        location: 'Rua Oscar Freire, 500 - São Paulo/SP',
        autuadorBody: 'DETRAN-SP',
        aitNumber: 'AIT-REF-016',
      },
      expectedThesis: undefined,
      expectedArgumentsCount: 0,
      executable: false,
      blocker: 'PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados.',
    },
  ];
  cases.push(...incompleteCases);

  // ── Evidências contraditórias para os 6 procedimentos que só tinham completos/dados_ausentes ──
  const contradictoryCases: ReferenceCase[] = [
    {
      procedure: 'recurso_jari',
      situation: 'multa_transito',
      stage: 'notificacao_penalidade',
      category: 'celular',
      scenario: 'evidencias_contraditorias',
      infractionData: {
        infractionCode: '736-62',
        ctbArticle: 'Art. 252, VI, CTB',
        severity: 'media',
        points: 4,
        fineAmount: 130.16,
        cellphoneCircumstance: 'sem_abordagem',
        hasAgentDetailedObservations: true, // contradição: sem abordagem mas com observações detalhadas do agente
        notificationExpeditionDate: '2026-08-01T00:00:00Z',
        defenseDeadline: '2026-08-31T00:00:00Z',
        dateTime: '2026-07-15T10:00:00Z',
        location: 'Av. das Nações Unidas, 5000 - São Paulo/SP',
        autuadorBody: 'CET-SP',
        aitNumber: 'AIT-REF-017',
      },
      expectedThesis: undefined,
      expectedArgumentsCount: 0,
      executable: false,
      blocker: 'PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados.',
    },
    {
      procedure: 'recurso_cetran',
      situation: 'multa_transito',
      stage: 'recurso_jari_negado',
      category: 'vermelho',
      scenario: 'evidencias_contraditorias',
      infractionData: {
        infractionCode: '605-01',
        ctbArticle: 'Art. 208, CTB',
        severity: 'gravissima',
        points: 7,
        fineAmount: 293.47,
        hasPhotoProof: true,
        yellowPhaseCrossing: true, // contradição: alega amarelo mas foto comprova vermelho
        notificationExpeditionDate: '2026-07-01T00:00:00Z',
        defenseDeadline: '2026-07-31T00:00:00Z',
        dateTime: '2026-06-15T08:00:00Z',
        location: 'Rua Augusta, 2000 - São Paulo/SP',
        autuadorBody: 'CETRAN-SP',
        aitNumber: 'AIT-REF-019',
      },
      expectedThesis: undefined,
      expectedArgumentsCount: 0,
      executable: false,
      blocker: 'PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados.',
    },
    {
      procedure: 'suspensao_cnh',
      situation: 'suspensao_cnh',
      stage: 'primeira_notificacao',
      category: 'lei_seca',
      scenario: 'evidencias_contraditorias',
      infractionData: {
        infractionCode: '757-90',
        ctbArticle: 'Art. 165-A, CTB',
        severity: 'gravissima',
        points: 7,
        fineAmount: 2934.70,
        refusedTest: true,
        hasPsychomotorTerm: true, // contradição: recusou teste mas possui termo psicomotor
        notificationExpeditionDate: '2026-08-10T00:00:00Z',
        defenseDeadline: '2026-09-09T00:00:00Z',
        dateTime: '2026-08-05T22:00:00Z',
        location: 'Av. Ibirapuera, 3000 - São Paulo/SP',
        autuadorBody: 'DETRAN-SP',
        aitNumber: 'AIT-REF-021',
      },
      expectedThesis: undefined,
      expectedArgumentsCount: 0,
      executable: false,
      blocker: 'PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados.',
    },
    {
      procedure: 'cassacao_cnh',
      situation: 'cassacao_cnh',
      stage: 'primeira_notificacao',
      category: 'cnh_geral',
      scenario: 'evidencias_contraditorias',
      infractionData: {
        infractionCode: '757-90',
        ctbArticle: 'Art. 165-A, CTB',
        severity: 'gravissima',
        points: 7,
        fineAmount: 2934.70,
        refusedTest: false, // contradição: autuação por recusa mas não recusou
        hasPreviousInfractionsLast12Months: false,
        notificationExpeditionDate: '2026-08-10T00:00:00Z',
        defenseDeadline: '2026-09-09T00:00:00Z',
        dateTime: '2026-08-05T22:00:00Z',
        location: 'Av. Ibirapuera, 3000 - São Paulo/SP',
        autuadorBody: 'DETRAN-SP',
        aitNumber: 'AIT-REF-023',
      },
      expectedThesis: undefined,
      expectedArgumentsCount: 0,
      executable: false,
      blocker: 'PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados.',
    },
    {
      procedure: 'indicacao_condutor',
      situation: 'indicacao_condutor',
      stage: 'primeira_notificacao',
      category: 'indicacao_condutor',
      scenario: 'evidencias_contraditorias',
      infractionData: {
        infractionCode: '745-50',
        ctbArticle: 'Art. 218, II, CTB',
        severity: 'media',
        points: 4,
        fineAmount: 130.16,
        realDriverName: 'MARIA SILVA',
        realDriverCpf: '98765432100',
        realDriverCnh: '98765432100',
        indicationWithinDeadline: false, // contradição: indica condutor mas fora do prazo
        notificationExpeditionDate: '2026-09-01T00:00:00Z',
        defenseDeadline: '2026-09-30T00:00:00Z',
        dateTime: '2026-08-20T14:00:00Z',
        location: 'Av. Paulista, 1000 - São Paulo/SP',
        autuadorBody: 'DETRAN-SP',
        aitNumber: 'AIT-REF-025',
      },
      expectedThesis: undefined,
      expectedArgumentsCount: 0,
      executable: false,
      blocker: 'PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados.',
    },
    {
      procedure: 'conversao_advertencia',
      situation: 'conversao_advertencia',
      stage: 'conversao_advertencia',
      category: 'conversao_advertencia',
      scenario: 'evidencias_contraditorias',
      infractionData: {
        infractionCode: '735-80',
        ctbArticle: 'Art. 221, CTB',
        severity: 'media',
        points: 4,
        fineAmount: 130.16,
        hasPreviousInfractionsLast12Months: true, // contradição: conversão exige ausência de infrações anteriores
        notificationExpeditionDate: '2026-09-01T00:00:00Z',
        defenseDeadline: '2026-09-30T00:00:00Z',
        dateTime: '2026-08-25T16:00:00Z',
        location: 'Rua Oscar Freire, 500 - São Paulo/SP',
        autuadorBody: 'DETRAN-SP',
        aitNumber: 'AIT-REF-027',
      },
      expectedThesis: undefined,
      expectedArgumentsCount: 0,
      executable: false,
      blocker: 'PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados.',
    },
  ];
  cases.push(...contradictoryCases);

  // ── Sem tese defensiva para os 6 procedimentos que só tinham completos/dados_ausentes ──
  const noThesisCases: ReferenceCase[] = [
    {
      procedure: 'recurso_jari',
      situation: 'multa_transito',
      stage: 'notificacao_penalidade',
      category: 'celular',
      scenario: 'sem_tese_defensiva',
      infractionData: {
        infractionCode: '736-62',
        ctbArticle: 'Art. 252, VI, CTB',
        severity: 'media',
        points: 4,
        fineAmount: 130.16,
        cellphoneCircumstance: 'com_abordagem',
        hasAgentDetailedObservations: true, // abordagem confirmada + observações do agente → sem tese aplicável
        notificationExpeditionDate: '2026-08-01T00:00:00Z',
        defenseDeadline: '2026-08-31T00:00:00Z',
        dateTime: '2026-07-15T10:00:00Z',
        location: 'Av. das Nações Unidas, 5000 - São Paulo/SP',
        autuadorBody: 'CET-SP',
        aitNumber: 'AIT-REF-018',
      },
      expectedThesis: undefined,
      expectedArgumentsCount: 0,
      executable: false,
      blocker: 'PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados.',
    },
    {
      procedure: 'recurso_cetran',
      situation: 'multa_transito',
      stage: 'recurso_jari_negado',
      category: 'vermelho',
      scenario: 'sem_tese_defensiva',
      infractionData: {
        infractionCode: '605-01',
        ctbArticle: 'Art. 208, CTB',
        severity: 'gravissima',
        points: 7,
        fineAmount: 293.47,
        hasPhotoProof: true,
        yellowPhaseCrossing: false, // vermelho confirmado por foto, sem tese de defesa
        notificationExpeditionDate: '2026-07-01T00:00:00Z',
        defenseDeadline: '2026-07-31T00:00:00Z',
        dateTime: '2026-06-15T08:00:00Z',
        location: 'Rua Augusta, 2000 - São Paulo/SP',
        autuadorBody: 'CETRAN-SP',
        aitNumber: 'AIT-REF-020',
      },
      expectedThesis: undefined,
      expectedArgumentsCount: 0,
      executable: false,
      blocker: 'PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados.',
    },
    {
      procedure: 'suspensao_cnh',
      situation: 'suspensao_cnh',
      stage: 'primeira_notificacao',
      category: 'lei_seca',
      scenario: 'sem_tese_defensiva',
      infractionData: {
        infractionCode: '757-90',
        ctbArticle: 'Art. 165-A, CTB',
        severity: 'gravissima',
        points: 7,
        fineAmount: 2934.70,
        refusedTest: true,
        hasPsychomotorTerm: false, // recusa confirmada, sem termo, sem tese aplicável
        notificationExpeditionDate: '2026-08-10T00:00:00Z',
        defenseDeadline: '2026-09-09T00:00:00Z',
        dateTime: '2026-08-05T22:00:00Z',
        location: 'Av. Ibirapuera, 3000 - São Paulo/SP',
        autuadorBody: 'DETRAN-SP',
        aitNumber: 'AIT-REF-022',
      },
      expectedThesis: undefined,
      expectedArgumentsCount: 0,
      executable: false,
      blocker: 'PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados.',
    },
    {
      procedure: 'cassacao_cnh',
      situation: 'cassacao_cnh',
      stage: 'primeira_notificacao',
      category: 'cnh_geral',
      scenario: 'sem_tese_defensiva',
      infractionData: {
        infractionCode: '757-90',
        ctbArticle: 'Art. 165-A, CTB',
        severity: 'gravissima',
        points: 7,
        fineAmount: 2934.70,
        refusedTest: true,
        hasPreviousInfractionsLast12Months: true, // reincidente + recusa → cassação sem tese de defesa
        notificationExpeditionDate: '2026-08-10T00:00:00Z',
        defenseDeadline: '2026-09-09T00:00:00Z',
        dateTime: '2026-08-05T22:00:00Z',
        location: 'Av. Ibirapuera, 3000 - São Paulo/SP',
        autuadorBody: 'DETRAN-SP',
        aitNumber: 'AIT-REF-024',
      },
      expectedThesis: undefined,
      expectedArgumentsCount: 0,
      executable: false,
      blocker: 'PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados.',
    },
    {
      procedure: 'indicacao_condutor',
      situation: 'indicacao_condutor',
      stage: 'primeira_notificacao',
      category: 'indicacao_condutor',
      scenario: 'sem_tese_defensiva',
      infractionData: {
        infractionCode: '745-50',
        ctbArticle: 'Art. 218, II, CTB',
        severity: 'media',
        points: 4,
        fineAmount: 130.16,
        realDriverName: 'JOÃO DA SILVA',
        realDriverCpf: '12345678901',
        realDriverCnh: '123456789012',
        indicationWithinDeadline: true, // indicação procedimental, não constitui tese defensiva
        notificationExpeditionDate: '2026-09-01T00:00:00Z',
        defenseDeadline: '2026-09-30T00:00:00Z',
        dateTime: '2026-08-20T14:00:00Z',
        location: 'Av. Paulista, 1000 - São Paulo/SP',
        autuadorBody: 'DETRAN-SP',
        aitNumber: 'AIT-REF-026',
      },
      expectedThesis: undefined,
      expectedArgumentsCount: 0,
      executable: false,
      blocker: 'PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados.',
    },
    {
      procedure: 'conversao_advertencia',
      situation: 'conversao_advertencia',
      stage: 'conversao_advertencia',
      category: 'conversao_advertencia',
      scenario: 'sem_tese_defensiva',
      infractionData: {
        infractionCode: '757-90',
        ctbArticle: 'Art. 165-A, CTB',
        severity: 'gravissima', // infração gravíssima não é conversível em advertência
        points: 7,
        fineAmount: 2934.70,
        hasPreviousInfractionsLast12Months: false,
        notificationExpeditionDate: '2026-09-01T00:00:00Z',
        defenseDeadline: '2026-09-30T00:00:00Z',
        dateTime: '2026-08-25T16:00:00Z',
        location: 'Rua Oscar Freire, 500 - São Paulo/SP',
        autuadorBody: 'DETRAN-SP',
        aitNumber: 'AIT-REF-028',
      },
      expectedThesis: undefined,
      expectedArgumentsCount: 0,
      executable: false,
      blocker: 'PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados.',
    },
  ];
  cases.push(...noThesisCases);

  return cases;
}

/** Casos de referência gerados (28 cenários: 7 procedimentos × 4 scenario types, onde aplicável). */
export const REFERENCE_CASES: ReferenceCase[] = generateReferenceCases();

/** Resumo por procedimento. */
export function summarizeReferenceCases(): {
  procedure: string;
  scenarios: number;
  executable: number;
  blocked: number;
}[] {
  const byProc = new Map<string, { scenarios: number; executable: number; blocked: number }>();
  for (const c of REFERENCE_CASES) {
    const cur = byProc.get(c.procedure) || { scenarios: 0, executable: 0, blocked: 0 };
    cur.scenarios++;
    if (c.executable) cur.executable++;
    else cur.blocked++;
    byProc.set(c.procedure, cur);
  }
  return [...byProc.entries()].map(([procedure, v]) => ({ procedure, ...v }));
}
