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

  it('fails closed for real payment payer identity and isolates sandbox simulation', () => {
    const source = read('src/server/routes/payments.ts');
    expect(source).toContain('function validatePayerIdentity');
    expect(source).toContain('const payer = validatePayerIdentity(customerName, customerEmail, customerCpf);');
    expect(source).toContain("if (!payer) return res.status(400)");
    expect(source).toContain("router.post('/simulate-payment'");
    expect(source).toContain("if (process.env.NODE_ENV === 'production')");
    expect(source).toContain("return res.status(501).json");
    expect(source).toContain("Endpoint de simulação não disponível em produção");

    // The security boundary is the real payment creation paths. Sandbox fixtures
    // may exist in the dedicated simulation endpoint and must not be mistaken for
    // production payer fallbacks.
    const simulationIndex = source.indexOf("router.post('/simulate-payment'");
    expect(simulationIndex).toBeGreaterThan(-1);
    const realPaymentSource = source.slice(0, simulationIndex);
    expect(realPaymentSource).toContain('const payer = validatePayerIdentity(customerName, customerEmail, customerCpf);');
    expect(realPaymentSource).toContain('payer.name');
    expect(realPaymentSource).toContain('payer.email');
    expect(realPaymentSource).toContain('payer.cpf');
    expect(realPaymentSource).not.toContain('customerName ||');
    expect(realPaymentSource).not.toContain('customerEmail ||');
    expect(realPaymentSource).not.toContain('customerCpf ||');
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
