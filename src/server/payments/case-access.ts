/**
 * @file case-access.ts
 * Autorização de pagamento sobre um caso — decisão pura e testável.
 *
 * Regras:
 * - Sem usuário autenticado → 401.
 * - Admin → liberado para operações administrativas legítimas.
 * - Caso inexistente → 404.
 * - Dono (user_id canônico == user.id) → liberado.
 * - Caso alheio → 403.
 * - NUNCA confia em userId/role vindo do corpo da requisição.
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
  if (!row) return { status: 404, error: 'Caso não encontrado.' };
  if (!user) return { status: 401, error: 'Não autenticado' };
  if (user.role === 'admin') return null;
  return row.user_id === user.id
    ? null
    : { status: 403, error: 'Você não tem permissão para pagar este caso.' };
}

/**
 * Resolve a identidade a usar no pagamento:
 * usuário autenticado > dono do caso.
 * Ignora userId/identidade enviados pelo frontend quando o servidor tem fonte melhor.
 */
export function resolveEffectiveUser(
  row: PaymentCaseRowLike | undefined,
  user: PaymentUserLike | undefined
): string | undefined {
  return user?.id || row?.user_id || undefined;
}
