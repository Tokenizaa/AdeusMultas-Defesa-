import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * FASE 5.1 — validateCriticalEnvVars fail-closed behavior.
 *
 * Tests the static analysis result: when SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_ANON_KEY are missing,
 * the process must exit (fail-closed).
 *
 * The actual function is a module-level import in server.ts that is
 * called at startup. We test the logic by verifying the source
 * contains process.exit(1) after the missing-vars check.
 */
describe('FASE 5.1 — critical env vars fail-closed', () => {
  it('process.exit(1) is called when critical vars are missing', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const source = readFileSync(resolve('server.ts'), 'utf-8');
    const lines = source.split('\n');

    // Find the missing.length > 0 block
    const missingBlockIdx = lines.findIndex(l =>
      l.includes('missing.length > 0') && l.includes('if')
    );
    expect(missingBlockIdx).toBeGreaterThanOrEqual(0, 'missing.length > 0 if-block not found');

    // Collect lines of that if-block
    const blockLines: string[] = [];
    let depth = 0;
    for (let i = missingBlockIdx; i < lines.length; i++) {
      const line = lines[i];
      depth += (line.match(/\{/g) || []).length;
      blockLines.push(line);
      depth -= (line.match(/\}/g) || []).length;
      if (depth === 0 && blockLines.length > 1) break;
    }

    // The block must contain process.exit(1) — fail-closed
    const exitLine = blockLines.find(l => l.includes('process.exit'));
    expect(exitLine).toBeDefined(
      'process.exit(1) not found in missing-critical-vars block — server would continue without critical config'
    );
    expect(exitLine).toContain('process.exit(1)');
  });

  it('critical vars list includes SUPABASE_SERVICE_ROLE_KEY', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const source = readFileSync(resolve('server.ts'), 'utf-8');
    expect(source).toContain("'SUPABASE_SERVICE_ROLE_KEY'");
    expect(source).toContain("'SUPABASE_URL'");
    expect(source).toContain("'SUPABASE_ANON_KEY'");
  });

  it('optionalButImportant does NOT contain critical vars (no overlap)', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const source = readFileSync(resolve('server.ts'), 'utf-8');
    // optionalButImportant should not include the 3 critical vars
    const optMatch = source.match(/optionalButImportant\s*=\s*\[([^\]]+)\]/s);
    expect(optMatch).not.toBeNull();
    const optContent = optMatch![1];
    expect(optContent).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(optContent).not.toContain('SUPABASE_URL');
    expect(optContent).not.toContain('SUPABASE_ANON_KEY');
  });
});
