/**
 * @file quality-gate.ts
 * Quality Gate do runtime CANÔNICO (Cloudflare Worker).
 *
 * Causa-raiz RC-6 (auditoria FASE 12): o Quality Gate existia em
 * `src/core/validation/final-quality-gate.ts`, mas o caminho de produção
 * (`cloudflare/routes/cases.ts → rag-adapter`) nunca o invoca — `grep
 * runFullQualityGate cloudflare/` era vazio. A peça era gerada, hasheada e
 * devolvida sem nenhuma verificação estrutural, de fidelidade ou de tese.
 *
 * Este wrapper é o gate do runtime. Ele:
 *  1. roda os 7 checks fail-closed de `runFullQualityGate` sobre o documento
 *     realmente gerado;
 *  2. adiciona o check JURISDIÇÃO, ausente em todas as fases anteriores;
 *  3. adiciona o check TESE AUTORIZADA, que exige que toda tese do documento
 *     esteja em `analysis.recommendedArguments`;
 *  4. adiciona o check FUNDAMENTO VERIFICÁVEL, que exige que toda tese tenha
 *     `legalBase` no catálogo canônico;
 *  5. reporta, sem bloquear, a situação da PROVENANCE (KB) — a cobertura
 *     documental é parcial e declarada (FASE 12.6 §19), então tratar
 *     provenance ausente como erro fatal seria mascarar limitação de cobertura.
 */

import { runFullQualityGate } from '../src/core/validation/final-quality-gate';
import type { QualityGateResult } from '../src/types';
import { ARGUMENTS_CATALOG } from '../src/core/arguments/arguments-catalog';
import { PROCEDURES_CATALOG } from '../src/core/procedures/procedures-catalog';

export interface CanonicalQualityGateInput {
  infraction: any;
  analysis: any;
  draft: any;
  applicant: any;
  vehicle: any;
  serviceType?: string;
}

export interface CanonicalQualityGateReport {
  overallPass: boolean;
  score: number;
  blocked: boolean;
  checks: QualityGateResult[];
  generatedAt: string;
}

/** Procedimentos aplicáveis à família da infração (mesma fonte do classificador). */
const PROCEDURE_FAMILY_COMPATIBILITY: Record<string, string[]> = {
  excesso_velocidade: ['recurso_jari', 'recurso_cetran', 'defesa_previa'],
  alcoolemia: ['defesa_previa', 'recurso_jari', 'recurso_cetran', 'suspensao_cnh'],
  semaforo: ['recurso_jari', 'recurso_cetran', 'defesa_previa'],
  celular: ['recurso_jari', 'recurso_cetran', 'defesa_previa'],
  estacionamento: ['recurso_jari', 'recurso_cetran', 'defesa_previa'],
  cinto: ['recurso_jari', 'recurso_cetran', 'defesa_previa'],
  documentos: ['recurso_jari', 'recurso_cetran', 'defesa_previa'],
  circulacao: ['recurso_jari', 'recurso_cetran', 'defesa_previa'],
  capacidade: ['recurso_jari', 'recurso_cetran', 'defesa_previa'],
  lotacao: ['recurso_jari', 'recurso_cetran', 'defesa_previa'],
  desconhecida: [],
};

const check = (
  name: string,
  passed: boolean,
  severity: 'error' | 'warning' | 'info',
  message: string,
  details?: Record<string, unknown>
): QualityGateResult => ({ check: name as QualityGateResult['check'], passed, severity, message, details });

/**
 * Gate canônico. Retorna relatório; quem chama decide bloquear. No runtime
 * canônico a decisão é SEMPRE bloquear quando `overallPass` é falso.
 */
export function runCanonicalQualityGate(input: CanonicalQualityGateInput): CanonicalQualityGateReport {
  const { infraction, analysis, draft, applicant, vehicle, serviceType } = input;
  const document = String(draft?.fullDraftText ?? '');
  const family = analysis?.infractionClassification?.family ?? 'desconhecida';
  const checks: QualityGateResult[] = [];

  // ── 1) os 7 checks herdados, sobre o documento real ───────────────────────
  const payload: any = {
    procedureType: draft?.procedureType,
    vehicle: { plate: vehicle?.plate, brandModel: vehicle?.model },
    infraction: { ...infraction },
    applicant: {
      name: applicant?.name,
      cpf: applicant?.cpf,
      cnh: applicant?.cnh,
      addressCityState: applicant?.cityState,
      address: applicant?.address,
    },
    identification: {
      aitNumber: infraction?.aitNumber,
      infractionCode: infraction?.infractionCode,
      autuadorBody: infraction?.autuadorBody,
      notificationExpeditionDate: infraction?.notificationExpeditionDate,
    },
    specificFacts: {},
    evidence: {},
  };
  const base = runFullQualityGate(payload, { id: draft?.caseId }, analysis, document);
  checks.push(...base.checks);

  // ── 2) TESE AUTORIZADA: nada no documento fora da Analysis ───────────────
  const authorized = new Set<string>((analysis?.recommendedArguments ?? []).map((a: any) => a.id));
  const used = (draft?.selectedArgumentIds ?? []) as string[];
  const unauthorized = used.filter((id) => !authorized.has(id));
  checks.push(
    check(
      'TESE_AUTORIZADA',
      unauthorized.length === 0,
      unauthorized.length > 0 ? 'error' : 'info',
      unauthorized.length === 0
        ? 'Todas as teses do documento foram autorizadas pela Analysis'
        : `Teses no documento sem autorização da Analysis: ${unauthorized.join(', ')}`,
    ),
  );

  // ── 3) FUNDAMENTO VERIFICÁVEL: toda tese existe no catálogo canônico ─────
  const unknownArguments = used.filter((id) => !ARGUMENTS_CATALOG.some((a: any) => a.id === id));
  const withoutLegalBase = used.filter((id) => {
    const arg = ARGUMENTS_CATALOG.find((a: any) => a.id === id) as any;
    return arg && !arg.legalBase;
  });
  checks.push(
    check(
      'FUNDAMENTO_VERIFICAVEL',
      unknownArguments.length === 0 && withoutLegalBase.length === 0,
      unknownArguments.length + withoutLegalBase.length > 0 ? 'error' : 'info',
      unknownArguments.length + withoutLegalBase.length === 0
        ? 'Todas as teses do documento têm fundamento no catálogo canônico'
        : `Teses sem fundamento canônico: ${[...new Set([...unknownArguments, ...withoutLegalBase])].join(', ')}`,
    ),
  );

  // ── 4) PROCEDIMENTO COMPATÍVEL com a família da infração ─────────────────
  const allowed = new Set<string>([
    ...(PROCEDURE_FAMILY_COMPATIBILITY[family] ?? []),
    ...(analysis?.recommendedProcedure ? [analysis.recommendedProcedure] : []),
  ]);
  const procedureKnown = PROCEDURES_CATALOG.some((p: any) => p.id === draft?.procedureType);
  const procedureCompatible = allowed.has(draft?.procedureType);
  checks.push(
    check(
      'PROCEDIMENTO_COMPATIVEL',
      procedureKnown && procedureCompatible,
      procedureKnown && procedureCompatible ? 'info' : 'error',
      procedureKnown && procedureCompatible
        ? `Procedimento "${draft?.procedureType}" compatível com a família "${family}"`
        : !procedureKnown
          ? `Procedimento "${draft?.procedureType}" inexistente no catálogo`
          : `Procedimento "${draft?.procedureType}" não se aplica à família "${family}" (permitidos: ${[...allowed].join(', ') || 'nenhum'})`,
    ),
  );

  // ── 5) JURISDIÇÃO (gap herdado da FASE 12.6 §9) ──────────────────────────
  const autuador = String(infraction?.autuadorBody ?? '');
  const declaredUf = /\b([A-Z]{2})\b/.exec(autuador)?.[1] ?? null;
  const mismatches: string[] = [];
  if (declaredUf && /\b(DETRAN|CET|DER|SPTRANS|BHTRANS|TRANS[A-Z]+)-[A-Z]{2}\b/i.test(autuador)) {
    const other = /\b(DETRAN|CET|DER|SPTRANS|BHTRANS|TRANS[A-Z]+)-([A-Z]{2})\b/i.exec(autuador);
    if (other && other[2] !== declaredUf) mismatches.push(autuador);
  }
  checks.push(
    check(
      'JURISDICAO',
      mismatches.length === 0 && autuador.length > 0,
      mismatches.length > 0 || !autuador ? 'error' : 'info',
      !autuador
        ? 'Órgão autuador ausente — impossível validar jurisdição'
        : mismatches.length > 0
          ? `Órgão autuador com jurisdição inconsistente: ${mismatches.join(', ')}`
          : `Jurisdição declarada coerente com o órgão autuador: ${autuador}`,
    ),
  );

  // ── 6) PROVENANCE DA KB — reporte, não bloqueio ──────────────────────────
  // A cobertura documental é parcial e declarada (FASE 12.6 §19: 19/27 UFs,
  // 66/66 sem vigência comprovada, 13 sem OCR). Bloquear aqui transformaria
  // limitação de cobertura em erro técnico e mascararia o problema real.
  const theses = analysis?.recommendedArguments ?? [];
  const supported = theses.filter((a: any) => a.provenanceStatus === 'SUPPORTED');
  checks.push(
    check(
      'PROVENANCE_KB',
      supported.length === theses.length,
      supported.length === theses.length ? 'info' : 'warning',
      supported.length === theses.length
        ? `Todas as ${theses.length} teses ancoradas em documento oficial recuperado da KB`
        : `${supported.length}/${theses.length} teses ancoradas na KB — cobertura documental parcial (limitação conhecida, não bloqueia)`,
    ),
  );

  const passed = checks.filter((c) => !c.passed || c.severity === 'warning').length;
  const blocking = checks.filter((c) => !c.passed && c.severity !== 'warning');
  const overallPass = blocking.length === 0;
  return {
    overallPass,
    score: Math.round((passed / checks.length) * 100),
    blocked: !overallPass,
    checks,
    generatedAt: new Date().toISOString(),
  };
}
