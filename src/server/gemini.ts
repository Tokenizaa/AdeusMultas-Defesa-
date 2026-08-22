import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[Gemini] GEMINI_API_KEY not configured. Using deterministic RAG legal engine.');
    return null;
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  return aiClient;
}

/**
 * Executes a Gemini prompt with automatic retries and fallback to a lighter model
 * in case of high demand (503), rate limits, or transient errors.
 */
async function generateWithFallback(
  contents: any,
  config?: any,
  systemInstruction?: string
): Promise<string | null> {
  const ai = getGeminiClient();
  if (!ai) return null;

  const candidateModels = ['gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

  for (const model of candidateModels) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            ...config,
            ...(systemInstruction ? { systemInstruction } : {}),
          },
        });

        const text = response.text;
        if (text) {
          return text;
        }
      } catch (error: any) {
        const status = error?.status || error?.code || error?.error?.code;
        const message = error?.message || String(error);
        const isTransient = status === 503 || status === 429 || message.includes('high demand') || message.includes('UNAVAILABLE');

        if (isTransient && attempt === 1) {
          // Quick wait before retry or model switch
          await new Promise((resolve) => setTimeout(resolve, 600));
          continue;
        }

        // If high demand persists on this model, switch to the next fallback model
        console.warn(`[Gemini] Model ${model} unavailable (status: ${status}). Attempting fallback.`);
        break; // break inner loop to try next model
      }
    }
  }

  return null;
}

export async function analyzeTicketWithGemini(extractedText: string, infractionContext: any) {
  try {
    const prompt = `Você é um especialista em direito de trânsito brasileiro (CTB, Resoluções do CONTRAN, Portarias do SENATRAN e INMETRO).
Analise o seguinte Auto de Infração de Trânsito ou notificação e identifique todas as falhas formais, vícios de nulidade, prazos e teses aplicáveis:

Texto Extraído:
"""
${extractedText}
"""

Contexto do Auto:
${JSON.stringify(infractionContext, null, 2)}

Por favor, responda no formato JSON com:
- summary: resumo executivo do caso
- successProbability: probabilidade estimada em porcentagem (número entre 60 e 98)
- fatalFlaws: lista de vícios formais/materiais detectados
- primaryLegalTeses: teses jurídicas com artigos do CTB e resoluções do CONTRAN
- actionChecklist: passos para protocolo tempestivo`;

    const text = await generateWithFallback(prompt, {
      responseMimeType: 'application/json',
    });

    if (text) {
      return JSON.parse(text);
    }
  } catch (error) {
    console.warn('[Gemini] Graceful fallback to deterministic legal RAG engine after AI timeout/unavailable.');
  }
  return null;
}

export async function enrichDefenseWithGemini(draftContext: any) {
  try {
    const prompt = `Você é um redator jurídico especializado em recursos de trânsito brasileiro.
Escreva uma petição administrativa formal, elegante e de alto rigor técnico para o seguinte caso:

Dados da Infração e Requerente:
${JSON.stringify(draftContext, null, 2)}

A petição deve conter:
1. Endereçamento correto da autoridade
2. Qualificação formal
3. Dos Fatos
4. Das Preliminares (Decadência, vícios formais, inobservância de resoluções do CONTRAN)
5. Do Mérito e Jurisprudência
6. Dos Pedidos (Efeito suspensivo, anulação ou conversão em advertência)
7. Local, data e assinatura.

Escreva a minuta em português formal e impecável.`;

    const text = await generateWithFallback(prompt);
    return text;
  } catch (error) {
    console.warn('[Gemini] Graceful fallback to template generator.');
    return null;
  }
}

