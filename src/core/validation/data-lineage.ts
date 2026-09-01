/**
 * @file data-lineage.ts
 * DefesaAI — Data Lineage Tracker (Fase 8)
 *
 * Reconstrói a trilha completa de cada dado:
 * ONBOARDING → CANONICAL CASE → RULE ENGINE → TESes/VÍCIOS/BLOCOS → DOCUMENTO
 *
 * Permite auditoria: de onde veio, se foi transformado, se disparou regra,
 * gerou vício/tese/bloco, aparece no documento.
 */

import {
  CanonicalOnboardingPayload,
  CaseDataLineage,
  DataLineageEntry,
  DataLineageSource,
} from '../../types';

/**
 * Gera hash determinístico de um valor para comparação rápida.
 */
function hashValue(value: unknown): string {
  const str = JSON.stringify(value);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Extrai todos os campos "folha" de um objeto aninhado com seus paths.
 * Ex: { infraction: { speedLimit: 60 } } → [ { path: 'infraction.speedLimit', value: 60 } ]
 */
function extractLeafFields(obj: any, prefix = ''): Array<{ path: string; value: unknown }> {
  const result: Array<{ path: string; value: unknown }> = [];
  if (!obj || typeof obj !== 'object') return result;

  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)) {
      result.push(...extractLeafFields(value, fullPath));
    } else if (value !== null && value !== undefined && value !== '') {
      result.push({ path: fullPath, value });
    }
  }
  return result;
}

/**
 * Constrói a linhagem completa de dados para um caso.
 *
 * Percorre:
 * 1. Onboarding payload (fonte primária)
 * 2. OCR/evidências auxiliares
 * 3. Regras avaliadas (quais dados cada regra consumiu)
 * 4. Teses/argumentos selecionados
 * 5. Blocos do documento
 * 6. Documento final (contagem de ocorrências)
 */
export function buildDataLineage(
  onboardingPayload: CanonicalOnboardingPayload,
  canonicalCase: any,
  analysis: any,
  finalDocument: string,
  argumentsCatalog: any[],
  blocksCatalog: any[]
): CaseDataLineage {
  const entriesMap = new Map<string, DataLineageEntry>();
  const now = new Date().toISOString();

  // ============================================================
  // 1. ONBOARDING — Fonte primária
  // ============================================================
  const onboardingLeaves = extractLeafFields(onboardingPayload);
  for (const leaf of onboardingLeaves) {
    const entry: DataLineageEntry = {
      field: leaf.path,
      valueHash: hashValue(leaf.value),
      originalValue: typeof leaf.value === 'string' ? leaf.value : JSON.stringify(leaf.value),
      source: 'onboarding',
      usedByRules: [],
      generatedArguments: [],
      generatedBlocks: [],
      documentOccurrences: 0,
      requiredInDocument: isRequiredInDocument(leaf.path),
      isConditionalFact: isConditionalFact(leaf.path),
    };
    entriesMap.set(leaf.path, entry);
  }

  // ============================================================
  // 2. OCR / Evidências auxiliares
  // ============================================================
  if (onboardingPayload.evidence) {
    const ocrLeaves = extractLeafFields(onboardingPayload.evidence, 'evidence');
    for (const leaf of ocrLeaves) {
      const entry: DataLineageEntry = {
        field: leaf.path,
        valueHash: hashValue(leaf.value),
        originalValue: typeof leaf.value === 'string' ? leaf.value : JSON.stringify(leaf.value),
        source: 'ocr',
        usedByRules: [],
        generatedArguments: [],
        generatedBlocks: [],
        documentOccurrences: 0,
        requiredInDocument: false,
        isConditionalFact: false,
      };
      entriesMap.set(leaf.path, entry);
    }
  }

  // ============================================================
  // 3. RULE ENGINE — Quais dados cada regra consumiu
  // ============================================================
  if (analysis?.evaluatedRules) {
    for (const rule of analysis.evaluatedRules) {
      const ruleInputs = rule.inputs || {};
      for (const [inputKey] of Object.entries(ruleInputs)) {
        // Mapear input da regra para campo do onboarding
        const mappedField = mapRuleInputToField(inputKey);
        if (mappedField) {
          const entry = entriesMap.get(mappedField);
          if (entry) {
            if (!entry.usedByRules.includes(rule.ruleId)) {
              entry.usedByRules.push(rule.ruleId);
            }
          } else {
            // Campo usado pela regra mas não no onboarding (ex: calculado)
            entriesMap.set(mappedField, {
              field: mappedField,
              valueHash: hashValue(ruleInputs[inputKey]),
              source: 'rule_engine',
              usedByRules: [rule.ruleId],
              generatedArguments: [],
              generatedBlocks: [],
              documentOccurrences: 0,
              requiredInDocument: false,
              isConditionalFact: false,
            });
          }
        }
      }
    }
  }

  // ============================================================
  // 4. TESes/ARGUMENTOS — Mapear quais dados geraram cada tese
  // ============================================================
  if (analysis?.detectedFlaws) {
    for (const flaw of analysis.detectedFlaws) {
      const argumentId = flaw.argumentId;
      if (!argumentId) continue;

      // Encontrar a regra que gerou este vício
      const ruleId = flaw.ruleId;
      if (ruleId) {
        const rule = analysis.evaluatedRules?.find((r: any) => r.ruleId === ruleId);
        if (rule?.inputs) {
          for (const inputKey of Object.keys(rule.inputs)) {
            const mappedField = mapRuleInputToField(inputKey);
            if (mappedField) {
              const entry = entriesMap.get(mappedField);
              if (entry && !entry.generatedArguments.includes(argumentId)) {
                entry.generatedArguments.push(argumentId);
              }
            }
          }
        }
      }
    }
  }

  // ============================================================
  // 5. BLOCOS — Mapear quais teses geraram quais blocos
  // ============================================================
  // Os blocos são montados pelo DocumentAssemblyEngine baseados nas teses selecionadas
  if (analysis?.selectedArguments) {
    for (const argId of analysis.selectedArguments) {
      const arg = argumentsCatalog.find((a: any) => a.id === argId);
      if (!arg) continue;

      // O argumento pode referenciar blocos recomendados
      // Buscar blocos que têm este argumento como recomendado
      const relatedBlocks = blocksCatalog.filter((b: any) =>
        b.relatedArguments?.includes(argId) || b.requiredArguments?.includes(argId)
      );

      for (const block of relatedBlocks) {
        // Marcar que os dados deste bloco vieram desta tese
        // (aproximação: usar os campos do bloco que correspondem a fatos)
        for (const entry of entriesMap.values()) {
          if (entry.generatedArguments.includes(argId) && !entry.generatedBlocks.includes(block.id)) {
            entry.generatedBlocks.push(block.id);
          }
        }
      }
    }
  }

  // ============================================================
  // 6. DOCUMENTO FINAL — Contar ocorrências de cada valor
  // ============================================================
  for (const entry of entriesMap.values()) {
    if (entry.originalValue && typeof entry.originalValue === 'string' && entry.originalValue.length > 2) {
      // Buscar ocorrências do valor no documento (case-insensitive)
      const regex = new RegExp(entry.originalValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = finalDocument.match(regex);
      entry.documentOccurrences = matches ? matches.length : 0;
    }
  }

  // ============================================================
  // 7. Campos derivados do sistema (datas atuais, etc.)
  // ============================================================
  const systemFields = [
    { path: 'system.currentDate', value: new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) },
    { path: 'system.caseId', value: canonicalCase?.id },
  ];
  for (const sys of systemFields) {
    entriesMap.set(sys.path, {
      field: sys.path,
      valueHash: hashValue(sys.value),
      originalValue: String(sys.value),
      source: 'system',
      usedByRules: [],
      generatedArguments: [],
      generatedBlocks: [],
      documentOccurrences: (finalDocument.match(new RegExp(String(sys.value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length,
      requiredInDocument: true,
      isConditionalFact: false,
    });
  }

  const entries = Array.from(entriesMap.values());

  return {
    caseId: canonicalCase?.id || 'unknown',
    entries,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Verifica se um campo é obrigatório no documento final.
 */
function isRequiredInDocument(fieldPath: string): boolean {
  const requiredFields = [
    'infraction.aitNumber',
    'vehicle.plate',
    'applicant.name',
    'applicant.cpf',
    'applicant.cnh',
    'infraction.autuadorBody',
    'infraction.infractionCode',
    'infraction.ctbArticle',
    'infraction.dateTime',
    'infraction.location',
    'infraction.severity',
    'identification.procedureType',
    'applicant.addressCityState',
  ];
  return requiredFields.some((rf) => fieldPath.includes(rf));
}

/**
 * Verifica se um campo é um fato condicional (específico de categoria).
 */
function isConditionalFact(fieldPath: string): boolean {
  const conditionalPrefixes = [
    'specificFacts.',
    'infraction.speedLimit',
    'infraction.measuredSpeed',
    'infraction.consideredSpeed',
    'infraction.radarEquipmentId',
    'infraction.inmetroAferitionDate',
    'infraction.hasR19SignageProof',
    'infraction.hasRegulatorySign',
    'infraction.hasPsychomotorTerm',
    'infraction.refusedTest',
    'infraction.offeredRetest',
    'infraction.hasAgentDetailedObservations',
    'infraction.cellphoneCircumstance',
    'infraction.yellowPhaseCrossing',
    'infraction.emergencyPassage',
    'infraction.hasPhotoProof',
    'infraction.realDriverName',
    'infraction.realDriverCpf',
    'infraction.realDriverCnh',
    'infraction.indicationWithinDeadline',
  ];
  return conditionalPrefixes.some((cp) => fieldPath.startsWith(cp) || fieldPath === cp);
}

/**
 * Mapeia inputs do RuleEngine para paths do onboarding.
 */
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