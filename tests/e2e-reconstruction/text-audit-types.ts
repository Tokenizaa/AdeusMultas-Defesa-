/**
 * Tipos para Auditoria Textual do Onboarding — E2E
 * Captura evidência estruturada: entrada → API → UI renderizada → documento persistido
 */

import type { Page } from '@playwright/test';
import type { CanonicalService, CaseAnalysis } from './support';

// ==========================================
// 1. Dados de Entrada Sintética Conhecida
// ==========================================
export interface SyntheticInputData {
  // Identificação (etapa 1)
  leadName: string;
  leadPhone: string;
  aitNumber: string;
  vehiclePlate: string;
  autuadorBody: string;
  location: string;
  infractionCode: string;
  infractionDescription: string;
  ctbArticle: string;
  severity: string;
  points: number;
  fineAmount: number;
  
  // Perguntas específicas (etapa 2) — por categoria
  specificAnswers: Record<string, string | number | boolean | undefined>;
  
  // Metadados
  service: CanonicalService;
  runId: string;
  timestamp: string;
}

// ==========================================
// 2. Resposta da API (bruta)
// ==========================================
export interface ApiAnalysisResponse {
  caseId: string;
  claimToken: string;
  analysis: CaseAnalysis;
  serviceType: string;
  status: number;
}

// ==========================================
// 3. Textos Renderizados no DOM (por etapa)
// ==========================================

// Etapa 1 — Identificação
export interface IdentificationRenderedText {
  labels: string[];
  values: Record<string, string>;
  buttonText: string;
  buttonEnabled: boolean;
  helperTexts: string[];
}

// Etapa 2 — Perguntas Específicas
export interface SpecificQuestionsRenderedText {
  categoryBanner: string;
  questions: string[];
  answers: Record<string, string>;
  buttonText: string;
  helperTexts: string[];
}

// Etapa 3 — Processamento
export interface ProcessingRenderedText {
  headerTitle: string;
  headerDescription: string;
  stages: Array<{ label: string; status: 'done' | 'current' | 'pending' }>;
  progressPercentage: number;
  progressDescription: string;
}

// Etapa 4 — Resultado (FreeAnalysisResultStep)
export interface AnalysisResultRenderedText {
  header: {
    badge: string;
    title: string;
    aitNumber: string;
    plate: string;
    phone?: string;
  };
  strengthIndicator: {
    label: string;
    rate: number | null;
    message: string;
    isUnavailable: boolean;
  };
  summaryCards: Array<{
    title: string;
    legalBase: string;
    whatWeChecked: string;
    lawExplanation: string;
    evidenceResult: string;
    userImpact: string;
    confidenceLevel: string;
    confidenceReason: string;
  }>;
  dataCompleteness?: {
    filledFields: number;
    totalFields: number;
    ratio: number;
    missingCriticalFields: string[];
  };
  nextSteps: string[];
  ctaButtons: {
    saveToDashboard: string;
    proceedToDocument: string;
  };
}

// Etapa 5 — Qualificação (RequiredDataStep)
export interface QualificationRenderedText {
  bannerText: string;
  preservedData: {
    plate: string;
    ait: string;
    orgao: string;
  };
  formLabels: string[];
  formValues: Record<string, string>;
  buttonText: string;
  buttonEnabled: boolean;
}

// Etapa 6 — Revisão (DocumentReviewStep)
export interface ReviewRenderedText {
  header: string;
  sections: {
    enquadramento: Record<string, string>;
    tesesInclusas: string[];
    evidenciasNecessarias: Array<{
      requisito: string;
      status: 'PRESENTE' | 'AUSENTE' | 'PENDENTE';
      argIds: string[];
    }>;
    qualificacao: Record<string, string>;
  };
  guaranteeBadge: string;
  buttons: {
    editQualification: string;
    proceedToPayment: string;
  };
}

// Etapa 7 — Checkout (DocumentCheckoutStep)
export interface CheckoutRenderedText {
  header: string;
  orderSummary: {
    items: Array<{ label: string; value: string }>;
    priceBreakdown: Array<{ label: string; value: string }>;
    finalPrice: string;
    guaranteeText: string;
  };
  paymentMethodTabs: string[];
  pixSection?: {
    qrCodeAlt: string;
    copyPasteLabel: string;
    copyPasteValue: string;
    confirmButtonText: string;
    payError?: string;
  };
  creditCardSection?: {
    formLabels: string[];
    confirmButtonText: string;
    error?: string;
  };
  backButton: string;
}

// Texto renderizado completo
export interface FullRenderedText {
  identification: IdentificationRenderedText;
  specificQuestions: SpecificQuestionsRenderedText;
  processing: ProcessingRenderedText;
  analysisResult: AnalysisResultRenderedText;
  qualification?: QualificationRenderedText;
  review?: ReviewRenderedText;
  checkout?: CheckoutRenderedText;
}

// ==========================================
// 4. Documento Persistido (se gerado)
// ==========================================
export interface PersistedDocumentEvidence {
  defenseDraft: {
    id: string;
    caseId: string;
    fullDraftText: string;
    selectedArgumentIds: string[];
    canonicalDraft: string;
    refinedDraft: string | null;
    finalDraft: string;
    usedAI: boolean;
    refinementStatus: string;
    validationStatus: string;
    integrityScore?: number;
    qualityGateReport?: {
      overallPass: boolean;
      score: number;
      checks: Array<{ check: string; passed: boolean; message: string }>;
    };
  };
  caseData: {
    id: string;
    status: string;
    isPaid: boolean;
    serviceType: string;
  };
}

// ==========================================
// 5. Resultados de Validação
// ==========================================
export type ValidationSeverity = 'error' | 'warning' | 'info';
export type TestStatus = 'passed' | 'failed' | 'blocked' | 'skipped';

export interface ValidationResult {
  path: string;                    // ex: "analysis.recommendedArguments[0].title"
  expected: string;
  actual: string;
  match: boolean;
  severity: ValidationSeverity;
  context?: string;                // contexto adicional para debug
}

export interface ForbiddenPatternMatch {
  pattern: string;
  foundIn: string;
  context: string;                 // trecho ao redor (100 chars)
  allowedInContext?: boolean;      // se o padrão é permitido neste contexto
}

export interface ComparisonResult {
  inputVsApi: ValidationResult[];
  apiVsRendered: ValidationResult[];
  renderedVsPersisted: ValidationResult[];
  forbiddenPatterns: ForbiddenPatternMatch[];
  summary: {
    totalChecks: number;
    passed: number;
    warnings: number;
    errors: number;
    blocked: number;
  };
}

// ==========================================
// 6. Evidência Completa por Cenário
// ==========================================
export interface TextAuditEvidence {
  // Metadados da execução
  metadata: {
    scenarioId: string;
    service: CanonicalService;
    runId: string;
    timestamp: string;
    durationMs: number;
    status: TestStatus;
  };
  
  // 1. Entrada conhecida
  input: SyntheticInputData;
  
  // 2. Resposta da API
  apiResponse: ApiAnalysisResponse;
  
  // 3. Textos renderizados
  renderedText: FullRenderedText;
  
  // 4. Documento persistido (opcional)
  persistedDocument?: PersistedDocumentEvidence;
  
  // 5. Comparação e validação
  comparison: ComparisonResult;
  
  // 6. Erros/bloqueios (se houver)
  errors?: Array<{ step: string; message: string; stack?: string }>;
}

// ==========================================
// 7. Padrões Proibidos com Contexto
// ==========================================
export interface ForbiddenPatternRule {
  pattern: RegExp;
  description: string;
  severity: ValidationSeverity;
  // Contextos onde o padrão É PERMITIDO (não é violação)
  allowedContexts?: Array<{
    description: string;
    check: (context: string) => boolean;
  }>;
}

// Padrões base (serão refinados conforme auditoria)
export const FORBIDDEN_PATTERNS: ForbiddenPatternRule[] = [
  {
    pattern: /probabilidade de êxito/gi,
    description: 'Promessa de resultado — não pode afirmar probabilidade de êxito como garantia',
    severity: 'error',
    allowedContexts: [
      {
        description: 'Disclaimer explícito "Não é previsão de resultado"',
        check: (ctx) => /não é previsão de resultado|não garante resultado|indicador técnico/i.test(ctx),
      },
      {
        description: 'Explicação histórica do que o indicador representa',
        check: (ctx) => /indicador técnico|força da sua defesa|baseado nos dados/i.test(ctx),
      },
      {
        description: 'Label do strength indicator (ex: "Probabilidade de Êxito" como título do indicador)',
        check: (ctx) => /probabilidade de êxito|força da sua defesa|indicador indisponível/i.test(ctx),
      },
    ],
  },
  {
    pattern: /cancelamento garantido|multa será cancelada|multa pode ser cancelada com certeza/gi,
    description: 'Afirmação categórica de cancelamento — deve condicionar à análise do órgão',
    severity: 'error',
    allowedContexts: [
      {
        description: 'Explicação do impacto jurídico da tese (não promessa)',
        check: (ctx) => /impacto.*tese|argumento.*pode levar|hipótese de anulação/i.test(ctx),
      },
    ],
  },
  {
    pattern: /consultamos jurisprudência em tempo real|verificamos documentos|inteligência artificial analisou/gi,
    description: 'Alegação de operação que não ocorreu no motor determinístico',
    severity: 'error',
    allowedContexts: [],
  },
  {
    pattern: /100% preservado|x% de êxito/gi,
    description: 'Claims removidas na Onda 4 — não sustentáveis',
    severity: 'error',
    allowedContexts: [],
  },
  {
    pattern: /100% de direito|100% direito|100% de êxito|100% êxito/gi,
    description: 'Reclamação categórica de direito ou êxito garantido — não é isenção automática nem resultado garantido',
    severity: 'error',
    allowedContexts: [
      {
        description: 'Disclaimer explícito "não é garantido" ou "depende do órgão"',
        check: (ctx) => /não é garantido|não é automático|depende do órgão|se confirmado/i.test(ctx),
      },
    ],
  },
  {
    pattern: /\[object Object\]|undefined|null(?!\s*(?:como|valor|dado))/gi,
    description: 'Valores técnicos vazados na UI',
    severity: 'error',
    allowedContexts: [
      {
        description: 'Campo explicitamente "não informado"',
        check: (ctx) => /não informado|—/i.test(ctx),
      },
    ],
  },
];

// ==========================================
// 8. Helpers de Sanitização
// ==========================================
export function sanitizeForEvidence(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    // Sanitiza CPF, telefone, tokens, AIT
    return obj
      .replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, '***.***.***-**')
      .replace(/\(\d{2}\)\s*\d{4,5}-\d{4}/g, '(**) ****-****')
      .replace(/[a-f0-9]{64}/gi, '***TOKEN***')
      .replace(/AIT-[A-Z0-9]+/gi, 'AIT-***')
      .replace(/case_[a-z0-9_]+/gi, 'case_***');
  }
  if (Array.isArray(obj)) return obj.map(sanitizeForEvidence);
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Não sanitiza chaves, apenas valores
      result[key] = sanitizeForEvidence(value);
    }
    return result;
  }
  return obj;
}

// ==========================================
// 9. Configuração de Evidência
// ==========================================
export interface TextAuditConfig {
  saveJson: boolean;
  saveHtml: boolean;
  outputDir: string;
  sanitize: boolean;
  failOnError: boolean;
  failOnWarning: boolean;
}

export const DEFAULT_TEXT_AUDIT_CONFIG: TextAuditConfig = {
  saveJson: true,
  saveHtml: true,
  outputDir: 'artifacts/text-audit',
  sanitize: true,
  failOnError: true,
  failOnWarning: false,
};