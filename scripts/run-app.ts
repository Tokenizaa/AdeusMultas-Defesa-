/**
 * @file scripts/run-app.ts
 * Roda o EXATO app que vai para a Vercel (src/server/app.ts → api/index.mjs)
 * em porta própria — isolado do dev server :3000 (processo preso da sessão anterior).
 * Uso: npx tsx scripts/run-app.ts [PORT]
 */
import 'dotenv/config';
import { createApp } from '../src/server/app';
import { commercialService } from '../src/server/commercial/commercial-service';

const PORT = Number(process.argv[2] || process.env.PORT || 3001);
const app = createApp();
await commercialService.warmup(); // espelha api/index.mjs
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[createApp] http://localhost:${PORT}`);
});