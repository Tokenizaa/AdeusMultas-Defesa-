import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('communication and marketing authorization boundaries', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/app.ts'), 'utf8');

  it('requires authentication and ownership for non-admin WhatsApp sends', () => {
    expect(source).toContain("app.use('/api/communication', authenticateToken");
    expect(source).toContain("/^\\/whatsapp\\/(send|send-document|send-media)$/");
    expect(source).toContain("if (!caseId || !row || row.user_id !== req.user?.id)");
    expect(source).toContain('Você não tem permissão para enviar mensagens neste caso.');
  });

  it('protects marketing mutations with authentication and admin authorization', () => {
    expect(source).toContain("app.use('/api/marketing', (req,res,next) => ['POST','PUT','PATCH','DELETE'].includes(req.method)");
    expect(source).toContain('authenticateToken(req,res');
    expect(source).toContain('requireAdmin(req,res,next)');
  });
});
