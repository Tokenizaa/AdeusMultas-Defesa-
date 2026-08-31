/**
 * @file integrity-validator.ts
 * DefesaAI — Validador de Integridade (Fase 5)
 *
 * Valida que a Análise (CaseAnalysis) e a Minuta (DefenseDraft) produzidos pelo
 * pipeline determinístico sejam internamente consistentes e fielmente ancorados
 * no conhecimento canônico (ARGUMENTS_CATALOG, PROCEDURES_CATALOG, DOCUMENT_BLOCKS).
 *
 * Princípios (Fase 5):
 *  - NUNCA corrige silenciosamente: cada achado vira ISSUE com severity + razão;
 *    a correção é responsabilidade do chamador, com revisão humana quando exigida.
 *  - FAIL CLOSED: dado/teses fora do catálogo => ISSUE com categoria KNOWLEDGE_GAP.
 *  - Não inventa: não valida em favor de conteúdo não verificável.
 */

import { CaseAnalysis, DefenseDraft, LegalArgumentDomain, ProcedureType } from '../../types';
import { ARGUMENTS_CATALOG } from '../arguments/arguments-catalog';
import { PROCEDURES_CATALOG } from '../procedures/procedures-catalog';
import { TEMPLATES_CATALOG } from '../templates/templates-catalog';

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface IntegrityIssue {
  severity: IssueSeverity;
  code: string;
  message: string;
  /** Campo do artefato a que se refere (ex.: analysis.detectedInconsistencies[0]). */
  target: string;
  /** KNOWLEDGE_GAP quando o conteúdo foge ao conhecimento canônico. */
  kind?: 'VALIDATION' | 'KNOWLEDGE_GAP' | 'INCONSISTENCY';
}

export interface IntegrityReport {
  artifact: 'analysis' | 'draft';
  valid: boolean;
  issues: IntegrityIssue[];
}

const PROCEDURE_TYPE_CODES = new Set<string>(
  PROCEDURES_CATALOG.map((p) => p.id)
);

function argumentMeta(id: string) {
  return ARGUMENTS_CATALOG.find((a) => a.id === id);
}

/**
 * Valida uma CaseAnalysis produzida pelo motor de regras.
 */
export function validateAnalysis(analysis: CaseAnalysis): IntegrityReport {
  const issues: IntegrityIssue[] = [];

  // 1. Procedimento recomendado deve existir no catálogo canônico.
  if (!PROCEDURE_TYPE_CODES.has(analysis.recommendedProcedure)) {
    issues.push({
      severity: 'error',
      code: 'PROCEDURE_UNKNOWN',
      target: 'analysis.recommendedProcedure',
      message: `Procedimento "${analysis.recommendedProcedure}" não consta no catálogo canônico. Reconduzir a análise antes de montar documento.`,
      kind: 'KNOWLEDGE_GAP',
    });
  }

  // 2. Theorem/inconsistência reportada deve ter argumento canônico válido.
  for (let i = 0; i < analysis.detectedInconsistencies.length; i++) {
    const inc = analysis.detectedInconsistencies[i];
    if (!inc.legalArgumentId) {
      issues.push({
        severity: 'warning',
        code: 'ARGUMENT_MISSING',
        target: `analysis.detectedInconsistencies[${i}]`,
        message: 'Inconsistência sem legalArgumentId: natureza jurídica indeterminada.',
      });
      continue;
    }
    const arg = argumentMeta(inc.legalArgumentId);
    if (!arg) {
      issues.push({
        severity: 'error',
        code: 'ARGUMENT_FOREIGN',
        target: `analysis.detectedInconsistencies[${i}].legalArgumentId`,
        message: `Tese "${inc.legalArgumentId}" não existe no catálogo canônico de argumentos.`,
        kind: 'KNOWLEDGE_GAP',
      });
    } else if (!arg.legalBase || arg.legalBase.trim() === '') {
      issues.push({
        severity: 'error',
        code: 'ARGUMENT_NO_LEGAL_BASE',
        target: `analysis.detectedInconsistencies[${i}].legalArgumentId`,
        message: `Tese "${inc.legalArgumentId}" sem base legal ancorada.`,
        kind: 'KNOWLEDGE_GAP',
      });
    }
  }

  // 3. Argumentos recomendados devem existir e ter fundamentação.
  analysis.recommendedArguments.forEach((arg: LegalArgumentDomain, i: number) => {
    const meta = argumentMeta(arg.id);
    if (!meta) {
      issues.push({
        severity: 'error',
        code: 'ARGUMENT_FOREIGN',
        target: `analysis.recommendedArguments[${i}].id`,
        message: `Argumento "${arg.id}" recomendado sem correspondência canônica.`,
        kind: 'KNOWLEDGE_GAP',
      });
      return;
    }
    if (!arg.legalBase && !meta.legalBase) {
      issues.push({
        severity: 'error',
        code: 'ARGUMENT_NO_LEGAL_BASE',
        target: `analysis.recommendedArguments[${i}]`,
        message: `Argumento "${arg.id}" sem base legal (nem inline nem canônica).`,
        kind: 'KNOWLEDGE_GAP',
      });
    }
  });

  // 4. Toda inconsistência detectada deve constar nos recommendedArguments
  //    (o pipeline determinístico alimenta a minuta pela lista recomendada).
  const recommendedIds = new Set(analysis.recommendedArguments.map((a) => a.id));
  for (const inc of analysis.detectedInconsistencies) {
    if (inc.legalArgumentId && !recommendedIds.has(inc.legalArgumentId)) {
      issues.push({
        severity: 'warning',
        code: 'ARGUMENT_NOT_RECOMMENDED',
        target: 'analysis.detectedInconsistencies',
        message: `Inconsistência ancorada em "${inc.legalArgumentId}" mas a tese não foi incluída em recommendedArguments; a minuta ficaria sem fundamentação correspondente.`,
        kind: 'INCONSISTENCY',
      });
    }
  }

  // 5. overallSuccessRate deve estar no intervalo [0, 100].
  if (
    typeof analysis.overallSuccessRate !== 'number' ||
    analysis.overallSuccessRate < 0 ||
    analysis.overallSuccessRate > 100
  ) {
    issues.push({
      severity: 'error',
      code: 'SCORE_OUT_OF_RANGE',
      target: 'analysis.overallSuccessRate',
      message: `overallSuccessRate ${analysis.overallSuccessRate} fora do intervalo [0,100].`,
    });
  }

  return report('analysis', issues);
}

/**
 * Valida uma DefenseDraft montada pelo DocumentAssemblyEngine.
 * Verifica apenas consistência estrutural — não reescreve o conteúdo.
 */
export function validateDraft(draft: DefenseDraft & { validation?: unknown }): IntegrityReport {
  const issues: IntegrityIssue[] = [];

  if (!draft.caseId) {
    issues.push({ severity: 'error', code: 'CASE_ID_MISSING', target: 'draft.caseId', message: 'Minuta sem caseId.' });
  }
  if (!draft.aitNumber) {
    issues.push({ severity: 'warning', code: 'AIT_MISSING', target: 'draft.aitNumber', message: 'Minuta sem número do AIT.' });
  }
  if (!draft.fullDraftText || draft.fullDraftText.trim() === '') {
    issues.push({ severity: 'error', code: 'EMPTY_DRAFT', target: 'draft.fullDraftText', message: 'Minuta vazia.' });
  }

  // Procedimento da minuta deve constar no catálogo.
  if (!PROCEDURE_TYPE_CODES.has(draft.procedureType)) {
    issues.push({
      severity: 'error',
      code: 'PROCEDURE_UNKNOWN',
      target: 'draft.procedureType',
      message: `Procedimento "${draft.procedureType}" fora do catálogo canônico.`,
      kind: 'KNOWLEDGE_GAP',
    });
  }

  // Template deve existir para o procedimento (senão o texto não é canônico).
  const tpl = TEMPLATES_CATALOG.find((t) => t.procedureType === draft.procedureType);
  if (!tpl && draft.procedureType !== 'analise_tecnica' && draft.procedureType !== 'relatorio_pericial') {
    issues.push({
      severity: 'warning',
      code: 'TEMPLATE_MISSING',
      target: 'draft.procedureType',
      message: `Sem template canônico para "${draft.procedureType}"; composição não verificável contra bloco padrão.`,
      kind: 'KNOWLEDGE_GAP',
    });
  }

  return report('draft', issues);
}

function report(artifact: 'analysis' | 'draft', issues: IntegrityIssue[]): IntegrityReport {
  const hardErrors = issues.filter((i) => i.severity === 'error');
  return {
    artifact,
    // FAIL CLOSED: só é "valid" se não houver nenhum erro de integridade.
    valid: hardErrors.length === 0,
    issues,
  };
}
