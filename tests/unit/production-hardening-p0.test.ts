import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
describe('production hardening P0/P1', () => {
  it('uses user_id for user_profiles access', () => {
    const source = read('src/server/routes/admin.ts');
    expect(source).not.toContain(".select('id, email, name, role, cpf, created_at, updated_at')");
    expect(source).not.toContain(".select('id, email, name, role')");
    expect(source).not.toContain(".eq('id', profile.id)");
    expect(source).toContain(".select('user_id, email, name, role, cpf, created_at, updated_at')");
    expect(source).toContain(".eq('user_id', profile.user_id)");
  });
  it('does not contain synthetic payer fallbacks', () => {
    const source = read('src/server/routes/payments.ts');
    expect(source).not.toContain('Condutor DefesAi');
    expect(source).not.toContain('contato@www.defesai.shop');
    expect(source).not.toContain('12345678909');
    expect(source).toContain('validatePayerIdentity');
  });
  it('trusts exactly the Vercel proxy hop only on Vercel', () => {
    expect(read('src/server/app.ts')).toContain("app.set('trust proxy', process.env.VERCEL === '1' ? 1 : false);");
  });
  it('protects remaining Meta administrative diagnostics/history centrally', () => {
    const source = read('src/server/app.ts');
    expect(source).toContain('webhooks\\/history');
    expect(source).toContain('webhook\\/history');
    expect(source).toContain('|tests|');
  });
});
