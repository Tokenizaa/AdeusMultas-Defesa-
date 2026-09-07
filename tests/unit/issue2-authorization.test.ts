import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('Issue #2 — canonical authorization boundaries', () => {
  const appSource = read('src/server/app.ts');

  it('protects marketing mutations with authentication and admin authorization', () => {
    expect(appSource).toContain("app.use('/api/marketing', (req,res,next) => ['POST','PUT','PATCH','DELETE'].includes(req.method)");
    expect(appSource).toContain('authenticateToken(req,res');
    expect(appSource).toContain('requireAdmin(req,res,next)');
  });

  it('protects GET inbox/leads/export with admin authorization', () => {
    expect(appSource).toContain('inbox\\/conversations|inbox\\/stats|automation\\/leads|automation\\/export');
    expect(appSource).toContain("req.method === 'GET'");
    expect(appSource).toContain('requireAdmin(req,res,next)');
  });

  it('protects Meta privileged diagnostics and history centrally', () => {
    expect(appSource).toContain('webhooks\\/history');
    expect(appSource).toContain('webhook\\/history');
    expect(appSource).toContain('|tests|');
    expect(appSource).toContain('requireAdmin(req,res,next)');
  });

  it('keeps OAuth callbacks outside the privileged matcher', () => {
    expect(appSource).not.toContain('oauth/callback');
  });

  it('frontend uses authenticated fetch for protected marketing/Meta operations', () => {
    const inbox = read('src/components/marketing/components/InboxView.tsx');
    const marketing = read('src/components/marketing/hooks/use-marketing-service.ts');
    const meta = read('src/core/integrations/meta-client.ts');
    const exportTab = read('src/components/marketing/prospecting/ProspectingCollectionTab.tsx');

    expect(inbox).toContain('useAuthFetch');
    expect(inbox).not.toMatch(/fetch\(.*inbox/);
    expect(marketing).toContain('useAuthFetch');
    expect(marketing).not.toMatch(/await fetch\(/);
    expect(meta).toContain("import { authFetch } from '../../lib/authFetch'");
    expect(meta).not.toMatch(/await fetch\(/);
    expect(exportTab).toContain('authFetch(`/api/marketing/automation/export/');
    expect(exportTab).toContain('createObjectURL');
    expect(exportTab).not.toContain('window.open(`/api/marketing/automation/export/');
  });
});
