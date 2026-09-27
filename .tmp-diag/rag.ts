import 'dotenv/config';
import { analyzeInfractionCompat } from '../cloudflare/rag-adapter';
import { ALL_GOLDEN_DOCUMENTS } from '../tests/fixtures/golden-documents';
const env: any = { SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY };
(async () => {
  for (const gd of ALL_GOLDEN_DOCUMENTS) {
    const a: any = await analyzeInfractionCompat(env, `c_${gd.id}`, gd.infraction as any);
    const r = a.ragRetrieval || {};
    console.log(`${gd.id} ${(gd.infraction as any).infractionCode}: args=[${(a.recommendedArguments||[]).map((x:any)=>x.id).join(',')}] rag=${r.count} proc=${a.recommendedProcedure} score=${a.overallSuccessRate}`);
    for (const t of (r.top||[])) console.log(`    chunk=${t.chunk_id} ver=${t.document_version_id} url=${(t.official_url||'').slice(0,60)} termos=[${(t.matched_terms||[]).join('|')}]`);
  }
})();
