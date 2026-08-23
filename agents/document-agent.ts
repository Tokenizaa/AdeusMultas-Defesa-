import { BaseAgent } from "@/agents/base-agent";
import type { CaseContext, UserInfo, InfractionInfo } from "@/lib/types/agent-interfaces";

/**
 * Agente: document-agent
 * Responsável pela construção e formatação de documentos de defesa de trânsito.
 * Opera sobre templates de documentos (defesa prévia, recurso em 1ª instância, recurso em 2ª instância, mandado de segurança, etc.),
 * preenchendo com dados do caso, fundamentação jurídica fornecida pelo knowledge-agent e análise do ai-analysis-agent.
 * Gera saída em PDF e mantém versões dos documentos ao longo do fluxo processual.
 */
export class DocumentAgent extends BaseAgent {
  protected name = "document-agent";
  protected version = "1.0.0";

  protected async process(context: CaseContext): Promise<CaseContext> {
    // 1. Determine document type based on case stage
    const documentType = this.determineDocumentType(context);
    
    // 2. Load appropriate template
    const template = await this.loadTemplate(documentType);
    
    // 3. Populate template with case data
    const populatedDocument = await this.populateTemplate(template, context);
    
    // 4. Apply legal formatting and styling
    const formattedDocument = await this.applyLegalFormatting(populatedDocument, context);
    
    // 5. Generate PDF/DOCX output
    const outputDocument = await this.generateOutputDocument(formattedDocument, documentType);
    
    // 6. Version control and document history
    await this.manageDocumentVersion(context, outputDocument);
    
    // 7. Record usage for telemetry
    this.recordUsage([
      "template-management", 
      "document-population", 
      "legal-formatting", 
      "document-generation",
      "version-control"
    ]);
    
    // 8. Mark this step as completed
    context.metadata.stepsCompleted.push("document-agent");
    
    return context;
  }
  
  /**
   * Determine the appropriate document type based on case status
   */
  private determineDocumentType(context: CaseContext): string {
    // In a real implementation, this would check case status, stage, etc.
    // For now, we'll return a default document type
    
    // Check if there are existing steps to determine where we are in the process
    const stepsCompleted = context.metadata?.stepsCompleted || [];
    
    if (stepsCompleted.includes("communication-agent")) {
      // If we've already communicated, likely in later stages
      return "recurso_em_1a_instancia";
    } else if (stepsCompleted.includes("ai-analysis-agent")) {
      // If we've done AI analysis, we're ready for initial defense
      return "defesa_previa";
    } else {
      // Default to initial defense
      return "defesa_previa";
    }
  }
  
  /**
   * Load the appropriate template for the document type
   */
  private async loadTemplate(documentType: string): Promise<string> {
    // In a real implementation, this would load from a template repository
    // or use the supabase-repository-pattern skill to fetch from database
    
    // For now, return a basic template string
    const templates: Record<string, string> = {
      "defesa_previa": `
DEFESA PRÉVIA
Processo: {{numero_auto}}
Autuado: {{placa}}
Data da infração: {{data_infracao}}

EXCELENTÍSSIMO SENHOR JUIZ DE DIREITO DA {{vara}} VARA DE TRÂNSITO DA COMARCA DE {{cidade}} - {{uf}}

{{nome}}, brasileiro(a), {{cpf}}, residente e domiciliado(a) ao {{endereco}}, por meio de seu advogado infrascrito, vem, respeitosamente, à presença de Vossa Excelência, apresentar

DEFESA PRÉVIA
em face do Auto de Infração de Trânsito nº {{numero_auto}}, lavrado pelo {{orgao_autuador}} em {{data_infracao}}, pelos fatos e fundamentos a seguir expostos:

I - DOS FATOS
No dia {{data_infracao}}, o autor foi autuado sob o código {{codigo_infracao}}, cuja descrição é "{{descricao_infracao}}", conforme Auto de Infração de Trânsito em anexo.

II - DO DIREITO
{{fundamentacao_juridica}}

III - DO PEDIDO
Diante do exposto, requer-se:
{{pedidos}}

Termos em que,
Pede deferimento.

{{local}}, {{data_atual}}

{{nome_do_advogado}}
OAB/{{uf}} {{numero_oab}}
      `,
      
      "recurso_em_1a_instancia": `
RECURSO EM PRIMEIRA INSTÂNCIA
Processo: {{numero_auto}}
Autuado: {{placa}}
Data da infração: {{data_infracao}}

EXCELENTÍSSIMO SENHOR JUIZ DE DIREITO DA {{vara}} VARA DE TRÂNSITO DA COMARCA DE {{cidade}} - {{uf}}

{{nome}}, brasileiro(a), {{cpf}}, residente e domiciliado(a) ao {{endereco}}, por meio de seu advogado infrascrito, vem, respeitosamente, à presença de Vossa Excelência, apresentar

RECURSO
em face da decisão que julgou parcialmente procedente a pretensão autoral, pelos fatos e fundamentos a seguir expostos:

I - DOS FATOS
{{resumo_fatos}}

II - DO RECURSO
{{fundamentacao_recurso}}

III - DO PEDIDO
Diante do exposto, requer-se:
{{pedidos_recurso}}

Termos em que,
Pede deferimento.

{{local}}, {{data_atual}}

{{nome_do_advogado}}
OAB/{{uf}} {{numero_oab}}
      `,
      
      "default": `
DOCUMENTO DE DEFESA DE TRÂNSITO
Processo: {{numero_auto}}
Autuado: {{placa}}
Data: {{data_atual}}

{{conteudo}}
      `
    };
    
    return templates[documentType] || templates.default;
  }
  
  /**
   * Populate the template with case data
   */
  private async populateTemplate(template: string, context: CaseContext): Promise<string> {
    if (!context.infraction || !context.user) {
      return template;
    }
    
    // Extract data from context
    const infraction = context.infraction;
    const user = context.user;
    
    // Prepare replacement values
    const replacements: Record<string, string> = {
      "{{numero_auto}}": infraction.numeroAuto || "",
      "{{placa}}": infraction.placa || "",
      "{{data_infracao}}": infraction.data || "",
      "{{orgao_autuador}}": infraction.orgaoAutuador || "",
      "{{codigo_infracao}}": infraction.codigoInfracao || "",
      "{{descricao_infracao}}": infraction.descricao || "",
      "{{nome}}": user.nome || "",
      "{{cpf}}": user.cpf || "",
      "{{endereco}}": user.endereco || "",
      "{{cidade}}": user.cidade || "",
      "{{uf}}": user.uf || "",
      "{{data_atual}}": new Date().toLocaleDateString('pt-BR'),
      "{{local}}": `${user.cidade || ''}, ${user.uf || ''}`,
      "{{nome_do_advogado}}": "Advogado(a) Inscrito(a) na OAB", // Would come from user profile in real implementation
      "{{numero_oab}}": "00000", // Would come from user profile in real implementation
      "{{vara}}": "1ª", // Would come from court data in real implementation
      
      // Legal content from AI analysis
      "{{fundamentacao_juridica}}": context.metadata?.legalInterpretation?.descricao || "Fundamentação jurídica a ser elaborada",
      "{{fundamentacao_recurso}}": context.metadata?.jurisprudence?.map(j => 
        `Precedente: ${j.fonte} - ${j.numero}: ${j.ementa}`
      ).join("\n\n") || "Jurisprudência a ser pesquisada",
      
      "{{pedidos}}": context.metadata?.defenseArguments?.length > 0 
        ? context.metadata.defenseArguments.map((arg, i) => `${i+1}. ${arg}`).join("\n") 
        : "1. Annulamento da infração por falta de provas suficientes\n2. Subsidiariamente, aplicação da mínima pena",
      
      "{{pedidos_recurso}}": "1. Reforma da decisão recorrida\n2. Annulamento da infração de trânsito\n3. Condenação da parte autôra nas custas e honorários"
    };
    
    // Apply replacements
    let populated = template;
    for (const [placeholder, value] of Object.entries(replacements)) {
      populated = populated.split(placeholder).join(value);
    }
    
    return populated;
  }
  
  /**
   * Apply legal formatting and styling to the document
   */
  private async applyLegalFormatting(document: string, context: CaseContext): Promise<string> {
    // In a real implementation, this would apply specific legal formatting rules
    // such as line spacing, font requirements, margin specifications, etc.
    
    // For now, we'll just ensure proper paragraph formatting
    const lines = document.split('\n');
    const formattedLines = lines.map(line => line.trim()).filter(line => line.length > 0);
    
    return formattedLines.join('\n\n');
  }
  
  /**
   * Generate the final output document (PDF/DOCX)
   */
  private async generateOutputDocument(formattedDocument: string, documentType: string): Promise<{ 
    content: string; 
    format: 'pdf' | 'docx'; 
    metadata: Record<string, any> 
  }> {
    // In a real implementation, this would use the pdf-creator or docx skills
    // to generate actual PDF or DOCX files
    
    // For now, we'll return the formatted document as text with metadata
    // indicating it's ready for PDF/DOCX conversion
    
    return {
      content: formattedDocument,
      format: 'pdf', // Default to PDF as mentioned in requirements
      metadata: {
        documentType,
        generatedAt: new Date().toISOString(),
        pageCount: Math.max(1, Math.ceil(formattedDocument.length / 1000)), // Rough estimate
        wordCount: formattedDocument.split(/\s+/).length,
        characterCount: formattedDocument.length
      }
    };
  }
  
  /**
   * Manage document version control and history
   */
  private async manageDocumentVersion(context: CaseContext, outputDocument: any): Promise<void> {
    // In a real implementation, this would use the supabase-repository-pattern skill
    // to store document versions in a database
    
    // For now, we'll just track version information in metadata
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
    
    // Generate a simple hash for version tracking
    const hash = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Update document metadata
    context.metadata.documentId = `doc_${hash}`;
    context.metadata.version = "1.0";
    context.metadata.hash = hash;
    context.metadata.converted = true;
    
    // Store document output information
    context.metadata.documentOutput = {
      id: context.metadata.documentId,
      version: context.metadata.version,
      type: outputDocument.format,
      contentLength: outputDocument.content.length,
      metadata: outputDocument.metadata
    };
  }
}