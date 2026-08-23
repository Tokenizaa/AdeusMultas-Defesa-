/**
 * Agente: contradiction-checker
 * Detecta contradições internas no documento
 */

import { BaseAgent } from "@/agents/base-agent";
import type { CaseContext } from "@/lib/types/agent-interfaces";

export class ContradictionCheckerAgent extends BaseAgent {
  protected name = "contradiction-checker";
  protected version = "1.0.0";

  protected async process(context: CaseContext): Promise<CaseContext> {
    if (!context.reviewedDraft) {
      this.addWarning(context, "Nenhum draft revisado para verificar");
      return context;
    }

    const contradictions = await this.checkContradictions(context.reviewedDraft, context);
    context.contradictions = contradictions;
    context.metadata.stepsCompleted.push("contradiction-checker");
    this.recordUsage(["contradiction-check"]);

    return context;
  }

  private async checkContradictions(draft: any, context: CaseContext) {
    const conflicts = [];

    // 1. Verificar consistência de dados entre seções
    const dataConflicts = this.checkDataConsistency(draft, context);
    conflicts.push(...dataConflicts);

    // 2. Verificar argumentos contraditórios
    const argumentConflicts = this.checkArgumentConflicts(draft);
    conflicts.push(...argumentConflicts);

    // 3. Verificar prazos
    const deadlineConflicts = this.checkDeadlineConsistency(draft);
    conflicts.push(...deadlineConflicts);

    // 4. Verificar valores monetários
    const valueConflicts = this.checkValueConsistency(draft);
    conflicts.push(...valueConflicts);

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
    };
  }

private checkDataConsistency(draft: any, context: CaseContext) {
     const conflicts = [];
     const sections = draft.sections || [];

     // Coletar todos os valores de campos-chave
     const fieldValues: Record<string, Set<string>> = {
       placa: new Set(),
       numeroAuto: new Set(),
       orgaoAutuador: new Set(),
       codigoInfracao: new Set(),
       artigo: new Set(),
       valor: new Set(),
       pontos: new Set(),
       dataInfracao: new Set(),
     };

     sections.forEach((section: any) => {
       const content = section.content || "";

       // Extrair valores do conteúdo
       Object.keys(fieldValues).forEach((field) => {
         const values = this.extractFieldValues(content, field);
         values.forEach((v) => fieldValues[field].add(v));
       });
     });

     // Verificar conflitos
    Object.entries(fieldValues).forEach(([field, values]) => {
      if (values.size > 1) {
        this.addConflict(conflicts, field, Array.from(values));
      }
    });

    // Comparar com dados do caso
    if (context.infraction.placa && fieldValues.placa.has(context.infraction.placa)) {
      // OK
    } else if (fieldValues.placa.size > 0 && context.infraction.placa) {
      const found = Array.from(fieldValues.placa).find(
        (v) => v.toUpperCase() === context.infraction.placa.toUpperCase(),
      );
      if (!found) {
        this.addConflict(
          null,
          "placa",
          `Placa no documento (${Array.from(fieldValues.placa).join(", ")}) difere da informada (${context.infraction.placa})`,
        );
      }
    }

    return conflicts;
  }

  private checkArgumentConflicts(draft: any) {
    const conflicts = [];
    const sections = draft.sections || [];

    // Extrair argumentos das seções de direito
    const argumentsSection = sections.find(
      (s: any) => s.type === "legal_grounds" || s.title?.toLowerCase().includes("direito"),
    );

    if (!argumentsSection) return conflicts;

    // TODO: Implementar detecção de argumentos contraditórios
    // Ex: argumentar que "não houve abordagem" e "condutor confessou" ao mesmo tempo

    return conflicts;
  }

  private checkDeadlineConsistency(draft: any) {
    const conflicts = [];
    const sections = draft.sections || [];

    // Extrair todas as menções de prazo
    const deadlinePattern = /\b(\d+)\s*dias?\b/gi;
    const deadlines: Array<{ value: number; context: string; section: string }> = [];

    const sections_ = draft.sections || [];
    sections_.forEach((section: any) => {
      const content = section.content || "";
      const matches = [...content.matchAll(/(\d+)\s*dias?/gi)];
      matches.forEach((m) => {
        deadlines.push({
          value: parseInt(m[1]),
          context: m[0],
          section: section.title || section.id,
        });
      });
    });

    // Verificar contradições
    if (deadlines.length > 1) {
      const uniqueValues = [...new Set(deadlines.map((d) => d.value))];
      if (uniqueValues.length > 1) {
        conflicts.push({
          type: "deadline",
          description: `Prazos conflitantes encontrados: ${uniqueValues.join(", ")} dias`,
          locations: deadlines.map((d) => `${d.section}: ${d.context}`),
        });
      }
    }

    return conflicts;
  }

  private checkValueConsistency(draft: any) {
    const conflicts = [];
    const sections = draft.sections || [];

    const values: Array<{ value: number; context: string; section: string }> = [];

    sections.forEach((section: any) => {
      const content = section.content || "";
      const matches = [...content.matchAll(/R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi)];
      matches.forEach((m) => {
        const value = parseFloat(m[1].replace(".", "").replace(",", "."));
        values.push({ value, context: m[0], section: section.title || section.id });
      });
    });

    if (values.length > 1) {
      const uniqueValues = [...new Set(values.map((v) => v.value))];
      if (uniqueValues.length > 1) {
        conflicts.push({
          type: "value",
          description: `Valores monetários conflitantes: ${uniqueValues.map((v) => `R$ ${v.toFixed(2)}`).join(", ")}`,
          locations: values.map((v) => `${v.section}: ${v.context}`),
        });
      }
    }

    return conflicts;
  }

  private addConflict(conflicts: any[], field: string, valuesOrDescription: string[] | string) {
    let description: string;
    if (Array.isArray(valuesOrDescription)) {
      description = `Valores conflitantes para ${field}: ${valuesOrDescription.join(", ")}`;
    } else {
      description = valuesOrDescription;
    }
    
    conflicts.push({
      type: "data_consistency",
      field,
      description,
    });
}
   
   private extractFieldValues(content: string, field: string): string[] {
     const values: string[] = [];
     
     switch (field) {
       case "placa":
         // License plate pattern: ABC1D23 or ABC1234
         const placaMatches = content.match(/[A-Z]{3}[0-9][A-Z0-9][0-9]{2}/gi) || 
                            content.match(/[A-Z]{3}[0-9]{4}/gi);
         if (placaMatches) {
           values.push(...placaMatches.map(m => m.toUpperCase()));
         }
         break;
         
       case "numeroAuto":
         // Infraction number pattern: AE followed by 8 digits
         const numeroAutoMatches = content.match(/AE\d{8}/gi);
         if (numeroAutoMatches) {
           values.push(...numeroAutoMatches);
         }
         break;
         
       case "orgaoAutuador":
         // Issuing authority patterns
         const orgaoAutuadorMatches = content.match(/(DETRAN-SP|PRF|CET|Prefeitura|Polícia Rodoviária Federal|Polícia Militar)/gi);
         if (orgaoAutuadorMatches) {
           values.push(...orgaoAutuadorMatches);
         }
         break;
         
       case "codigoInfracao":
         // Infraction code pattern: 3 digits followed by optional letter and optional dash
         const codigoInfracaoMatches = content.match(/\d{3}[A-Z]?/gi);
         if (codigoInfracaoMatches) {
           values.push(...codigoInfracaoMatches);
         }
         break;
         
       case "artigo":
         // Article pattern: Art. or Artigo followed by number and optional letter
         const artigoMatches = content.match(/(?:Art\.|Artigo)\s*\d+[A-Z]?/gi);
         if (artigoMatches) {
           values.push(...artigoMatches);
         }
         break;
         
       case "valor":
         // Currency pattern: R$ followed by numbers with optional thousands separators and decimal
         const valorMatches = content.match(/R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?/gi);
         if (valorMatches) {
           // Extract just the numeric part
           values.push(...valorMatches.map(m => m.replace(/[R$\s]/g, '')));
         }
         break;
         
       case "pontos":
         // Points pattern: number followed by "pontos" or just a small number
         const pontosMatches = content.match(/\b\d{1,2}\s*pontos?\b/gi) || 
                              content.match(/\b[1-7]\b/g); // Assuming points are 1-7
         if (pontosMatches) {
           values.push(...pontosMatches.map(m => m.replace(/\s*pontos?/gi, '')));
         }
         break;
         
       case "dataInfracao":
         // Date pattern: DD/MM/YYYY
         const dataMatches = content.match(/\d{2}\/\d{2}\/\d{4}/gi);
         if (dataMatches) {
           values.push(...dataMatches);
         }
         break;
         
       default:
         // For unknown fields, return empty array
         break;
     }
     
     return values;
   }
 }
