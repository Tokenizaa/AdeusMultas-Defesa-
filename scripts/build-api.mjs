import { build } from 'esbuild';

/**
 * Gera api/index.cjs — bundle ESM autocontido do código first-party da API.
 *
 * Por que existe: o builder @vercel/node não empacota o grafo — traça arquivos
 * (nft) e compila cada .ts individualmente. Com package.json "type": "module"
 * tudo é emitido como ESM nativo, onde specifiers sem extensão quebram em
 * runtime (FUNCTION_INVOCATION_FAILED). Bundlando nós mesmos em ESM plano (.mjs, extensão explicitamente suportada como função):
 *  - specifiers são resolvidos no build (extensões .ts viram irrelevantes);
 *  - node_modules ficam externos e são incluídos via tracing do require().
 */
await build({
  entryPoints: ['api-src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  outfile: 'api/index.mjs',
  packages: 'external',
  sourcemap: false,
  logLevel: 'info',
});
