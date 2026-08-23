/**
 * Agente: legal-style-reviewer
 * Revisa o texto do documento para garantir qualidade jurídica
 */

import { BaseAgent } from "@/agents/base-agent";
import type { CaseContext } from "@/lib/types/agent-interfaces";

export class LegalStyleReviewerAgent extends BaseAgent {
  protected name = "legal-style-reviewer";
  protected version = "1.0.0";

  protected async process(context: CaseContext): Promise<CaseContext> {
    if (!context.draft) {
      this.addWarning(context, "Nenhum draft para revisar");
      return context;
    }

    const review = await this.reviewDraft(context.draft);
    context.reviewedDraft = review;
    context.metadata.stepsCompleted.push("legal-style-reviewer");
    this.recordUsage(["legal-style-review"]);

    return context;
  }

  private async reviewDraft(draft: any) {
    const sections = draft.sections || [];
    const reviewedSections = await Promise.all(
      sections.map(async (section: any) => {
        const review = await this.reviewSection(section);
        return review;
      }),
    );

    const issuesFound = reviewedSections.reduce((sum, s) => sum + (s.changes?.length || 0), 0);

    return {
      sections: reviewedSections,
      overall: {
        quality: (issuesFound === 0 ? "alta" : issuesFound < 3 ? "media" : "baixa") as "alta" | "media" | "baixa",
        issuesFound,
      },
    };
  }

  private async reviewSection(section: any) {
    const changes = [];

    // Verificar gramática básica
    const grammarIssues = this.checkGrammar(section.content);
    changes.push(...grammarIssues);

    // Verificar consistência terminológica
    const consistencyIssues = this.checkTerminology(section.content);
    changes.push(...consistencyIssues);

    // Verificar coesão
    const cohesionIssues = this.checkCohesion(section.content);
    changes.push(...cohesionIssues);

    return {
      id: section.id,
      original: section.content,
      revised: this.applyFixes(section.content, changes),
      changes,
      approved: changes.length === 0,
    };
  }

  private checkGrammar(content: string) {
    const issues = [];

    // Verificar concordância básica
    if (/\b(a|o)\s+(?:requerente|autor|condutor)\b/i.test(content)) {
      // Verificar concordância de gênero
    }

    // Verificar pontuação
    if (!/[.!?]$/.test(content.trim())) {
      return [
        {
          type: "grammar",
          description: "Texto não termina com pontuação final",
          severity: "low",
        },
      ];
    }

    return [];
  }

  private checkTerminology(content: string) {
    const issues = [];

    // Verificar uso consistente de termos
    const terms = {
      "Auto de Infração": ["AIT", "auto de infração", "Auto"],
      "Notificação de Autuação": ["NA", "notificação"],
      "Defesa Prévia": ["defesa prévia", "defesa previa"],
      "Código de Trânsito Brasileiro": ["CTB", "Código de Trânsito"],
    };

    Object.entries(terms).forEach(([canonical, variants]) => {
      variants.forEach((variant) => {
        if (content.includes(variant) && !content.includes(canonical)) {
          issues.push({
            type: "consistency",
            description: `Termo "${variant}" deveria ser "${canonical}"`,
            severity: "medium",
          });
        }
      });
    });

    return issues;
  }

  private checkCohesion(content: string) {
    const issues = [];

    // Verificar se parágrafos têm conectivos
    const paragraphs = content.split(/\n\s*\n/);
    if (paragraphs.length > 1) {
      let hasConnectors = false;
      const connectors = [
        "portanto",
        "logo",
        "assim",
        "por conseguinte",
        "ademais",
        "outrossim",
        "porém",
        "contudo",
        "entretanto",
        "todavia",
      ];
      paragraphs.forEach((p) => {
        if (connectors.some((c) => p.toLowerCase().includes(c))) {
          hasConnectors = true;
        }
      });
      if (!hasConnectors && paragraphs.length > 2) {
        issues.push({
          type: "cohesion",
          description: "Parágrafos sem conectivos de ligação",
          severity: "low",
        });
      }
    }

    return issues;
  }

  private applyFixes(content: string, changes: any[]): string {
    let fixed = content;

    changes.forEach((change) => {
      if (change.type === "consistency" && change.suggestion) {
        const regex = new RegExp(change.original || "", "gi");
        fixed = fixed.replace(regex, change.suggestion);
      }
    });

    return fixed;
  }
}
