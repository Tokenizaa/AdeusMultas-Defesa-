import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('POST /api/cases — P0 mass assignment guard', () => {
  it('must not bind the entire request body directly to CaseDomain', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/server/routes/cases.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/const\s+domainData:\s*CaseDomain\s*=\s*req\.body/);
  });

  it('must explicitly protect server-authoritative fields on creation', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/server/routes/cases.ts'),
      'utf8',
    );

    expect(source).toMatch(/editableCaseFields|allowedCaseFields|pick\s*\(/);
    expect(source).not.toMatch(/domainData\.id\s*=\s*`case_/);
  });
});
