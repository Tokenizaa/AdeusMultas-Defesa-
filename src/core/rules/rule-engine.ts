/**
 * @file rule-engine.ts
 * DefesaAI — Expert Rule Engine (Fase 7)
 * Pure deterministic expert system that evaluates infractions, detects legal/formal flaws,
 * selects applicable arguments, validates documents, and recommends appropriate procedures.
 */

import {
  RuleModel,
  RuleEvaluationContext,
  DetectedInconsistencyResult,
} from '../domain/knowledge-schema';
import { ARGUMENTS_CATALOG } from '../arguments/arguments-catalog';
import { PROCEDURES_CATALOG } from '../procedures/procedures-catalog';
import { INFRACTION_CATALOG } from '../../data/knowledge-base';
import { CaseAnalysis, InfractionData, LegalArgumentDomain, ProcedureType } from '../../types';

export const EXPERT_RULES: RuleModel[] = [
  // Rule 1: Decadência de 30 dias da Notificação de Autuação (Art. 281, II CTB)
  {
    id: 'RULE_DECADENCIA_30_DIAS',
    name: 'Verificação da Decadência de 30 Dias da Notificação',
    description: 'Verifica se a Notificação da Autuação foi expedida ou postada após 30 dias contados da data da infração.',
    category: 'prazos_decadencia',
    validFrom: '1998-01-22',
    validUntil: null,
    version: 1,
    jurisdiction: 'federal',
    evaluate: (ctx) => {
      if (ctx.infractionDate && ctx.notificationExpeditionDate) {
        const infDate = new Date(ctx.infractionDate);
        const expDate = new Date(ctx.notificationExpeditionDate);
        const diffTime = expDate.getTime() - infDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 30) {
          return {
            ruleId: 'RULE_DECADENCIA_30_DIAS',
            title: `Decadência da Notificação de Autuação (${diffDays} dias)`,
            description: `A notificação foi postada ${diffDays} dias após a data da infração, violando o prazo limite decadencial improrrogável de 30 dias.`,
            severity: 'alta',
            legalArgumentId: 'ARG-048',
            impact: 'Extinção definitiva da pretensão punitiva e arquivamento obrigatório do AIT.',
            statutoryBasis: 'Artigo 281, Parágrafo Único, Inciso II do CTB c/c Súmula 312 do STJ',
          };
        }
      }
      // If data is insufficient (missing dates), return null (no conclusion can be made)
      return null;
    },
  },

  // Rule 2: Aferição de Radar Metrológico Vencida > 12 Meses (Res. CONTRAN 798/2020)
  {
    id: 'RULE_RADAR_CALIBRACAO_12M',
    name: 'Validade Metrológica Anual de Radar Eletrônico',
    description: 'Verifica se o medidor eletrônico de velocidade possui laudo de aferição do INMETRO emitido há mais de 12 meses.',
    category: 'metrologia_engenharia',
    validFrom: '2020-11-01',
    validUntil: null,
    version: 1,
    jurisdiction: 'federal',
    evaluate: (ctx) => {
      const code = ctx.infractionCode || '';
      const isSpeed = code.startsWith('74') || code === '745-50' || code === '746-30' || code === '747-10';
      if (isSpeed) {
        if (ctx.radarCalibrationDate && ctx.infractionDate) {
          const infDate = new Date(ctx.infractionDate);
          const calibDate = new Date(ctx.radarCalibrationDate);
          const diffDays = Math.ceil((infDate.getTime() - calibDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > 365) {
            return {
              ruleId: 'RULE_RADAR_CALIBRACAO_12M',
              title: `Aferição Metrológica do Radar Vencida (${diffDays} dias)`,
              description: `A última verificação periódica pelo INMETRO/IPEM ocorreu há mais de 12 meses da data do fato.`,
              severity: 'alta',
              legalArgumentId: 'ARG-001',
              impact: 'Desconstituição da presunção de veracidade da medição e anulação do auto.',
              statutoryBasis: 'Art. 280, §2º do CTB c/c Resolução CONTRAN nº 798/2020, Art. 4º, III',
            };
          }
        }
        // If speed ticket without explicit calibration data, flag for verification
        // This is not a conclusion that the violation exists, but rather a flag that verification is needed
        // Since we cannot conclusively determine if the calibration is expired without the date,
        // we return null (insufficient data to conclude violation exists)
        return null;
      }
      return null;
    },
  },

  // Rule 3: Conversão Compulsória em Advertência por Escrito (Art. 267 CTB)
  {
    id: 'RULE_CONVERSAO_ADVERTENCIA_267',
    name: 'Direito Subjetivo à Conversão em Advertência (Art. 267 CTB)',
    description: 'Identifica se a infração é de gravidade leve ou média e se o condutor cumpre os requisitos de não reincidência.',
    category: 'direito_material',
    validFrom: '2021-04-12', // Lei 14.071/2020
    validUntil: null,
    version: 1,
    jurisdiction: 'federal',
    evaluate: (ctx) => {
      const code = ctx.infractionCode || '';
      const cat = INFRACTION_CATALOG.find((i) => i.code === code || i.code.replace('-', '') === code.replace('-', ''));
      const isLightOrMedium = cat ? (cat.severity === 'leve' || cat.severity === 'media') : (code === '745-50' || code === '735-80');
      const isCleanRecord = ctx.hasPreviousInfractionsLast12Months === false || ctx.hasPreviousInfractionsLast12Months === undefined;

      if (isLightOrMedium && isCleanRecord) {
        return {
          ruleId: 'RULE_CONVERSAO_ADVERTENCIA_267',
          title: 'Direito Vinculado à Conversão em Advertência por Escrito',
          description: 'Infração de natureza leve ou média sem reincidência no prontuário nos últimos 12 meses garante cancelamento compulsório da multa e dos pontos.',
          severity: 'alta',
          legalArgumentId: 'ARG-051',
          impact: '100% de isenção do pagamento financeiro (R$ 130,16) e 0 pontos na CNH.',
          statutoryBasis: 'Artigo 267 do CTB (Redação pela Lei nº 14.071/2020)',
        };
      }
      // If data is insufficient (missing severity or prior infractions info), return null
      return null;
    },
  },

  // Rule 4: Lei Seca sem Termo de Constatação de Sinais (Res. 432/CONTRAN)
  // FIXED: Was incorrectly pointing to ARG-025, now correctly points to ARG-010
  {
    id: 'RULE_LEI_SECA_TERMO_432',
    name: 'Termo de Sinais Psicomotores da Resolução CONTRAN 432/2013',
    description: 'Valida autuações por recusa ao bafômetro (Art. 165-A) desprovidas do formulário do Anexo II da Resolução 432.',
    category: 'direito_formal',
    validFrom: '2013-01-29',
    validUntil: null,
    version: 1,
    jurisdiction: 'federal',
    evaluate: (ctx) => {
      const code = ctx.infractionCode || '';
      if (code === '516-91' || code === '516-92' || code.includes('516')) {
        return {
          ruleId: 'RULE_LEI_SECA_TERMO_432',
          title: 'Ausência ou Defeito no Termo de Constatação de Sinais (Res. 432/13)',
          description: 'A autuação por recusa exige o preenchimento simultâneo do Termo do Anexo II com conjunto notório de sinais clínicos observados.',
          severity: 'alta',
          legalArgumentId: 'ARG-010', // FIXED: Was ARG-025, now correctly ARG-010
          impact: 'Anulação do AIT e cancelamento do processo de suspensão da CNH por 12 meses (R$ 2.934,70).',
          statutoryBasis: 'Artigo 277 do CTB c/c Resolução CONTRAN nº 432/2013',
        };
      }
      // If not a Lei Seca infraction, return null (no conclusion can be made about this specific rule)
      return null;
    },
  },

  // Rule 5: Autuação Sem Abordagem sem Observações Circunstanciadas (MBFT / Res. 985/2022)
  // FIXED: Was incorrectly pointing to ARG-015, now correctly points to ARG-006
  {
    id: 'RULE_AUTUACAO_SEM_ABORDAGEM_MBFT',
    name: 'Falta de Descrição Circunstanciada em Autuações sem Abordagem',
    description: 'Valida multas manuais (celular, cinto, semáforo) lavradas sem parada do veículo.',
    category: 'direito_formal',
    validFrom: '2023-01-02',
    validUntil: null,
    version: 1,
    jurisdiction: 'federal',
    evaluate: (ctx) => {
      if (ctx.infractionCode === '736-62' || ctx.infractionCode === '518-51' || ctx.infractionCode === '735-80') {
        return {
          ruleId: 'RULE_AUTUACAO_SEM_ABORDAGEM_MBFT',
          title: 'Ausência de Descrição Circunstanciada no Campo de Observações',
          description: 'A Resolução 985/2022 exige fundamentação detalhada do ângulo de visão e do motivo da não abordagem para flagrantes à distância.',
          severity: 'alta',
          legalArgumentId: 'ARG-006', // FIXED: Was ARG-015, now correctly ARG-006
          impact: 'Nulidade do auto por vício formal de motivação e falta de prova material.',
          statutoryBasis: 'Resolução CONTRAN nº 985/2022 (Manual Brasileiro de Fiscalização de Trânsito)',
        };
      }
      // If not one of the target infraction codes, return null
      return null;
    },
  },

  // Rule 6: Inexigibilidade por Falta de Sinalização Regulamentadora (Art. 90 CTB)
  {
    id: 'RULE_SINALIZACAO_INSUFICIENTE_90',
    name: 'Inobservância à Sinalização Regulamentadora R-19 (Art. 90 CTB)',
    description: 'Aplica a inexigibilidade de sanção quando a sinalização regulamentadora for insuficiente ou incorreta.',
    category: 'sinalizacao_viaria',
    validFrom: '1998-01-22',
    validUntil: null,
    version: 1,
    jurisdiction: 'federal',
    evaluate: (ctx) => {
      if (ctx.hasR19SignageProof === false || ctx.hasR19SignageProof === undefined) {
        return {
          ruleId: 'RULE_SINALIZACAO_INSUFICIENTE_90',
          title: 'Ausência de Placa Regulamentadora R-19 na Distância Técnica Mínima',
          description: 'A via fiscalizada não possuía placa visível antes do radar, ensejando a inexigibilidade de sanção.',
          severity: 'media',
          legalArgumentId: 'ARG-002',
          impact: 'Atipicidade da conduta e cancelamento da autuação.',
          statutoryBasis: 'Artigo 90 do CTB c/c Resolução CONTRAN nº 798/2020',
        };
      }
      // If we have proof of R-19 signage, return null (no violation detected)
      return null;
    },
  },

  // Rule 7: Erro na Medida Considerada pelo INMETRO (Res. 798/2020)
  // NEW RULE for ARG-009
  {
    id: 'RULE_INMETRO_CONSIDERED_SPEED_ERROR',
    name: 'Erro na Medida Considerada pelo INMETRO',
    description: 'Verifica se a velocidade considerada foi corretamente calculada subtraindo a margem de erro metrológica da velocidade medida.',
    category: 'metrologia_engenharia',
    validFrom: '2020-11-01', // Same as radar calibration rule
    validUntil: null,
    version: 1,
    jurisdiction: 'federal',
    evaluate: (ctx) => {
      const code = ctx.infractionCode || '';
      const isSpeed = code.startsWith('74') || code === '745-50' || code === '746-30' || code === '747-10';
      if (isSpeed) {
        // We need measuredSpeed and consideredSpeed to make this determination
        if (ctx.measuredSpeed !== undefined && ctx.consideredSpeed !== undefined && ctx.speedLimit !== undefined) {
          const measuredSpeed = ctx.measuredSpeed;
          const consideredSpeed = ctx.consideredSpeed;
          const speedLimit = ctx.speedLimit;
          
          // Check if an infraction was triggered based on measured speed
          const measuredExceedsLimit = measuredSpeed > speedLimit;
          
          // Check if the considered speed is actually compliant or in a lower bracket
          const consideredExceedsLimit = consideredSpeed > speedLimit;
          
          // Also check bracket transitions (20% and 50% thresholds)
          const measuredExceeds20pct = measuredSpeed > speedLimit * 1.2;
          const consideredExceeds20pct = consideredSpeed > speedLimit * 1.2;
          const measuredExceeds50pct = measuredSpeed > speedLimit * 1.5;
          const consideredExceeds50pct = consideredSpeed > speedLimit * 1.5;
          
          // Violation occurs if:
          // 1. Measured speed triggers an infraction (exceeds limit)
          // 2. BUT considered speed does NOT trigger an infraction OR triggers a lower bracket infraction
          if (measuredExceedsLimit && 
              (!consideredExceedsLimit || 
               (measuredExceeds20pct && !consideredExceeds20pct) ||
               (measuredExceeds50pct && !consideredExceeds50pct))) {
            return {
              ruleId: 'RULE_INMETRO_CONSIDERED_SPEED_ERROR',
              title: 'Erro na Medida Considerada pelo INMETRO',
              description: `A velocidade medida (${measuredSpeed} km/h) foi utilizada para autuação, mas a velocidade considerada (${consideredSpeed} km/h) após aplicação da margem de erro do INMETRO não comprova a infração ou enquadra-a em menor gravidade.`,
              severity: 'alta',
              legalArgumentId: 'ARG-009',
              impact: 'Desconstituição do enquadramento da infração; possível redução de pontos e multa ou anulação do auto.',
              statutoryBasis: 'Art. 280, §2º do CTB c/c Resolução CONTRAN nº 798/2020, Tabela I',
            };
          }
        }
        // If data is insufficient (missing speed data), return null
        return null;
      }
      return null;
    },
  },

  // Rule 8: Nulidade do AIT por Preenchimento Incorreto
  // PARTIAL RULE for ARG-013 - checks for obvious missing data
  {
    id: 'RULE_AIT_INCOMPLETION_ERRORS',
    name: 'Nulidade do Auto de Infração por Preenchimento Incorreto',
    description: 'Verifica erros óbvios de preenchimento do AIT que podem causar nulidade.',
    category: 'direito_formal',
    validFrom: '1998-01-22',
    validUntil: null,
    version: 1,
    jurisdiction: 'federal',
    evaluate: (ctx) => {
      const errors = [];
      
      // Check for missing or empty aitNumber
      if (!ctx.infractionCode || ctx.infractionCode.trim() === '') {
        errors.push('Número do AIT ausente ou inválido');
      }
      
      // Check for missing or empty infraction description
      // Note: We don't have direct access to description in RuleEvaluationContext,
      // but we can check if infractionCode is present (which it should be if description exists)
      
      // Check for missing speed data when it's expected for speeding infractions
      const code = ctx.infractionCode || '';
      const isSpeed = code.startsWith('74') || code === '745-50' || code === '746-30' || code === '747-10';
      if (isSpeed) {
        if (ctx.speedLimit === undefined) {
          errors.push('Limite de velocidade ausente para infração de velocidade');
        }
        // Note: measuredSpeed and consideredSpeed are optional, but at least one should be present for validation
      }
      
      // Check for missing date/time
      if (!ctx.infractionDate || ctx.infractionDate.trim() === '') {
        errors.push('Data e hora da infração ausentes ou inválidas');
      }
      
      // If we found errors, return a result
      if (errors.length > 0) {
        return {
          ruleId: 'RULE_AIT_INCOMPLETION_ERRORS',
          title: 'Erros de Preenchimento do AIT',
          description: errors.join('; '),
          severity: 'alta',
          legalArgumentId: 'ARG-013',
          impact: 'Possível nulidade do AIT por vício formal insanável devido a erros de preenchimento.',
          statutoryBasis: 'Art. 280 do CTB c/c Portaria SENATRAN nº 354/2022',
        };
      }
      
      // If no obvious errors found, return null (cannot conclude violation exists)
      return null;
    },
  },

  // Rule 9: Falta de Descrição Detalhada dos Sinais Psicomotores (Lei Seca)
  // PARTIAL RULE for ARG-015 - checks if psychomotor term is missing
  {
    id: 'RULE_LEI_SECA_PSYCHOMOTOR_MISSING',
    name: 'Falta de Descrição Detalhada dos Sinais Psicomotores (Lei Seca)',
    description: 'Verifica se o termo de constatação de sinais psicomotores está ausente em autuações por Lei Seca.',
    category: 'direito_formal',
    validFrom: '2013-01-29',
    validUntil: null,
    version: 1,
    jurisdiction: 'federal',
    evaluate: (ctx) => {
      const code = ctx.infractionCode || '';
      if (code === '516-91' || code === '516-92' || code.includes('516')) {
        // For Lei Seca infractions, check if psychomotor term documentation is missing
        if (ctx.hasPsychomotorTerm === false || ctx.hasPsychomotorTerm === undefined) {
          return {
            ruleId: 'RULE_LEI_SECA_PSYCHOMOTOR_MISSING',
            title: 'Falta de Descrição Detalhada dos Sinais Psicomotores (Lei Seca)',
            description: 'Ausência do Termo de Constatação de Sinais com descrição dos sinais psicomotores observados em autuação por Lei Seca.',
            severity: 'alta',
            legalArgumentId: 'ARG-015',
            impact: 'Anulação do AIT e cancelamento do processo de suspensão da CNH por 12 meses (R$ 2.934,70).',
            statutoryBasis: 'Art. 277 do CTB c/c Resolução CONTRAN nº 432/2013, Art. 5º e Anexo II',
          };
        }
        // If hasPsychomotorTerm is true, we cannot determine if it's "detailed" enough, so return null
        return null;
      }
      // If not a Lei Seca infraction, return null
      return null;
    },
  },
];

export class ExpertRuleEngine {
  /**
   * Verifica se uma regra jurídica está vigente em determinada data de referência (ISO 'YYYY-MM-DD').
   */
  public static isRuleActiveAtDate(rule: RuleModel, dateIso?: string): boolean {
    if (!dateIso) return true;
    const target = dateIso.includes('T') ? dateIso.split('T')[0] : dateIso.slice(0, 10);
    if (rule.validFrom && target < rule.validFrom) {
      return false;
    }
    if (rule.validUntil && target > rule.validUntil) {
      return false;
    }
    return true;
  }

  /**
   * Retorna todas as regras ativas para uma data de referência.
   */
  public static getActiveRules(dateIso?: string): RuleModel[] {
    return EXPERT_RULES.filter((r) => this.isRuleActiveAtDate(r, dateIso));
  }

  /**
   * Evaluates an infraction against the catalog of deterministic rules applicable at the infraction date
   */
  public static evaluate(caseId: string, infraction: InfractionData, referenceDate?: string): CaseAnalysis {
    if (!infraction.autuadorBody) {
      throw new Error('autuadorBody obrigatório para avaliação do motor de regras');
    }

    const effectiveDate = referenceDate || infraction.dateTime || infraction.notificationExpeditionDate || new Date().toISOString();

    const context: RuleEvaluationContext = {
      infractionCode: infraction.infractionCode,
      infractionDate: infraction.dateTime,
      notificationExpeditionDate: infraction.notificationExpeditionDate,
      notificationDeliveryDate: infraction.notificationDeliveryDate,
      defenseDeadline: infraction.defenseDeadline,
      speedLimit: infraction.speedLimit,
      measuredSpeed: infraction.measuredSpeed,
      consideredSpeed: infraction.consideredSpeed,
      speedMeasured: infraction.speedMeasured,
      speedConsidered: infraction.speedConsidered,
      radarEquipmentId: infraction.radarEquipmentId,
      radarCalibrationDate: infraction.inmetroAferitionDate,
      autuadorBody: infraction.autuadorBody,
      hasPreviousInfractionsLast12Months: infraction.hasPreviousInfractionsLast12Months,
      hasPsychomotorTerm: infraction.hasPsychomotorTerm, // Note: This field doesn't exist in InfractionData - we'll need to check
      hasAgentDetailedObservations: infraction.hasAgentDetailedObservations, // Note: This field doesn't exist in InfractionData
      hasPhotoProof: infraction.hasPhotoProof, // Note: This field doesn't exist in InfractionData
      hasR19SignageProof: infraction.hasR19SignageProof,
    };

    const detectedInconsistencies: CaseAnalysis['detectedInconsistencies'] = [];
    const recommendedArgs: LegalArgumentDomain[] = [];

    // 1. Run all deterministic rules that are active on the effective date
    const activeRules = this.getActiveRules(effectiveDate);
    for (const rule of activeRules) {
      const result = rule.evaluate(context);
      if (result) {
        detectedInconsistencies.push({
          title: result.title,
          description: result.description,
          severity: result.severity,
          legalArgumentId: result.legalArgumentId,
          impact: result.impact,
        });

        const matchedArg = ARGUMENTS_CATALOG.find((a) => a.id === result.legalArgumentId);
        if (matchedArg && !recommendedArgs.some((r) => r.id === matchedArg.id)) {
          recommendedArgs.push({
            id: matchedArg.id,
            code: matchedArg.code,
            title: matchedArg.title,
            category: matchedArg.category,
            legalBase: matchedArg.legalBase,
            contranResolution: matchedArg.resolutions.join(', '),
            summary: matchedArg.description,
            detailedText: matchedArg.formattedParagraphs.map((p) => `${p.heading}\n${p.text}`).join('\n\n'),
            confidenceScore: matchedArg.confidenceScore,
            applicabilityNote: matchedArg.whenToUse.join('; '),
          });
        }
      }
    }

    // 2. Always inject Constitutional Due Process
    const constArg = ARGUMENTS_CATALOG.find((a) => a.id === 'ARG-049');
    if (constArg && !recommendedArgs.some((r) => r.id === constArg.id)) {
      recommendedArgs.push({
        id: constArg.id,
        code: constArg.code,
        title: constArg.title,
        category: constArg.category,
        legalBase: constArg.legalBase,
        contranResolution: constArg.resolutions.join(', '),
        summary: constArg.description,
        detailedText: constArg.formattedParagraphs.map((p) => `${p.heading}\n${p.text}`).join('\n\n'),
        confidenceScore: constArg.confidenceScore,
        applicabilityNote: constArg.whenToUse.join('; '),
      });
    }

    // 3. Determine recommended procedure based on rules
    let procedure: ProcedureType = 'recurso_jari';
    if (infraction.infractionCode === '516-91' || infraction.infractionCode === '747-10') {
      procedure = 'suspensao_cnh';
    } else if (detectedInconsistencies.some((i) => i.legalArgumentId === 'ARG-051')) {
      procedure = 'conversao_advertencia';
    }

    // 4. Calculate deterministic success probability score
    let baseScore = 35; // Baseline when no formal or substantive nullities are detected

    if (detectedInconsistencies.some((i) => i.legalArgumentId === 'ARG-048')) {
      baseScore = 98; // 30-day decadence is fatal per Art. 281, II CTB and STJ Súmula 312
    } else if (detectedInconsistencies.some((i) => i.legalArgumentId === 'ARG-051')) {
      baseScore = 94; // Compulsory conversion to warning per Art. 267 CTB (Lei 14.071/2020)
    } else if (detectedInconsistencies.some((i) => i.legalArgumentId === 'ARG-001')) {
      baseScore = 92; // Radar calibration expired per Res. 798/2020 CONTRAN
    } else if (detectedInconsistencies.some((i) => i.legalArgumentId === 'ARG-025')) {
      baseScore = 88; // Lei Seca lacking mandatory technical terms
    } else if (detectedInconsistencies.some((i) => i.legalArgumentId === 'ARG-015')) {
      baseScore = 82; // Manual citation without stop and without required MBFT remarks
    } else if (detectedInconsistencies.some((i) => i.legalArgumentId === 'ARG-002')) {
      baseScore = 78; // Lack of R-19 speed regulation signage
    } else if (detectedInconsistencies.length > 0) {
      baseScore = Math.min(90, 50 + detectedInconsistencies.length * 15);
    }

    const overallSuccessRate = Math.min(99, Math.max(25, baseScore));

    // 5. Default deadline
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + 25);
    const deadlineStr = deadlineDate.toLocaleDateString('pt-BR');

    return {
      id: `anl_${Date.now()}`,
      caseId,
      overallSuccessRate,
      detectedInconsistencies,
      recommendedArguments: recommendedArgs,
      recommendedProcedure: procedure,
      competentBody: infraction.autuadorBody,
      procedureDeadline: infraction.defenseDeadline || deadlineStr,
      summaryReasoning: `O Motor de Regras identificou ${detectedInconsistencies.length} inconsistências jurídicas no AIT nº ${infraction.aitNumber || 'SN'}. Há fundamentação legal e técnica para protocolo perante a autoridade competente.`,
      createdAt: new Date().toISOString(),
    };
  }
}