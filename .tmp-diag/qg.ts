import 'dotenv/config';
import { analyzeInfractionCompat, generateDefenseDraftCompat } from '../cloudflare/rag-adapter';
import { runCanonicalQualityGate } from '../cloudflare/quality-gate';
import { ALL_GOLDEN_DOCUMENTS } from '../tests/fixtures/golden-documents';
const env: any = { SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY };
const APPLICANT = { name: 'JOSE CARLOS DE SOUZA', cpf: '123.456.789-00', cnh: '98765432100', address: 'Rua das Flores, 123', cityState: 'Sao Paulo - SP' };
(async () => {
  const gd: any = ALL_GOLDEN_DOCUMENTS[0];
  const a: any = await analyzeInfractionCompat(env, 'c1', gd.infraction);
  const d: any = await generateDefenseDraftCompat(env, 'c1', gd.infraction, 'ABC1D23', 'FIAT UNO', APPLICANT as any, 'recurso_jari' as any, a);
  const qg: any = runCanonicalQualityGate({ infraction: gd.infraction, analysis: a, draft: d, applicant: APPLICANT, vehicle: { plate: 'ABC1D23', model: 'FIAT UNO' } });
  for (const c of qg.checks) if (!c.passed || c.severity==='warning') console.log(`${c.check} ${c.passed} | ${c.message}`);
  console.log('\n--- DOC (primeiras 1200) ---');
  console.log(d.fullDraftText.slice(0, 1200));
})();
