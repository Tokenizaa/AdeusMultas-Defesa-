/**
 * catalog-integrity — todo CommercialServiceType ↔ ProcedureType ↔
 * PROCEDURES_CATALOG ↔ TEMPLATES_CATALOG devem ser consistentes.
 *
 * Testes VERMELHOS = evidência P0-3/P0-4 (bloqueiam merge até correção).
 */
import { describe, it, expect } from 'vitest';
import { PROCEDURES_CATALOG } from '../../src/core/procedures/procedures-catalog';
import { TEMPLATES_CATALOG } from '../../src/core/templates/templates-catalog';
import { normalizeServiceType } from '../../src/server/commercial/offers/offer-service';

const PROCEDURE_TYPES = [
  'recurso_jari', 'recurso_cetran', 'conversao_advertencia', 'indicacao_condutor',
  'suspensao_cnh', 'cassacao_cnh', 'processo_suspensao', 'processo_cassacao',
  'defesa_previa', 'analise_tecnica', 'relatorio_pericial',
] as const;

const COMMERCIAL_SERVICE_TYPES = [
  'recurso_jari', 'recurso_cetran', 'suspensao', 'cassacao',
  'indicacao_condutor', 'conversao_advertencia', 'suspensao_cnh',
  'cassacao_cnh', 'processo_suspensao', 'processo_cassacao',
] as const;

const NORMALIZATION_EXPECTED: Record<string, string> = {
  recurso_jari: 'recurso_jari',
  recurso_cetran: 'recurso_cetran',
  suspensao: 'suspensao',
  cassacao: 'cassacao',
  indicacao_condutor: 'indicacao_condutor',
  conversao_advertencia: 'conversao_advertencia',
  suspensao_cnh: 'suspensao',
  cassacao_cnh: 'cassacao',
  processo_suspensao: 'suspensao',
  processo_cassacao: 'cassacao',
  defesa_previa: 'defesa_previa',
  analise_tecnica: 'analise_tecnica',
  relatorio_pericial: 'relatorio_pericial',
};

describe('catalog-integrity: ProcedureType ↔ PROCEDURES_CATALOG', () => {
  it('100% ProcedureType cobertos pelo catálogo de procedimentos', () => {
    const catalogIds = new Set(PROCEDURES_CATALOG.map((p) => p.id));
    const missing = PROCEDURE_TYPES.filter((pt) => !catalogIds.has(pt));
    // 🔴 P0-3: processo_suspensao e processo_cassacao estão AUSENTES do catálogo
    expect(missing).toEqual([]);
  });

  it('catálogo não contém ids órfãos', () => {
    const catalogIds = new Set(PROCEDURES_CATALOG.map((p) => p.id));
    const orphan = [...catalogIds].filter((id) => !(PROCEDURE_TYPES as readonly string[]).includes(id));
    expect(orphan).toEqual([]);
  });
});

describe('catalog-integrity: ProcedureType ↔ TEMPLATES_CATALOG', () => {
  it('todo template referencia procedimento do catálogo', () => {
    const catalogIds = new Set(PROCEDURES_CATALOG.map((p) => p.id));
    for (const t of TEMPLATES_CATALOG) {
      expect(catalogIds.has(t.procedureType), `template ${t.id} → procedure ${t.procedureType}`).toBe(true);
    }
  });

  it('100% ProcedureType de DEFESA/DOCUMENTO têm template próprio (sem cair em [0])', () => {
    const templated = new Set(TEMPLATES_CATALOG.map((t) => t.procedureType));
    const untemplated = PROCEDURE_TYPES.filter(
      (pt) => !templated.has(pt) && pt !== 'analise_tecnica' && pt !== 'relatorio_pericial',
    );
    // 🔴 P0-4: suspensao_cnh e cassacao_cnh não têm template → assembly cai em TPL_RECURSO_JARI
    expect(untemplated).toEqual([]);
  });
});

describe('catalog-integrity: CommercialServiceType ↔ normalização', () => {
  it('todo CommercialServiceType normaliza semanticamente', () => {
    for (const c of COMMERCIAL_SERVICE_TYPES) {
      const norm = normalizeServiceType(c);
      expect(norm, `tipo comercial ${c} normalizou para ${norm}`).toBe(NORMALIZATION_EXPECTED[c]);
    }
  });

  it('normalização nunca devolve vazio', () => {
    expect(normalizeServiceType('')).toBe('');
    expect(normalizeServiceType(undefined as any)).toBe('');
  });

  it('todo valor normalizado é serviço comercial válido ou bloqueado explicitamente', () => {
    const valid = new Set(Object.values(NORMALIZATION_EXPECTED));
    for (const p of PROCEDURE_TYPES) {
      const norm = normalizeServiceType(p);
      expect(valid.has(norm), `ProcedureType ${p} normalizou p/ ${norm} (fora do domínio)`).toBe(true);
    }
  });

  it('defesa_previa NÃO é mascarado como recurso_jari', () => {
    expect(normalizeServiceType('defesa_previa')).toBe('defesa_previa');
  });

  it('defesa_previa NÃO é um CommercialServiceType com oferta', () => {
    // defesa_previa não está na lista de CommercialServiceType — não tem preço
    expect(COMMERCIAL_SERVICE_TYPES).not.toContain('defesa_previa');
  });
});