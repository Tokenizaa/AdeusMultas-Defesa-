import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rowToDomain: vi.fn((row: any) => row.domain),
}));

vi.mock('../../core/mappers/canonical-mapper', () => ({
  CanonicalMapper: { rowToDomain: mocks.rowToDomain },
}));

import { buildAdminUserDetail } from './admin-user-detail-service';

describe('buildAdminUserDetail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('associates cases only by exact user_id and never substitutes unrelated cases', () => {
    const profile = {
      user_id: 'user-a',
      name: null,
      email: 'a@example.com',
      phone: null,
      cpf: null,
      role: 'citizen',
      created_at: null,
    };
    const rows = [
      { user_id: 'user-a', id: 'case-a', domain: { id: 'case-a' } },
      { user_id: 'user-b', id: 'case-b', domain: { id: 'case-b' } },
      { user_id: null, id: 'case-anonymous', domain: { id: 'case-anonymous' } },
    ];

    const result = buildAdminUserDetail(profile, rows as any, []);

    expect(result.user).toEqual({
      id: 'user-a',
      name: null,
      email: 'a@example.com',
      phone: null,
      cpf: null,
      role: 'citizen',
      createdAt: null,
    });
    expect(result.cases).toEqual([{ id: 'case-a' }]);
    expect(mocks.rowToDomain).toHaveBeenCalledTimes(1);
    expect(result.totalSpent).toBe(0);
  });

  it('sums only confirmed payments and preserves a real zero total', () => {
    const profile = {
      user_id: 'user-a',
      name: 'User A',
      email: 'a@example.com',
      phone: null,
      cpf: null,
      role: 'citizen',
      created_at: '2026-01-01T00:00:00.000Z',
    };

    const result = buildAdminUserDetail(profile, [], [
      { status: 'PAID', amount: 39.9 },
      { status: 'paid', amount: 20 },
      { status: 'PENDING', amount: 100 },
      { status: 'CANCELED', amount: 200 },
    ]);

    expect(result.totalSpent).toBeCloseTo(59.9);
    expect(result.cases).toEqual([]);
  });
});
