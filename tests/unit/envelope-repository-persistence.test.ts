/**
 * @file envelope-repository-persistence.test.ts
 * FASE 1.2 CORREÇÃO — Testes de persistência de ownership de envelope
 *
 * Cenário: o Map<envelopeId, {caseId, userId}> em memória era perdido em restart.
 * O envelopeRepository substitui o Map por persistência em Supabase.
 *
 * Testa:
 * 1. register() persiste ownership e retorna registro
 * 2. belongsToUser() consulta o banco — funciona após "restart" (Map vazio)
 * 3. belongsToUser() é fail-closed quando banco não retorna resultado
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnvelopeRepository } from '../../src/server/db/envelope-repository';

// vi.hoisted garante que as variáveis são disponíveis no escopo do mock factory
// (vi.mock é hoisted para o topo do arquivo antes da execução do módulo)
const mockInsert = vi.hoisted(() => vi.fn());
const mockSelect = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockEq = vi.hoisted(() => vi.fn());
const mockMaybeSingle = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn(() => ({
  insert: mockInsert,
  select: mockSelect,
  update: mockUpdate,
  eq: mockEq,
  maybeSingle: mockMaybeSingle,
})));

vi.mock('../../src/server/db/supabase-server', () => ({
  getSupabaseServerClient: () => ({ from: mockFrom } as any),
}));

describe('FASE 1.2 CORREÇÃO — envelopeRepository persistence', () => {
  let repo: EnvelopeRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new EnvelopeRepository();
  });

  // ─── register() ───────────────────────────────────────────────────────────

  describe('register()', () => {
    it('deve inserir registro com user_id do criador (vindo do JWT, não do body)', async () => {
      const savedRecord = {
        id: 'uuid-local',
        documenso_envelope_id: 'env_abc123',
        external_id: 'case_123',
        case_id: 'uuid-do-caso',
        user_id: 'user_uuid_criador',
        status: 'DRAFT',
        envelope_data: { title: 'test' },
      };
      mockInsert.mockReturnValue({
        select: () => ({ single: () => Promise.resolve({ data: savedRecord, error: null }) }),
      });

      const result = await repo.register({
        documensoEnvelopeId: 'env_abc123',
        externalId: 'case_123',
        caseId: 'uuid-do-caso',
        userId: 'user_uuid_criador',
        envelopeData: { title: 'test' },
      });

      expect(mockFrom).toHaveBeenCalledWith('documenso_envelopes');
      expect(result).not.toBeNull();
      expect(result?.user_id).toBe('user_uuid_criador');
      expect(result?.documenso_envelope_id).toBe('env_abc123');
    });

    it('deve lançar erro (fail closed) quando Supabase falha no insert', async () => {
      mockInsert.mockReturnValue({
        select: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'network failure' } }) }),
      });

      await expect(
        repo.register({
          documensoEnvelopeId: 'env_abc',
          externalId: 'case_1',
          caseId: 'uuid-1',
          userId: 'user_1',
        })
      ).rejects.toThrow(/network failure/);
    });
  });

  // ─── belongsToUser() — authorization central (substitui o Map em memória) ──

  describe('belongsToUser()', () => {
    it('deve retornar true quando envelope pertence ao user (query direta no banco)', async () => {
      mockSelect.mockReturnThis();
      mockEq.mockReturnThis();
      mockMaybeSingle.mockResolvedValue({
        data: { id: 'uuid-local', documenso_envelope_id: 'env_abc', user_id: 'user_uuid' },
        error: null,
      });

      const result = await repo.belongsToUser('env_abc', 'user_uuid');

      // Verifica que a query usa as colunas corretas (documenta o contrato com o banco)
      const eqCalls = mockEq.mock.calls;
      expect(eqCalls.some((c: unknown[]) => (c[0] as string) === 'documenso_envelope_id' && c[1] === 'env_abc')).toBe(true);
      expect(eqCalls.some((c: unknown[]) => (c[0] as string) === 'user_id' && c[1] === 'user_uuid')).toBe(true);
      expect(result).toBe(true);
    });

    it('deve retornar false quando envelope existe mas pertence a OUTRO user (IDOR bloqueado)', async () => {
      mockSelect.mockReturnThis();
      mockEq.mockReturnThis();
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await repo.belongsToUser('env_atacante', 'user_vitima');

      expect(result).toBe(false); // fail closed — atacante não obtém acesso
    });

    it('deve retornar false quando envelope não existe (cold start / novo servidor)', async () => {
      mockSelect.mockReturnThis();
      mockEq.mockReturnThis();
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await repo.belongsToUser('env_nunca_criado', 'user_x');

      // Cenário cold-start: Map em memória vazio, banco não tem registro
      // Fail closed: acesso negado, não é uma vulnerabilidade
      expect(result).toBe(false);
    });

    it('deve retornar false quando query dá erro no banco (fail closed)', async () => {
      mockSelect.mockReturnThis();
      mockEq.mockReturnThis();
      mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'db connection lost' } });

      const result = await repo.belongsToUser('env_any', 'user_any');

      expect(result).toBe(false); // fail closed — não abre brecha
    });
  });

  // ─── getByDocumensoId() ──────────────────────────────────────────────────

  describe('getByDocumensoId()', () => {
    it('deve buscar registro por documenso_envelope_id', async () => {
      const envelopeData = { id: 'uuid-local', documenso_envelope_id: 'env_xyz', status: 'PENDING' };
      mockSelect.mockReturnThis();
      mockEq.mockReturnThis();
      mockMaybeSingle.mockResolvedValue({ data: envelopeData, error: null });

      const result = await repo.getByDocumensoId('env_xyz');

      expect(result).toEqual(envelopeData);
    });

    it('deve retornar null quando não encontrado', async () => {
      mockSelect.mockReturnThis();
      mockEq.mockReturnThis();
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await repo.getByDocumensoId('env_unknown');

      expect(result).toBeNull();
    });
  });

  // ─── updateStatus() ──────────────────────────────────────────────────────

  describe('updateStatus()', () => {
    it('deve fazer UPDATE de status no banco (webhook handler)', async () => {
      mockUpdate.mockReturnThis();
      mockEq.mockResolvedValue({ data: null, error: null });

      await repo.updateStatus('env_abc', 'PENDING', { sent_at: '2024-01-01T00:00:00Z' });

      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'PENDING',
        sent_at: '2024-01-01T00:00:00Z',
      });
      expect(mockEq).toHaveBeenCalledWith('documenso_envelope_id', 'env_abc');
    });

    it('deve fazer UPDATE com completed_at quando fornecido', async () => {
      mockUpdate.mockReturnThis();
      mockEq.mockResolvedValue({ data: null, error: null });

      await repo.updateStatus('env_done', 'COMPLETED', { completed_at: '2024-06-01T12:00:00Z' });

      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'COMPLETED',
        completed_at: '2024-06-01T12:00:00Z',
      });
    });

    it('deve lançar erro quando UPDATE falha (fail closed)', async () => {
      mockUpdate.mockReturnThis();
      mockEq.mockResolvedValue({ data: null, error: { message: 'permission denied' } });

      await expect(repo.updateStatus('env_fail', 'COMPLETED')).rejects.toThrow(/permission denied/);
    });
  });
});
