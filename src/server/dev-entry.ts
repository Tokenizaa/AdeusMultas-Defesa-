/**
 * Canonical local development entrypoint.
 *
 * The HTTP application is always created by createApp(). Vite is only a
 * development host concern and must not define API/business architecture.
 */
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { createApp } from './app';
import { startDevLifecycle } from './lifecycle/dev-lifecycle';

const port = Number(process.env.PORT || 3000);

async function main() {
  startDevLifecycle();

  const app = createApp();
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
    root: path.resolve(process.cwd()),
  });

  app.use(vite.middlewares);

  app.listen(port, () => {
    console.log(`[dev] http://localhost:${port}`);
    console.log('[dev] API: createApp()');
  });
}

main().catch((error) => {
  console.error('[dev] startup failure:', error);
  process.exit(1);
});
