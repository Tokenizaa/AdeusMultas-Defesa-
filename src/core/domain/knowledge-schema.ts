/**
 * @file knowledge-schema.ts
 * DefesaAI — Domain Model & Knowledge Architecture (Fase 1 e Fase 2)
 * Pure TypeScript Domain Definitions for the Knowledge Base, Services,
 * Procedures, Arguments, Rules, Templates and Legal Entities.
 */

import { ProcedureType, InfractionSeverity } from '../../types';

// ==========================================
// 1. KNOWLEDGE TAXONOMY & CATEGORIES
// ==========================================

export type KnowledgeCategoryType =
  | 'direito_material'
  | 'direito_formal'
  | 'direito_constitucional'
  | 'metrologia_engenharia'
  | 'sinalizacao_viaria'
  | 'prazos_decadencia';

export interface KnowledgeCategory {
  id: KnowledgeCategoryType;
  name: string;
  description: string;
  version: string;
  subcategories: string[];
}

export const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  {
    id: 'direito_material',
    name: 'Direito Material de Trânsito',
    description: 'Tipificação da infração, excludentes de ilicitude, estado de necessidade, atipicidade e responsabilidade.',
    version: 'v2026.1 (Leis 14.071/20, 14.229/21, 14.599/23)',
    subcategories: ['Excesso de Velocidade', 'Alcoolemia e Substâncias', 'Uso de Celular', 'Estacionamento/Parada', 'Manobras e Preferência'],
  },
  {
    id: 'direito_formal',
    name: 'Direito Formal & Processo Administrativo',
    description: 'Requisitos essenciais do AIT (Art. 280 CTB), competência de fiscalização, preenchimento obrigatório e vícios insanáveis.',
    version: 'v2026.1 (Res. CONTRAN 985/2022 - MBFT)',
    subcategories: ['Requisitos do AIT', 'Inconsistência de Dados', 'Falta de Observações Circunstanciadas', 'Competência de Autuação'],
  },
  {
    id: 'direito_constitucional',
    name: 'Garantias Constitucionais & Devido Processo',
    description: 'Ampla defesa, contraditório, direito de não autoincriminação (nemo tenetur se detegere) e motivação dos atos administrativos.',
    version: 'v2026.1 (CF/88 Art. 5º, LIV e LV)',
    subcategories: ['Ampla Defesa e Contraditório', 'Presunção de Inocência', 'Não Autoincriminação', 'Motivação Obrigatória'],
  },
  {
    id: 'metrologia_engenharia',
    name: 'Metrologia Legal & Instrumentos de Medição',
    description: 'Calibração e verificação periódica anual de radares e etilômetros pelo INMETRO, margens de tolerância e estudos técnicos.',
    version: 'v2026.1 (Res. CONTRAN 798/2020 e Portarias INMETRO)',
    subcategories: ['Radares Fixos e Portáteis', 'Etilômetros', 'Tolerância Metrológica', 'Estudos de Engenharia'],
  },
  {
    id: 'sinalizacao_viaria',
    name: 'Engenharia de Tráfego & Sinalização',
    description: 'Obrigatoriedade e legibilidade de placas regulamentadoras (R-19, R-1), semáforos, tempo de amarelo e sinalização horizontal.',
    version: 'v2026.1 (Res. CONTRAN 973/2022)',
    subcategories: ['Placas de Velocidade R-19', 'Sinalização Semafórica', 'Pintura Horizontal', 'Visibilidade da Sinalização'],
  },
  {
    id: 'prazos_decadencia',
    name: 'Prazos, Decadência & Prescrição',
    description: 'Decadência de 30 dias para notificação da autuação, prazos recursais mínimos, prescrição da pretensão punitiva e intercorrente.',
    version: 'v2026.1 (CTB Art. 281, II e Lei 9.873/99)',
    subcategories: ['Decadência de 30 Dias (NA)', 'Prazos Recursais', 'Prescrição Quinquenal (5 anos)', 'Prescrição Intercorrente (3 anos)'],
  },
];

// ==========================================
// 2. DOMAIN ENTITIES & TAXONOMY
// ==========================================

export interface CtbArticleModel {
  article: string;
  title: string;
  caput: string;
  paragraphsAndIncidents?: string[];
  practicalApplication: string;
  nullityConsequence: string;
  relatedResolutions: string[];
}

export interface ResolutionModel {
  number: string;
  body: 'CONTRAN' | 'SENATRAN' | 'INMETRO';
  year: number;
  subject: string;
  keyArticles: string;
  impactOnDefenses: string;
}

export interface JurisprudenceModel {
  id: string;
  court: 'STJ' | 'STF' | 'TRF' | 'TJSP' | 'TJRJ' | 'TJMG';
  citation: string;
  summary: string;
  precedentText: string;
  applicability: string;
}

export interface OrganModel {
  id: string;
  code: string;
  name: string;
  abbreviation: string;
  sphere: 'federal' | 'estadual' | 'municipal' | 'distrital';
  state?: string;
  onlinePortalUrl: string;
  physicalAddress: string;
  email: string;
  standardDeadlineDays: number;
  jariStructure: string;
}

export interface GlossaryTermModel {
  term: string;
  acronym?: string;
  definition: string;
  legalReference: string;
}

// ==========================================
// 3. ARGUMENT MODEL (FASE 5)
// ==========================================

export interface ArgumentModel {
  id: string; // ex: ARG-001
  code: string; // ex: INMETRO_CALIBRATION_EXPIRED
  title: string;
  description: string;
  category: 'preliminar' | 'merito' | 'formal' | 'constitucional';
  impactType: 'anulacao_total' | 'conversao_advertencia' | 'reclassificacao' | 'efeito_suspensivo';
  confidenceScore: number; // 0-100
  whenToUse: string[];
  whenNotToUse: string[];
  requirements: string[];
  legalBase: string;
  resolutions: string[];
  relatedJurisprudence: string[];
  requiredDocuments: string[];
  observations: string;
  validFrom?: string; // ISO date 'YYYY-MM-DD'
  validUntil?: string | null; // ISO date 'YYYY-MM-DD' ou null para vigente
  formattedParagraphs: {
    heading: string;
    text: string;
  }[];
}

// ==========================================
// 4. PROCEDURE & SERVICE MODEL (FASE 4)
// ==========================================

export interface ProcedureStage {
  stepNumber: number;
  name: string;
  description: string;
  deadlineDays: number;
  actingParty:
    | 'Cidadão/Condutor'
    | 'Autoridade de Trânsito'
    | 'JARI'
    | 'CETRAN'
    | 'DETRAN'
    | 'Perito/Especialista'
    | 'Órgão Autuador';
}

export interface ProcedureModel {
  id: ProcedureType;
  code: string;
  name: string;
  category: string;
  objective: string;
  legalBasis: string;
  competentBody: string;
  suspensiveEffectRule: string;
  stages: ProcedureStage[];
  requiredDocuments: {
    name: string;
    required: boolean;
    description: string;
  }[];
  applicableGrounds: string[]; // Argument IDs
  availableTemplates: string[]; // Template IDs
  executionChecklist: string[];
  notes: string;
  // Versioning and temporal validity
  validFrom?: string; // ISO date 'YYYY-MM-DD'
  validUntil?: string | null; // null = vigente
  version?: number; // version number of this item
}

// ==========================================
// 5. TEMPLATE & BLOCK MODEL (FASE 6)
// ==========================================

export type BlockType =
  | 'header_addressing'
  | 'applicant_qualification'
  | 'vehicle_qualification'
  | 'facts_narrative'
  | 'preliminary_arguments'
  | 'merit_arguments'
  | 'formal_requests'
  | 'closing_signature';

export interface TemplateBlock {
  id: string;
  type: BlockType;
  title: string;
  isMandatory: boolean;
  contentTemplate: string;
  supportedVariables: string[];
}

export interface DocumentTemplateModel {
  id: string;
  code: string;
  name: string;
  procedureType: ProcedureType;
  version: string;
  description: string;
  blocks: TemplateBlock[];
  fillingRules: string[];
}

// ==========================================
// 6. RULE MODEL (FASE 7)
// ==========================================

export interface RuleEvaluationContext {
  infractionCode: string;
  infractionDate?: string;
  notificationExpeditionDate?: string;
  notificationDeliveryDate?: string;
  defenseDeadline?: string;
  speedLimit?: number;
  measuredSpeed?: number;
  consideredSpeed?: number;
  radarEquipmentId?: string;
  radarCalibrationDate?: string;
  hasPreviousInfractionsLast12Months?: boolean;
  hasPsychomotorTerm?: boolean;
  hasAgentDetailedObservations?: boolean;
  hasPhotoProof?: boolean;
  hasR19SignageProof?: boolean;
  autuadorBody?: string;
}

export interface DetectedInconsistencyResult {
  ruleId: string;
  title: string;
  description: string;
  severity: 'alta' | 'media' | 'baixa';
  legalArgumentId: string;
  impact: string;
  statutoryBasis: string;
}

export interface RuleModel {
  id: string;
  name: string;
  description: string;
  category: KnowledgeCategoryType;
  validFrom?: string; // ISO date 'YYYY-MM-DD'
  validUntil?: string | null; // ISO date 'YYYY-MM-DD' ou null para norma vigente
  version?: number;
  jurisdiction?: 'federal' | 'estadual' | 'distrital' | 'municipal';
  evaluate: (ctx: RuleEvaluationContext) => DetectedInconsistencyResult | null;
}
