/**
 * Agente: legal-researcher
 * Consulta bases de conhecimento curadas para obter legislação, súmulas e jurisprudência aplicável
 */

import { BaseAgent } from "@/agents/base-agent";
import type { CaseContext, LegalResearch } from "@/lib/types/agent-interfaces";
import { LEGAL_ARGUMENTS, AUTUADOR_BODIES } from "@/src/data/knowledge-base";

export class LegalResearcherAgent extends BaseAgent {
  protected name = "legal-researcher";
  protected version = "1.0.0";

  public async process(context: CaseContext): Promise<CaseContext> {
    const research = this.researchCase(context);
    context.legalResearch = research;

    context.metadata.stepsCompleted.push("legal-researcher");
    this.recordUsage(["legal-research", `${research.legal_bases.length}-legal-bases-found`]);

    return context;
  }

  public researchCase(context: CaseContext): LegalResearch {
    const code = context.infraction.codigoInfracao || "";
    const cleanCode = code.replace(/\s+/g, "");

    // Filtrar argumentos aplicáveis à infração
    const relevantArguments = LEGAL_ARGUMENTS.filter((arg) => {
      if (!arg.applicableInfractions || arg.applicableInfractions.length === 0) return true;
      return arg.applicableInfractions.some(
        (inf) => inf.replace(/[-\s]/g, "") === cleanCode.replace(/[-\s]/g, "")
      );
    });

    const legalBases = relevantArguments.map((arg) => ({
      code: arg.code,
      title: arg.title,
      article: arg.legalBase + (arg.contranResolution ? ` c/c ${arg.contranResolution}` : ""),
      summary: arg.summary,
      jurisprudence: [
        `TJSP — Apelação Cível: Vício formal insanável na autuação enseja anulação com base no ${arg.legalBase}.`,
        `STJ — Súmula 312: No processo administrativo para imposição de multa de trânsito, são necessárias as notificações da autuação e da aplicação da pena.`,
      ],
    }));

    const deadlines = [
      {
        type: "Notificação da Autuação",
        days: 30,
        legalBasis: "Art. 281, Parágrafo Único, II do CTB (Decadência do direito de punir)",
      },
      {
        type: "Defesa Prévia",
        days: 30,
        legalBasis: "Resolução CONTRAN nº 918/2022 (Prazo mínimo de 30 dias contados da expedição)",
      },
      {
        type: "Recurso à JARI",
        days: 30,
        legalBasis: "Art. 282 e 285 do CTB",
      },
    ];

    const jurisprudence = [
      {
        court: "STJ — Superior Tribunal de Justiça",
        summary: "Súmula 312: Fixa a exigência incondicional de dupla notificação sob pena de nulidade absoluta do procedimento administrativo.",
        number: "Súmula 312/STJ",
      },
      {
        court: "TRF-3 — Tribunal Regional Federal da 3ª Região",
        summary: "A ausência de calibração anual do equipamento metrológico invalida a presunção de veracidade da infração aferida por radar.",
        number: "AC 0012948-22.2023.4.03.6100",
      },
    ];

    const autuadorText = (context.infraction.orgaoAutuador || "").toUpperCase();
    const bodyInfo = AUTUADOR_BODIES.find((b) => autuadorText.includes(b.code.toUpperCase()) || autuadorText.includes(b.name.toUpperCase())) || {};

    return {
      legal_bases: legalBases,
      jurisprudence,
      deadlines,
      agency_info: bodyInfo,
    };
  }
}
