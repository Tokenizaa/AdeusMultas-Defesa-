export type ProcedureType =
  | 'recurso_jari'
  | 'recurso_cetran'
  | 'conversao_advertencia'
  | 'indicacao_condutor'
  | 'suspensao_cnh'
  | 'cassacao_cnh'
  | 'processo_suspensao'
  | 'processo_cassacao'
  | 'defesa_previa'
  | 'analise_tecnica'
  | 'relatorio_pericial';

export type InfractionSeverity = 'leve' | 'media' | 'grave' | 'gravissima';

/**
 * Status Canônico do Caso (Representa exclusivamente eventos internos da plataforma)
 */
export type CaseStatus =
  | 'draft'                  // 1. Rascunho / preenchimento inicial dos dados da infração
  | 'analisando'             // 1. Processamento da análise preliminar por IA
  | 'analisado'              // 1. Diagnóstico preliminar gratuito pronto para visualização
  | 'aguardando_pagamento'   // 2. Usuário optou por gerar defesa e aguarda checkout
  | 'gerando_documento'      // 2. Pagamento confirmado, peça jurídica em compilação
  | 'defesa_pronta'          // 2. Documento gerado e disponível para consulta e download
  | 'novo'                   // Legado/compatibilidade com banco
  | 'aguardando_documentos'  // Legado/compatibilidade
  | 'finalizado';            // Concluído / arquivado na plataforma

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type PaymentStatus = 'not_requested' | 'pending' | 'approved' | 'failed' | 'refunded';
export type DocumentGenerationStatus = 'not_requested' | 'processing' | 'ready' | 'error';

/**
 * 4 Etapas do Fluxo Operacional da Plataforma DefesAi:
 * Etapa 1: Dados da Infração (Formulário + OCR auxiliar interno)
 * Etapa 2: Diagnóstico Preliminar Gratuito (Vícios e Teses detectadas)
 * Etapa 3: Dados Complementares & Pagamento (Qualificação para a peça)
 * Etapa 4: Defesa Gerada & Disponível (Consulta, Edição, PDF A4 e orientações de protocolo)
 */
export type JourneyStage = 1 | 2 | 3 | 4;

export interface VehicleData {
  plate: string;
  brandModel: string;
  renavam?: string;
  chassis?: string;
  year?: string;
  color?: string;
}

export interface InfractionData {
  id?: string;
  aitNumber: string; // Número do Auto de Infração
  infractionCode?: string; // ex: 745-50
  code?: string;
  description: string;
  ctbArticle: string; // ex: Art. 218, I
  severity: InfractionSeverity;
  points: number;
  fineAmount: number;
  autuadorBody: string; // ex: DETRAN-SP, PRF, DNIT, DER
  autuadorCode?: string;
  dateTime: string;
  location: string;
  speedLimit?: number;
  measuredSpeed?: number;
  consideredSpeed?: number;
  speedMeasured?: number;
  speedConsidered?: number;
  radarEquipmentId?: string;
  inmetroAferitionDate?: string;
  notificationExpeditionDate?: string;
  notificationDeliveryDate?: string; // Data de entrega/recebimento da NA (decadência postal)
  defenseDeadline?: string; // Prazo fixado na notificação informada pelo usuário
  formalFlawsDetected?: string[];
  hasPreviousInfractionsLast12Months?: boolean;
  hasR19SignageProof?: boolean;
  hasPsychomotorTerm?: boolean; // Termo de constatação de sinais psicomotores (Lei Seca)
  hasAgentDetailedObservations?: boolean; // Campo de observações circunstanciadas preenchido no AIT
  hasPhotoProof?: boolean; // Fotos/evidência fotográfica do flagrante
  hasRegulatorySign?: boolean;

  // Lei Seca
  refusedTest?: boolean;
  offeredRetest?: boolean;

  // Celular
  cellphoneCircumstance?: string;

  // Semáforo
  yellowPhaseCrossing?: boolean;
  emergencyPassage?: boolean;

  // Indicação de condutor
  realDriverName?: string;
  realDriverCpf?: string;
  realDriverCnh?: string;
  indicationWithinDeadline?: boolean;

  // Evidências/OCR auxiliares
  ocrExtractedText?: string;
  ocrConfidence?: number;
  photoProofUrls?: string[];
  notes?: string;
}

export interface LegalArgumentDomain {
  id: string;
  code: string;
  title: string;
  category: 'preliminar' | 'merito' | 'constitucional' | 'formal';
  legalBase: string; // ex: Art. 281, Parágrafo Único, II do CTB
  contranResolution?: string; // ex: Resolução CONTRAN nº 798/2020
  summary: string;
  detailedText: string;
  confidenceScore: number; // 0-100
  applicabilityNote: string;
  applicableInfractions?: string[];
  // Versioning and source tracking
  validFrom?: string; // ISO date 'YYYY-MM-DD'
  validUntil?: string | null; // null = vigente
  sourceId?: string; // reference to knowledge source
  contentHash?: string; // hash of the source content
  version?: number; // version number of this item
}

/**
 * AVALIAÇÃO DE REGRA JURÍDICA DETERMINÍSTICA (Árvore de Decisão Auditável)
 */
export interface EvaluatedRule {
  ruleId: string;
  name?: string;
  status: 'PASS' | 'FAIL' | 'DATA_GAP';
  evaluatedAt: string;
  inputs?: Record<string, unknown>;
  reason?: string;
  legalArgumentId?: string;
  impact?: string;
  severity?: 'alta' | 'media' | 'baixa';
}

/**
 * Vício detectado pelo RuleEngine — cadeia jurídica rastreável
 * FACT → RULE → FLAW → ARGUMENT → BLOCK → PROCEDURE
 */
export interface DetectedFlaw {
  /** ID da regra que detectou (origem rastreável). */
  ruleId: string;
  /** ID da tese canônica (ARG-*) a aplicar. */
  argumentId: string;
  /** ID do bloco jurídico (BLK-*) recomendado para a peça. */
  blockId?: string;
  /** Severidade programática do vício. */
  severity: 'alta' | 'media' | 'baixa';
  /** Título do vício. */
  title: string;
  /** Descrição jurídica do vício. */
  description: string;
  /** Impacto processual (anulação, conversão, reclassificação). */
  impact: string;
  /** Base legal consolidada. */
  statutoryBasis: string;
}

/**
 * ETAPA 1 — DIAGNÓSTICO PRELIMINAR GRATUITO
 */
export interface CaseAnalysis {
  id: string;
  caseId: string;
  status?: AnalysisStatus;
  overallSuccessRate: number; // Probabilidade técnica estimada (0-100%)
  detectedInconsistencies: {
    title: string;
    description: string;
    severity: 'alta' | 'media' | 'baixa';
    legalArgumentId?: string;
    impact: string;
  }[];
  recommendedArguments: LegalArgumentDomain[];
  recommendedProcedure: ProcedureType;
  competentBody: string;
  procedureDeadline?: string;
  summaryReasoning: string;
  createdAt: string;
  /**
   * Versão do motor que produziu esta análise (rastreabilidade).
   */
  engineVersion?: string;
  /**
   * Árvore de decisão auditável (cada regra avaliada com status PASS/FAIL/DATA_GAP).
   */
  evaluatedRules?: EvaluatedRule[];
  /**
   * Vícios detectados normalizados — cadeia FACT → RULE → FLAW → ARGUMENT → BLOCK.
   * Espelho estruturado das detectedInconsistencies para auditoria.
   */
  detectedFlaws?: DetectedFlaw[];
  /**
   * Teses canônicas selecionadas (IDs ARG-*).
   */
  selectedArguments?: string[];
  /**
   * Score de integridade estrutural (0-100). 100 = sem pendências conhecidas.
   */
  integrityScore?: number;
  /**
   * Regras que não puderam concluir por dados insuficientes (FAIL CLOSED,
   * Fase 2). Nunca tratadas como vício detectado.
   */
  dataGaps?: {
    ruleId: string;
    missingData: string[];
    reason: string;
  }[];
  /**
   * Timestamp do início da avaliação determinística.
   */
  engineStartedAt?: string;
  /**
   * Timestamp do fim da avaliação determinística.
   */
  engineFinishedAt?: string;
}

/**
 * FASE 8 — Rastreabilidade de Dados (Data Lineage)
 *
 * Cada informação relevante percorre o pipeline:
 * ONBOARDING → CANONICAL CASE → RULE ENGINE → TESes/VÍCIOS/BLOCOS → DOCUMENTO
 *
 * O lineage permite auditoria completa: de onde veio, se foi transformado,
 * se disparou regra, gerou vício/tese/bloco, aparece no documento.
 */
export type DataLineageSource = 'onboarding' | 'ocr' | 'catalog' | 'rule_engine' | 'system';

export interface DataLineageEntry {
  /** Campo original no onboarding (ex: 'infraction.inmetroAferitionDate'). */
  field: string;
  /** Valor normalizado (hash para comparação rápida). */
  valueHash: string;
  /** Valor original legível (para debug). */
  originalValue?: string;
  /** Origem do dado. */
  source: DataLineageSource;
  /** Regras que consumiram este dado. */
  usedByRules: string[];
  /** Teses (ARG-*) geradas a partir deste dado. */
  generatedArguments: string[];
  /** Blocos (BLK-*) gerados a partir deste dado. */
  generatedBlocks: string[];
  /** Número de ocorrências no documento final. */
  documentOccurrences: number;
  /** Se o dado é obrigatório no documento. */
  requiredInDocument: boolean;
  /** Se o dado é um fato condicional (ex: específico de radar/lei seca). */
  isConditionalFact: boolean;
}

/**
 * Mapa completo de linhagem para um caso.
 */
export interface CaseDataLineage {
  caseId: string;
  entries: DataLineageEntry[];
  createdAt: string;
  updatedAt: string;
}

/**
 * FASE 8 — Quality Gate de Reconciliação Integral
 *
 * 7 verificações obrigatórias antes de entregar o documento ao frontend.
 */
export type QualityGateCheck =
  | 'COMPLETUDE'
  | 'FIDELIDADE'
  | 'CONSISTENCIA'
  | 'CAUSALIDADE'
  | 'RASTREABILIDADE'
  | 'NAO_INVENCAO'
  | 'ESTRUTURA';

export interface QualityGateResult {
  check: QualityGateCheck;
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
  message: string;
  details?: {
    field?: string;
    expected?: string;
    actual?: string;
    ruleId?: string;
    argumentId?: string;
    blockId?: string;
    lineageEntry?: DataLineageEntry;
  };
}

export interface QualityGateReport {
  caseId: string;
  overallPass: boolean;
  checks: QualityGateResult[];
  /** Score agregado 0-100. */
  score: number;
  /** Se o documento está bloqueado para entrega. */
  blocked: boolean;
  generatedAt: string;
}

/**
 * Entrada para o Quality Gate: tudo o que ele precisa comparar.
 */
export interface QualityGateInput {
  /** Payload completo do onboarding (inclui specificFacts, evidence, etc). */
  onboardingPayload: CanonicalOnboardingPayload;
  /** Caso canônico montado pelo mapper. */
  canonicalCase: any; // CaseDomain
  /** Análise determinística com evaluatedRules, detectedFlaws, selectedArguments. */
  analysis: any; // CaseAnalysis
  /** Documento final montado (canonicalDraft ou refinedDraft). */
  finalDocument: string;
  /** Linhagem de dados computada. */
  lineage: CaseDataLineage;
  /** Catálogo de argumentos para validação de teses. */
  argumentsCatalog: any[]; // ARGUMENTS_CATALOG
  /** Catálogo de blocos para validação de estrutura. */
  blocksCatalog: any[]; // DOCUMENT_BLOCKS
}

/**
 * CONTRATO CANÔNICO DE ENTRADA DO ONBOARDING
 *
 * O contrato é composto por 6 blocos semânticos:
 *  1. identification → dados de identificação do caso (AIT, fase, etc.)
 *  2. infraction     → dados da infração
 *  3. vehicle        → dados do veículo
 *  4. applicant      → dados do requerente
 *  5. specificFacts  → fatos juridicamente relevantes específicos da categoria
 *  6. evidence       → evidências auxiliares (OCR, fotos, declarações)
 *
 * Os campos legacy `vehicle`, `infraction`, `applicant`, etc. são mantidos
 * por compatibilidade, mas o pipeline canônico consome as chaves
 * `identification / infraction / vehicle / applicant / specificFacts / evidence`.
 */
export interface CanonicalOnboardingPayload {
  procedureType: ProcedureType;
  situation?: string;
  processStage?: string;
  leadName?: string;
  leadPhone?: string;
  leadEmail?: string;

  /** Dados de identificação do caso / fase processual. */
  identification?: {
    aitNumber?: string;
    infractionCode?: string;
    autuadorBody?: string;
    category?: string;
    processStage?: string;
    notificationExpeditionDate?: string;
    notificationDeliveryDate?: string;
    defenseDeadline?: string;
  };

  vehicle: {
    plate: string;
    brandModel: string;
    renavam?: string;
    chassis?: string;
    year?: string;
    color?: string;
  };

  infraction: {
    aitNumber: string;
    infractionCode: string;
    description?: string;
    ctbArticle?: string;
    severity?: InfractionSeverity;
    points?: number;
    fineAmount?: number;
    autuadorBody: string;
    dateTime?: string;
    location?: string;
    municipality?: string;
    uf?: string;
    speedLimit?: number;
    measuredSpeed?: number;
    consideredSpeed?: number;
    speedMeasured?: number;
    speedConsidered?: number;
    radarEquipmentId?: string;
    inmetroAferitionDate?: string;
    notificationExpeditionDate?: string;
    notificationDeliveryDate?: string;
    defenseDeadline?: string;

    // Fatos e Evidências Específicas
    hasPreviousInfractionsLast12Months?: boolean;
    hasPsychomotorTerm?: boolean;
    hasAgentDetailedObservations?: boolean;
    hasPhotoProof?: boolean;
    hasR19SignageProof?: boolean;
    hasRegulatorySign?: boolean;
    daysElapsed?: number;
    customFacts?: string;

    // Semáforo
    yellowPhaseCrossing?: boolean;
    emergencyPassage?: boolean;

    // Celular
    cellphoneCircumstance?: string;

    // Lei Seca
    refusedTest?: boolean;
    offeredRetest?: boolean;

    // Indicação de condutor
    realDriverName?: string;
    realDriverCpf?: string;
    realDriverCnh?: string;
    indicationWithinDeadline?: boolean;
  };

  /**
   * Fatos específicos exigidos pelo RuleEngine, indexados pela regra que os
   * consome (FAIL CLOSED). Nunca inventados — ausentes => DATA_GAP.
   */
  specificFacts?: {
    /** Radar / velocidade */
    speedLimit?: number;
    measuredSpeed?: number;
    consideredSpeed?: number;
    radarEquipmentId?: string;
    inmetroAferitionDate?: string;
    hasRegulatorySign?: boolean;
    hasR19SignageProof?: boolean;
    /** Lei Seca */
    refusedTest?: boolean;
    hasPsychomotorTerm?: boolean;
    offeredRetest?: boolean;
    /** Celular */
    cellphoneCircumstance?: string;
    hasAgentDetailedObservations?: boolean;
    /** Semáforo */
    yellowPhaseCrossing?: boolean;
    emergencyPassage?: boolean;
    hasPhotoProof?: boolean;
    /** Advertência */
    isFirstInfractionLast12Months?: boolean;
    /** Indicação de condutor */
    realDriverName?: string;
    realDriverCpf?: string;
    realDriverCnh?: string;
    indicationWithinDeadline?: boolean;
  };

  /**
   * Evidências auxiliares carregadas pelo cidadão (OCR, fotos, declarações).
   * A IA nunca decide com base em evidências — apenas o operador humano
   * confirma ou descarta.
   */
  evidence?: {
    ocrExtractedText?: string;
    ocrConfidence?: number;
    photoProofUrls?: string[];
    declarationFiles?: string[];
    notes?: string;
  };

  applicant?: {
    name: string;
    cpf: string;
    rg?: string;
    cnh: string;
    category?: string;
    phone?: string;
    email?: string;
    addressStreet?: string;
    addressNumber?: string;
    addressComplement?: string;
    addressNeighborhood?: string;
    addressZipCode?: string;
    addressCityState?: string;
  };

  nominatedDriver?: {
    name: string;
    cpf: string;
    rg?: string;
    cnh: string;
    category?: string;
    uf?: string;
    address?: string;
    city?: string;
  };

  company?: {
    name: string;
    cnpj: string;
    address: string;
    city: string;
    uf: string;
    representativeName: string;
    representativeCpf: string;
  };

  processNumbers?: {
    psddNumber?: string;
    pcddNumber?: string;
    suspensionMonths?: number;
  };
}

/**
 * ETAPA 2 — DADOS COMPLEMENTARES DE QUALIFICAÇÃO (Preenchidos apenas para gerar a defesa)
 */
export interface CaseApplicantData {
  applicantName: string;
  applicantCpf: string;
  applicantRg?: string;
  applicantCnh: string;
  cnhCategory?: string;
  applicantPhone: string;
  applicantEmail: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement?: string;
  addressNeighborhood: string;
  addressZipCode: string;
  addressCityState: string;
  vehicleRenavam?: string;
  factsNarrative?: string;
}

/**
 * ETAPA 2 — DOCUMENTO DE DEFESA GERADO
 */
export interface DefenseDraft {
  id: string;
  caseId: string;
  procedureType: ProcedureType;
  authorityAddressing: string;
  applicantName: string;
  applicantCpf: string;
  applicantRg?: string;
  applicantCnh: string;
  applicantAddress: string;
  applicantCityState: string;
  vehiclePlate: string;
  vehicleModel: string;
  vehicleRenavam: string;
  aitNumber: string;
  factsNarrative: string;
  selectedArgumentIds: string[];
  preliminaryArgumentsText: string;
  meritArgumentsText: string;
  legalRequestsText: string;
  closingPlaceDate: string;
  fullDraftText: string;
  isReady: boolean;
  version: number;
  updatedAt: string;
  /**
   * Quantidade de gerações de defesa já realizadas para este caso.
   * O backend controla o limite efetivo (máximo 3). O frontend apenas reflete
   * esse estado para desabilitar o botão quando o limite é atingido.
   */
  generationCount?: number;

  /**
   * Minuta canônica determinística (pré-IA). Sempre presente e íntegra.
   */
  canonicalDraft?: string;
  /**
   * Minuta após refinamento de IA (somente se IA rodou e passou na validação).
   */
  refinedDraft?: string | null;
  /**
   * Texto final entregue (canonicalDraft ou refinedDraft conforme validação).
   */
  finalDraft?: string;
  /**
   * IA foi efetivamente utilizada para gerar `finalDraft`?
   */
  usedAI?: boolean;
  /**
   * Status do refinamento: 'not_attempted' | 'applied' | 'rejected' | 'unavailable'.
   */
  refinementStatus?: 'not_attempted' | 'applied' | 'rejected' | 'unavailable';
  /**
   * Status da validação estrutural: 'pending' | 'valid' | 'invalid' | 'blocked'.
   * 'blocked' = Quality Gate (Fase 8) impediu entrega por inconsistência detectada.
   */
  validationStatus?: 'pending' | 'valid' | 'invalid' | 'blocked';
  /**
   * Score de integridade estrutural do documento (0-100).
   */
  integrityScore?: number;
  /**
   * Lista de issues de integridade detectadas pelo validador.
   */
  integrityIssues?: {
    code: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
  }[];
  /**
   * Versão do motor/assembly que produziu a minuta (rastreabilidade).
   */
  engineVersion?: string;
   /**
    * Relatório do Quality Gate (Fase 8).
    * Preenchido apenas quando onboardingPayload e canonicalCase estão disponíveis.
    */
   qualityGateReport?: QualityGateReport;
}

/**
 * Informações e orientações de protocolo (auxiliares ao cidadão; a plataforma NÃO protocola nem monitora)
 */
export interface SubmissionInstructions {
  competentBody: string;
  recommendedMethod?: 'portal_online' | 'correios' | 'presencial';
  portalUrl?: string;
  physicalAddress?: string;
  instructionsText?: string;
  deadlineDate?: string;
  trackingCode?: string;
  submissionDate?: string;
  receiptFileUrl?: string;
  notes?: string;
}

/**
 * Registro de Eventos Internos da Plataforma
 */
export interface CaseInternalEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'system' | 'ocr' | 'analysis' | 'payment' | 'defense' | 'document' | 'download';
}

/**
 * MODELO CANÔNICO DO CASO (DEFESAI)
 */
export interface CaseDomain {
  id: string;
  title: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientCpf?: string;
  
  // Status operacional interno
  status: CaseStatus;
  currentStage: JourneyStage;
  serviceType: ProcedureType;
  
  // Etapa 1: Dados fornecidos para análise preliminar
  vehicle: VehicleData;
  infraction: InfractionData;
  analysis?: CaseAnalysis;
  
  // OCR auxiliar interno (se fornecido documento)
  ocrAuxiliaryData?: {
    uploadedFileName?: string;
    extractedText?: string;
    confidenceScore?: number;
    processedAt?: string;
  };

  // Etapa 2: Dados complementares, pagamento e documento
  applicant?: CaseApplicantData;
  payment?: {
    status: PaymentStatus;
    amount: number;
    paidAt?: string;
    transactionId?: string;
    paymentMethod?: 'pix' | 'credit_card';
  };
  documentGenerationStatus?: DocumentGenerationStatus;
  defenseDraft?: DefenseDraft;
  
  // Comercial: oferta resolvida no checkout (rastreabilidade)
  commercialOfferId?: string;

  // Instruções de protocolo para o cidadão (e compatibilidade legada)
  submissionInstructions?: SubmissionInstructions;
  protocolInfo?: SubmissionInstructions;
  
  // Histórico de ações na plataforma
  timeline: CaseInternalEvent[];
  
  // Compatibility / Portuguese aliases
  userId?: string;
  userEmail?: string;
  userNome?: string;
  stageAtual?: number;
  tipoServico?: string;
  statusPagamento?: string;
  valorPago?: number;
  dadosInfracao?: any;
  protocoloOrgao?: any;
  dataProtocolo?: string;
  criadoEm?: string;
  atualizadoEm?: string;
  historicoTimeline?: any[];
  ocrConfidence?: number;
  analiseIA?: any;

  isPaid: boolean;
  paidAt?: string;
  isAnonymous: boolean;
  claimToken?: string;
  createdAt: string;
  updatedAt: string;
}

// Database Row representation (Snake Case) for Canonical Mapper
export interface CaseRow {
  id: string;
  title: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  client_cpf?: string;
  user_id?: string;
  status: string;
  current_stage: number;
  service_type: string;
  vehicle_plate: string;
  vehicle_brand_model: string;
  vehicle_renavam?: string;
  vehicle_chassis?: string;
  vehicle_year?: string;
  vehicle_color?: string;
  ait_number: string;
  infraction_code: string;
  infraction_description: string;
  ctb_article: string;
  severity: string;
  points: number;
  fine_amount: number;
  autuador_body: string;
  date_time: string;
  location: string;
  speed_limit?: number;
  measured_speed?: number;
  considered_speed?: number;
  radar_equipment_id?: string;
  inmetro_aferition_date?: string;
  notification_expedition_date?: string;
  defense_deadline?: string;
  formal_flaws_json?: string;
  /**
   * Análise jurídica determinística. Pode conter o formato legado
   * (detectedInconsistencies + recommendedArguments) ou o formato
   * expandido com engineVersion, evaluatedRules, detectedFlaws,
   * selectedArguments, integrityScore, timestamps.
   */
  analysis_json?: string;
  /**
   * Minuta jurídica. Pode ser o formato legado (fullDraftText + selectedArgumentIds)
   * ou o formato expandido com canonicalDraft, refinedDraft, usedAI,
   * refinementStatus, validationStatus, integrityScore, integrityIssues.
   */
  defense_draft_json?: string;
  protocol_info_json?: string;
  applicant_json?: string;
  ocr_auxiliary_json?: string;
  commercial_offer_id?: string;
  timeline_json?: string;
  is_anonymous: boolean;
  claim_token?: string;
  is_paid: boolean;
  paid_at?: string;
  created_at: string;
  updated_at: string;
  // Novos campos específicos de infração
  has_previous_infractions_last_12_months?: boolean;
  has_psychomotor_term?: boolean;
  has_agent_detailed_observations?: boolean;
  has_photo_proof?: boolean;
  has_r19_signage_proof?: boolean;
  has_regulatory_sign?: boolean;
  refused_test?: boolean;
  offered_retest?: boolean;
  cellphone_circumstance?: string;
  yellow_phase_crossing?: boolean;
  emergency_passage?: boolean;
  real_driver_name?: string;
  real_driver_cpf?: string;
  real_driver_cnh?: string;
  indication_within_deadline?: boolean;
}

// Marketing OS 7 Autonomous Agents Types
export type MarketingAgentRole =
  | 'estrategico'
  | 'planejamento'
  | 'criador'
  | 'qualidade'
  | 'publicacao'
  | 'inteligencia'
  | 'aprendizado';

export interface MarketingAgentState {
  id: MarketingAgentRole;
  name: string;
  handle: string;
  description: string;
  status: 'idle' | 'running' | 'waiting' | 'success' | 'alert';
  lastActivity: string;
  cycleIntervalMinutes: number;
  tasksCompleted: number;
  currentTask?: string;
  confidenceScore: number;
  metrics: {
    label: string;
    value: string | number;
    trend: 'up' | 'down' | 'neutral';
  }[];
}

export interface EditorialContentItem {
  id: string;
  title: string;
  channel: 'instagram' | 'blog' | 'tiktok' | 'linkedin' | 'email' | 'facebook' | string;
  format: 'carrossel' | 'artigo_seo' | 'reels_roteiro' | 'infografico' | 'newsletter' | 'post_imagem' | 'story' | string;
  legalTheme?: string;
  infractionTargetCode?: string;
  status: 'rascunho' | 'aprovado_qualidade' | 'reprovado_qualidade' | 'agendado' | 'publicado';
  scheduledDate: string;
  estimatedReach: number;
  copyText: string;
  hashtags: string[];
  visualPrompt: string;
  authorAgent: string;
  qualityReviewScore: number;
  imageUrl?: string | null;
  mediaUrl?: string | null;
  visual_prompt?: string | null;
}

export interface BrandIdentityConfig {
  brandName: string;
  tagline: string;
  positioning: string;
  toneOfVoice: string;
  primaryColors: string[];
  targetAudience: string;
  disallowedWords: string[];
  mandatoryLegalDisclaimers: string;
}

export type CaseRecord = CaseDomain;

export interface DefenseBlock {
  id: string;
  type?: string;
  category?: string;
  categoria?: string;
  title?: string;
  titulo?: string;
  content?: string;
  conteudo?: string;
  isMandatory?: boolean;
  ativo?: boolean;
  editavel?: boolean;
  contentTemplate?: string;
  supportedVariables?: string[];
  recommendedProcedures?: string[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor?: string;
  role?: 'citizen' | 'legal_ai' | 'law_enforcement' | 'system_orchestrator' | 'admin' | string;
  action?: string;
  targetResource?: string;
  ipHash?: string;
  details?: string;
  gdprCompliant?: boolean;
  // Portuguese/Internal compatibility aliases
  acao?: string;
  entidade?: string;
  entidadeId?: string;
  usuario?: string;
  recurso?: string;
  status?: string;
  dados?: any;
  dadosModificados?: any;
  hashIntegridade?: string;
}

// Onboarding Clear Separation: Phase 1 (Analysis Data) & Phase 2 (Document Data)
export interface CaseAnalysisData {
  serviceType: ProcedureType;
  infractionType: 'radar' | 'lei_seca' | 'celular' | 'vermelho' | 'estacionamento' | 'cnh_suspensao' | 'outro';
  defenseStage: 'recurso_jari' | 'recurso_cetran' | 'conversao_advertencia';
  infraction: InfractionData;
  vehicle: VehicleData;
  uploadedFileName?: string;
  ocrAuxiliaryText?: string;
  ocrConfidence?: number;
  isConfirmedByUser: boolean;
}

export interface CaseDocumentData {
  applicantName: string;
  applicantCpf: string;
  applicantRg?: string;
  applicantCnh: string;
  cnhCategory?: string;
  applicantPhone: string;
  applicantEmail: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement?: string;
  addressNeighborhood: string;
  addressZipCode: string;
  addressCityState: string;
  vehicleRenavam?: string;
  factsNarrative?: string;
  /** Preço efetivo resolvido pelo catálogo comercial (em reais). */
  price?: number;
}

// ==========================================
// Meta Integration Types (Facebook & Instagram)
// ==========================================
export interface MetaAccountState {
  isConnected: boolean;
  user?: {
    id: string;
    name: string;
    email?: string;
  };
  pages: {
    id: string;
    name: string;
    category?: string;
    access_token: string;
    instagram_business_account?: {
      id: string;
      username: string;
      name?: string;
    };
  }[];
  selectedPageId?: string;
  selectedInstagramId?: string;
  connectedAt?: string;
}

export interface MetaPublishRequest {
  destination: 'facebook' | 'instagram' | 'both';
  pageId?: string;
  instagramAccountId?: string;
  message: string;
  mediaUrl?: string;
  linkUrl?: string;
}

export interface MetaPublishResult {
  success: boolean;
  facebookPostId?: string;
  instagramMediaId?: string;
  publishedAt: string;
  destination: 'facebook' | 'instagram' | 'both';
  error?: string;
}

// ==========================================
// PagBank Integration Types (Orders & Webhook)
// ==========================================
export interface PagBankOrderResponse {
  orderId: string;
  referenceId: string;
  caseId: string;
  status: 'PENDING' | 'PAID' | 'CANCELED' | 'DECLINED';
  amount: number;
  qrCodeUrl?: string;
  qrCodeText?: string;
  qrCodeDataUrl?: string;
  expiresAt: string;
  createdAt: string;
}

export interface PagBankPaymentConfirmation {
  success: boolean;
  order: PagBankOrderResponse;
  alreadyPaid: boolean;
}

// Commercial Module Domain Types
export * from './commercial';

