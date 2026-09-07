import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('notification authorization boundary', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/app.ts'), 'utf8');

  it('requires authentication for notification operations except the public VAPID key', () => {
    expect(source).toContain("if (req.method === 'GET' && req.path === '/vapid-key') return next();");
    expect(source).toContain("return authenticateToken(req,res");
  });

  it('blocks non-admin cross-user notification targeting', () => {
    expect(source).toContain("if(req.body?.userId!==undefined&&req.body.userId!==req.user?.id)");
    expect(source).toContain("if(req.body?.userEmail!==undefined&&req.body.userEmail!==req.user?.email)");
    expect(source).toContain("req.user?.role !== 'admin'");
  });
});
