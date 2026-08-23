/**
 * Agente: pricing-agent
 * Define preço e condições de pagamento
 */

import { BaseAgent } from "@/agents/base-agent";
import type { CaseContext } from "@/lib/types/agent-interfaces";

export class PricingAgent extends BaseAgent {
  protected name = "pricing-agent";
  protected version = "1.0.0";

  protected async process(context: CaseContext): Promise<CaseContext> {
    const offer = this.calculateOffer(context);
    context.pricing = offer;
    this.recordUsage(["pricing"]);

    return context;
  }

  private calculateOffer(context: CaseContext) {
    const service = context.service.tipo;
    const isNew = !context.user.cpf; // usuário novo se não tem CPF salvo
    const hasActiveCase = false; // TODO: verificar no banco

    // Preços base (em centavos)
    const basePrices: Record<string, number> = {
      recurso_multa: 9700,
      advertencia_escrita: 4700,
      indicacao_condutor: 4700,
      analise_tecnica: 0,
      suspensao_cnh: 14700,
      cassacao_cnh: 19700,
      relatorio_tecnico: 24700,
      recurso_antt: 14700,
      recurso_tacografo: 14700,
      excesso_peso: 14700,
      transporte_perigosos: 19700,
      contestacao_autuacao_transporte: 14700,
    };

    const basePrice = basePrices[context.service.tipo] || 9700;

    // Aplicar desconto para novos usuários em serviços pagos
    let finalPrice = basePrice;
    let discountLabel: string | undefined;

    if (isNew && basePrice > 0) {
      finalPrice = Math.round(basePrice * 0.8); // 20% desconto primeira compra
      discountLabel = "Desconto primeira compra";
    }

    // Oportunidade de upsell
    let upsell: { service: string; priceCents: number; label: string } | undefined;

    if (context.service.tipo === "recurso_multa") {
      upsell = {
        service: "analise_tecnica",
        priceCents: 0,
        label: "Análise técnica gratuita inclusa",
      };
    }

    return {
      service: context.service.tipo,
      priceCents: finalPrice,
      originalPriceCents: basePrice,
      discountLabel,
      paymentOptions: ["pix", "credit_card", "boleto"],
      upsell,
    };
  }
}
