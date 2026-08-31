/**
 * @file document-roll.ts
 * DefesAi — Fonte Única de Verdade para o ROL DE DOCUMENTOS (BLK-068)
 *
 * Gera o rol de documentos anexos à petição E o checklist de anexos da etapa
 * final a partir da MESMA fonte: PROCEDURES_CATALOG.requiredDocuments.
 *
 * Regra de negócio: no rol entram APENAS os documentos marcados como
 * `required: true` — isto é, os exigidos pelos órgãos autuadores (DETRANs,
 * PRF, CET-SP etc.) no ato do protocolo. Documentos facultativos
 * (`required: false`) permanecem fora da peça.
 */

import { PROCEDURES_CATALOG } from '../procedures/procedures-catalog';
import { ARGUMENTS_CATALOG } from '../arguments/arguments-catalog';
import { ProcedureType } from '../../types';

export interface DocumentRollItem {
  /** Chave estável para checkboxes do checklist de anexos (etapa 4). */
  id: string;
  /** Nome do documento conforme catálogo normativo do procedimento. */
  label: string;
  /** Descrição/explicação do porquê o documento é exigido. */
  hint?: string;
}

/**
 * Aliases legados: slugs comerciais antigos (usados no checkout/preços)
 * mapeados para o procedimento administrativo equivalente.
 * `recurso_multa` (Recurso de Multa) = recurso administrativo de 1ª instância = JARI.
 */
const LEGACY_PROCEDURE_ALIASES: Record<string, string> = {
  recurso_multa: 'recurso_jari',
};

/** Normaliza um identificador de procedimento (aceita aliases legados). */
export function normalizeProcedureId(procedureType?: ProcedureType | string): string {
  const raw = String(procedureType || '').trim();
  return LEGACY_PROCEDURE_ALIASES[raw] || raw;
}

/** Resolve o procedimento; falha (FAIL CLOSED) quando ausente/inválido. */
function resolveProcedure(procedureType?: ProcedureType | string) {
  const id = normalizeProcedureId(procedureType);
  const procedure = PROCEDURES_CATALOG.find((p) => p.id === id);
  if (!procedure) {
    throw new Error(`Procedimento não suportado para rol de documentos: ${id}`);
  }
  return procedure;
}

/**
 * Itens OBRIGATÓRIOS no protocolo para o procedimento informado.
 * Derivados diretamente de PROCEDURES_CATALOG.requiredDocuments.
 */
export function buildDocumentRollItems(
  procedureType?: ProcedureType | string
): DocumentRollItem[] {
  const procedure = resolveProcedure(procedureType);
  return procedure.requiredDocuments
    .filter((d) => d.required)
    .map((d, idx) => ({
      id: `doc_roll_${procedure.id}_${idx}`,
      label: d.name,
      hint: d.description,
    }));
}

/**
 * Texto formatado do rol para inclusão ao final da minuta (fecho BLK-068).
 * Interpola o número do AIT nos itens que referenciam a notificação/auto.
 */
export function buildDocumentRollText(
  procedureType?: ProcedureType | string,
  aitNumber?: string
): string {
  const items = buildDocumentRollItems(procedureType);
  return formatRoll(items, aitNumber);
}

/**
 * Fase 8 (P1/P2): rol de documentos dirigido pelas TESES DETECTADAS.
 * Mescla os documentos OBRIGATÓRIOS do procedimento com as EVIDÊNCIAS
 * exigidas por cada tese juridicamente detectada (RuleModel.evidenceRequired).
 *
 * As evidências vêm SOMENTE do catálogo canônico de argumentos (never inventa):
 * cada legalArgumentId detectada na análise busca evidenceRequired correspondente
 * em ARGUMENTS_CATALOG. Falta de evidência canônica => item ausente, não fabricado.
 */
export function buildDocumentRollTextForAnalysis(
  procedureType?: ProcedureType | string,
  detectedArgumentIds?: string[],
  aitNumber?: string
): string {
  const procedureItems = buildDocumentRollItems(procedureType);
  const seen = new Set<string>();
  const merged: DocumentRollItem[] = [];

  for (const item of procedureItems) {
    if (!seen.has(item.label)) {
      seen.add(item.label);
      merged.push(item);
    }
  }

  for (const argId of detectedArgumentIds || []) {
    const arg = ARGUMENTS_CATALOG.find((a) => a.id === argId);
    if (!arg) continue; // KNOWLEDGE_GAP: sem evidência canônica, não inventa
    // Fonte de verdade do catálogo de argumentos: `requirements`.
    // (RuleModel usa `evidenceRequired`; ArgumentModel publica como `requirements`.)
    const evidences = (arg as any).evidenceRequired ?? arg.requirements ?? [];
    for (const ev of evidences) {
      if (!seen.has(ev)) {
        seen.add(ev);
        merged.push({ id: `doc_evid_${argId}`, label: ev, hint: `Evidência da tese ${arg.title}` });
      }
    }
  }

  return formatRoll(merged, aitNumber);
}

function formatRoll(items: DocumentRollItem[], aitNumber?: string): string {
  const list = items
    .map((item, idx) => {
      let label = item.label;
      if (aitNumber && /notifica|auto de infração|ait/i.test(label)) {
        label = `${label} (AIT nº ${aitNumber})`;
      }
      return `${idx + 1}. ${label};`;
    })
    .join('\n');
  return `ROL DE DOCUMENTOS QUE INSTRUEM A PRESENTE PEÇA:\n\n${list}`;
}
