import { describe, it, expect } from 'vitest';
import { ARGUMENTS_CATALOG } from '../arguments/arguments-catalog';
import { PROCEDURES_CATALOG } from '../procedures/procedures-catalog';
import { INFRACTION_CATALOG } from '../../data/knowledge-base';
import { RESOLUTIONS_DB } from '../../core/legal-base/resolutions';

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

describe('Reconciliação — resoluções prioritárias catalogadas', () => {
  it('Resolução CONTRAN 432/2013 (Lei Seca) está catalogada', () => {
    const res = RESOLUTIONS_DB.find((r) => r.number.includes('432/2013'));
    expect(res).toBeDefined();
    expect(res!.body).toBe('CONTRAN');
    expect(res!.year).toBe(2013);
  });

  it('Resolução CONTRAN 1.031/2026 (caso de referência) está catalogada', () => {
    const res = RESOLUTIONS_DB.find((r) => r.number.includes('1.031/2026'));
    expect(res).toBeDefined();
    expect(res!.body).toBe('CONTRAN');
    expect(res!.year).toBe(2026);
    // Marcada como pendente de coleta oficial (sem texto jurídico inventado)
    expect(res!.keyArticles).toContain('Pendente de coleta oficial');
  });

  it('Resoluções 965/2022 e 966/2022 (referenciadas por ARG-024) estão catalogadas', () => {
    const r965 = RESOLUTIONS_DB.find((r) => r.number.includes('965/2022'));
    const r966 = RESOLUTIONS_DB.find((r) => r.number.includes('966/2022'));
    expect(r965).toBeDefined();
    expect(r966).toBeDefined();
    expect(r965!.body).toBe('CONTRAN');
    expect(r966!.body).toBe('CONTRAN');
    expect(r965!.year).toBe(2022);
    expect(r966!.year).toBe(2022);
  });

  it('Resoluções 798/2020 e 918/2022 estão catalogadas', () => {
    const r798 = RESOLUTIONS_DB.find((r) => r.number.includes('798/2020'));
    const r918 = RESOLUTIONS_DB.find((r) => r.number.includes('918/2022'));
    expect(r798).toBeDefined();
    expect(r918).toBeDefined();
    expect(r798!.body).toBe('CONTRAN');
    expect(r918!.body).toBe('CONTRAN');
  });

  it('Resolução 985/2022 (MBFT) está catalogada', () => {
    const r985 = RESOLUTIONS_DB.find((r) => r.number.includes('985/2022'));
    expect(r985).toBeDefined();
    expect(r985!.body).toBe('CONTRAN');
    expect(r985!.year).toBe(2022);
  });

  it('Nenhuma resolução prioritária tem conteúdo jurídico inventado (todos marcados como pendente quando não coletado)', () => {
    const pendentes = RESOLUTIONS_DB.filter((r) =>
      r.keyArticles.includes('Pendente de coleta oficial')
    );
    // 1.031/2026, 965/2022, 966/2022 são as pendentes
    expect(pendentes.length).toBe(3);
    for (const p of pendentes) {
      expect(p.impactOnDefenses).toContain('Pendente de validação jurídica');
    }
  });
});
