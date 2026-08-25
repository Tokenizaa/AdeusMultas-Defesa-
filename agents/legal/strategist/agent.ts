/**
 * Agente: legal-strategist
 * Define a estratégia de defesa selecionando e ranqueando os argumentos da base oficial
 */

import { BaseAgent } from "@/agents/base-agent";
import type { CaseContext, Strategy, StrategyArgument } from "@/lib/types/agent-interfaces";
import { LEGAL_ARGUMENTS } from "@/src/data/knowledge-base";

export class LegalStrategistAgent extends BaseAgent {
  protected name = "legal-strategist";
  protected version = "1.0.0";

  public async process(context: CaseContext): Promise<CaseContext> {
    const strategy = this.defineStrategy(context);
    context.strategy = strategy;

    context.metadata.stepsCompleted.push("legal-strategist");
    this.recordUsage([
      "strategy-definition",
      `${strategy.selectedArguments.length}-arguments-selected`,
      strategy.recommended_procedure || "defesa_previa",
    ]);

    return context;
  }

  public defineStrategy(context: CaseContext): Strategy {
    const code = (context.infraction.codigoInfracao || "").trim();
    const cleanCode = code.replace(/\s+/g, "");

    // 1. Filtrar argumentos da base oficial
    let matchedArgs = LEGAL_ARGUMENTS.filter((arg) => {
      if (!arg.applicableInfractions || arg.applicableInfractions.length === 0) return false;
      return arg.applicableInfractions.some(
        (inf) => inf.replace(/[-\s]/g, "") === cleanCode.replace(/[-\s]/g, "")
      );
    });

    // Se nenhum específico foi encontrado, pegar os argumentos preliminares e gerais
    if (matchedArgs.length === 0) {
      matchedArgs = LEGAL_ARGUMENTS.filter(
        (arg) => arg.category === "preliminar" || arg.code === "ARG_NOTIF_30D" || arg.code === "ARG_INMETRO_RADAR"
      );
    }

    // 2. Ordenar por prioridade: Preliminares (vícios formais) primeiro, depois Mérito
    const selectedArguments: StrategyArgument[] = matchedArgs.map((arg) => ({
      id: arg.id,
      code: arg.code,
      title: arg.title,
      legalBase: arg.legalBase + (arg.contranResolution ? ` c/c ${arg.contranResolution}` : ""),
      summary: arg.summary,
      detailedText: arg.detailedText,
      confidenceScore: arg.confidenceScore,
      category: arg.category as any,
      jurisprudence: [
        `Jurisprudência pacífica quanto à aplicação do ${arg.legalBase} em favor do condutor.`,
      ],
    }));

    // 3. Avaliar elegibilidade para conversão em advertência (Art. 267 CTB)
    const severity = context.classification?.infraction.severity || "media";
    const canConvert = severity === "leve" || severity === "media";

    // 4. Calcular probabilidade global
    const avgScore = selectedArguments.length > 0
      ? selectedArguments.reduce((acc, a) => acc + a.confidenceScore, 0) / selectedArguments.length
      : 85;

    const estimatedSuccess: Strategy["estimated_success"] =
      avgScore >= 90 ? "muito_provável" : avgScore >= 75 ? "provável" : "possível";

    return {
      difficulty: severity === "gravissima" ? "alta" : severity === "grave" ? "media" : "baixa",
      estimated_success: estimatedSuccess,
      selectedArguments,
      risks: [
        "Inobservância do prazo de protocolo implica em preclusão administrativa.",
        "Ausência de assinatura ou procuração resulta no não conhecimento do recurso.",
      ],
      recommended_procedure: canConvert ? "conversao_advertencia" : "defesa_previa",
      successRate: Math.round(avgScore),
    };
  }
}
