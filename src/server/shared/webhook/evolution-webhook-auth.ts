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
 *     aceita o webhook sem validacao (preserva comportamento atual em dev).
 *   - Se estiver setado -> modo ativo: payload sem header valido recebe 401.
 *     401/403 sao codigos NON-RETRYABLE na Evolution API (nao ha risco de
 *     loop de retries infinitos ao rejeitar origem invalida).
 *
 * SEGURANCA:
 *   - O valor do segredo NUNCA e logado nem exposto em respostas.
 */

import { createHash, timingSafeEqual } from 'node:crypto';

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
 * - Sem segredo em env        -> { ok: true, mode: 'disabled' }  (retrocompativel).
 * - Com segredo + header ok   -> { ok: true, mode: 'validated' }.
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

  return secureCompare(provided, secret)
    ? { ok: true, mode: 'validated' }
    : { ok: false, mode: 'rejected', reason: 'invalid-secret' };
}