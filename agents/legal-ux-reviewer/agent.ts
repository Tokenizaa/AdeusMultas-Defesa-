/**
 * Agente: legal-ux-reviewer
 * Transforma jargão jurídico em linguagem simples
 */

import { BaseAgent } from "@/agents/base-agent";
import type { CaseContext } from "@/lib/types/agent-interfaces";

export class LegalUXReviewerAgent extends BaseAgent {
  protected name = "legal-ux-reviewer";
  protected version = "1.0.0";

  protected async process(context: CaseContext): Promise<CaseContext> {
    const simplified = this.simplifyTexts(context);
    context.metadata.simplifiedCopy = simplified;
    this.recordUsage(["legal-ux-review"]);

    return context;
  }

  private simplifyTexts(context: CaseContext) {
    const translations: Record<string, { original: string; simple: string }> = {
      // Campos do formulário
"Órgão Autuador": {
         original: "Órgão Autuador",
         simple: "Quem aplicou a multa? (Ex: DETRAN-SP, PRF, Prefeitura)",
       },
       "Auto de Infração": {
         original: "Número do Auto de Infração",
         simple: "Número do Auto (fica no canto da notificação)",
       },
       "Notificação de Autuação": {
         original: "Notificação de Autuação",
         simple: "A carta/aviso que você recebeu da multa",
       },
      "Defesa Prévia": {
        original: "Defesa Prévia",
        simple: "Sua primeira chance de se defender (antes de ir para a JARI)",
      },
      JARI: {
        original: "JARI",
        simple: "Junta Administrativa de Recursos de Infrações (segunda instância)",
      },
      CETRAN: {
        original: "CETRAN",
        simple: "Conselho Estadual de Trânsito (terceira instância)",
      },
      "Auto de Infração de Trânsito": {
        original: "Auto de Infração de Trânsito (AIT)",
        simple: "O documento oficial que registra a multa",
      },
      "Notificação de Penalidade": {
        original: "Notificação de Penalidade (NP)",
        simple: "A carta dizendo que você perdeu pontos ou vai pagar multa",
      },
      "Indicação de Condutor": {
        original: "Indicação de Condutor",
        simple: "Dizer quem estava dirigindo na hora da multa",
      },
      "Conversão em Advertência": {
        original: "Conversão em Advertência por Escrito",
        simple: "Pedir para transformar a multa em apenas um aviso (sem pontos)",
      },
      Recurso: {
        original: "Recurso Administrativo",
        simple: "Pedido formal para cancelar ou reduzir a multa",
      },
      "Fundamentação Jurídica": {
        original: "Fundamentação Jurídica",
        simple: "As leis e argumentos que usamos para defender você",
      },
      Pedidos: {
        original: "Dos Pedidos",
        simple: "O que estamos pedindo para o órgão fazer",
      },
      Qualificação: {
        original: "Qualificação do Requerente",
        simple: "Seus dados pessoais (nome, CPF, endereço...)",
      },
      Fatos: {
        original: "Dos Fatos",
        simple: "O que aconteceu, contado de forma simples",
      },
      "Do Direito": {
        original: "Do Direito",
        simple: "As leis e argumentos que defendem você",
      },
      "Dos Pedidos": {
        original: "Dos Pedidos",
        simple: "O que estamos pedindo para o órgão fazer",
      },
    };

    // Aplicar traduções ao contexto se necessário
    return {
      fieldLabels: this.simplifyLabels(),
      helpers: this.generateHelpers(),
      errorMessages: this.simplifyErrors(),
    };
  }

  private simplifyLabels() {
    return {
      placa: "Placa do veículo",
      numeroAuto: "Número do Auto de Infração",
      orgaoAutuador: "Quem aplicou a multa",
      codigoInfracao: "Código da infração",
      artigo: "Artigo do CTB",
      valor: "Valor da multa",
      pontos: "Pontos na CNH",
      gravidade: "Gravidade da infração",
      dataInfracao: "Data da infração",
      localInfracao: "Local da infração",
      nome: "Nome completo",
      cpf: "CPF",
      cnh: "Número da CNH",
      rg: "RG",
      endereco: "Endereço completo",
      cidade: "Cidade",
      uf: "Estado (UF)",
      nacionalidade: "Nacionalidade",
      estadoCivil: "Estado civil",
      profissao: "Profissão",
    };
  }

  private generateHelpers() {
    return {
      placa: "Está no canto superior da notificação. Ex: ABC1D23",
      numeroAuto: "Fica ao lado do código de barras. Ex: AE12345678",
      orgaoAutuador: "Ex: DETRAN-SP, PRF, CET, Prefeitura",
      cpf: "Usado para identificar o requerente na defesa",
      cnh: "Número da Carteira Nacional de Habilitação",
      uploadNotificacao: "Opcional. Se enviar, a IA lê os dados pra você.",
      uploadCnh: "Opcional. Ajuda a preencher seus dados automaticamente.",
      codigoInfracao: "Ex: 745-50. Fica na notificação.",
      artigo: "Ex: Art. 218 I. Vem na notificação.",
      valor: "Valor da multa em reais. Ex: 293.47",
      pontos: "Pontos que vão na CNH. Ex: 7",
      gravidade: "Leve, Média, Grave ou Gravíssima",
    };
  }

  private simplifyErrors() {
    return {
      required: "Campo obrigatório. Por favor, preencha.",
      invalidCpf: "CPF inválido. Verifique os 11 números.",
      invalidCnh: "CNH inválida. Deve ter 11 números.",
      invalidPlate: "Placa inválida. Use formato ABC1D23 ou ABC1234.",
      uploadFailed: "Não foi possível enviar. Tente outro arquivo.",
      ocrFailed: "Não conseguimos ler. Tente foto mais nítida ou digite manual.",
      analysisFailed: "Erro na análise. Tente novamente ou entre em contato.",
      paymentFailed: "Pagamento não aprovado. Tente outro método.",
    };
  }
}
