import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
mkdirSync(resolve(root, 'dist'), { recursive: true });

const isWindows = process.platform === 'win32';
const npx = isWindows ? 'npx.cmd' : 'npx';
const children = new Set();
let shuttingDown = false;

function launch(label, args) {
  const child = spawn(npx, args, {
    cwd: root,
    stdio: 'inherit',
    shell: isWindows,
    env: process.env,
  });
  children.add(child);
  child.once('error', (error) => {
    console.error(`[dev] ${label} failed to start:`, error);
    process.exitCode = 1;
    shutdown();
  });
  child.once('exit', (code, signal) => {
    children.delete(child);
    if (!shuttingDown) {
      console.error(`[dev] ${label} exited (code=${code}, signal=${signal}). Stopping the other dev process.`);
      process.exitCode = code && code !== 0 ? code : 1;
      shutdown();
    }
  });
  return child;
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

console.log('[dev] Frontend: http://localhost:3000 (Vite HMR)');
console.log('[dev] API: Cloudflare Worker via Wrangler at http://127.0.0.1:8787');
console.log('[dev] Configure local Worker secrets in .dev.vars; do not commit that file.');

launch('Cloudflare Worker', [
  '--yes', 'wrangler@latest', 'dev',
  '--config', 'wrangler.jsonc',
  '--local',
  '--ip', '127.0.0.1',
  '--port', '8787',
]);
launch('Vite', [
  '--yes', 'vite',
  '--host', '0.0.0.0',
  '--port', '3000',
  '--strictPort',
]);
