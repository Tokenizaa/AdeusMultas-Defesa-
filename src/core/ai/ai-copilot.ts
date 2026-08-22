/**
 * @file ai-copilot.ts
 * DefesaAI — Decoupled AI Copilot Layer (Fase 9)
 * Optional enrichment layer. Enhances prose, clarifies language, and summarizes documents.
 * Strictly decoupled: AI does NOT invent statutory articles or alter deterministic decisions.
 */

export interface AiEnhanceRequest {
  petitionText: string;
  tone?: 'formal_rigorous' | 'objective_direct' | 'simplified_citizen';
  caseContext?: {
    aitNumber: string;
    infractionCode: string;
    procedure: string;
  };
}

export class AiCopilot {
  /**
   * Enhances petition prose using server-side Gemini with graceful fallback
   */
  public static async enhanceDraft(request: AiEnhanceRequest): Promise<string> {
    try {
      const res = await fetch('/api/enrich-defense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftContext: {
            fullDraftText: request.petitionText,
            tone: request.tone || 'formal_rigorous',
            aitNumber: request.caseContext?.aitNumber,
            infractionCode: request.caseContext?.infractionCode,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.enrichedText && data.enrichedText.trim().length > 50) {
          return data.enrichedText;
        }
      }
    } catch (err) {
      console.warn('[AI Copilot] Server unreachable or unavailable. Using original deterministic draft.');
    }

    // Fallback: Return original draft unchanged
    return request.petitionText;
  }

  /**
   * Generates a plain-language executive summary for the citizen
   */
  public static generateCitizenExplanation(inconsistenciesCount: number, successRate: number, procedureName: string): string {
    return `Seu caso foi avaliado pelo Motor Especialista com **${successRate}% de probabilidade favorável**. Foram identificadas **${inconsistenciesCount} vulnerabilidades jurídicas** no auto de infração que autorizam a apresentação de ${procedureName}. O documento está fundamentado diretamente no Código de Trânsito Brasileiro e nas Resoluções do CONTRAN.`;
  }
}
