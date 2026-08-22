/**
 * @file glossary.ts
 * DefesaAI — Traffic Law Glossary (Fase 3)
 */

import { GlossaryTermModel } from '../domain/knowledge-schema';

export const GLOSSARY_DB: GlossaryTermModel[] = [
  {
    term: 'Auto de Infração de Trânsito',
    acronym: 'AIT',
    definition: 'Documento inicial lavrado por autoridade ou agente de trânsito que registra o cometimento de uma infração, contendo local, data, dados do veículo e enquadramento.',
    legalReference: 'Art. 280 do CTB',
  },
  {
    term: 'Notificação da Autuação',
    acronym: 'NA',
    definition: 'Primeira notificação enviada ao proprietário informando sobre o registro da infração, concedendo prazo de no mínimo 30 dias para Defesa Prévia ou Indicação de Condutor.',
    legalReference: 'Art. 281, II do CTB e Súmula 312 STJ',
  },
  {
    term: 'Notificação da Imposição de Penalidade',
    acronym: 'NP',
    definition: 'Segunda notificação formal que aplica a sanção administrativa (multa), enviando o código de barras para pagamento e abrindo prazo para Recurso à JARI.',
    legalReference: 'Art. 282 do CTB',
  },
  {
    term: 'Junta Administrativa de Recursos de Infrações',
    acronym: 'JARI',
    definition: 'Colegiado administrativo de 1ª instância responsável por julgar os recursos interpostos contra penalidades aplicadas pelos órgãos executivos de trânsito.',
    legalReference: 'Art. 16 e 285 do CTB',
  },
  {
    term: 'Conselho Estadual de Trânsito',
    acronym: 'CETRAN',
    definition: 'Órgão colegiado normativo e consultivo de 2ª instância que julga os recursos em última via administrativa nos âmbitos estadual e municipal.',
    legalReference: 'Art. 14 e 288 do CTB',
  },
  {
    term: 'Decadência de 30 Dias',
    acronym: 'Decadência',
    definition: 'Perda do direito do Estado de punir a infração caso a Notificação da Autuação não seja expedida/postada no prazo máximo improrrogável de 30 dias contados da data do fato.',
    legalReference: 'Art. 281, parágrafo único, II do CTB',
  },
  {
    term: 'Velocidade Considerada',
    acronym: 'VC',
    definition: 'Velocidade resultante da dedução da margem de erro metrológica legal (7 km/h para vias até 107 km/h e 7% para velocidades superiores) sobre a velocidade medida pelo radar.',
    legalReference: 'Resolução CONTRAN nº 798/2020, Tabela I',
  },
  {
    term: 'Efeito Suspensivo',
    acronym: 'Efeito Suspensivo',
    definition: 'Garantia de que, durante o julgamento do recurso tempestivo, a penalidade não impede o licenciamento do veículo nem gera bloqueio na CNH do condutor.',
    legalReference: 'Art. 285, §3º do CTB (Lei 14.229/2021)',
  },
  {
    term: 'Formulário de Indicação do Real Condutor',
    acronym: 'FARI',
    definition: 'Documento protocolado pelo proprietário do veículo para transferir a responsabilidade pela pontuação ao condutor que efetivamente dirigia no momento da infração.',
    legalReference: 'Art. 257, §7º do CTB',
  },
  {
    term: 'Prescrição Quinquenal e Intercorrente',
    acronym: 'Prescrição',
    definition: 'Extinção da punibilidade quando o processo administrativo fica paralisado por mais de 3 anos (intercorrente) ou decorrem mais de 5 anos do fato sem julgamento final.',
    legalReference: 'Lei Federal nº 9.873/1999',
  },
];
