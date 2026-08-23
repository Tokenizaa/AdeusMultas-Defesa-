/**
 * Pipeline Runner — Adeus Multa / DefesAi
 *
 * Orquestra a execução sequencial dos agentes especializados em 6 camadas:
 * 1. Experiência (onboarding-ux, copywriter, legal-ux)
 * 2. OCR & Percepção (ocr-classifier, ocr-extractor, ocr-validator)
 * 3. Jurídico & Legislação (legal-classifier, legal-researcher, legal-strategist)
 * 4. Documento & Petição (document-planner, document-drafter, legal-style-reviewer, citation-validator, document-layout)
 * 5. Qualidade & Auditoria (legal-auditor, hallucination-checker, contradiction-checker, completeness-reviewer)
 * 6. Produto & Conversão (pricing-agent, retention-agent, analytics-agent)
 */

import { createHash } from "node:crypto";
import type { CaseContext } from "@/lib/types/agent-interfaces";

// Camada 1: Experiência
import { OnboardingUXAgent } from "@/agents/onboarding-ux/agent";
import { OnboardingCopywriterAgent } from "@/agents/onboarding-copywriter/agent";
import { LegalUXReviewerAgent } from "@/agents/legal-ux-reviewer/agent";

// Camada 2: OCR
import { OCRClassifierAgent } from "@/agents/ocr/classifier/agent";
import { OCRExtractorAgent } from "@/agents/ocr/extractor/agent";
import { OCRValidatorAgent } from "@/agents/ocr/validator/agent";

// Camada 3: Jurídico
import { LegalClassifierAgent } from "@/agents/legal/classifier/agent";
import { LegalResearcherAgent } from "@/agents/legal/researcher/agent";
import { LegalStrategistAgent } from "@/agents/legal/strategist/agent";

// Camada 4: Documento
import { DocumentPlannerAgent } from "@/agents/document/planner/agent";
import { DocumentDrafterAgent } from "@/agents/document/drafter/agent";
import { LegalStyleReviewerAgent } from "@/agents/legal-style-reviewer/agent";
import { CitationValidatorAgent } from "@/agents/document/citation/agent";
import { DocumentLayoutAgent } from "@/agents/document/layout/agent";

// Camada 5: Qualidade
import { LegalAuditorAgent } from "@/agents/quality/auditor/agent";
import { HallucinationCheckerAgent } from "@/agents/quality/hallucination/agent";
import { ContradictionCheckerAgent } from "@/agents/quality/consistency/agent";
import { CompletenessReviewerAgent } from "@/agents/quality/completeness/agent";

// Camada 6: Produto
import { PricingAgent } from "@/agents/product/pricing/agent";
import { RetentionAgent } from "@/agents/product/retention/agent";
import { AnalyticsAgent } from "@/agents/product/analytics/agent";

export interface PipelineLog {
  step: string;
  status: "success" | "failed" | "partial" | "skipped";
  duration_ms: number;
  error?: string;
}

export interface PipelineResult {
  success: boolean;
  context: CaseContext;
  logs: PipelineLog[];
  warnings: string[];
}

/**
 * Optional dependency injection: provide pre-instantiated agents.
 * If not provided, the runner will instantiate default agents.
 */
export interface PipelineAgents {
  onboardingUX?: OnboardingUXAgent;
  onboardingCopywriter?: OnboardingCopywriterAgent;
  legalUX?: LegalUXReviewerAgent;
  ocrClassifier?: OCRClassifierAgent;
  ocrExtractor?: OCRExtractorAgent;
  ocrValidator?: OCRValidatorAgent;
  legalClassifier?: LegalClassifierAgent;
  legalResearcher?: LegalResearcherAgent;
  legalStrategist?: LegalStrategistAgent;
  documentPlanner?: DocumentPlannerAgent;
  documentDrafter?: DocumentDrafterAgent;
  legalStyleReviewer?: LegalStyleReviewerAgent;
  citationValidator?: CitationValidatorAgent;
  documentLayout?: DocumentLayoutAgent;
  legalAuditor?: LegalAuditorAgent;
  hallucinationChecker?: HallucinationCheckerAgent;
  contradictionChecker?: ContradictionCheckerAgent;
  completenessReviewer?: CompletenessReviewerAgent;
  pricingAgent?: PricingAgent;
  retentionAgent?: RetentionAgent;
  analyticsAgent?: AnalyticsAgent;
}

export async function runPipeline(
  initialContext: Partial<CaseContext>,
  agents: PipelineAgents = {}
): Promise<PipelineResult> {
  const context: CaseContext = {
    user: initialContext.user ?? { nome: "", cpf: "", cnh: "", endereco: "", cidade: "", uf: "" },
    infraction: initialContext.infraction ?? {
      placa: "",
      numeroAuto: "",
      orgaoAutuador: "",
      codigoInfracao: "",
      data: "",
    },
    service: initialContext.service ?? { tipo: "recurso_multa" },
    ocr: initialContext.ocr ?? null,
    classification: initialContext.classification ?? null,
    legalResearch: initialContext.legalResearch ?? null,
    strategy: initialContext.strategy ?? null,
    documentPlan: initialContext.documentPlan ?? null,
    draft: initialContext.draft ?? null,
    reviewedDraft: initialContext.reviewedDraft ?? null,
    audit: initialContext.audit ?? null,
    hallucinationCheck: initialContext.hallucinationCheck ?? null,
    contradictions: initialContext.contradictions ?? null,
    completeness: initialContext.completeness ?? null,
    citationValidation: initialContext.citationValidation ?? null,
    metadata: {
      ...(initialContext.metadata ?? {}),
      documentId: initialContext.metadata?.documentId || `doc_${Date.now()}`,
      version: "2.0",
      hash: "",
      stepsCompleted: [],
      validatedFields: initialContext.metadata?.validatedFields ?? [],
    },
  };

  const logs: PipelineLog[] = [];
  const warnings: string[] = [];

  // Resolve agents: use provided if exists, else create default
  const onboardingUX = agents.onboardingUX ?? new OnboardingUXAgent();
  const onboardingCopywriter = agents.onboardingCopywriter ?? new OnboardingCopywriterAgent();
  const legalUX = agents.legalUX ?? new LegalUXReviewerAgent();

  const ocrClassifier = agents.ocrClassifier ?? new OCRClassifierAgent();
  const ocrExtractor = agents.ocrExtractor ?? new OCRExtractorAgent();
  const ocrValidator = agents.ocrValidator ?? new OCRValidatorAgent();

  const legalClassifier = agents.legalClassifier ?? new LegalClassifierAgent();
  const legalResearcher = agents.legalResearcher ?? new LegalResearcherAgent();
  const legalStrategist = agents.legalStrategist ?? new LegalStrategistAgent();

  const documentPlanner = agents.documentPlanner ?? new DocumentPlannerAgent();
  const documentDrafter = agents.documentDrafter ?? new DocumentDrafterAgent();
  const legalStyleReviewer = agents.legalStyleReviewer ?? new LegalStyleReviewerAgent();
  const citationValidator = agents.citationValidator ?? new CitationValidatorAgent();
  const documentLayout = agents.documentLayout ?? new DocumentLayoutAgent();

  const legalAuditor = agents.legalAuditor ?? new LegalAuditorAgent();
  const hallucinationChecker = agents.hallucinationChecker ?? new HallucinationCheckerAgent();
  const contradictionChecker = agents.contradictionChecker ?? new ContradictionCheckerAgent();
  const completenessReviewer = agents.completenessReviewer ?? new CompletenessReviewerAgent();

  const pricingAgent = agents.pricingAgent ?? new PricingAgent();
  const retentionAgent = agents.retentionAgent ?? new RetentionAgent();
  const analyticsAgent = agents.analyticsAgent ?? new AnalyticsAgent();

  // ── CAMADA 1: EXPERIÊNCIA & ONBOARDING ────────────────────────────
  logs.push(await runStep("onboarding-ux", () => (onboardingUX as any).process(context)));
  logs.push(await runStep("onboarding-copywriter", () => (onboardingCopywriter as any).process(context)));
  logs.push(await runStep("legal-ux-reviewer", () => (legalUX as any).process(context)));

  // ── CAMADA 2: OCR & EXTRAÇÃO ─────────────────────────────────────
  if (context.ocr?.raw_text || context.infraction.fotos?.length) {
    logs.push(await runStep("ocr-classifier", () => (ocrClassifier as any).process(context)));
    logs.push(await runStep("ocr-extractor", () => (ocrExtractor as any).process(context)));
    logs.push(await runStep("ocr-validator", () => (ocrValidator as any).process(context)));
  }

  // ── CAMADA 3: CONHECIMENTO JURÍDICO & ESTRATÉGIA ─────────────────
  logs.push(await runStep("legal-classifier", () => (legalClassifier as any).process(context)));
  logs.push(await runStep("legal-researcher", () => (legalResearcher as any).process(context)));
  logs.push(await runStep("legal-strategist", () => (legalStrategist as any).process(context)));

  // ── CAMADA 4: DOCUMENTO & PETIÇÃO ────────────────────────────────
  logs.push(await runStep("document-planner", () => (documentPlanner as any).process(context)));
  logs.push(await runStep("document-drafter", () => (documentDrafter as any).process(context)));
  logs.push(await runStep("legal-style-reviewer", () => (legalStyleReviewer as any).process(context)));
  logs.push(await runStep("citation-validator", () => (citationValidator as any).process(context)));
  logs.push(await runStep("document-layout", () => (documentLayout as any).process(context)));

  // ── CAMADA 5: QUALIDADE & AUDITORIA ──────────────────────────────
  logs.push(await runStep("legal-auditor", () => (legalAuditor as any).process(context)));
  logs.push(await runStep("hallucination-checker", () => (hallucinationChecker as any).process(context)));
  logs.push(await runStep("contradiction-checker", () => (contradictionChecker as any).process(context)));
  logs.push(await runStep("completeness-reviewer", () => (completenessReviewer as any).process(context)));

  // Coleta avisos de qualidade
  if (context.hallucinationCheck && context.hallucinationCheck.suspicious.length > 0) {
    warnings.push(`${context.hallucinationCheck.suspicious.length} trecho(s) com verificação de fonte necessária`);
  }
  if (context.completeness && !context.completeness.complete) {
    warnings.push(`Itens pendentes no documento: ${context.completeness.missing.join(", ")}`);
  }

  // ── CAMADA 6: PRODUTO & ANALYTICS ────────────────────────────────
  logs.push(await runStep("pricing-agent", () => (pricingAgent as any).process(context)));
  logs.push(await runStep("retention-agent", () => (retentionAgent as any).process(context)));
  logs.push(await runStep("analytics-agent", () => (analyticsAgent as any).process(context)));

  // Gera hash de integridade e conclui metadados
  context.metadata.stepsCompleted = logs.filter((l) => l.status === "success").map((l) => l.step);
  const docRepresentation = context.draft || context.reviewedDraft || context.strategy;
  context.metadata.hash = generateHash(JSON.stringify(docRepresentation));

  const hasFatalError = logs.some((l) => l.status === "failed");

  return {
    success: !hasFatalError,
    context,
    logs,
    warnings,
  };
}

async function runStep<T>(name: string, fn: () => Promise<T>): Promise<PipelineLog> {
  const start = Date.now();
  try {
    await fn();
    return { step: name, status: "success", duration_ms: Date.now() - start };
  } catch (err) {
    return {
      step: name,
      status: "failed",
      duration_ms: Date.now() - start,
      error: err instanceof Error ? err.message : "Erro desconhecido",
    };
  }
}

function generateHash(content: string): string {
  return createHash("sha256").update(content || "").digest("hex");
}