import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('analytics authorization', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/routes/analytics.ts'), 'utf8');

  it('requires authentication and admin authorization for business analytics', () => {
    expect(source).toContain("router.get('/analytics/dashboard', authenticateToken, requireAdmin");
  });

  it('does not expose cross-user case aggregates to ordinary users', () => {
    expect(source).not.toContain("router.get('/analytics/dashboard', authenticateToken, (req, res)");
  });
});
