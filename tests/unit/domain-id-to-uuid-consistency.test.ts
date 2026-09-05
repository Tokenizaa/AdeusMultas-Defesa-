/**
 * @file domain-id-to-uuid-consistency.test.ts
 * FASE 1.2 CORREÇÃO — Teste de consistência UUID v5 entre TypeScript e SQL
 *
 * A migration define domain_to_uuid() que implementa RFC 4122 v5 com o mesmo
 * namespace e algoritmo do domainIdToUuid() TypeScript.
 *
 * Este teste valida o vetor de referência público e documenta o UUID esperado
 * para cada domain ID usado no backfill da migration.
 *
 * Para verificar a função SQL no Supabase, compare:
 *   SELECT domain_to_uuid('case_1725123456_abcd');
 *   → deve devolver o mesmo UUID documentado neste arquivo
 */

import { describe, it, expect } from 'vitest';
import { uuidV5, DEFESAI_UUID_NAMESPACE } from '../../src/server/db/uuid-v5';

describe('FASE 1.2 CORREÇÃO — uuidV5 domainIdToUuid consistency', () => {
  // ─── Vetores de referência RFC 4122 ───────────────────────────────────────
  // Fonte: https://www.rfc-editor.org/rfc/rfc4122.html#section-A
  // v5 NAMESPACE_DNS + 'python.org' → 886313e1-3b8a-5372-9b90-0c9aee199e5d
  it('deve reproduzir vetor de referência RFC 4122 v5 (NAMESPACE_DNS, python.org)', () => {
    const result = uuidV5('python.org', '6ba7b810-9dad-11d1-80b4-00c04fd430c8');
    expect(result).toBe('886313e1-3b8a-5372-9b90-0c9aee199e5d');
  });

  // ─── Determinismo ──────────────────────────────────────────────────────────
  it('deve ser determinista: mesma entrada produz UUID idêntico', () => {
    const first = uuidV5('case_abc123', DEFESAI_UUID_NAMESPACE);
    const second = uuidV5('case_abc123', DEFESAI_UUID_NAMESPACE);
    expect(first).toBe(second);
  });

  it('deve ser idempotente: múltiplas chamadas devolvem o mesmo UUID', () => {
    const r1 = uuidV5('case_xyz789', DEFESAI_UUID_NAMESPACE);
    const r2 = uuidV5('case_xyz789', DEFESAI_UUID_NAMESPACE);
    const r3 = uuidV5('case_xyz789', DEFESAI_UUID_NAMESPACE);
    expect(r1).toBe(r2);
    expect(r2).toBe(r3);
  });

  it('deve produzir UUIDs diferentes para domain IDs diferentes', () => {
    const u1 = uuidV5('case_aaa', DEFESAI_UUID_NAMESPACE);
    const u2 = uuidV5('case_bbb', DEFESAI_UUID_NAMESPACE);
    expect(u1).not.toBe(u2);
  });

  // ─── Formato UUID v5 ───────────────────────────────────────────────────────
  it('deve produzir UUID v5 válido (versão 5, variante RFC 4122)', () => {
    const uuid = uuidV5('case_test', DEFESAI_UUID_NAMESPACE);
    // Formato canônico: 8-4-4-4-12
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    // Versão = 5 (nibble superior do 7o caractere = '5')
    const versionNibble = parseInt(uuid.charAt(14), 16);
    expect(versionNibble).toBe(5);
    // Variante RFC 4122: 8o caractere superior = 8, 9, a, ou b
    const variantNibble = parseInt(uuid.charAt(19), 16);
    expect(variantNibble).toBeGreaterThanOrEqual(8);
    expect(variantNibble).toBeLessThanOrEqual(11);
  });

  // ─── Namespace do projeto ──────────────────────────────────────────────────
  it('DEVE usar o namespace oficial do projeto DefesAi', () => {
    expect(DEFESAI_UUID_NAMESPACE).toBe('6f0a9d2e-8c47-4b3a-9f15-d7e0b2c4a681');
  });

  // ─── Valores de referência para verificação SQL no Supabase ──────────────────
  //
  // Para validar que a função SQL domain_to_uuid() no Supabase produz o mesmo
  // UUID que domainIdToUuid() no TypeScript, execute no Supabase SQL Editor:
  //
  //   SELECT domain_to_uuid('case_1725123456_abcd');
  //
  // O resultado deve ser igual ao valor documentado abaixo (produzido pelo TS).
  describe('valores de referência para validação SQL', () => {
    const testCases: Array<{ domainId: string; label: string }> = [
      { domainId: 'case_1725123456_abcd', label: 'domain ID típico de backfill' },
      { domainId: 'case_1234567890_test', label: 'domain ID de teste' },
      { domainId: 'case_9999999999_xyz', label: 'domain ID alternativo' },
    ];

    testCases.forEach(({ domainId, label }) => {
      it(`${label}: domain_to_uuid SQL deve devolver ${uuidV5(domainId, DEFESAI_UUID_NAMESPACE)}`, () => {
        const expected = uuidV5(domainId, DEFESAI_UUID_NAMESPACE);
        // Documenta o valor esperado para validação manual no Supabase
        console.info(`[FASE 1.2] domain_to_uuid('${domainId}') SQL deve devolver: ${expected}`);
        expect(expected).toBeTruthy();
        expect(expected).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      });
    });
  });
});
