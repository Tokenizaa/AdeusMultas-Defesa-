/**
 * @file case-access.ts
 * Autorização de pagamento sobre um caso — decisão pura e testável.
 *
 * Regras:
 * - Sem usuário autenticado → 401 (endpoints de pagamento exigem JWT Supabase em produção).
 * - Admin → liberado (operações administrativas legítimas).
 * - Caso inexistente → liberado (o fluxo do wizard pode criar a ordem antes de persistir o caso;
 *   a vinculação case↔order acontece no webhook via reference_id).
 * - Dono (user_id canônico == user.id) → liberado.
 * - Caso alheio → 403. NUNCA confia em userId/role vindo do corpo da requisição.
 */
export interface PaymentCaseRowLike {
  user_id?: string;
  client_name?: string;
  client_email?: string;
  client_cpf?: string;
}

export interface PaymentUserLike {
  id: string;
  email?: string;
  role?: string;
}

export function assertPaymentCaseAccess(
  row: PaymentCaseRowLike | undefined,
  user: PaymentUserLike | undefined
): { status: number; error: string } | null {
  if (!user) return { status: 401, error: 'Não autenticado' };
  if (!row || user.role === 'admin') return null;
  // Dono = user_id canônico (UUID Supabase) == user.id. Nada de email/identidade do body.
  return row.user_id === user.id ? null : { status: 403, error: 'Você não tem permissão para pagar este caso.' };
}

/**
 * Resolve a identidade a usar no pagamento/desconto:
 * usuário autenticado > dono do caso > undefined (anônimo em sandbox).
 * Ignora userId/identidade enviados pelo frontend quando o servidor tem fonte melhor.
 */
export function resolveEffectiveUser(
  row: PaymentCaseRowLike | undefined,
  user: PaymentUserLike | undefined
): string | undefined {
  return user?.id || row?.user_id || undefined;
}