/**
 * @file templates-catalog.ts
 * DefesaAI — Canonical Templates Library (Fase 4 & 6)
 * 7 Complete, Deterministic Document Templates linking to Modular Document Blocks (DOCUMENT_BLOCKS).
 * 100% AI-Independent, structured for precision procedural drafting.
 */

import { DocumentTemplateModel, TemplateBlock, BlockType } from '../domain/knowledge-schema';
import { DOCUMENT_BLOCKS, DocumentBlockCategory } from './document-blocks';

/**
 * Mapa determinístico category (DOCUMENT_BLOCKS) -> type (TemplateBlock).
 * Fase 3: elimina a inferência por posição (idx) para blocos do catálogo.
 */
const BLOCK_TYPE_BY_CATEGORY: Record<DocumentBlockCategory, BlockType> = {
  enderecamento: 'header_addressing',
  qualificacao: 'applicant_qualification',
  fatos: 'facts_narrative',
  preliminares: 'preliminary_arguments',
  argumentos_velocidade: 'merit_arguments',
  argumentos_semaforo: 'merit_arguments',
  argumentos_celular: 'merit_arguments',
  argumentos_estacionamento: 'merit_arguments',
  argumentos_alcoolemia: 'merit_arguments',
  argumentos_cinto: 'merit_arguments',
  argumentos_documentos: 'merit_arguments',
  argumentos_suspensao: 'merit_arguments',
  argumentos_cassacao: 'merit_arguments',
  argumentos_gerais: 'merit_arguments',
  pedidos: 'formal_requests',
  fechamento: 'closing_signature',
};

const VALID_BLOCK_TYPES: readonly BlockType[] = [
  'header_addressing',
  'applicant_qualification',
  'vehicle_qualification',
  'facts_narrative',
  'preliminary_arguments',
  'merit_arguments',
  'formal_requests',
  'closing_signature',
];

type RawBlock = {
  id: string;
  type?: string;
  category?: DocumentBlockCategory;
  title: string;
  isMandatory?: boolean;
  contentTemplate: string;
  supportedVariables: string[];
};

/**
 * Normaliza um bloco (do DOCUMENT_BLOCKS ou inline) para TemplateBlock,
 * resolvendo o type sem `(b as any)` e sem depender da posição.
 */
function toTemplateBlock(b: RawBlock, idx: number): TemplateBlock {
  const declaredType = b.type && VALID_BLOCK_TYPES.includes(b.type as BlockType) ? (b.type as BlockType) : undefined;
  const type = declaredType ?? BLOCK_TYPE_BY_CATEGORY[b.category as DocumentBlockCategory];
  // Fallback posicional apenas para blocos inline que não declaram type/category.
  const fallbackType: BlockType =
    idx === 0 ? 'header_addressing' : idx === 1 ? 'applicant_qualification' : idx === 2 ? 'facts_narrative' : 'closing_signature';
  return {
    id: b.id,
    type: type ?? fallbackType,
    title: b.title,
    isMandatory: b.isMandatory ?? true,
    contentTemplate: b.contentTemplate,
    supportedVariables: b.supportedVariables,
  };
}

/**
 * Blocos da Defesa em Processo de Suspensão (PSDD), compartilhados entre
 * 'processo_suspensao' e o alias legado 'suspensao_cnh' (mesmo documento).
 */
function buildSuspensaoBlocks() {
  return [
    DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-004')!,
    DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-010')!,
    DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-022')!,
    {
      id: 'BLK_PRELIMINARES_PSDD',
      type: 'preliminary_arguments',
      title: 'Das Preliminares: Falta de Trânsito em Julgado e Prescrição',
      isMandatory: true,
      contentTemplate: `II - DAS PRELIMINARES EXTINTIVAS DO PROCESSO DE SUSPENSÃO\n\n{{bloco_preliminares_formatado}}`,
      supportedVariables: ['{{bloco_preliminares_formatado}}'],
    },
    {
      id: 'BLK_MERITO_PSDD',
      type: 'merit_arguments',
      title: 'Do Mérito: Retroatividade dos 40 Pontos e Insubsistência das Infrações',
      isMandatory: true,
      contentTemplate: `III - DO MÉRITO: APLICAÇÃO DO NOVO LIMITE LEGAL DA LEI 14.071/2020\n\n{{bloco_merito_formatado}}`,
      supportedVariables: ['{{bloco_merito_formatado}}'],
    },
    DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-059')!,
    DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-066')!,
    DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-068')!,
  ].map((b, idx) => toTemplateBlock(b, idx));
}

/**
 * Blocos da Defesa em Processo de Cassação (PCDD), compartilhados entre
 * 'processo_cassacao' e o alias legado 'cassacao_cnh' (mesmo documento).
 */
function buildCassacaoBlocks() {
  return [
    DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-005')!,
    DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-011')!,
    DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-023')!,
    {
      id: 'BLK_PRELIMINARES_PCDD',
      type: 'preliminary_arguments',
      title: 'Das Preliminares: Nulidade do Processo de Suspensão Anterior',
      isMandatory: true,
      contentTemplate: `II - DAS PRELIMINARES DE NULIDADE DO PROCESSO ANTECEDENTE\n\n{{bloco_preliminares_formatado}}`,
      supportedVariables: ['{{bloco_preliminares_formatado}}'],
    },
    {
      id: 'BLK_MERITO_PCDD',
      type: 'merit_arguments',
      title: 'Do Mérito: Inocorrência de Direção pelo Requerente e Ausência de Flagrante',
      isMandatory: true,
      contentTemplate: `III - DO MÉRITO: INOCORRÊNCIA DE DIREÇÃO PESSOAL PELO CONDUTOR SUSPENSO\n\n{{bloco_merito_formatado}}`,
      supportedVariables: ['{{bloco_merito_formatado}}'],
    },
    DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-060')!,
    DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-066')!,
    DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-068')!,
  ].map((b, idx) => toTemplateBlock(b, idx));
}

export const TEMPLATES_CATALOG: DocumentTemplateModel[] = [
  // ==========================================
  // 2. RECURSO À JARI - 1ª INSTÂNCIA (TPL-02)
  // ==========================================
  {
    id: 'TPL_RECURSO_JARI',
    code: 'RECURSO_JARI_V2026',
    name: 'Recurso Ordinário em 1ª Instância à JARI',
    procedureType: 'recurso_jari',
    version: 'v2026.1',
    description: 'Petição recursal em 1ª instância interposta perante a Junta Administrativa de Recursos de Infrações com pedido de efeito suspensivo automático e cancelamento da Notificação de Penalidade.',
    fillingRules: [
      'Endereçar expressamente ao Presidente e Membros da JARI do órgão autuador',
      'Informar o número do AIT e o número da Notificação de Penalidade (NIP)',
      'Requerer expressamente concessão de efeito suspensivo nos termos do Art. 285, § 3º do CTB',
      'Articular preliminares de cerceamento de defesa (Súmula 312 STJ) e mérito probatório',
    ],
    blocks: [
      DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-002')!,
      DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-008')!,
      {
        id: 'BLK_FATOS_JARI',
        type: 'facts_narrative',
        title: 'Dos Fatos e da Notificação de Penalidade Impugnada',
        isMandatory: true,
        contentTemplate: `I - DA TEMPESTIVIDADE E DOS FATOS\n\nO(A) Recorrente interpõe o presente recurso ordinário tempestivamente em face da Notificação de Imposição de Penalidade referente ao AIT nº {{numero_ait}}, emitida pelo(a) {{orgao_autuador}} em {{data_infracao}}, relativa à suposta conduta tipificada no {{enquadramento_ctb}} ("{{descricao_infracao}}") no local {{local_infracao}}.\n\nInobstante o inconformismo apresentado em sede de Defesa Prévia, a autoridade autuadora manteve a sanção de forma desprovida de lastro fático e legal, impondo-se a reforma integral da decisão por este Ilustre Colegiado.`,
        supportedVariables: ['{{numero_ait}}', '{{orgao_autuador}}', '{{data_infracao}}', '{{enquadramento_ctb}}', '{{descricao_infracao}}', '{{local_infracao}}'],
      },
      {
        id: 'BLK_PRELIMINARES_JARI',
        type: 'preliminary_arguments',
        title: 'Das Preliminares de Nulidade e Cerceamento de Defesa',
        isMandatory: false,
        contentTemplate: `II - DAS PRELIMINARES DE NULIDADE E VÍCIOS DE PROCEDIMENTO\n\n{{bloco_preliminares_formatado}}`,
        supportedVariables: ['{{bloco_preliminares_formatado}}'],
      },
      {
        id: 'BLK_MERITO_JARI',
        type: 'merit_arguments',
        title: 'Do Mérito Recursal e das Provas Técnicas',
        isMandatory: true,
        contentTemplate: `III - DO MÉRITO RECURSAL E DA FRAGILIDADE DA PENALIDADE\n\n{{bloco_merito_formatado}}`,
        supportedVariables: ['{{bloco_merito_formatado}}'],
      },
      DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-057')!,
      DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-066')!,
      DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-068')!,
    ].map((b, idx) => ({
      id: b.id,
      type: toTemplateBlock(b, idx).type,  // resolvido por toTemplateBlock
      title: b.title,
      isMandatory: true,
      contentTemplate: b.contentTemplate,
      supportedVariables: b.supportedVariables,
    })),
  },

  // ==========================================
  // 3. RECURSO AO CETRAN - 2ª INSTÂNCIA (TPL-03)
  // ==========================================
  {
    id: 'TPL_RECURSO_CETRAN',
    code: 'RECURSO_CETRAN_V2026',
    name: 'Recurso em 2ª Instância ao CETRAN / CONTRANDIFE',
    procedureType: 'recurso_cetran',
    version: 'v2026.1',
    description: 'Recurso em última instância administrativa dirigido ao Conselho Estadual de Trânsito ou CONTRANDIFE, arguindo ausência de motivação da JARI, prescrição intercorrente e teses especializadas.',
    fillingRules: [
      'Endereçar ao Presidente e Conselheiros do CETRAN/UF correspondente',
      'Apontar expressamente os vícios da decisão colegiada da JARI (Art. 50 da Lei 9.784/99)',
      'Arguição de prescrição intercorrente trienal ou decadência residual',
      'Requerer o cancelamento em definitivo da multa e pontos no RENACH',
    ],
    blocks: [
      DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-003')!,
      DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-008')!,
      {
        id: 'BLK_FATOS_CETRAN',
        type: 'facts_narrative',
        title: 'Do Histórico Processual e da Decisão Recorrida da JARI',
        isMandatory: true,
        contentTemplate: `I - DO HISTÓRICO PROCESSUAL E DA DECISÃO RECORRIDA\n\nO(A) Recorrente, inconformado(a) com a decisão monocrática / colegiada proferida pela JARI que indeferiu o recurso de 1ª instância referente ao AIT nº {{numero_ait}}, interpõe o presente RECURSO ADMINISTRATIVO EM 2ª INSTÂNCIA perante o Egrégio CETRAN/{{uf_requerente}}, com fulcro nos Artigos 288 e 289 do Código de Trânsito Brasileiro.\n\nA decisão da JARI limitou-se a estampar despacho genérico e padronizado, sem examinar as razões fáticas, metrológicas e de direito aduzidas, padecendo de nulidade absoluta por vício insanável de motivação.`,
        supportedVariables: ['{{numero_ait}}', '{{uf_requerente}}'],
      },
      {
        id: 'BLK_PRELIMINARES_CETRAN',
        type: 'preliminary_arguments',
        title: 'Das Preliminares de Nulidade do Julgamento da JARI e Prescrição',
        isMandatory: true,
        contentTemplate: `II - DAS PRELIMINARES DE NULIDADE DO JULGAMENTO E PRESCRIÇÃO\n\n{{bloco_preliminares_formatado}}`,
        supportedVariables: ['{{bloco_preliminares_formatado}}'],
      },
      {
        id: 'BLK_MERITO_CETRAN',
        type: 'merit_arguments',
        title: 'Das Razões de Reforma e Mérito em 2ª Instância',
        isMandatory: true,
        contentTemplate: `III - DO MÉRITO E DAS RAZÕES PARA TOTAL REFORMA DA DECISÃO\n\n{{bloco_merito_formatado}}`,
        supportedVariables: ['{{bloco_merito_formatado}}'],
      },
      DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-058')!,
      DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-066')!,
      DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-068')!,
    ].map((b, idx) => ({
      id: b.id,
      type: toTemplateBlock(b, idx).type,  // resolvido por toTemplateBlock
      title: b.title,
      isMandatory: true,
      contentTemplate: b.contentTemplate,
      supportedVariables: b.supportedVariables,
    })),
  },

  // ==========================================
  // 4. SUSPENSÃO DA CNH - PSDD (TPL-04)
  // ==========================================
  {
    id: 'TPL_PSDD_SUSPENSAO',
    code: 'DEFESA_PSDD_V2026',
    name: 'Defesa em Processo de Suspensão do Direito de Dirigir (PSDD)',
    procedureType: 'processo_suspensao',
    version: 'v2026.1',
    description: 'Peça de defesa administrativa contra a Notificação de Instauração de Processo de Suspensão da CNH por pontos ou infração autossuspensiva, com base na Lei 14.071/20, prescrição e falta de trânsito em julgado das multas originárias.',
    fillingRules: [
      'Endereçar à Comissão de Processos de Suspensão do DETRAN estadual competente',
      'Indicar o número do processo administrativo de suspensão (PSDD)',
      'Arguição da retroatividade benéfica do limite de 40 pontos (Tema 1.097 STJ)',
      'Demonstrar ausência de trânsito em julgado das multas componentes ou prescrição',
    ],
    blocks: buildSuspensaoBlocks(),
  },

  // ==========================================
  // 5. CASSAÇÃO DA CNH - PCDD (TPL-05)
  // ==========================================
  {
    id: 'TPL_PCDD_CASSACAO',
    code: 'DEFESA_PCDD_V2026',
    name: 'Defesa Técnica em Processo de Cassação da CNH (PCDD)',
    procedureType: 'processo_cassacao',
    version: 'v2026.1',
    description: 'Defesa jurídica especializada contra procedimento de cassação do documento de habilitação (Art. 263 CTB), comprovando a inocorrência de direção pessoal pelo condutor suspenso ou a nulidade da suspensão originária.',
    fillingRules: [
      'Endereçar à Coordenação de Processos de Cassação do DETRAN',
      'Indicar o número do processo administrativo de cassação',
      'Comprovar que a autuação na vigência da suspensão ocorreu sem abordagem presencial',
      'Juntar prova de que o veículo estava na posse/condução de terceiro habilitado',
    ],
    blocks: buildCassacaoBlocks(),
  },

  // ==========================================
  // 6. INDICAÇÃO DE REAL CONDUTOR - FICI (TPL-06)
  // ==========================================
  {
    id: 'TPL_FICI_INDICACAO',
    code: 'FICI_INDICACAO_V2026',
    name: 'Requerimento e Formulário de Indicação do Real Condutor Infrator (FICI)',
    procedureType: 'indicacao_condutor',
    version: 'v2026.1',
    description: 'Instrumento solene de declaração bilateral entre o proprietário do veículo e o condutor infrator para transferência tempestiva de pontuação nos termos do Art. 257, § 7º do CTB e Resolução CONTRAN 918/2022.',
    fillingRules: [
      'Preenchimento obrigatório e bilateral de todos os dados do proprietário e do condutor',
      'Assinaturas autênticas e idênticas aos documentos de identidade anexados',
      'Protocolo dentro do prazo final improrrogável assinalado na Notificação de Autuação',
      'Juntada obrigatória de cópia da CNH do condutor indicado e documento com foto do proprietário',
    ],
    blocks: [
      DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-006')!,
      DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-012')!,
      DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-024')!,
      DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-061')!,
      DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-067')!,
      DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-068')!,
    ].map((b, idx) => ({
      id: b.id,
      type: toTemplateBlock(b, idx).type,  // resolvido por toTemplateBlock
      title: b.title,
      isMandatory: true,
      contentTemplate: b.contentTemplate,
      supportedVariables: b.supportedVariables,
    })),
  },

  // ==========================================
  // 7. CONVERSÃO EM ADVERTÊNCIA POR ESCRITO (TPL-07)
  // ==========================================
  {
    id: 'TPL_CONVERSAO_ADVERTENCIA',
    code: 'REQUERIMENTO_ADVERTENCIA_V2026',
    name: 'Requerimento de Conversão Obrigatória de Multa em Advertência por Escrito',
    procedureType: 'conversao_advertencia',
    version: 'v2026.1',
    description: 'Requerimento formal administrativo com fundamento no Artigo 267 do CTB (com a redação da Lei 14.071/2020), exigindo a conversão de pleno direito de infração leve ou média em advertência educativa sem penalidade pecuniária.',
    fillingRules: [
      'Válido exclusivamente para infrações de natureza LEVE ou MÉDIA',
      'Comprovar ausência de cometimento de qualquer outra infração nos 12 meses anteriores',
      'Juntar certidão de prontuário de CNH emitida pelo DETRAN ou SENATRAN',
      'Invocar a natureza vinculada e de direito subjetivo da autoridade após a Lei 14.071/20',
    ],
    blocks: [
      DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-007')!,
      DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-008')!,
      DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-025')!,
      {
        id: 'BLK_FUNDAMENTACAO_ART267',
        type: 'merit_arguments',
        title: 'Da Fundamentação Jurídica: Direito Subjetivo e Poder Vinculado da Autoridade',
        isMandatory: true,
        contentTemplate: `II - DO DIREITO SUBJETIVO À CONVERSÃO EM ADVERTÊNCIA (ART. 267 DO CTB)\n\nCom a vigência da Lei Federal nº 14.071/2020, o Artigo 267 do CTB teve sua redação alterada para substituir o termo facultativo ("poderá") pelo imperativo legal cogente ("deverá ser imposta a penalidade de advertência por escrito").\n\nTratando-se de infração de gravidade {{gravidade_infracao}} e comprovada a primariedade do condutor no período de 12 meses, a conversão consubstancia ato administrativo estritamente vinculado, constituindo direito público subjetivo do administrado que afasta qualquer margem de discricionariedade da autoridade de trânsito.`,
        supportedVariables: ['{{gravidade_infracao}}'],
      },
      DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-062')!,
      DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-066')!,
      DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-068')!,
    ].map((b, idx) => ({
      id: b.id,
      type: toTemplateBlock(b, idx).type,  // resolvido por toTemplateBlock
      title: b.title,
      isMandatory: true,
      contentTemplate: b.contentTemplate,
      supportedVariables: b.supportedVariables,
    })),
  },

  // ==========================================
  // 8. DEFESA PRÉVIA À NA (TPL-08)
  // ==========================================
  {
    id: 'TPL_DEFESA_PREVIA',
    code: 'DEFESA_PREVIA_V2026',
    name: 'Defesa Prévia à Notificação de Autuação (Art. 281 CTB)',
    procedureType: 'defesa_previa',
    version: 'v2026.1',
    description: 'Peça de defesa prévia contra a Notificação de Autuação (NA), fase inicial anterior à imposição de penalidade, atacando vícios formais e materiais do AIT.',
    fillingRules: [
      'Endereçar à autoridade de trânsito do órgão autuador',
      'Informar o número do AIT e a Notificação de Autuação',
      'Articular preliminares de nulidade e mérito probatório antes da penalidade',
    ],
    blocks: [
      DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-001')!,
      DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-008')!,
      {
        id: 'BLK_FATOS_DEFESA_PREVIA',
        type: 'facts_narrative',
        title: 'Da Autuação e dos Fatos',
        isMandatory: true,
        contentTemplate: `I - DA AUTUAÇÃO E DOS FATOS\n\nO(A) Requerente, em sede de DEFESA PRÉVIA, vem perante a autoridade autuadora impugnar a Notificação de Autuação referente ao AIT nº {{numero_ait}}, emitida pelo(a) {{orgao_autuador}} em {{data_infracao}}, relativa à suposta conduta tipificada no {{enquadramento_ctb}} ("{{descricao_infracao}}") no local {{local_infracao}}, com fundamento em vícios formais e materiais que ensejam o cancelamento do auto antes da imposição de qualquer penalidade.`,
        supportedVariables: ['{{numero_ait}}', '{{orgao_autuador}}', '{{data_infracao}}', '{{enquadramento_ctb}}', '{{descricao_infracao}}', '{{local_infracao}}'],
      },
      {
        id: 'BLK_PRELIMINARES_DEFESA_PREVIA',
        type: 'preliminary_arguments',
        title: 'Das Preliminares de Nulidade',
        isMandatory: true,
        contentTemplate: `II - DAS PRELIMINARES DE NULIDADE\n\n{{bloco_preliminares_formatado}}`,
        supportedVariables: ['{{bloco_preliminares_formatado}}'],
      },
      {
        id: 'BLK_MERITO_DEFESA_PREVIA',
        type: 'merit_arguments',
        title: 'Do Mérito',
        isMandatory: true,
        contentTemplate: `III - DO MÉRITO\n\n{{bloco_merito_formatado}}`,
        supportedVariables: ['{{bloco_merito_formatado}}'],
      },
      DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-057')!,
      DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-066')!,
      DOCUMENT_BLOCKS.find((b) => b.id === 'BLK-068')!,
    ].map((b, idx) => ({
      id: b.id,
      type: toTemplateBlock(b, idx).type,  // resolvido por toTemplateBlock
      title: b.title,
      isMandatory: true,
      contentTemplate: b.contentTemplate,
      supportedVariables: b.supportedVariables,
    })),
  },

  // ==========================================
  // 9. SUSPENSÃO / CASSAÇÃO — ALIAS LEGADOS (mesmos blocos de PROCESSO_*)
  // ==========================================
  {
    id: 'TPL_SUSPENSAO_CNH',
    code: 'DEFESA_PSDD_SUSPENSAO_ALIAS_V2026',
    name: 'Defesa em Processo de Suspensão do Direito de Dirigir (PSDD)',
    procedureType: 'suspensao_cnh',
    version: 'v2026.1',
    description: 'Alias legado de suspensao_cnh: mesma peça de defesa do processo de suspensão da CNH (PSDD).',
    fillingRules: ['Endereçar à Comissão de Processos de Suspensão do DETRAN', 'Indicar o número do PSDD'],
    blocks: buildSuspensaoBlocks(),
  },
  {
    id: 'TPL_CASSACAO_CNH',
    code: 'DEFESA_PCDD_CASSACAO_ALIAS_V2026',
    name: 'Defesa Técnica em Processo de Cassação da CNH (PCDD)',
    procedureType: 'cassacao_cnh',
    version: 'v2026.1',
    description: 'Alias legado de cassacao_cnh: mesma peça de defesa do processo de cassação da CNH (PCDD).',
    fillingRules: ['Endereçar à Coordenação de Processos de Cassação do DETRAN', 'Indicar o número do PCDD'],
    blocks: buildCassacaoBlocks(),
  },
];
