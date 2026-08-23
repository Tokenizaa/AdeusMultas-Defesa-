/**
 * Agente: completeness-reviewer
 * Verifica se o documento está completo
 */

import { BaseAgent } from "@/agents/base-agent";
import type { CaseContext } from "@/lib/types/agent-interfaces";

export class CompletenessReviewerAgent extends BaseAgent {
  protected name = "completeness-reviewer";
  protected version = "1.0.0";

  protected async process(context: CaseContext): Promise<CaseContext> {
    if (!context.documentPlan || !context.reviewedDraft) {
      this.addWarning(context, "Plano ou draft ausente para verificar completude");
      return context;
    }

    const completeness = await this.checkCompleteness(
      context.documentPlan,
      context.reviewedDraft,
      context,
    );

    context.completeness = completeness;
    context.metadata.stepsCompleted.push("completeness-reviewer");
    this.recordUsage(["completeness-review"]);

    return context;
  }

  private async checkCompleteness(plan: any, draft: any, context: CaseContext) {
    const sections = plan.sections || [];
    const draftedSections = draft.sections || [];

    const sectionStatus = sections.map((section: any) => {
      const drafted = draftedSections.find((d: any) => d.id === section.id);
      const filled = drafted && drafted.content && drafted.content.trim().length > 10;

      return {
        id: section.id,
        title: section.title,
        required: section.required !== false,
        filled,
        missingFields: filled ? [] : this.getMissingFields(section),
      };
    });

    const requiredSections = sections.filter((s) => s.required !== false);
    const filledRequired = sectionStatus.filter((s) => s.required && s.filled).length;
    const totalRequired = requiredSections.length;

    const missing: string[] = [];
    sectionStatus.forEach((s) => {
      if (s.required && !s.filled) {
        missing.push(s.title);
      }
    });

    // Verificar campos obrigatórios nos dados do caso
    const requiredCaseFields = ["placa", "numeroAuto", "orgaoAutuador", "codigoInfracao", "data"];
    const missingCaseFields = requiredCaseFields.filter((f) => !this.getCaseField(context, f));

    // Verificar qualificação
    const requiredUserFields = ["nome", "cpf", "cnh", "endereco", "cidade", "uf"];
    const missingUserFields = requiredUserFields.filter((f) => !this.getUserField(context, f));

    const allMissing = [...missing, ...missingCaseFields, ...missingUserFields];

    return {
      complete: allMissing.length === 0,
      sections: sectionStatus,
      missing: allMissing,
      filledRequired,
      totalRequired,
    };
  }

  private getMissingFields(section: any): string[] {
    // Baseado no tipo de seção, quais campos deveriam estar presentes
    const requiredByType: Record<string, string[]> = {
      header: [],
      addressing: ["orgaoAutuador"],
      qualification: ["nome", "cpf", "cnh"],
      preamble: ["numeroAuto", "codigoInfracao", "artigo", "orgaoAutuador", "placa", "data"],
      facts: ["descricao", "data", "local"],
      legal_grounds: ["argumentos"],
      arguments: ["argumentos"],
      requests: ["pedidos"],
      closing: ["local", "data"],
    };

    return requiredByType[section.id] || [];
  }

  private getCaseField(context: CaseContext, field: string): boolean {
    const infraction = context.infraction;
    switch (field) {
      case "placa":
        return !!infraction.placa;
      case "numeroAuto":
        return !!infraction.numeroAuto;
      case "orgaoAutuador":
        return !!infraction.orgaoAutuador;
      case "codigoInfracao":
        return !!infraction.codigoInfracao;
      case "data":
        return !!infraction.data;
      default:
        return false;
    }
  }

  private getUserField(context: CaseContext, field: string): boolean {
    const user = context.user;
    switch (field) {
      case "nome":
        return !!user.nome;
      case "cpf":
        return !!user.cpf;
      case "cnh":
        return !!user.cnh;
      case "endereco":
        return !!user.endereco;
      case "cidade":
        return !!user.cidade;
      case "uf":
        return !!user.uf;
      default:
        return false;
    }
  }
}
