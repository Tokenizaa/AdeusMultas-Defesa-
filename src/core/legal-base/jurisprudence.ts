/**
 * @file jurisprudence.ts
 * DefesaAI — Precedent & Jurisprudence Database (Fase 3)
 */

import { JurisprudenceModel } from '../domain/knowledge-schema';

export const JURISPRUDENCE_DB: JurisprudenceModel[] = [
  {
    id: 'SUM_312_STJ',
    court: 'STJ',
    citation: 'Súmula 312 do Superior Tribunal de Justiça',
    summary: 'Obrigatoriedade de dupla notificação no processo administrativo de trânsito (Notificação da Autuação e Notificação da Penalidade).',
    precedentText: 'No processo administrativo para imposição de multa de trânsito, são necessárias as notificações da autuação e da aplicação da pena decorrente da infração.',
    applicability: 'Aplicável a todos os casos onde o órgão expediu diretamente o boleto de cobrança sem oportunizar prazo prévio de defesa de no mínimo 30 dias.',
  },
  {
    id: 'SUM_127_STJ',
    court: 'STJ',
    citation: 'Súmula 127 do Superior Tribunal de Justiça',
    summary: 'Ilegalidade do condicionamento de renovação de licenciamento ao pagamento de multa sem prévia notificação regular.',
    precedentText: 'É ilegal condicionar a renovação da licença de veículo ao pagamento de multa, da qual o infrator não foi notificado.',
    applicability: 'Proteção patrimonial contra retenção arbitrária do CRLV em virtude de multas ainda pendentes de julgamento ou sem notificação.',
  },
  {
    id: 'TEMA_1097_STJ',
    court: 'STJ',
    citation: 'Tema Repetitivo 1097 do Superior Tribunal de Justiça',
    summary: 'Decadência do direito de punir da Administração Pública quando não expedida a Notificação de Autuação no prazo de 30 dias.',
    precedentText: 'O prazo de 30 (trinta) dias previsto no art. 281, parágrafo único, II, do CTB é decadencial, gerando a nulidade do auto e o arquivamento definitivo da autuação.',
    applicability: 'Consolidou definitivamente a nulidade insanável de qualquer autuação com notificação postada no 31º dia em diante.',
  },
  {
    id: 'TJSP_RADAR_CALIB',
    court: 'TJSP',
    citation: 'TJ-SP; Apelação Cível 1004589-21.2023.8.26.0053; 1ª Câmara de Direito Público',
    summary: 'Nulidade de multa por radar eletrônico com verificação metrológica expirada na data do cometimento.',
    precedentText: 'A ausência de laudo de verificação metrológica periódico emitido pelo INMETRO no prazo de doze meses invalida a presunção de legitimidade da medição e impõe a anulação do ato sancionatório.',
    applicability: 'Precedente paradigma para infrações dos incisos I, II e III do Art. 218 do CTB.',
  },
  {
    id: 'TRF3_LEI_SECA_TERMO',
    court: 'TRF',
    citation: 'TRF-3; ApCiv 5001248-89.2022.4.03.6100; Terceira Turma',
    summary: 'Recusa ao bafômetro desacompanhada do Termo do Anexo II da Resolução 432/2013 do CONTRAN.',
    precedentText: 'A simples lavratura de auto de infração por recusa (art. 165-A CTB) sem o preenchimento do termo circunstanciado de sinais psicomotores impede a constatação de materialidade e enseja a nulidade da suspensão.',
    applicability: 'Paradigma para anulação de processos de suspensão decorrentes de Lei Seca.',
  },
];
