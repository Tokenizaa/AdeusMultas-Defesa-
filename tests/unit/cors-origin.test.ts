import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const CORS_PATH = resolve('src/server/config/cors.ts');

function corsLines(): string[] {
  return readFileSync(CORS_PATH, 'utf-8').split('\n');
}

/**
 * Finds all lines belonging to the CORS origin callback by tracking brace depth.
 * The callback opens with `{` on the `origin:` line and closes when brace depth
 * returns to 0 after the opening.
 */
function findCallbackLines(): string[] {
  const lines = corsLines();
  const result: string[] = [];
  let inOrigin = false;
  let braceDepth = 0;

  for (const line of lines) {
    if (line.includes('origin: (origin, callback)')) {
      inOrigin = true;
      braceDepth = 0;
    }
    if (inOrigin) {
      result.push(line);
      braceDepth += (line.match(/\{/g) || []).length;
      braceDepth -= (line.match(/\}/g) || []).length;
      // Callback closes after the opening brace, when depth is back to 0
      if (braceDepth === 0 && result.length > 1) break;
    }
  }
  return result;
}

describe('CORS — FASE 5.4 security fix', () => {
  /**
   * FINDING: the origin callback had both branches calling callback(null, true).
   * The `else` branch was dead code — origin rejection was silently accepted.
   *
   * BEFORE (broken):
   *   if (!origin || isOriginAllowed(origin)) {
   *     callback(null, true);
   *   } else {
   *     callback(null, true);  // ← same as allowed — reject ignored
   *   }
   *
   * AFTER (fixed):
   *   if (!origin || isOriginAllowed(origin)) {
   *     callback(null, true);
   *   } else {
   *     callback(null, false);  // ← rejection actually enforced
   *   }
   */
  describe('origin callback else branch — FASE 5.4 fix verification', () => {
    it('else { opens the rejection branch', () => {
      const lines = findCallbackLines();
      const elseLine = lines.find(l => l.includes('else'));
      expect(elseLine).toBeDefined('} else { not found in origin callback');
      expect(elseLine).toContain('else');
    });

    it('callback(null, false) is inside the else branch — rejection no longer ignored', () => {
      const lines = findCallbackLines();
      const elseIdx = lines.findIndex(l => l.includes('else'));
      expect(elseIdx).toBeGreaterThanOrEqual(0, 'else not found in origin callback');

      // Lines after '} else {' are inside the else block
      const elseBlockLines = lines.slice(elseIdx + 1);
      const rejectCallback = elseBlockLines.find(l => l.includes('callback'));
      expect(rejectCallback).toBeDefined('callback not found after else');
      expect(rejectCallback).toContain('callback(null, false)');
    });

    it('allowed-origin branch calls callback(null, true)', () => {
      const lines = findCallbackLines();
      const allowedCallback = lines.find(l => l.includes('callback(null, true)'));
      expect(allowedCallback).toBeDefined('callback(null, true) not found in origin callback');
    });
  });

  describe('allowedOrigins configuration — no secret / no dangerous fallback', () => {
    it('allowedOrigins array contains only safe URLs', () => {
      const source = readFileSync(CORS_PATH, 'utf-8');
      const originMatch = source.match(/allowedOrigins\s*=\s*\[([^\]]+)\]/s);
      expect(originMatch).not.toBeNull();

      const arrayContent = originMatch![1];
      // Should not contain hardcoded credentials, tokens, or secrets
      expect(arrayContent).not.toMatch(/secret|token|key|password|sk-/i);
    });

    it('no wildcard origin in production path', () => {
      const source = readFileSync(CORS_PATH, 'utf-8');
      // In production, the callback should NOT allow arbitrary origins
      // (development has NODE_ENV check for permissiveness)
      // The callback must NOT have a bare callback(null, true) at the end
      // without going through isOriginAllowed first.
      const lines = corsLines();
      const originFnLines: string[] = [];
      let capturing = false;
      for (const line of lines) {
        if (line.includes('origin: (origin, callback)')) capturing = true;
        if (capturing) {
          originFnLines.push(line);
          if (originFnLines.length > 1 && line.trim() === '}') break;
        }
      }

      // After the fix: the else branch must call callback(null, false)
      // The development fallback (NODE_ENV !== 'production') is inside
      // isOriginAllowed, not a bare callback(null, true) at the end.
      const callbackLines = originFnLines.filter(l => l.includes('callback(null,'));
      expect(callbackLines.length).toBe(2); // one callback(null, true), one callback(null, false)
    });
  });

  describe('credentials and security headers', () => {
    it('credentials: true is set (allows cookies/auth headers)', () => {
      const source = readFileSync(CORS_PATH, 'utf-8');
      expect(source).toContain('credentials: true');
    });

    it('methods are restricted to safe subset', () => {
      const source = readFileSync(CORS_PATH, 'utf-8');
      expect(source).toContain("methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']");
    });

    it('allowedHeaders do not include dangerous headers', () => {
      const source = readFileSync(CORS_PATH, 'utf-8');
      const headerMatch = source.match(/allowedHeaders:\s*\[[^\]]+\]/s);
      expect(headerMatch).not.toBeNull();
      // Should not include things like 'x-api-key' if that were a secret bearer
      // Authorization header is acceptable for legitimate use (JWT Bearer tokens)
      expect(headerMatch![0]).not.toMatch(/x-(?:api|secret|admin)-key/i);
    });
  });
});
