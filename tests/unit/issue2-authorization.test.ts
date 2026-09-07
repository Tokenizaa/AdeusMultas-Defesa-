import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Issue #2 — marketing/inbox/leads/meta authorization (server.ts entry Node)', () => {
  const serverSource = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');

  it('imports auth middleware in the Node entry', () => {
    expect(serverSource).toContain("import { authenticateToken, requireAdmin } from './src/server/middleware/auth-middleware'");
  });

  it('protects marketing mutations with admin authorization', () => {
    expect(serverSource).toContain("if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();");
    expect(serverSource).toContain('return requireAdmin(req, res, next);');
  });

  it('protects GET inbox (conversations/stats) and leads/export with admin authorization', () => {
    expect(serverSource).toContain("inbox\\/conversations|inbox\\/stats|automation\\/leads|automation\\/export");
    expect(serverSource).toContain("req.method === 'GET'");
    expect(serverSource).toContain('return requireAdmin(req, res, next);');
  });

  it('protects Meta privileged endpoints (tests/webhooks history) in the Node entry', () => {
    expect(serverSource).toContain('webhooks\\/history|tests');
    expect(serverSource).toContain('metaAdminAuxPath');
  });

  it('keeps webhooks and OAuth callbacks public (no privileged match on callbacks)', () => {
    expect(serverSource).toContain("metaAdminPath = /^\\/(?:integrations\\/meta|meta)\\/(?:debug-app|debug-token|connect|select-targets|disconnect|publish|insights)$/");
    expect(serverSource).not.toContain('oauth/callback');
  });
});

describe('Issue #2 — app.ts (serverless) aligned', () => {
  const appSource = readFileSync(resolve(process.cwd(), 'src/server/app.ts'), 'utf8');

  it('protects GET inbox/leads/export with admin in app.ts', () => {
    expect(appSource).toContain("inbox\\/conversations|inbox\\/stats|automation\\/leads|automation\\/export");
    expect(appSource).toContain("req.method === 'GET'");
  });

  it('protects Meta tests and webhook history in app.ts', () => {
    expect(appSource).toContain('webhooks\\/history|tests');
    expect(appSource).toContain('metaAdminAuxPath');
  });

  it('leaves OAuth callbacks and webhooks outside the privileged path list (regression)', () => {
    expect(appSource).not.toContain('oauth/callback');
    expect(appSource).toContain('Webhooks and OAuth callbacks remain public integration endpoints.');
  });
});

describe('Issue #2 — frontend sends auth to protected routes', () => {
  it('InboxView uses authFetch (no raw fetch to inbox endpoints)', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/marketing/components/InboxView.tsx'), 'utf8');
    expect(source).toContain('useAuthFetch');
    expect(source).not.toMatch(/fetch\(.*inbox/);
  });

  it('use-marketing-service uses authFetch', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/marketing/hooks/use-marketing-service.ts'), 'utf8');
    expect(source).toContain('useAuthFetch');
    expect(source).not.toMatch(/await fetch\(/);
  });

  it('meta-client uses authFetch (non-React module)', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/core/integrations/meta-client.ts'), 'utf8');
    expect(source).toContain("import { authFetch } from '../../lib/authFetch'");
    expect(source).not.toMatch(/await fetch\(/);
  });

  it('export downloads use authFetch + Blob (no bare window.open)', () => {
    const tab = readFileSync(resolve(process.cwd(), 'src/components/marketing/prospecting/ProspectingCollectionTab.tsx'), 'utf8');
    expect(tab).toContain('authFetch(`/api/marketing/automation/export/');
    expect(tab).toContain('createObjectURL');
    expect(tab).not.toContain("window.open(`/api/marketing/automation/export/");
  });
});