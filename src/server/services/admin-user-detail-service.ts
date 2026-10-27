import { CanonicalMapper } from '../../core/mappers/canonical-mapper';
import type { CaseDomain, CaseRow } from '../../types';

export interface AdminUserProfileRow {
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  role: string | null;
  created_at: string | null;
}

export interface AdminUserPaymentRow {
  status: string;
  amount: number | null;
  final_amount?: number | null;
}

export interface AdminUserDetail {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    cpf: string | null;
    role: 'admin' | 'citizen';
    createdAt: string | null;
  };
  cases: CaseDomain[];
  totalSpent: number;
}

/**
 * Builds the admin detail response from authoritative profile, case and payment records.
 * Case association is by immutable user_id only; CPF and case-ID substring matching are
 * deliberately forbidden because they can mix unrelated users' records.
 */
export function buildAdminUserDetail(
  profile: AdminUserProfileRow,
  caseRows: CaseRow[],
  paymentRows: AdminUserPaymentRow[]
): AdminUserDetail {
  const cases = caseRows
    .filter((row) => row.user_id === profile.user_id)
    .map((row) => CanonicalMapper.rowToDomain(row));

  const totalSpent = paymentRows
    .filter((payment) => payment.status.toUpperCase() === 'PAID')
    .reduce((sum, payment) => {
      const amount = Number(payment.amount ?? payment.final_amount ?? 0);
      return Number.isFinite(amount) && amount > 0 ? sum + amount : sum;
    }, 0);

  return {
    user: {
      id: profile.user_id,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      cpf: profile.cpf,
      role: profile.role === 'admin' ? 'admin' : 'citizen',
      createdAt: profile.created_at,
    },
    cases,
    totalSpent,
  };
}
