/**
 * Runnable check — gate 1 do webhook Evolution: segredo setado valida header
 * legacy (timing-safe); header `sha256=<hmac>` defere para o gate HMAC;
 * sem segredo = disabled (dev e produção — comportamento original preservado).
 * Run: npx tsx src/server/services/tests/check-webhook-auth.ts
 */
import { strict as assert } from 'node:assert';
import {
  authorizeEvolutionWebhook,
  EVOLUTION_WEBHOOK_SECRET_ENV,
  EVOLUTION_WEBHOOK_SECRET_HEADER,
} from '../../shared/webhook/evolution-webhook-auth';

const originalEnv: Record<string, string | undefined> = {};
function setEnv(key: string, value: string | undefined) {
  if (!(key in originalEnv)) originalEnv[key] = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
function restoreEnv() {
  for (const [k, v] of Object.entries(originalEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

const checks: Array<[string, () => void]> = [];

checks.push(['BUG B: segredo setado + header correto → validated', () => {
  setEnv(EVOLUTION_WEBHOOK_SECRET_ENV, 's3cr3t-value');
  setEnv('NODE_ENV', 'production');
  const d = authorizeEvolutionWebhook({ [EVOLUTION_WEBHOOK_SECRET_HEADER]: 's3cr3t-value' });
  assert.deepStrictEqual(d, { ok: true, mode: 'validated' });
}]);

checks.push(['BUG B: segredo setado + header errado → rejected invalid-secret', () => {
  setEnv(EVOLUTION_WEBHOOK_SECRET_ENV, 's3cr3t-value');
  setEnv('NODE_ENV', 'production');
  const d = authorizeEvolutionWebhook({ [EVOLUTION_WEBHOOK_SECRET_HEADER]: 'forged' });
  assert.deepStrictEqual(d, { ok: false, mode: 'rejected', reason: 'invalid-secret' });
}]);

checks.push(['BUG B: segredo setado + header ausente → rejected missing-header', () => {
  setEnv(EVOLUTION_WEBHOOK_SECRET_ENV, 's3cr3t-value');
  setEnv('NODE_ENV', 'production');
  const d = authorizeEvolutionWebhook({});
  assert.deepStrictEqual(d, { ok: false, mode: 'rejected', reason: 'missing-header' });
}]);

checks.push(['segredo setado + header sha256=<hmac> → validated (defere para gate 1b)', () => {
  setEnv(EVOLUTION_WEBHOOK_SECRET_ENV, 's3cr3t-value');
  setEnv('NODE_ENV', 'production');
  const d = authorizeEvolutionWebhook({ [EVOLUTION_WEBHOOK_SECRET_HEADER]: 'sha256=abc123' });
  assert.deepStrictEqual(d, { ok: true, mode: 'validated' });
}]);

checks.push(['SEM segredo + production → ok disabled (comportamento original preservado)', () => {
  setEnv(EVOLUTION_WEBHOOK_SECRET_ENV, undefined);
  setEnv('NODE_ENV', 'production');
  const d = authorizeEvolutionWebhook({});
  assert.deepStrictEqual(d, { ok: true, mode: 'disabled' });
}]);

checks.push(['BUG B: SEM segredo + development → ok disabled (behaviour dev preservado)', () => {
  setEnv(EVOLUTION_WEBHOOK_SECRET_ENV, undefined);
  setEnv('NODE_ENV', 'development');
  const d = authorizeEvolutionWebhook({});
  assert.deepStrictEqual(d, { ok: true, mode: 'disabled' });
}]);

checks.push(['BUG B: SEM segredo + test → ok disabled (CI não bloqueia)', () => {
  setEnv(EVOLUTION_WEBHOOK_SECRET_ENV, undefined);
  setEnv('NODE_ENV', 'test');
  const d = authorizeEvolutionWebhook({});
  assert.deepStrictEqual(d, { ok: true, mode: 'disabled' });
}]);

(async () => {
  let failed = 0;
  try {
    for (const [name, fn] of checks) {
      try {
        fn();
        console.log(`PASS  ${name}`);
      } catch (err: any) {
        failed++;
        console.error(`FAIL  ${name}\n      ${err && err.message ? err.message : err}`);
      }
    }
    console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
    if (failed > 0) process.exitCode = 1;
  } finally {
    restoreEnv();
  }
})();