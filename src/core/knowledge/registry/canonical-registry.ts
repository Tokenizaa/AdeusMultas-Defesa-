/**
 * @file canonical-registry.ts
 * DefesaAI — Canonical Knowledge Registry (Single Source of Truth)
 *
 * Centraliza e governa todas as entidades canônicas do sistema:
 * - 27 Unidades Federativas (26 Estados + DF)
 * - Órgãos de Trânsito (DETRANs, PRF, DNIT, CONTRAN, SENATRAN, etc.)
 * - CETRANs e CONTRANDIFE
 * - Procedimentos Administrativos (Defesa Prévia, JARI, CETRAN, etc.)
 * - Fontes Oficiais de Monitoramento (Tiers 1 a 5)
 * - Teses e Argumentos Jurídicos Especializados
 * - Catálogo de Infrações e Artigos do CTB
 * - Modelos e Blocos de Petição
 *
 * Garante estrito isolamento geográfico (zero fallbacks incorretos),
 * resolução temporal por vigência (validFrom / validUntil) e detecção
 * formal de KNOWLEDGE_GAP para dados não catalogados.
 */

import {
  KnowledgeOrgan,
  KnowledgeCetran,
  KnowledgeState,
  KnowledgeSource,
  SourceTier,
  TemporalQueryContext,
  EffectiveKnowledgeResult,
} from '../types';
import {
  NATIONAL_STATES_DB,
  NATIONAL_ORGANS_DB,
  NATIONAL_CETRANS_DB,
  getNationalOrganByAbbreviation,
  getNationalOrganById,
  getNationalOrganByState,
  getCetranByState,
  resolveNationalProtocol,
} from '../national-registry';
import { OFFICIAL_SOURCES_REGISTRY } from '../sources-registry';
import { TemporalKnowledgeEngine } from '../temporal-engine';
import { PROCEDURES_CATALOG } from '../../procedures/procedures-catalog';
import { ARGUMENTS_CATALOG } from '../../arguments/arguments-catalog';
import { INFRACTION_CATALOG } from '../../../data/knowledge-base';
import { CTB_ARTICLES_DB } from '../../legal-base/ctb-articles';
import { RESOLUTIONS_DB } from '../../legal-base/resolutions';
import { TEMPLATES_CATALOG } from '../../templates/templates-catalog';
import { DOCUMENT_BLOCKS, DocumentBlockModel } from '../../templates/document-blocks';
import {
  ProcedureModel,
  ArgumentModel,
  CtbArticleModel,
  ResolutionModel,
  DocumentTemplateModel,
} from '../../domain/knowledge-schema';
import { ProcedureType, SubmissionInstructions } from '../../../types';

export interface KnowledgeCoverageStatus {
  isCovered: boolean;
  isKnowledgeGap: boolean;
  code: 'CANONICAL_COVERAGE' | 'KNOWLEDGE_GAP';
  entity: string;
  uf?: string;
  message: string;
  organ?: KnowledgeOrgan | null;
  state?: KnowledgeState | null;
}

export class CanonicalKnowledgeRegistry {
  // ==========================================
  // 1. ESTADOS E UNIDADES FEDERATIVAS (27 UFs)
  // ==========================================

  /**
   * Retorna a lista de todos os 27 Estados brasileiros (26 Estados + DF).
   */
  public static getAllStates(): KnowledgeState[] {
    return Object.values(NATIONAL_STATES_DB);
  }

  /**
   * Busca um Estado específico por sua sigla (UF). Retorna null se não existir.
   */
  public static getState(uf: string): KnowledgeState | null {
    if (!uf) return null;
    const clean = uf.trim().toUpperCase();
    return NATIONAL_STATES_DB[clean] || null;
  }

  /**
   * Verifica se a UF informada é uma das 27 UFs canônicas do Brasil.
   */
  public static hasState(uf: string): boolean {
    if (!uf) return false;
    return !!NATIONAL_STATES_DB[uf.trim().toUpperCase()];
  }

  // ==========================================
  // 2. ÓRGÃOS DE TRÂNSITO E COMPETÊNCIAS
  // ==========================================

  /**
   * Retorna todos os órgãos cadastrados no catálogo canônico nacional.
   */
  public static getAllOrgans(): KnowledgeOrgan[] {
    return NATIONAL_ORGANS_DB;
  }

  /**
   * Busca um órgão por sigla, id ou código, opcionalmente respeitando a vigência temporal.
   */
  public static getOrgan(identifier: string, referenceDate?: string): KnowledgeOrgan | null {
    if (!identifier) return null;
    if (referenceDate) {
      return TemporalKnowledgeEngine.findOrganValidAtDate(identifier, referenceDate);
    }
    return getNationalOrganByAbbreviation(identifier) || getNationalOrganById(identifier);
  }

  /**
   * Retorna o DETRAN oficial de determinado Estado (UF).
   */
  public static getDetranByState(uf: string, referenceDate?: string): KnowledgeOrgan | null {
    if (!uf) return null;
    if (referenceDate) {
      return TemporalKnowledgeEngine.findOrganByStateValidAtDate(uf.trim().toUpperCase(), referenceDate);
    }
    return getNationalOrganByState(uf);
  }

  /**
   * Retorna todos os órgãos pertencentes a determinado Estado ou esfera.
   */
  public static getOrgansByState(uf: string): KnowledgeOrgan[] {
    if (!uf) return [];
    const clean = uf.trim().toUpperCase();
    return NATIONAL_ORGANS_DB.filter((o) => o.state === clean);
  }

  // ==========================================
  // 3. CONSELHOS ESTADUAIS DE TRÂNSITO (CETRANs)
  // ==========================================

  /**
   * Retorna todos os CETRANs e CONTRANDIFE.
   */
  public static getAllCetrans(): KnowledgeCetran[] {
    return NATIONAL_CETRANS_DB;
  }

  /**
   * Busca o CETRAN ou CONTRANDIFE correspondente à UF.
   */
  public static getCetranByState(uf: string, referenceDate?: string): KnowledgeCetran | null {
    if (!uf) return null;
    if (referenceDate) {
      return TemporalKnowledgeEngine.findCetranValidAtDate(uf.trim().toUpperCase(), referenceDate);
    }
    return getCetranByState(uf);
  }

  // ==========================================
  // 4. PROCEDIMENTOS ADMINISTRATIVOS
  // ==========================================

  /**
   * Retorna todos os procedimentos administrativos suportados.
   */
  public static getAllProcedures(): ProcedureModel[] {
    return PROCEDURES_CATALOG;
  }

  /**
   * Busca um procedimento específico por seu identificador.
   */
  public static getProcedure(id: ProcedureType | string): ProcedureModel | null {
    if (!id) return null;
    return PROCEDURES_CATALOG.find((p) => p.id === id || p.code === id) || null;
  }

  // ==========================================
  // 5. FONTES OFICIAIS DE MONITORAMENTO
  // ==========================================

  /**
   * Retorna todas as fontes oficiais registradas.
   */
  public static getAllSources(): KnowledgeSource[] {
    return OFFICIAL_SOURCES_REGISTRY;
  }

  /**
   * Filtra fontes oficiais por Tier, UF, categoria ou status.
   */
  public static getSources(filter?: {
    tier?: SourceTier;
    uf?: string;
    category?: string;
    isActive?: boolean;
  }): KnowledgeSource[] {
    let result = OFFICIAL_SOURCES_REGISTRY;

    if (filter) {
      if (filter.tier) {
        result = result.filter((s) => s.tier === filter.tier);
      }
      if (filter.uf) {
        const ufClean = filter.uf.trim().toUpperCase();
        result = result.filter((s) => s.uf === ufClean || s.uf === 'FEDERAL');
      }
      if (filter.category) {
        result = result.filter((s) => s.category === filter.category);
      }
      if (filter.isActive !== undefined) {
        result = result.filter((s) => s.isActive === filter.isActive);
      }
    }

    return result;
  }

  /**
   * Retorna apenas as fontes oficiais primárias e regulatórias (Tiers 1, 2 e 3).
   */
  public static getTier1To3Sources(uf?: string): KnowledgeSource[] {
    const validTiers: SourceTier[] = [
      'TIER_1_GOV_PRIMARY',
      'TIER_2_OFFICIAL_GAZETTE',
      'TIER_3_JUDICIAL_TRIBUNAL',
    ];

    let list = OFFICIAL_SOURCES_REGISTRY.filter((s) => validTiers.includes(s.tier));
    if (uf) {
      const ufClean = uf.trim().toUpperCase();
      list = list.filter((s) => s.uf === ufClean || s.uf === 'FEDERAL');
    }
    return list;
  }

  // ==========================================
  // 6. TESES E ARGUMENTOS JURÍDICOS
  // ==========================================

  /**
   * Retorna o catálogo completo de argumentos e teses jurídicas.
   */
  public static getAllArguments(): ArgumentModel[] {
    return ARGUMENTS_CATALOG;
  }

  /**
   * Busca uma tese ou argumento pelo ID (ex: 'ARG-001', 'ARG-048').
   */
  public static getArgument(id: string): ArgumentModel | null {
    if (!id) return null;
    return ARGUMENTS_CATALOG.find((a) => a.id === id || a.code === id) || null;
  }

  // ==========================================
  // 7. INFRAÇÕES E LEGISLAÇÃO
  // ==========================================

  /**
   * Retorna o catálogo de infrações de trânsito.
   */
  public static getAllInfractions() {
    return INFRACTION_CATALOG;
  }

  /**
   * Busca uma infração de trânsito pelo código (ex: '745-50', '516-91').
   */
  public static getInfraction(code: string) {
    if (!code) return null;
    const clean = code.trim();
    return (
      INFRACTION_CATALOG.find(
        (i) => i.code === clean || i.code.replace('-', '') === clean.replace('-', '')
      ) || null
    );
  }

  /**
   * Retorna todos os artigos do CTB catalogados.
   */
  public static getAllArticles(): CtbArticleModel[] {
    return CTB_ARTICLES_DB;
  }

  /**
   * Retorna todas as resoluções do CONTRAN/SENATRAN catalogadas.
   */
  public static getAllResolutions(): ResolutionModel[] {
    return RESOLUTIONS_DB;
  }

  // ==========================================
  // 8. TEMPLATES E BLOCOS DE PETIÇÃO
  // ==========================================

  /**
   * Retorna todos os modelos de peças jurídicas.
   */
  public static getAllTemplates(): DocumentTemplateModel[] {
    return TEMPLATES_CATALOG;
  }

  /**
   * Retorna todos os blocos modulares de petição.
   */
  public static getAllDocumentBlocks(): DocumentBlockModel[] {
    return DOCUMENT_BLOCKS;
  }

  // ==========================================
  // 9. RESOLUÇÃO DE PROTOCOLO E TEMPORALIDADE
  // ==========================================

  /**
   * Resolve instruções de submissão e protocolo para qualquer autoridade de trânsito.
   * Não realiza fallbacks indevidos para outros Estados.
   */
  public static resolveProtocolInfo(
    autuadorAbbreviationOrCode: string,
    referenceDate?: string
  ): SubmissionInstructions | null {
    if (!autuadorAbbreviationOrCode) return null;
    return resolveNationalProtocol(autuadorAbbreviationOrCode, referenceDate);
  }

  /**
   * Resolve o conhecimento efetivo aplicando as regras de temporalidade vigentes na data do fato.
   */
  public static resolveEffectiveKnowledge(ctx: TemporalQueryContext): EffectiveKnowledgeResult {
    return TemporalKnowledgeEngine.getEffectiveKnowledge(ctx);
  }

  // ==========================================
  // 10. DETECÇÃO DE KNOWLEDGE GAP (ISOLAMENTO SEGURO)
  // ==========================================

  /**
   * Avalia se determinado órgão ou Estado possui cobertura canônica válida ou se constitui uma lacuna (KNOWLEDGE_GAP).
   * Garante que o sistema nunca invente dados fictícios para órgãos desconhecidos.
   */
  public static getKnowledgeStatus(identifier: string): KnowledgeCoverageStatus {
    if (!identifier || !identifier.trim()) {
      return {
        isCovered: false,
        isKnowledgeGap: true,
        code: 'KNOWLEDGE_GAP',
        entity: identifier || 'DESCONHECIDO',
        message: 'Identificador de órgão ou UF vazio ou nulo.',
      };
    }

    const clean = identifier.trim().toUpperCase();

    // 1. Verifica se é uma UF
    if (NATIONAL_STATES_DB[clean]) {
      return {
        isCovered: true,
        isKnowledgeGap: false,
        code: 'CANONICAL_COVERAGE',
        entity: clean,
        uf: clean,
        state: NATIONAL_STATES_DB[clean],
        message: `Estado ${NATIONAL_STATES_DB[clean].name} (${clean}) possui cobertura canônica completa nas 27 UFs.`,
      };
    }

    // 2. Verifica se é um órgão canônico
    const organ = getNationalOrganByAbbreviation(clean) || getNationalOrganById(clean);
    if (organ) {
      return {
        isCovered: true,
        isKnowledgeGap: false,
        code: 'CANONICAL_COVERAGE',
        entity: organ.abbreviation,
        uf: organ.state,
        organ,
        message: `Órgão ${organ.name} (${organ.abbreviation}) registrado com procedimentos e portal canônico.`,
      };
    }

    // 3. Órgão ou UF desconhecido = KNOWLEDGE_GAP explícito (FAIL CLOSED)
    return {
      isCovered: false,
      isKnowledgeGap: true,
      code: 'KNOWLEDGE_GAP',
      entity: identifier,
      message: `[KNOWLEDGE_GAP] A entidade '${identifier}' não consta no Catálogo Canônico Nacional. Nenhuma informação fictícia ou fallback será gerado.`,
      organ: null,
      state: null,
    };
  }
}
