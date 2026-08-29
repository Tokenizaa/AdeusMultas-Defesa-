/**
 * @file image-quality.service.ts
 * GATE DE QUALIDADE DE IMAGEM — bloqueia peças ruins ANTES de publicar.
 *
 * Critérios (100% locais, zero dependência externa de visão):
 * - Resolução mínima (default 500px): largura OU altura abaixo => reprova.
 *   Calibração 900→500 (review 2026-08-29): Instagram/Meta aceitam >=320px; as peças reais
 *   da campanha são 768x768 (nítidas) e 580x1015 retrato (dia3 borrada sharpness 63, dia6
 *   NÍTIDA sharpness 977). Em 900 todas eram rejeitadas → campanha virava no-op. Em 600,
 *   dia6 nítida ainda reprovava por largura 580 — contraria o gate (deve separar por
 *   QUALIDADE visual, não prender peça legada utilizável). 500 cobre o formato real, mantém
 *   margem sobre o floor Meta (320) e isola o borrão como discriminador: só dia3 reprova.
 *   Bypass por status legado NÃO foi necessário: nenhuma peça real é <500; se surgirem,
 *   o upgrade é calibração por plataforma ou bypass explícito no enqueue.
 * - Nitidez: variância do Laplacian em escala de cinza < limiar (default 100) => reprova.
 *   Calibração: peça dia3 da campanha inaugural tem var ~63 (borrada); peças ok 287-977.
 * - Coesão: luminance + contrast reportados como métricas (NÃO reprovam por padrão).
 *
 * Decisão fail-open/fail-closed:
 * - failureKind 'quality' (resolução/borrão) => BLOQUEIA publicação.
 * - failureKind 'fetch'/'decode' (erro de infraestrutura) => NÃO bloqueia:
 *   erro transiente de rede não pode derrubar o pipeline que já funciona.
 * - data: URL => avaliada localmente (base64/utf8 parseado, sem fetch — determinístico);
 *   data: URL malformada => skip explícito (pass:true, reason 'data_url_skipped') para não
 *   cair em fetch_failed enganoso (fail-open silencioso) — preserva comportamento de publicar.
 *
 * Latência: fetchTimeoutMs default 15000→4000 (review W2) — o gate roda síncrono no enqueue
 * e 15s de download travava rota HTTP /publish e o agente; 4s limita o bloqueio sem abrir
 * mão do contrato determinístico (peça ruim NÃO enfileira).
 *
 * ponytail: OCR de texto real (ocr-service.ts: OCR.space/Google Vision) é o upgrade quando
 * houver API key configurada e tolerância a latência externa; hoje a heurística de borrão
 * cobre o caso crítico e texto ilegível de modelo fraco cai na resolução (<600px).
 */

import sharp from 'sharp';
import type { Metadata, Sharp } from 'sharp';

export interface ImageQualityMetrics {
  width: number;
  height: number;
  /** 0-255 — brilho médio (luminância) */
  luminance: number;
  /** Variância do Laplacian em cinza — nitidez. >~100 nítida; ~54 borrada */
  sharpness: number;
  /** Desvio padrão da luminância — contraste */
  contrast: number;
}

export interface ImageQualityGateOptions {
  /** Dimensão mínima em px (largura OU altura abaixo reprova). Default 500 (floor Meta >=320; peças reais 580-768). */
  minDimension?: number;
  /** Variância mínima do Laplacian. Default 100. */
  minSharpness?: number;
  /** Timeout do download em ms. Default 4000 (bounding da rota HTTP/enqueue). */
  fetchTimeoutMs?: number;
  /** Teto de bytes do download. Default 20MB. */
  maxBytes?: number;
  /** Tamanho máximo da redução usada na análise de pixels. Default 384 (calibrado: separa dia3 borrado=63 de peças boas ≥287). */
  analysisSize?: number;
}

export interface ImageQualityResult {
  pass: boolean;
  /** 0-100 — 100 base, penalidades: resolução -40, nitidez -30. */
  score: number;
  reasons: string[];
  metrics: ImageQualityMetrics;
  /** true quando OCR real estiver disponível (hoje: false — ponytail acima). */
  ocrAvailable: boolean;
  /**
   * 'quality' = reprovou critério REAL (bloqueia enfileiramento).
   * 'fetch' | 'decode' = falha de infraestrutura (NÃO bloqueia pipeline existente).
   * null = passou.
   */
  failureKind: 'quality' | 'fetch' | 'decode' | null;
}

const DEFAULT_OPTIONS: Required<ImageQualityGateOptions> = {
  minDimension: 500,
  minSharpness: 100,
  fetchTimeoutMs: 4000,
  maxBytes: 20 * 1024 * 1024,
  analysisSize: 384,
};

const OCR_AVAILABLE = false;

const EMPTY_METRICS: ImageQualityMetrics = { width: 0, height: 0, luminance: 0, sharpness: 0, contrast: 0 };

/**
 * Valida qualidade de imagem por URL ou buffer.
 * Ex.: validateImageQuality({ imageUrl }) | validateImageQuality({ buffer })
 */
export async function validateImageQuality(
  input: { imageUrl?: string; buffer?: Buffer },
  options: ImageQualityGateOptions = {}
): Promise<ImageQualityResult> {
  const cfg = { ...DEFAULT_OPTIONS, ...options };

  let buffer = input.buffer;

  if (!buffer && input.imageUrl) {
    if (input.imageUrl.startsWith('data:')) {
      // data: URL — avaliada localmente (fetch Node não cobre todos os subtipos e
      // falharia em fetch_failed enganoso). Base64/utf8 parseado => gate REAL roda.
      // Malformada => skip explícito (pass:true, reason 'data_url_skipped'): preserva
      // comportamento de publicar sem fail-open silencioso.
      const dataBuf = dataUrlToBuffer(input.imageUrl);
      if (dataBuf) {
        buffer = dataBuf;
      } else {
        return {
          pass: true,
          score: 100,
          reasons: ['data_url_skipped'],
          metrics: EMPTY_METRICS,
          ocrAvailable: OCR_AVAILABLE,
          failureKind: null,
        };
      }
    } else {
      const dl = await downloadImage(input.imageUrl, cfg.fetchTimeoutMs, cfg.maxBytes);
      if (!dl.ok) {
        return {
          pass: false,
          score: 0,
          reasons: ['fetch_failed'],
          metrics: EMPTY_METRICS,
          ocrAvailable: OCR_AVAILABLE,
          failureKind: 'fetch',
        };
      }
      buffer = dl.buffer;
    }
  }

  if (!buffer) {
    return {
      pass: false,
      score: 0,
      reasons: ['no_input'],
      metrics: EMPTY_METRICS,
      ocrAvailable: OCR_AVAILABLE,
      failureKind: 'fetch',
    };
  }

  let metadata: Metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    return {
      pass: false,
      score: 0,
      reasons: ['decode_failed'],
      metrics: EMPTY_METRICS,
      ocrAvailable: OCR_AVAILABLE,
      failureKind: 'decode',
    };
  }

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const metrics = await analyzePixels(buffer, cfg.analysisSize, width, height);

  const reasons: string[] = [];
  const resTooLow = width < cfg.minDimension || height < cfg.minDimension;
  const blurred = metrics.sharpness < cfg.minSharpness;

  if (resTooLow) reasons.push('resolution_too_low');
  if (blurred) reasons.push('blurred');

  let score = 100;
  if (resTooLow) score -= 40;
  if (blurred) score -= 30;
  score = Math.max(0, score);

  return {
    pass: reasons.length === 0,
    score,
    reasons,
    metrics,
    ocrAvailable: OCR_AVAILABLE,
    failureKind: reasons.length > 0 ? 'quality' : null,
  };
}

/**
 * Análise de pixels: reduz para analysisSize (métrica de nitidez é robusta a downscale —
 * borrão é característica de frequência, preservada na redução), converte p/ cinza e
 * calcula luminância média, desvio padrão (contraste) e variância do Laplacian 3x3.
 */
async function analyzePixels(
  buffer: Buffer,
  analysisSize: number,
  width: number,
  height: number
): Promise<ImageQualityMetrics> {
  try {
    // Só reduz quando a imagem é maior que analysisSize — nunca amplia (sem perda p/ upscale)
    let pipeline: Sharp = sharp(buffer);
    if (width > analysisSize || height > analysisSize) {
      pipeline = pipeline.resize(analysisSize, analysisSize, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    const { data, info } = await pipeline
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const w = info.width;
    const h = info.height;
    const gray = new Float64Array(data); // data: Buffer, 1 byte/pixel (greyscale)
    const n = gray.length;

    let sum = 0;
    for (let i = 0; i < n; i++) sum += gray[i];
    const luminance = n > 0 ? sum / n : 0;

    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      const d = gray[i] - luminance;
      sumSq += d * d;
    }
    const contrast = n > 0 ? Math.sqrt(sumSq / n) : 0;

    // Variância do Laplacian 3x3 [0,1,0;1,-4,1;0,1,0] — alta = bordas definidas = nítida
    let lapSum = 0;
    let lapSumSq = 0;
    let lapCount = 0;
    for (let y = 1; y < h - 1; y++) {
      const row = y * w;
      for (let x = 1; x < w - 1; x++) {
        const i = row + x;
        const lap =
          4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
        lapSum += lap;
        lapSumSq += lap * lap;
        lapCount++;
      }
    }
    const lapMean = lapCount > 0 ? lapSum / lapCount : 0;
    const sharpness = lapCount > 0 ? lapSumSq / lapCount - lapMean * lapMean : 0;

    return { width, height, luminance: Math.round(luminance), sharpness: Math.round(sharpness), contrast: Math.round(contrast) };
  } catch {
    // Decodificação parcial (ex. formato exótico) — métricas zeradas; resolução ainda reportada
    return { width, height, luminance: 0, sharpness: 0, contrast: 0 };
  }
}

/**
 * Decodifica data: URL em Buffer (base64 ou utf8 percent-encoded). Retorna null se malformada.
 * Ex.: data:image/png;base64,<...> | data:image/svg+xml;utf8,<...>
 */
function dataUrlToBuffer(url: string): Buffer | null {
  const comma = url.indexOf(',');
  if (comma === -1) return null;
  const header = url.slice(5, comma); // após "data:"
  const payload = url.slice(comma + 1);
  try {
    if (/;base64$/i.test(header)) {
      return Buffer.from(payload, 'base64');
    }
    // assumido percent-encoded (utf8) — decodeURIComponent cobre svg/xml et al.
    return Buffer.from(decodeURIComponent(payload), 'utf8');
  } catch {
    return null;
  }
}

async function downloadImage(
  url: string,
  timeoutMs: number,
  maxBytes: number
): Promise<{ ok: true; buffer: Buffer } | { ok: false }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return { ok: false };
    const declared = Number(res.headers.get('content-length') || 0);
    if (declared > maxBytes) return { ok: false };
    const ab = await res.arrayBuffer();
    if (ab.byteLength > maxBytes) return { ok: false };
    return { ok: true, buffer: Buffer.from(ab) };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}