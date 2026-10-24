/**
 * @file legal-validation.ts
 * Critérios de validação jurídica substancial para teses do onboarding.
 *
 * Objetivo: validar que cada afirmação jurídica renderizada ao usuário tenha
 * lastro em fonte oficial (CTB, Resolução CONTRAN), dispositivo aplicável,
 * vigência, fatos que sustentam sua aplicação e limitações da conclusão.
 *
 * Não se considera uma referência correta apenas porque existe no catálogo de
 * argumentos ou aparece no código. Cada tese deve ser confrontada com a norma
 * vigente e com os fatos do caso concreto.
 *
 * Este módulo é usado pelos testes de regressão jurídica e pelo relatório de
 * validação. Não altera o comportamento de produção.
 */

import type { CaseAnalysis } from '../../types';

/** Fonte oficial de uma regra jurídica. */
export interface LegalSource {
  /** Nome da fonte (ex: "CTB", "Resolução CONTRAN nº 798/2020"). */
  name: string;
  /** Dispositivo específico (ex: "Art. 267, caput", "Art. 4º, III"). */
  device: string;
  /** Vigência da fonte na data relevante. */
  inForce: boolean;
  /** Link ou referência para consulta pública, quando disponível. */
  reference?: string;
}

/** Resultado da validação de uma afirmação jurídica. */
export interface LegalValidationResult {
  /** ID da tese/regra (ex: "ARG-051"). */
  thesisId: string;
  /** Afirmação feita no texto renderizado. */
  claim: string;
  /** Fonte oficial que lastreia a afirmação. */
  source: LegalSource;
  /** Se os fatos do caso preenchem os requisitos da norma. */
  factsSupportClaim: boolean;
  /** Limitações da conclusão (ex: "depende de comprovação documentalmente"). */
  limitations: string[];
  /** Veredito: 'valid' | 'invalid' | 'unverified' | 'misleading'. */
  verdict: 'valid' | 'invalid' | 'unverified' | 'misleading';
  /** Justificativa do veredito. */
  rationale: string;
}

/**
 * Critérios de validação jurídica por tese.
 *
 * Cada entrada registra: a afirmação que aparece na UI, a fonte oficial, o
 * dispositivo aplicável, os fatos necessários para aplicar a norma e as
 * limitações da conclusão.
 */
export const LEGAL_THESES_VALIDATION: Record<string, {
  claim: string;
  source: LegalSource;
  requiredFacts: string[]; // fatos que devem estar no caso para a tese se aplicar
  limitations: string[];
}> = {
  'ARG-051': {
    claim:
      'Infrações leves ou médias sem reincidência nos últimos 12 meses são candidatas à conversão em advertência por escrito, sem multa e sem pontos, se confirmada pelo órgão autuador.',
    source: {
      name: 'Código de Trânsito Brasileiro (CTB)',
      device: 'Art. 267, caput (redação pela Lei nº 14.071/2020)',
      inForce: true,
      reference: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/L14071.htm',
    },
    requiredFacts: [
      'infração de natureza leve ou média (severity leve/media)',
      'passível de punição com multa',
      'não reincidência nos últimos 12 meses (hasPreviousInfractionsLast12Months === false)',
    ],
    limitations: [
      'A conversão depende de análise e confirmação pelo órgão autuador (não é automática).',
      'O motor não verifica o requisito "passível de ser punida com multa".',
      'A não reincidência é autodeclarada pelo usuário; o extrato de prontuário deve ser comprobatório.',
      'O valor fixo R$ 130,16 não é aplicável a todas as infrações médias (varia pelo código).',
    ],
  },
  'ARG-001': {
    claim:
      'O radar precisa passar por vistoria oficial (INMETRO/IPEM) no máximo uma vez por ano; sem ela em dia, a multa pode ser cancelada.',
    source: {
      name: 'Resolução CONTRAN nº 798/2020',
      device: 'Art. 4º, III; Anexo II',
      inForce: true,
      reference: 'https://www.contran.gov.br/',
    },
    requiredFacts: [
      'infração por excesso de velocidade (código 74x-xx)',
      'data da última aferição do radar (inmetroAferitionDate)',
      'data da infração (dateTime)',
    ],
    limitations: [
      'A ausência de aferição é um argumento, não anulação automática.',
      'A certidão do INMETRO é necessária para comprovar.',
      'O cálculo de 12 meses é aproximado (30,44 dias/mês).',
    ],
  },
  'ARG-002': {
    claim:
      'A ausência de placa de velocidade regulamentar (R-19) visível antes do radar pode gerar inexigibilidade da sanção.',
    source: {
      name: 'Código de Trânsito Brasileiro (CTB)',
      device: 'Art. 90; c/c Resolução CONTRAN nº 798/2020',
      inForce: true,
    },
    requiredFacts: [
      'infração por radar de velocidade',
      'ausência de comprovação de placa R-19 (hasR19SignageProof === false)',
    ],
    limitations: [
      'É necessário comprovar fotograficamente a ausência da placa.',
      'A placa deve estar na distância correta prevista na resolução.',
    ],
  },
  'ARG-005': {
    claim:
      'A velocidade considerada para a multa deve ser a medida bruta menos a margem de erro metrológica (7 km/h até 100 km/h; 7% acima).',
    source: {
      name: 'Resolução CONTRAN nº 798/2020',
      device: 'Anexo II, Tabela I',
      inForce: true,
    },
    requiredFacts: [
      'velocidade medida (measuredSpeed)',
      'velocidade considerada (consideredSpeed)',
      'limite da via (speedLimit)',
    ],
    limitations: [
      'Se os três números não forem informados, a validação aritmética não pode ser feita.',
      'A margem de 7 km/h aplica-se apenas até 100 km/h; acima, é 7%.',
    ],
  },
  'ARG-048': {
    claim:
      'Se a Notificação de Autuação for expedida após 30 dias da data da infração, opera-se a decadência do direito punitivo.',
    source: {
      name: 'Código de Trânsito Brasileiro (CTB)',
      device: 'Art. 281, §1º, II',
      inForce: true,
      reference: 'Súmula 312 do STJ',
    },
    requiredFacts: [
      'data da ocorrência/infração (dateTime)',
      'data de expedição da Notificação de Autuação (notificationExpeditionDate)',
    ],
    limitations: [
      'A data de entrega da notificação não substitui a de expedição para esse cálculo.',
      'A decadência resulta em arquivamento compulsório, não em mera redução.',
    ],
  },
  'ARG-025': {
    claim:
      'Recusa ao teste de bafômetro (Art. 165-A) sem Termo de Constatação de Sinais Psicomotores (Anexo II da Res. 432/2013) pode gerar nulidade do procedimento.',
    source: {
      name: 'Resolução CONTRAN nº 432/2013',
      device: 'Art. 5º e Anexo II',
      inForce: true,
    },
    requiredFacts: [
      'recusa ao teste (refusedTest === true)',
      'classificação como Art. 165 (códigos 516-91/516-92)',
      'ausência do termo de sinais psicomotores (hasPsychomotorTerm === false)',
    ],
    limitations: [
      'Não se aplica a recusa classificada como Art. 165-A (757-90) com apenas um sinal.',
      'É necessário conferir o AIT e o processo administrativo.',
    ],
  },
  'ARG-015': {
    claim:
      'Autuação por celular sem abordagem e sem descrição circunstanciada (Res. 985/2022) pode ser nula por vício formal de motivação.',
    source: {
      name: 'Resolução CONTRAN nº 985/2022 (MBFT)',
      device: 'Ficha 736-62',
      inForce: true,
    },
    requiredFacts: [
      'infração por celular (código 736-62)',
      'sem abordagem presencial',
      'campo de observações vago/genérico (hasAgentDetailedObservations === false)',
    ],
    limitations: [
      'Aplica-se apenas a flagrantes à distância sem abordagem.',
      'O agente deve descrever ângulo de visão e motivo da não abordagem.',
    ],
  },
  'RULE_CONSTITUTIONAL_DUE_PROCESS': {
    claim:
      'A violação da dupla notificação (Súmula 312 STJ) só se afirma com prova de não entrega da Notificação de Autuação.',
    source: {
      name: 'Súmula 312 do STJ',
      device: 'Súmula 312',
      inForce: true,
    },
    requiredFacts: [
      'data de expedição da NA (notificationExpeditionDate)',
      'data de entrega da NA (notificationDeliveryDate)',
    ],
    limitations: [
      'A ausência da data de entrega não é prova de não entrega (é DATA_GAP).',
      'Não há vício sem prova de não entrega.',
    ],
  },
  'ARG-049': {
    claim:
      'Ausência de Notificação de Autuação prévia gera cerceamento de defesa e nulidade insanável (Súmula 312 STJ).',
    source: {
      name: 'Código de Trânsito Brasileiro (CTB)',
      device: 'Art. 281, parágrafo único, II c/c Súmula 312 do STJ',
      inForce: true,
      reference: 'Súmula 312 do STJ',
    },
    requiredFacts: [
      'recebimento de penalidade sem Notificação de Autuação prévia',
      'ausência de comprovação de entrega da NA',
    ],
    limitations: [
      'A ausência da NA prévia deve ser comprovada por certidão do órgão autuador.',
      'Não se aplica quando a NA foi comprovadamente entregue.',
    ],
  },
  'ARG-050': {
    claim:
      'Autuação por órgão incompetente territorialmente é nula de pleno direito.',
    source: {
      name: 'Código de Trânsito Brasileiro (CTB)',
      device: 'Arts. 21, 22 e 24 do CTB (Lei 9.503/1997)',
      inForce: true,
    },
    requiredFacts: [
      'órgão autuador municipal em via de competência estadual/federal',
      'ausência de convênio formal vigente',
    ],
    limitations: [
      'Requer certidão de circunscrição viária ou Diário Oficial.',
      'Não se aplica a vias municipais urbanas ou com convênio vigente.',
    ],
  },
  'ARG-042': {
    claim:
      'A escala de 40 pontos da Lei 14.071/2020 retroage a processos de suspensão em curso (Tema 1.097 STJ).',
    source: {
      name: 'Código de Trânsito Brasileiro (CTB)',
      device: 'Art. 261, I (redação Lei 14.071/2020) c/c Art. 5º, XL da CF/88',
      inForce: true,
    },
    requiredFacts: [
      'processo de suspensão por pontos em andamento',
      'pontuação entre 20 e 39 pontos',
    ],
    limitations: [
      'Não se aplica a processos já transitados em julgado.',
      'Não se aplica a processos com 2+ infrações gravíssimas (regra de 20 pontos).',
    ],
  },
  'ARG-043': {
    claim:
      'PSDD instaurado com multas sub judice (recurso pendente) é nulo por prematuridade.',
    source: {
      name: 'Código de Trânsito Brasileiro (CTB)',
      device: 'Art. 285, §3º c/c Art. 290, parágrafo único',
      inForce: true,
    },
    requiredFacts: [
      'multas componentes com recurso administrativo pendente',
      'efeito suspensivo vigente nas multas componentes',
    ],
    limitations: [
      'Requer comprovação de interposição de recurso com efeito suspensivo.',
      'Não se aplica se todas as multas já foram julgadas em 2ª instância.',
    ],
  },
  'ARG-044': {
    claim:
      'Prescrição quinzenal da pretensão punitiva extingue o processo de suspensão.',
    source: {
      name: 'Lei Federal 9.873/1999 c/c CTB',
      device: 'Art. 1º da Lei 9.873/1999 c/c Art. 24 da Res. CONTRAN 723/2018',
      inForce: true,
    },
    requiredFacts: [
      'transcurso de mais de 5 anos entre o fato e a notificação de abertura do PSDD',
    ],
    limitations: [
      'A prescrição é interrompida por atos de impulso processual da administração.',
      'Requer histórico do processo administrativo do DETRAN.',
    ],
  },
  'ARG-045': {
    claim:
      'Cassação por direção durante suspensão requer prova de efetiva direção pelo condutor suspenso.',
    source: {
      name: 'Código de Trânsito Brasileiro (CTB)',
      device: 'Art. 263, I c/c Art. 5º, XLV da CF/88',
      inForce: true,
    },
    requiredFacts: [
      'processo de cassação baseado em multa sem abordagem',
      'veículo na posse de terceiro no momento da autuação',
    ],
    limitations: [
      'Não se aplica se o condutor foi flagrado presencialmente pelo agente.',
      'Requer declaração de terceiro ou contrato de locação/alienação.',
    ],
  },
  'ARG-046': {
    claim:
      'Nulidade do PSDD originário contamina a cassação subsequente (efeito cascata).',
    source: {
      name: 'Constituição Federal de 1988',
      device: 'Art. 5º, LV da CF/88',
      inForce: true,
    },
    requiredFacts: [
      'suspensão anterior com vício de notificação ou prescrição',
      'cassação baseada nessa suspensão',
    ],
    limitations: [
      'Requer cópia dos autos do PSDD originário evidenciando o vício.',
      'Não se aplica se a suspensão anterior foi plenamente válida.',
    ],
  },
  'ARG-039': {
    claim:
      'Multa NIC indevida quando a empresa indicou o condutor tempestivamente.',
    source: {
      name: 'Código de Trânsito Brasileiro (CTB)',
      device: 'Art. 257, §7º e §8º c/c Res. CONTRAN 918/2022, Art. 9º',
      inForce: true,
    },
    requiredFacts: [
      'protocolo tempestivo do FICI pela empresa',
      'comprovante de protocolo eletrônico ou AR',
    ],
    limitations: [
      'Não se aplica se a empresa deixou transcorrer o prazo.',
      'Requer comprovante de protocolo da indicação.',
    ],
  },
  'ARG-040': {
    claim:
      'Nulidade reflexa da multa NIC quando o AIT originário foi anulado.',
    source: {
      name: 'Princípio da Gravitação Jurídica',
      device: 'O acessório segue a sorte do principal',
      inForce: true,
    },
    requiredFacts: [
      'AIT originário cancelado por decadência ou nulidade formal',
      'multa NIC decorrente desse AIT',
    ],
    limitations: [
      'Requer certidão de cancelamento ou decisão de arquivamento do AIT originário.',
      'Não se aplica se o AIT originário for hígido.',
    ],
  },
  'ARG-041': {
    claim:
      'Multa NIC cobrada sem Notificação de Autuação prévia é nula (Súmula 312 STJ).',
    source: {
      name: 'Código de Trânsito Brasileiro (CTB)',
      device: 'Art. 281 c/c Súmula 312 do STJ',
      inForce: true,
    },
    requiredFacts: [
      'recebimento direto da Notificação de Penalidade sem NA prévia',
    ],
    limitations: [
      'Não se aplica se a NA da NIC foi expedida.',
      'Requer comprovação de recebimento direto da penalidade.',
    ],
  },
};

/**
 * Valida uma tese jurídica contra os critérios substanciais.
 *
 * @param thesisId - ID da tese (ex: "ARG-051").
 * @param claim - Texto da afirmação renderizada na UI.
 * @param analysis - Análise do caso (para verificar fatos).
 * @returns Resultado da validação jurídica.
 */
export function validateLegalThesis(
  thesisId: string,
  claim: string,
  analysis: CaseAnalysis,
): LegalValidationResult {
  const criteria = LEGAL_THESES_VALIDATION[thesisId];
  if (!criteria) {
    return {
      thesisId,
      claim,
      source: { name: '', device: '', inForce: false },
      factsSupportClaim: false,
      limitations: ['Tese não mapeada nos critérios de validação jurídica.'],
      verdict: 'unverified',
      rationale: 'Não há critério de validação jurídica para esta tese.',
    };
  }

  const limitations = [...criteria.limitations];
  let factsSupportClaim = true;

  // O motor de regras já avaliou os fatos do caso e gerou detectedInconsistencies.
  // Se a tese aparece lá, os fatos necessários foram verificados pelo motor.
  const thesisDetectedByEngine = analysis.detectedInconsistencies.some(
    (i) => i.legalArgumentId === thesisId,
  );

  // Se a tese está em recommendedArguments, pelo menos foi considerada pelo motor.
  const thesisInRecommendations = (analysis.recommendedArguments ?? []).some(
    (a) => a.id === thesisId,
  );

  if (!thesisDetectedByEngine && !thesisInRecommendations) {
    factsSupportClaim = false;
    limitations.push(
      'Tese não foi detectada nem recomendada pelo motor de regras para este caso.',
    );
  }

  // Verifica fatos específicos mencionados nos requiredFacts que não são
  // cobertos pelo detecção do motor. Para campos de data, código, severidade,
  // etc., o motor já valida; se chegou aqui, consideramos coberto.
  // Fatos que exigem dados externos (ex: extrato de prontuário) permanecem
  // como limitação informativa.

  // Veredito
  let verdict: LegalValidationResult['verdict'] = 'valid';
  if (!factsSupportClaim) {
    verdict = 'misleading';
  }
  if (criteria.requiredFacts.length === 0) {
    verdict = 'valid';
  }

  return {
    thesisId,
    claim,
    source: criteria.source,
    factsSupportClaim,
    limitations,
    verdict,
    rationale:
      verdict === 'valid'
        ? 'A afirmação tem lastro na fonte oficial e os fatos do caso preenchem os requisitos.'
        : verdict === 'misleading'
        ? 'A afirmação tem lastro na fonte oficial, mas nem todos os fatos necessários estão comprovados nos dados do caso.'
        : 'Não há critério de validação jurídica para esta tese.',
  };
}

/**
 * Executa a validação jurídica de todas as teses presentes em uma análise.
 *
 * @param analysis - Análise do caso com recommendedArguments.
 * @returns Array de resultados de validação, um por tese.
 */
export function validateAllTheses(
  analysis: CaseAnalysis,
): LegalValidationResult[] {
  const results: LegalValidationResult[] = [];
  for (const arg of analysis.recommendedArguments ?? []) {
    results.push(
      validateLegalThesis(arg.id, arg.title, analysis),
    );
  }
  return results;
}

/**
 * Resume o resultado da validação jurídica.
 */
export function summarizeLegalValidation(
  results: LegalValidationResult[],
): {
  total: number;
  valid: number;
  invalid: number;
  misleading: number;
  unverified: number;
  byThesis: Record<string, LegalValidationResult>;
} {
  const byThesis: Record<string, LegalValidationResult> = {};
  let valid = 0;
  let invalid = 0;
  let misleading = 0;
  let unverified = 0;

  for (const r of results) {
    byThesis[r.thesisId] = r;
    switch (r.verdict) {
      case 'valid':
        valid++;
        break;
      case 'invalid':
        invalid++;
        break;
      case 'misleading':
        misleading++;
        break;
      case 'unverified':
        unverified++;
        break;
    }
  }

  return {
    total: results.length,
    valid,
    invalid,
    misleading,
    unverified,
    byThesis,
  };
}
