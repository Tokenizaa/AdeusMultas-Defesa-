import { describe, it, expect } from 'vitest';
import { ChangeDetector } from './change-detector';
import { calculateSha256Sync } from './hash-generator';
import { KnowledgeSnapshot, KnowledgeSource } from '../types';

function source(): KnowledgeSource {
  return {
    id: 'SRC_TEST',
    uf: 'SP',
    organId: 'DETRAN-SP',
    tier: 'TIER_1_GOV_PRIMARY',
    title: 'Fonte Teste',
    url: 'https://example.com/legislacao',
    category: 'legislation',
    lastCheckedAt: undefined,
    lastSuccessfulFetchAt: undefined,
    httpStatus: undefined,
    contentHash: undefined,
    isActive: true,
    fetchErrorCount: 0,
    lastErrorMessage: undefined,
  };
}

function snapshot(text: string, hash: string): KnowledgeSnapshot {
  return {
    id: `snap_${hash}`,
    sourceId: 'SRC_TEST',
    url: 'https://example.com/legislacao',
    uf: 'SP',
    fetchedAt: new Date().toISOString(),
    httpStatus: 200,
    contentHash: hash,
    normalizedText: text,
    contentLength: text.length,
  };
}

describe('Monitoramento Nacional — Fase 7 (nunca auto-atualiza tese)', () => {
  it('detectChange marks every change PENDING_REVIEW (never auto-approved)', () => {
    const prev = snapshot('conteúdo antigo da resolução', 'hash-antigo');
    const curr = snapshot('conteúdo novo com REVOGAÇÃO da resolução', 'hash-novo');
    const change = ChangeDetector.detectChange(curr, prev, source());
    expect(change).not.toBeNull();
    expect(change!.status).toBe('PENDING_REVIEW');
    // Revogação normativa => P0 crítico, jamais auto-aplicável.
    expect(change!.changeType).toBe('REVOCATION');
    expect(change!.riskLevel).toBe('P0_LEGAL_CRITICAL');
  });

  it('detectChange returns null when hash unchanged (idempotent, no false positive)', () => {
    const s = snapshot('mesmo conteúdo', 'hash-igual');
    expect(ChangeDetector.detectChange(s, s, source())).toBeNull();
  });

  it('content hash is deterministic (same text, same hash, no timestamp)', () => {
    const h1 = calculateSha256Sync('Legislação de trânsito oficial');
    const h2 = calculateSha256Sync('Legislação de trânsito oficial');
    expect(h1).toBe(h2);
    expect(h1).not.toContain('hash-'); // não é fallback fake de timestamp
  });
});
