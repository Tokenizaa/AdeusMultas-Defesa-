/**
 * @file document-audit.types.ts
 * Canonical types for the Document Audit test suite.
 * Shared between all doc-audit modules — NOT a test file itself.
 */

import type { ProcedureType, InfractionSeverity } from '../../src/types';

// ─── Test Identity ────────────────────────────────────────────────────────────

export interface AuditCaseIdentity {
  /** Deterministic audit ID, e.g. AUDIT-RECURSO_JARI-EXCESSO_VELOCIDADE-001 */
  auditId: string;
  /** Run watermark for this audit batch */
  runWatermark: string;
  /** 0-based case index within its subtype (0-4) */
  caseIndex: number;
}

// ─── Test Data ────────────────────────────────────────────────────────────────

export interface AuditApplicant {
  name: string;
  cpf: string;        //Formatted: 123.456.789-09
  cpfRaw: string;     //Raw: 12345678909
  cnh: string;
  cnhCategory: string;
  email: string;
  phone: string;
  address: string;
  cityState: string;  // e.g. "São Paulo/SP"
}

export interface AuditVehicle {
  plate: string;
  brandModel: string;
  renavam: string;
  year: string;
  color: string;
}

export interface AuditInfraction {
  aitNumber: string;
  infractionCode: string;     // e.g. 745-50
  ctbArticle: string;         // e.g. Art. 218 I
  description: string;
  autuadorBody: string;       // e.g. DETRAN-SP
  dateTime: string;           // ISO or YYYY-MM-DD
  location: string;
  severity: InfractionSeverity;
  points: number;
  fineAmount: number;
  speedLimit?: number;
  measuredSpeed?: number;
  consideredSpeed?: number;
}

export interface AuditCaseData extends AuditCaseIdentity {
  /** The canonical ProcedureType this case exercises */
  procedureType: ProcedureType;
  /** The InfractionCategory */
  category: string;
  /** Human name */
  scenarioName: string;
  applicant: AuditApplicant;
  vehicle: AuditVehicle;
  infraction: AuditInfraction;
  /** Map procedure-specific extra fields here */
  extras?: Record<string, string | number | boolean>;
}

// ─── Quality Scores ───────────────────────────────────────────────────────────

export interface DocumentQualityScore {
  identity: number;           // 0-100: nome/CPF/CNH/placa/AIT correct
  dataFidelity: number;      // 0-100: infraction data matches
  procedureFit: number;      // 0-100: correct procedure type in document
  structure: number;         // 0-100: mandatory sections present
  legalGrounding: number;     // 0-100: arguments present (not empty)
  placeholders: number;       // 0-100: no {{placeholder}} / undefined / null
  crossContamination: number;// 0-100: no data from other cases in doc
  completeness: number;       // 0-100: required fields populated
  readability: number;        // 0-100: no truncation / encoding issues
  overall: number;            // weighted average
}

export interface DocumentQualityResult {
  caseId: string;
  auditId: string;
  scores: DocumentQualityScore;
  /** True if any P0 check failed */
  passed: boolean;
  /** List of failed P0 checks */
  failures: QualityFailure[];
  /** KNOWLEDGE_GAP entries */
  knowledgeGaps: string[];
  /** SHA-256 of the generated document text */
  documentHash: string;
  /** Raw text snippet (first 500 chars) for DB */
  docSnippet: string;
}

export interface QualityFailure {
  check: string;
  severity: 'P0' | 'P1';
  detail: string;
}

// ─── Audit Run ────────────────────────────────────────────────────────────────

export interface AuditTestRun {
  runId: string;
  startedAt: string;
  completedAt?: string;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  durationMs: number;
  matrixSummary: AuditMatrixSummary[];
}

export interface AuditMatrixSummary {
  procedureType: ProcedureType;
  category: string;
  cases: number;
  passed: number;
  failed: number;
  avgScore: number;
}

// ─── Audit DB Schema (mirrors e2e_test_runs / e2e_test_results) ──────────────

export interface AuditRunRow {
  id: string;
  status: 'RUNNING' | 'PASSED' | 'FAILED' | 'PARTIAL';
  started_at: string;
  completed_at?: string;
  triggered_by: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  duration_ms: number;
  matrix_summary: AuditMatrixSummary[];
  artifacts: AuditArtifactRow[];
}

export interface AuditResultRow {
  id: string;
  run_id: string;
  procedure_type: ProcedureType;
  category: string;
  scenario_name: string;
  audit_id: string;
  watermark: string;
  status: 'PASSED' | 'FAILED';
  integrity_score: number;
  cross_contamination: boolean;
  duration_ms: number;
  quality_scores: DocumentQualityScore;
  failures: QualityFailure[];
  knowledge_gaps: string[];
  document_hash: string;
  doc_snippet: string;
  traceable_artifact_path?: string;
  created_at: string;
}

export interface AuditArtifactRow {
  auditId: string;
  caseData: AuditCaseData;
  qualityResult: DocumentQualityResult;
  tracePath?: string;
}
