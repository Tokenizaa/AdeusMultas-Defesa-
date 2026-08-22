/**
 * @file resolutions.ts
 * DefesaAI — CONTRAN, SENATRAN and INMETRO Regulatory Database (Fase 3)
 */

import { ResolutionModel } from '../domain/knowledge-schema';

export const RESOLUTIONS_DB: ResolutionModel[] = [
  {
    number: 'Resolução CONTRAN nº 798/2020',
    body: 'CONTRAN',
    year: 2020,
    subject: 'Requisitos técnicos mínimos para a fiscalização da velocidade de veículos automotores, reboques e semirreboques.',
    keyArticles: 'Art. 4º, III (Verificação metrológica periódica anual pelo INMETRO); Art. 12 (Sinalização R-19 visível e sem obstáculos); Tabela I (Margem de tolerância metrológica).',
    impactOnDefenses: 'Principal norma regulamentadora de radares fixos, portáteis e estáticos. A ausência de laudo do INMETRO válido até 12 meses na data do fato anula a autuação.',
  },
  {
    number: 'Resolução CONTRAN nº 985/2022 (MBFT)',
    body: 'CONTRAN',
    year: 2022,
    subject: 'Aprova o Manual Brasileiro de Fiscalização de Trânsito (MBFT) unificado para todo o território nacional.',
    keyArticles: 'Normas gerais de fiscalização: preenchimento obrigatório e circunstanciado do campo de observações para infrações constatadas sem abordagem.',
    impactOnDefenses: 'Obriga o agente de trânsito a descrever detalhadamente as condições de visibilidade, ângulo e motivo da não abordagem para celular, cinto de segurança e farol.',
  },
  {
    number: 'Resolução CONTRAN nº 432/2013',
    body: 'CONTRAN',
    year: 2013,
    subject: 'Procedimentos a serem adotados pelas autoridades de trânsito na fiscalização do consumo de álcool ou substâncias psicoativas.',
    keyArticles: 'Art. 4º (Verificação metrológica do etilômetro); Art. 5º e Anexo II (Termo de Constatação de Sinais de Alteração da Capacidade Psicomotora); Tabela de medição considerada.',
    impactOnDefenses: 'Imprescindível para defesas de Lei Seca (Art. 165 e 165-A). A falta do termo formal de sinais clínicos na recusa do bafômetro gera nulidade do AIT.',
  },
  {
    number: 'Resolução CONTRAN nº 973/2022',
    body: 'CONTRAN',
    year: 2022,
    subject: 'Aprova o Volume V - Sinalização Semafórica do Manual Brasileiro de Sinalização de Trânsito.',
    keyArticles: 'Tabelas de tempo de sinal amarelo (3 a 5 segundos conforme a velocidade limite da via); Critérios do dilema do amarelo.',
    impactOnDefenses: 'Utilizada para anular infrações de avanço de sinal vermelho (Art. 208) quando o tempo de amarelo é insuficiente para frenagem segura do veículo.',
  },
  {
    number: 'Resolução CONTRAN nº 900/2022',
    body: 'CONTRAN',
    year: 2022,
    subject: 'Padroniza o procedimento para apresentação de defesa prévia e recursos administrativos no âmbito do SNT.',
    keyArticles: 'Art. 3º (Documentação necessária); Art. 6º (Prazos de remessa à JARI e ao CETRAN); Art. 11 (Obrigatoriedade de motivação das decisões).',
    impactOnDefenses: 'Garante o padrão uniforme de protocolo e impede decisões genéricas das JARIs sem fundamentação fática.',
  },
  {
    number: 'Resolução CONTRAN nº 918/2022',
    body: 'CONTRAN',
    year: 2022,
    subject: 'Consolida as normas sobre procedimento de arrecadação e repasse dos valores das multas de trânsito e notificação.',
    keyArticles: 'Art. 4º (Notificação da Autuação); Art. 10 (Regras para conversão em advertência por escrito); Art. 12 (Notificação de Penalidade).',
    impactOnDefenses: 'Disciplina os trâmites de dupla notificação e concessão compulsória de advertência por escrito.',
  },
  {
    number: 'Portaria SENATRAN nº 354/2022',
    body: 'SENATRAN',
    year: 2022,
    subject: 'Estabelece os campos e informações mínimas que devem compor o Auto de Infração de Trânsito (AIT).',
    keyArticles: 'Art. 2º (Campos de identificação do órgão, veículo, condutor, local com referência métrica e equipamento homologado).',
    impactOnDefenses: 'Define a matriz de nulidade formal dos autos de infração emitidos por qualquer órgão do país.',
  },
  {
    number: 'Portaria INMETRO nº 158/2022',
    body: 'INMETRO',
    year: 2022,
    subject: 'Regulamento Técnico Metrológico para medidores de velocidade de veículos automotores (radares).',
    keyArticles: 'Item 4.1 (Verificação inicial e periódica com periodicidade improrrogável de 12 meses).',
    impactOnDefenses: 'Regula o laudo técnico do IPEM/INMETRO obrigatório para validação da velocidade apurada.',
  },
];
