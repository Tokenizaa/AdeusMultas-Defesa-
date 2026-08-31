/**
 * @file procedures-catalog.ts
 * DefesaAI — Procedures Library (Fase 4)
 * Comprehensive library modeling all 9 administrative traffic defense procedures,
 * workflows, stages, documentary requirements, and statutory checklists.
 */

import { ProcedureModel } from '../domain/knowledge-schema';

export const PROCEDURES_CATALOG: ProcedureModel[] = [
  {
    id: 'recurso_jari',
    code: 'PROC_001',
    name: 'Recurso Ordinário à JARI (1ª Instância Administrativa)',
    category: 'Instância Recursal Colegiada',
    objective: 'Impugnar a Notificação de Imposição de Penalidade perante o colegiado da JARI, atacando tanto as preliminares processuais quanto o mérito fático e probatório da autuação.',
    legalBasis: 'Art. 285 do CTB c/c Resolução CONTRAN nº 900/2022',
    competentBody: 'Junta Administrativa de Recursos de Infrações (JARI) do Órgão Autuador',
    suspensiveEffectRule: 'Concede efeito suspensivo automático após 24 meses (Lei 14.229/21) ou a pedido do recorrente, vedando restrição ao CRLV.',
    stages: [
      { stepNumber: 1, name: 'Recebimento da Notificação de Penalidade (NP)', description: 'Verificação da tempestividade e valor com desconto de 20%.', deadlineDays: 30, actingParty: 'Cidadão/Condutor' },
      { stepNumber: 2, name: 'Elaboração das Razões Recursais à JARI', description: 'Redação das preliminares, mérito aprofundado, juntada de jurisprudência e requerimentos.', deadlineDays: 10, actingParty: 'Cidadão/Condutor' },
      { stepNumber: 3, name: 'Protocolo Tempestivo das Razões', description: 'Juntada da petição e documentos comprobatórios perante a JARI.', deadlineDays: 30, actingParty: 'Cidadão/Condutor' },
      { stepNumber: 4, name: 'Distribuição ao Relator e Julgamento em Colegiado', description: 'Sessão de julgamento com voto do relator e emissão do Acórdão Administrativo.', deadlineDays: 720, actingParty: 'JARI' },
    ],
    requiredDocuments: [
      { name: 'Cópia da Notificação de Penalidade (NP) ou boleto da multa', required: true, description: 'Comprova a imposição da penalidade recorrida.' },
      { name: 'Cópia da CNH do recorrente', required: true, description: 'Documento de habilitação do condutor.' },
      { name: 'Cópia do CRLV do veículo autuado', required: true, description: 'Documento do veículo.' },
      { name: 'Provas documentais anexas (fotos, laudos, declarações)', required: false, description: 'Provas materiais que demonstrem a atipicidade da conduta.' },
    ],
    applicableGrounds: [
      'ARG-001', 'ARG-002', 'ARG-003', 'ARG-004', 'ARG-005', 'ARG-006', 'ARG-007', 'ARG-008',
      'ARG-009', 'ARG-010', 'ARG-011', 'ARG-012', 'ARG-013', 'ARG-014', 'ARG-015', 'ARG-016',
      'ARG-017', 'ARG-018', 'ARG-019', 'ARG-020', 'ARG-021', 'ARG-022', 'ARG-023', 'ARG-024',
      'ARG-025', 'ARG-026', 'ARG-027', 'ARG-028', 'ARG-029', 'ARG-030', 'ARG-031', 'ARG-032',
      'ARG-033', 'ARG-034', 'ARG-035', 'ARG-036', 'ARG-037', 'ARG-038', 'ARG-048', 'ARG-049',
      'ARG-050', 'ARG-051',
    ],
    availableTemplates: ['TPL_RECURSO_JARI'], // variantes (lei seca/radar) são composições de blocos, não templates separados
    executionChecklist: [
      'Garantir protocolo dentro da data limite expressa no campo "Prazo de Recurso" da NP',
      'Articular pedidos subsidiários (nulidade principal ou cancelamento de pontos)',
      'Requerer expressamente a concessão de efeito suspensivo nos termos do Art. 285, §3º',
      'Juntar comprovantes e certidões que fundamentem o fato alegado',
    ],
    notes: 'Não é obrigatório pagar a multa para recorrer à JARI (Súmula Vinculante 21 do STF e Art. 284 do CTB).',
     // Versioning and temporal validity
     validFrom: '1998-01-22',
     validUntil: null,
     version: 1,
  },
  {
    id: 'recurso_cetran',
    code: 'PROC_002',
    name: 'Recurso Especial ao CETRAN / CONTRAN (2ª Instância Final)',
    category: 'Instância Recursal Colegiada Final',
    objective: 'Reapreciar a matéria perante o Conselho Estadual de Trânsito após indeferimento na JARI, demonstrando ausência de motivação, violação à lei federal ou divergência jurisprudencial.',
    legalBasis: 'Art. 288 e 289 do CTB c/c Resolução CONTRAN nº 900/2022',
    competentBody: 'Conselho Estadual de Trânsito (CETRAN) ou CONTRANDIFE',
    suspensiveEffectRule: 'Mantém a suspensividade da penalidade até o trânsito em julgado administrativo.',
    stages: [
      { stepNumber: 1, name: 'Notificação do Indeferimento da JARI', description: 'Análise dos fundamentos do voto do relator da JARI.', deadlineDays: 30, actingParty: 'Cidadão/Condutor' },
      { stepNumber: 2, name: 'Demonstração de Vícios de Motivação da JARI', description: 'Ataque à decisão genérica de 1ª instância (violação ao Art. 11 da Res. 900/2022).', deadlineDays: 10, actingParty: 'Cidadão/Condutor' },
      { stepNumber: 3, name: 'Protocolo das Razões ao CETRAN', description: 'Remessa dos autos ao colegiado estadual.', deadlineDays: 30, actingParty: 'Cidadão/Condutor' },
      { stepNumber: 4, name: 'Acórdão do Colegiado Estadual', description: 'Julgamento terminativo da via administrativa.', deadlineDays: 720, actingParty: 'CETRAN' },
    ],
    requiredDocuments: [
      { name: 'Cópia da Decisão/Acórdão da JARI que indeferiu a 1ª instância', required: true, description: 'Decisão recorrida.' },
      { name: 'Cópia do Recurso da JARI interposto anteriormente', required: true, description: 'Histórico dos argumentos apresentados.' },
      { name: 'Cópia da CNH e CRLV do veículo', required: true, description: 'Documentos do condutor e do veículo.' },
    ],
    applicableGrounds: [
      'ARG-001', 'ARG-002', 'ARG-003', 'ARG-004', 'ARG-005', 'ARG-006', 'ARG-007', 'ARG-008',
      'ARG-009', 'ARG-010', 'ARG-011', 'ARG-012', 'ARG-013', 'ARG-014', 'ARG-015', 'ARG-016',
      'ARG-017', 'ARG-018', 'ARG-019', 'ARG-020', 'ARG-021', 'ARG-022', 'ARG-023', 'ARG-024',
      'ARG-025', 'ARG-026', 'ARG-027', 'ARG-028', 'ARG-029', 'ARG-030', 'ARG-031', 'ARG-032',
      'ARG-033', 'ARG-034', 'ARG-035', 'ARG-036', 'ARG-037', 'ARG-038', 'ARG-048', 'ARG-049',
      'ARG-050', 'ARG-051', 'ARG-052',
    ],
    availableTemplates: ['TPL_RECURSO_CETRAN'],
    executionChecklist: [
      'Apontar expressamente que a JARI não analisou as preliminares arguidas',
      'Citar jurisprudência consolidada do STJ e tribunais de justiça',
      'Reiterar pedido de efeito suspensivo integral',
    ],
    notes: 'O CETRAN é a última instância administrativa. Caso indeferido, a matéria só pode ser rediscutida no Poder Judiciário.',
  },
  {
    id: 'suspensao_cnh',
    code: 'PROC_003',
    name: 'Defesa em Processo de Suspensão do Direito de Dirigir (PSDD)',
    category: 'Processos Específicos de Habilitação',
    objective: 'Evitar o bloqueio da CNH por acúmulo de pontos (20, 30 ou 40 pontos - Lei 14.071/20) ou por infração mandatória autossuspensiva (Lei Seca, velocidade acima de 50%, manobra perigosa).',
    legalBasis: 'Art. 261 do CTB c/c Resolução CONTRAN nº 723/2018 e Resolução nº 844/2021',
    competentBody: 'DETRAN de registro da CNH do condutor (Comissão Especial de Julgamento de Habilitação)',
    suspensiveEffectRule: 'O condutor pode continuar dirigindo normalmente enquanto o processo administrativo de suspensão não for julgado em última instância.',
    stages: [
      { stepNumber: 1, name: 'Instauração da Notificação do PSDD', description: 'DETRAN abre processo específico de suspensão da habilitação.', deadlineDays: 30, actingParty: 'Autoridade de Trânsito' },
      { stepNumber: 2, name: 'Elaboração de Defesa Técnica do PSDD', description: 'Impugnação das multas componentes e vícios de instauração.', deadlineDays: 15, actingParty: 'Cidadão/Condutor' },
      { stepNumber: 3, name: 'Interposição de Recursos em 1ª e 2ª Instâncias', description: 'Recurso à JARI de Habilitação e posterior ao CETRAN se necessário.', deadlineDays: 30, actingParty: 'Cidadão/Condutor' },
      { stepNumber: 4, name: 'Julgamento Final e Não Aplicação de Penalidade', description: 'Arquivamento do processo ou expedição de termo de cumprimento.', deadlineDays: 360, actingParty: 'DETRAN' },
    ],
    requiredDocuments: [
      { name: 'Notificação de Instauração do Processo de Suspensão (PSDD)', required: true, description: 'Documento que informa a contagem de pontos ou o artigo autossuspensivo.' },
      { name: 'Cópia da CNH e RG/CPF', required: true, description: 'Identificação do condutor com prontuário.' },
      { name: 'Extrato consolidado de pontuação do DETRAN', required: true, description: 'Histórico de infrações nos últimos 12 meses.' },
    ],
    applicableGrounds: [
      'ARG-042', 'ARG-043', 'ARG-044', 'ARG-047', 'ARG-025', 'ARG-026', 'ARG-027', 'ARG-028',
      'ARG-029', 'ARG-030', 'ARG-048', 'ARG-049', 'ARG-050', 'ARG-052',
    ],
    availableTemplates: ['TPL_SUSPENSAO_CNH'], // alias legado do PSDD (mesmos blocos)
    executionChecklist: [
      'Verificar se as multas componentes transitaram em julgado regularmente',
      'Checar se o condutor exerce atividade remunerada (EAR) para regra benéfica de 40 pontos',
      'Alegar prescrição intercorrente caso o processo tenha ficado parado por mais de 3 anos',
    ],
    notes: 'A entrega da CNH e o curso de reciclagem só são devidos após o encerramento de todas as instâncias recursais.',
  },
  {
    id: 'cassacao_cnh',
    code: 'PROC_004',
    name: 'Defesa em Processo de Cassação da CNH (PCDD)',
    category: 'Processos Específicos de Habilitação',
    objective: 'Defender condutor acusado de dirigir com a CNH suspensa ou reincidir em infrações mandatórias no período de 12 meses, evitando a perda total da carteira por 2 anos.',
    legalBasis: 'Art. 263 do CTB c/c Resolução CONTRAN nº 723/2018',
    competentBody: 'Diretoria de Habilitação do DETRAN Estadual',
    suspensiveEffectRule: 'Garante o pleno exercício da condução até a decisão irrecorrível na esfera administrativa.',
    stages: [
      { stepNumber: 1, name: 'Notificação de Instauração do PCDD', description: 'Ciência do processo que visa cassar o documento por 2 anos.', deadlineDays: 30, actingParty: 'Autoridade de Trânsito' },
      { stepNumber: 2, name: 'Apresentação de Defesa Administrativa', description: 'Demonstração de não direção no momento da autuação ou nulidade do PSDD prévio.', deadlineDays: 30, actingParty: 'Cidadão/Condutor' },
      { stepNumber: 3, name: 'Recursos à JARI e CETRAN', description: 'Apresentação de provas fáticas e testemunhais.', deadlineDays: 30, actingParty: 'Cidadão/Condutor' },
    ],
    requiredDocuments: [
      { name: 'Notificação de Instauração de Cassação', required: true, description: 'Notificação inicial do processo.' },
      { name: 'Cópia da CNH e comprovante de endereço', required: true, description: 'Dados do condutor.' },
      { name: 'Provas de que outro condutor dirigia no flagrante', required: false, description: 'Declarações, bilhetes de pedágio, contratos.' },
    ],
    applicableGrounds: [
      'ARG-045', 'ARG-046', 'ARG-044', 'ARG-048', 'ARG-049', 'ARG-050', 'ARG-052',
    ],
    availableTemplates: ['TPL_CASSACAO_CNH'], // alias legado do PCDD (mesmos blocos)
    executionChecklist: [
      'Verificar se houve abordagem presencial do condutor com CNH suspensa',
      'Checar a validade do processo de suspensão anterior',
    ],
    notes: 'A cassação impõe a perda definitiva da habilitação e obriga o condutor a reiniciar o processo de 1ª habilitação após 2 anos.',
  },
  {
    id: 'indicacao_condutor',
    code: 'PROC_005',
    name: 'Formulário de Indicação do Real Condutor Infrator (FARI)',
    category: 'Procedimentos de Responsabilidade',
    objective: 'Transferir a responsabilidade pelas infrações cometidas por terceiro para a pontuação do real condutor, desonerando o proprietário do veículo.',
    legalBasis: 'Art. 257, §7º e §8º do CTB c/c Resolução CONTRAN nº 918/2022',
    competentBody: 'Órgão Autuador com jurisdição sobre a via',
    suspensiveEffectRule: 'Transfere o lançamento de pontos após validação formal das assinaturas.',
    stages: [
      { stepNumber: 1, name: 'Preenchimento do FARI', description: 'Qualificação completa do proprietário e do condutor responsável.', deadlineDays: 30, actingParty: 'Cidadão/Condutor' },
      { stepNumber: 2, name: 'Coleta de Assinaturas e Documentos', description: 'Assinatura idêntica à do documento de identidade ou digital via GOV.BR.', deadlineDays: 5, actingParty: 'Cidadão/Condutor' },
      { stepNumber: 3, name: 'Protocolo junto ao Órgão Autuador', description: 'Envio online ou físico dentro do prazo improrrogável da Notificação de Autuação.', deadlineDays: 30, actingParty: 'Cidadão/Condutor' },
    ],
    requiredDocuments: [
      { name: 'Formulário FARI devidamente preenchido e assinado', required: true, description: 'Formulário oficial do órgão autuador.' },
      { name: 'Cópia da CNH do real condutor indicado', required: true, description: 'Habilitação válida na data do evento.' },
      { name: 'Cópia do documento de identidade do proprietário', required: true, description: 'Identidade com assinatura comparável.' },
    ],
    applicableGrounds: ['ARG-039', 'ARG-040', 'ARG-041', 'ARG-048'],
    availableTemplates: ['TPL_FICI_INDICACAO'],
    executionChecklist: [
      'Garantir que as assinaturas correspondam com perfeição aos documentos apresentados',
      'Protocolar antes do vencimento impresso na Notificação de Autuação',
    ],
    notes: 'Para pessoas jurídicas (PJ), a não indicação do condutor gera a temida multa NIC (Não Indicação de Condutor) que multiplica o valor da multa.',
  },
  {
    id: 'conversao_advertencia',
    code: 'PROC_006',
    name: 'Requerimento de Conversão em Advertência por Escrito',
    category: 'Procedimentos de Benefício Legal',
    objective: 'Exercer o direito subjetivo previsto no Art. 267 do CTB para cancelar a cobrança em dinheiro e zerar os pontos de multas leves ou médias de condutores ficha-limpa.',
    legalBasis: 'Art. 267 do CTB (Redação pela Lei nº 14.071/2020) c/c Resolução CONTRAN nº 918/2022',
    competentBody: 'Autoridade de Trânsito do Órgão Autuador',
    suspensiveEffectRule: 'Substitui compulsoriamente a penalidade de multa pecuniária pela penalidade educativa de advertência.',
    stages: [
      { stepNumber: 1, name: 'Verificação dos Requisitos Objetivos', description: 'Infração de natureza LEVE (3 pts) ou MÉDIA (4 pts) e prontuário sem autuações nos 12 meses anteriores.', deadlineDays: 5, actingParty: 'Cidadão/Condutor' },
      { stepNumber: 2, name: 'Emissão de Certidão de Prontuário Positiva/Negativa', description: 'Download da certidão no portal do DETRAN.', deadlineDays: 2, actingParty: 'Cidadão/Condutor' },
      { stepNumber: 3, name: 'Protocolo do Requerimento na Defesa Prévia', description: 'Pedido formal endereçado à autoridade competente.', deadlineDays: 30, actingParty: 'Cidadão/Condutor' },
    ],
    requiredDocuments: [
      { name: 'Requerimento formal baseado no Art. 267 do CTB', required: true, description: 'Petição solicitando a conversão compulsória.' },
      { name: 'Cópia da Notificação de Autuação', required: true, description: 'Espelho da autuação recebida.' },
      { name: 'Extrato de pontos / Prontuário do condutor (últimos 12 meses)', required: true, description: 'Comprova ausência de reincidência infracional.' },
      { name: 'Cópia da CNH do condutor requerente', required: true, description: 'Documento de habilitação.' },
    ],
    applicableGrounds: ['ARG-051', 'ARG-048'],
    availableTemplates: ['TPL_CONVERSAO_ADVERTENCIA'],
    executionChecklist: [
      'Confirmar que o código da infração corresponde a natureza leve ou média',
      'Confirmar que a data da infração anterior mais recente é superior a 365 dias',
    ],
    notes: 'Após a Lei 14.071/2020, o órgão autuador é OBRIGADO por lei a converter a multa, não havendo margem para indeferimento discricionário.',
  },
  {
    id: 'analise_tecnica',
    code: 'PROC_007',
    name: 'Parecer Técnico de Consistência e Vícios Formais',
    category: 'Serviços Periciais & Diagnósticos',
    objective: 'Emitir relatório técnico especializado avaliando todas as vulnerabilidades formais, metrológicas, de engenharia e procedimentais do Auto de Infração de Trânsito.',
    legalBasis: 'Normas técnicas da ABNT, CTB e Resoluções do CONTRAN',
    competentBody: 'Consultoria Especializada DefesaAI',
    suspensiveEffectRule: 'Documento preparatório e probatório utilizado como anexo instrutório para defesas e recursos.',
    stages: [
      { stepNumber: 1, name: 'Extração e Auditoria dos Metadados do AIT', description: 'Leitura estruturada de caracteres, coordenadas, códigos e datas.', deadlineDays: 1, actingParty: 'Cidadão/Condutor' },
      { stepNumber: 2, name: 'Cruzamento com Matriz de Regras e Precedentes', description: 'Execução do Motor Especialista de Regras Determinísticas.', deadlineDays: 1, actingParty: 'Cidadão/Condutor' },
      { stepNumber: 3, name: 'Emissão do Dossiê com Score de Sucesso', description: 'Relatório estruturado com teses recomendadas e checklist de protocolo.', deadlineDays: 1, actingParty: 'Cidadão/Condutor' },
    ],
    requiredDocuments: [
      { name: 'Imagem legível do Auto de Infração ou Notificação', required: true, description: 'Para extração dos dados técnicos e cruzamento.' },
    ],
    applicableGrounds: [
      'ARG-001', 'ARG-002', 'ARG-003', 'ARG-004', 'ARG-005', 'ARG-006', 'ARG-007', 'ARG-008',
      'ARG-009', 'ARG-010', 'ARG-011', 'ARG-012', 'ARG-013', 'ARG-014', 'ARG-015', 'ARG-016',
      'ARG-017', 'ARG-018', 'ARG-019', 'ARG-020', 'ARG-021', 'ARG-022', 'ARG-023', 'ARG-024',
      'ARG-025', 'ARG-026', 'ARG-027', 'ARG-028', 'ARG-029', 'ARG-030', 'ARG-031', 'ARG-032',
      'ARG-033', 'ARG-034', 'ARG-035', 'ARG-036', 'ARG-037', 'ARG-038', 'ARG-048', 'ARG-049',
      'ARG-050',
    ],
    availableTemplates: [], // KNOWLEDGE_GAP: laudo técnico ainda sem template canônico (composição futura)
    executionChecklist: [
      'Realizar checagem de 100% dos campos normativos da Portaria SENATRAN 354',
      'Emitir matriz de risco com probabilidade percentual matemática',
    ],
    notes: 'O parecer técnico confere autoridade pericial e embasamento inquestionável aos recursos apresentados perante as comissões da JARI.',
  },
  {
    id: 'relatorio_pericial',
    code: 'PROC_008',
    name: 'Relatório Técnico Pericial de Engenharia e Metrologia',
    category: 'Serviços Periciais & Diagnósticos',
    objective: 'Produzir laudo pericial circunstanciado demonstrando falhas nos estudos técnicos de instalação de radares, defeito no laço indutivo ou tempo de amarelo insuficiente.',
    legalBasis: 'Resoluções CONTRAN nº 798/2020 e 973/2022 c/c Portarias do INMETRO',
    competentBody: 'Comissões de Julgamento da JARI, CETRAN e Poder Judiciário',
    suspensiveEffectRule: 'Prova pericial anexa com alto poder de convencimento técnico.',
    stages: [
      { stepNumber: 1, name: 'Coleta de Dados Georreferenciados do Local', description: 'Verificação da sinalização no local e histórico metrológico.', deadlineDays: 2, actingParty: 'Cidadão/Condutor' },
      { stepNumber: 2, name: 'Cálculos de Cinemática e Tolerância', description: 'Verificação de velocidade considerada e distância da sinalização R-19.', deadlineDays: 2, actingParty: 'Cidadão/Condutor' },
      { stepNumber: 3, name: 'Consolidação do Laudo Pericial', description: 'Geração do dossiê técnico com anotações de responsabilidade.', deadlineDays: 1, actingParty: 'Cidadão/Condutor' },
    ],
    requiredDocuments: [
      { name: 'Auto de Infração e fotos do radar', required: true, description: 'Dados do equipamento e enquadramento.' },
      { name: 'Fotos da via e da sinalização do trecho', required: false, description: 'Evidências do local fiscalizado.' },
    ],
    applicableGrounds: [
      'ARG-001', 'ARG-002', 'ARG-003', 'ARG-004', 'ARG-005', 'ARG-006', 'ARG-007', 'ARG-009',
      'ARG-010', 'ARG-012', 'ARG-013', 'ARG-014', 'ARG-016', 'ARG-026', 'ARG-028', 'ARG-029',
    ],
    availableTemplates: [], // KNOWLEDGE_GAP: laudo pericial de metrologia ainda sem template canônico
    executionChecklist: [
      'Validar distância métrica entre a placa R-19 e o ponto do sensor',
      'Conferir histórico de aprovação de modelo pelo INMETRO',
    ],
    notes: 'Documento de nível pericial frequentemente determinante para reversão de multas de radar e semáforo.',
  },
  // ==========================================
  // ALIASES DOCUMENTAIS (PROC_009/PROC_010) — Defesa Prévia (NA) e variantes
  // de processo de suspensão/cassação. O template de suspensão/cassação é
  // compartilhado; estas entradas garantem que os identificadores legados
  // ('suspensao_cnh'/'cassacao_cnh') e os canônicos de processo coexistam.
  // ==========================================
  {
    id: 'defesa_previa',
    code: 'PROC_009',
    name: 'Defesa Prévia à Notificação de Autuação (Art. 281 CTB)',
    category: 'Instância Administrativa Inicial',
    objective: 'Apresentar defesa prévia contra a Notificação de Autuação (NA), fase inicial anterior à aplicação da penalidade, atacando vícios formais, materiais e metrológicos do Auto de Infração de Trânsito.',
    legalBasis: 'Art. 281, Parágrafo Único do CTB',
    competentBody: 'Autoridade de Trânsito do Órgão Autuador',
    suspensiveEffectRule: 'Defesa prévia não suspende o prazo de imposição da penalidade, mas permite o saneamento do auto.',
    stages: [
      { stepNumber: 1, name: 'Recebimento da Notificação de Autuação (NA)', description: 'Ciência da autuação sem imposição de penalidade, com prazo para defesa prévia.', deadlineDays: 30, actingParty: 'Cidadão/Condutor' },
      { stepNumber: 2, name: 'Elaboração da Defesa Prévia', description: 'Arguição de nulidades formais e mérito antes do julgamento da penalidade.', deadlineDays: 15, actingParty: 'Cidadão/Condutor' },
      { stepNumber: 3, name: 'Protocolo da Defesa Prévia', description: 'Apresentação perante o órgão autuador, que decidirá pela manutenção ou cancelamento do auto.', deadlineDays: 30, actingParty: 'Cidadão/Condutor' },
    ],
    requiredDocuments: [
      { name: 'Cópia da Notificação de Autuação (NA)', required: true, description: 'Documento que dá ciência da autuação.' },
      { name: 'Cópia da CNH do requerente', required: true, description: 'Documento de habilitação do condutor.' },
      { name: 'Cópia do CRLV do veículo autuado', required: true, description: 'Documento do veículo.' },
    ],
    applicableGrounds: [
      'ARG-048', 'ARG-049', 'ARG-050', 'ARG-001', 'ARG-002', 'ARG-003', 'ARG-004', 'ARG-005',
      'ARG-006', 'ARG-015', 'ARG-020', 'ARG-025', 'ARG-031', 'ARG-035', 'ARG-036', 'ARG-038',
      'ARG-051',
    ],
    availableTemplates: ['TPL_DEFESA_PREVIA'],
    executionChecklist: [
      'Verificar a tempestividade da apresentação perante a NA',
      'Argüir vícios formais da autuação e falhas metrológicas',
      'Solicitar o cancelamento do auto antes da imposição de penalidade',
    ],
    notes: 'A Defesa Prévia (Art. 281 CTB) é fase DISTINTA do Recurso à JARI (Art. 285 CTB, contra a NIP). Esta ProcedureType separa conceitualmente as duas fases.',
  },
  {
    id: 'processo_suspensao',
    code: 'PROC_010',
    name: 'Defesa em Processo de Suspensão do Direito de Dirigir (PSDD)',
    category: 'Processos Específicos de Habilitação',
    objective: 'Variante canônica do Processo de Suspensão (PSDD). Defesa técnica contra a Notificação de Instauração de Processo de Suspensão da CNH por pontos ou infração autossuspensiva.',
    legalBasis: 'Art. 261 do CTB c/c Resolução CONTRAN nº 723/2018 e Resolução nº 844/2021',
    competentBody: 'DETRAN de registro da CNH do condutor (Comissão Especial de Julgamento de Habilitação)',
    suspensiveEffectRule: 'O condutor pode continuar dirigindo enquanto o processo administrativo de suspensão não transitar em julgado.',
    stages: [
      { stepNumber: 1, name: 'Instauração da Notificação do PSDD', description: 'DETRAN abre processo específico de suspensão da habilitação.', deadlineDays: 30, actingParty: 'Autoridade de Trânsito' },
      { stepNumber: 2, name: 'Elaboração de Defesa Técnica do PSDD', description: 'Impugnação das multas componentes e vícios de instauração.', deadlineDays: 15, actingParty: 'Cidadão/Condutor' },
      { stepNumber: 3, name: 'Interposição de Recursos em 1ª e 2ª Instâncias', description: 'Recurso à JARI de Habilitação e posterior ao CETRAN se necessário.', deadlineDays: 30, actingParty: 'Cidadão/Condutor' },
    ],
    requiredDocuments: [
      { name: 'Notificação de Instauração do Processo de Suspensão (PSDD)', required: true, description: 'Documento que informa a contagem de pontos ou o artigo autossuspensivo.' },
      { name: 'Cópia da CNH e RG/CPF', required: true, description: 'Identificação do condutor com prontuário.' },
      { name: 'Extrato consolidado de pontuação do DETRAN', required: true, description: 'Histórico de infrações nos últimos 12 meses.' },
    ],
    applicableGrounds: [
      'ARG-042', 'ARG-043', 'ARG-044', 'ARG-047', 'ARG-025', 'ARG-026', 'ARG-027', 'ARG-028',
      'ARG-029', 'ARG-030', 'ARG-048', 'ARG-049', 'ARG-050', 'ARG-052',
    ],
    availableTemplates: ['TPL_PSDD_SUSPENSAO'],
    executionChecklist: [
      'Verificar se as multas componentes transitaram em julgado regularmente',
      'Checar se o condutor exerce atividade remunerada (EAR) para regra benéfica de 40 pontos',
      'Alegar prescrição intercorrente caso o processo tenha ficado parado por mais de 3 anos',
    ],
    notes: `Alias canônico de 'suspensao_cnh' para o processo de suspensão (PSDD).`,
  },
  {
    id: 'processo_cassacao',
    code: 'PROC_011',
    name: 'Defesa em Processo de Cassação da CNH (PCDD)',
    category: 'Processos Específicos de Habilitação',
    objective: 'Variante canônica do Processo de Cassação (PCDD). Defesa técnica contra a perda total da CNH por dirigir com habilitação suspensa ou reincidência em infrações mandatórias.',
    legalBasis: 'Art. 263 do CTB c/c Resolução CONTRAN nº 723/2018',
    competentBody: 'Diretoria de Habilitação do DETRAN Estadual',
    suspensiveEffectRule: 'Garante o pleno exercício da condução até a decisão irrecorrível na esfera administrativa.',
    stages: [
      { stepNumber: 1, name: 'Notificação de Instauração do PCDD', description: 'Ciência do processo que visa cassar o documento por 2 anos.', deadlineDays: 30, actingParty: 'Autoridade de Trânsito' },
      { stepNumber: 2, name: 'Apresentação de Defesa Administrativa', description: 'Demonstração de não direção no momento da autuação ou nulidade do PSDD prévio.', deadlineDays: 30, actingParty: 'Cidadão/Condutor' },
      { stepNumber: 3, name: 'Recursos à JARI e CETRAN', description: 'Apresentação de provas fáticas e testemunhais.', deadlineDays: 30, actingParty: 'Cidadão/Condutor' },
    ],
    requiredDocuments: [
      { name: 'Notificação de Instauração de Cassação', required: true, description: 'Notificação inicial do processo.' },
      { name: 'Cópia da CNH e comprovante de endereço', required: true, description: 'Dados do condutor.' },
    ],
    applicableGrounds: [
      'ARG-045', 'ARG-046', 'ARG-044', 'ARG-048', 'ARG-049', 'ARG-050', 'ARG-052',
    ],
    availableTemplates: ['TPL_PCDD_CASSACAO'],
    executionChecklist: [
      'Verificar se houve abordagem presencial do condutor com CNH suspensa',
      'Checar a validade do processo de suspensão anterior',
    ],
    notes: `Alias canônico de 'cassacao_cnh' para o processo de cassação (PCDD).`,
  },
];
