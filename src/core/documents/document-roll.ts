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

/** Resolve o procedimento, caindo em defesa_previa quando ausente/inválido. */
function resolveProcedure(procedureType?: ProcedureType | string) {
  const id = normalizeProcedureId(procedureType);
  return (
    PROCEDURES_CATALOG.find((p) => p.id === id) ||
    PROCEDURES_CATALOG.find((p) => p.id === 'defesa_previa')!
  );
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
