/**
 * @file types.ts
 * Sistema Nacional de Monitoramento Jurídico-Operacional (SNM-JO)
 * Tipos e Modelos Canônicos de Conhecimento, Monitoramento, Temporalidade e Governança.
 */

export type SourceTier =
  | 'TIER_1_GOV_PRIMARY'       // Planalto, SENATRAN, CONTRAN, PRF, DNIT, INMETRO, DETRANs
  | 'TIER_2_OFFICIAL_GAZETTE'  // Diário Oficial da União (DOU), Diários Oficiais Estaduais (DOE)
  | 'TIER_3_JUDICIAL_TRIBUNAL' // STF, STJ, CETRANs, CONTRANDIFE
  | 'TIER_4_INSTITUTIONAL'     // Órgãos reguladores, Associações oficiais
  | 'TIER_5_DISCOVERY';        // Fontes de descoberta prévia (requer validação primária)

export type RiskLevel =
  | 'P0_LEGAL_CRITICAL'    // Alteração de lei, CTB, prazo decadencial, competência, revogação (HUMAN REVIEW OBRIGATÓRIO)
  | 'P1_OPERATIONAL_HIGH'   // Portal fora do ar, URL alterada, mudança de canal de envio (HUMAN REVIEW OU ALERTA)
  | 'P2_MAINTENANCE'        // Endereço físico, telefone, pequenas mudanças operacionais
  | 'P3_INFO';              // Informação institucional sem impacto imediato

export type ChangeType =
  | 'NEW_REGULATION'
  | 'MODIFIED_TEXT'
  | 'REVOCATION'
  | 'DEADLINE_CHANGE'
  | 'COMPETENCE_CHANGE'
  | 'PORTAL_URL_CHANGE'
  | 'ADDRESS_CHANGE'
  | 'DOCUMENT_REQUIREMENT_CHANGE'
  | 'SERVICE_OUTAGE';

export type ReviewStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'ADJUSTED'
  | 'FALSE_POSITIVE'
  | 'AUTO_APPLIED_SAFE';

export interface ProtocolChannels {
  digitalPortalUrl?: string;
  mobileAppName?: string;
  postalAddress?: string;
  presencialNetworkName?: string;
  govBrAuthenticationRequired: boolean;
  acceptedFormats?: string[];
  maxFileSizeMb?: number;
}

export interface KnowledgeOrgan {
  id: string; // ex: 'DETRAN_SP', 'PRF_BRASIL'
  code: string; // Código SENATRAN ex: '126000'
  name: string;
  abbreviation: string; // 'DETRAN-SP', 'PRF'
  sphere: 'federal' | 'estadual' | 'distrital' | 'municipal';
  state: string; // 'SP', 'RJ', 'FEDERAL', etc.
  capital?: string;
  onlinePortalUrl: string;
  physicalAddress: string;
  email: string;
  standardDeadlineDays: number;
  jariStructure: string;
  protocolChannels: ProtocolChannels;
  validFrom: string; // ISO date '2020-01-01'
  validUntil?: string | null; // null = vigente
  isActive: boolean;
  version: number;
  lastVerifiedAt: string;
}

export interface KnowledgeCetran {
  id: string; // 'CETRAN_SP', 'CONTRANDIFE_DF'
  uf: string;
  name: string;
  sphere: 'estadual' | 'distrital' | 'federal_special';
  presidentOrBoard: string;
  address: string;
  portalUrl: string;
  isContrandife: boolean;
  validFrom: string;
  validUntil?: string | null;
  isActive: boolean;
}

export interface KnowledgeState {
  uf: string; // 'AC' .. 'TO'
  name: string; // 'Acre' .. 'Tocantins'
  region: 'Norte' | 'Nordeste' | 'Centro-Oeste' | 'Sudeste' | 'Sul';
  capital: string;
  detranId: string;
  cetranId: string;
  officialGovernmentPortal: string;
  serviceNetworkName: string; // ex: 'Poupatempo', 'SAC', 'Vapt Vupt', 'UAI'
  activeProceduresCount: number;
}

export interface KnowledgeSource {
  id: string;
  uf: string | 'FEDERAL';
  organId?: string;
  tier: SourceTier;
  title: string;
  url: string;
  category: 'legislation' | 'portal_recurso' | 'diario_oficial' | 'jurisprudencia' | 'metrologia';
  lastCheckedAt?: string;
  lastSuccessfulFetchAt?: string;
  httpStatus?: number;
  contentHash?: string;
  isActive: boolean;
  fetchErrorCount?: number;
  lastErrorMessage?: string;
}

export interface KnowledgeSnapshot {
  id: string;
  sourceId: string;
  url: string;
  uf: string | 'FEDERAL';
  fetchedAt: string;
  httpStatus: number;
  contentLength: number;
  contentHash: string;
  normalizedText: string;
  rawSample?: string;
}

export interface KnowledgeChange {
  id: string;
  sourceId: string;
  sourceUrl: string;
  uf: string | 'FEDERAL';
  organId?: string;
  discoveredAt: string;
  changeType: ChangeType;
  riskLevel: RiskLevel;
  title: string;
  description: string;
  previousValue: string;
  newValue: string;
  previousHash?: string;
  newHash?: string;
  diffSummary: string;
  status: ReviewStatus;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  appliedAt?: string;
  isConflicting?: boolean;
  conflictNotes?: string;
}

export interface ReviewQueueItem {
  id: string;
  changeId: string;
  uf: string | 'FEDERAL';
  organId?: string;
  organName?: string;
  sourceTitle: string;
  sourceUrl: string;
  changeType: ChangeType;
  riskLevel: RiskLevel;
  discoveredAt: string;
  summary: string;
  impact: string;
  legalBasis?: string;
  diff: {
    previous: string;
    current: string;
  };
  status: ReviewStatus;
}

export interface TemporalQueryContext {
  uf?: string;
  organCode?: string;
  autuadorBody?: string;
  infractionDate?: string;
  notificationDate?: string;
  procedureType?: string;
}

export interface EffectiveKnowledgeResult {
  organ: KnowledgeOrgan | null;
  cetran: KnowledgeCetran | null;
  state: KnowledgeState | null;
  isHistoricRule: boolean;
  effectiveDateUsed: string;
  standardDeadlineDays: number;
  protocolUrl: string | null;
  physicalAddress: string | null;
  competentBody: string | null;
}

export interface MonitoringCycleSummary {
  cycleId: string;
  startedAt: string;
  completedAt: string;
  totalSources: number;
  successfulFetches: number;
  failedFetches: number;
  snapshotsCreated: number;
  changesDetected: number;
  changesByRisk: {
    P0_LEGAL_CRITICAL: number;
    P1_OPERATIONAL_HIGH: number;
    P2_MAINTENANCE: number;
    P3_INFO: number;
  };
  sentToReviewQueue: number;
  autoAppliedSafe: number;
  conflictsDetected: number;
  reportFilePath?: string;
  alertsTriggered: number;
}
