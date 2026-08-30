/**
 * @file evolution-webhook-auth.ts
 * Validacao de origem do webhook de entrada da Evolution API (WhatsApp).
 *
 * MOTIVACAO (seguranca):
 *   O endpoint POST /api/webhooks/whatsapp (e aliases) e PUBLICO — qualquer
 *   atacante pode forjar payloads e injetar mensagens no pipeline
 *   (normalizacao -> CRM -> IA). A Evolution API v2 NAO envia assinatura
 *   padrao por padrao; ela permite configurar custom headers por instancia
 *   (campo `headers` no registro do webhook) — ver:
 *   https://docs.evolutionfoundation.com.br/en/evolution-api/configuration/webhooks
 *
 * MECANISMO:
 *   - Operador define um segredo em env `EVOLUTION_WEBHOOK_SECRET`.
 *   - `configureWebhook` (whatsapp-service.ts) passa esse segredo como custom
 *     header `X-Webhook-Secret` no registro do webhook junto da Evolution.
 *   - Este validador compara o header recebido com o segredo esperado usando
 *     comparacao timing-safe (constante em tempo).
 *
 * RETROCOMPATIBILIDADE (decisao de design — aditiva, sem quebrar fluxo atual):
 *   - Se `EVOLUTION_WEBHOOK_SECRET` NAO estiver setado -> modo `disabled`:
 *     aceita o webhook sem validacao (comportamento original preservado em
 *     dev, testes / simulate-inbound e producao sem segredo).
 *   - Se estiver setado -> modo ativo:
 *       - Header `sha256=<hmac>` (assinatura HMAC do body bruto): DEFERE a
 *         decisao para o gate HMAC do route (gate 1b), que verifica a
 *         assinatura sobre os bytes brutos.
 *       - Header = segredo puro (remetente legado): comparacao timing-safe.
 *       - Header ausente ou segredo puro errado -> 401.
 *     401/403 sao codigos NON-RETRYABLE na Evolution API (nao ha risco de
 *     loop de retries infinitos ao rejeitar origem invalida).
 *
 * SEGURANCA:
 *   - O valor do segredo NUNCA e logado nem exposto em respostas.
 */

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/** Nome do custom header (lowercase, como o Express expoe em req.headers). */
export const EVOLUTION_WEBHOOK_SECRET_HEADER = 'x-webhook-secret';

/** Nome da env var que ativa a validacao. */
export const EVOLUTION_WEBHOOK_SECRET_ENV = 'EVOLUTION_WEBHOOK_SECRET';

export type WebhookAuthDecision =
  | { ok: true; mode: 'disabled' }
  | { ok: true; mode: 'validated' }
  | { ok: false; mode: 'rejected'; reason: 'missing-header' | 'invalid-secret' };

/**
 * Comparacao constante-em-tempo de duas strings via hash SHA-256 + timingSafeEqual.
 * Independe do tamanho das entradas (nao estoura em comprimentos diferentes).
 */
export function secureCompare(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

/** Le o segredo do ambiente a cada chamada (sem cache em module-level). */
export function resolveWebhookSecret(): string | null {
  return process.env[EVOLUTION_WEBHOOK_SECRET_ENV] || null;
}

function extractHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string
): string | undefined {
  const value = headers[name];
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * Autoriza o webhook de entrada da Evolution API.
 * - Sem segredo em env -> { ok: true, mode: 'disabled' } (retrocompativel — inclusive em producao).
 * - Com segredo + header `sha256=<hmac>` -> { ok: true, mode: 'validated' }
 *   (defere para o gate HMAC do route — gate 1b — que decide a autenticidade).
 * - Com segredo + header = segredo puro (remetente legado) -> valida via secureCompare.
 * - Com segredo + header ausente/errado -> { ok: false, mode: 'rejected' }.
 */
export function authorizeEvolutionWebhook(
  headers: Record<string, string | string[] | undefined>
): WebhookAuthDecision {
  const secret = resolveWebhookSecret();
  if (!secret) {
    return { ok: true, mode: 'disabled' };
  }

  const provided = extractHeader(headers, EVOLUTION_WEBHOOK_SECRET_HEADER);
  if (!provided) {
    return { ok: false, mode: 'rejected', reason: 'missing-header' };
  }

  // Assinatura HMAC (`sha256=<hex>`): nao comparar com o segredo puro — o
  // secureCompare abaixo jamais casaria (hex != segredo) e mataria o gate HMAC
  // antes de rodar. DEFERE: o gate 1b do route verifica a assinatura.
  if (provided.startsWith('sha256=')) {
    return { ok: true, mode: 'validated' };
  }

  return secureCompare(provided, secret)
    ? { ok: true, mode: 'validated' }
    : { ok: false, mode: 'rejected', reason: 'invalid-secret' };
}

/**
 * Verifica assinatura HMAC-SHA-256 do payload BRUTO do webhook (anti-spoofing).
 *
 * Formato do header esperado: `sha256=<hmac-hex-do-body-bruto>` — o mesmo
 * header `X-Webhook-Secret` usado na validacao legada, agora capaz de carregar
 * a assinatura criptografica em vez do segredo puro.
 *
 * SEGURANCA:
 *  - HMAC e calculado sobre os bytes exatos do body recebido (rawBody), nunca
 *    sobre JSON re-serializado — assinatura confere so com o payload original.
 *  - Comparacao timing-safe. Guarda de comprimento ANTES de timingSafeEqual:
 *    timingSafeEqual lanca se os buffers diferirem em tamanho; header forjado
 *    com hex invalido/curto viraria 500 em vez de 401 sem essa guarda.
 *  - `EVOLUTION_WEBHOOK_SECRET` e a chave HMAC (nunca logado/exposto).
 */
export function verifyEvolutionSignature(
  rawPayload: string | Buffer,
  signatureHeader: string | undefined,
  secret: string
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }
  const expected = Buffer.from(signatureHeader.slice('sha256='.length), 'hex');
  if (expected.length === 0) {
    return false;
  }
  const hmac = createHmac('sha256', secret);
  hmac.update(typeof rawPayload === 'string' ? rawPayload : rawPayload.toString('utf8'));
  const calculated = hmac.digest();
  if (expected.length !== calculated.length) {
    return false;
  }
  return timingSafeEqual(expected, calculated);
}