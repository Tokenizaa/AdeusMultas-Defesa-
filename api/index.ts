/**
 * Vercel Serverless Function — API entry point.
 *
 * Init preguiçoso + captura de erro: qualquer falha de boot/bundling é
 * devolvida como JSON legível (com stack truncado) em vez do opaco
 * FUNCTION_INVOCATION_FAILED, permitindo diagnóstico via curl em produção.
 */

type AppFn = (
  req: import('http').IncomingMessage,
  res: import('http').ServerResponse
) => void;

let cachedApp: AppFn | null = null;

async function init(): Promise<AppFn> {
  const { createApp, databaseRows } = await import('../src/server/app');
  // Warm-up best-effort: hidrata casos do Supabase quando configurado.
  void databaseRows.loadAllFromSupabase().catch(() => {});
  return createApp();
}

export default async function handler(
  req: import('http').IncomingMessage,
  res: import('http').ServerResponse
): Promise<void> {
  try {
    if (!cachedApp) {
      cachedApp = await init();
    }
    cachedApp(req, res);
  } catch (err: any) {
    console.error('[api] init/handler failure:', err?.stack || err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: 'API_FUNCTION_FAILURE',
          message: String(err?.message || err),
          stack: String(err?.stack || '')
            .split('\n')
            .slice(0, 10),
        })
      );
    } else {
      res.end();
    }
  }
}
