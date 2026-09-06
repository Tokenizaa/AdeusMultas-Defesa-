import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('admin commercial authorization', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/app.ts'), 'utf8');

  it('protects the entire admin commercial mount with authentication and admin authorization', () => {
    expect(source).toContain("app.use('/api/admin/commercial', authenticateToken, requireAdmin, commercialRoutes);");
  });

  it('does not leave the admin commercial mount as a bare public router', () => {
    expect(source).not.toContain("app.use('/api/admin/commercial', commercialRoutes);");
  });
});
