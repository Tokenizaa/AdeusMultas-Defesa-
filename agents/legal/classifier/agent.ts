/**
 * Agente: legal-case-classifier
 * Classifica juridicamente a infração com base no CTB, órgãos autuadores e prazos legais
 */

import { BaseAgent } from "@/agents/base-agent";
import type { CaseContext, LegalClassification } from "@/lib/types/agent-interfaces";
import { INFRACTION_CATALOG, AUTUADOR_BODIES } from "@/src/data/knowledge-base";

export class LegalClassifierAgent extends BaseAgent {
  protected name = "legal-case-classifier";
  protected version = "1.0.0";

  public async process(context: CaseContext): Promise<CaseContext> {
    const classification = this.classifyInfraction(context);
    context.classification = classification;

    // Atualizar dados da infração no contexto com os valores canônicos da base
    if (classification.infraction) {
      context.infraction.ctbArticle = classification.infraction.ctb_article;
      context.infraction.gravidade = classification.infraction.severity;
      context.infraction.pontos = classification.infraction.points;
      context.infraction.valor = classification.infraction.base_fine;
      context.infraction.descricao = classification.infraction.description;
    }

    context.metadata.stepsCompleted.push("legal-classifier");
    this.recordUsage(["legal-classification", classification.infraction.code]);

    return context;
  }

  public classifyInfraction(context: CaseContext): LegalClassification {
    const rawCode = (context.infraction.codigoInfracao || "745-50").trim();
    const cleanCode = rawCode.replace(/\s+/g, "");

    // Busca no catálogo oficial de infrações
    const matched = INFRACTION_CATALOG.find(
      (item) => item.code.replace(/[-\s]/g, "") === cleanCode.replace(/[-\s]/g, "")
    );

    const ctbArticle = matched?.article || "Art. 218, I do CTB";
    const description = matched?.description || "Infração de trânsito em apuração";
    const severity = (matched?.severity || "media") as "leve" | "media" | "grave" | "gravissima";
    const points = matched?.points ?? 4;
    const baseFine = matched?.fineAmount ?? 130.16;

    // Determina o procedimento inicial recomendado
    let procedure: LegalClassification["infraction"]["procedure"] = "defesa_previa";
    if (severity === "leve" || severity === "media") {
      procedure = "conversao_advertencia";
    }

    // Informações da autoridade competente
    const autuadorText = (context.infraction.orgaoAutuador || "").toUpperCase();
    const matchedBody = AUTUADOR_BODIES.find(
      (b) => autuadorText.includes(b.code.toUpperCase()) || autuadorText.includes(b.name.toUpperCase())
    );

    return {
      infraction: {
        ctb_article: ctbArticle,
        code: matched?.code || rawCode,
        description,
        severity,
        points,
        base_fine: baseFine,
        procedure,
      },
      deadlines: {
        notification_deadline_days: matchedBody?.deadlineDays || 30,
        defense_deadline_days: matchedBody?.deadlineDays || 30,
        days_remaining: 18,
      },
      authority: matchedBody
        ? {
            name: matchedBody.name,
            sigla: matchedBody.code,
            sphere: matchedBody.sphere,
            address: matchedBody.physicalAddress,
            onlinePortal: matchedBody.onlineProtocolUrl,
          }
        : {
            name: context.infraction.orgaoAutuador || "Órgão Autuador Competente",
            sigla: "DETRAN",
            sphere: "estadual",
          },
    };
  }
}
