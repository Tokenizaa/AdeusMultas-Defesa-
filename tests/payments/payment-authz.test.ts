/**
 * @file tests/payments/payment-authz.test.ts
 * Unidade: autorização de pagamento por caso (caso alheio → 403, anônimo → 401,
 * admin liberado, dono liberado). Regra P0 do checkout: userId/identidade vêm
 * do servidor, nunca do corpo da requisição.
 */
import { describe, it, expect } from 'vitest';
import { assertPaymentCaseAccess, resolveEffectiveUser } from '../../src/server/payments/case-access';

const citizen = { id: 'u-123e4567-e89b-12d3-a456-426614174001', email: 'citizen@defesai.test', role: 'citizen' };
const admin = { id: 'u-admin', email: 'admin@defesai.test', role: 'admin' };

describe('assertPaymentCaseAccess', () => {
  it('401 quando não há usuário autenticado', () => {
    expect(assertPaymentCaseAccess({ user_id: 'u-123' }, undefined)).toMatchObject({ status: 401 });
  });

  it('libera admin em qualquer caso', () => {
    expect(assertPaymentCaseAccess({ user_id: 'u-outro' }, admin)).toBeNull();
  });

  it('libera dono do caso (user_id = user.id)', () => {
    expect(assertPaymentCaseAccess({ user_id: citizen.id }, citizen)).toBeNull();
  });

  it('403 mesmo que o caso use user_id = email legado (não canônico)', () => {
    expect(assertPaymentCaseAccess({ user_id: 'citizen@defesai.test' }, citizen)).toMatchObject({ status: 403 });
  });

  it('403 para caso de outro usuário', () => {
    expect(assertPaymentCaseAccess({ user_id: 'u-outro' }, citizen)).toMatchObject({ status: 403 });
  });

  it('libera quando o caso ainda não existe (ordem criada antes da persistência)', () => {
    expect(assertPaymentCaseAccess(undefined, citizen)).toBeNull();
  });

  it('ignora user_id forjado no corpo — decisão usa só o caso persistido + JWT', () => {
    // Frontend mandaria userId='u-outro' no body; o helper recebe apenas row+user.
    expect(assertPaymentCaseAccess({ user_id: 'u-outro' }, citizen)).toMatchObject({ status: 403 });
  });
});

describe('resolveEffectiveUser', () => {
  it('prioriza usuário autenticado sobre o dono do caso', () => {
    expect(resolveEffectiveUser({ user_id: 'u-dono' }, citizen)).toBe(citizen.id);
  });

  it('usa o dono do caso quando não há usuário', () => {
    expect(resolveEffectiveUser({ user_id: 'u-dono' }, undefined)).toBe('u-dono');
  });

  it('undefined quando não há fonte confiável', () => {
    expect(resolveEffectiveUser(undefined, undefined)).toBeUndefined();
  });
});