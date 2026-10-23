/**
 * @file source-alias-registry.test.ts
 * Testes de reconciliação dos quatro sistemas de IDs de fontes oficiais.
 *
 * Valida que o mapeamento entre IDs legados e o ID canônico
 * (OFFICIAL_SOURCES_REGISTRY) preserva referências sem perder IDs legados,
 * sem associar fontes diferentes por pertencerem ao mesmo órgão, e sem
 * inventar correspondências inexistentes.
 */
import { describe, it, expect } from 'vitest';
import {
  SOURCE_ALIAS_REGISTRY,
  resolveCanonicalId,
  getLegacyIds,
  getAllCanonicalIds,
  isRegisteredSourceId,
  findOrphanedIds,
} from './source-alias-registry';
import { OFFICIAL_SOURCES_REGISTRY } from '../sources-registry';

describe('Reconciliação — identidade canônica das fontes', () => {
  it('todo ID canônico está presente no OFFICIAL_SOURCES_REGISTRY', () => {
    const canonicalIds = new Set(getAllCanonicalIds());
    const registryIds = new Set(OFFICIAL_SOURCES_REGISTRY.map((s) => s.id));

    for (const id of canonicalIds) {
      expect(registryIds.has(id)).toBe(true, `ID canônico ${id} não existe no catálogo de monitoramento`);
    }
  });

  it('resolveCanonicalId retorna o próprio ID quando já é canônico', () => {
    expect(resolveCanonicalId('SRC_FED_PLANALTO_CTB')).toBe('SRC_FED_PLANALTO_CTB');
    expect(resolveCanonicalId('SRC_FED_CONTRAN_RESOLUCOES')).toBe('SRC_FED_CONTRAN_RESOLUCOES');
  });

  it('resolveCanonicalId mapeia IDs legados do seed para o canônico', () => {
    expect(resolveCanonicalId('SRC_FED_CTB')).toBe('SRC_FED_PLANALTO_CTB');
    expect(resolveCanonicalId('SRC_FED_CONTRAN')).toBe('SRC_FED_CONTRAN_RESOLUCOES');
    expect(resolveCanonicalId('SRC_FED_STJ')).toBe('SRC_FED_STJ_JURISPRUDENCIA');
    expect(resolveCanonicalId('src_ctb_planalto')).toBe('SRC_FED_PLANALTO_CTB');
    expect(resolveCanonicalId('src_contran_gov')).toBe('SRC_FED_CONTRAN_RESOLUCOES');
  });

  it('resolveCanonicalId mapeia IDs legados do recovery SQL para o canônico', () => {
    expect(resolveCanonicalId('SRC_FED_PLANALTO')).toBe('SRC_FED_PLANALTO_CTB');
    expect(resolveCanonicalId('SRC_FED_SENATRAN')).toBe('SRC_FED_SENATRAN_PORTAL');
    expect(resolveCanonicalId('SRC_FED_CONTRAN')).toBe('SRC_FED_CONTRAN_RESOLUCOES');
    expect(resolveCanonicalId('SRC_FED_PRF')).toBe('SRC_FED_PRF_PORTAL');
    expect(resolveCanonicalId('SRC_FED_DNIT')).toBe('SRC_FED_DNIT_PORTAL');
    expect(resolveCanonicalId('SRC_FED_ANTT')).toBe('SRC_FED_ANTT_PORTAL');
    expect(resolveCanonicalId('SRC_FED_INMETRO')).toBe('SRC_FED_INMETRO_RADARES');
  });

  it('resolveCanonicalId mapeia IDs estaduais legados para o canônico', () => {
    expect(resolveCanonicalId('SRC_AC_DETRAN_AC')).toBe('SRC_DETRAN_AC');
    expect(resolveCanonicalId('SRC_AM_DETRAN_AM')).toBe('SRC_DETRAN_AM');
    expect(resolveCanonicalId('SRC_SP_DETRAN_SP')).toBe('SRC_DETRAN_SP');
    expect(resolveCanonicalId('SRC_SP_CETRAN_SP')).toBe('SRC_CETRAN_SP');
    expect(resolveCanonicalId('SRC_CE_CETRAN_CE')).toBe('SRC_CETRAN_CE');
  });

  it('resolveCanonicalId retorna null para ID não registrado', () => {
    expect(resolveCanonicalId('')).toBeNull();
    expect(resolveCanonicalId('ID_INEXISTENTE')).toBeNull();
    expect(resolveCanonicalId('SRC_FAKE_SOURCE')).toBeNull();
  });

  it('não associa fontes diferentes apenas por pertencerem ao mesmo órgão', () => {
    // DETRAN-AC e CETRAN-AC são órgãos distintos com canônicos distintos
    expect(resolveCanonicalId('SRC_AC_DETRAN_AC')).toBe('SRC_DETRAN_AC');
    // CETRAN-AC não tem legacy mapeado para DETRAN-AC (não confundir órgãos)
    expect(getLegacyIds('SRC_DETRAN_AC')).not.toContain('SRC_AC_CETRAN_AC');
  });

  it('getLegacyIds retorna os IDs legados associados ao canônico', () => {
    expect(getLegacyIds('SRC_FED_PLANALTO_CTB')).toContain('SRC_FED_CTB');
    expect(getLegacyIds('SRC_FED_PLANALTO_CTB')).toContain('src_ctb_planalto');
    expect(getLegacyIds('SRC_FED_CONTRAN_RESOLUCOES')).toContain('SRC_FED_CONTRAN');
    expect(getLegacyIds('SRC_FED_DOU')).toEqual([]); // sem legados registrados
  });

  it('getAllCanonicalIds retorna apenas IDs presentes no catálogo de monitoramento', () => {
    const canonicalIds = getAllCanonicalIds();
    expect(canonicalIds.length).toBeGreaterThan(0);
    for (const id of canonicalIds) {
      expect(OFFICIAL_SOURCES_REGISTRY.some((s) => s.id === id)).toBe(true);
    }
  });

  it('isRegisteredSourceId reconhece IDs legados e canônicos', () => {
    expect(isRegisteredSourceId('SRC_FED_PLANALTO_CTB')).toBe(true);
    expect(isRegisteredSourceId('SRC_FED_CTB')).toBe(true);
    expect(isRegisteredSourceId('src_ctb_planalto')).toBe(true);
    expect(isRegisteredSourceId('ID_FAKED')).toBe(false);
  });

  it('findOrphanedIds detecta IDs sem mapeamento canônico', () => {
    const orphans = findOrphanedIds([
      'SRC_FED_PLANALTO_CTB', // canônico -> não órfão
      'SRC_FED_CTB', // legado -> não órfão
      'ID_FAKED_1', // órfão
      'ID_FAKED_2', // órfão
    ]);
    expect(orphans).toEqual(['ID_FAKED_1', 'ID_FAKED_2']);
  });

  it('não há IDs canônicos duplicados no registro de aliases', () => {
    const canonicalIds = SOURCE_ALIAS_REGISTRY.map((a) => a.canonicalId);
    const uniqueIds = new Set(canonicalIds);
    expect(uniqueIds.size).toBe(canonicalIds.length);
  });

  it('nenhum ID legado aparece sob dois canônicos diferentes (sem ambiguidade)', () => {
    const legacyToCanonical = new Map<string, string>();
    let ambiguous = false;

    for (const alias of SOURCE_ALIAS_REGISTRY) {
      for (const legacy of alias.legacyIds) {
        if (legacyToCanonical.has(legacy) && legacyToCanonical.get(legacy) !== alias.canonicalId) {
          ambiguous = true;
        }
        legacyToCanonical.set(legacy, alias.canonicalId);
      }
    }

    expect(ambiguous).toBe(false);
  });
});
