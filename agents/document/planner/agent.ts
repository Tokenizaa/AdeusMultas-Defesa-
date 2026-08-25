/**
 * Agente: document-planner
 * Monta o índice/estrutura do documento de defesa
 */

import { BaseAgent } from "@/agents/base-agent";
import type { CaseContext } from "@/lib/types/agent-interfaces";

export class DocumentPlannerAgent extends BaseAgent {
  protected name = "document-planner";
  protected version = "1.0.0";

  protected async process(context: CaseContext): Promise<CaseContext> {
    const plan = this.createPlan(context);
    context.documentPlan = plan;
    context.metadata.stepsCompleted.push("document-planner");
    this.recordUsage(["document-planning"]);

    return context;
  }

  private createPlan(context: CaseContext) {
    const serviceType = context.service.tipo;

    const baseSections = [
      { id: "header", type: "header", title: "DEFESA PRÉVIA", required: true, order: 1 },
      { id: "addressing", type: "addressing", title: "ENDEREÇAMENTO", required: true, order: 2 },
      {
        id: "qualification",
        type: "qualification",
        title: "QUALIFICAÇÃO",
        required: true,
        order: 3,
      },
      { id: "preamble", type: "preamble", title: "PREÂMBULO", required: true, order: 4 },
      { id: "facts", type: "facts", title: "I — DOS FATOS", required: true, order: 5 },
      {
        id: "legal_grounds",
        type: "legal_grounds",
        title: "II — DO DIREITO",
        required: true,
        order: 6,
      },
      {
        id: "arguments",
        type: "arguments",
        title: "III — DOS ARGUMENTOS",
        required: true,
        order: 7,
      },
      { id: "requests", type: "requests", title: "IV — DOS PEDIDOS", required: true, order: 8 },
      { id: "closing", type: "closing", title: "FECHAMENTO", required: true, order: 9 },
    ];

    // Argumentos do strategist determinam quais seções extras
    const extraSections = this.getExtraSections(context.strategy?.selectedArguments || []);

    return {
      template: "defesa_previa",
      sections: [...baseSections, ...extraSections],
      metadata: {
        serviceType: context.service.tipo,
        generatedAt: new Date().toISOString(),
        version: "1.0",
        template: "defesa_previa_v1",
      },
    };
  }

  private getExtraSections(selectedArguments: any[]) {
    const sections = [];

    // Se há argumentos complexos, adicionar seção de jurisprudência
    const hasJurisprudence = selectedArguments.some((a) => a.jurisprudence?.length);
    if (hasJurisprudence) {
      sections.push({
        id: "jurisprudence",
        type: "jurisprudence",
        title: "V — DA JURISPRUDÊNCIA",
        required: false,
        order: 8.5,
      });
    }

    // Se há documentos anexos
    const hasAttachments = true; // TODO: verificar context.documents
    if (hasAttachments) {
      sections.push({
        id: "attachments",
        type: "attachments",
        title: "VI — DOCUMENTOS ANEXOS",
        required: false,
        order: 9,
      });
    }

    return sections;
  }
}
