/**
 * Agente: onboarding-ux
 * Responsável por definir a ordem das perguntas, progressividade e reduzir abandono
 */

import { BaseAgent } from "@/agents/base-agent";
import type { CaseContext } from "@/lib/types/agent-interfaces";

export class OnboardingUXAgent extends BaseAgent {
  protected name = "onboarding-ux";
  protected version = "1.0.0";

  protected async process(context: CaseContext): Promise<CaseContext> {
    // Definir ordem dos steps baseada no usuário
    const stepOrder = this.determineStepOrder(context);
    const fieldRequirements = this.determineFieldRequirements(context);
    const progression = this.determineProgression(context);

    context.metadata.onboardingConfig = {
      stepOrder,
      fieldRequirements,
      progression,
      currentPhase: context.infraction.fotos?.length ? "analysis" : "data_collection",
    };

    this.recordUsage(["onboarding-config", "step-order", "field-requirements"]);

    return context;
  }

  private determineStepOrder(context: CaseContext): string[] {
    // FASE 1 - GRÁTIS (Steps 1-3)
    // FASE 2 - PAGO (Steps 4-6)
    return [
      "service_selection", // Step 1: O que aconteceu?
      "infraction_type", // Step 2: Tipo de infração
      "infraction_data", // Step 3: Dados da multa + upload
      "analysis_result", // Step 4: Análise gratuita
      "qualification_payment", // Step 5: Qualificação + Pagamento
      "case_review", // Step 6: Revisão do caso
      "document_generation", // Step 7: Geração do documento
      "document_preview", // Step 8: Pré-visualização
      "document_delivery", // Step 9: Entrega final
    ];
  }

  private determineFieldRequirements(context: CaseContext) {
    return {
      // Fase 1 - Obrigatórios
      service: { required: true, step: 1 },
      infractionType: { required: true, step: 2 },
      placa: { required: true, step: 2 },
      numeroAuto: { required: true, step: 2 },
      orgaoAutuador: { required: true, step: 2 },

      // Opcionais (apenas aceleram)
      uploadNotificacao: { required: false, step: 2 },
      uploadCnh: { required: false, step: 2 },
      uploadCrlv: { required: false, step: 2 },

      // Fase 2 - Obrigatórios para gerar documento
      nome: { required: true, step: 4 },
      cpf: { required: true, step: 4 },
      cnh: { required: true, step: 4 },
      endereco: { required: true, step: 4 },
      cidade: { required: true, step: 4 },
      uf: { required: true, step: 4 },
      rg: { required: false, step: 4 },
      nacionalidade: { required: false, step: 4, default: "Brasileiro" },
      estadoCivil: { required: false, step: 4 },
      profissao: { required: false, step: 4 },
    };
  }

  private determineProgression(context: CaseContext) {
    return {
      // Auto-advance quando campos obrigatórios preenchidos
      autoAdvance: true,
      // Permitir voltar
      allowBack: true,
      // Salvar progresso no localStorage
      persistProgress: true,
    };
  }
}
