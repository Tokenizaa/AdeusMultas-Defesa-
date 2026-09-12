/**
 * @file document-quality.ts
 * Deterministic quality assertions for generated legal documents.
 *
 * All checks are objective string checks on the document text.
 * KNOWLEDGE_GAP is used when semantic/legal quality cannot be assessed
 * deterministically without LLM-as-judge (future phase).
 */

import { createHash } from 'crypto';
import type {
  AuditCaseData,
  DocumentQualityScore,
  DocumentQualityResult,
  QualityFailure,
} from './document-audit.types';

// ─── Placeholder / fail-closed patterns ──────────────────────────────────────

const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /\{\{[a-zA-Z0-9_-]+\}\}/, name: 'unresolved mustache placeholder' },
  { pattern: /\$\{[a-zA-Z0-9_-]+\}/, name: 'unresolved JS template literal' },
  { pattern: /\bundefined\b/, name: 'undefined value' },
  { pattern: /\bnull\b(?!\w)/, name: 'null value' },
  { pattern: /\bNaN\b/, name: 'NaN value' },
  { pattern: /\b\[object Object\]\b/, name: 'object stringification' },
  { pattern: /\bTODO\b/, name: 'TODO marker' },
  { pattern: /\bTBD\b/, name: 'TBD marker' },
  { pattern: /\bLorem ipsum\b/i, name: 'lorem ipsum placeholder' },
];

const GENERIC_INVENTED_CLAIMS = [
  'invenção de nulidade',
  'nulidade inventada',
  'fabricação de vício',
  'alegação não comprovada',
  'mentira jurídica',
];

// ─── Cross-contamination check ──────────────────────────────────────────────

export function checkCrossContamination(
  docText: string,
  caseData: AuditCaseData,
  allCases: AuditCaseData[]
): string[] {
  const conflicts: string[] = [];
  const ownIdentifiers = [
    caseData.applicant.cpf,
    caseData.applicant.cpfRaw,
    caseData.applicant.cnh,
    caseData.vehicle.plate,
    caseData.infraction.aitNumber,
  ].filter(Boolean);

  for (const other of allCases) {
    if (other.auditId === caseData.auditId) continue;

    const otherIdentifiers = [
      other.applicant.cpf,
      other.applicant.cpfRaw,
      other.applicant.cnh,
      other.vehicle.plate,
      other.infraction.aitNumber,
    ];

    for (const id of otherIdentifiers) {
      if (id && id.trim().length > 3 && docText.includes(id.trim())) {
        conflicts.push(`Document of ${caseData.auditId} contains identifier of ${other.auditId}: "${id}"`);
      }
    }
  }

  return conflicts;
}

// ─── Main quality assessor ────────────────────────────────────────────────────

export function assessDocumentQuality(
  docText: string,
  caseData: AuditCaseData,
  allCases: AuditCaseData[]
): DocumentQualityResult {
  const failures: QualityFailure[] = [];

  // ── 1. Identity checks ──────────────────────────────────────────────────────
  let identityScore = 100;
  const identityFields = [
    { value: caseData.applicant.name, label: 'applicantName' },
    { value: caseData.applicant.cpf, label: 'applicantCpf' },
    { value: caseData.applicant.cnh, label: 'applicantCnh' },
    { value: caseData.vehicle.plate, label: 'vehiclePlate' },
    { value: caseData.infraction.aitNumber, label: 'aitNumber' },
  ];

  for (const { value, label } of identityFields) {
    if (value && !docText.includes(value.trim())) {
      identityScore -= 20;
      failures.push({
        check: `identity.${label}`,
        severity: 'P0',
        detail: `Document does not contain expected ${label}: "${value}"`,
      });
    }
  }
  identityScore = Math.max(0, identityScore);

  // ── 2. Data fidelity (infraction) ───────────────────────────────────────────
  let dataFidelityScore = 100;
  const infractionFields = [
    { value: caseData.infraction.infractionCode, label: 'infractionCode' },
    { value: caseData.infraction.description, label: 'infractionDescription' },
    { value: caseData.infraction.ctbArticle, label: 'ctbArticle' },
    { value: caseData.infraction.autuadorBody, label: 'autuadorBody' },
    { value: caseData.infraction.location, label: 'infractionLocation' },
  ];

  for (const { value, label } of infractionFields) {
    if (value && !docText.includes(value.trim())) {
      dataFidelityScore -= 20;
      failures.push({
        check: `dataFidelity.${label}`,
        severity: 'P0',
        detail: `Document missing infraction ${label}: "${value}"`,
      });
    }
  }
  dataFidelityScore = Math.max(0, dataFidelityScore);

  // ── 3. Procedure fit ───────────────────────────────────────────────────────
  let procedureFitScore = 100;
  const procedureIndicators: Record<string, string[]> = {
    recurso_jari: ['JARI', 'Recurso Ordin', 'Art. 285'],
    recurso_cetran: ['CETRAN', 'Conselho Estadual', 'Art. 288'],
    defesa_previa: ['Defesa Pr', 'Art. 281', 'Notificação de Autuação'],
    conversao_advertencia: ['Advertência', 'Art. 267', 'conversão'],
    indicacao_condutor: ['condutor', 'indicado', 'Art. 257'],
    suspensao_cnh: ['Suspensão', 'CNH', 'PSDD', 'Art. 261'],
    cassacao_cnh: ['Cassação', 'PCDD', 'Art. 263'],
    processo_suspensao: ['Suspensão', 'PSDD', 'Art. 261'],
    processo_cassacao: ['Cassação', 'PCDD', 'Art. 263'],
  };

  const indicators = procedureIndicators[caseData.procedureType] ?? [];
  const foundIndicators = indicators.filter((ind) =>
    docText.toLowerCase().includes(ind.toLowerCase())
  );
  if (foundIndicators.length === 0 && indicators.length > 0) {
    procedureFitScore = 0;
    failures.push({
      check: 'procedureFit',
      severity: 'P0',
      detail: `Document does not contain any expected procedure indicators for ${caseData.procedureType}: ${indicators.join(', ')}`,
    });
  } else if (foundIndicators.length < indicators.length) {
    procedureFitScore = Math.round((foundIndicators.length / indicators.length) * 100);
  }

  // ── 4. Structure (mandatory sections) ─────────────────────────────────────
  let structureScore = 100;
  const mandatorySections = [
    { pattern: /qualificação/i, name: 'Qualificação do Requerente' },
    { pattern: /orgão autuador|órgão autuador/i, name: 'Órgão Autuador' },
    { pattern: /fatos|dos fatos/i, name: 'Seção de Fatos' },
    { pattern: /fundamentação|pedidos|requer/i, name: 'Fundamentação ou Pedidos' },
    { pattern: /data|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/, name: 'Data' },
  ];

  for (const { pattern, name } of mandatorySections) {
    if (!pattern.test(docText)) {
      structureScore -= 20;
      failures.push({
        check: `structure.${name}`,
        severity: 'P0',
        detail: `Document missing mandatory section: "${name}"`,
      });
    }
  }
  structureScore = Math.max(0, structureScore);

  // ── 5. Legal grounding (arguments not empty) ────────────────────────────────
  let legalGroundingScore = 100;
  // Check if argument sections have actual content (not just section headers)
  const argumentBlockMatch = docText.match(/(?:preliminares|mér?ito|fundamenta(?:ção|r))/i);
  if (argumentBlockMatch) {
    const beforeArg = docText.substring(0, argumentBlockMatch.index!);
    const afterArg = docText.substring((argumentBlockMatch.index ?? 0) + 50);
    const aroundArg = beforeArg.slice(-200) + afterArg.slice(0, 200);
    // If the section header appears but has < 50 chars after it, it's empty
    if (aroundArg.trim().length < 30) {
      legalGroundingScore = 50;
      failures.push({
        check: 'legalGrounding',
        severity: 'P1',
        detail: 'Argument sections appear to have minimal or no content',
      });
    }
  }

  // ── 6. Placeholder check ──────────────────────────────────────────────────
  let placeholdersScore = 100;
  for (const { pattern, name } of FORBIDDEN_PATTERNS) {
    if (pattern.test(docText)) {
      placeholdersScore = 0;
      failures.push({
        check: `placeholder.${name}`,
        severity: 'P0',
        detail: `Document contains forbidden ${name}: "${pattern.source}"`,
      });
      break; // One placeholder failure fails the whole check
    }
  }

  // ── 7. Cross contamination ────────────────────────────────────────────────
  let crossContaminationScore = 100;
  const contaminationIssues = checkCrossContamination(docText, caseData, allCases);
  if (contaminationIssues.length > 0) {
    crossContaminationScore = 0;
    failures.push({
      check: 'crossContamination',
      severity: 'P0',
      detail: contaminationIssues.join('; '),
    });
  }

  // ── 8. Completeness ────────────────────────────────────────────────────────
  let completenessScore = 100;
  const requiredData = [
    caseData.applicant.name,
    caseData.applicant.cpf,
    caseData.applicant.cityState,
    caseData.vehicle.plate,
    caseData.infraction.aitNumber,
    caseData.infraction.dateTime,
  ];
  const missingData = requiredData.filter((v) => !v || !docText.includes(v.trim()));
  completenessScore = Math.round(((requiredData.length - missingData.length) / requiredData.length) * 100);

  // ── 9. Readability ─────────────────────────────────────────────────────────
  let readabilityScore = 100;
  if (docText.includes('\uFFFD') || // Replacement character
      docText.includes('%PDF') ||   // Raw PDF binary leaked
      docText.includes('undefined')) {
    readabilityScore = 0;
    failures.push({
      check: 'readability',
      severity: 'P1',
      detail: 'Document contains encoding issues or binary data',
    });
  } else if (docText.length < 300) {
    readabilityScore = 50;
    failures.push({
      check: 'readability',
      severity: 'P1',
      detail: `Document is suspiciously short (${docText.length} chars)`,
    });
  }

  // ── 10. Overall ─────────────────────────────────────────────────────────────
  const overall = Math.round(
    identityScore * 0.20 +
    dataFidelityScore * 0.20 +
    procedureFitScore * 0.15 +
    structureScore * 0.15 +
    legalGroundingScore * 0.05 +
    placeholdersScore * 0.10 +
    crossContaminationScore * 0.05 +
    completenessScore * 0.05 +
    readabilityScore * 0.05
  );

  const scores: DocumentQualityScore = {
    identity: identityScore,
    dataFidelity: dataFidelityScore,
    procedureFit: procedureFitScore,
    structure: structureScore,
    legalGrounding: legalGroundingScore,
    placeholders: placeholdersScore,
    crossContamination: crossContaminationScore,
    completeness: completenessScore,
    readability: readabilityScore,
    overall,
  };

  const passed = !failures.some((f) => f.severity === 'P0');

  // ── Document hash ────────────────────────────────────────────────────────────
  const docHash = createHash('sha256').update(docText, 'utf8').digest('hex');

  // ── Snippet ────────────────────────────────────────────────────────────────
  const docSnippet = docText.substring(0, 500).replace(/\s+/g, ' ').trim();

  // ── Knowledge gaps ──────────────────────────────────────────────────────────
  const knowledgeGaps: string[] = [];
  if (legalGroundingScore < 100) {
    // Cannot determine if legal content is semantically valid without LLM judge
    knowledgeGaps.push('legalGrounding: semantic quality of legal arguments cannot be assessed deterministically (KNOWLEDGE_GAP)');
  }

  return {
    caseId: caseData.auditId,
    auditId: caseData.auditId,
    scores,
    passed,
    failures,
    knowledgeGaps,
    documentHash: docHash,
    docSnippet,
  };
}

// ─── Batch result formatter ─────────────────────────────────────────────────

export function formatQualityTable(results: DocumentQualityResult[]): string {
  const header = '| Case | Overall | Identity | DataFidel | ProcFit | Struct | Placeholder | XContam | Result |';
  const sep = '|------|--------:|--------:|----------:|--------:|-------:|------------:|--------:|--------|';

  const rows = results.map((r) => {
    const fails = r.failures.filter((f) => f.severity === 'P0').length;
    return [
      r.caseId,
      `${r.scores.overall}%`,
      `${r.scores.identity}%`,
      `${r.scores.dataFidelity}%`,
      `${r.scores.procedureFit}%`,
      `${r.scores.structure}%`,
      `${r.scores.placeholders}%`,
      `${r.scores.crossContamination}%`,
      fails === 0 ? '✅ PASS' : `❌ FAIL (${fails} P0)`,
    ].join(' | ');
  });

  return [header, sep, ...rows].join('\n');
}
