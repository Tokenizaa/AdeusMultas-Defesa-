import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('communication and marketing authorization boundaries', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/server/app.ts'), 'utf8');

  it('requires owned case binding for non-admin WhatsApp sends', () => {
    expect(source).toContain("caseId é obrigatório para envio de WhatsApp por usuário não administrador.");
    expect(source).toContain("Você não tem permissão para enviar mensagens neste caso.");
    expect(source).toContain("ownerId !== req.user?.id");
  });

  it('protects marketing mutations with authentication and admin authorization', () => {
    expect(source).toContain("if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();");
    expect(source).toContain('return requireAdmin(req, res, next);');
  });
});
