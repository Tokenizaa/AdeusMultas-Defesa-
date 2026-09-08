/**
 * Canonical local development entrypoint.
 *
 * The HTTP application is always created by createApp(). Vite is only a
 * development host concern and must not define API/business architecture.
 *
 * Backend files are watched by `tsx watch` (package.json), while Vite handles
 * frontend HMR. The explicit API 404 boundary below prevents Vite's SPA
 * fallback from ever turning an unknown /api/* request into index.html.
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

  // API must never fall through to Vite's SPA history fallback.
  // If a mounted API router does not handle /api/*, return JSON 404 instead
  // of serving the frontend HTML. This makes routing failures observable.
  app.use('/api', (req, res, next) => {
    if (res.headersSent) return next();
    res.status(404).json({
      error: 'API route not found',
      path: req.originalUrl,
    });
  });

  app.use(vite.middlewares);

  app.listen(port, () => {
    console.log(`[dev] http://localhost:${port}`);
    console.log('[dev] API: createApp()');
    console.log('[dev] Backend watch: tsx watch');
    console.log('[dev] API fallback: JSON 404 (Vite cannot intercept /api/*)');
  });
}

main().catch((error) => {
  console.error('[dev] startup failure:', error);
  process.exit(1);
});
