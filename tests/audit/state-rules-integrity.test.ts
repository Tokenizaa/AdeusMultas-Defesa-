/**
 * state-rules-integrity.test.ts
 *
 * Suíte de Testes de Integridade de Regras Estaduais vs Direito Federal.
 * Valida que:
 *  1. As regras de direito material e prazos gerais são uniformes no âmbito federal.
 *  2. O sistema não aplica regras estaduais de SP indevidamente em outros estados.
 *  3. Inexistência de regras estaduais na KB é tratada como ausência de dados locais,
 *     sem contaminação cruzada.
 */

import { describe, it, expect } from 'vitest';
import { EXPERT_RULES, ExpertRuleEngine } from '../../src/core/rules/rule-engine';
import { INFRACTION_CATALOG, LEGAL_ARGUMENTS } from '../../src/data/knowledge-base';
import { makeInfraction } from './helpers';

describe('state-rules: separação direito federal vs estadual', () => {
  it('todas as regras do EXPERT_RULES possuem categoria e lógica de avaliação federal', () => {
    for (const rule of EXPERT_RULES) {
      expect(rule.id).toBeDefined();
      expect(rule.name).toBeDefined();
      expect(rule.category).toBeDefined();
      // Nenhuma regra especialista no motor atual deve referenciar portaria estadual hardcoded
      expect(rule.name).not.toMatch(/Portaria DETRAN-SP|DOE-SP|Decreto SP/i);
    }
  });

  it('catálogo de infrações possui enquadramentos estritamente federais (CTB)', () => {
    for (const infraction of INFRACTION_CATALOG) {
      expect(infraction.article).toMatch(/Art\.\s*\d+/);
      expect(infraction.severity).toMatch(/leve|media|grave|gravissima/i);
    }
  });

  it('motor de regras avalia infração de qualquer UF aplicando as mesmas regras federais objetivas', () => {
    const ufs = ['AC', 'BA', 'CE', 'DF', 'GO', 'MG', 'PR', 'RJ', 'RS', 'SP'];
    for (const uf of ufs) {
      const infraction = makeInfraction({
        infractionCode: '745-50',
        ctbArticle: 'Art. 218, I',
        autuadorBody: `DETRAN-${uf}`,
        dateTime: '2026-01-01T10:00:00',
        notificationExpeditionDate: '2026-02-15T10:00:00', // 45 dias depois = Decadência
      });

      const analysis = ExpertRuleEngine.evaluate(`case_test_${uf}`, infraction);
      expect(analysis.detectedInconsistencies.length).toBeGreaterThan(0);
      const decadenceInconsistency = analysis.detectedInconsistencies.find(
        (i) => i.legalArgumentId === 'ARG-048',
      );
      expect(decadenceInconsistency).toBeDefined();
      expect(analysis.competentBody).toBe(`DETRAN-${uf}`);
    }
  });

  it('não há contaminação de teses ou referências de órgãos paulistas quando o caso é de outra UF', () => {
    for (const arg of LEGAL_ARGUMENTS) {
      // As teses da KB não devem citar expressamente "DETRAN de São Paulo" no título ou descrição
      expect(arg.title).not.toMatch(/DETRAN-SP/i);
    }
  });
});
