import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('POST /api/cases — P0 mass assignment guard', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/server/middleware/auth-middleware.ts'),
    'utf8',
  );

  it('uses an explicit allowlist before the existing case creation handler receives the body', () => {
    expect(source).toContain('function sanitizeCaseCreateBody');
    expect(source).toContain("req.method !== 'POST' || req.baseUrl !== '/api' || req.path !== '/cases'");
    expect(source).toContain('const editableCaseFields = new Set([');
    expect(source).toContain("'title'");
    expect(source).toContain("'vehicle'");
    expect(source).toContain("'infraction'");
    expect(source).toContain("'applicant'");
  });

  it('does not allow server-authoritative case fields through the creation allowlist', () => {
    const allowlistBlock = source.match(/const editableCaseFields = new Set\(\[(.*?)\]\);/s)?.[1] ?? '';

    for (const field of [
      'id',
      'userId',
      'analysis',
      'status',
      'currentStage',
      'isPaid',
      'paidAt',
      'payment',
      'defenseDraft',
      'documentGenerationStatus',
      'protocolInfo',
      'submissionInstructions',
      'timeline',
      'claimToken',
      'isAnonymous',
      'createdAt',
      'updatedAt',
    ]) {
      expect(allowlistBlock).not.toContain(`'${field}'`);
    }
  });

  it('invokes the guard before the existing handler continues', () => {
    const guardCall = source.indexOf('sanitizeCaseCreateBody(req);');
    const nextCall = source.indexOf('return next();', guardCall);
    expect(guardCall).toBeGreaterThan(-1);
    expect(nextCall).toBeGreaterThan(guardCall);
  });
});
