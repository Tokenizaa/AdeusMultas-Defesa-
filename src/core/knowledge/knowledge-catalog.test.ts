import { describe, it, expect } from 'vitest';
import { ARGUMENTS_CATALOG } from '../arguments/arguments-catalog';
import { PROCEDURES_CATALOG } from '../procedures/procedures-catalog';
import { INFRACTION_CATALOG } from '../../data/knowledge-base';

describe('Knowledge Base Expansion & Catalog Integrity (Prompt 1)', () => {
  it('should have all 52 canonical arguments defined with complete fields', () => {
    expect(ARGUMENTS_CATALOG.length).toBe(52);

    const ids = new Set<string>();
    for (const arg of ARGUMENTS_CATALOG) {
      expect(arg.id).toMatch(/^ARG-\d{3}$/);
      expect(ids.has(arg.id)).toBe(false);
      ids.add(arg.id);

      expect(arg.title).toBeDefined();
      expect(arg.title.length).toBeGreaterThan(5);
      expect(arg.legalBase).toBeDefined();
      expect(arg.statutoryNorms).toBeDefined();
      expect(arg.statutoryNorms.length).toBeGreaterThan(0);
      expect(arg.applicationHypothesis).toBeDefined();
      expect(arg.applicationHypothesis.length).toBeGreaterThan(10);
      expect(arg.requiredFacts).toBeDefined();
      expect(arg.requiredFacts.length).toBeGreaterThan(0);
      expect(arg.requiredEvidence).toBeDefined();
      expect(arg.requiredEvidence.length).toBeGreaterThan(0);
      expect(arg.validFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(arg.version).toBeGreaterThanOrEqual(1);
    }
  });

  it('should have all recommendedArgumentCodes in INFRACTION_CATALOG referencing valid ARG IDs', () => {
    const validArgIds = new Set(ARGUMENTS_CATALOG.map((a) => a.id));

    for (const infraction of INFRACTION_CATALOG) {
      expect(infraction.recommendedArgumentCodes.length).toBeGreaterThan(0);
      for (const code of infraction.recommendedArgumentCodes) {
        expect(validArgIds.has(code)).toBe(true);
      }
    }
  });

  it('should have all applicableGrounds in PROCEDURES_CATALOG referencing valid ARG IDs', () => {
    const validArgIds = new Set(ARGUMENTS_CATALOG.map((a) => a.id));

    for (const procedure of PROCEDURES_CATALOG) {
      expect(procedure.applicableGrounds.length).toBeGreaterThan(0);
      for (const ground of procedure.applicableGrounds) {
        expect(validArgIds.has(ground)).toBe(true);
      }
    }
  });
});
