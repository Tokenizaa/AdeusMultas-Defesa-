/**
 * @file source-alias-registry.ts
 * Registro de aliases de fontes oficiais.
 *
 * Mapeia IDs legados dos quatro sistemas de fontes identificados no
 * relatório de reconciliação para o ID canônico usado no catálogo de
 * monitoramento (OFFICIAL_SOURCES_REGISTRY).
 *
 * Sistemas mapeados:
 * 1. OFFICIAL_SOURCES_REGISTRY (src/core/knowledge/sources-registry.ts) — canônico
 * 2. knowledge/sources/sources.json — seed de KB
 * 3. FASE-9-RECONCILIACAO-DETERMINISTICA.sql — recovery SQL Fase 9
 * 4. KNOWLEDGE_SOURCES (src/knowledge/index.ts) — catálogo estático do índice
 *
 * Preserva os IDs legados para compatibilidade e registra a correspondência
 * entre IDs antigos e canônicos, sem associar fontes diferentes apenas por
 * pertencerem ao mesmo órgão.
 */

export interface SourceAlias {
  /** ID canônico (OFFICIAL_SOURCES_REGISTRY) — fonte da verdade para monitoramento. */
  canonicalId: string;
  /** IDs legados de outros sistemas que se referem à mesma fonte. */
  legacyIds: string[];
  /** Nome da fonte para verificação humana. */
  name: string;
}

export const SOURCE_ALIAS_REGISTRY: SourceAlias[] = [
  // =========================================================================
  // FEDERAL — fontes prioritárias identificadas na reconciliação
  // =========================================================================
  {
    canonicalId: 'SRC_FED_PLANALTO_CTB',
    legacyIds: ['SRC_FED_CTB', 'SRC_FED_PLANALTO', 'src_ctb_planalto'],
    name: 'Código de Trânsito Brasileiro (Lei 9.503/1997)',
  },
  {
    canonicalId: 'SRC_FED_CONTRAN_RESOLUCOES',
    legacyIds: ['SRC_FED_CONTRAN', 'src_contran_gov'],
    name: 'Resoluções do Conselho Nacional de Trânsito (CONTRAN)',
  },
  {
    canonicalId: 'SRC_FED_STJ_JURISPRUDENCIA',
    legacyIds: ['SRC_FED_STJ'],
    name: 'Jurisprudência do Superior Tribunal de Justiça (STJ)',
  },
  {
    canonicalId: 'SRC_FED_SENATRAN_PORTAL',
    legacyIds: ['SRC_FED_SENATRAN'],
    name: 'Secretaria Nacional de Trânsito (SENATRAN)',
  },
  {
    canonicalId: 'SRC_FED_PRF_PORTAL',
    legacyIds: ['SRC_FED_PRF'],
    name: 'Polícia Rodoviária Federal (PRF)',
  },
  {
    canonicalId: 'SRC_FED_DNIT_PORTAL',
    legacyIds: ['SRC_FED_DNIT'],
    name: 'Departamento Nacional de Infraestrutura de Transportes (DNIT)',
  },
  {
    canonicalId: 'SRC_FED_ANTT_PORTAL',
    legacyIds: ['SRC_FED_ANTT'],
    name: 'Agência Nacional de Transportes Terrestres (ANTT)',
  },
  {
    canonicalId: 'SRC_FED_INMETRO_RADARES',
    legacyIds: ['SRC_FED_INMETRO', 'src_inmetro_psi'],
    name: 'INMETRO - Consulta de Radares e Cronotacógrafos',
  },
  {
    canonicalId: 'SRC_FED_DOU',
    legacyIds: [],
    name: 'Diário Oficial da União (Imprensa Nacional)',
  },

  // =========================================================================
  // ESTADUAIS — DETRANs e CETRANs das 27 UFs (aliases por abreviação de UF)
  // =========================================================================
  {
    canonicalId: 'SRC_DETRAN_AC',
    legacyIds: ['SRC_AC_DETRAN_AC'],
    name: 'DETRAN-Acre',
  },
  {
    canonicalId: 'SRC_CETRAN_AC',
    legacyIds: [],
    name: 'CETRAN-Acre',
  },
  {
    canonicalId: 'SRC_DETRAN_AL',
    legacyIds: [],
    name: 'DETRAN-Alagoas',
  },
  {
    canonicalId: 'SRC_CETRAN_AL',
    legacyIds: ['SRC_AL_CETRAN_AL'],
    name: 'CETRAN-Alagoas',
  },
  {
    canonicalId: 'SRC_DETRAN_AP',
    legacyIds: ['SRC_AP_DETRAN_AP'],
    name: 'DETRAN-Amapá',
  },
  {
    canonicalId: 'SRC_CETRAN_AP',
    legacyIds: [],
    name: 'CETRAN-Amapá',
  },
  {
    canonicalId: 'SRC_DETRAN_AM',
    legacyIds: ['SRC_AM_DETRAN_AM'],
    name: 'DETRAN-Amazonas',
  },
  {
    canonicalId: 'SRC_CETRAN_AM',
    legacyIds: ['SRC_CETRAN_AM'],
    name: 'CETRAN-Amazonas',
  },
  {
    canonicalId: 'SRC_DETRAN_BA',
    legacyIds: [],
    name: 'DETRAN-Bahia',
  },
  {
    canonicalId: 'SRC_CETRAN_BA',
    legacyIds: ['SRC_CETRAN_BA'],
    name: 'CETRAN-Bahia',
  },
  {
    canonicalId: 'SRC_DETRAN_CE',
    legacyIds: ['SRC_CE_DETRAN_CE'],
    name: 'DETRAN-Ceará',
  },
  {
    canonicalId: 'SRC_CETRAN_CE',
    legacyIds: ['SRC_CE_CETRAN_CE'],
    name: 'CETRAN-Ceará',
  },
  {
    canonicalId: 'SRC_DETRAN_DF',
    legacyIds: [],
    name: 'DETRAN-Distrito Federal',
  },
  {
    canonicalId: 'SRC_CONTRANDIFE_DF',
    legacyIds: [],
    name: 'CONTRANDIFE-Distrito Federal',
  },
  {
    canonicalId: 'SRC_DETRAN_ES',
    legacyIds: ['SRC_ES_DETRAN_ES'],
    name: 'DETRAN-Espírito Santo',
  },
  {
    canonicalId: 'SRC_CETRAN_ES',
    legacyIds: ['SRC_ES_CETRAN_ES'],
    name: 'CETRAN-Espírito Santo',
  },
  {
    canonicalId: 'SRC_DETRAN_GO',
    legacyIds: ['SRC_GO_DETRAN_GO'],
    name: 'DETRAN-Goiás',
  },
  {
    canonicalId: 'SRC_CETRAN_GO',
    legacyIds: ['SRC_GO_CETRAN_GO'],
    name: 'CETRAN-Goiás',
  },
  {
    canonicalId: 'SRC_DETRAN_MA',
    legacyIds: [],
    name: 'DETRAN-Maranhão',
  },
  {
    canonicalId: 'SRC_CETRAN_MA',
    legacyIds: [],
    name: 'CETRAN-Maranhão',
  },
  {
    canonicalId: 'SRC_DETRAN_MG',
    legacyIds: ['SRC_MG_DETRAN_MG'],
    name: 'DETRAN-Minas Gerais',
  },
  {
    canonicalId: 'SRC_CETRAN_MG',
    legacyIds: ['SRC_CETRAN_MG'],
    name: 'CETRAN-Minas Gerais',
  },
  {
    canonicalId: 'SRC_DETRAN_MS',
    legacyIds: ['SRC_MS_DETRAN_MS'],
    name: 'DETRAN-Mato Grosso do Sul',
  },
  {
    canonicalId: 'SRC_CETRAN_MS',
    legacyIds: ['SRC_MS_CETRAN_MS'],
    name: 'CETRAN-Mato Grosso do Sul',
  },
  {
    canonicalId: 'SRC_DETRAN_MT',
    legacyIds: ['SRC_DETRAN_MT'],
    name: 'DETRAN-Mato Grosso',
  },
  {
    canonicalId: 'SRC_CETRAN_MT',
    legacyIds: ['SRC_CETRAN_MT'],
    name: 'CETRAN-Mato Grosso',
  },
  {
    canonicalId: 'SRC_DETRAN_PA',
    legacyIds: ['SRC_PA_DETRAN_PA'],
    name: 'DETRAN-Pará',
  },
  {
    canonicalId: 'SRC_CETRAN_PA',
    legacyIds: [],
    name: 'CETRAN-Pará',
  },
  {
    canonicalId: 'SRC_DETRAN_PB',
    legacyIds: ['SRC_PB_DETRAN_PB'],
    name: 'DETRAN-Paraíba',
  },
  {
    canonicalId: 'SRC_CETRAN_PB',
    legacyIds: ['SRC_PB_CETRAN_PB'],
    name: 'CETRAN-Paraíba',
  },
  {
    canonicalId: 'SRC_DETRAN_PE',
    legacyIds: [],
    name: 'DETRAN-Pernambuco',
  },
  {
    canonicalId: 'SRC_CETRAN_PE',
    legacyIds: ['SRC_CETRAN_PE'],
    name: 'CETRAN-Pernambuco',
  },
  {
    canonicalId: 'SRC_DETRAN_PI',
    legacyIds: ['SRC_PI_DETRAN_PI'],
    name: 'DETRAN-Piauí',
  },
  {
    canonicalId: 'SRC_CETRAN_PI',
    legacyIds: ['SRC_PI_CETRAN_PI'],
    name: 'CETRAN-Piauí',
  },
  {
    canonicalId: 'SRC_DETRAN_PR',
    legacyIds: ['SRC_PR_DETRAN_PR'],
    name: 'DETRAN-Paraná',
  },
  {
    canonicalId: 'SRC_CETRAN_PR',
    legacyIds: ['SRC_PR_CETRAN_PR'],
    name: 'CETRAN-Paraná',
  },
  {
    canonicalId: 'SRC_DETRAN_RJ',
    legacyIds: ['SRC_RJ_DETRAN_RJ'],
    name: 'DETRAN-Rio de Janeiro',
  },
  {
    canonicalId: 'SRC_CETRAN_RJ',
    legacyIds: ['SRC_RJ_CETRAN_RJ'],
    name: 'CETRAN-Rio de Janeiro',
  },
  {
    canonicalId: 'SRC_DETRAN_RN',
    legacyIds: [],
    name: 'DETRAN-Rio Grande do Norte',
  },
  {
    canonicalId: 'SRC_CETRAN_RN',
    legacyIds: ['SRC_CETRAN_RN'],
    name: 'CETRAN-Rio Grande do Norte',
  },
  {
    canonicalId: 'SRC_DETRAN_RO',
    legacyIds: [],
    name: 'DETRAN-Rondônia',
  },
  {
    canonicalId: 'SRC_CETRAN_RO',
    legacyIds: ['SRC_CETRAN_RO'],
    name: 'CETRAN-Rondônia',
  },
  {
    canonicalId: 'SRC_DETRAN_RS',
    legacyIds: ['SRC_RS_DETRAN_RS'],
    name: 'DETRAN-Rio Grande do Sul',
  },
  {
    canonicalId: 'SRC_CETRAN_RS',
    legacyIds: ['SRC_RS_CETRAN_RS'],
    name: 'CETRAN-Rio Grande do Sul',
  },
  {
    canonicalId: 'SRC_DETRAN_SC',
    legacyIds: ['SRC_SC_DETRAN_SC'],
    name: 'DETRAN-Santa Catarina',
  },
  {
    canonicalId: 'SRC_CETRAN_SC',
    legacyIds: ['SRC_SC_CETRAN_SC'],
    name: 'CETRAN-Santa Catarina',
  },
  {
    canonicalId: 'SRC_DETRAN_SE',
    legacyIds: [],
    name: 'DETRAN-Sergipe',
  },
  {
    canonicalId: 'SRC_CETRAN_SE',
    legacyIds: ['SRC_CETRAN_SE'],
    name: 'CETRAN-Sergipe',
  },
  {
    canonicalId: 'SRC_DETRAN_SP',
    legacyIds: ['SRC_SP_DETRAN_SP'],
    name: 'DETRAN-São Paulo',
  },
  {
    canonicalId: 'SRC_CETRAN_SP',
    legacyIds: ['SRC_SP_CETRAN_SP'],
    name: 'CETRAN-São Paulo',
  },
  {
    canonicalId: 'SRC_DETRAN_TO',
    legacyIds: ['SRC_TO_DETRAN_TO'],
    name: 'DETRAN-Tocantins',
  },
  {
    canonicalId: 'SRC_CETRAN_TO',
    legacyIds: ['SRC_CETRAN_TO'],
    name: 'CETRAN-Tocantins',
  },
];

/**
 * Resolve o ID canônico a partir de um ID legado. Retorna o próprio ID se
 * já for canônico, ou null se não houver mapeamento.
 */
export function resolveCanonicalId(legacyId: string): string | null {
  if (!legacyId) return null;
  const alias = SOURCE_ALIAS_REGISTRY.find(
    (a) => a.canonicalId === legacyId || a.legacyIds.includes(legacyId),
  );
  return alias ? alias.canonicalId : null;
}

/**
 * Retorna os IDs legados associados a um ID canônico.
 */
export function getLegacyIds(canonicalId: string): string[] {
  const alias = SOURCE_ALIAS_REGISTRY.find((a) => a.canonicalId === canonicalId);
  return alias ? [...alias.legacyIds] : [];
}

/**
 * Retorna todos os IDs canônicos registrados.
 */
export function getAllCanonicalIds(): string[] {
  return SOURCE_ALIAS_REGISTRY.map((a) => a.canonicalId);
}

/**
 * Verifica se um ID (legado ou canônico) está registrado no mapeamento.
 */
export function isRegisteredSourceId(id: string): boolean {
  return Boolean(resolveCanonicalId(id));
}

/**
 * Detecta IDs órfãos: IDs presentes em uma lista que não possuem mapeamento
 * canônico. Útil para auditoria de referências quebradas.
 */
export function findOrphanedIds(ids: string[]): string[] {
  return ids.filter((id) => !isRegisteredSourceId(id));
}
