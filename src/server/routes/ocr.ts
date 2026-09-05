import { Router } from 'express';
import { authenticateToken } from '../middleware/auth-middleware';
import { RagPipeline } from '../../core/rag/rag-pipeline';
import { eventBus, EventTopics } from '../../core/events/topics';
import { analyzeTicketWithGemini } from '../gemini';
import { aiProviderManager } from '../observability/ai-provider-manager';
import { ocrService } from '../services/ocr-service';
import type { InfractionSeverity } from '../../types';

const router = Router();

/**
 * POST /api/ocr/analyze
 *
 * Analyze a traffic ticket image using real OCR (OCR.space → Google Vision fallback)
 *
 * Requires authentication.
 *
 * Body:
 *   - imageUrl?: string   — URL of the image to analyze
 *   - base64?: string     — Base64-encoded image data
 *   - rawText?: string    — Pre-extracted text (skip OCR, just parse)
 *   - presetId?: string   — Ticket type hint: 'lei_seca' | 'celular' | 'vermelho' | 'velocidade'
 *
 * Production: Uses real OCR service (requires OCR_SPACE_API_KEY or GOOGLE_CLOUD_VISION_API_KEY)
 * Development: Falls back to preset-based mock if no API key configured
 */
router.post('/ocr/analyze', authenticateToken, async (req, res) => {
  try {
    const { imageUrl, base64, rawText, presetId } = req.body;

    // ---------------------------------------------------------------------------
    // Path 1: Real OCR (image URL or base64)
    // ---------------------------------------------------------------------------
    if (imageUrl || base64) {
      // Check if OCR provider is configured
      const hasOcrKey = process.env.OCR_SPACE_API_KEY || process.env.GOOGLE_CLOUD_VISION_API_KEY;

      if (!hasOcrKey && process.env.NODE_ENV === 'production') {
        return res.status(503).json({
          error: 'Serviço de OCR não configurado',
          message: 'Configure OCR_SPACE_API_KEY ou GOOGLE_CLOUD_VISION_API_KEY para produção.',
          hint: 'OCR.space: gratuito com 25K requests/mês — https://ocr.space/ocrapi/freekey',
        });
      }

      // Perform real OCR
      const ocrResult = imageUrl
        ? await ocrService.analyzeFromUrl(imageUrl)
        : await ocrService.analyzeImage(base64);

      // Enrich with RAG pipeline
      const tempCaseId = `temp_${Date.now()}`;
      const matchedInfraction = RagPipeline.findInfraction(ocrResult.dadosExtraidos.codigoInfracao);

      const infractionData = {
        aitNumber: ocrResult.dadosExtraidos.aitNumber,
        infractionCode: ocrResult.dadosExtraidos.codigoInfracao,
        description: ocrResult.dadosExtraidos.descricao,
        ctbArticle: ocrResult.dadosExtraidos.artigoCtb,
        severity: (matchedInfraction?.severity || 'media') as InfractionSeverity,
        points: matchedInfraction?.points || 0,
        fineAmount: matchedInfraction?.fineAmount || 0,
        autuadorBody: ocrResult.dadosExtraidos.orgaoAutuador,
        notificationExpeditionDate: ocrResult.dadosExtraidos.dataInfracao,
        defenseDeadline: ocrResult.dadosExtraidos.prazoDefesa || new Date(Date.now() + 28 * 24 * 3600 * 1000).toISOString().split('T')[0],
        formalFlawsDetected: matchedInfraction?.typicalFlaws || [],
        dateTime: ocrResult.dadosExtraidos.dataInfracao || new Date().toISOString(),
        location: ocrResult.dadosExtraidos.localInfracao || 'Não informado',
      };

      // Run Gemini AI analysis if available
      let geminiResult = null;
      if (ocrResult.textoCompleto && ocrResult.textoCompleto.length > 20) {
        // Use AI Provider Manager with NVIDIA as primary, 9Router as fallback
        const aiResult = await aiProviderManager.executeLegalReasoning(
          `Você é um especialista em direito de trânsito brasileiro (CTB, Resoluções do CONTRAN, Portarias do SENATRAN e INMETRO).
          Analise o seguinte Auto de Infração de Trânsito ou notificação e identifique todas as falhas formais, vícios de nulidade, prazos e teses aplicáveis:

          Texto Extraído:
          """
          ${ocrResult.textoCompleto}
          """

          Contexto do Auto:
          ${JSON.stringify(infractionData, null, 2)}

          Por favor, responda no formato JSON com:
          - summary: resumo executivo do caso
          - successProbability: probabilidade estimada em porcentagem (número entre 60 e 98)
          - fatalFlaws: lista de vícios formais/materiais detectados
          - primaryLegalTeses: teses jurídicas com artigos do CTB e resoluções do CONTRAN
          - actionChecklist: passos para protocolo tempestivo`,
          infractionData,
          {
            correlationId: `ocr_${tempCaseId}`,
            caseId: tempCaseId,
            temperature: 0.15,
          }
        );

        // Process AI result to ensure compatibility with expected format
        if (aiResult.success && aiResult.data) {
          // If data is already in the expected format (from Gemini or properly formatted)
          if (typeof aiResult.data === 'object' && aiResult.data !== null &&
              'summary' in aiResult.data &&
              'successProbability' in aiResult.data &&
              'fatalFlaws' in aiResult.data &&
              'primaryLegalTeses' in aiResult.data &&
              'actionChecklist' in aiResult.data) {
            geminiResult = aiResult.data;
          } 
          // If data is a string (from NVIDIA), try to parse it as JSON
          else if (typeof aiResult.data === 'string') {
            try {
              const parsed = JSON.parse(aiResult.data);
              if (typeof parsed === 'object' && parsed !== null &&
                  'summary' in parsed &&
                  'successProbability' in parsed &&
                  'fatalFlaws' in parsed &&
                  'primaryLegalTeses' in parsed &&
                  'actionChecklist' in parsed) {
                geminiResult = parsed;
              } else {
                // Fallback to deterministic RAG if parsing fails
                geminiResult = await analyzeTicketWithGemini(ocrResult.textoCompleto, infractionData);
              }
            } catch (e) {
              // Fallback to deterministic RAG if JSON parsing fails
              geminiResult = await analyzeTicketWithGemini(ocrResult.textoCompleto, infractionData);
            }
          }
          // If data is an object but not in expected format, create a compatible response
          else if (typeof aiResult.data === 'object' && aiResult.data !== null) {
            // Try to map common fields or use deterministic fallback
            geminiResult = await analyzeTicketWithGemini(ocrResult.textoCompleto, infractionData);
          }
          // For explicit fallback indicators, use deterministic RAG
          else {
            geminiResult = await analyzeTicketWithGemini(ocrResult.textoCompleto, infractionData);
          }
        } else {
          // AI provider failed completely, fallback to deterministic RAG
          geminiResult = await analyzeTicketWithGemini(ocrResult.textoCompleto, infractionData);
        }
      }

      // Run deterministic legal RAG pipeline
      const analysis = RagPipeline.analyzeInfraction(tempCaseId, infractionData);

      if (geminiResult?.fatalFlaws) {
        infractionData.formalFlawsDetected = Array.from(
          new Set([...infractionData.formalFlawsDetected, ...geminiResult.fatalFlaws])
        );
      }

      eventBus.publish(EventTopics.OCR_COMPLETED, {
        aitNumber: ocrResult.dadosExtraidos.aitNumber,
        infractionCode: ocrResult.dadosExtraidos.codigoInfracao,
      });

      return res.json({
        success: true,
        extractedData: {
          vehicle: {
            plate: ocrResult.dadosExtraidos.placa,
            renavam: undefined, // Will be filled by TransDatabase lookup
          },
          infraction: infractionData,
        },
        analysis,
        ocr: {
          provider: ocrResult.provedor,
          confidence: ocrResult.confianca,
          processingTimeMs: ocrResult.tempoProcessamentoMs,
          rawText: ocrResult.textoCompleto,
        },
        geminiEnriched: Boolean(geminiResult),
      });
    }

    // ---------------------------------------------------------------------------
    // Path 2: Pre-extracted text (parse only, no OCR)
    // ---------------------------------------------------------------------------
    if (rawText) {
      const ocrResult = ocrService.parseRawText(rawText);

      const tempCaseId = `temp_${Date.now()}`;
      const matchedInfraction = RagPipeline.findInfraction(ocrResult.dadosExtraidos.codigoInfracao);

      const infractionData = {
        aitNumber: ocrResult.dadosExtraidos.aitNumber,
        infractionCode: ocrResult.dadosExtraidos.codigoInfracao,
        description: ocrResult.dadosExtraidos.descricao,
        ctbArticle: ocrResult.dadosExtraidos.artigoCtb,
        severity: (matchedInfraction?.severity || 'media') as InfractionSeverity,
        points: matchedInfraction?.points || 0,
        fineAmount: matchedInfraction?.fineAmount || 0,
        autuadorBody: ocrResult.dadosExtraidos.orgaoAutuador,
        notificationExpeditionDate: ocrResult.dadosExtraidos.dataInfracao,
        defenseDeadline: ocrResult.dadosExtraidos.prazoDefesa || new Date(Date.now() + 28 * 24 * 3600 * 1000).toISOString().split('T')[0],
        formalFlawsDetected: matchedInfraction?.typicalFlaws || [],
        dateTime: ocrResult.dadosExtraidos.dataInfracao || new Date().toISOString(),
        location: ocrResult.dadosExtraidos.localInfracao || 'Não informado',
      };

      // Run Gemini AI analysis if available
      let geminiResult = null;
      if (ocrResult.textoCompleto && ocrResult.textoCompleto.length > 20) {
        // Use AI Provider Manager with NVIDIA as primary, 9Router as fallback
        const aiResult = await aiProviderManager.executeLegalReasoning(
          `Você é um especialista em direito de trânsito brasileiro (CTB, Resoluções do CONTRAN, Portarias do SENATRAN e INMETRO).
          Analise o seguinte Auto de Infração de Trânsito ou notificação e identifique todas as falhas formais, vícios de nulidade, prazos e teses aplicáveis:

          Texto Extraído:
          """
          ${ocrResult.textoCompleto}
          """

          Contexto do Auto:
          ${JSON.stringify(infractionData, null, 2)}

          Por favor, responda no formato JSON com:
          - summary: resumo executivo do caso
          - successProbability: probabilidade estimada em porcentagem (número entre 60 e 98)
          - fatalFlaws: lista de vícios formais/materiais detectados
          - primaryLegalTeses: teses jurídicas com artigos do CTB e resoluções do CONTRAN
          - actionChecklist: passos para protocolo tempestivo`,
          infractionData,
          {
            correlationId: `ocr_${tempCaseId}`,
            caseId: tempCaseId,
            temperature: 0.15,
          }
        );

        // Process AI result to ensure compatibility with expected format
        if (aiResult.success && aiResult.data) {
          // If data is already in the expected format (from Gemini or properly formatted)
          if (typeof aiResult.data === 'object' && aiResult.data !== null &&
              'summary' in aiResult.data &&
              'successProbability' in aiResult.data &&
              'fatalFlaws' in aiResult.data &&
              'primaryLegalTeses' in aiResult.data &&
              'actionChecklist' in aiResult.data) {
            geminiResult = aiResult.data;
          } 
          // If data is a string (from NVIDIA), try to parse it as JSON
          else if (typeof aiResult.data === 'string') {
            try {
              const parsed = JSON.parse(aiResult.data);
              if (typeof parsed === 'object' && parsed !== null &&
                  'summary' in parsed &&
                  'successProbability' in parsed &&
                  'fatalFlaws' in parsed &&
                  'primaryLegalTeses' in parsed &&
                  'actionChecklist' in parsed) {
                geminiResult = parsed;
              } else {
                // Fallback to deterministic RAG if parsing fails
                geminiResult = await analyzeTicketWithGemini(ocrResult.textoCompleto, infractionData);
              }
            } catch (e) {
              // Fallback to deterministic RAG if JSON parsing fails
              geminiResult = await analyzeTicketWithGemini(ocrResult.textoCompleto, infractionData);
            }
          }
          // If data is an object but not in expected format, create a compatible response
          else if (typeof aiResult.data === 'object' && aiResult.data !== null) {
            // Try to map common fields or use deterministic fallback
            geminiResult = await analyzeTicketWithGemini(ocrResult.textoCompleto, infractionData);
          }
          // For explicit fallback indicators, use deterministic RAG
          else {
            geminiResult = await analyzeTicketWithGemini(ocrResult.textoCompleto, infractionData);
          }
        } else {
          // AI provider failed completely, fallback to deterministic RAG
          geminiResult = await analyzeTicketWithGemini(ocrResult.textoCompleto, infractionData);
        }
      }

      // Run deterministic legal RAG pipeline
      const analysis = RagPipeline.analyzeInfraction(tempCaseId, infractionData);

      if (geminiResult?.fatalFlaws) {
        infractionData.formalFlawsDetected = Array.from(
          new Set([...infractionData.formalFlawsDetected, ...geminiResult.fatalFlaws])
        );
      }

      eventBus.publish(EventTopics.OCR_COMPLETED, {
        aitNumber: ocrResult.dadosExtraidos.aitNumber,
        infractionCode: ocrResult.dadosExtraidos.codigoInfracao,
      });

      return res.json({
        success: true,
        extractedData: {
          vehicle: {
            plate: ocrResult.dadosExtraidos.placa,
            renavam: undefined, // Will be filled by TransDatabase lookup
          },
          infraction: infractionData,
        },
        analysis,
        ocr: {
          provider: ocrResult.provedor,
          confidence: ocrResult.confianca,
          processingTimeMs: ocrResult.tempoProcessamentoMs,
          rawText: ocrResult.textoCompleto,
        },
        geminiEnriched: Boolean(geminiResult),
      });
    }

    // ---------------------------------------------------------------------------
    // No input data provided
    // ---------------------------------------------------------------------------
    return res.status(400).json({
      error: 'Dados de entrada necessários',
      message: 'Envie imageUrl, base64 ou rawText para análise do auto de infração.',
    });
  } catch (error) {
    console.error('[OCR Route] Error processing request:', error);
    return res.status(500).json({
      error: 'Falha interna no servidor',
      message: 'Erro ao processar solicitação de OCR.',
    });
  }
});

export default router;
