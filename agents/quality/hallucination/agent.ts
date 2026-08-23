/**
 * Agente: hallucination-checker
 * Detecta informações inventadas sem base na base de conhecimento
 */

import { BaseAgent } from "@/agents/base-agent";
import type { CaseContext } from "@/lib/types/agent-interfaces";

export class HallucinationCheckerAgent extends BaseAgent {
  protected name = "hallucination-checker";
  protected version = "1.0.0";

  protected async process(context: CaseContext): Promise<CaseContext> {
    if (!context.reviewedDraft) {
      this.addWarning(context, "Nenhum draft revisado para verificar");
      return context;
    }

    const check = await this.checkHallucinations(context.reviewedDraft, context);
    context.hallucinationCheck = check;
    context.metadata.stepsCompleted.push("hallucination-checker");
    this.recordUsage(["hallucination-check"]);

    return context;
  }

  private async checkHallucinations(draft: any, context: CaseContext) {
    const claims = this.extractClaims(draft);
    const suspicious: Array<{
      claim: string;
      reason: string;
      severity: "high" | "medium" | "low";
    }> = [];

    for (const claim of claims) {
      const verification = await this.verifyClaim(claim, context);

      if (!verification.verified) {
        suspicious.push({
          claim: claim.text,
          reason: verification.reason,
          severity: this.assessSeverity(claim, verification.reason),
        });
      }
    }

    return {
      totalClaims: claims.length,
      verified: claims.length - suspicious.length,
      suspicious,
    };
  }

  private extractClaims(draft: any): Array<{ text: string; section: string; type: string }> {
    const claims = [];
    const sections = draft.sections || [];

    sections.forEach((section: any) => {
      const content = section.content || "";
      const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 20);

      sentences.forEach((sentence: string) => {
        // Filtrar afirmações factuais (não opiniões)
        if (this.isFactualClaim(sentence)) {
          claims.push({
            text: sentence.trim(),
            section: section.title || section.id,
            type: this.classifyClaim(sentence),
          });
        }
      });
    });

    return claims;
  }

  private isFactualClaim(sentence: string): boolean {
    // Heurística: frases com números, datas, referências legais, afirmações factuais
    const factualPatterns = [
      /\b\d{1,2}\/\d{1,2}\/\d{4}\b/, // datas
      /\b\d{1,3}(?:\.\d{3})*(?:,\d{2})?\b/, // números/valores
      /\b(?:Art|Artigo|Lei|Resolução|Decreto)\b/i,
      /\b(?:Código|CTB|CONTRAN)\b/i,
      /\b(?:prazo|dias?|meses?)\s+\d+/i,
      /\b(?:valor|multa|pontos?)\b/i,
    ];

    return factualPatterns.some((pattern) => pattern.test(sentence));
  }

  private classifyClaim(sentence: string): string {
    if (/\b(?:Art|Artigo|Lei|Resolução|Decreto)\b/i.test(sentence)) return "legal_reference";
    if (/\b(?:valor|multa|R\$)\b/i.test(sentence)) return "monetary";
    if (/\b(?:prazo|dias?|meses?)\s+\d+/i.test(sentence)) return "deadline";
    if (/\b(?:pontos?|CNH|habilitação)\b/i.test(sentence)) return "penalty";
    return "general";
  }

  private async verifyClaim(
    claim: any,
    context: CaseContext,
  ): Promise<{ verified: boolean; reason: string }> {
    const text = claim.text;

    // Verificar referências legais
    if (claim.type === "legal_reference") {
      const refs = this.extractLegalRefs(text);
      for (const ref of refs) {
        const valid = await this.validateLegalRef(ref);
        if (!valid) {
          return { verified: false, reason: `Referência legal não encontrada: ${ref}` };
        }
      }
    }

    // Verificar dados do caso
    if (claim.type === "deadline" || claim.type === "penalty" || claim.type === "monetary") {
      const verified = await this.verifyCaseData(text, context);
      if (!verified) {
        return { verified: false, reason: "Dado não confere com dados do caso" };
      }
    }

    // Verificar dados monetários
    if (claim.type === "monetary") {
      const value = this.extractMonetaryValue(text);
      if (value && context.infraction.valor && Math.abs(value - context.infraction.valor) > 0.01) {
        return {
          verified: false,
          reason: `Valor ${value} não confere com multa de ${context.infraction.valor}`,
        };
      }
    }

    return { verified: true, reason: "Verificado" };
  }

  private async validateLegalRef(ref: string): Promise<boolean> {
    // TODO: Consultar knowledge_legal_references
    return true; // placeholder
  }

  private async verifyCaseData(text: string, context: CaseContext): Promise<boolean> {
    // Verificar placa
    const plateMatch = text.match(/[A-Z]{3}[0-9][A-Z0-9][0-9]{2}/i);
    if (plateMatch && plateMatch[0].toUpperCase() !== context.infraction.placa?.toUpperCase()) {
      return false;
    }

    // Verificar auto
    const autoMatch = text.match(/AE\d{8}/i);
    if (autoMatch && autoMatch[0] !== context.infraction.numeroAuto) {
      return false;
    }

    return true;
  }

  private extractLegalRefs(text: string): string[] {
    const refs = [];
    const patterns = [
      /Art\.\s*\d+[A-Z]?/gi,
      /Lei\s+n[º°]\s*\d+/gi,
      /Resolução\s+CONTRAN\s+n[º°]\s*\d+/gi,
    ];

    patterns.forEach((p) => {
      const matches = text.matchAll(p);
      for (const match of matches) refs.push(match[0]);
    });
    return refs;
  }

  private extractMonetaryValue(text: string): number | null {
    const match = text.match(/R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/);
    if (match) return parseFloat(match[1].replace(".", "").replace(",", "."));
    return null;
  }

  private assessSeverity(claim: any, reason: string): "high" | "medium" | "low" {
    if (claim.type === "legal_reference") return "high";
    if (claim.type === "monetary") return "high";
    if (claim.type === "deadline") return "medium";
    return "low";
  }
}
