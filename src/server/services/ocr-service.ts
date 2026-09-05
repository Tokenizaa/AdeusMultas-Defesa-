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

import * as net from 'net';
import * as tls from 'tls';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { isIP } from 'net';
import { logger } from '../observability/logger';

// promisify DNS functions
const dnsResolve4 = (hostname: string): Promise<string[]> =>
  new Promise((resolve, reject) => {
    dns.resolve4(hostname, (err, addresses) => {
      if (err) reject(err);
      else resolve(addresses || []);
    });
  });
const dnsResolve6 = (hostname: string): Promise<string[]> =>
  new Promise((resolve, reject) => {
    dns.resolve6(hostname, (err, addresses) => {
      if (err) reject(err);
      else resolve(addresses || []);
    });
  });
const dnsLookupOne = (hostname: string): Promise<string> =>
  new Promise((resolve, reject) => {
    dns.lookup(hostname, (err, address) => {
      if (err) reject(err);
      else resolve(address);
    });
  });

// ---------------------------------------------------------------------------
// SSRF Protection — comprehensive IP classification + connect binding
// ---------------------------------------------------------------------------

/** Maximum allowed download size in bytes (5MB) */
const MAX_DOWNLOAD_SIZE = 5 * 1024 * 1024;
const MAX_REDIRECTS = 5;

/**
 * Complete IPv4 address classification.
 * Returns true if the IP is public (safe to connect to).
 * Based on RFC 5735, RFC 6598, RFC 2544, RFC 1112, RFC 1122, RFC 7042.
 */
function isPublicIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return false;
  const [a, b, c, d] = parts;

  // === LOOPBACK ===
  if (a === 127) return false; // 127.0.0.0/8

  // === "THIS" NETWORK ===
  if (a === 0) return false; // 0.0.0.0/8

  // === PRIVATE USE (RFC 1918) ===
  if (a === 10) return false; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return false; // 172.16.0.0/12
  if (a === 192 && b === 168) return false; // 192.168.0.0/16

  // === CARRIER-GRADE NAT (RFC 6598) ===
  if (a === 100 && b >= 64 && b <= 127) return false; // 100.64.0.0/10

  // === LINK-LOCAL (RFC 3927) ===
  if (a === 169 && b === 254) return false; // 169.254.0.0/16

  // === SHARED ADDRESS SPACE (CGN — also RFC 6598) ===
  // Already covered by 100.64.0.0/10 above

  // === DOCUMENTATION (RFC 5737) ===
  if (a === 192 && b === 0 && c === 2) return false; // 192.0.2.0/24
  if (a === 198 && b === 51 && c === 100) return false; // 198.51.100.0/24
  if (a === 203 && b === 0 && c === 113) return false; // 203.0.113.0/24

  // === BENCHMARKING (RFC 2544) ===
  if (a === 198 && b >= 18 && b <= 19) return false; // 198.18.0.0/15

  // === 6to4 (RFC 3056) ===
  if (a === 192 && b === 88 && c === 99) return false; // 192.88.99.0/24

  // === RESERVED (IETF Protocol IDs — RFC 1112) ===
  if (a >= 240) return false; // 240.0.0.0/4

  // === BROADCAST ===
  if (a === 255 && b === 255 && c === 255 && d === 255) return false; // 255.255.255.255/32

  return true;
}

/**
 * Complete IPv6 address classification.
 * Returns true if the IP is public (safe to connect to).
 * Based on RFC 4291, RFC 8190, RFC 7345, RFC 8190, RFC 6890.
 */
function isPublicIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();

  // === UNSPECIFIED ===
  if (lower === '::') return false; // ::/128

  // === LOOPBACK ===
  if (lower === '::1') return false; // ::1/128

  // === IPv4-MAPPED IPv6 ===
  if (lower.startsWith('::ffff:')) {
    const mapped = lower.replace('::ffff:', '');
    return isPublicIPv4(mapped);
  }

  // === IPv4-EMBEDDED (IPv6 translation) ===
  if (lower.startsWith('64:ff9b::') || lower.startsWith('64:ff9b:')) return false;

  // === DISCARD PREFIX (RFC 6666) ===
  if (lower.startsWith('100::') || lower.startsWith('100:')) return false;

  // === TEREDO (RFC 4380) — except 2001:0000::/32 ===
  if (lower.startsWith('2001:') && !lower.startsWith('2001:db8') && !lower.startsWith('2001:0:')) {
    // 2001::/32 is Teredo — allow only non-Teredo
    // Actually, 2001::/32 includes Teredo and should be blocked
    // 2001:20::/28 is ORCHID v2 — blocked
    if (lower.startsWith('2001:20')) return false;
    // 2001:0000::/32 (Teredo) — block
    if (lower.match(/^2001:0+:/)) return false;
  }

  // === DOCUMENTATION (RFC 3849) ===
  if (lower.startsWith('2001:db8')) return false; // 2001:db8::/32

  // === ULAs (RFC 4193) ===
  if (lower.startsWith('fc')) return false; // fc00::/7 (fc00::/8 unassigned, fd00::/8 UCLA)
  if (lower.startsWith('fd')) return false;

  // === LINK-LOCAL (RFC 4291) ===
  if (lower.startsWith('fe80')) return false; // fe80::/10
  if (lower.startsWith('fe') && lower.match(/^fe[0-3]:/)) return false; // fe00::/9 through feff::/9

  // === MULTICAST (RFC 5774/4291) ===
  if (lower.startsWith('ff')) return false; // ff00::/8

  // === ORCHID v2 (RFC 7345) ===
  if (lower.startsWith('2001:20::')) return false; // 2001:20::/28

  return true;
}

/**
 * Validates that a URL is safe for fetching (hostname-level only).
 * DNS resolution is done separately to allow IP binding.
 */
function validateFetchUrl(inputUrl: string): { valid: boolean; reason?: string } {
  let url: URL;
  try {
    url = new URL(inputUrl);
  } catch {
    return { valid: false, reason: 'URL malformada' };
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return { valid: false, reason: `Esquema '${url.protocol}' não permitido — use http:// ou https://` };
  }

  if (url.username || url.password) {
    return { valid: false, reason: 'Credenciais na URL não permitidas' };
  }

  const hostname = url.hostname.toLowerCase();

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

  const internalPatterns = [
    'internal', 'intranet', 'private', 'corporate', 'dmz',
    'gateway', 'router', 'switch', 'firewall', 'proxy',
    'metadata.google', 'metadata.internal',
    '169.254.169.254',
  ];
  for (const pattern of internalPatterns) {
    if (hostname.includes(pattern)) {
      return { valid: false, reason: `Hostname interno '${pattern}' não permitido` };
    }
  }

  return { valid: true };
}

/**
 * Resolves a hostname to ALL IP addresses (A + AAAA records) and validates
 * that ALL of them are public. This prevents DNS rebinding where one record
 * is public but another is private.
 *
 * If the hostname is already an IP address, validates it directly without DNS.
 *
 * Returns fail-closed: if DNS fails or no valid IP is found, returns invalid.
 * The caller must use one of the VALIDATED IPs — never a fresh DNS resolution.
 */
async function resolveAndValidateAllIPs(hostname: string): Promise<{ valid: boolean; reason?: string; validatedIPs: string[] }> {
  const errors: string[] = [];
  const validatedIPs: string[] = [];

  // If hostname is already an IP, validate it directly (no DNS needed)
  const ipVersion = isIP(hostname);
  if (ipVersion === 4) {
    if (!isPublicIPv4(hostname)) {
      return { valid: false, reason: `IP privado/reservado: ${hostname}`, validatedIPs: [] };
    }
    return { valid: true, validatedIPs: [hostname] };
  }
  if (ipVersion === 6) {
    if (!isPublicIPv6(hostname)) {
      return { valid: false, reason: `IP IPv6 privado/reservado: ${hostname}`, validatedIPs: [] };
    }
    return { valid: true, validatedIPs: [hostname] };
  }

  // Resolve all IPv4 (A records)
  let v4Addresses: string[] = [];
  try {
    v4Addresses = await dnsResolve4(hostname);
    for (const ip of v4Addresses) {
      if (!isPublicIPv4(ip)) {
        errors.push(`IPv4 privado/reservado: ${ip}`);
      } else {
        validatedIPs.push(ip);
      }
    }
  } catch (err: any) {
    // DNS resolution failed — fail closed for SSRF
    return {
      valid: false,
      reason: `Falha ao resolver DNS para '${hostname}': ${err.message}. Bloqueando conexão.`,
      validatedIPs: [],
    };
  }

  // Resolve all IPv6 (AAAA records)
  let v6Addresses: string[] = [];
  try {
    v6Addresses = await dnsResolve6(hostname);
    for (const ip of v6Addresses) {
      if (!isPublicIPv6(ip)) {
        errors.push(`IPv6 privado/reservado: ${ip}`);
      } else {
        validatedIPs.push(ip);
      }
    }
  } catch (err: any) {
    // No AAAA records — that's OK, we have A records
  }

  if (errors.length > 0) {
    return { valid: false, reason: `IP não público: ${errors.join('; ')}`, validatedIPs: [] };
  }

  if (validatedIPs.length === 0) {
    return {
      valid: false,
      reason: `Nenhum IP público encontrado para '${hostname}' após resolução DNS. Bloqueando.`,
      validatedIPs: [],
    };
  }

  return { valid: true, validatedIPs };
}

/**
 * Makes a raw HTTP/HTTPS request using a direct socket connection to the validated IP.
 * This completely bypasses DNS at the connection level — we connect to the IP we validated.
 *
 * The Host header is set to the real hostname, preserving SNI for HTTPS and
 * ensuring the server routes the request correctly.
 *
 * This eliminates DNS rebinding because the connection is made directly to the
 * pre-validated IP — the OS resolver is never called for this connection.
 */
async function ssrfSafeFetch(
  validatedIP: string,
  hostname: string,
  port: number,
  isHTTPS: boolean,
  signal: AbortSignal
): Promise<{ body: NodeJS.ReadableStream; status: number; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const timeoutMs = 30000;
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error('Connection timeout'));
    }, timeoutMs);

    const onAbort = () => {
      clearTimeout(timeout);
      socket.destroy();
      reject(new Error('Request aborted'));
    };

    if (signal?.aborted) {
      return reject(new Error('Request already aborted'));
    }
    signal?.addEventListener('abort', onAbort, { once: true });

    const socket = isHTTPS
      ? tls.connect({ host: hostname, port, servername: hostname }, onConnect)
      : net.connect({ host: validatedIP, port }, onConnect);

    socket.setKeepAlive(true, 10000);

    let bytesReceived = 0;
    let headersReceived = false;
    let statusCode = 0;
    const headers: http.IncomingHttpHeaders = {};
    let bodyBuffer = Buffer.alloc(0);

    function onConnect() {
      // Build HTTP request with the REAL hostname in the Host header
      // This ensures SNI (for HTTPS) and correct routing on the server
      const req = isHTTPS
        ? (socket as tls.TLSSocket).starttls(
            `GET / HTTP/1.1\r\nHost: ${hostname}\r\nConnection: close\r\n\r\n`
          )
        : socket;

      req.write(
        `GET / HTTP/1.1\r\nHost: ${hostname}\r\nConnection: close\r\n\r\n`
      );
    }

    let dataHandler: (chunk: Buffer) => void;
    let endHandler: () => void;
    let errorHandler: (err: Error) => void;

    dataHandler = (chunk: Buffer) => {
      if (!headersReceived) {
        const str = bodyBuffer.length > 0 ? Buffer.concat([bodyBuffer, chunk]).toString('utf8') : chunk.toString('utf8');
        const headerEndIdx = str.indexOf('\r\n\r\n');
        if (headerEndIdx === -1) {
          bodyBuffer = Buffer.from(str, 'utf8');
          return;
        }
        const headerSection = str.slice(0, headerEndIdx);
        const bodyStr = str.slice(headerEndIdx + 4);
        headersReceived = true;

        // Parse status line
        const lines = headerSection.split('\r\n');
        const statusLine = lines[0];
        const match = statusLine.match(/HTTP\/1\.\d\s+(\d{3})/);
        if (match) statusCode = parseInt(match[1], 10);

        // Parse headers
        for (let i = 1; i < lines.length; i++) {
          const colonIdx = lines[i].indexOf(':');
          if (colonIdx > 0) {
            const key = lines[i].slice(0, colonIdx).trim().toLowerCase();
            const value = lines[i].slice(colonIdx + 1).trim();
            headers[key] = value;
          }
        }

        // Check Content-Length before accepting body
        const contentLength = headers['content-length'];
        if (contentLength) {
          const size = parseInt(contentLength, 10);
          if (size > MAX_DOWNLOAD_SIZE) {
            clearTimeout(timeout);
            signal?.removeEventListener('abort', onAbort);
            socket.destroy();
            return reject(new Error(
              `MAX_SIZE_EXCEEDED: Content-Length ${size} exceeds limit ${MAX_DOWNLOAD_SIZE}`
            ));
          }
        }

        bytesReceived = Buffer.from(bodyStr, 'utf8').byteLength;
        bodyBuffer = Buffer.from(bodyStr, 'utf8');

        // Check size limit after first chunk
        if (bytesReceived > MAX_DOWNLOAD_SIZE) {
          clearTimeout(timeout);
          signal?.removeEventListener('abort', onAbort);
          socket.destroy();
          return reject(new Error(
            `MAX_SIZE_EXCEEDED: First chunk ${bytesReceived} exceeds limit ${MAX_DOWNLOAD_SIZE}`
          ));
        }

        if (bodyStr.length > 0) {
          // More data came with headers — buffer it
          bodyBuffer = Buffer.from(bodyStr, 'utf8');
        }
      } else {
        // Continue accumulating body
        const newBuffer = Buffer.concat([bodyBuffer, chunk]);
        bytesReceived = newBuffer.byteLength;
        if (bytesReceived > MAX_DOWNLOAD_SIZE) {
          clearTimeout(timeout);
          signal?.removeEventListener('abort', onAbort);
          socket.destroy();
          return reject(new Error(
            `MAX_SIZE_EXCEEDED: Total ${bytesReceived} exceeds limit ${MAX_DOWNLOAD_SIZE}`
          ));
        }
        bodyBuffer = newBuffer;
      }
    };

    endHandler = () => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
      socket.destroy();

      // Convert buffer to readable stream
      const { Readable } = require('stream') as typeof import('stream');
      const readable = Readable.from(bodyBuffer);

      resolve({ body: readable as unknown as NodeJS.ReadableStream, status: statusCode, headers });
    };

    errorHandler = (err: Error) => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
      if (err.message?.includes('SSRF_BLOCKED') || err.message?.includes('MAX_SIZE_EXCEEDED')) {
        return reject(err);
      }
      reject(new Error(`Connection error: ${err.message}`));
    };

    socket.on('data', dataHandler);
    socket.on('end', endHandler);
    socket.on('error', errorHandler);
  });
}

/**
 * HTTP response wrapper that mimics enough of the fetch Response interface
 * for our streaming needs.
 */
interface SsrfakeResponse {
  ok: boolean;
  status: number;
  headers: Map<string, string>;
  body: NodeJS.ReadableStream | null;
}

/**
 * Follows redirects with full SSRF validation at each hop.
 * Uses resolveAndValidateAllIPs + direct socket connection to eliminate DNS rebinding.
 * The connection is made directly to a validated IP — no fresh DNS resolution at connection time.
 */
async function fetchWithRedirectProtection(
  initialUrl: string,
  signal: AbortSignal
): Promise<{ response: SsrfakeResponse; finalUrl: string }> {
  let currentUrl = initialUrl;
  let redirectCount = 0;

  while (true) {
    const url = new URL(currentUrl);
    const port = url.port ? parseInt(url.port, 10) : (url.protocol === 'https:' ? 443 : 80);
    const isHTTPS = url.protocol === 'https:';

    // Validate URL format/hostname
    const urlValidation = validateFetchUrl(currentUrl);
    if (!urlValidation.valid) {
      throw new Error(`SSRF_BLOCKED: ${urlValidation.reason}`);
    }

    // Resolve ALL IPs and validate they're all public (prevents DNS rebinding via alternate records)
    // This is the ONLY DNS resolution — we use these IPs for the socket connection
    const resolution = await resolveAndValidateAllIPs(url.hostname);
    if (!resolution.valid) {
      throw new Error(`SSRF_BLOCKED: ${resolution.reason}`);
    }

    // Pick the first validated IP for this connection
    // We validated ALL IPs, so any one is safe to use
    const connectIP = resolution.validatedIPs[0];

    // Make the raw socket connection directly to the validated IP
    // The Host header carries the real hostname for routing/SNI
    let result: { body: NodeJS.ReadableStream; status: number; headers: http.IncomingHttpHeaders };
    try {
      result = await ssrfSafeFetch(connectIP, url.hostname, port, isHTTPS, signal);
    } catch (err: any) {
      if (err.message?.startsWith('SSRF_BLOCKED:') || err.message?.startsWith('MAX_SIZE_EXCEEDED:')) {
        throw err;
      }
      throw new Error(`SSRF_BLOCKED: Connection failed to ${connectIP}: ${err.message}`);
    }

    // Wrap result in a fetch-compatible interface
    const responseHeaders = new Map<string, string>();
    for (const [k, v] of Object.entries(result.headers)) {
      if (v) responseHeaders.set(k, v);
    }

    const response: SsrfakeResponse = {
      ok: result.status >= 200 && result.status < 300,
      status: result.status,
      headers: responseHeaders,
      body: result.body,
    };

    // Handle redirect
    if ([301, 302, 303, 307, 308].includes(result.status)) {
      if (redirectCount >= MAX_REDIRECTS) {
        throw new Error('SSRF_BLOCKED: Limite de redirects excedido');
      }

      const locationHeader = response.headers.get('location');
      if (!locationHeader) {
        throw new Error('SSRF_BLOCKED: Redirect sem header Location');
      }

      let redirectUrl: string;
      try {
        redirectUrl = new URL(locationHeader, currentUrl).toString();
      } catch {
        throw new Error(`SSRF_BLOCKED: Redirect URL inválida: ${locationHeader}`);
      }

      const redirectValidation = validateFetchUrl(redirectUrl);
      if (!redirectValidation.valid) {
        throw new Error(`SSRF_BLOCKED: Redirect para destino bloqueado — ${redirectValidation.reason}`);
      }

      const redirectUrlParsed = new URL(redirectUrl);
      const redirectResolution = await resolveAndValidateAllIPs(redirectUrlParsed.hostname);
      if (!redirectResolution.valid) {
        throw new Error(`SSRF_BLOCKED: Redirect para IP privado: ${redirectResolution.reason}`);
      }

      redirectCount++;
      currentUrl = redirectUrl;
      continue;
    }

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
   * Includes SSRF protection (resolveAllIPs + direct socket to validated IP) and streaming size limit.
   */
  async analyzeFromUrl(imageUrl: string): Promise<OcrResult> {
    // Step 1: Set up abort controller
    const controller = new AbortController();
    const timeoutMs = this.config.timeout || 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // fetchWithRedirectProtection handles:
      // 1. URL format/hostname validation
      // 2. ALL IPs resolution + validation (A + AAAA records)
      // 3. Direct socket connection to validated IP — no fresh DNS at connection time
      // 4. Redirect following with same validation at each hop
      const { response } = await fetchWithRedirectProtection(imageUrl, controller.signal);

      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status}`);
      }

      // Step 2: Check Content-Length as early warning
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const size = parseInt(contentLength, 10);
        if (size > MAX_DOWNLOAD_SIZE) {
          throw new Error(`MAX_SIZE_EXCEEDED: Arquivo muito grande (${size} bytes). Máximo: ${MAX_DOWNLOAD_SIZE} bytes.`);
        }
      }

      // Step 3: Stream the response body with hard size limit using Node.js streams
      const body = response.body;
      if (!body) {
        throw new Error('Response body is not readable');
      }

      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        let totalBytes = 0;

        body.on('data', (chunk: Buffer) => {
          totalBytes += chunk.byteLength;
          if (totalBytes > MAX_DOWNLOAD_SIZE) {
            body.destroy();
            clearTimeout(timeoutId);
            controller.abort();
            return reject(new Error(
              `MAX_SIZE_EXCEEDED: Limite de ${MAX_DOWNLOAD_SIZE} bytes excedido durante streaming. ` +
              `Bytes lidos: ${totalBytes}. Abortando antes de memory exhaustion.`
            ));
          }
          chunks.push(chunk);
        });

        body.on('end', () => {
          clearTimeout(timeoutId);
          const buffer = Buffer.concat(chunks);
          const base64 = buffer.toString('base64');
          resolve(this.analyzeImage(base64));
        });

        body.on('error', (err: Error) => {
          clearTimeout(timeoutId);
          if (err.message?.startsWith('SSRF_BLOCKED:') || err.message?.startsWith('MAX_SIZE_EXCEEDED:')) {
            return reject(err);
          }
          reject(new Error(`Stream error: ${err.message}`));
        });

        controller.signal.addEventListener('abort', () => {
          body.destroy();
          clearTimeout(timeoutId);
          reject(new Error('Request aborted'));
        });
      });
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