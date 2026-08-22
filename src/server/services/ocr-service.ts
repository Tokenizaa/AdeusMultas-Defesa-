/**
 * OCR Service — Multi-provider OCR with intelligent traffic ticket parsing
 *
 * Providers (in priority order):
 * 1. OCR.space — FREE tier: 25,000 requests/month, no credit card
 * 2. Google Cloud Vision — FREE tier: 1,000 requests/month
 * 3. Tesseract fallback (self-hosted, optional)
 *
 * Specialized for Brazilian traffic tickets (AIT — Auto de Infração de Trânsito)
 */

import { logger } from '../observability/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OcrResult {
  textoCompleto: string;
  dadosExtraidos: ExtractedTicketData;
  confianca: number; // 0-100
  provedor: 'ocr-space' | 'google-vision' | 'tesseract';
  custo: number; // API cost in credits (0 = free)
  tempoProcessamentoMs: number;
}

export interface ExtractedTicketData {
  aitNumber: string;
  placa: string;
  codigoInfracao: string;
  orgaoAutuador: string;
  dataInfracao: string;
  localInfracao: string;
  valorMulta: number;
  descricao: string;
  artigoCtb: string;
  velocidadePermitida?: number;
  VelocidadeAferida?: number;
  velocidadeConsiderada?: number;
  equipamentoRadar?: string;
  dataAfericao?: string;
  prazoDefesa?: string;
}

export interface OcrProviderConfig {
  ocrSpaceApiKey?: string;
  googleVisionApiKey?: string;
  language?: string; // Default 'por' (Portuguese)
  timeout?: number; // ms, default 30000
}

// ---------------------------------------------------------------------------
// Brazilian Traffic Ticket Regex Patterns
// ---------------------------------------------------------------------------

const PLATE_PATTERN = /[A-Z]{3}\s?\d[A-Z0-9]\d{2}/g;
const AIT_PATTERN = /\b(?:AIT|Nº?|N°|Numero|NÚMERO)[:\s]*(\d{4,12})\b/i;
const CODE_PATTERN = /\b(?:Código|Artigo|Art)\.?\s*(\d{3}-\d{2})\b/i;
const CTB_ARTICLE_PATTERN = /\bArt\.?\s*(\d{1,3}(?:\.\d{2})?)\s*(?:do\s*)?(?:CTB|Código\s+de\s+Trânsito)?/gi;
const VALUE_PATTERN = /R\$\s*([\d.,]+)/g;
const DATE_PATTERN = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/g;
const SPEED_PATTERN = /(\d{2,3})\s*km\/?h/gi;
const RENAVAM_PATTERN = /\bRENAVAM[:\s]*(\d{9,11})\b/i;

const INFRACAO_CODES: Record<string, { description: string; article: string; severity: string }> = {
  '518-10': { description: 'Dirigir veículos automotores ou reboques com dimensões acima dos limites', article: 'Art. 203', severity: 'média' },
  '745-50': { description: 'Velocidade acima da permitida em até 20 km/h', article: 'Art. 218, I', severity: 'leve' },
  '745-51': { description: 'Velocidade acima da permitida de 21 a 50 km/h', article: 'Art. 218, II', severity: 'média' },
  '745-52': { description: 'Velocidade acima da permitida acima de 50 km/h', article: 'Art. 218, III', severity: 'gravíssima' },
  '516-91': { description: 'Conduzir veículo sob influência de álcool ou substância psicoativa', article: 'Art. 165', severity: 'gravíssima' },
  '736-62': { description: 'Utilizar equipamento de telefonia celular durante a direção', article: 'Art. 218, IV', severity: 'média' },
  '605-01': { description: 'Não respeitar a sinalização semafórica', article: 'Art. 208', severity: 'média' },
  '746-10': { description: 'Ultrapassar faixa dupla contínua', article: 'Art. 199', severity: 'média' },
  '746-30': { description: 'Avançar o sinal vermelho do semáforo', article: 'Art. 208', severity: 'média' },
  '752-20': { description: 'Estacionar em local proibido', article: 'Art. 181, IX', severity: 'leve' },
  '753-30': { description: 'Utilizar calçada para estacionamento', article: 'Art. 181, XI', severity: 'média' },
  '761-80': { description: 'Deixar de usar cinto de segurança', article: 'Art. 196', severity: 'leve' },
  '593-70': { description: 'Transitar em可达velocidade incompatível com a segurança', article: 'Art. 198', severity: 'média' },
};

// ---------------------------------------------------------------------------
// Provider: OCR.space
// ---------------------------------------------------------------------------

async function callOcrSpace(
  imageBase64: string,
  config: OcrProviderConfig
): Promise<{ texto: string; confianca: number }> {
  const apiKey = config.ocrSpaceApiKey || process.env.OCR_SPACE_API_KEY;
  if (!apiKey) throw new Error('OCR_SPACE_API_KEY not configured');

  const formData = new URLSearchParams();
  formData.append('base64Image', imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`);
  formData.append('language', config.language || 'por');
  formData.append('isOverlayRequired', 'false');
  formData.append('OCREngine', '2'); // Engine 2 is better for structured docs

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeout || 30000);

  try {
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        apikey: apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OCR.space API error ${response.status}: ${errText}`);
    }

    const data = await response.json();

    if (!data.ParsedResults || data.ParsedResults.length === 0) {
      throw new Error('OCR.space returned no parsed results');
    }

    const texto = data.ParsedResults.map((r: any) => r.ParsedText).join('\n');
    const avgConfidence = data.ParsedResults.reduce(
      (sum: number, r: any) => sum + (r.FileParseExitCode === '1' ? 95 : 60),
      0
    ) / data.ParsedResults.length;

    return { texto, confianca: Math.min(avgConfidence, 98) };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Provider: Google Cloud Vision
// ---------------------------------------------------------------------------

async function callGoogleVision(
  imageBase64: string,
  config: OcrProviderConfig
): Promise<{ texto: string; confianca: number }> {
  const apiKey = config.googleVisionApiKey || process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_CLOUD_VISION_API_KEY not configured');

  const cleanBase64 = imageBase64.startsWith('data:') ? imageBase64.split(',')[1] : imageBase64;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeout || 30000);

  try {
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: cleanBase64 },
              features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
              imageContext: { languageHints: ['pt'] },
            },
          ],
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google Vision API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const annotations = data.responses?.[0]?.fullTextAnnotations;

    if (!annotations) {
      throw new Error('Google Vision returned no text annotations');
    }

    return {
      texto: annotations.text || '',
      confianca: Math.round((annotations.confidence || 0.85) * 100),
    };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Ticket Parser — Extract structured data from raw OCR text
// ---------------------------------------------------------------------------

function parseTrafficTicket(rawText: string): ExtractedTicketData {
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Extract plates
  const plates = text.match(PLATE_PATTERN) || [];
  const placa = plates[0]?.replace(/\s/g, '') || 'N/A';

  // Extract AIT number
  const aitMatch = text.match(AIT_PATTERN);
  const aitNumber = aitMatch?.[1] || extractAitFromContext(text);

  // Extract infraction code (XXX-XX format)
  const codeMatch = text.match(CODE_PATTERN);
  const codigoInfracao = codeMatch?.[1] || '';

  // Extract CTB article
  const articleMatches = [...text.matchAll(CTB_ARTICLE_PATTERN)];
  const artigoCtb = articleMatches.map((m) => `Art. ${m[1]}`).join(', ') || '';

  // Extract monetary values
  const values = [...text.matchAll(VALUE_PATTERN)].map((m) =>
    parseFloat(m[1].replace(/\./g, '').replace(',', '.'))
  );
  const valorMulta = values.find((v) => v >= 50 && v <= 5000) || 0;

  // Extract dates
  const dates = [...text.matchAll(DATE_PATTERN)].map((m) => {
    const [, day, month, year] = m;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  });
  const dataInfracao = dates[0] || '';

  // Extract speed values
  const speeds = [...text.matchAll(SPEED_PATTERN)].map((m) => parseInt(m[1], 10));
  const velocidadePermitida = speeds[0];
  const VelocidadeAferida = speeds[1];
  const velocidadeConsiderada = speeds[2] || VelocidadeAferida;

  // Extract RENAVAM
  const renavamMatch = text.match(RENAVAM_PATTERN);

  // Extract location (heuristic: look for street/avenue patterns)
  const localInfracao = extractLocation(text);

  // Extract orgao autuador
  const orgaoAutuador = extractOrgao(text);

  // Extract description from infraction code lookup
  const infracaoInfo = INFRACAO_CODES[codigoInfracao];
  const descricao = infracaoInfo?.description || extractDescription(text);

  // Extract defense deadline
  const prazoDefesa = extractDefenseDeadline(text, dates);

  // Radar equipment
  const radarMatch = text.match(/(?:Equipamento|Radar|EQUIPAMENTO)[:\s]*([A-Z0-9\-]+)/i);
  const equipamentoRadar = radarMatch?.[1];

  // Aferição date
  const afericaoMatch = text.match(/(?:Aferição|AFERIÇÃO|Validade)[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i);
  const dataAfericao = afericaoMatch?.[1]?.replace(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/, '$3-$2-$1');

  return {
    aitNumber,
    placa,
    codigoInfracao,
    orgaoAutuador,
    dataInfracao,
    localInfracao,
    valorMulta,
    descricao,
    artigoCtb,
    velocidadePermitida,
    VelocidadeAferida,
    velocidadeConsiderada,
    equipamentoRadar,
    dataAfericao,
    prazoDefesa,
  };
}

function extractAitFromContext(text: string): string {
  // Look for AIT-like patterns in common positions
  const patterns = [
    /\b(\d{4,6}[-.]?\d{2,4}[-.]?\d{2,4})\b/, // Generic numeric ID
    /\bN[º°]?\s*:?\s*(\w{2,4}\d{4,8})\b/i,
    /AIT[:\s]*(\w+)/i,
    /Auto[:\s]*(\w+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }

  return `AIT-${Date.now().toString().slice(-8)}`;
}

function extractLocation(text: string): string {
  const locationPatterns = [
    /(?:Local|LOCAL|Endereço|ENDEREÇO|Via|VIA)[:\s]*(.+?)(?:\n|$)/i,
    /((?:Av\.|Rua|R\.|Rod\.|Rodovia|Al\.|Alameda)\s+.+?)(?:\n|—|-|$)/i,
    /((?:Av\.|Rua|R\.|Rod\.|Rodovia|Al\.|Alameda)\s+.+?),\s*(.{2,30}\/[A-Z]{2})/i,
  ];

  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) return (match[1] || match[0]).trim().substring(0, 150);
  }

  return 'N/A';
}

function extractOrgao(text: string): string {
  const orgaoPatterns = [
    /(?:Órgão|ORGAO|Autuador|AUTUADOR|Exigência)[:\s]*(.+?)(?:\n|$)/i,
    /(DETRAN[-\s]*[A-Z]{2})/i,
    /(CET[-\s]*[A-Z]{2})/i,
    /(BHTRANS|SPTRANS|CBM|PMDF|PCDF)/i,
    /(Secretaria.+?(?:Trânsito|Trasito|Segurança).+?)(?:\n|$)/i,
  ];

  for (const pattern of orgaoPatterns) {
    const match = text.match(pattern);
    if (match) return (match[1] || match[0]).trim().substring(0, 100);
  }

  return 'N/A';
}

function extractDescription(text: string): string {
  const descPatterns = [
    /(?:Infração|INFRAÇÃO|Descrição|DESCRIÇÃO|Motivo|MOTIVO)[:\s]*(.+?)(?:\n|$)/i,
    /(?:Conduta|CONDUTA)[:\s]*(.+?)(?:\n|$)/i,
  ];

  for (const pattern of descPatterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim().substring(0, 200);
  }

  return 'Infração de trânsito';
}

function extractDefenseDeadline(text: string, dates: string[]): string {
  const deadlinePatterns = [
    /(?:Prazo|PRAZO|Defesa|DEFESA|recural|RECURSO)[:\s]*(?:at[aéé]|prazo)[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
    /(?:data\s+limite|DATA\s+LIMITE)[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
  ];

  for (const pattern of deadlinePatterns) {
    const match = text.match(pattern);
    if (match) {
      const [, day, month, year] = match[1].match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/) || [];
      if (day && month && year) return `${year}-${month}-${day}`;
    }
  }

  // Default: 30 days from last date found
  if (dates.length > 0) {
    const lastDate = new Date(dates[dates.length - 1]);
    lastDate.setDate(lastDate.getDate() + 30);
    return lastDate.toISOString().split('T')[0];
  }

  // Default: 30 days from now
  const defaultDeadline = new Date();
  defaultDeadline.setDate(defaultDeadline.getDate() + 30);
  return defaultDeadline.toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// Main OCR Service
// ---------------------------------------------------------------------------

class OcrService {
  private config: OcrProviderConfig;

  constructor(config?: OcrProviderConfig) {
    this.config = {
      language: 'por',
      timeout: 30000,
      ...config,
    };
  }

  /**
   * Analyze a traffic ticket image and extract structured data
   * Tries providers in order: OCR.space → Google Vision
   */
  async analyzeImage(imageBase64: string): Promise<OcrResult> {
    const startTime = Date.now();

    // Try OCR.space first (free, 25K/month)
    try {
      logger.info('ocr', 'ocr-service', 'analyze_image', 'Attempting OCR.space provider');
      const { texto, confianca } = await callOcrSpace(imageBase64, this.config);
      const dadosExtraidos = parseTrafficTicket(texto);

      logger.info('ocr', 'ocr-service', 'analyze_image', 'OCR.space succeeded', {
        confianca,
        aitNumber: dadosExtraidos.aitNumber,
        placa: dadosExtraidos.placa,
      });

      return {
        textoCompleto: texto,
        dadosExtraidos,
        confianca,
        provedor: 'ocr-space',
        custo: 0,
        tempoProcessamentoMs: Date.now() - startTime,
      };
    } catch (err) {
      logger.warn('ocr', 'ocr-service', 'analyze_image', 'OCR.space failed, trying Google Vision', {
        error: String(err),
      });
    }

    // Fallback: Google Vision (free 1K/month)
    try {
      logger.info('ocr', 'ocr-service', 'analyze_image', 'Attempting Google Vision provider');
      const { texto, confianca } = await callGoogleVision(imageBase64, this.config);
      const dadosExtraidos = parseTrafficTicket(texto);

      logger.info('ocr', 'ocr-service', 'analyze_image', 'Google Vision succeeded', {
        confianca,
        aitNumber: dadosExtraidos.aitNumber,
        placa: dadosExtraidos.placa,
      });

      return {
        textoCompleto: texto,
        dadosExtraidos,
        confianca,
        provedor: 'google-vision',
        custo: 0,
        tempoProcessamentoMs: Date.now() - startTime,
      };
    } catch (err) {
      logger.warn('ocr', 'ocr-service', 'analyze_image', 'Google Vision failed', {
        error: String(err),
      });
    }

    // No providers available
    throw new Error(
      'Nenhum provedor de OCR configurado. Configure OCR_SPACE_API_KEY ou GOOGLE_CLOUD_VISION_API_KEY.'
    );
  }

  /**
   * Analyze from a URL (downloads the image first)
   */
  async analyzeFromUrl(imageUrl: string): Promise<OcrResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 30000);

    try {
      const response = await fetch(imageUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      return this.analyzeImage(base64);
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  /**
   * Parse raw text (already extracted) into structured data
   */
  parseRawText(rawText: string): OcrResult {
    const dadosExtraidos = parseTrafficTicket(rawText);
    return {
      textoCompleto: rawText,
      dadosExtraidos,
      confianca: 70, // Lower confidence since we didn't do OCR ourselves
      provedor: 'ocr-space', // Placeholder
      custo: 0,
      tempoProcessamentoMs: 0,
    };
  }
}

export const ocrService = new OcrService();
