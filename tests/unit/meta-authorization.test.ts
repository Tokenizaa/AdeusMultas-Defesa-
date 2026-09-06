import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Meta authorization boundary', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/app.ts'), 'utf8');

  it('requires authenticated admin access for Meta management, publishing and insights', () => {
    expect(source).toContain('const metaAdminPath = /^\\/(?:integrations\\/meta|meta)\\/(?:debug-app|debug-token|connect|select-targets|disconnect|publish|insights)$/');
    expect(source).toContain('return requireAdmin(req, res, next);');
  });

  it('leaves OAuth callbacks and webhooks outside the privileged path list', () => {
    expect(source).not.toContain('oauth/callback');
    expect(source).toContain('Webhooks and OAuth callbacks remain public integration endpoints.');
  });
});
