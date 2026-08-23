/**
 * Agente: document-drafter
 * Escreve o conteúdo textual de cada seção do documento de defesa
 */

import { BaseAgent } from "@/agents/base-agent";
import type { CaseContext } from "@/lib/types/agent-interfaces";

export class DocumentDrafterAgent extends BaseAgent {
  protected name = "document-drafter";
  protected version = "1.0.0";

  protected async process(context: CaseContext): Promise<CaseContext> {
    const draft = await this.draftDocument(context);
    context.draft = draft;
    context.metadata.stepsCompleted.push("document-drafter");
    this.recordUsage(["document-drafting"]);

    return context;
  }

  private async draftDocument(context: CaseContext): Promise<any> {
    const sections = context.documentPlan?.sections || [];
    const args = context.strategy?.selectedArguments || [];
    const user = context.user;

    const draftedSections = await Promise.all(
      sections.map(async (section) => {
        const content = await this.draftSection(section, {
          user,
          infraction: context.infraction,
          args,
          strategy: context.strategy,
        });
        return { ...section, content, draftedAt: new Date().toISOString() };
      }),
    );

    return {
      sections: draftedSections,
      metadata: {
        totalSections: draftedSections.length,
        totalWords: draftedSections.reduce((sum, s) => sum + (s.content?.split(/\s+/).length || 0), 0),
        generatedAt: new Date().toISOString(),
      },
    };
  }

  private async draftSection(section: any, data: any): Promise<string> {
    const { user, infraction, args, strategy } = data;

    switch (section.id) {
      case "header":
        return this.draftHeader();

      case "addressing":
        return this.draftAddressing(infraction);

      case "qualification":
        return this.draftQualification(infraction, infraction); // TODO: usar dados do usuário

      case "preamble":
        return this.draftPreamble(infraction);

      case "facts":
        return this.draftFacts(infraction);

      case "legal_grounds":
        return this.draftLegalGrounds();

      case "arguments":
        return this.draftArguments(args);

      case "requests":
        return this.draftRequests();

      case "closing":
        return this.draftClosing();

      default:
        return `[Seção ${section.id} não implementada]`;
    }
  }

  private draftHeader(): string {
    return "DEFESA PRÉVIA";
  }

  private draftAddressing(infraction: any): string {
    const orgao = infraction.orgaoAutuador || "DETRAN-SP";
    return `AO ILUSTRÍSSIMO SENHOR DIRETOR DO ${orgao.toUpperCase()}`;
  }

  private draftQualification(user: any, infraction: any): string {
    return `${user.nome || "[NOME]"}, ${user.nacionalidade || "brasileiro(a)"}, ${user.estadoCivil || "solteiro(a)"}, ${user.profissao || "[PROFISSÃO]"}, inscrito(a) no CPF sob o nº ${user.cpf || "[CPF]"}, portador(a) da CNH nº ${user.cnh || "[CNH]"}, residente e domiciliado(a) em ${user.endereco || "[ENDEREÇO]"}, ${user.cidade || "[CIDADE]"} - ${user.uf || "[UF]"}, vem, respeitosamente, à presença de Vossa Senhoria, apresentar`;
  }

  private draftPreamble(infraction: any): string {
    return `DEFESA PRÉVIA

em face do Auto de Infração de Trânsito nº ${infraction.numeroAuto || "[AUTO]"}, código ${infraction.codigoInfracao || "[CÓDIGO]"}, artigo ${infraction.artigo || "[ARTIGO]"}, lavrado pelo ${infraction.orgaoAutuador || "[ÓRGÃO]"} em ${infraction.data || "[DATA]"}, referente ao veículo de placa ${infraction.placa || "[PLACA]"}, pelo que passa a expor e a requerer:`;
  }

  private draftFacts(infraction: any): string {
    return `I — DOS FATOS

Em ${infraction.data || "[DATA]"}, o veículo de placa ${infraction.placa || "[PLACA]"} foi autuado pelo ${infraction.orgaoAutuador || "[ÓRGÃO]"} sob a acusação de ${infraction.descricao || "[DESCRIÇÃO DA INFRAÇÃO]"}, fundamentado no ${infraction.artigo || "[ARTIGO]"} do Código de Trânsito Brasileiro.

A notificação de autuação foi recebida em data posterior, sendo o prazo para defesa prévia ainda vigente.`;
  }

  private draftLegalGrounds(): string {
    return `II — DO DIREITO

Preliminarmente, cumpre destacar que o artigo 5º, LV, da Constituição Federal assegura a todos o contraditório e a ampla defesa, com os meios e recursos a ela inerentes. O Código de Trânsito Brasileiro, em seu artigo 281, garante o direito de defesa prévia ao autuado.

O presente ato de defesa fundamenta-se nos seguintes dispositivos legais:
- Art. 5º, LV, da Constituição Federal;
- Art. 281 do CTB (Lei nº 9.503/97);
- Resolução CONTRAN nº 819/2021;
- Resolução CONTRAN nº 918/2022.`;
  }

  private draftArguments(args: any[]): string {
    if (!args || args.length === 0) {
      return "III — DOS ARGUMENTOS\n\nNenhum argumento específico foi selecionado para este caso.";
    }

    let text = "III — DOS ARGUMENTOS\n\n";
    args.forEach((arg, index) => {
      const title = arg.title || `Argumento ${index + 1}`;
      const content = arg.description || arg.content || "";
      text += `${index + 1}. ${title}\n${content}\n\n`;
    });
    return text;
  }

  private draftRequests(): string {
    return `IV — DOS PEDIDOS

Ante o exposto, requer:

1. Seja recebida a presente Defesa Prévia, com seus respectivos documentos anexos;
2. Seja anulado o Auto de Infração de Trânsito nº ${"[AUTO]"}, código ${"[CÓDIGO]"}, lavrado em ${"[DATA]"}, por todos os fundamentos expostos;
3. Subsidiariamente, caso não seja aceita a nulidade total, seja a penalidade convertida em advertência por escrito, nos termos do art. 267 do CTB;
4. Seja concedido o benefício da gratuidade de justiça, se for o caso;
5. Protesta provar o alegado por todos os meios de prova em direito admitidos, especialmente documental e testemunhal.

Nestes termos,
Pede deferimento.`;
  }

  private draftClosing(): string {
    return `[CIDADE], ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}.

____________________________________
${"[NOME DO REQUERENTE]"}
CPF: ${"[CPF]"}
CNH: ${"[CNH]"}
`;
  }
}
