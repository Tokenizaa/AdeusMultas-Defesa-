/**
 * @file document-blocks.ts
 * DefesaAI — Modular Document Blocks Library (Fase 4.2)
 * 65+ Reusable, parameterizable legal petition building blocks
 * with standardized placeholders ({{placeholder}}) for deterministic document assembly.
 */

export type DocumentBlockCategory =
  | 'enderecamento'
  | 'qualificacao'
  | 'fatos'
  | 'preliminares'
  | 'argumentos_velocidade'
  | 'argumentos_semaforo'
  | 'argumentos_celular'
  | 'argumentos_estacionamento'
  | 'argumentos_alcoolemia'
  | 'argumentos_cinto'
  | 'argumentos_documentos'
  | 'argumentos_suspensao'
  | 'argumentos_cassacao'
  | 'argumentos_gerais'
  | 'pedidos'
  | 'fechamento';

export interface DocumentBlockModel {
  id: string; // Ex: BLK-001
  code: string;
  category: DocumentBlockCategory;
  title: string;
  description: string;
  contentTemplate: string;
  supportedVariables: string[];
  recommendedProcedures?: string[];
}

export const DOCUMENT_BLOCKS: DocumentBlockModel[] = [
  // ==========================================
  // 1. ENDEREÇAMENTO (B001 - B007)
  // ==========================================
  {
    id: 'BLK-001',
    code: 'ENDERECO_AUTORIDADE_TRANSITO',
    category: 'enderecamento',
    title: 'Endereçamento à Autoridade Executiva de Trânsito (Defesa Prévia)',
    description: 'Cabeçalho formal direcionado à autoridade de trânsito do órgão autuador para protocolo de Defesa Prévia da autuação.',
    contentTemplate: `ILUSTRÍSSIMO SENHOR DIRETOR / AUTORIDADE DE TRÂNSITO DO(A) {{orgao_autuador}}\nJURISDIÇÃO DA COMARCA DE {{cidade_estado}}`,
    supportedVariables: ['{{orgao_autuador}}', '{{cidade_estado}}'],
    recommendedProcedures: ['conversao_advertencia', 'indicacao_condutor'],
  },
  {
    id: 'BLK-002',
    code: 'ENDERECO_JARI_1A_INSTANCIA',
    category: 'enderecamento',
    title: 'Endereçamento à Junta Administrativa de Recursos de Infrações (JARI)',
    description: 'Cabeçalho recursal direcionado ao Colegiado da JARI para apreciação em 1ª instância administrativa.',
    contentTemplate: `ILUSTRÍSSIMO(A) SENHOR(A) PRESIDENTE E ILUSTRES MEMBROS DA JUNTA ADMINISTRATIVA DE RECURSOS DE INFRAÇÕES – JARI DO(A) {{orgao_autuador}}\nCIRCUNSCRIÇÃO REGIONAL DE TRÂNSITO DE {{cidade_estado}}`,
    supportedVariables: ['{{orgao_autuador}}', '{{cidade_estado}}'],
    recommendedProcedures: ['recurso_jari'],
  },
  {
    id: 'BLK-003',
    code: 'ENDERECO_CETRAN_CONTRANDIFE',
    category: 'enderecamento',
    title: 'Endereçamento ao CETRAN / CONTRANDIFE (2ª Instância)',
    description: 'Cabeçalho recursal de 2ª instância dirigido ao Conselho Estadual de Trânsito ou CONTRANDIFE.',
    contentTemplate: `EXCELENTÍSSIMO(A) SENHOR(A) PRESIDENTE E ILUSTRES CONSELHEIROS DO CONSELHO ESTADUAL DE TRÂNSITO – CETRAN/{{uf_requerente}}\nÓRGÃO RECURSAL COLEGIADO DE 2ª INSTÂNCIA ADMINISTRATIVA`,
    supportedVariables: ['{{uf_requerente}}'],
    recommendedProcedures: ['recurso_cetran'],
  },
  {
    id: 'BLK-004',
    code: 'ENDERECO_DETRAN_PSDD',
    category: 'enderecamento',
    title: 'Endereçamento à Comissão de Suspensão do DETRAN (PSDD)',
    description: 'Cabeçalho formal direcionado à autoridade competente para julgamento de processos de suspensão da CNH.',
    contentTemplate: `ILUSTRÍSSIMO(A) SENHOR(A) DIRETOR(A) DO DEPARTAMENTO ESTADUAL DE TRÂNSITO – DETRAN/{{uf_requerente}}\nDIVISÃO DE PROCESSOS ADMINISTRATIVOS E PENALIDADES – COMISSÃO DE PSDD`,
    supportedVariables: ['{{uf_requerente}}'],
    recommendedProcedures: ['processo_suspensao'],
  },
  {
    id: 'BLK-005',
    code: 'ENDERECO_DETRAN_PCDD',
    category: 'enderecamento',
    title: 'Endereçamento à Comissão de Cassação do DETRAN (PCDD)',
    description: 'Cabeçalho formal para defesa em processo administrativo de cassação da CNH.',
    contentTemplate: `ILUSTRÍSSIMO(A) SENHOR(A) DIRETOR(A) DO DEPARTAMENTO ESTADUAL DE TRÂNSITO – DETRAN/{{uf_requerente}}\nCOORDENAÇÃO DE CASSAÇÃO DO DIREITO DE DIRIGIR E HABILITAÇÃO – PCDD`,
    supportedVariables: ['{{uf_requerente}}'],
    recommendedProcedures: ['processo_cassacao'],
  },
  {
    id: 'BLK-006',
    code: 'ENDERECO_SETOR_FICI',
    category: 'enderecamento',
    title: 'Endereçamento ao Setor de Identificação de Condutores (FICI)',
    description: 'Cabeçalho para apresentação tempestiva de Formulário de Indicação do Real Condutor.',
    contentTemplate: `AO SETOR DE PROCESSAMENTO DE AUTUAÇÕES E IDENTIFICAÇÃO DE CONDUTORES DO(A) {{orgao_autuador}}\nPROTOCOLO GERAL DE IDENTIFICAÇÃO DE CONDUTOR INFRATOR - FICI`,
    supportedVariables: ['{{orgao_autuador}}'],
    recommendedProcedures: ['indicacao_condutor'],
  },
  {
    id: 'BLK-007',
    code: 'ENDERECO_CONVERSAO_ADVERTENCIA',
    category: 'enderecamento',
    title: 'Endereçamento para Requerimento de Conversão em Advertência (Art. 267 CTB)',
    description: 'Cabeçalho direcionado à autoridade de trânsito solicitando a aplicação do direito subjetivo de advertência por escrito.',
    contentTemplate: `ILUSTRÍSSIMO(A) SENHOR(A) DIRETOR(A) DA AUTORIDADE DE TRÂNSITO DO(A) {{orgao_autuador}}\nREQUERIMENTO DE APLICAÇÃO DE DIREITO SUBJETIVO - ARTIGO 267 DO CTB`,
    supportedVariables: ['{{orgao_autuador}}'],
    recommendedProcedures: ['conversao_advertencia'],
  },

  // ==========================================
  // 2. QUALIFICAÇÃO (B008 - B012)
  // ==========================================
  {
    id: 'BLK-008',
    code: 'QUALIFICA_PROPRIETARIO_PF',
    category: 'qualificacao',
    title: 'Qualificação Padrão do Requerente Pessoa Física',
    description: 'Qualificação civil completa do condutor/proprietário com dados do veículo e do AIT impugnado.',
    contentTemplate: `{{nome_requerente}}, brasileiro(a), inscrito(a) no CPF/MF sob o nº {{cpf_requerente}}, portador(a) do RG nº {{rg_requerente}}, titular da CNH nº {{cnh_requerente}}, residente e domiciliado(a) na {{endereco_requerente}}, na comarca de {{cidade_requerente}}/{{uf_requerente}}, na qualidade de legítimo(a) proprietário(a) / condutor(a) do veículo marca/modelo {{veiculo_modelo}}, ostentador da placa de identificação {{veiculo_placa}}, código RENAVAM nº {{veiculo_renavam}}, vem, respeitosamente e no prazo legal, com esteio no Artigo 5º, incisos LIV e LV da Constituição da República Federativa do Brasil e na Lei Federal nº 9.503/1997, apresentar`,
    supportedVariables: [
      '{{nome_requerente}}',
      '{{cpf_requerente}}',
      '{{rg_requerente}}',
      '{{cnh_requerente}}',
      '{{endereco_requerente}}',
      '{{cidade_requerente}}',
      '{{uf_requerente}}',
      '{{veiculo_modelo}}',
      '{{veiculo_placa}}',
      '{{veiculo_renavam}}',
    ],
    recommendedProcedures: ['recurso_jari', 'recurso_cetran'],
  },
  {
    id: 'BLK-009',
    code: 'QUALIFICA_PROPRIETARIO_PJ',
    category: 'qualificacao',
    title: 'Qualificação de Pessoa Jurídica Proprietária (Multas e NIC)',
    description: 'Qualificação de empresa titular do veículo, representada por seu administrador legal.',
    contentTemplate: `{{nome_empresa}}, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob o nº {{cnpj_empresa}}, com sede administrativa localizada na {{endereco_empresa}}, na comarca de {{cidade_empresa}}/{{uf_empresa}}, neste ato representada por seu(sua) administrador(a) legal infra-assinado(a), {{nome_representante}}, inscrito(a) no CPF nº {{cpf_representante}}, titular do veículo de sua frota marca/modelo {{veiculo_modelo}}, placa {{veiculo_placa}}, RENAVAM nº {{veiculo_renavam}}, vem perante Vossa Senhoria interpor a cabível medida defensiva contra o AIT nº {{numero_ait}}, pelas razões doravante aduzidas:`,
    supportedVariables: [
      '{{nome_empresa}}',
      '{{cnpj_empresa}}',
      '{{endereco_empresa}}',
      '{{cidade_empresa}}',
      '{{uf_empresa}}',
      '{{nome_representante}}',
      '{{cpf_representante}}',
      '{{veiculo_modelo}}',
      '{{veiculo_placa}}',
      '{{veiculo_renavam}}',
      '{{numero_ait}}',
    ],
    recommendedProcedures: ['recurso_jari'],
  },
  {
    id: 'BLK-010',
    code: 'QUALIFICA_CONDUTOR_PSDD',
    category: 'qualificacao',
    title: 'Qualificação do Condutor em Processo de Suspensão (PSDD)',
    description: 'Qualificação específica para processo administrativo instaurado pelo DETRAN para suspensão do direito de dirigir.',
    contentTemplate: `{{nome_requerente}}, brasileiro(a), inscrito(a) no CPF sob o nº {{cpf_requerente}}, portador(a) do RG nº {{rg_requerente}}, titular do Prontuário de Habilitação / CNH nº {{cnh_requerente}}, categoria {{categoria_cnh}}, residente e domiciliado(a) na {{endereco_requerente}}, comarca de {{cidade_requerente}}/{{uf_requerente}}, vem, com o devido respeito, em resposta à Notificação de Instauração de Processo de Suspensão do Direito de Dirigir nº {{numero_processo_psdd}}, apresentar sua DEFESA ADMINISTRATIVA nos termos do Art. 261 do CTB e Resolução CONTRAN nº 723/2018:`,
    supportedVariables: [
      '{{nome_requerente}}',
      '{{cpf_requerente}}',
      '{{rg_requerente}}',
      '{{cnh_requerente}}',
      '{{categoria_cnh}}',
      '{{endereco_requerente}}',
      '{{cidade_requerente}}',
      '{{uf_requerente}}',
      '{{numero_processo_psdd}}',
    ],
    recommendedProcedures: ['processo_suspensao'],
  },
  {
    id: 'BLK-011',
    code: 'QUALIFICA_CONDUTOR_PCDD',
    category: 'qualificacao',
    title: 'Qualificação do Condutor em Processo de Cassação (PCDD)',
    description: 'Qualificação para processo grave de cassação da habilitação.',
    contentTemplate: `{{nome_requerente}}, brasileiro(a), inscrito(a) no CPF/MF sob o nº {{cpf_requerente}}, portador(a) da CNH nº {{cnh_requerente}}, domiciliado(a) na {{endereco_requerente}}, {{cidade_requerente}}/{{uf_requerente}}, comparece perante esta Ilustre Comissão de Processos de Cassação de Habilitação para apresentar DEFESA TÉCNICA em face do Processo Administrativo de Cassação nº {{numero_processo_pcdd}}, instruído com fulcro no Artigo 263 do Código de Trânsito Brasileiro.`,
    supportedVariables: [
      '{{nome_requerente}}',
      '{{cpf_requerente}}',
      '{{cnh_requerente}}',
      '{{endereco_requerente}}',
      '{{cidade_requerente}}',
      '{{uf_requerente}}',
      '{{numero_processo_pcdd}}',
    ],
    recommendedProcedures: ['processo_cassacao'],
  },
  {
    id: 'BLK-012',
    code: 'QUALIFICA_DUPLA_FICI',
    category: 'qualificacao',
    title: 'Qualificação Conjunta de Proprietário e Real Condutor Infrator (FICI)',
    description: 'Qualificação bilateral exigida pelo Art. 257, § 7º do CTB e Resolução CONTRAN 918/2022.',
    contentTemplate: `I - DO PROPRIETÁRIO DO VEÍCULO:\nNome/Razão Social: {{nome_requerente}}\nCPF/CNPJ: {{cpf_requerente}} | RG: {{rg_requerente}}\nEndereço: {{endereco_requerente}} - {{cidade_requerente}}/{{uf_requerente}}\nVeículo: {{veiculo_modelo}}, Placa: {{veiculo_placa}}, RENAVAM: {{veiculo_renavam}}\n\nII - DO CONDUTOR INFRATOR INDICADO:\nNome Completo: {{condutor_indicado_nome}}\nCPF/MF: {{condutor_indicado_cpf}} | RG: {{condutor_indicado_rg}}\nRegistro da CNH nº: {{condutor_indicado_cnh}}, Categoria: {{condutor_indicado_categoria}}, Órgão Emissor/UF: DETRAN/{{condutor_indicado_uf}}\nEndereço Residencial: {{condutor_indicado_endereco}} - {{condutor_indicado_cidade}}/{{condutor_indicado_uf}}`,
    supportedVariables: [
      '{{nome_requerente}}',
      '{{cpf_requerente}}',
      '{{rg_requerente}}',
      '{{endereco_requerente}}',
      '{{cidade_requerente}}',
      '{{uf_requerente}}',
      '{{veiculo_modelo}}',
      '{{veiculo_placa}}',
      '{{veiculo_renavam}}',
      '{{condutor_indicado_nome}}',
      '{{condutor_indicado_cpf}}',
      '{{condutor_indicado_rg}}',
      '{{condutor_indicado_cnh}}',
      '{{condutor_indicado_categoria}}',
      '{{condutor_indicado_uf}}',
      '{{condutor_indicado_endereco}}',
      '{{condutor_indicado_cidade}}',
    ],
    recommendedProcedures: ['indicacao_condutor'],
  },

  // ==========================================
  // 3. NARRATIVA DOS FATOS (B013 - B025)
  // ==========================================
  {
    id: 'BLK-013',
    code: 'FATOS_PADRAO_GENERICO',
    category: 'fatos',
    title: 'Dos Fatos - Notificação de Autuação Genérica',
    description: 'Narrativa fática introdutória padrão indicando dados do AIT, local, data e enquadramento legal.',
    contentTemplate: `I - DOS FATOS\n\nO(A) Requerente foi notificado(a) a respeito da lavratura do Auto de Infração de Trânsito nº {{numero_ait}}, expedido pelo(a) {{orgao_autuador}}, o qual imputa a suposta infração descrita no {{enquadramento_ctb}} ("{{descricao_infracao}}"), supostamente cometida em {{data_infracao}}, nas imediações de {{local_infracao}}.\n\nOcorre que, conforme restará cristalinamente comprovado, a autuação administrativa incorre em vícios formais e materiais que obstam a incidência de qualquer penalidade, revelando-se de rigor a decretação de sua insubsistência.`,
    supportedVariables: [
      '{{numero_ait}}',
      '{{orgao_autuador}}',
      '{{enquadramento_ctb}}',
      '{{descricao_infracao}}',
      '{{data_infracao}}',
      '{{local_infracao}}',
    ],
    recommendedProcedures: ['recurso_jari'],
  },
  {
    id: 'BLK-014',
    code: 'FATOS_EXCESSO_VELOCIDADE_RADAR',
    category: 'fatos',
    title: 'Dos Fatos - Fiscalização Eletrônica de Velocidade por Radar',
    description: 'Narrativa específica para infrações do Art. 218 do CTB captadas por medidores eletrônicos de velocidade.',
    contentTemplate: `I - DOS FATOS E DO REGISTRO DE VELOCIDADE\n\nO(A) Requerente recebeu Notificação de Autuação decorrente do AIT nº {{numero_ait}}, acusando excesso de velocidade tipificado no {{enquadramento_ctb}}, sob a alegação de que trafegava a uma velocidade medida de {{velocidade_medida}} km/h (velocidade considerada: {{velocidade_considerada}} km/h), em trecho cuja velocidade máxima permitida seria de {{velocidade_limite}} km/h, no local {{local_infracao}}, em data de {{data_infracao}}.\n\nContudo, o registro fotográfico e metrológico realizado pelo equipamento eletrônico padece de nulidades insanáveis, ante a inobservância das normas compulsórias estabelecidas pela Resolução CONTRAN nº 798/2020 e Portarias do INMETRO.`,
    supportedVariables: [
      '{{numero_ait}}',
      '{{enquadramento_ctb}}',
      '{{velocidade_medida}}',
      '{{velocidade_considerada}}',
      '{{velocidade_limite}}',
      '{{local_infracao}}',
      '{{data_infracao}}',
    ],
    recommendedProcedures: ['recurso_jari'],
  },
  {
    id: 'BLK-015',
    code: 'FATOS_AVANCO_SINAL_VERMELHO',
    category: 'fatos',
    title: 'Dos Fatos - Avanço de Sinal Vermelho Semafórico (Art. 208)',
    description: 'Narrativa para autuações por avanço semafórico eletrônico ou por fiscalização presencial.',
    contentTemplate: `I - DOS FATOS\n\nConsta no Auto de Infração nº {{numero_ait}} a suposta prática da conduta capitulada no Art. 208 do CTB (Avançar o sinal vermelho do semáforo), ocorrida em {{data_infracao}} no cruzamento de {{local_infracao}}.\n\nCumpre destacar que a imagem capturada pelo sistema automatizado não registra a transposição da linha de retenção após o início do ciclo vermelho, nem comprova que o veículo não realizou manobra segura para desobstrução de via ou passagem de veículo em urgência, em total desacordo com o Manual Brasileiro de Fiscalização de Trânsito (Res. CONTRAN 985/2022).`,
    supportedVariables: ['{{numero_ait}}', '{{data_infracao}}', '{{local_infracao}}'],
    recommendedProcedures: ['recurso_jari'],
  },
  {
    id: 'BLK-016',
    code: 'FATOS_USO_CELULAR',
    category: 'fatos',
    title: 'Dos Fatos - Uso / Manuseio de Aparelho Celular (Art. 252)',
    description: 'Narrativa para multas de celular sem abordagem do condutor e sem detalhamento fático no campo de observações.',
    contentTemplate: `I - DOS FATOS\n\nImputa-se ao(à) Requerente a conduta do Artigo 252, parágrafo único do CTB (Manusear ou segurar telefone celular ao volante), lavrada no AIT nº {{numero_ait}} em {{data_infracao}}, na via {{local_infracao}}, sem que tenha havido qualquer abordagem policial ou parada do veículo.\n\nO agente de trânsito limitou-se a expedir autuação remota e instantânea, sem consignar no campo de observações a descrição circunstanciada da conduta (como a posição do aparelho e o tempo de visualização), violando frontalmente a ficha de enquadramento da Resolução CONTRAN nº 985/2022.`,
    supportedVariables: ['{{numero_ait}}', '{{data_infracao}}', '{{local_infracao}}'],
    recommendedProcedures: ['recurso_jari'],
  },
  {
    id: 'BLK-017',
    code: 'FATOS_ESTACIONAMENTO_PROIBIDO',
    category: 'fatos',
    title: 'Dos Fatos - Estacionamento / Parada em Local Proibido (Art. 181)',
    description: 'Narrativa para autuações de estacionamento em que inexiste sinalização regulamentar ou configurou-se parada rápida.',
    contentTemplate: `I - DOS FATOS\n\nO(A) Requerente foi surpreendido(a) com a lavratura do AIT nº {{numero_ait}}, apontando suposto cometimento da infração do Art. 181, inciso XVIII do CTB (Estacionar em local/horário proibido pela sinalização), em {{data_infracao}}, na altura de {{local_infracao}}.\n\nOcorre que no exato local não havia sinalização horizontal ou vertical R-6a visível, legível e regulamentar no sentido da via, ou, subsidiariamente, tratou-se de mera parada emergencial e momentânea estritamente destinada ao embarque/desembarque de passageiro, ato plenamente respaldado pelo Anexo I do CTB.`,
    supportedVariables: ['{{numero_ait}}', '{{data_infracao}}', '{{local_infracao}}'],
    recommendedProcedures: ['recurso_jari'],
  },
  {
    id: 'BLK-018',
    code: 'FATOS_LEI_SECA_RECUSA_BAFOMETRO',
    category: 'fatos',
    title: 'Dos Fatos - Recusa ao Teste do Etilômetro / Bafômetro (Art. 165-A)',
    description: 'Narrativa para autuações sob alegação de recusa, sem constatação de sinais clínicos de alteração psicomotora.',
    contentTemplate: `I - DO CONTEXTO FÁTICO DA ABORDAGEM\n\nEm {{data_infracao}}, ao transitar pelo endereço {{local_infracao}}, o(a) Requerente foi submetido(a) a abordagem em fiscalização de trânsito (Operação Lei Seca). O agente fiscalizador solicitou a realização do teste de ar alveolar (etilômetro), ao que o(a) condutor(a) exerceu seu direito constitucional de não autoincriminação.\n\nOcorre que o(a) Requerente não apresentava qualquer sinal exterior, notório ou clínico de embriaguez ou alteração da capacidade psicomotora. Não foi preenchido Termo de Constatação de Sinais nos moldes do Anexo II da Resolução CONTRAN nº 432/2013, demonstrando que o ato sancionatório fundou-se exclusivamente na mera recusa desacompanhada de qualquer risco à segurança viária.`,
    supportedVariables: ['{{data_infracao}}', '{{local_infracao}}'],
    recommendedProcedures: ['recurso_jari', 'processo_suspensao'],
  },
  {
    id: 'BLK-019',
    code: 'FATOS_FALTA_CINTO_SEGURANCA',
    category: 'fatos',
    title: 'Dos Fatos - Falta de Uso do Cinto de Segurança (Art. 167)',
    description: 'Narrativa fática impugnando autuações de cinto de segurança sem abordagem e com erro de visualização.',
    contentTemplate: `I - DOS FATOS\n\nO Auto de Infração nº {{numero_ait}} imputa ao(à) Requerente a conduta tipificada no Art. 167 do CTB (Deixar o condutor ou passageiro de usar o cinto de segurança), alegadamente verificada em {{data_infracao}}, no endereço {{local_infracao}}.\n\nO(A) Requerente sempre fez uso do cinto de segurança de três pontos regularmente afivelado. No momento da passagem pelo ponto de fiscalização, a utilização de vestimenta escura e as condições de luminosidade geraram equívoco de percepção do agente de trânsito, que não procedeu à abordagem fiscalizatória para verificação do fato.`,
    supportedVariables: ['{{numero_ait}}', '{{data_infracao}}', '{{local_infracao}}'],
    recommendedProcedures: ['recurso_jari'],
  },
  {
    id: 'BLK-020',
    code: 'FATOS_LICENCIAMENTO_ATRASADO',
    category: 'fatos',
    title: 'Dos Fatos - Condução de Veículo sem Registro / Licenciamento (Art. 230, V)',
    description: 'Narrativa para casos em que as taxas de licenciamento foram recolhidas ou houve falha nos sistemas do DETRAN.',
    contentTemplate: `I - DOS FATOS\n\nEm {{data_infracao}}, o(a) Requerente teve seu veículo autuado sob o AIT nº {{numero_ait}} por suposta infração ao Artigo 230, V do CTB (Conduzir veículo que não esteja registrado e devidamente licenciado).\n\nConforme comprovantes fiscais e bancários em anexo, os tributos e taxas de licenciamento anual já haviam sido integralmente quitados antes da abordagem fiscal, ocorrendo mera demora sistêmica no processamento e emissão do CRLV-e pelo DETRAN/{{uf_requerente}}, restando patente a boa-fé do administrado e a ausência de infração consumada.`,
    supportedVariables: ['{{data_infracao}}', '{{numero_ait}}', '{{uf_requerente}}'],
    recommendedProcedures: ['recurso_jari'],
  },
  {
    id: 'BLK-021',
    code: 'FATOS_MULTA_NIC_PJ',
    category: 'fatos',
    title: 'Dos Fatos - Multa NIC Pessoa Jurídica (Art. 257, § 8º)',
    description: 'Narrativa para impugnação de penalidade por não indicação de condutor em veículo de pessoa jurídica.',
    contentTemplate: `I - DOS FATOS\n\nA empresa Requerente foi notificada da imposição da penalidade pecuniária por Não Indicação de Condutor Infrator (Multa NIC), calculada com fator multiplicador sobre o AIT originário nº {{numero_ait}}, sob a alegação de que não teria indicado o condutor no prazo assinalado.\n\nContudo, a empresa procedeu ao envio regular e tempestivo da documentação do real condutor pelos canais oficiais / protocolo eletrônico, ou, alternativamente, o próprio Auto de Infração originário padece de nulidade absoluta prévia, o que acarreta a nulidade reflexa da sanção acessória por força do princípio da gravitação jurídica.`,
    supportedVariables: ['{{numero_ait}}'],
    recommendedProcedures: ['recurso_jari'],
  },
  {
    id: 'BLK-022',
    code: 'FATOS_PSDD_INSTAURACAO',
    category: 'fatos',
    title: 'Dos Fatos - Instauração de Processo de Suspensão por Pontos / Autossuspensiva',
    description: 'Narrativa em processo de suspensão da CNH pelo atingimento de pontos ou infração autossuspensiva.',
    contentTemplate: `I - DOS FATOS E DO PROCEDIMENTO DE SUSPENSÃO\n\nO DETRAN/{{uf_requerente}} instaurou em desfavor do(a) Requerente o Processo Administrativo de Suspensão do Direito de Dirigir (PSDD) nº {{numero_processo_psdd}}, visando à cominação da penalidade de suspensão pelo prazo de {{tempo_suspensao_meses}} meses.\n\nOcorre que o somatório de pontos computado pela autarquia desconsiderou as alterações introduzidas pela Lei Federal nº 14.071/2020 (que elevou o limite legal para até 40 pontos para condutores sem infrações gravíssimas), além de incluir infrações que ainda se encontram com recursos administrativos pendentes de julgamento definitivo, sem o devido trânsito em julgado administrativo.`,
    supportedVariables: ['{{uf_requerente}}', '{{numero_processo_psdd}}', '{{tempo_suspensao_meses}}'],
    recommendedProcedures: ['processo_suspensao'],
  },
  {
    id: 'BLK-023',
    code: 'FATOS_PCDD_INSTAURACAO',
    category: 'fatos',
    title: 'Dos Fatos - Notificação de Instauração de Cassação da CNH',
    description: 'Narrativa para processo de cassação da CNH decorrente de suposta direção em período de suspensão.',
    contentTemplate: `I - DOS FATOS\n\nO(A) Requerente foi notificado(a) da abertura do Processo Administrativo de Cassação da CNH nº {{numero_processo_pcdd}}, sob o fundamento de que teria supostamente conduzido veículo automotor durante o período de cumprimento de suspensão do direito de dirigir (Art. 263, I do CTB).\n\nDemonstrará o(a) Requerente que o veículo automotor de sua titularidade não era por ele(a) conduzido na ocasião da autuação apontada, tendo sido emprestado / alienado a terceiro, não tendo havido abordagem policial pessoal nem identificação presencial do condutor pelo agente da autoridade de trânsito.`,
    supportedVariables: ['{{numero_processo_pcdd}}'],
    recommendedProcedures: ['processo_cassacao'],
  },
  {
    id: 'BLK-024',
    code: 'FATOS_FICI_APRESENTACAO',
    category: 'fatos',
    title: 'Dos Fatos - Apresentação Tempestiva de Indicação de Condutor (FICI)',
    description: 'Narrativa formal demonstrando a tempestividade e a veracidade da indicação de condutor.',
    contentTemplate: `I - DA TEMPESTIVIDADE E APRESENTAÇÃO DO CONDUTOR INFRATOR\n\nNa data de {{data_infracao}}, o veículo de propriedade do(a) Requerente, qualificado nesta peça, era conduzido exclusivamente pelo(a) Sr(a). {{condutor_indicado_nome}}, devidamente qualificado(a) no presente formulário.\n\nEstando o presente requerimento dentro do prazo assinalado na Notificação de Autuação (Art. 257, § 7º do CTB e Resolução CONTRAN nº 918/2022), e instruído com cópias legíveis dos documentos de habilitação e identidade de ambas as partes com assinaturas concordantes, impõe-se a regular transferência da pontuação decorrente do AIT nº {{numero_ait}}.`,
    supportedVariables: [
      '{{data_infracao}}',
      '{{condutor_indicado_nome}}',
      '{{numero_ait}}',
    ],
    recommendedProcedures: ['indicacao_condutor'],
  },
  {
    id: 'BLK-025',
    code: 'FATOS_CONVERSAO_ADVERTENCIA_ART267',
    category: 'fatos',
    title: 'Dos Fatos - Requerimento de Direito Subjetivo de Conversão em Advertência',
    description: 'Narrativa fática demonstrando o enquadramento perfeito nos requisitos do Art. 267 do CTB.',
    contentTemplate: `I - DO ENQUADRAMENTO AOS REQUISITOS LEGAIS DO ARTIGO 267 DO CTB\n\nO(A) Requerente foi notificado(a) da autuação referente ao AIT nº {{numero_ait}}, decorrente do enquadramento no {{enquadramento_ctb}}, classificada pela legislação como infração de natureza {{gravidade_infracao}} (leve ou média).\n\nConforme certidão de prontuário e histórico de CNH extraídos do sistema SENATRAN/DETRAN em anexo, o(a) Requerente não cometeu nenhuma outra infração de trânsito nos últimos 12 (doze) meses anteriores à data da autuação. Trata-se, portanto, de hipótese de imposição obrigatória de conversão da penalidade pecuniária em advertência por escrito, constituindo direito subjetivo do condutor após o advento da Lei nº 14.071/2020.`,
    supportedVariables: ['{{numero_ait}}', '{{enquadramento_ctb}}', '{{gravidade_infracao}}'],
    recommendedProcedures: ['conversao_advertencia'],
  },

  // ==========================================
  // 4. PRELIMINARES E NULIDADES FORMAIS (B026 - B038)
  // ==========================================
  {
    id: 'BLK-026',
    code: 'PRELIMINAR_DECADENCIA_30_DIAS',
    category: 'preliminares',
    title: 'Preliminar: Decadência do Direito de Punir por Notificação Expedida após 30 Dias',
    description: 'Nulidade e arquivamento obrigatório da autuação quando a Notificação da Autuação for postada após 30 dias (Art. 281, II CTB).',
    contentTemplate: `II.1 - DA DECADÊNCIA DO DIREITO DE PUNIR DA ADMINISTRAÇÃO PÚBLICA (ART. 281, PARÁGRAFO ÚNICO, II DO CTB)\n\nPreceitua de forma cogente o Artigo 281, parágrafo único, inciso II do Código de Trânsito Brasileiro que o Auto de Infração será arquivado e seu registro julgado insubsistente quando "se, no prazo máximo de 30 (trinta) dias, não for expedida a notificação da autuação".\n\nNo presente caso, a suposta infração ocorreu em {{data_infracao}}, ao passo que a Notificação de Autuação (NA) somente foi postada/expedida pelo órgão em {{data_expedicao}}, operando-se o lapso temporal de {{dias_decorridos}} dias, superando manifestamente o prazo decadencial improrrogável previsto em lei.\n\nTratando-se de prazo decadencial de ordem pública, extinguiu-se o próprio direito punitivo do Estado, impondo-se o imediato arquivamento do feito.`,
    supportedVariables: ['{{data_infracao}}', '{{data_expedicao}}', '{{dias_decorridos}}'],
    recommendedProcedures: ['recurso_jari', 'recurso_cetran'],
  },
  {
    id: 'BLK-027',
    code: 'PRELIMINAR_SUMULA_312_STJ_DUPLA_NOTIFICACAO',
    category: 'preliminares',
    title: 'Preliminar: Cerceamento de Defesa por Ausência de Dupla Notificação (Súmula 312 STJ)',
    description: 'Nulidade do processo administrativo por inobservância do rito obrigatório de Notificação de Autuação seguida de Notificação de Penalidade.',
    contentTemplate: `II.2 - DA NULIDADE PROCESSUAL POR AUSÊNCIA DE DUPLA NOTIFICAÇÃO (SÚMULA 312 DO SUPERIOR TRIBUNAL DE JUSTIÇA)\n\nO Superior Tribunal de Justiça consolidou entendimento vinculante através da Súmula nº 312, segundo a qual: "No procedimento para aplicação de multa por infração de trânsito, é necessária a notificação da autuação, assim como a notificação da imposição da penalidade".\n\nA ausência de envio tempestivo e comprovado da primeira notificação (Notificação de Autuação) para a apresentação de Defesa Prévia fulmina o procedimento de nulidade insanável, por evidente cerceamento de defesa e violação às garantias constitucionais do contraditório e do devido processo legal (Art. 5º, incisos LIV e LV da CF/88).`,
    supportedVariables: [],
    recommendedProcedures: ['recurso_jari', 'recurso_cetran'],
  },
  {
    id: 'BLK-028',
    code: 'PRELIMINAR_ERRO_CAMPOS_OBRIGATORIOS_AIT',
    category: 'preliminares',
    title: 'Preliminar: Inconsistência Formal do AIT por Omissão de Campos Obrigatórios (Art. 280 CTB)',
    description: 'Nulidade por falta de dados essenciais como modelo, placa, local exato ou identificação do agente.',
    contentTemplate: `II.3 - DA INCONSISTÊNCIA E IRREGULARIDADE FORMAL DO AIT (ART. 280 DO CTB C/C ART. 281, I DO CTB)\n\nO Artigo 280 do Código de Trânsito Brasileiro disciplina os requisitos formais de validade do Auto de Infração de Trânsito. A ausência de elementos tipificadores precisos — tais como a indicação exata do local (com numeral ou ponto de referência), marca e modelo corretos do veículo, ou assinatura e matrícula do agente autuador — torna o auto inconsistente e irregular.\n\nO Artigo 281, parágrafo único, inciso I do CTB é categórico ao determinar que "o auto de infração será arquivado e seu registro julgado insubsistente se considerado inconsistente ou irregular", impondo-se a anulação do ato administrativo com base no princípio da legalidade estrita.`,
    supportedVariables: [],
    recommendedProcedures: ['recurso_jari'],
  },
  {
    id: 'BLK-029',
    code: 'PRELIMINAR_INCOMPETENCIA_ORGAO',
    category: 'preliminares',
    title: 'Preliminar: Incompetência Funcional ou Territorial do Órgão Autuador',
    description: 'Incompetência de órgão municipal em rodovia estadual/federal sem convênio expresso ou vice-versa.',
    contentTemplate: `II.4 - DA INCOMPETÊNCIA DO ÓRGÃO AUTUADOR (ART. 21 E ART. 24 DO CTB)\n\nO Código de Trânsito Brasileiro distribui de forma estrita as competências materiais de fiscalização entre os órgãos executivos rodoviários (DER, DNIT, PRF) e os órgãos municipais de trânsito.\n\nNo caso em tela, a autuação foi promovida pelo(a) {{orgao_autuador}} em trecho que refoge à sua circunscrição originária de fiscalização, inexistindo nos autos prova de convênio de delegação de competência em vigor na data do fato, violando o princípio do juiz natural administrativo e a Lei de Processo Administrativo.`,
    supportedVariables: ['{{orgao_autuador}}'],
    recommendedProcedures: ['recurso_jari'],
  },
  {
    id: 'BLK-030',
    code: 'PRELIMINAR_PRESCRICAO_INTERCORRENTE_3_ANOS',
    category: 'preliminares',
    title: 'Preliminar: Prescrição Intercorrente Trienal (Lei 9.873/1999 e Res. 723/2018)',
    description: 'Extinção do processo administrativo de multa ou suspensão paralisado por mais de 3 anos pendente de despacho ou julgamento.',
    contentTemplate: `II.5 - DA OCORRÊNCIA DE PRESCRIÇÃO INTERCORRENTE TRIENAL (ART. 1º, § 1º DA LEI FEDERAL Nº 9.873/1999)\n\nDispõe o Art. 1º, § 1º da Lei nº 9.873/1999 que "incide a prescrição no procedimento administrativo paralisado por mais de três anos, pendente de julgamento ou despacho, cujos autos serão arquivados de ofício ou mediante requerimento da parte interessada".\n\nVerifica-se dos registros do processo que o recurso foi interposto em {{data_interposicao_recurso}} e permaneceu sem qualquer movimentação instrutória, deliberação ou julgamento por esta Junta/Conselho até {{data_atual}}, transcorrendo prazo superior a 36 (trinta e seis) meses de inércia estatal injustificada, configurando a extinção da punibilidade.`,
    supportedVariables: ['{{data_interposicao_recurso}}', '{{data_atual}}'],
    recommendedProcedures: ['recurso_jari', 'recurso_cetran', 'processo_suspensao'],
  },
  {
    id: 'BLK-031',
    code: 'PRELIMINAR_FALTA_MOTIVACAO_DECISAO_JARI',
    category: 'preliminares',
    title: 'Preliminar: Nulidade da Decisão da JARI por Ausência de Motivação / Despacho Padronizado',
    description: 'Nulidade de decisão de 1ª instância fundamentada em carimbo padrão sem apreciação das teses arguidas pelo condutor.',
    contentTemplate: `II.6 - DA NULIDADE DA DECISÃO DE 1ª INSTÂNCIA POR AUSÊNCIA DE MOTIVAÇÃO (ART. 50 DA LEI 9.784/99 E ART. 93, IX DA CF/88)\n\nA decisão monocrática / colegiada de 1ª instância proferida pela JARI limitou-se a estampar fórmula genérica e padronizada de "recurso indeferido por não apresentação de provas", sem enfrentar nenhuma das preliminares jurídicas e metrológicas expressamente formuladas pelo(a) Recorrente.\n\nO dever de motivação é requisito de validade de todo ato administrativo sancionatório (Art. 50 da Lei 9.784/1999). A rejeição genérica sem fundamentação concreta configura patente cerceamento de defesa e nulidade absoluta do julgamento.`,
    supportedVariables: [],
    recommendedProcedures: ['recurso_cetran'],
  },
  {
    id: 'BLK-032',
    code: 'PRELIMINAR_BIS_IN_IDEM_DUPLICIDADE',
    category: 'preliminares',
    title: 'Preliminar: Bis in Idem - Múltiplas Autuações no Mesmo Trecho e Intervalo Mínimo',
    description: 'Nulidade de autuações sucessivas pelo mesmo fato continuado em curto espaço de tempo e mesma via.',
    contentTemplate: `II.7 - DA ILICITUDE DE DUPLICIDADE DE AUTUAÇÃO (BIS IN IDEM / FATO CONTÍNUO)\n\nO(A) Requerente foi autuado(a) múltiplas vezes no mesmo dia e na mesma avenida/rodovia em um intervalo de poucos minutos/quilômetros. A jurisprudência pátria e a Portaria SENATRAN vedam a aplicação cumulativa de sanções sobre a mesma conduta contínua de circulação sem interrupção de viagem, sob pena de intolerável bis in idem e enriquecimento sem causa do Estado.`,
    supportedVariables: [],
    recommendedProcedures: ['recurso_jari'],
  },

  // ==========================================
  // 5. ARGUMENTOS TÉCNICOS - VELOCIDADE & RADAR (B039 - B043)
  // ==========================================
  {
    id: 'BLK-039',
    code: 'MÉRITO_RADAR_CALIBRACAO_EXPIRADA',
    category: 'argumentos_velocidade',
    title: 'Mérito: Aferição Metrológica do Radar Expirada ou Inexistente (Res. CONTRAN 798/2020)',
    description: 'Nulidade do registro de velocidade quando o equipamento não foi aferido pelo INMETRO no prazo máximo de 12 meses.',
    contentTemplate: `III.1 - DA INVALIDADE DA MEDIÇÃO: AFERIÇÃO METROLÓGICA ANUAL DO INMETRO VENCIDA (RES. CONTRAN Nº 798/2020)\n\nO Artigo 4º, inciso III da Resolução CONTRAN nº 798/2020 estabelece de maneira expressa e inderrogável que todo medidor de velocidade deve obrigatoriamente "ter seu modelo aprovado pelo INMETRO e ser submetido à verificação metrológica com periodicidade máxima de 12 (doze) meses".\n\nConforme consulta efetuada ao Portal de Serviços do INMETRO (PSInmetro), o equipamento medidor utilizado na autuação encontrava-se na data do fato com seu laudo de aferição metrológica vencido ou inexistente. A ausência de calibração válida retira a presunção de veracidade da medição e contamina de nulidade o registro, não podendo subsidiar penalidade pecuniária ou pontuação.`,
    supportedVariables: [],
    recommendedProcedures: ['recurso_jari', 'recurso_cetran'],
  },
  {
    id: 'BLK-040',
    code: 'MÉRITO_RADAR_FALTA_SINALIZACAO_R19',
    category: 'argumentos_velocidade',
    title: 'Mérito: Ausência ou Irregularidade de Placa Regulamentadora R-19 (Art. 90 do CTB)',
    description: 'Inaplicabilidade de penalidade por ausência de sinalização visível de velocidade antes do radar.',
    contentTemplate: `III.2 - DA INAPLICABILIDADE DA PENALIDADE POR AUSÊNCIA DE SINALIZAÇÃO R-19 REGULAMENTAR (ART. 90 DO CTB)\n\nDetermina de forma cogente o Artigo 90 do Código de Trânsito Brasileiro: "Não serão aplicadas as sanções previstas neste Código por inobservância à sinalização quando esta for insuficiente ou incorreta".\n\nPor sua vez, a Resolução CONTRAN nº 798/2020 estabelece no Artigo 12 e Anexo II a obrigatoriedade da instalação prévia de placa de velocidade regulamentar R-19, em perfeito estado de visibilidade e nas distâncias métricas fixadas pela engenharia de tráfego. No local da fiscalização, a inexistência, ocultação por vegetação ou distância incorreta da placa desonera o condutor de responsabilidade infracional.`,
    supportedVariables: [],
    recommendedProcedures: ['recurso_jari'],
  },
  {
    id: 'BLK-041',
    code: 'MÉRITO_RADAR_MARGEM_ERRO_METROLOGICA',
    category: 'argumentos_velocidade',
    title: 'Mérito: Desconsideração da Margem de Tolerância Metrológica Obrigatória',
    description: 'Erro de enquadramento quando a velocidade considerada com a dedução da margem do INMETRO reclassifica ou exclui a infração.',
    contentTemplate: `III.3 - DO ERRO MATERIAL DE CÁLCULO E MARGEM DE ERRO METROLÓGICA (TABELA DO ANEXO II DA RES. 798/2020)\n\nTodo instrumento medidor de velocidade possui margem de erro admitida (tolerância metrológica) de 7 km/h para velocidades até 100 km/h e de 7% para velocidades superiores. A velocidade considerada para fins de aplicação da penalidade é o resultado da velocidade medida subtraída da margem de erro.\n\nNo presente caso, procedendo-se ao correto abatimento da tolerância obrigatória, a velocidade considerada enquadra-se em faixa diversa ou inferior à constante na notificação, impondo-se a anulação ou retificação do enquadramento fiscal.`,
    supportedVariables: [],
    recommendedProcedures: ['recurso_jari'],
  },
  {
    id: 'BLK-042',
    code: 'MÉRITO_RADAR_FALTA_ESTUDO_TECNICO',
    category: 'argumentos_velocidade',
    title: 'Mérito: Inexistência de Estudo Técnico de Instalação e Mapeamento de Acidentes',
    description: 'Exigência legal de estudo técnico prévio de engenharia para instalação e operação de radares fixos.',
    contentTemplate: `III.4 - DA AUSÊNCIA DE ESTUDO TÉCNICO COMPROBATÓRIO DE INSTALAÇÃO (ART. 6º DA RES. CONTRAN 798/2020)\n\nA instalação e operação de medidores de velocidade do tipo fixo exige a realização de prévio Estudo Técnico de Engenharia devidamente aprovado pelo órgão com circunscrição sobre a via, demonstrando o histórico de acidentes e a necessidade de controle de velocidade no trecho.\n\nA ausência de disponibilização e juntada do estudo técnico válido com ART (Anotação de Responsabilidade Técnica) acarreta a nulidade da instalação do equipamento fiscalizador e das autuações dele decorrentes.`,
    supportedVariables: [],
    recommendedProcedures: ['recurso_jari'],
  },

  // ==========================================
  // 6. ARGUMENTOS TÉCNICOS - SEMÁFORO, CELULAR, ESTACIONAMENTO (B044 - B050)
  // ==========================================
  {
    id: 'BLK-044',
    code: 'MÉRITO_SEMAFORO_FALTA_FOTO_RETENCAO',
    category: 'argumentos_semaforo',
    title: 'Mérito: Sistema Semafórico Automatizado Não Demonstra Linha de Retenção (Res. 985/2022)',
    description: 'Nulidade da autuação de avanço semafórico quando a fotografia não comprova a posição do veículo antes da linha de retenção.',
    contentTemplate: `III.5 - DA AUSÊNCIA DE PROVA DA TRANSPOSIÇÃO DA LINHA DE RETENÇÃO NO CICLO VERMELHO (MBFT - RES. CONTRAN 985/2022)\n\nO Manual Brasileiro de Fiscalização de Trânsito exige expressamente que a fiscalização eletrônica de avanço de sinal vermelho registre, no mínimo, duas fotos sequenciais: a primeira demonstrando o veículo antes da linha de retenção já com o foco vermelho ativo, e a segunda demonstrando a transposição e o cruzamento efetivo.\n\nNa imagem disponibilizada pelo órgão, não é possível comprovar que o veículo iniciou a transposição no sinal vermelho, tendo o ingresso no cruzamento ocorrido ainda sob a fase amarela, situação em que o Art. 208 do CTB não autoriza a punição.`,
    supportedVariables: [],
    recommendedProcedures: ['recurso_jari'],
  },
  {
    id: 'BLK-045',
    code: 'MÉRITO_CELULAR_FALTA_ABORDAGEM_DESCRICAO',
    category: 'argumentos_celular',
    title: 'Mérito: Falta de Abordagem e Ausência de Descrição Circunstanciada no Uso de Celular',
    description: 'Nulidade de autuação de celular do Art. 252 sem abordagem e sem esclarecer detalhadamente a forma de manuseio no AIT.',
    contentTemplate: `III.6 - DA ATIPICIDADE E NULIDADE POR FALTA DE DETALHAMENTO NO CAMPO DE OBSERVAÇÕES (ART. 252 DO CTB)\n\nA ficha de enquadramento do código 736-62 da Resolução CONTRAN nº 985/2022 determina de forma expressa que o agente fiscalizador deve registrar no campo de observações do AIT como o aparelho estava sendo manuseado (ex: "segurando junto ao ouvido", "digitando mensagem no painel", etc.).\n\nA lavratura desprovida de qualquer relato circunstanciado, sem abordagem policial que pudesse aferir se o aparelho não se tratava de outro objeto ou se estava acoplado a suporte de navegação GPS veicular legalmente autorizado, desconstitui a presunção relativa de veracidade do ato.`,
    supportedVariables: [],
    recommendedProcedures: ['recurso_jari'],
  },
  {
    id: 'BLK-046',
    code: 'MÉRITO_ESTACIONAMENTO_PARADA_MOMENTANEA',
    category: 'argumentos_estacionamento',
    title: 'Mérito: Descaracterização de Estacionamento - Parada Momentânea para Embarque / Desembarque',
    description: 'Diferenciação legal entre parada e estacionamento conforme Anexo I do CTB.',
    contentTemplate: `III.7 - DA DESCARACTERIZAÇÃO DE ESTACIONAMENTO: MERA PARADA PARA EMBARQUE E DESEMBARQUE (ANEXO I DO CTB)\n\nO Anexo I do Código de Trânsito Brasileiro estabelece distinção categórica entre Estacionamento e Parada. Parada é a "imobilização do veículo com a finalidade e pelo tempo estritamente necessário para efetuar embarque ou desembarque de passageiros", ao passo que estacionamento pressupõe imobilização por tempo superior.\n\nO veículo do(a) Requerente apenas imobilizou-se momentaneamente pelo tempo estritamente indispensável ao desembarque de ocupante, mantendo-se o motor em funcionamento e o condutor ao volante com o pisca-alerta acionado, inexistindo a infração de estacionamento descrita no Art. 181 do CTB.`,
    supportedVariables: [],
    recommendedProcedures: ['recurso_jari'],
  },

  // ==========================================
  // 7. ARGUMENTOS TÉCNICOS - LEI SECA & RECUSA (B051 - B053)
  // ==========================================
  {
    id: 'BLK-051',
    code: 'MÉRITO_LEI_SECA_FALTA_TERMO_SINAIS',
    category: 'argumentos_alcoolemia',
    title: 'Mérito: Ausência de Termo de Constatação de Sinais de Embriaguez (Res. 432/2013)',
    description: 'Nulidade da autuação do Art. 165 / 165-A quando o agente não preencheu o Termo formal atestando sinais clínicos de alcoolemia.',
    contentTemplate: `III.8 - DA NULIDADE ABSOLUTA: AUSÊNCIA DE TERMO DE CONSTATAÇÃO DE SINAIS DE ALTERAÇÃO DA CAPACIDADE PSICOMOTORA (RES. CONTRAN Nº 432/2013)\n\nO Artigo 5º da Resolução CONTRAN nº 432/2013 exige que, na hipótese de não realização do teste de ar alveolar, os sinais de alteração da capacidade psicomotora deverão ser atestados mediante preenchimento obrigatório de Termo de Constatação de Sinais (Anexo II), com descrição circunstanciada de um conjunto consistente de sinais exteriores (odor etílico, olhos vermelhos, fala alterada, desequilíbrio).\n\nA omissão na lavratura do Termo de Constatação de Sinais impede a presunção de embriaguez, tornando a autuação manifestamente infundada e violadora do princípio da presunção de inocência e do direito à ampla defesa.`,
    supportedVariables: [],
    recommendedProcedures: ['recurso_jari', 'processo_suspensao'],
  },
  {
    id: 'BLK-052',
    code: 'MÉRITO_RECUSA_DIREITO_CONSTITUCIONAL',
    category: 'argumentos_alcoolemia',
    title: 'Mérito: Direito Constitucional de Não Autoincriminação (Nemo Tenetur se Detegere)',
    description: 'Incompatibilidade da punição por mera recusa sem a demonstração fática de alteração na condução do veículo.',
    contentTemplate: `III.9 - DO PRINCÍPIO CONSTITUCIONAL DO NEMO TENETUR SE DETEGERE (ART. 5º, LXIII DA CF/88 E PACTO DE SAN JOSÉ DA COSTA RICA)\n\nO ordenamento jurídico brasileiro consagra o postulado universal de que ninguém pode ser compelido a produzir prova contra si mesmo (Art. 5º, inciso LXIII da Constituição Federal e Artigo 8º, 2, 'g' da Convenção Americana sobre Direitos Humanos).\n\nA aplicação de gravíssima penalidade pecuniária e suspensiva fundada estritamente no exercício regular de um direito fundamental, sem qualquer indício ou prova material de embriaguez ou perigo na direção, afigura-se desproporcional e inconstitucional.`,
    supportedVariables: [],
    recommendedProcedures: ['recurso_jari', 'processo_suspensao'],
  },

  // ==========================================
  // 8. ARGUMENTOS - SUSPENSÃO E CASSAÇÃO (B054 - B055)
  // ==========================================
  {
    id: 'BLK-054',
    code: 'MÉRITO_SUSPENSAO_NOVA_LEI_40_PONTOS',
    category: 'argumentos_suspensao',
    title: 'Mérito: Aplicação Retroativa da Nova Escala de 40 Pontos (Lei 14.071/2020)',
    description: 'Retroatividade de norma benéfica para processos de suspensão por pontuação instaurados sob o limite anterior de 20 pontos.',
    contentTemplate: `III.10 - DA RETROATIVIDADE DA NORMA MAIS BENÉFICA: NOVO LIMITE DE 40 PONTOS DA LEI Nº 14.071/2020 (ART. 5º, XL DA CF/88)\n\nA Lei Federal nº 14.071/2020 alterou substancialmente a redação do Artigo 261, inciso I do CTB, estabelecendo o teto de 40 (quarenta) pontos para a instauração de processo de suspensão para condutores sem infrações de natureza gravíssima no prontuário.\n\nPor força do princípio constitucional da retroatividade da norma administrativa mais benéfica (lex mitior - Art. 5º, inciso XL da Carta Magna e jurisprudência consolidada do STJ no Tema 1.097), o novo patamar legal aplica-se a todos os procedimentos ainda não transitados em julgado, impondo-se a extinção do processo sancionatório.`,
    supportedVariables: [],
    recommendedProcedures: ['processo_suspensao', 'recurso_jari', 'recurso_cetran'],
  },
  {
    id: 'BLK-055',
    code: 'MÉRITO_CASSACAO_AUSENCIA_DIRECAO_PESSOAL',
    category: 'argumentos_cassacao',
    title: 'Mérito: Inocorrência de Direção pelo Condutor Suspenso - Veículo Conduzido por Terceiro',
    description: 'Nulidade da cassação quando a infração na vigência da suspensão não teve abordagem e o veículo estava na posse de outrem.',
    contentTemplate: `III.11 - DA NULIDADE DA CASSAÇÃO: INOCORRÊNCIA DE DIREÇÃO DO VEÍCULO PELO CONDUTOR SUSPENSO (ART. 263, I DO CTB)\n\nA cominação de cassação do documento de habilitação com esteio no Artigo 263, inciso I do CTB pressupõe a comprovação inequívoca e presencial de que o condutor penalizado estava efetivamente na direção do veículo durante o período de suspensão.\n\nTratando-se de autuação lavrada sem abordagem policial (registro por radar ou talonário eletrônico remoto), a mera propriedade registral do veículo não autoriza presumir que o proprietário era o condutor, demonstrado nos autos que o automóvel encontrava-se na posse legítima de terceiro habilitado.`,
    supportedVariables: [],
    recommendedProcedures: ['processo_cassacao'],
  },

  // ==========================================
  // 9. PEDIDOS E REQUERIMENTOS FORMAIS (B056 - B065)
  // ==========================================
  {
    id: 'BLK-056',
    code: 'PEDIDOS_ARQUIVAMENTO_DEFESA_PREVIA',
    category: 'pedidos',
    title: 'Pedidos Formais - Defesa Prévia (Arquivamento e Insubsistência)',
    description: 'Bloco padronizado de requerimentos formais para Defesa Prévia.',
    contentTemplate: `IV - DOS PEDIDOS\n\nAnte todo o exposto, com fundamento nos preceitos do Código de Trânsito Brasileiro e nas garantias constitucionais vigentes, REQUER a Vossa Senhoria:\n\n1. O RECEBIMENTO da presente Defesa Prévia por ser própria, tempestiva e instruída com os documentos de praxe;\n2. O ACOLHIMENTO integral das preliminares suscitadas, reconhecendo-se a nulidade/decadência e determinando-se o ARQUIVAMENTO DEFINITIVO do Auto de Infração de Trânsito nº {{numero_ait}} com julgamento de seu registro como INSUBSISTENTE (Art. 281, parágrafo único do CTB);\n3. A EXTINÇÃO de qualquer sanção pecuniária correlata bem como a abstenção de lançamento de pontos no prontuário de CNH do condutor;\n4. Subsidiariamente, na remota hipótese de não acolhimento do arquivamento, a conversão da autuação em Advertência por Escrito ex officio (Art. 267 do CTB).`,
    supportedVariables: ['{{numero_ait}}'],
    recommendedProcedures: [],
  },
  {
    id: 'BLK-057',
    code: 'PEDIDOS_CANCELAMENTO_RECURSO_JARI',
    category: 'pedidos',
    title: 'Pedidos Formais - Recurso à JARI (Efeito Suspensivo e Cancelamento)',
    description: 'Requerimentos formais para Recurso de 1ª Instância perante a JARI com efeito suspensivo.',
    contentTemplate: `IV - DOS PEDIDOS\n\nEx positis, demonstradas as razões de fato e de direito, REQUER a este Ilustre Colegiado da JARI:\n\n1. O CONHECIMENTO do presente recurso ordinário em virtude de sua regularidade formal e tempestividade;\n2. A CONCESSÃO DO EFEITO SUSPENSIVO automático ao presente recurso, nos expressos termos do Artigo 285, § 3º do CTB, impedindo a exigibilidade da multa e o lançamento de pontos na CNH até o julgamento final;\n3. No mérito, o integral PROVIMENTO do recurso para o fim de reformar a decisão anterior, CANCELAR a Notificação de Penalidade e determinar o ARQUIVAMENTO DEFINITIVO do AIT nº {{numero_ait}};\n4. A expedição de certidão circunstanciada do julgamento com a devida motivação expressa.`,
    supportedVariables: ['{{numero_ait}}'],
    recommendedProcedures: ['recurso_jari'],
  },
  {
    id: 'BLK-058',
    code: 'PEDIDOS_REFORMA_RECURSO_CETRAN',
    category: 'pedidos',
    title: 'Pedidos Formais - Recurso de 2ª Instância ao CETRAN',
    description: 'Requerimentos formais em grau recursal perante o Conselho Estadual de Trânsito.',
    contentTemplate: `IV - DOS PEDIDOS\n\nPor todas as razões expostas, REQUER aos Eminentes Conselheiros do CETRAN/{{uf_requerente}}:\n\n1. O CONHECIMENTO do presente recurso de 2ª instância administrativa;\n2. A declaração de NULIDADE da decisão proferida pela JARI por manifesta ausência de fundamentação e cerceamento de defesa;\n3. No mérito recursal, o TOTAL PROVIMENTO deste recurso para DESTITUIR a penalidade pecuniária e cassar os efeitos da autuação nº {{numero_ait}}, com a consequente exclusão de qualquer pontuação no sistema informatizado nacional (RENACH/SNE).`,
    supportedVariables: ['{{uf_requerente}}', '{{numero_ait}}'],
    recommendedProcedures: ['recurso_cetran'],
  },
  {
    id: 'BLK-059',
    code: 'PEDIDOS_EXTINCAO_PSDD_SUSPENSAO',
    category: 'pedidos',
    title: 'Pedidos Formais - Processo de Suspensão da CNH (PSDD)',
    description: 'Requerimentos em processo de suspensão do direito de dirigir.',
    contentTemplate: `IV - DOS PEDIDOS\n\nDiante do exposto, REQUER à Ilustre autoridade do DETRAN/{{uf_requerente}}:\n\n1. O RECEBIMENTO e regular processamento desta Defesa Administrativa em face do PSDD nº {{numero_processo_psdd}};\n2. A declaração de EXTINÇÃO e consequente ARQUIVAMENTO do Processo Administrativo de Suspensão do Direito de Dirigir, ante a atipicidade/decadência das autuações originárias e a aplicação do novo limite legal de 40 pontos da Lei 14.071/2020;\n3. A preservação irrestrita do direito de dirigir do(a) Requerente e a renovação de sua CNH sem a imposição de curso de reciclagem.`,
    supportedVariables: ['{{uf_requerente}}', '{{numero_processo_psdd}}'],
    recommendedProcedures: ['processo_suspensao'],
  },
  {
    id: 'BLK-060',
    code: 'PEDIDOS_NULIDADE_PCDD_CASSACAO',
    category: 'pedidos',
    title: 'Pedidos Formais - Processo de Cassação da CNH (PCDD)',
    description: 'Requerimentos para anulação de processo de cassação da carteira de habilitação.',
    contentTemplate: `IV - DOS PEDIDOS\n\nIsto posto, REQUER a esta Comissão de Processos de Cassação do DETRAN/{{uf_requerente}}:\n\n1. A admissão da presente defesa com efeito suspensivo pleno;\n2. A IMPROCEDÊNCIA E ARQUIVAMENTO do Processo de Cassação da CNH nº {{numero_processo_pcdd}}, diante da comprovação de inocorrência de direção veicular pelo Requerente;\n3. A manutenção da regularidade cadastral da habilitação do condutor no sistema RENACH.`,
    supportedVariables: ['{{uf_requerente}}', '{{numero_processo_pcdd}}'],
    recommendedProcedures: ['processo_cassacao'],
  },
  {
    id: 'BLK-061',
    code: 'PEDIDOS_HOMOLOGACAO_FICI',
    category: 'pedidos',
    title: 'Pedidos Formais - Homologação de Indicação de Condutor (FICI)',
    description: 'Requerimento de aceitação e transferência de pontuação para o condutor indicado.',
    contentTemplate: `III - DOS PEDIDOS\n\nRequerem os signatários a HOMOLOGAÇÃO da presente Indicação de Real Condutor Infrator, com o imediato lançamento da pontuação decorrente do AIT nº {{numero_ait}} no prontuário de CNH do condutor infrator ora indicado ({{condutor_indicado_nome}} - CNH nº {{condutor_indicado_cnh}}), desonerando-se o proprietário de qualquer gravame nos termos do Art. 257, § 7º do CTB.`,
    supportedVariables: [
      '{{numero_ait}}',
      '{{condutor_indicado_nome}}',
      '{{condutor_indicado_cnh}}',
    ],
    recommendedProcedures: ['indicacao_condutor'],
  },
  {
    id: 'BLK-062',
    code: 'PEDIDOS_CONVERSAO_OBRIGATORIA_ADVERTENCIA',
    category: 'pedidos',
    title: 'Pedidos Formais - Conversão em Advertência por Escrito (Art. 267 CTB)',
    description: 'Requerimento de conversão imperativa de multa em advertência por escrito.',
    contentTemplate: `II - DOS PEDIDOS\n\nEm razão do preenchimento integral dos requisitos objetivos previstos no Artigo 267 do CTB com a redação da Lei nº 14.071/2020, REQUER a Vossa Senhoria:\n\n1. O deferimento do presente pedido de CONVERSÃO DA PENALIDADE DE MULTA EM ADVERTÊNCIA POR ESCRITO referente ao AIT nº {{numero_ait}};\n2. O cancelamento de qualquer cobrança de valor pecuniário e a abstenção de lançamento de pontos na CNH do(a) Requerente, expedindo-se a competente notificação de advertência com caráter unicamente educativo.`,
    supportedVariables: ['{{numero_ait}}'],
    recommendedProcedures: ['conversao_advertencia'],
  },

  // ==========================================
  // 10. FECHAMENTO E ASSINATURA (B066 - B070)
  // ==========================================
  {
    id: 'BLK-066',
    code: 'FECHO_PADRAO_COM_DATA',
    category: 'fechamento',
    title: 'Fecho Padrão de Deferimento com Local e Data',
    description: 'Conclusão formal forense padrão com local, data e campo para assinatura do requerente.',
    contentTemplate: `Nestes termos,\nPede e espera deferimento.\n\n{{cidade_estado}}, {{data_peticao}}.\n\n___________________________________________________\n{{nome_requerente}}\nCPF nº {{cpf_requerente}}\nCNH nº {{cnh_requerente}}`,
    supportedVariables: [
      '{{cidade_estado}}',
      '{{data_peticao}}',
      '{{nome_requerente}}',
      '{{cpf_requerente}}',
      '{{cnh_requerente}}',
    ],
    recommendedProcedures: [
      'recurso_jari',
      'recurso_cetran',
      'processo_suspensao',
      'processo_cassacao',
      'conversao_advertencia',
    ],
  },
  {
    id: 'BLK-067',
    code: 'FECHO_DUPLO_FICI',
    category: 'fechamento',
    title: 'Fecho com Assinatura Dupla (Proprietário e Real Condutor)',
    description: 'Conclusão com assinaturas conjuntas obrigatórias para transferência de pontuação de trânsito.',
    contentTemplate: `Declaramos, sob as penas da lei (Artigo 299 do Código Penal), que as informações prestadas são fiéis e verdadeiras.\n\n{{cidade_estado}}, {{data_peticao}}.\n\n\n___________________________________________________\nASSINATURA DO PROPRIETÁRIO DO VEÍCULO\n{{nome_requerente}} (CPF: {{cpf_requerente}})\n\n\n___________________________________________________\nASSINATURA DO CONDUTOR INFRATOR INDICADO\n{{condutor_indicado_nome}} (CPF: {{condutor_indicado_cpf}} | CNH: {{condutor_indicado_cnh}})`,
    supportedVariables: [
      '{{cidade_estado}}',
      '{{data_peticao}}',
      '{{nome_requerente}}',
      '{{cpf_requerente}}',
      '{{condutor_indicado_nome}}',
      '{{condutor_indicado_cpf}}',
      '{{condutor_indicado_cnh}}',
    ],
    recommendedProcedures: ['indicacao_condutor'],
  },
  {
    id: 'BLK-068',
    code: 'FECHO_ROL_DOCUMENTOS_ANEXOS',
    category: 'fechamento',
    title: 'Rol de Documentos Anexados à Petição',
    description: 'Relação descritiva de documentos probatórios que instruem o processo administrativo.',
    contentTemplate: `ROL DE DOCUMENTOS QUE INSTRUEM A PRESENTE PEÇA:\n\n1. Cópia do Documento de Identidade (RG) e CPF do(a) Requerente;\n2. Cópia da Carteira Nacional de Habilitação (CNH) válida;\n3. Cópia do Certificado de Registro e Licenciamento do Veículo (CRLV-e);\n4. Cópia da Notificação de Autuação / Notificação de Penalidade do AIT nº {{numero_ait}};\n5. Documentos comprobatórios dos fatos alegados (fotografias, laudos do INMETRO, comprovantes de pagamento e certidões).`,
    supportedVariables: ['{{numero_ait}}'],
    recommendedProcedures: ['recurso_jari', 'recurso_cetran', 'processo_suspensao', 'processo_cassacao', 'indicacao_condutor', 'conversao_advertencia'],
  },
];
