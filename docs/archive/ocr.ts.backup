import { Router } from 'express';
import { RagPipeline } from '../../core/rag/rag-pipeline';
import { eventBus, EventTopics } from '../../core/events/topics';
import { analyzeTicketWithGemini } from '../gemini';
import { ocrService } from '../services/ocr-service';
import type { InfractionSeverity } from '../../types';

const router = Router();

/**
 * POST /api/ocr/analyze
 *
 * Analyze a traffic ticket image using real OCR (OCR.space → Google Vision fallback)
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
router.post('/ocr/analyze', async (req, res) => {
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
        fineAmount: ocrResult.dadosExtraidos.valorMulta,
        autuadorBody: ocrResult.dadosExtraidos.orgaoAutuador,
        dateTime: ocrResult.dadosExtraidos.dataInfracao,
        location: ocrResult.dadosExtraidos.localInfracao,
        speedLimit: ocrResult.dadosExtraidos.velocidadePermitida,
        measuredSpeed: ocrResult.dadosExtraidos.VelocidadeAferida,
        consideredSpeed: ocrResult.dadosExtraidos.velocidadeConsiderada,
        radarEquipmentId: ocrResult.dadosExtraidos.equipamentoRadar,
        inmetroAferitionDate: ocrResult.dadosExtraidos.dataAfericao,
        notificationExpeditionDate: ocrResult.dadosExtraidos.dataInfracao,
        defenseDeadline: ocrResult.dadosExtraidos.prazoDefesa || new Date(Date.now() + 28 * 24 * 3600 * 1000).toISOString().split('T')[0],
        formalFlawsDetected: matchedInfraction?.typicalFlaws || [],
      };

      // Run Gemini AI analysis if available
      let geminiResult = null;
      if (ocrResult.textoCompleto && ocrResult.textoCompleto.length > 20) {
        geminiResult = await analyzeTicketWithGemini(ocrResult.textoCompleto, infractionData);
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
        code: ocrResult.dadosExtraidos.codigoInfracao,
        successRate: analysis.overallSuccessRate,
        provider: ocrResult.provedor,
      }, 'ocr_engine');

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
        fineAmount: ocrResult.dadosExtraidos.valorMulta,
        autuadorBody: ocrResult.dadosExtraidos.orgaoAutuador,
        dateTime: ocrResult.dadosExtraidos.dataInfracao,
        location: ocrResult.dadosExtraidos.localInfracao,
        formalFlawsDetected: matchedInfraction?.typicalFlaws || [],
      };

      let geminiResult = null;
      if (rawText.length > 20) {
        geminiResult = await analyzeTicketWithGemini(rawText, infractionData);
      }

      const analysis = RagPipeline.analyzeInfraction(tempCaseId, infractionData);

      eventBus.publish(EventTopics.OCR_COMPLETED, {
        aitNumber: ocrResult.dadosExtraidos.aitNumber,
        code: ocrResult.dadosExtraidos.codigoInfracao,
        successRate: analysis.overallSuccessRate,
        provider: 'text-parsed',
      }, 'ocr_engine');

      return res.json({
        success: true,
        extractedData: {
          vehicle: { plate: ocrResult.dadosExtraidos.placa },
          infraction: infractionData,
        },
        analysis,
        ocr: {
          provider: 'text-parsed',
          confidence: ocrResult.confianca,
          processingTimeMs: 0,
          rawText,
        },
        geminiEnriched: Boolean(geminiResult),
      });
    }

    // ---------------------------------------------------------------------------
    // Path 3: Preset-based demo (development only)
    // ---------------------------------------------------------------------------
    if (process.env.NODE_ENV === 'production') {
      return res.status(400).json({
        error: 'Dados de entrada necessários',
        message: 'Envie imageUrl, base64, ou rawText para análise.',
      });
    }

    // Development fallback: use presets for demo
    const { presetId: devPreset } = req.body;
    let code = '745-50';
    let aitNumber = `1B${Math.floor(100000 + Math.random() * 900000)}`;
    let autuador = 'DETRAN-SP — Departamento Estadual de Trânsito de São Paulo';
    let location = 'Av. Washington Luís, km 12 — São Paulo/SP';

    if (devPreset === 'lei_seca') {
      code = '516-91';
      aitNumber = `LS${Math.floor(100000 + Math.random() * 900000)}`;
      autuador = 'DETRAN-RJ — Operação Lei Seca';
      location = 'Av. das Américas, alt. Barra Shopping — Rio de Janeiro/RJ';
    } else if (devPreset === 'celular') {
      code = '736-62';
      aitNumber = `CL${Math.floor(100000 + Math.random() * 900000)}`;
      autuador = 'CET-SP / DSV — Companhia de Engenharia de Tráfego';
      location = 'Rua da Consolação, cruzamento com Av. Paulista — São Paulo/SP';
    } else if (devPreset === 'vermelho') {
      code = '605-01';
      aitNumber = `SF${Math.floor(100000 + Math.random() * 900000)}`;
      autuador = 'BHTRANS — Empresa de Transportes e Trânsito de Belo Horizonte';
      location = 'Av. Afonso Pena c/ Av. Amazonas — Belo Horizonte/MG';
    }

    const matchedInfraction = RagPipeline.findInfraction(code)!;

    const sampleInfractionData = {
      aitNumber,
      infractionCode: matchedInfraction.code,
      description: matchedInfraction.description,
      ctbArticle: matchedInfraction.article,
      severity: matchedInfraction.severity,
      points: matchedInfraction.points,
      fineAmount: matchedInfraction.fineAmount,
      autuadorBody: autuador,
      dateTime: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19),
      location,
      formalFlawsDetected: matchedInfraction.typicalFlaws,
    };

    const tempCaseId = `temp_${Date.now()}`;
    const analysis = RagPipeline.analyzeInfraction(tempCaseId, sampleInfractionData);

    eventBus.publish(EventTopics.OCR_COMPLETED, {
      aitNumber,
      code: matchedInfraction.code,
      successRate: analysis.overallSuccessRate,
    }, 'ocr_engine');

    return res.json({
      success: true,
      extractedData: {
        vehicle: { plate: 'BRA2E19' },
        infraction: sampleInfractionData,
      },
      analysis,
      ocr: { provider: 'preset-demo', confidence: 95, processingTimeMs: 0, rawText: null },
      geminiEnriched: false,
    });
  } catch (error: any) {
    console.error('[OCR Engine] Error:', error);
    res.status(500).json({ error: error.message || 'Erro no processamento OCR' });
  }
});

export default router;