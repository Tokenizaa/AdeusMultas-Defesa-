/**
 * Agente: document-layout
 * Aplica formatação visual profissional ao documento jurídico
 */

import { BaseAgent } from "@/agents/base-agent";
import type { CaseContext } from "@/lib/types/agent-interfaces";

export class DocumentLayoutAgent extends BaseAgent {
  protected name = "document-layout";
  protected version = "1.0.0";

  protected async process(context: CaseContext): Promise<CaseContext> {
    if (!context.reviewedDraft) {
      this.addWarning(context, "Nenhum draft revisado para formatar");
      return context;
    }

    const formatted = await this.formatDocument(context.reviewedDraft);
    context.documentHtml = formatted.html;
    context.documentCss = formatted.css;
    context.documentPageCount = formatted.pageCount;
    context.metadata.stepsCompleted.push("document-layout");
    this.recordUsage(["document-formatting"]);

    return context;
  }

  private async formatDocument(reviewedDraft: any) {
    const sections = reviewedDraft.sections || [];
    const html = this.renderHtml(sections);
    const css = this.getCss();

    return {
      html,
      css,
      pageCount: this.estimatePageCount(reviewedDraft),
    };
  }

  private renderHtml(sections: any[]): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Defesa Prévia - ${new Date().toLocaleDateString("pt-BR")}</title>
  <style>${this.getCss()}</style>
</head>
<body>
  <div class="document">
    ${this.renderHeader()}
    ${this.renderSections(sections)}
    ${this.renderFooter()}
  </div>
</body>
</html>`;
  }

  private getCss(): string {
    return `
      @page {
        size: A4;
        margin: 2.5cm 3cm 2.5cm 3cm;
        @top-center {
          content: "DEFESA PRÉVIA";
          font-size: 10pt;
          color: #666;
        }
        @bottom-center {
          content: counter(page);
          font-size: 10pt;
        }
      }

      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Times New Roman', Times, serif;
        font-size: 12pt;
        line-height: 1.6;
        color: #1a1a1a;
        background: #fff;
      }

      .document {
        max-width: 21cm;
        margin: 0 auto;
        padding: 2.5cm 3cm;
        background: white;
      }

      .header {
        text-align: center;
        font-weight: bold;
        font-size: 14pt;
        margin-bottom: 2cm;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .addressing {
        margin-bottom: 1.5cm;
      }

      .addressing p {
        margin-bottom: 0.3cm;
      }

      .qualification {
        margin-bottom: 1.5cm;
        text-align: justify;
      }

      .preamble {
        margin-bottom: 1.5cm;
        text-align: center;
      }

      .preamble .document-title {
        font-weight: bold;
        font-size: 13pt;
        text-transform: uppercase;
        margin: 0.8cm 0;
      }

      .section {
        margin-bottom: 1cm;
        text-align: justify;
      }

      .section h2 {
        font-size: 12pt;
        font-weight: bold;
        margin-bottom: 0.5cm;
        text-transform: uppercase;
      }

      .section p {
        margin-bottom: 0.3cm;
        text-indent: 1.5cm;
      }

      .arguments-list {
        margin-top: 0.5cm;
      }

      .argument-item {
        margin: 0.5cm 0;
        padding-left: 1.5cm;
        text-indent: -1.5cm;
      }

      .argument-title {
        font-weight: bold;
        font-style: italic;
      }

      .requests {
        margin-top: 1cm;
      }

      .requests ol {
        margin-left: 1.5cm;
      }

      .requests li {
        margin-bottom: 0.3cm;
        text-align: justify;
        text-indent: 0;
      }

      .closing {
        margin-top: 2cm;
        text-align: center;
      }

      .signature {
        margin-top: 3cm;
        border-top: 1px solid #000;
        width: 100%;
        max-width: 12cm;
        margin-left: auto;
        margin-right: auto;
        padding-top: 0.5cm;
      }

      .signature-line {
        border-bottom: 1px solid #000;
        width: 100%;
        max-width: 12cm;
        margin: 0 auto 0.3cm;
      }

      .signature-name {
        font-weight: bold;
      }

      .signature-details {
        font-size: 10pt;
        color: #555;
      }

      .page-break {
        page-break-before: always;
      }

      @media print {
        .no-print { display: none; }
        body { padding: 0; }
        .document { padding: 0; }
      }
    `;
  }

  private renderHeader(): string {
    return `<div class="header no-print">DEFESA PRÉVIA</div>`;
  }

  private renderSections(sections: any[]): string {
    return sections
      .map((section) => {
        const className = section.type === "requests" ? "requests" : "section";
        const title = section.title ? `<h2>${section.title}</h2>` : "";
        const content =
          section.content
            ?.split("\n")
            .filter((line: string) => line.trim())
            .map((line: string) => `<p>${line}</p>`)
            .join("") || "";

        return `<div class="${className}">${title}${content}</div>`;
      })
      .join("");
  }

  private renderFooter(): string {
    return `
      <div class="closing">
        <div class="signature">
          <div class="signature-line"></div>
          <div class="signature-name">[NOME DO REQUERENTE]</div>
          <div class="signature-details">CPF: [CPF] | CNH: [CNH]</div>
        </div>
      </div>
    `;
  }

  private estimatePageCount(draft: any): number {
    const totalWords =
      draft.sections?.reduce(
        (sum: number, s: any) => sum + (s.content?.split(/\s+/).length || 0),
        0,
      ) || 0;
    // Aproximadamente 300 palavras por página A4 com formatação ABNT
    return Math.max(1, Math.ceil(totalWords / 300));
  }
}
