import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('authorization hardening', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/app.ts'), 'utf8');

  it('uses an explicit allowlist for client-editable case fields', () => {
    expect(source).toContain("const editableCaseFields = new Set([");
    expect(source).toContain("'title'");
    expect(source).toContain("'vehicle'");
    expect(source).toContain("'infraction'");
    expect(source).toContain("'applicant'");
  });

  it('does not allow server-authoritative fields through the update allowlist', () => {
    const allowlistBlock = source.match(/const editableCaseFields = new Set\(\[(.*?)\]\);/s)?.[1] ?? '';
    for (const field of [
      'status', 'currentStage', 'isPaid', 'paidAt', 'payment', 'analysis',
      'defenseDraft', 'documentGenerationStatus', 'protocolInfo',
      'submissionInstructions', 'timeline', 'claimToken', 'isAnonymous',
      'createdAt', 'updatedAt', 'userId',
    ]) {
      expect(allowlistBlock).not.toContain(`'${field}'`);
    }
  });

  it('reconstructs protected properties from the persisted canonical case', () => {
    for (const assignment of [
      'status: existingDomain.status',
      'currentStage: existingDomain.currentStage',
      'isPaid: existingDomain.isPaid',
      'paidAt: existingDomain.paidAt',
      'payment: existingDomain.payment',
      'analysis: existingDomain.analysis',
      'defenseDraft: existingDomain.defenseDraft',
      'documentGenerationStatus: existingDomain.documentGenerationStatus',
      'protocolInfo: existingDomain.protocolInfo',
      'timeline: existingDomain.timeline',
      'claimToken: existingDomain.claimToken',
      'isAnonymous: existingDomain.isAnonymous',
      'createdAt: existingDomain.createdAt',
    ]) {
      expect(source).toContain(assignment);
    }
  });

  it('requires authentication for payment operations except public lookup/webhooks', () => {
    expect(source).toContain("app.use('/api/payments', (req, res, next) => {");
    expect(source).toContain("return authenticateToken(req, res, next);");
    expect(source).toContain("req.path === '/resolve-price'");
    expect(source).toContain("req.path.startsWith('/webhooks/')");
  });
});
