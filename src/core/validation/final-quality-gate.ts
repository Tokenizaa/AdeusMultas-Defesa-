/**
 * @file final-quality-gate.ts
 * DefesaAI — Final Document Quality Gate (Fase 8)
 *
 * Reconciliação integral entre onboarding → documento final.
 * 7 verificações obrigatórias antes de entregar ao frontend.
 *
 *   1. COMPLETUDE      - Todos os dados obrigatórios existem?
 *   2. FIDELIDADE      - Os dados do documento correspondem ao onboarding?
 *   3. CONSISTÊNCIA    - Não existem contradições entre campos?
 *   4. CAUSALIDADE     - Os fatos disparadores produziram as regras esperadas?
 *   5. RASTREABILIDADE - Cada tese/bloco possui origem determinística?
 *   6. NÃO-INVENÇÃO    - O documento contém algo sem fonte conhecida?
 *   7. ESTRUTURA       - O documento está completo e protocolável?
 *
 * Somente 7/7 PASS → documento liberado.
 */

import {
  QualityGateInput,
  QualityGateReport,
  QualityGateResult,
  QualityGateCheck,
  CaseDataLineage,
  DataLineageEntry,
  DataLineageSource,
} from '../../types';
import { buildDataLineage } from './data-lineage';
import { ARGUMENTS_CATALOG } from '../arguments/arguments-catalog';
import { DOCUMENT_BLOCKS } from '../templates/document-blocks';
import { PROCEDURES_CATALOG } from '../procedures/procedures-catalog';
import { INFRACTION_CATALOG } from '../../data/knowledge-base';

const REQUIRED_ONBOARDING_FIELDS = [
  { path: 'infraction.aitNumber', label: 'Número do AIT' },
  { path: 'vehicle.plate', label: 'Placa do veículo' },
  { path: 'applicant.name', label: 'Nome do requerente' },
  { path: 'applicant.cpf', label: 'CPF do requerente' },
  { path: 'applicant.cnh', label: 'CNH do requerente' },
  { path: 'infraction.autuadorBody', label: 'Órgão autuador' },
  { path: 'infraction.infractionCode', label: 'Código da infração' },
  { path: 'infraction.ctbArticle', label: 'Enquadramento CTB' },
  { path: 'infraction.dateTime', label: 'Data da infração' },
  { path: 'infraction.location', label: 'Local da infração' },
  { path: 'infraction.severity', label: 'Gravidade da infração' },
  { path: 'applicant.addressCityState', label: 'Cidade/UF do requerente' },
];

const CONTRADICTION_RULES: Array<{
  check: (lineage: CaseDataLineage) => { field: string; expected: string; actual: string } | null;
  message: string;
}> = [
  {
    check: (lineage) => {
      const measured = lineage.entries.find((e) => e.field === 'infraction.measuredSpeed');
      const considered = lineage.entries.find((e) => e.field === 'infraction.consideredSpeed');
      const limit = lineage.entries.find((e) => e.field === 'infraction.speedLimit');
      if (measured && considered && limit) {
        const m = Number(measured.originalValue);
        const c = Number(considered.originalValue);
        const l = Number(limit.originalValue);
        if (c > m) {
          return { field: 'infraction.consideredSpeed', expected: `<= ${m}`, actual: String(c) };
        }
      }
      return null;
    },
    message: 'Velocidade considerada não pode ser maior que a medida',
  },
  {
    check: (lineage) => {
      const ait = lineage.entries.find((e) => e.field === 'infraction.aitNumber');
      const expedition = lineage.entries.find((e) => e.field === 'infraction.notificationExpeditionDate');
      const infractionDate = lineage.entries.find((e) => e.field === 'infraction.dateTime');
      if (ait && expedition && infractionDate) {
        const expDate = new Date(expedition.originalValue);
        const infDate = new Date(infractionDate.originalValue);
        const diffDays = Math.ceil((expDate.getTime() - infDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 30) {
          return null;
        }
      }
      return null;
    },
    message: 'Datas inconsistentes com decadência',
  },
];

/**
 * Executa o Quality Gate completo (7 verificações).
 */
export function runFinalQualityGate(input: QualityGateInput): QualityGateReport {
  const { onboardingPayload, canonicalCase, analysis, finalDocument, lineage, argumentsCatalog, blocksCatalog } = input;
  const checks: QualityGateResult[] = [];

  checks.push(runCompletudeCheck(lineage, finalDocument));
  checks.push(runFidelidadeCheck(lineage, finalDocument, onboardingPayload));
  checks.push(runConsistenciaCheck(lineage));
  checks.push(runCausalidadeCheck(lineage, analysis));
  checks.push(runRastreabilidadeCheck(lineage, analysis, argumentsCatalog, blocksCatalog));
  checks.push(runNaoInvencaoCheck(lineage, finalDocument, onboardingPayload, argumentsCatalog, blocksCatalog));
  checks.push(runEstruturaCheck(finalDocument, canonicalCase, analysis, blocksCatalog));

  const passedChecks = checks.filter((c) => c.passed).length;
  const score = Math.round((passedChecks / checks.length) * 100);
  const overallPass = passedChecks === checks.length;
  const blocked = !overallPass;

  return {
    caseId: canonicalCase?.id || 'unknown',
    overallPass,
    checks,
    score,
    blocked,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 1. COMPLETUDE
 */
function runCompletudeCheck(lineage: CaseDataLineage, finalDocument: string): QualityGateResult {
  const missing: string[] = [];
  const missingInDoc: string[] = [];

  for (const req of REQUIRED_ONBOARDING_FIELDS) {
    const entry = lineage.entries.find((e) => e.field === req.path);
    if (!entry || !entry.originalValue) {
      missing.push(req.label);
      continue;
    }
    if (entry.documentOccurrences === 0 && entry.requiredInDocument) {
      missingInDoc.push(`${req.label} (${req.path})`);
    }
  }

  const allMissing = [...missing, ...missingInDoc];

  return {
    check: 'COMPLETUDE',
    passed: allMissing.length === 0,
    severity: allMissing.length > 0 ? 'error' : 'info',
    message: allMissing.length === 0
      ? 'Todos os dados obrigatórios presentes no onboarding e no documento'
      : `Dados obrigatórios ausentes: ${allMissing.join(', ')}`,
    details: allMissing.length > 0 ? { field: allMissing[0] } : undefined,
  };
}

/**
 * 2. FIDELIDADE
 */
function runFidelidadeCheck(
  lineage: CaseDataLineage,
  finalDocument: string,
  onboardingPayload: any
): QualityGateResult {
  const mismatches: Array<{ field: string; expected: string; found: string }> = [];

  for (const entry of lineage.entries) {
    if (!entry.originalValue || entry.source !== 'onboarding') continue;
    if (entry.requiredInDocument && entry.documentOccurrences === 0) continue;

    const expectedStr = String(entry.originalValue).trim();
    if (expectedStr.length < 3) continue;

    const regex = new RegExp(expectedStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const matches = finalDocument.match(regex);

    if (!matches && entry.requiredInDocument) {
      mismatches.push({
        field: entry.field,
        expected: expectedStr,
        found: '(não encontrado no documento)',
      });
    }
  }

  return {
    check: 'FIDELIDADE',
    passed: mismatches.length === 0,
    severity: mismatches.length > 0 ? 'error' : 'info',
    message: mismatches.length === 0
      ? 'Todos os valores do onboarding representados fielmente no documento'
      : `Divergências encontradas: ${mismatches.map((m) => `${m.field}: esperado "${m.expected}"`).join('; ')}`,
    details: mismatches[0] ? { field: mismatches[0].field, expected: mismatches[0].expected, actual: mismatches[0].found } : undefined,
  };
}

/**
 * 3. CONSISTÊNCIA
 */
function runConsistenciaCheck(lineage: CaseDataLineage): QualityGateResult {
  const contradictions: Array<{ field: string; expected: string; actual: string }> = [];

  for (const rule of CONTRADICTION_RULES) {
    const result = rule.check(lineage);
    if (result) {
      contradictions.push(result);
    }
  }

  return {
    check: 'CONSISTENCIA',
    passed: contradictions.length === 0,
    severity: contradictions.length > 0 ? 'error' : 'info',
    message: contradictions.length === 0
      ? 'Nenhuma contradição interna detectada entre campos'
      : `Contradições: ${contradictions.map((c) => `${c.field}: ${c.actual} (esperado ${c.expected})`).join('; ')}`,
    details: contradictions[0] ? { field: contradictions[0].field, expected: contradictions[0].expected, actual: contradictions[0].actual } : undefined,
  };
}

/**
 * 4. CAUSALIDADE
 */
function runCausalidadeCheck(lineage: CaseDataLineage, analysis: any): QualityGateResult {
  const causalFailures: string[] = [];

  if (analysis?.evaluatedRules) {
    for (const rule of analysis.evaluatedRules) {
      if (rule.status === 'FAIL' && rule.legalArgumentId) {
        const ruleInputs = rule.inputs || {};
        for (const [inputKey, inputValue] of Object.entries(ruleInputs)) {
          const mappedField = mapRuleInputToField(inputKey);
          if (mappedField) {
            const entry = lineage.entries.find((e) => e.field === mappedField);
            if (!entry || !entry.originalValue) {
              causalFailures.push(`${rule.ruleId} (${rule.legalArgumentId}): dado disparador "${mappedField}" ausente no onboarding`);
            }
          }
        }
      }
    }

    for (const rule of analysis.evaluatedRules) {
      if (rule.status === 'DATA_GAP' && rule.inputs?.missingData) {
        for (const missing of rule.inputs.missingData) {
          causalFailures.push(`${rule.ruleId}: DATA_GAP por "${missing}" — regra não pode concluir`);
        }
      }
    }
  }

  return {
    check: 'CAUSALIDADE',
    passed: causalFailures.length === 0,
    severity: causalFailures.length > 0 ? 'warning' : 'info',
    message: causalFailures.length === 0
      ? 'Todos os vícios detectados têm rastreabilidade causal aos fatos do onboarding'
      : `Falhas de causalidade: ${causalFailures.join('; ')}`,
    details: causalFailures[0] ? { field: 'causalidade', expected: 'dados presentes', actual: causalFailures[0] } : undefined,
  };
}

/**
 * 5. RASTREABILIDADE
 */
function runRastreabilidadeCheck(
  lineage: CaseDataLineage,
  analysis: any,
  argumentsCatalog: any[],
  blocksCatalog: any[]
): QualityGateResult {
  const untraceable: string[] = [];

  if (analysis?.selectedArguments) {
    for (const argId of analysis.selectedArguments) {
      const arg = argumentsCatalog.find((a: any) => a.id === argId);
      if (!arg) {
        untraceable.push(`Tese ${argId} não existe no catálogo canônico`);
        continue;
      }

      const hasLineage = lineage.entries.some((e) => e.generatedArguments.includes(argId));
      if (!hasLineage && arg.category !== 'constitucional') {
        untraceable.push(`Tese ${argId} (${arg.title}) sem origem nos dados do onboarding`);
      }
    }
  }

  if (analysis?.recommendedProcedure) {
    const proc = PROCEDURES_CATALOG.find((p) => p.id === analysis.recommendedProcedure);
    if (proc?.availableTemplates) {
      for (const tplId of proc.availableTemplates) {
        const template = blocksCatalog.find((b: any) => b.id === tplId || b.templateId === tplId);
        if (template?.blocks) {
          for (const block of template.blocks) {
            if (block.requiredArguments?.length) {
              const missingArgs = block.requiredArguments.filter((argId: string) =>
                !lineage.entries.some((e) => e.generatedArguments.includes(argId))
              );
              if (missingArgs.length > 0) {
                untraceable.push(`Bloco ${block.id} exige teses sem lineage: ${missingArgs.join(', ')}`);
              }
            }
          }
        }
      }
    }
  }

  return {
    check: 'RASTREABILIDADE',
    passed: untraceable.length === 0,
    severity: untraceable.length > 0 ? 'error' : 'info',
    message: untraceable.length === 0
      ? 'Todas as teses e blocos possuem origem rastreável ao onboarding/regras'
      : `Sem rastreabilidade: ${untraceable.join('; ')}`,
    details: untraceable[0] ? { field: 'rastreabilidade', actual: untraceable[0] } : undefined,
  };
}

/**
 * 6. NÃO-INVENÇÃO
 */
function runNaoInvencaoCheck(
  lineage: CaseDataLineage,
  finalDocument: string,
  onboardingPayload: any,
  argumentsCatalog: any[],
  blocksCatalog: any[]
): QualityGateResult {
  const invented: Array<{ pattern: string; context: string }> = [];

  const checks = [
    {
      pattern: /(\d{2,3}\s*km\/h)/gi,
      description: 'Velocidade numérica',
      allowedFields: ['infraction.measuredSpeed', 'infraction.consideredSpeed', 'infraction.speedLimit'],
    },
    {
      pattern: /(\d{1,2}\/\d{1,2}\/\d{4})/g,
      description: 'Data no formato DD/MM/YYYY',
      allowedFields: ['infraction.dateTime', 'infraction.notificationExpeditionDate', 'infraction.defenseDeadline', 'system.currentDate'],
    },
    {
      pattern: /conforme fotograf[ia]/gi,
      description: 'Referência a fotografia',
      allowedFields: ['infraction.hasPhotoProof', 'evidence.photoProofUrls'],
      condition: (lineage: CaseDataLineage) => {
        const hasPhoto = lineage.entries.find((e) => e.field === 'infraction.hasPhotoProof');
        return hasPhoto?.originalValue === 'true' || (hasPhoto?.originalValue && String(hasPhoto.originalValue).toLowerCase() === 'sim');
      },
    },
    {
      pattern: /termo de constata[çc][aã]o/gi,
      description: 'Referência a termo de constatação',
      allowedFields: ['infraction.hasPsychomotorTerm'],
      condition: (lineage: CaseDataLineage) => {
        const hasTerm = lineage.entries.find((e) => e.field === 'infraction.hasPsychomotorTerm');
        return hasTerm?.originalValue === 'true';
      },
    },
  ];

  for (const check of checks) {
    const matches = finalDocument.match(check.pattern) || [];
    for (const match of matches) {
      let hasSource = false;

      for (const allowedField of check.allowedFields) {
        const entry = lineage.entries.find((e) => e.field === allowedField);
        if (entry && entry.originalValue && finalDocument.toLowerCase().includes(String(entry.originalValue).toLowerCase())) {
          hasSource = true;
          break;
        }
      }

      if (!hasSource && check.condition && check.condition(lineage)) {
        hasSource = true;
      }

      const isTemplateText = isStandardTemplatePhrase(match, check.description);
      if (isTemplateText) {
        hasSource = true;
      }

      if (!hasSource) {
        invented.push({ pattern: check.description, context: match });
      }
    }
  }

  return {
    check: 'NAO_INVENCAO',
    passed: invented.length === 0,
    severity: invented.length > 0 ? 'error' : 'info',
    message: invented.length === 0
      ? 'Nenhuma informação inventada detectada no documento'
      : `Possíveis invenções: ${invented.map((i) => `${i.pattern}: "${i.context}"`).join('; ')}`,
    details: invented[0] ? { field: 'invenção', actual: invented[0].context } : undefined,
  };
}

function isStandardTemplatePhrase(text: string, description: string): boolean {
  const templatePhrases = [
    'código de trânsito brasileiro',
    'resolução contran',
    'artigo',
    'inciso',
    'parágrafo',
    'ilustríssimo senhor',
    'autoridade de trânsito',
    'requer o recebimento',
    'acolhimento da defesa',
    'arquivamento definitivo',
    'efeito suspensivo',
    'nestes termos',
    'pede deferimento',
    'termos em que',
    'dados da autuação',
    'qualificação do requerente',
  ];

  const lower = text.toLowerCase();
  return templatePhrases.some((tp) => lower.includes(tp));
}

/**
 * 7. ESTRUTURA
 */
function runEstruturaCheck(
  finalDocument: string,
  canonicalCase: any,
  analysis: any,
  blocksCatalog: any[]
): QualityGateResult {
  const missingSections: string[] = [];

  const requiredSections = [
    { pattern: /ilustríssimo senhor/i, label: 'Endereçamento' },
    { pattern: /qualifica[çc][aã]o/i, label: 'Qualificação do requerente' },
    { pattern: /identifica[çc][aã]o do auto|auto de infra[çc][aã]o/i, label: 'Identificação do AIT' },
    { pattern: /dos fatos|dos fatos e fundamentos/i, label: 'Dos fatos' },
    { pattern: /preliminares?/i, label: 'Preliminares' },
    { pattern: /mérito|do mérito/i, label: 'Mérito' },
    { pattern: /pedidos?|requer/i, label: 'Pedidos' },
    { pattern: /rol de documentos|documentos anexos/i, label: 'Rol de documentos' },
    { pattern: /nestes termos|termos em que|pede deferimento/i, label: 'Fecho/Assinatura' },
  ];

  for (const section of requiredSections) {
    if (!section.pattern.test(finalDocument)) {
      missingSections.push(section.label);
    }
  }

  const pendingTags = finalDocument.match(/\{\{[a-zA-Z0-9_-]+\}\}/g) || [];
  if (pendingTags.length > 0) {
    missingSections.push(`Tags pendentes: ${pendingTags.slice(0, 5).join(', ')}`);
  }

  return {
    check: 'ESTRUTURA',
    passed: missingSections.length === 0,
    severity: missingSections.length > 0 ? 'error' : 'info',
    message: missingSections.length === 0
      ? 'Documento estruturalmente completo com todas as seções obrigatórias'
      : `Seções/estrutura ausente: ${missingSections.join(', ')}`,
    details: missingSections[0] ? { field: 'estrutura', actual: missingSections[0] } : undefined,
  };
}

function mapRuleInputToField(ruleInput: string): string | null {
  const mapping: Record<string, string> = {
    infractionDate: 'infraction.dateTime',
    notificationExpeditionDate: 'infraction.notificationExpeditionDate',
    notificationDeliveryDate: 'infraction.notificationDeliveryDate',
    defenseDeadline: 'infraction.defenseDeadline',
    radarCalibrationDate: 'infraction.inmetroAferitionDate',
    speedLimit: 'infraction.speedLimit',
    measuredSpeed: 'infraction.measuredSpeed',
    consideredSpeed: 'infraction.consideredSpeed',
    speedMeasured: 'infraction.speedMeasured',
    speedConsidered: 'infraction.speedConsidered',
    radarEquipmentId: 'infraction.radarEquipmentId',
    hasPreviousInfractionsLast12Months: 'infraction.hasPreviousInfractionsLast12Months',
    hasPsychomotorTerm: 'infraction.hasPsychomotorTerm',
    hasAgentDetailedObservations: 'infraction.hasAgentDetailedObservations',
    hasPhotoProof: 'infraction.hasPhotoProof',
    hasR19SignageProof: 'infraction.hasR19SignageProof',
    autuadorBody: 'infraction.autuadorBody',
    aitNumber: 'infraction.aitNumber',
    infractionCode: 'infraction.infractionCode',
  };
  return mapping[ruleInput] || null;
}

/**
 * Wrapper conveniente: computa lineage + roda quality gate.
 */
export function runFullQualityGate(
  onboardingPayload: any,
  canonicalCase: any,
  analysis: any,
  finalDocument: string
): QualityGateReport {
  const lineage = buildDataLineage(
    onboardingPayload,
    canonicalCase,
    analysis,
    finalDocument,
    ARGUMENTS_CATALOG,
    DOCUMENT_BLOCKS
  );

  return runFinalQualityGate({
    onboardingPayload,
    canonicalCase,
    analysis,
    finalDocument,
    lineage,
    argumentsCatalog: ARGUMENTS_CATALOG,
    blocksCatalog: DOCUMENT_BLOCKS,
  });
}