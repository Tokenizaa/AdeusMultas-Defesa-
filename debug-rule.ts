import { ExpertRuleEngine } from './src/core/rules/rule-engine';
import { INFRACTION_CATALOG } from './src/data/knowledge-base';
import { classifyInfraction } from './src/core/rules/infraction-classifier';

const gd03 = {
  infractionCode: '745-70', ctbArticle: 'Art. 218, III', severity: 'grave',
  points: 5, fineAmount: 294.23, autuadorBody: 'DETRAN-SP',
  dateTime: '2023-10-15T16:45:00Z', location: 'Rodovia dos Imigrantes, km 20',
  speedLimit: 100, measuredSpeed: 150, consideredSpeed: 143,
  radarEquipmentId: 'DECUTRAN789', inmetroAferitionDate: '2023-09-05',
  notificationExpeditionDate: '2023-10-20',
  hasPreviousInfractionsLast12Months: false,
  hasR19SignageProof: false,
  hasPhotoProof: false,
};

console.log('=== classifyInfraction ===');
const cls = classifyInfraction(gd03);
console.log(cls);

console.log('\n=== Catalog direct ===');
const cat = INFRACTION_CATALOG.find(i => i.code === '745-70' || i.code.replace('-','') === '74570');
console.log('cat:', cat);

console.log('\n=== RuleEngine.evaluate ===');
const r = ExpertRuleEngine.evaluate('test', gd03);
console.log('args:', r.recommendedArguments.map(x=>x.id).join(','));
console.log('proc:', r.recommendedProcedure);
console.log('evaluatedRules:', r.evaluatedRules?.map(e=>e.ruleId+':'+e.status).join(', '));
