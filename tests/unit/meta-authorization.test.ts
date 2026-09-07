import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Meta authorization boundary', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/app.ts'), 'utf8');

  it('requires authenticated admin access for Meta management, publishing, diagnostics and history', () => {
    expect(source).toContain("const privileged=/^\\/(?:integrations\\/meta|meta)\\/(?:debug-app|debug-token|connect|select-targets|disconnect|publish|insights|tests|webhooks\\/history|webhook\\/history)$/");
    expect(source).toContain('authenticateToken(req,res');
    expect(source).toContain('requireAdmin(req,res,next)');
  });

  it('keeps integration callbacks and webhooks outside the privileged matcher', () => {
    expect(source).not.toContain('oauth/callback');
    expect(source).toContain('webhooks\\/history');
    expect(source).toContain('webhook\\/history');
  });
});
