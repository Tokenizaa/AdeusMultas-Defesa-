/**
 * Vercel Serverless Function — API entry point.
 *
 * - Import estático: o builder da Vercel rastreia/empacota todo o grafo
 *   (import dinâmico nativo NÃO é incluído no lambda).
 * - createApp() só roda na 1ª invocação: falhas de boot são capturadas e
 *   devolvidas como JSON legível (stack truncado) em vez do opaco
 *   FUNCTION_INVOCATION_FAILED, permitindo diagnóstico via curl.
 */
import { createApp, databaseRows } from '../src/server/app';
import { commercialService } from '../src/server/commercial/commercial-service';

type AppFn = (
  req: import('http').IncomingMessage,
  res: import('http').ServerResponse
) => void;

let cachedApp: AppFn | null = null;

export default async function handler(
  req: import('http').IncomingMessage,
  res: import('http').ServerResponse
): Promise<void> {
  try {
    if (!cachedApp) {
      // Warm-up best-effort: hidrata casos do Supabase quando configurado.
      void databaseRows.loadAllFromSupabase().catch(() => {});
      // Warm-up comercial: carrega catálogo de preços/promoções/cupons do Supabase.
      void commercialService.warmup().catch(() => {});
      cachedApp = createApp();
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
