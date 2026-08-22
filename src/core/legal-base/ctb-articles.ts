/**
 * @file ctb-articles.ts
 * DefesaAI — Structured CTB Legal Database (Fase 3)
 * Comprehensive database of essential Brazilian Traffic Code articles,
 * requirements, nullity conditions, and procedural mandates.
 */

import { CtbArticleModel } from '../domain/knowledge-schema';

export const CTB_ARTICLES_DB: CtbArticleModel[] = [
  {
    article: 'Art. 280',
    title: 'Requisitos Formais de Validade do Auto de Infração de Trânsito',
    caput: 'Ocorrendo infração prevista na legislação de trânsito, lavrar-se-á auto de infração, do qual constará: I - tipificação da infração; II - local, data e hora do cometimento da infração; III - caracteres da placa de identificação do veículo, sua marca e espécie, e outros elementos julgados necessários à sua identificação; IV - o prontuário do condutor, sempre que possível; V - identificação do órgão ou entidade e da autoridade ou do agente autuador ou equipamento que comprovar a infração; VI - assinatura do infrator, sempre que possível.',
    paragraphsAndIncidents: [
      '§2º A infração deverá ser comprovada por declaração da autoridade ou do agente da autoridade de trânsito, por aparelho eletrônico ou por equipamento audiovisual, reações químicas ou qualquer outro meio tecnologicamente disponível, previamente regulamentado pelo CONTRAN.',
      '§4º O agente da autoridade de trânsito competente para lavrar o auto de infração poderá ser servidor civil, estatutário ou celetista ou, ainda, policial militar designado pela autoridade de trânsito com jurisdição sobre a via.',
    ],
    practicalApplication: 'Serve como fundamento primordial para anulação de autos com preenchimento incompleto, omissão do local exato, falta de matrícula do agente, erro de placa ou ausência de regulamentação do equipamento eletrônico.',
    nullityConsequence: 'Nulidade absoluta do AIT por vício formal insanável (Art. 281, parágrafo único, I do CTB).',
    relatedResolutions: ['Resolução CONTRAN nº 985/2022 (MBFT)', 'Portaria SENATRAN nº 354/2022'],
  },
  {
    article: 'Art. 281',
    title: 'Julgamento da Consistência do AIT e Decadência de 30 Dias',
    caput: 'A autoridade de trânsito, na esfera da competência estabelecida neste Código e dentro de sua circunscrição, julgará a consistência do auto de infração e aplicará a penalidade cabível.',
    paragraphsAndIncidents: [
      'Parágrafo único. O auto de infração será arquivado e seu registro julgado insubsistente:',
      'I - se considerado inconsistente ou irregular;',
      'II - se, no prazo máximo de trinta dias, não for expedida a notificação da autuação.',
    ],
    practicalApplication: 'Regra de ouro do direito de trânsito. Se a Notificação de Autuação (NA) for postada ou expedida após 30 dias contados da data da infração, opera-se a decadência do direito punitivo do Estado.',
    nullityConsequence: 'Arquivamento compulsório e cancelamento de todos os efeitos administrativos e financeiros.',
    relatedResolutions: ['Resolução CONTRAN nº 918/2022', 'Súmula 312 do STJ'],
  },
  {
    article: 'Art. 282',
    title: 'Notificação da Imposição de Penalidade (NP) e Garantia Recursal',
    caput: 'Aplicada a penalidade, será expedida notificação ao proprietário do veículo ou ao infrator, por remessa postal ou por qualquer outro meio tecnológico hábil, que assegure a ciência da imposição da penalidade.',
    paragraphsAndIncidents: [
      '§4º Da notificação deverá constar a data do término do prazo para apresentação de recurso pelo responsável pela infração, que não será inferior a trinta dias contados da data da notificação da penalidade.',
      '§6º O prazo para expedição da notificação da penalidade é de 180 (cento e oitenta) dias se houver defesa prévia, ou 360 (trezentos e sessenta) dias se não houver, sob pena de decadência.',
    ],
    practicalApplication: 'Garante o direito a prazo recursal não inferior a 30 dias para recurso à JARI e estabelece decadência expressa para expedição da Notificação de Penalidade.',
    nullityConsequence: 'Extinção da punibilidade e nulidade do procedimento por cerceamento de defesa.',
    relatedResolutions: ['Resolução CONTRAN nº 900/2022', 'Resolução CONTRAN nº 918/2022'],
  },
  {
    article: 'Art. 267',
    title: 'Direito Subjetivo à Conversão de Multa em Advertência por Escrito',
    caput: 'Deverá ser imposta a penalidade de advertência por escrito para as infrações de natureza leve ou média, passíveis de serem punidas com multa, caso o infrator não tenha cometido nenhuma outra infração nos últimos 12 (doze) meses.',
    paragraphsAndIncidents: [
      'Alterado pela Lei nº 14.071/2020: substituiu a expressão "poderá ser imposta" por "deverá ser imposta", transformando o ato em direito subjetivo vinculado da parte.',
    ],
    practicalApplication: 'Para qualquer infração de 3 pontos (leve) ou 4 pontos (média), o condutor sem histórico nos últimos 12 meses tem 100% de direito à isenção da multa e cancelamento dos pontos.',
    nullityConsequence: 'Indeferimento ilegal passível de mandado de segurança ou recurso ao CETRAN.',
    relatedResolutions: ['Resolução CONTRAN nº 918/2022, Art. 10'],
  },
  {
    article: 'Art. 285',
    title: 'Recurso à JARI e Concessão Obrigatória de Efeito Suspensivo',
    caput: 'O recurso contra a penalidade de multa imposta será interposto perante a autoridade que a aplicou, a qual o remeterá à JARI, no prazo de até 10 (dez) dias úteis.',
    paragraphsAndIncidents: [
      '§3º Se, por motivo de força maior, o recurso não for julgado dentro do prazo de 24 (vinte e quatro) meses, a autoridade que impôs a penalidade, de ofício, ou por solicitação do recorrente, concederá efeito suspensivo (Redação dada pela Lei nº 14.229/2021).',
    ],
    practicalApplication: 'Garante que durante o trâmite do recurso à JARI o condutor não sofra bloqueio no licenciamento, restrição no Renavam ou suspensão da CNH.',
    nullityConsequence: 'Efeito suspensivo de pleno direito até julgamento final em última instância.',
    relatedResolutions: ['Resolução CONTRAN nº 900/2022'],
  },
  {
    article: 'Art. 288',
    title: 'Recurso ao CETRAN e Encerramento da Instância Administrativa',
    caput: 'Das decisões da JARI cabe recurso a ser interposto, no prazo de trinta dias contado da publicação ou da notificação da decisão.',
    paragraphsAndIncidents: [
      'Art. 289. O recurso de que trata o art. 288 será julgado no prazo de vinte e quatro meses pelo CETRAN ou pelo CONTRANDIFE.',
    ],
    practicalApplication: 'Segunda e última instância no âmbito administrativo do Sistema Nacional de Trânsito.',
    nullityConsequence: 'Impossibilidade de exigibilidade da penalidade antes do julgamento final pelo órgão colegiado.',
    relatedResolutions: ['Resolução CONTRAN nº 900/2022'],
  },
  {
    article: 'Art. 90',
    title: 'Inexigibilidade de Sanção por Sinalização Insuficiente ou Incorreta',
    caput: 'Não serão aplicadas as sanções previstas neste Código por inobservância à sinalização quando esta for insuficiente ou incorreta.',
    paragraphsAndIncidents: [
      '§1º O órgão ou entidade de trânsito com circunscrição sobre a via é responsável pela implantação da sinalização, respondendo pela sua falta, insuficiência ou incorreta colocação.',
    ],
    practicalApplication: 'Defesa fundamental para multas de radar sem placa R-19, semáforo encoberto por árvores, faixa de pedestre apagada ou placas em desacordo com os manuais de tráfego.',
    nullityConsequence: 'Atipicidade material e cancelamento da autuação.',
    relatedResolutions: ['Resolução CONTRAN nº 798/2020', 'Resolução CONTRAN nº 973/2022'],
  },
  {
    article: 'Art. 218',
    title: 'Infrações por Excesso de Velocidade e Gradação de Gravidade',
    caput: 'Transitar em velocidade superior à máxima permitida para o local, medida por instrumento ou equipamento hábil, em rodovias, vias de trânsito rápido, vias arteriais e demais vias:',
    paragraphsAndIncidents: [
      'I - quando a velocidade for superior à máxima em até vinte por cento: Infração média (4 pontos, R$ 130,16);',
      'II - quando a velocidade for superior à máxima em mais de vinte por cento até cinquenta por cento: Infração grave (5 pontos, R$ 195,23);',
      'III - quando a velocidade for superior à máxima em mais de cinquenta por cento: Infração gravíssima (3x, R$ 880,41, e suspensão imediata do direito de dirigir).',
    ],
    practicalApplication: 'A apuração depende impreterivelmente de medição por equipamento homologado pelo INMETRO com margem de tolerância deduzida (velocidade considerada).',
    nullityConsequence: 'Nulidade se o radar não possuir laudo válido de até 12 meses ou se a tolerância metrológica rebaixar o enquadramento.',
    relatedResolutions: ['Resolução CONTRAN nº 798/2020', 'Portaria INMETRO nº 158/2022'],
  },
  {
    article: 'Art. 165 e 165-A',
    title: 'Lei Seca: Condução sob Efeito de Álcool e Recusa ao Teste',
    caput: 'Art. 165. Dirigir sob a influência de álcool ou de qualquer outra substância psicoativa. Art. 165-A. Recusar-se a ser submetido a teste, exame clínico, perícia ou outro procedimento que permita certificar influência de álcool.',
    paragraphsAndIncidents: [
      'Penalidade: Infração gravíssima (fator 10x - R$ 2.934,70) e suspensão do direito de dirigir por 12 (doze) meses.',
      'Obrigatória aplicação da Resolução CONTRAN nº 432/2013 para verificação de margem metrológica ou preenchimento do Termo de Constatação de Sinais.',
    ],
    practicalApplication: 'A recusa ao bafômetro isoladamente não dispensa o agente de lavrar o termo descritivo de sinais clínicos do Anexo II da Res. 432.',
    nullityConsequence: 'Anulação integral do auto e do processo suspensivo por ausência de prova de materialidade.',
    relatedResolutions: ['Resolução CONTRAN nº 432/2013', 'Portaria INMETRO nº 369/2021'],
  },
  {
    article: 'Art. 252',
    title: 'Uso de Telefone Celular ao Volante',
    caput: 'Dirigir o veículo: VI - utilizando-se de fones nos ouvidos conectados a aparelhagem sonora ou de telefone celular;',
    paragraphsAndIncidents: [
      'Parágrafo único. A hipótese prevista no inciso V caracterizar-se-á como infração gravíssima no caso de o condutor estar segurando ou manuseando telefone celular.',
    ],
    practicalApplication: 'Distingue-se entre condutor manuseando aparelho solto e o uso de suporte veicular para navegação GPS ou comando de voz.',
    nullityConsequence: 'Falta de descrição detalhada das circunstâncias fáticas pelo agente anula a autuação (Res. 985/2022).',
    relatedResolutions: ['Resolução CONTRAN nº 985/2022 (MBFT - Ficha 736-62)'],
  },
];
