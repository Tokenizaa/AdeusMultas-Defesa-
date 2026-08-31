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
  defenseDeadline?: string; // Prazo fixado na notificação informada pelo usuário
  formalFlawsDetected?: string[];
  hasPreviousInfractionsLast12Months?: boolean;
  hasR19SignageProof?: boolean;
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
  analysis_json?: string;
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

