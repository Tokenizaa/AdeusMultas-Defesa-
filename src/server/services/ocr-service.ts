/**
 * OCR Service — Multi-provider OCR with intelligent traffic ticket parsing
 * Enhanced version with improved verification according to standard nomenclature
 *
 * Providers (in priority order):
 * 1. OCR.space — FREE tier: 25,000 requests/month, no credit card
 * 2. Google Cloud Vision — FREE tier: 1,000 requests/month
 * 3. Tesseract fallback (self-hosted, optional)
 *
 * Specialized for Brazilian traffic tickets (AIT — Auto de Infração de Trânsito)
 * 
 * Improvements:
 * - Enhanced pattern matching for Brazilian traffic ticket nomenclature
 * - Field-level validation and confidence scoring
 * - Cross-validation between related fields
 * - Improved infraction code database
 * - Better date validation and formatting
 */

import { isIP } from 'net';
import { URL } from 'url';
import * as dns from 'dns';
import { promisify } from 'util';
import { logger } from '../observability/logger';

const dnsLookup = promisify(dns.lookup);
const dnsResolve4 = promisify(dns.resolve4);

// ---------------------------------------------------------------------------
// SSRF Protection — validate URLs before fetching
// ---------------------------------------------------------------------------

/** Maximum allowed download size in bytes (5MB) */
const MAX_DOWNLOAD_SIZE = 5 * 1024 * 1024;

/**
 * Validates that a URL is safe for fetching (no SSRF).
 * - Only http/https schemes allowed
 * - No private/internal IP addresses after DNS resolution
 * - No localhost or reserved hostnames
 * - No credentials in URL
 */
function validateFetchUrl(inputUrl: string): { valid: boolean; reason?: string } {
  let url: URL;
  try {
    url = new URL(inputUrl);
  } catch {
    return { valid: false, reason: 'URL malformada' };
  }

  // Only allow HTTP and HTTPS
  if (!['http:', 'https:'].includes(url.protocol)) {
    return { valid: false, reason: `Esquema '${url.protocol}' não permitido — use http:// ou https://` };
  }

  const hostname = url.hostname.toLowerCase();

  // Block credentials
  if (url.username || url.password) {
    return { valid: false, reason: 'Credenciais na URL não permitidas' };
  }

  // Block localhost variants
  if (
    hostname === 'localhost' ||
    hostname === 'localhost.localdomain' ||
    hostname === '[::1]' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('0.0.0.0') ||
    hostname.endsWith('.local') ||
    hostname === 'ip6-localhost' ||
    hostname === 'ip6-loopback'
  ) {
    return { valid: false, reason: 'Host localhost/reservado não permitido' };
  }

  // Block obvious internal hostnames before DNS resolution
  const internalPatterns = [
    'internal', 'intranet', 'private', 'corporate', 'dmz',
    'gateway', 'router', 'switch', 'firewall', 'proxy',
    'metadata.google', 'metadata.internal',
    '169.254.169.254', // AWS/GCP metadata endpoint
    '100.64.0.0/10', // Carrier-grade NAT
  ];
  for (const pattern of internalPatterns) {
    if (hostname.includes(pattern)) {
      return { valid: false, reason: `Hostname interno '${pattern}' não permitido` };
    }
  }

  return { valid: true };
}

/**
 * Checks if an IPv4 address is private/internal.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 169 && parts[1] === 254) return true; // link-local
  return false;
}

/**
 * Validates a resolved IP is not private/reserved.
 */
function validateResolvedIP(ip: string, isV6 = false): { valid: boolean; reason?: string } {
  if (!isV6) {
    if (isPrivateIPv4(ip)) {
      return { valid: false, reason: `IP privado não permitido após resolução DNS: ${ip}` };
    }
  }
  // IPv6: block common private/link-local
  if (isV6) {
    const lower = ip.toLowerCase();
    if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80') || lower.startsWith('::1') || lower === '::') {
      return { valid: false, reason: `IP IPv6 privado/reservado não permitido: ${ip}` };
    }
  }
  return { valid: true };
}

/**
 * Resolves hostname to IP(s) and validates none are private.
 * Uses dns.lookup which uses the system resolver (respects /etc/hosts).
 */
async function resolveAndValidateHostname(hostname: string): Promise<{ valid: boolean; reason?: string }> {
  try {
    // Try IPv4 first
    const addr = await dnsLookup(hostname, { family: 4 });
    if (addr.address) {
      const ipValidation = validateResolvedIP(addr.address, addr.family === 6);
      if (!ipValidation.valid) return ipValidation;
    }
    return { valid: true };
  } catch {
    // Fallback: try AAAA (IPv6)
    try {
      const addr6 = await dnsLookup(hostname, { family: 6 });
      if (addr6.address) {
        const ipValidation = validateResolvedIP(addr6.address, true);
        if (!ipValidation.valid) return ipValidation;
      }
    } catch {
      // No DNS record — let fetch handle it (will fail anyway)
    }
  }
  return { valid: true };
}

/**
 * Follows redirects manually, validating SSRF at each step.
 * Returns final response or throws on SSRF/size limit.
 */
async function fetchWithRedirectProtection(
  initialUrl: string,
  signal: AbortSignal,
  onSizeLimit: (bytesRead: number) => void
): Promise<{ response: Response; finalUrl: string }> {
  let currentUrl = initialUrl;
  let redirectCount = 0;
  const MAX_REDIRECTS = 5;

  while (true) {
    const response = await fetch(currentUrl, {
      signal,
      redirect: 'manual', // Handle redirects manually for IP validation
    });

    // Follow redirects manually, validating each hop
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirectCount >= MAX_REDIRECTS) {
        throw new Error('SSRF_BLOCKED: Limite de redirects excedido');
      }
      const locationHeader = response.headers.get('location');
      if (!locationHeader) {
        throw new Error('SSRF_BLOCKED: Redirect sem header Location');
      }
      // Resolve the redirect URL
      let redirectUrl: string;
      try {
        redirectUrl = new URL(locationHeader, currentUrl).toString();
      } catch {
        throw new Error(`SSRF_BLOCKED: Redirect URL inválida: ${locationHeader}`);
      }
      // Validate the redirect destination hostname
      const redirectValidation = validateFetchUrl(redirectUrl);
      if (!redirectValidation.valid) {
        throw new Error(`SSRF_BLOCKED: Redirect para destino bloqueado — ${redirectValidation.reason}`);
      }
      // Validate resolved IP of redirect target
      try {
        const redirectParsed = new URL(redirectUrl);
        const ipValidation = await resolveAndValidateHostname(redirectParsed.hostname);
        if (!ipValidation.valid) {
          throw new Error(`SSRF_BLOCKED: Redirect para IP privado: ${ipValidation.reason}`);
        }
      } catch (err: any) {
        if (err.message.startsWith('SSRF_BLOCKED:')) throw err;
        throw new Error(`SSRF_BLOCKED: Falha ao validar redirect: ${err.message}`);
      }

      redirectCount++;
      currentUrl = redirectUrl;
      response.body?.cancel().catch(() => {});
      continue;
    }

    // Not a redirect — return final response and URL
    return { response, finalUrl: currentUrl };
  }
}

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
  // Enhanced fields for verification
  confiancaPlaca?: number;
  confiancaCodigoInfracao?: number;
  confiancaDataInfracao?: number;
  confiancaValorMulta?: number;
  validacaoVelocidade?: boolean;
  observacoesValidacao?: string[];
}

export interface OcrProviderConfig {
  ocrSpaceApiKey?: string;
  googleVisionApiKey?: string;
  language?: string; // Default 'por' (Portuguese)
  timeout?: number; // ms, default 30000
}

// ---------------------------------------------------------------------------
// Enhanced Brazilian Traffic Ticket Regex Patterns
// ---------------------------------------------------------------------------

const PLATE_PATTERNS = [
  // Mercosul format: ABC1D23
  /[A-Z]{3}\s?\d[A-Z0-9]\d{2}/g,
  // Old format: ABC-1234
  /[A-Z]{3}-?\d{4}/g,
  // With possible OCR errors
  /[A-Z]{3}[\s\-]?[0-9O][A-Z0-9][\s\-]?[0-9]{2}/g
];

const AIT_PATTERNS = [
  /\b(?:AIT|Nº?|N°|Numero|NÚMERO|Auto[.\s]*Infra[çc][aã]o)[:\s]*(\d{4,12})\b/i,
  /\b(?:Processo|PROCESSO)[:\s]*(\d{4,12})\b/i,
  /\b(\d{4,6}[-.]?\d{2,4}[-.]?\d{2,4})\b/ // Generic numeric ID
];

const CODE_PATTERNS = [
  /\b(?:Código|CODIGO|Artigo|ARTIGO|Art)\.?\s*(\d{3}-\d{2})\b/i,
  /\bInfra[çc][aã]o\s*:?\s*(\d{3}-\d{2})\b/i,
  /\b(\d{3}-\d{2})(?:\s*[-\/]\s*|\s*\(\s*)/ // Code followed by dash or parenthesis
];

const CTB_ARTICLE_PATTERNS = [
  /\bArt\.?\s*(\d{1,3}(?:\.\d{2})?)\s*(?:do\s*)?(?:CTB|Código\s+de\s+Trânsito)/gi,
  /\b(\d{1,3}(?:\.\d{2})?)\s*(?:artigo|ARTIGO)\s*(?:do\s*)?(?:CTB|Código\s+de\s+Trânsito)/gi
];

const VALUE_PATTERNS = [
  /R\$\s*([\d.,]+)/g,
  /Valor\s*:?\s*R?\$?\s*([\d.,]+)/i,
  /multa\s*:?\s*R?\$?\s*([\d.,]+)/i
];

const DATE_PATTERNS = [
  /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/g,
  /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/g, // YYYY-MM-DD format
  /(\d{1,2})\s+de\s+de\s+de\s+(\d{4})/i // DD de MM de YYYY
];

const SPEED_PATTERNS = [
  /(\d{2,3})\s*km\/?h/gi,
  /(\d{2,3})\s*quilometros\s*por\s*hora/gi,
  /Velocidade[:\s]*(\d{2,3})\s*km\/h/i
];

const RENAVAM_PATTERN = /\bRENAVAM[:\s]*(\d{9,11})\b/i;

// Enhanced infraction code database with more codes and better structure
const INFRACAO_CODES: Record<string, { 
  description: string; 
  article: string; 
  severity: string;
  points: number;
  isSpeedRelated: boolean;
  typicalSpeedRange?: { min: number; max: number };
}> = {
  '518-10': { description: 'Dirigir veículos automotores ou reboques com dimensões acima dos limites', article: 'Art. 203', severity: 'média', points: 0, isSpeedRelated: false },
  '745-50': { description: 'Velocidade acima da permitida em até 20%', article: 'Art. 218, I', severity: 'leve', points: 4, isSpeedRelated: true, typicalSpeedRange: { min: 1, max: 20 } },
  '745-51': { description: 'Velocidade acima da permitida de 21% a 50%', article: 'Art. 218, II', severity: 'média', points: 5, isSpeedRelated: true, typicalSpeedRange: { min: 21, max: 50 } },
  '745-52': { description: 'Velocidade acima da permitida acima de 50%', article: 'Art. 218, III', severity: 'gravíssima', points: 7, isSpeedRelated: true, typicalSpeedRange: { min: 51, max: 100 } },
  '516-91': { description: 'Conduzir veículo sob influência de álcool ou substância psicoativa', article: 'Art. 165', severity: 'gravíssima', points: 7, isSpeedRelated: false },
  '736-62': { description: 'Utilizar equipamento de telefonia celular durante a direção', article: 'Art. 252, Parágrafo Único', severity: 'média', points: 4, isSpeedRelated: false },
  '605-01': { description: 'Não respeitar a sinalização semafórica', article: 'Art. 208', severity: 'média', points: 4, isSpeedRelated: false },
  '746-10': { description: 'Ultrapassar faixa dupla contínua', article: 'Art. 199', severity: 'média', points: 4, isSpeedRelated: false },
  '746-30': { description: 'Avançar o sinal vermelho do semáforo', article: 'Art. 208', severity: 'média', points: 5, isSpeedRelated: false },
  '752-20': { description: 'Estacionar em local proibido', article: 'Art. 181, IX', severity: 'leve', points: 0, isSpeedRelated: false },
  '753-30': { description: 'Utilizar calçada para estacionamento', article: 'Art. 181, XI', severity: 'média', points: 2, isSpeedRelated: false },
  '761-80': { description: 'Deixar de usar cinto de segurança', article: 'Art. 196', severity: 'leve', points: 0, isSpeedRelated: false },
  '593-70': { description: 'Transitar em velocidade incompatível com a segurança', article: 'Art. 198', severity: 'média', points: 4, isSpeedRelated: true, typicalSpeedRange: { min: 1, max: 100 } },
  '516-92': { description: 'Conduzir veículo com concentração de álcool por decilitro de sangue igual ou superior a 0,06 gram', article: 'Art. 165 do CTB', severity: 'gravíssima', points: 7, isSpeedRelated: false },
  '747-10': { description: 'Velocidade acima da permitida em mais de 50% (factor multiplicador)', article: 'Art. 218, III', severity: 'gravíssima', points: 7, isSpeedRelated: true, typicalSpeedRange: { min: 51, max: 100 } },
  '748-90': { description: 'Fugir da blitz policial', article: 'Art. 311', severity: 'gravíssima', points: 7, isSpeedRelated: false }
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
// Enhanced Ticket Parser — Extract structured data from raw OCR text
// ---------------------------------------------------------------------------

function extractWithPatterns(text: string, patterns: RegExp[]): string[] {
  let results: string[] = [];
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      results = matches.map(m => m[1]).filter(Boolean);
      if (results.length > 0) break;
    }
  }
  return results;
}

function validatePlaca(placa: string): { isValid: boolean; confidence: number } {
  // Remove non-alphanumeric characters and convert to uppercase
  const cleanPlaca = placa.replace(/[^A-Z0-9]/g, '').toUpperCase();
  
  // Mercosul pattern: AAA1A23
  const mercosulPattern = /^[A-Z]{3}\d[A-Z]\d{2}$/;
  // Old pattern: AAA-1234 or AAA1234
  const oldPattern = /^[A-Z]{3}\d{4}$/;
  
  if (mercosulPattern.test(cleanPlaca) || oldPattern.test(cleanPlaca)) {
    return { isValid: true, confidence: 95 };
  }
  
  // Check for common OCR errors
  if (/^[A-Z]{3}[0-9O][A-Z0-9]\d{2}$/.test(cleanPlaca)) {
    return { isValid: true, confidence: 80 }; // Likely OCR confusion between 0 and O
  }
  
  return { isValid: false, confidence: 0 };
}

function validateCodigoInfracao(codigo: string): { isValid: boolean; confidence: number } {
  if (!/^\d{3}-\d{2}$/.test(codigo)) {
    return { isValid: false, confidence: 0 };
  }
  
  // Check if it's in our database
  if (INFRACAO_CODES[codigo]) {
    return { isValid: true, confidence: 95 };
  }
  
  // Check if it follows the format but isn't in our database (might be a newer code)
  return { isValid: true, confidence: 70 }; // Format is valid but code unknown
}

function validateDataInfracao(data: string): { isValid: boolean; confidence: number } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return { isValid: false, confidence: 0 };
  }
  
  const [year, month, day] = data.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  // Check if it's a valid date
  if (isNaN(date.getTime())) {
    return { isValid: false, confidence: 0 };
  }
  
  // Check if it's not in the future (more than 1 day tolerance for timezone issues)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inputDate = new Date(year, month - 1, day);
  
  if (inputDate > today) {
    return { isValid: false, confidence: 30 }; // Future date is suspicious
  }
  
  // Check if it's not too old (more than 10 years)
  const tenYearsAgo = new Date();
  tenYearsAgo.setFullYear(today.getFullYear() - 10);
  
  if (inputDate < tenYearsAgo) {
    return { isValid: false, confidence: 40 }; // Too old is suspicious
  }
  
  return { isValid: true, confidence: 90 };
}

function validateValorMulta(valor: number): { isValid: boolean; confidence: number } {
  if (isNaN(valor) || valor < 0) {
    return { isValid: false, confidence: 0 };
  }
  
  // Typical traffic fine ranges in Brazil (as of 2024)
  // Minor infractions: R$ 88,38 to R$ 130,16
  // Medium infractions: R$ 130,16 to R$ 293,47
  // Serious infractions: R$ 293,47 to R$ 586,94
  // Very serious infractions: R$ 586,94 to R$ 2.934,70
  
  if (valor >= 50 && valor <= 10000) {
    return { isValid: true, confidence: 85 };
  }
  
  if (valor >= 10000 && valor <= 50000) {
    return { isValid: true, confidence: 60 }; // Unusually high but possible
  }
  
  return { isValid: false, confidence: 10 }; // Likely an extraction error
}

function validateVelocidades(
  velocidadePermitida: number | undefined,
  velocidadeAferida: number | undefined,
  velocidadeConsiderada: number | undefined,
  codigoInfracao: string
): { isValid: boolean; confidence: number; observacoes: string[] } {
  const observacoes: string[] = [];
  
  // If no speed data, that's OK for non-speed related infractions
  const infracaoInfo = INFRACAO_CODES[codigoInfracao];
  if (!infracaoInfo || !infracaoInfo.isSpeedRelated) {
    return { isValid: true, confidence: 90, observacoes: ['Infração não relacionada a velocidade'] };
  }
  
  // For speed-related infractions, we expect speed data
  if (!velocidadePermitida || !velocidadeAferida) {
    observacoes.push('Dados de velocidade incompletos para infração relacionada a velocidade');
    return { isValid: false, confidence: 40, observacoes };
  }
  
  // Validate speed ranges
  if (velocidadePermitida < 10 || velocidadePermitida > 200) {
    observacoes.push(`Velocidade permitida fora do intervalo esperado: ${velocidadePermitida} km/h`);
  }
  
  if (velocidadeAferida < 10 || velocidadeAferida > 300) {
    observacoes.push(`Velocidade aferida fora do intervalo esperado: ${velocidadeAferida} km/h`);
  }
  
  // Check if the speeds make sense together
  if (velocidadeAferida < velocidadePermitida) {
    observacoes.push('Velocidade aferida menor que a permitida (possível erro de medição ou extracção)');
  }
  
  // Calculate excess percentage
  const excessoPercentual = ((velocidadeAferida - velocidadePermitida) / velocidadePermitida) * 100;
  
  // Check if it matches the infraction code expectations
  if (infracaoInfo.typicalSpeedRange) {
    const { min, max } = infracaoInfo.typicalSpeedRange;
    if (excessoPercentual < min || excessoPercentual > max) {
      observacoes.push(
        `Excesso percentual (${excessoPercentual.toFixed(1)}%) não compatível com o código de infração ` +
        `(${codigoInfracao}), que geralmente corresponde a ${min}%-${max}% acima do limite`
      );
    }
  }
  
  const isValid = observacoes.length === 0;
  const confidence = isValid ? 85 : Math.max(30, 85 - observacoes.length * 15);
  
  return { isValid, confidence, observacoes };
}

function parseTrafficTicket(rawText: string): ExtractedTicketData {
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const observacoesValidacao: string[] = [];

  // Extract plates with multiple pattern attempts
  let placa = 'N/A';
  let confiancaPlaca = 0;
  
  const plateMatches = extractWithPatterns(text, PLATE_PATTERNS);
  if (plateMatches.length > 0) {
    const validation = validatePlaca(plateMatches[0]);
    placa = plateMatches[0].replace(/[^A-Z0-9]/g, '').toUpperCase();
    confiancaPlaca = validation.confidence;
    if (!validation.isValid) {
      observacoesValidacao.push(`Placa pode estar incorreta: ${placa}`);
    }
  }

  // Extract AIT number
  let aitNumber = `AIT-${Date.now().toString().slice(-8)}`;
  const aitMatches = extractWithPatterns(text, AIT_PATTERNS);
  if (aitMatches.length > 0) {
    aitNumber = aitMatches[0];
  }

  // Extract infraction code
  let codigoInfracao = '';
  let confiancaCodigoInfracao = 0;
  
  const codeMatches = extractWithPatterns(text, CODE_PATTERNS);
  if (codeMatches.length > 0) {
    const validation = validateCodigoInfracao(codeMatches[0]);
    codigoInfracao = codeMatches[0];
    confiancaCodigoInfracao = validation.confidence;
    if (!validation.isValid) {
      observacoesValidacao.push(`Código de infração pode estar incorreto: ${codigoInfracao}`);
    }
  }

  // Extract CTB article
  let artigoCtb = '';
  const articleMatches = [...text.matchAll(CTB_ARTICLE_PATTERNS[0])];
  if (articleMatches.length === 0) {
    // Try the second pattern
    articleMatches.push(...[...text.matchAll(CTB_ARTICLE_PATTERNS[1])]);
  }
  if (articleMatches.length > 0) {
    artigoCtb = articleMatches.map((m: RegExpMatchArray) => `Art. ${m[1]}`).join(', ');
  }

  // Extract monetary values
  let valorMulta = 0;
  let confiancaValorMulta = 0;
  const allValues: number[] = [];
  
  for (const pattern of VALUE_PATTERNS) {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(m => {
      const value = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
      if (!isNaN(value)) allValues.push(value);
    });
  }
  
  if (allValues.length > 0) {
    // Find the most likely fine amount (typically between 50 and 5000)
    const fineCandidates = allValues.filter(v => v >= 50 && v <= 5000);
    if (fineCandidates.length > 0) {
      valorMulta = fineCandidates[0]; // Take the first reasonable candidate
      const validation = validateValorMulta(valorMulta);
      confiancaValorMulta = validation.confidence;
      if (!validation.isValid) {
        observacoesValidacao.push(`Valor da multa suspeito: R$ ${valorMulta.toFixed(2)}`);
      }
    } else if (allValues.length > 0) {
      // If no typical fine found, take the smallest reasonable value
      valorMulta = Math.min(...allValues.filter(v => v >= 10));
      const validation = validateValorMulta(valorMulta);
      confiancaValorMulta = validation.confidence * 0.8; // Lower confidence for atypical value
      if (!validation.isValid) {
        observacoesValidacao.push(`Valor da multa fora do intervalo típico: R$ ${valorMulta.toFixed(2)}`);
      }
    }
  }

  // Extract dates
  let dataInfracao = '';
  let confiancaDataInfracao = 0;
  
  const allDates: string[] = [];
  for (const pattern of DATE_PATTERNS) {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(m => {
      let dateStr: string;
      if (m.length === 4) { // DD/MM/YYYY or MM/DD/YYYY
        const [, day, month, year] = m;
        dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else if (m.length === 3) { // YYYY-MM-DD
        const [, year, month, day] = m;
        dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else {
        // Handle "DD de MM de YYYY" format
        const [, day, , month, , year] = m as any;
        const monthNum = {
          'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04',
          'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
          'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
        }[month.toLowerCase()] || '01';
        dateStr = `${year}-${monthNum}-${day.padStart(2, '0')}`;
      }
      if (dateStr) allDates.push(dateStr);
    });
  }
  
  if (allDates.length > 0) {
    // Take the first date that looks like an infraction date (not too far in past/future)
    const validDates = allDates.filter(date => {
      const validation = validateDataInfracao(date);
      return validation.isValid;
    });
    
    if (validDates.length > 0) {
      dataInfracao = validDates[0];
      const validation = validateDataInfracao(dataInfracao);
      confiancaDataInfracao = validation.confidence;
    } else if (allDates.length > 0) {
      // Use the first date even if validation failed, but with lower confidence
      dataInfracao = allDates[0];
      const validation = validateDataInfracao(dataInfracao);
      confiancaDataInfracao = validation.confidence * 0.5;
      observacoesValidacao.push(`Data pode estar incorreta: ${dataInfracao}`);
    }
  }

  // Extract location (heuristic: look for street/avenue patterns)
  const localInfracao = extractLocation(text);

  // Extract orgao autuador
  const orgaoAutuador = extractOrgao(text);

  // Extract description from infraction code lookup
  const infracaoInfo = INFRACAO_CODES[codigoInfracao];
  let descricao = infracaoInfo?.description || extractDescription(text);
  if (!infracaoInfo && descricao === 'Infração de trânsito') {
    observacoesValidacao.push(`Código de infração não reconhecido: ${codigoInfracao}`);
  }

  // Extract defense deadline
  const prazoDefesa = extractDefenseDeadline(text, 
    allDates.map(d => `${d}T00:00:00`) // Convert to ISO strings for the function
  );

  // Radar equipment
  const radarMatch = text.match(/(?:Equipamento|Radar|EQUIPAMENTO)[:\s]*([A-Z0-9\-]+)/i);
  const equipamentoRadar = radarMatch?.[1];

  // Aferição date
  const afericaoMatch = text.match(/(?:Aferição|AFERIÇÃO|Validade)[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i);
  const dataAfericao = afericaoMatch?.[1]?.replace(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/, '$3-$2-$1');

  // Extract speed values
  let velocidadePermitida: number | undefined;
  let VelocidadeAferida: number | undefined;
  let velocidadeConsiderada: number | undefined;
  
  const allSpeeds: number[] = [];
  for (const pattern of SPEED_PATTERNS) {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(m => {
      const speed = parseInt(m[1], 10);
      if (!isNaN(speed)) allSpeeds.push(speed);
    });
  }
  
  if (allSpeeds.length >= 1) velocidadePermitida = allSpeeds[0];
  if (allSpeeds.length >= 2) VelocidadeAferida = allSpeeds[1];
  if (allSpeeds.length >= 3) velocidadeConsiderada = allSpeeds[2];
  else if (allSpeeds.length === 2) velocidadeConsiderada = VelocidadeAferida;

  // Validate speeds for speed-related infractions
  let validacaoVelocidade = true;
  let velocidadeConfianca = 90;
  
  if (infracaoInfo?.isSpeedRelated) {
    const velocidadeValidation = validateVelocidades(
      velocidadePermitida, 
      VelocidadeAferida, 
      velocidadeConsiderada, 
      codigoInfracao
    );
    validacaoVelocidade = velocidadeValidation.isValid;
    velocidadeConfianca = velocidadeValidation.confidence;
    observacoesValidacao.push(...velocidadeValidation.observacoes);
  }

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
    // Enhanced verification fields
    confiancaPlaca: confiancaPlaca || 0,
    confiancaCodigoInfracao: confiancaCodigoInfracao || 0,
    confiancaDataInfracao: confiancaDataInfracao || 0,
    confiancaValorMulta: confiancaValorMulta || 0,
    validacaoVelocidade,
    observacoesValidacao: observacoesValidacao.length > 0 ? observacoesValidacao : undefined
  };
}

function extractLocation(text: string): string {
  const locationPatterns = [
    /(?:Local|LOCAL|Endereço|ENDEREÇO|Via|VIA|Trecho|TRECHO)[:\s]*(.+?)(?:\n|$)/i,
    /((?:Av\.|Avenida|Rua|R\.|Rod\.|Rodovia|Al\.|Alameda|Travessa|Trav\\.|Praça|Pç\\.)\s+.+?)(?:\n|—|-|$)/i,
    /((?:Av\.|Avenida|Rua|R\.|Rod\.|Rodovia|Al\.|Alameda|Travessa|Trav\\.|Praça|Pç\\.)\s+.+?),\s*(.{2,30}\/[A-Z]{2})/i,
    /(?:km\s*)?(\d+[\.,]\d+)\s*(?:de\s+)?(?:Av\.|Avenida|Rua|R\.|Rod\.|Rodovia)/i
  ];

  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) {
      let result = (match[1] || match[0]).trim();
      // Clean up common OCR artifacts
      result = result.replace(/[\-_]{2,}/g, '-').replace(/\s{2,}/g, ' ');
      return result.substring(0, 150);
    }
  }

  return 'N/A';
}

function extractOrgao(text: string): string {
  const orgaoPatterns = [
    /(?:Órgão|ORGAO|Autuador|AUTUADOR|Exigência|Autoridade)[:\s]*(.+?)(?:\n|$)/i,
    /(DETRAN[-\s]*[A-Z]{2})/i,
    /(CETRAN[-\s]*[A-Z]{2})/i,
    /(BHTRANS|SPTRANS|CBM|PMDF|PCDF|PM|GCM|Guardas?\s+Municipais)/i,
    /(Secretaria.+?(?:Trânsito|Trasito|Segurança|Transportes).+?)(?:\n|$)/i,
    /(Polícia\s+Rodoviária\s+Federal|PRF)/i,
    /(Polícia\s+Militar|PM)\s+[A-Z]{2}/i
  ];

  for (const pattern of orgaoPatterns) {
    const match = text.match(pattern);
    if (match) {
      let result = (match[1] || match[0]).trim();
      // Clean up common OCR artifacts
      result = result.replace(/[\-_]{2,}/g, '-').replace(/\s{2,}/g, ' ');
      return result.substring(0, 100);
    }
  }

  return 'N/A';
}

function extractDescription(text: string): string {
  const descPatterns = [
    /(?:Infração|INFRAÇÃO|Descrição|DESCRIÇÃO|Motivo|MOTIVO|Conduta|CONDUTA)[:\s]*(.+?)(?:\n|$)/i,
    /(?:Veículo|VEÍCULO)\s*:?\s*(.+?)(?:\n|$)/i,
    /(?:Condutor|CONDUTOR)\s*:?\s*(.+?)(?:\n|$)/i
  ];

  for (const pattern of descPatterns) {
    const match = text.match(pattern);
    if (match) {
      let result = match[1].trim();
      // Clean up common OCR artifacts
      result = result.replace(/[\-_]{2,}/g, '-').replace(/\s{2,}/g, ' ');
      return result.substring(0, 200);
    }
  }

  return 'Infração de trânsito';
}

function extractDefenseDeadline(text: string, dates: string[]): string {
  const deadlinePatterns = [
    /(?:Prazo|PRAZO|Defesa|DEFESA|recurso|RECURSO|notificação|NOTIFICAÇÃO)[:\s]*(?:at[aéé]|prazo|data\s+limite)[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
    /(?:data\s+limite|DATA\s+LIMITE|vencimento|VENCIMENTO)[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
    /(?:protela[çc][aã]o|PROTELA[ÇC][AÃ]O)[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i
  ];

  for (const pattern of deadlinePatterns) {
    const match = text.match(pattern);
    if (match) {
      const dateMatch = match[1].match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
      if (dateMatch) {
        const [, day, month, year] = dateMatch;
        const validatedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        const validation = validateDataInfracao(validatedDate);
        if (validation.isValid) {
          return validatedDate;
        }
      }
    }
  }

  // Default: 30 days from last date found
  if (dates.length > 0) {
    try {
      const validDates = dates
        .map(d => new Date(d))
        .filter(d => !isNaN(d.getTime()))
        .sort((a, b) => b.getTime() - a.getTime()); // Descending order
      
      if (validDates.length > 0) {
        const lastDate = validDates[0];
        lastDate.setDate(lastDate.getDate() + 30);
        return lastDate.toISOString().split('T')[0];
      }
    } catch (e) {
      // If date parsing fails, continue to fallback
    }
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
    // Resource limit: base64 input should not exceed ~7MB (corresponds to ~5MB binary)
    const MAX_BASE64_SIZE = 7 * 1024 * 1024;
    if (imageBase64.length > MAX_BASE64_SIZE) {
      throw new Error(`MAX_BASE64_SIZE_EXCEEDED: Payload base64 muito grande (${imageBase64.length} chars). Máximo: ${MAX_BASE64_SIZE} chars.`);
    }

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
        codigoInfracao: dadosExtraidos.codigoInfracao,
        confiancaPlaca: dadosExtraidos.confiancaPlaca,
        confiancaCodigoInfracao: dadosExtraidos.confiancaCodigoInfracao
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
        codigoInfracao: dadosExtraidos.codigoInfracao,
        confiancaPlaca: dadosExtraidos.confiancaPlaca,
        confiancaCodigoInfracao: dadosExtraidos.confiancaCodigoInfracao
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
   * Includes SSRF protection (DNS + redirect validation) and streaming size limit.
   */
  async analyzeFromUrl(imageUrl: string): Promise<OcrResult> {
    // Step 1: Validate URL format and hostname
    const urlValidation = validateFetchUrl(imageUrl);
    if (!urlValidation.valid) {
      throw new Error(`SSRF_BLOCKED: ${urlValidation.reason}`);
    }

    // Step 2: Resolve DNS and validate the IP is not private
    // This runs right before fetch to minimize TOCTOU window
    try {
      const parsed = new URL(imageUrl);
      const dnsValidation = await resolveAndValidateHostname(parsed.hostname);
      if (!dnsValidation.valid) {
        throw new Error(`SSRF_BLOCKED: ${dnsValidation.reason}`);
      }
    } catch (err: any) {
      if (err.message.startsWith('SSRF_BLOCKED:')) throw err;
      // DNS resolution failure — let fetch fail naturally (it will throw a better error)
    }

    // Step 3: Set up streaming download with size limit
    const controller = new AbortController();
    const timeoutMs = this.config.timeout || 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Follow redirects manually to validate each hop
      const { response, finalUrl } = await fetchWithRedirectProtection(
        imageUrl,
        controller.signal,
        () => controller.abort()
      );

      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status}`);
      }

      // Step 4: Check Content-Length as early warning
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const size = parseInt(contentLength, 10);
        if (size > MAX_DOWNLOAD_SIZE) {
          throw new Error(`MAX_SIZE_EXCEEDED: Arquivo muito grande (${size} bytes). Máximo: ${MAX_DOWNLOAD_SIZE} bytes.`);
        }
      }

      // Step 5: Stream the response body with hard size limit
      // This is the real protection — we never load the full file into memory
      const body = response.body;
      if (!body) {
        throw new Error('Response body is not readable');
      }

      const reader = body.getReader();
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunkSize = value.byteLength;
          const newTotal = totalBytes + chunkSize;

          if (newTotal > MAX_DOWNLOAD_SIZE) {
            // Hard limit exceeded — abort immediately
            controller.abort();
            throw new Error(
              `MAX_SIZE_EXCEEDED: Limite de ${MAX_DOWNLOAD_SIZE} bytes excedido durante streaming. ` +
              `Bytes lidos: ${newTotal}. Abortando antes de memory exhaustion.`
            );
          }

          chunks.push(value);
          totalBytes = newTotal;
        }
      } finally {
        // Always release the reader
        reader.releaseLock();
      }

      clearTimeout(timeoutId);

      // Combine chunks into a single buffer
      const buffer = Buffer.concat(chunks);
      const base64 = buffer.toString('base64');
      return this.analyzeImage(base64);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError' || err.message?.startsWith('SSRF_BLOCKED:') || err.message?.startsWith('MAX_SIZE_EXCEEDED:')) {
        throw err;
      }
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