import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('governance verification integrity', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/routes/governance.ts'), 'utf8');

  it('returns a negative result when no persisted case matches', () => {
    expect(source).toContain("verified: false");
    expect(source).toContain("caso não encontrado");
  });

  it('does not contain fabricated development verification data', () => {
    expect(source).not.toContain('DET2026SP984712');
    expect(source).not.toContain('BRA2E19');
    expect(source).not.toContain('DETRAN-SP');
    expect(source).not.toContain('sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069');
  });
});
