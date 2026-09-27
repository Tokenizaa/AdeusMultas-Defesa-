import 'dotenv/config';
import { analyzeInfractionCompat } from '../cloudflare/rag-adapter';
import { ALL_GOLDEN_DOCUMENTS } from '../tests/fixtures/golden-documents';
const env: any = { SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY };
(async () => {
  let sup=0, uns=0;
  for (const gd of ALL_GOLDEN_DOCUMENTS) {
    const a: any = await analyzeInfractionCompat(env, `c_${gd.id}`, gd.infraction as any);
    const line = (a.recommendedArguments||[]).map((x:any)=>`${x.id}:${x.provenanceStatus}(${(x.provenance||[]).length})`).join(' ');
    const s=(a.recommendedArguments||[]).filter((x:any)=>x.provenanceStatus==='SUPPORTED').length;
    const u=(a.recommendedArguments||[]).filter((x:any)=>x.provenanceStatus!=='SUPPORTED').length;
    sup+=s; uns+=u;
    console.log(`${gd.id}: ${line}`);
  }
  console.log(`\nTOTAL teses SUPPORTED=${sup} UNSUPPORTED=${uns}`);
})();
