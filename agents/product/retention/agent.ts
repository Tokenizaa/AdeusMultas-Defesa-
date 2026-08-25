/**
 * Agente: retention-agent
 * Identifica risco de abandono e sugere intervenções
 */

import { BaseAgent } from "@/agents/base-agent";
import type { CaseContext } from "@/lib/types/agent-interfaces";

export class RetentionAgent extends BaseAgent {
  protected name = "retention-agent";
  protected version = "1.0.0";

  protected async process(context: CaseContext): Promise<CaseContext> {
    const risk = this.assessDropoffRisk(context);
    const intervention = this.suggestIntervention(risk, context);

    context.metadata.retention = { risk, intervention };
    this.recordUsage(["retention-check"]);

    return context;
  }

  private assessDropoffRisk(context: CaseContext): "baixo" | "medio" | "alto" {
    let riskScore = 0;

    // Tempo no step atual
    const timeOnStep = context.metadata.timeOnCurrentStep || 0;
    if (timeOnStep > 300000)
      riskScore += 3; // 5+ minutos
    else if (timeOnStep > 120000)
      riskScore += 2; // 2+ minutos
    else if (timeOnStep > 60000) riskScore += 1;

    // Erros de validação
    const fieldErrorsCount = typeof context.metadata.fieldErrors === 'number' 
      ? context.metadata.fieldErrors 
      : Object.keys(context.metadata.fieldErrors || {}).length;
    riskScore += Math.min(fieldErrorsCount, 3);

    // Sem upload quando teria documento
    if (!context.documents?.length && context.infraction.descricao?.includes("documento")) {
      riskScore += 2;
    }

    // Device mobile
    if (context.metadata.device === "mobile") riskScore += 1;

    if (riskScore >= 5) return "alto";
    if (riskScore >= 3) return "medio";
    return "baixo";
  }

  private suggestIntervention(risk: string, context: CaseContext) {
    const interventions: Record<string, any> = {
      alto: {
        type: "contact_support",
        timing: "now",
        message:
          "Está com dificuldade? Nosso time pode te ajudar. Clique aqui para falar no WhatsApp.",
      },
      medio: {
        type: "help_tip",
        timing: "after_30s_idle",
        message: "Travou em algum campo? Toque no ícone de ajuda ao lado.",
      },
      baixo: {
        type: "none",
        timing: "never",
        message: "",
      },
    };

    return interventions[risk] || interventions.baixo;
  }
}
