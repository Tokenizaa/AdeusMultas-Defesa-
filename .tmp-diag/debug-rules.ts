import { ExpertRuleEngine } from '../src/core/rules/rule-engine';
import { INFRACTION_CATALOG } from '../src/data/knowledge-base';

const gd01 = {
  infractionCode: '745-50', ctbArticle: 'Art. 218, I', severity: 'media',
  points: 3, fineAmount: 130.16, autuadorBody: 'DETRAN-SP',
  dateTime: '2023-10-15T08:30:00Z', location: 'Rodovia Anchieta, km 45',
  speedLimit: 80, measuredSpeed: 95, consideredSpeed: 91,
  radarEquipmentId: 'DECUTRAN123', inmetroAferitionDate: '2023-09-01',
  notificationExpeditionDate: '2023-10-20',
  hasPreviousInfractionsLast12Months: false,
  hasR19SignageProof: false,
  hasPhotoProof: false,
};

const gd02 = { ...gd01, infractionCode: '745-50', location: 'Avenida Paulista',
  speedLimit: 50, measuredSpeed: 68, consideredSpeed: 65,
  radarEquipmentId: 'DECUTRAN456', inmetroAferitionDate: '2023-09-10' };

const gd03 = { ...gd01, infractionCode: '745-70', ctbArticle: 'Art. 218, III',
  severity: 'grave', points: 5, fineAmount: 294.23,
  location: 'Rodovia dos Imigrantes, km 20',
  speedLimit: 100, measuredSpeed: 150, consideredSpeed: 143,
  radarEquipmentId: 'DECUTRAN789', inmetroAferitionDate: '2023-09-05' };

const gd10 = { ...gd01, location: 'Rodovia Anchieta, km 50 (obra)',
  measuredSpeed: 90, consideredSpeed: 86, radarEquipmentId: 'DECUTRAN321',
  inmetroAferitionDate: '2023-06-01' };

console.log('=== Catalog lookup ===');
for (const code of ['745-50', '745-70']) {
  const cat = INFRACTION_CATALOG.find(i => i.code === code || i.code.replace('-','') === code.replace('-',''));
  console.log(code, '->', cat ? cat.code + '/' + cat.severity : 'NOT FOUND');
}

console.log('\n=== RuleEngine evaluation ===');
for (const [label, inf] of [['GD-01', gd01], ['GD-02', gd02], ['GD-03', gd03], ['GD-10', gd10]]) {
  const r = ExpertRuleEngine.evaluate('test', inf);
  console.log(label, 'args:', r.recommendedArguments.map(x=>x.id).join(','), '| proc:', r.recommendedProcedure, '| score:', r.overallSuccessRate);
  console.log('  evaluatedRules:', r.evaluatedRules?.map(e=>e.ruleId+':'+e.status).join(', '));
}
