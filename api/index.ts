/**
 * Vercel Serverless Function — API entry point.
 *
 * Expõe o app Express modular (src/server/app.ts) como função serverless,
 * mantendo o server.ts (dev/local) intocado.
 */
import { createApp, databaseRows } from '../src/server/app';

// Warm-up de cold start: hidrata casos do Supabase (no-op se não configurado).
void databaseRows.loadAllFromSupabase().catch(() => {});

const app = createApp();

export default function handler(
  req: Parameters<typeof app>[0],
  res: Parameters<typeof app>[1]
) {
  return app(req, res);
}
