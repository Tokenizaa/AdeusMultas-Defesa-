import 'dotenv/config';
import { ExpertRuleEngine } from '../src/core/rules/rule-engine';
import { ALL_GOLDEN_DOCUMENTS } from '../tests/fixtures/golden-documents';
for (const gd of ALL_GOLDEN_DOCUMENTS) {
  const a: any = ExpertRuleEngine.evaluate(`case_${gd.id}`, gd.infraction as any);
  const c = a.infractionClassification;
  console.log(`${gd.id} ${(gd.infraction as any).infractionCode} -> familia=${c.family} base=${c.basis} conf=${c.confidence} elegiveis=${c.eligibleArgumentIds.length}`);
  console.log(`   proc=${a.recommendedProcedure} score=${a.overallSuccessRate} integrity=${a.integrityScore} args=[${(a.recommendedArguments||[]).map((x:any)=>x.id).join(',')}]`);
  const fired=(a.evaluatedRules||[]).filter((r:any)=>r.status==='FAIL').map((r:any)=>r.ruleId);
  const na=(a.evaluatedRules||[]).filter((r:any)=>r.status==='NOT_APPLICABLE').map((r:any)=>r.ruleId);
  console.log(`   FAIL=${fired.join(',')||'-'} | NOT_APPLICABLE=${na.join(',')||'-'} | gaps=${(a.dataGaps||[]).length}`);
}
