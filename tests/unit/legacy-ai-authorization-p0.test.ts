import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('legacy /api/ai authorization — P0', () => {
  it('requires authentication on the /api/ai mount without changing /api/auth behavior', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/server/middleware/rate-limit.ts'),
      'utf8',
    );

    expect(source).toContain("if (req.baseUrl === '/api/ai')");
    expect(source).toContain('authenticateToken(req, res');
    expect(source).toContain('requireAuth(req, res, next)');
  });

  it('does not apply the AI authentication guard to /api/auth', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/server/middleware/rate-limit.ts'),
      'utf8',
    );

    expect(source).toContain("if (req.baseUrl === '/api/ai')");
    expect(source).not.toContain("req.baseUrl === '/api/auth'");
  });
});
