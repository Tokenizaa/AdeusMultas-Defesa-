import { BaseAgent } from "@/agents/base-agent";
import type { CaseContext, OCRResult, InfractionInfo, UserInfo } from "@/lib/types/agent-interfaces";

/**
 * Agente: ai-analysis-agent
 * Responsável pela análise de multas de trânsito com inteligência artificial.
 * Executa extração de dados via OCR de documentos de infração, interpreta artigos do CTB e resoluções CONTRAN,
 * aplica jurisprudência relevante e gera minutas de defesa.
 */
export class AiAnalysisAgent extends BaseAgent {
  protected name = "ai-analysis-agent";
  protected version = "1.0.0";

  protected async process(context: CaseContext): Promise<CaseContext> {
    // 1. Process OCR data if available
    if (context.ocr && context.ocr.extracted_fields) {
      await this.processOcrData(context);
    }
    
    // 2. Validate extracted infraction data
    if (context.infraction) {
      await this.validateInfractionData(context);
    }
    
    // 3. Interpret CTB articles and apply legal rules
    if (context.infraction?.codigoInfracao) {
      await this.interpretCtbArticles(context);
    }
    
    // 4. Research jurisprudence and precedents
    await this.researchJurisprudence(context);
    
    // 5. Generate defense arguments and minutes
    await this.generateDefenseArguments(context);
    
    // 6. Record usage for telemetry
    this.recordUsage([
      "ocr-processing", 
      "infraction-validation", 
      "ctb-interpretation", 
      "jurisprudence-research", 
      "defense-generation"
    ]);
    
    // 7. Mark this step as completed
    context.metadata.stepsCompleted.push("ai-analysis-agent");
    
    return context;
  }
  
  /**
   * Process OCR data to extract and validate infraction information
   */
  private async processOcrData(context: CaseContext): Promise<void> {
    // In a real implementation, this would use the 9router-ocr skill or similar
    // For now, we'll simulate processing OCR results
    
    if (!context.ocr?.extracted_fields) {
      return;
    }
    
    // Extract infraction data from OCR results
    const infraction: InfractionInfo = {
      placa: context.ocr.extracted_fields.placa?.value || "",
      numeroAuto: context.ocr.extracted_fields.numero_auto?.value || "",
      orgaoAutuador: context.ocr.extracted_fields.orgao_autuador?.value || "",
      codigoInfracao: context.ocr.extracted_fields.codigo_infracao?.value || "",
      data: context.ocr.extracted_fields.data_infracao?.value || "",
      velocidadeMedida: context.ocr.extracted_fields.velocidade_medida 
        ? parseFloat(context.ocr.extracted_fields.velocidade_medida.value) 
        : undefined,
      velocidadeLimite: context.ocr.extracted_fields.velocidade_limite 
        ? parseFloat(context.ocr.extracted_fields.velocidade_limite.value) 
        : undefined
    };
    
    // Update context with processed infraction data
    context.infraction = infraction;
    
    // Add validated fields to metadata
    if (!context.metadata) {
      context.metadata = {
        documentId: "",
        version: "",
        hash: "",
        stepsCompleted: [],
        validatedFields: [],
        fieldErrors: {}
      };
    }
    
    // Validate each extracted field
    Object.entries(context.ocr.extracted_fields).forEach(([fieldName, fieldResult]) => {
      const validatedField: any = {
        campo: fieldName,
        valor: fieldResult.value,
        fonte_confianca: fieldResult.confidence,
        status: fieldResult.confidence > 0.8 ? 'valid' : 
                 fieldResult.confidence > 0.6 ? 'warning' : 'invalid'
      };
      
      context.metadata.validatedFields.push(validatedField);
    });
  }
  
  /**
   * Validate infraction data for consistency and completeness
   */
  private async validateInfractionData(context: CaseContext): Promise<void> {
    if (!context.infraction) {
      return;
    }
    
    const errors: Record<string, number> = {};
    
    // Validate plate format (Brazilian standard)
    if (context.infraction.placa) {
      const plateRegex = /^[A-Z]{3}[0-9][0-9A-Z][0-9]{2}$/;
      if (!plateRegex.test(context.infraction.placa)) {
        errors.placa = 0.3; // Low confidence
      }
    }
    
    // Validate date format
    if (context.infraction.data) {
      const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
      if (!dateRegex.test(context.infraction.data)) {
        errors.data = 0.4; // Low confidence
      }
    }
    
    // Validate speeds if present
    if (context.infraction.velocidadeMedida && context.infraction.velocidadeLimite) {
      if (context.infraction.velocidadeMedida < 0 || context.infraction.velocidadeLimite <= 0) {
        errors.velocidade = 0.2; // Very low confidence
      } else if (context.infraction.velocidadeMedida < context.infraction.velocidadeLimite * 0.8) {
        errors.velocidade = 0.5; // Suspiciously low measured speed
      }
    }
    
    // Update field errors in metadata
    if (context.metadata) {
      context.metadata.fieldErrors = errors;
    }
  }
  
  /**
   * Interpret CTB articles and apply legal rules based on infraction code
   */
  private async interpretCtbArticles(context: CaseContext): Promise<void> {
    if (!context.infraction?.codigoInfracao) {
      return;
    }
    
    // In a real implementation, this would use the 9router-chat skill to query
    // a legal knowledge base or use NVIDIA NIM for specialized legal reasoning
    
    // Simulate CTB article interpretation based on common infraction codes
    const ctbArticles: Record<string, {
      artigo: string;
      descricao: string;
      pontos: number;
      valor: string;
    }> = {
      "121": { artigo: "Art. 121", descricao: "Dirigir sob influência de álcool", pontos: 7, valor: "R$ 2.934,70" },
      "122": { artigo: "Art. 122", descricao: "Recusar-se a submeter-se ao teste de alcoolemia", pontos: 7, valor: "R$ 2.934,70" },
      "162": { artigo: "Art. 162", descricao: "Ultrapassar a velocidade máxima permitida", pontos: [4,5,6,7], valor: "Variável" },
      "171": { artigo: "Art. 171", descricao: "Em manobra de ultrapassagem, invadir a pista contrária", pontos: 5, valor: "R$ 1.467,35" },
      "174": { artigo: "Art. 174", descricao: "Não respetar a distância de segurança entre veículos", pontos: 4, valor: "R$ 880,41" },
      "230": { artigo: "Art. 230", descricao: "Estacionar em local proibido", pontos: 0, valor: "R$ 88,41" }
    };
    
    // Add CTB interpretation to context (in a real app, this would be more sophisticated)
    if (!context.metadata) {
      context.metadata = {
        documentId: "",
        version: "",
        hash: "",
        stepsCompleted: [],
        validatedFields: [],
        fieldErrors: {}
      };
    }
    
    // Store legal interpretation in metadata for use by other agents
    const artigoInfo = ctbArticles[context.infraction.codigoInfracao];
    context.metadata.legalInterpretation = {
      codigoInfracao: context.infraction.codigoInfracao,
      ctbArtigo: artigoInfo?.artigo || "Artigo não identificado",
      descricao: artigoInfo?.descricao || "Descrição não disponível",
      pontos: Array.isArray(artigoInfo?.pontos) ? artigoInfo.pontos[0] : (artigoInfo?.pontos ?? 0),
      valorMulta: artigoInfo?.valor || "Valor não disponível"
    };
  }
  
  /**
   * Research jurisprudence and precedents related to the infraction
   */
  private async researchJurisprudence(context: CaseContext): Promise<void> {
    // In a real implementation, this would use the 9router-chat skill with web search
    // or connect to legal databases to find relevant precedents
    
    if (!context.metadata) {
      context.metadata = {
        documentId: "",
        version: "",
        hash: "",
        stepsCompleted: [],
        validatedFields: [],
        fieldErrors: {}
      };
    }
    
    // Simulate jurisprudence research results
    context.metadata.jurisprudence = [
      {
        fonte: "STJ",
        numero: "REsp 1.234.567/SP",
        ementa: "Não constitui infração grave a ultrapassagem de velocidade quando há falha no equipamento de medição.",
        relevancia: "Alta"
      },
      {
        fonte: "TJSP",
        numero: "Apelação 987.654/SP",
        ementa: "A falta de sinalização adequada limita a aplicação de multas por excesso de velocidade.",
        relevancia: "Média"
      }
    ];
  }
  
  /**
   * Generate defense arguments and minutes based on analysis
   */
  private async generateDefenseArguments(context: CaseContext): Promise<void> {
    // In a real implementation, this would use the 9router-chat skill or NVIDIA NIM
    // to generate legal arguments based on the analysis
    
    if (!context.metadata) {
      context.metadata = {
        documentId: "",
        version: "",
        hash: "",
        stepsCompleted: [],
        validatedFields: [],
        fieldErrors: []
      };
    }
    
    // Generate defense strategy based on analysis
    const defenseArgs = [];
    
    // Check for procedural defects
    if (context.infraction?.numeroAuto && context.infraction.numeroAuto.length < 10) {
      defenseArgs.push("Número do auto de infração incompleto ou irregular");
    }
    
    // Check for measurement defects (if speeding)
    if (context.infraction?.codigoInfracao === "162" && // Speeding
        context.infraction?.velocidadeMedida && 
        context.infraction?.velocidadeLimite) {
      const excesso = context.infraction.velocidadeMedida - context.infraction.velocidadeLimite;
      if (excesso < 10) {
        defenseArgs.push("Excesso de velocidade mínimo, possivelmente dentro da margem de erro do equipamento");
      }
    }
    
    // Check for notification defects
    if (context.infraction?.data) {
      // Simulate checking if notification was made within legal timeframe
      defenseArgs.push("Verificar tempestividade da notificação da infração");
    }
    
    // Store defense arguments in metadata
    context.metadata.defenseArguments = defenseArgs;
    
    // Generate a basic defense minute outline
    context.metadata.defenseMinuteOutline = {
      tipo: "Defesa Prévia",
      numero: context.infraction?.numeroAuto || "",
      fundamentacao: defenseArgs.map((arg, i) => `${i+1}. ${arg}`).join("\n"),
      pedidos: [
        "Por tão apreciável medida jurídica, requer-se a annulamento da infração em questão",
        "Em caso de indeferimento, requer-se a aplicação da pena mínima em legge"
      ]
    };
  }
}