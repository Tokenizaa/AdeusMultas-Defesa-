/**
 * Agente: onboarding-copywriter
 * Responsável por escrever todos os textos do onboarding em linguagem simples
 */

import { BaseAgent } from "@/agents/base-agent";
import type { CaseContext } from "@/lib/types/agent-interfaces";

export class OnboardingCopywriterAgent extends BaseAgent {
  protected name = "onboarding-copywriter";
  protected version = "1.0.0";

  protected async process(context: CaseContext): Promise<CaseContext> {
    const copy = this.generateCopy(context);

    context.metadata.copy = copy;
    this.recordUsage(["onboarding-copy"]);

    return context;
  }

  private generateCopy(context: CaseContext) {
    const phase = this.getCurrentPhase(context);

    return {
      // Títulos dos steps
      titles: {
        step1: this.getStepTitle(1, context),
        step2: this.getStepTitle(2, context),
        step3: this.getStepTitle(3, context),
        step4: this.getStepTitle(4, context),
        step5: this.getStepTitle(5, context),
        step6: this.getStepTitle(6, context),
        step7: this.getStepTitle(7, context),
        step8: this.getStepTitle(8, context),
        step9: this.getStepTitle(9, context),
      },

      // Subtítulos
      subtitles: {
        step1: "O primeiro passo é gratuito e leva menos de 3 minutos.",
        step2: "Vamos identificar que tipo de infração foi.",
        step3: "Os dados estão na sua notificação. Se tiver a foto, a gente lê pra você.",
        step4: "Resultado completo — sem custo. Veja o que encontramos.",
        step5: "Só precisamos dos seus dados para gerar o documento oficial.",
        step6: "Confira se está tudo certo antes de gerar o documento.",
        step7: "Estamos montando seu documento...",
        step8: "Pronto! Confira o documento antes de baixar.",
        step9: "Sua defesa está pronta. Baixe e protocole.",
      },

      // Labels dos campos
      labels: {
        service: "O que aconteceu?",
        infractionType: "Tipo de infração",
        placa: "Placa do veículo",
        numeroAuto: "Número do Auto",
        orgaoAutuador: "Órgão que multou",
        nome: "Nome completo",
        cpf: "CPF",
        cnh: "Número da CNH",
        rg: "RG (opcional)",
        endereco: "Endereço completo",
        cidade: "Cidade",
        uf: "UF",
        nacionalidade: "Nacionalidade",
        estadoCivil: "Estado civil",
        profissao: "Profissão (opcional)",
        uploadNotificacao: "Foto da notificação",
        uploadCnh: "Foto da CNH",
        uploadCrlv: "Foto do CRLV",
      },

      // Placeholders
      placeholders: {
        placa: "ABC1D23",
        numeroAuto: "AE12345678",
        orgaoAutuador: "Ex: DETRAN-SP",
        nome: "João Silva Santos",
        cpf: "000.000.000-00",
        cnh: "12345678901",
        rg: "12.345.678-9",
        endereco: "Rua das Flores, 123",
        cidade: "São Paulo",
        uf: "SP",
      },

      // Textos de ajuda (helper text)
      helpers: {
        placa: "Está no canto superior da notificação.",
        numeroAuto: "Fica ao lado do código de barras.",
        orgaoAutuador: "Ex: DETRAN-SP, PRF, CET.",
        cpf: "Usado para identificar o requerente na defesa.",
        cnh: "Número da Carteira Nacional de Habilitação.",
        uploadNotificacao: "Opcional. Se enviar, a IA lê os dados pra você.",
        uploadCnh: "Opcional. Ajuda a preencher os dados automaticamente.",
      },

      // Botões
      buttons: {
        step1: "Continuar",
        step2: "Continuar",
        step3: "Analisar minha multa grátis",
        step4: "Quero gerar minha defesa",
        step5: "Pagar e gerar defesa",
        step6: "Gerar minha defesa",
        step8: "Baixar PDF",
        step9: "Voltar ao início",
      },

      // Mensagens de erro
      errors: {
        required: "Este campo é obrigatório.",
        invalidCpf: "CPF inválido. Verifique os números.",
        invalidCnh: "CNH inválida. Deve ter 11 números.",
        invalidPlate: "Placa inválida. Use formato ABC1D23 ou ABC1234.",
        uploadFailed: "Não foi possível enviar o arquivo. Tente novamente.",
        ocrFailed: "Não conseguimos ler o documento. Tente outra foto ou digite os dados.",
        analysisFailed: "Não foi possível analisar. Tente novamente ou entre em contato.",
        paymentFailed: "Pagamento não aprovado. Tente outro método.",
      },

      // Mensagens de sucesso
      success: {
        analysisComplete: "Análise concluída! Encontramos pontos para sua defesa.",
        documentGenerated: "Sua defesa foi gerada com sucesso!",
        documentSaved: "Documento salvo. Você pode baixar quando quiser.",
      },

      // Textos de progresso
      progress: {
        step1: "●○○○○○○○○○  10%  •  Iniciando...",
        step2: "●●○○○○○○○○  20%  •  Tipo de infração",
        step3: "●●●○○○○○○○  30%  •  Dados da multa",
        step4: "●●●●●○○○○○  50%  •  Análise grátis pronta!",
        step5: "●●●●●●○○○○  60%  •  Seus dados + pagamento",
        step6: "●●●●●●●○○○  70%  •  Conferindo documento",
        step7: "●●●●●●●●○○  80%  •  Gerando documento",
        step8: "●●●●●●●●●○  90%  •  Pré-visualização",
        step9: "●●●●●●●●●●  100%  •  Concluído!",
      },

      // Textos de upload
      upload: {
        title: "Tem uma foto da notificação?",
        subtitle: "Ela pode nos ajudar a preencher os dados automaticamente.",
        dragDrop: "Arraste a foto aqui ou clique para escolher",
        formats: "Aceitamos JPG, PNG e PDF (máx. 10MB)",
        optional: "Não tem a foto agora? Sem problema — você pode digitar os dados.",
      },

      // Textos de análise
      analysis: {
        loading: "Analisando sua multa...",
        loadingDetail: "Nossa IA está lendo os dados e buscando fundamentos jurídicos.",
        empty: "Ainda não temos análise. Complete os passos anteriores.",
      },

      // Textos de pagamento
      payment: {
        title: "Escolha como pagar",
        pixBadge: "Mais rápido",
        pixDesc: "Pagamento instantâneo, compensação imediata",
        cardDesc: "Até 12x sem juros",
        boletoDesc: "Vencimento em 3 dias úteis",
      },
    };
  }

  private getCurrentPhase(context: CaseContext): "free" | "paid" {
    // Steps 1-3 são grátis, 4+ são pagos
    const currentStep = this.getCurrentStep(context);
    return currentStep <= 3 ? "free" : "paid";
  }

  private getCurrentStep(context: CaseContext): number {
    // Determinar step atual baseado no contexto
    if (context.metadata.onboardingConfig?.currentStep) {
      return context.metadata.onboardingConfig.currentStep;
    }
    // Fallback baseado no que foi preenchido
    if (!context.service.tipo) return 1;
    if (!context.infraction.codigoInfracao) return 2;
    if (!context.classification) return 3;
    if (!context.user.nome) return 4;
    if (!context.documentPlan) return 5;
    if (!context.draft) return 6;
    if (!context.reviewedDraft) return 7;
    if (!context.metadata.documentId) return 8;
    return 9;
  }

  private getStepTitle(step: number, context: CaseContext): string {
    const phase = this.getCurrentPhase(context);
    const prefix = phase === "free" ? "🔓 GRÁTIS — " : "🔒 PAGO — ";

    const titles = {
      1: "O que aconteceu?",
      2: "Tipo de infração",
      3: "Dados da multa",
      4: "Sua análise grátis",
      5: "Seus dados + Pagamento",
      6: "Confira sua defesa",
      7: "Gerando documento",
      8: "Pré-visualização",
      9: "Download",
    };

    return `${prefix}${titles[step as keyof typeof titles] || "Passo"}`;
  }
}
