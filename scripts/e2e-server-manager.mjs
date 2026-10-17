#!/usr/bin/env node
/**
 * One entry point for local E2E server lifecycle.
 * Reuses a healthy Vite + Wrangler pair; starts them only when both are absent.
 * It never kills processes or takes over a partially occupied port.
 */
import { spawn } from 'node:child_process';

const FRONTEND_URL = process.env.E2E_FRONTEND_HEALTH_URL || 'http://127.0.0.1:3000/';
const WORKER_HEALTH_URL = process.env.E2E_WORKER_HEALTH_URL || 'http://127.0.0.1:8787/api/health';
const STARTUP_TIMEOUT_MS = Number(process.env.E2E_SERVER_STARTUP_TIMEOUT_MS || 60_000);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function probe(url, validate) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2500) });
    const bodyText = await response.text();
    let body;
    try { body = JSON.parse(bodyText); } catch { body = null; }
    return { reachable: true, healthy: response.ok && validate(response, body, bodyText), status: response.status, body };
  } catch (error) {
    return { reachable: false, healthy: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function health() {
  const [frontend, worker] = await Promise.all([
    probe(FRONTEND_URL, (_response, _body, bodyText) => bodyText.length > 0),
    probe(WORKER_HEALTH_URL, (_response, body) => body?.worker === 'cloudflare-worker' && body?.database?.status === 'connected'),
  ]);
  return { frontend, worker, healthy: frontend.healthy && worker.healthy };
}

function reportHealth(result) {
  console.log(`[e2e-server] frontend: ${result.frontend.healthy ? 'healthy' : result.frontend.reachable ? `reachable, HTTP ${result.frontend.status} but unhealthy` : 'not reachable'}`);
  console.log(`[e2e-server] worker: ${result.worker.healthy ? 'healthy' : result.worker.reachable ? `reachable, HTTP ${result.worker.status} but unhealthy` : 'not reachable'}`);
}

async function ensureServer() {
  let result = await health();
  if (result.healthy) {
    console.log('[e2e-server] Reusing the healthy Vite HMR + Wrangler instance.');
    return;
  }

  reportHealth(result);
  if (result.frontend.reachable || result.worker.reachable) {
    throw new Error('A server already occupies one E2E endpoint but the Vite/Worker pair is not healthy. Refusing to kill or replace any process; inspect the existing instance first.');
  }

  console.log('[e2e-server] No server is listening. Starting scripts/dev-cloudflare.mjs once.');
  const server = spawn(process.execPath, ['scripts/dev-cloudflare.mjs'], {
    cwd: process.cwd(),
    detached: true,
    stdio: 'ignore',
    env: process.env,
  });
  server.unref();

  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await delay(1000);
    result = await health();
    if (result.healthy) {
      console.log('[e2e-server] Frontend and Worker health checks passed.');
      return;
    }
  }

  reportHealth(result);
  throw new Error(`E2E server did not become healthy within ${STARTUP_TIMEOUT_MS}ms. No process was killed; inspect Wrangler/Vite logs and local secrets.`);
}

async function main() {
  const separator = process.argv.indexOf('--');
  const command = separator >= 0 ? process.argv[separator + 1] : undefined;
  const args = separator >= 0 ? process.argv.slice(separator + 2) : [];
  await ensureServer();

  if (!command) {
    console.log('[e2e-server] Health check complete; no test command supplied.');
    return;
  }

  const child = spawn(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: {
      ...process.env,
      E2E_USE_LOCAL_SERVER: 'true',
      PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000',
    },
    shell: process.platform === 'win32',
  });
  const code = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (exitCode, signal) => resolve(exitCode ?? (signal ? 1 : 0)));
  });
  process.exitCode = Number(code);
}

main().catch((error) => {
  console.error('[e2e-server] ERROR:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
