import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('defense generation server authority', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/routes/defense.ts'), 'utf8');

  it('does not import or use the client argument catalog for legal selection', () => {
    expect(source).not.toContain("from '../../core/arguments/arguments-catalog'");
    expect(source).not.toContain('req.body.selectedArgumentIds');
    expect(source).not.toContain('req.body?.selectedArgumentIds');
  });

  it('does not accept client-selected procedure type or applicant identity', () => {
    expect(source).not.toContain('req.body.procedureType');
    expect(source).not.toContain('req.body?.procedureType');
    expect(source).not.toContain('req.body.applicantData');
    expect(source).not.toContain('req.body?.applicantData');
    expect(source).toContain('const procedureType = analysis.recommendedProcedure || domain.serviceType;');
    expect(source).toContain('const a = domain.applicant;');
  });

  it('fails closed when canonical legal analysis is unavailable', () => {
    expect(source).toContain('if (!analysis || !Array.isArray(analysis.recommendedArguments))');
    expect(source).toContain('status(409)');
    expect(source).not.toContain('analysis indisponível');
  });

  it('uses server-permitted theses as the only legal arguments', () => {
    expect(source).toContain('const permittedArguments = permittedTheses(analysis);');
    expect(source).toContain('permittedArguments as any');
    expect(source).toContain('defense.selectedArgumentIds = theses.length ? theses : defense.selectedArgumentIds;');
  });

  it('limits user factual context without allowing it to select legal authority', () => {
    expect(source).toContain("typeof req.body?.customFacts === 'string'");
    expect(source).toContain('req.body.customFacts.length <= 10000');
  });
});
