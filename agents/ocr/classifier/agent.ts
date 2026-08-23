/**
 * Agente: ocr-document-classifier
 * Identifica o tipo de documento a partir de imagem / texto extraído
 */

import { BaseAgent } from "@/agents/base-agent";
import type { CaseContext } from "@/lib/types/agent-interfaces";

export class OCRClassifierAgent extends BaseAgent {
  protected name = "ocr-document-classifier";
  protected version = "1.0.0";

  public async process(context: CaseContext): Promise<CaseContext> {
    const rawText = context.ocr?.raw_text || "";
    const classification = this.classifyDocument(rawText);

    context.ocr = {
      ...(context.ocr || {}),
      raw_text: rawText,
      document_type: classification.document_type,
      confidence: classification.confidence,
      method: classification.method,
    };

    context.metadata.stepsCompleted.push("ocr-classifier");
    this.recordUsage(["document-classification", classification.document_type]);

    return context;
  }

  public classifyDocument(text: string): {
    document_type: "notificacao_autuacao" | "nip" | "cnh" | "crlv" | "ait" | "unknown";
    confidence: number;
    method: "layout" | "text" | "barcode" | "ml";
  } {
    const normalized = text.toLowerCase();

    if (
      normalized.includes("notificação da autuação") ||
      normalized.includes("notificacao de autuacao") ||
      normalized.includes("defesa da autuação")
    ) {
      return {
        document_type: "notificacao_autuacao",
        confidence: 0.95,
        method: "text",
      };
    }

    if (
      normalized.includes("notificação de penalidade") ||
      normalized.includes("notificacao de imposicao de penalidade") ||
      normalized.includes("nip")
    ) {
      return {
        document_type: "nip",
        confidence: 0.92,
        method: "text",
      };
    }

    if (
      normalized.includes("carteira nacional de habilitação") ||
      normalized.includes("cnh") ||
      normalized.includes("permissão para dirigir")
    ) {
      return {
        document_type: "cnh",
        confidence: 0.94,
        method: "text",
      };
    }

    if (
      normalized.includes("certificado de registro e licenciamento") ||
      normalized.includes("crlv") ||
      normalized.includes("renavam")
    ) {
      return {
        document_type: "crlv",
        confidence: 0.91,
        method: "text",
      };
    }

    if (
      normalized.includes("auto de infração") ||
      normalized.includes("ait") ||
      normalized.includes("enquadramento")
    ) {
      return {
        document_type: "ait",
        confidence: 0.88,
        method: "text",
      };
    }

    // Default: se houver dados de trânsito, classificar como autuação
    if (normalized.length > 20) {
      return {
        document_type: "notificacao_autuacao",
        confidence: 0.75,
        method: "text",
      };
    }

    return {
      document_type: "unknown",
      confidence: 0.4,
      method: "layout",
    };
  }
}
