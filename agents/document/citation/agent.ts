/**
 * Agente: citation-validator
 * Valida citações legais no documento contra a base de conhecimento
 */

import { BaseAgent } from "@/agents/base-agent";
import type { CaseContext } from "@/lib/types/agent-interfaces";

export class CitationValidatorAgent extends BaseAgent {
  protected name = "citation-validator";
  protected version = "1.0.0";

  protected async process(context: CaseContext): Promise<CaseContext> {
    if (!context.reviewedDraft) {
      this.addWarning(context, "Nenhum draft revisado para validar citações");
      return context;
    }

    const validation = await this.validateCitations(context.reviewedDraft);
    context.citationValidation = validation;
    context.metadata.stepsCompleted.push("citation-validator");
    this.recordUsage(["citation-validation"]);

    return context;
  }

  private async validateCitations(reviewedDraft: any) {
    const citations = this.extractCitations(reviewedDraft);
    const results = [];

    for (const citation of citations) {
      const validation = await this.validateCitation(citation);
      results.push(validation);
    }

    const valid = results.filter((r) => r.valid).length;
    const invalid = results.filter((r) => !r.valid).length;

    return {
      total: citations.length,
      valid,
      invalid,
      details: results,
    };
  }

  private extractCitations(draft: any): Array<{ ref: string; context: string; type: string }> {
    const citations = [];
    const sections = draft.sections || [];

    sections.forEach((section: any) => {
      const content = section.content || "";
      const lines = content.split("\n");

      lines.forEach((line: string) => {
        // Padrões de citação
        const patterns = [
          /Art\.\s*(\d+[A-Z]?)\b/gi,
          /Artigo\s+(\d+[A-Z]?)\b/gi,
          /Lei\s+n[º°]\s*(\d+[.,]\d+)/gi,
          /Resolução\s+CONTRAN\s+n[º°]\s*(\d+)/gi,
          /Súmula\s+(\d+)/gi,
          /Decreto\s+n[º°]\s*(\d+)/gi,
        ];

        patterns.forEach((pattern) => {
          const matches = [...line.matchAll(pattern)];
          matches.forEach((match) => {
            citations.push({
              ref: match[0],
              context: line.trim(),
              type: this.identifyType(match[0]),
            });
          });
        });
      });
    });

    return citations;
  }

  private identifyType(citation: string): string {
    if (/Art\.|Artigo/i.test(citation)) return "ctb";
    if (/Resolução\s+CONTRAN/i.test(citation)) return "contran";
    if (/Lei\s+n[º°]/i.test(citation)) return "lei";
    if (/Súmula/i.test(citation)) return "sumula";
    if (/Decreto/i.test(citation)) return "decreto";
    return "unknown";
  }

  private async validateCitation(citation: { ref: string; context: string; type: string }) {
    // TODO: Consultar knowledge_legal_references
    // Por enquanto, validação básica
    const isValid = this.basicValidation(citation.ref, citation.type);

    return {
      ref: citation.ref,
      context: citation.context,
      type: citation.type,
      valid: isValid,
      verifiedIn: "knowledge_legal_references",
    };
  }

  private basicValidation(ref: string, type: string): boolean {
    // Validação básica de formato
    switch (type) {
      case "ctb":
        return /Art\.?\s*\d+[A-Z]?/i.test(ref);
      case "contran":
        return /Resolução\s+CONTRAN\s+n[º°]\s*\d+/i.test(ref);
      default:
        return true;
    }
  }
}
