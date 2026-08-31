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
    requiredData: ['infractionDate', 'notificationExpeditionDate'],
    relatedArguments: ['ARG-048', 'ARG-049'],
    affectedProcedures: ['defesa_previa', 'recurso_jari', 'recurso_cetran'],
    evidenceRequired: ['Cópia da Notificação da Autuação com data de expedição/postagem', 'Extrato do histórico de notificações'],
    priority: 100,
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
    requiredData: ['infractionDate', 'radarCalibrationDate'],
    relatedArguments: ['ARG-001'],
    affectedProcedures: ['defesa_previa', 'recurso_jari', 'recurso_cetran', 'analise_tecnica'],
    evidenceRequired: ['Certidão do Portal de Serviços do INMETRO (PSInmetro) atestando a data da última verificação'],
    priority: 95,
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
        // FAIL CLOSED: sem a data de aferição não há como concluir o vício —
        // a ausência fica registrada como DATA_INSUFFICIENT pelo motor.
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
    requiredData: ['hasPreviousInfractionsLast12Months'],
    relatedArguments: ['ARG-051'],
    affectedProcedures: ['conversao_advertencia'],
    evidenceRequired: ['Extrato de prontuário e histórico de CNH sem infrações nos últimos 12 meses'],
    priority: 90,
    version: 1,
    jurisdiction: 'federal',
    evaluate: (ctx) => {
      const code = ctx.infractionCode || '';
      const cat = INFRACTION_CATALOG.find((i) => i.code === code || i.code.replace('-', '') === code.replace('-', ''));
      const isLightOrMedium = cat ? (cat.severity === 'leve' || cat.severity === 'media') : (code === '745-50' || code === '735-80');
      // FAIL CLOSED: reincidência é dado obrigatório. undefined => dados insuficientes,
      // tratado pelo motor como DATA_INSUFFICIENT (nunca presumir ficha limpa).
      const isCleanRecord = ctx.hasPreviousInfractionsLast12Months === false;

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
  // Fase 2: somente conclui o vício quando o dado confirma ausência do termo.
  // Tese correta: ARG-025 (termo de sinais psicomotores). A versão anterior
  // apontava ARG-010 (semáforo — amarelo) e concluía sem verificar o dado.
  {
    id: 'RULE_LEI_SECA_TERMO_432',
    name: 'Termo de Sinais Psicomotores da Resolução CONTRAN 432/2013',
    description: 'Valida autuações por recusa ao bafômetro (Art. 165-A) desprovidas do formulário do Anexo II da Resolução 432.',
    category: 'direito_formal',
    validFrom: '2013-01-29',
    validUntil: null,
    version: 2,
    jurisdiction: 'federal',
    requiredData: ['hasPsychomotorTerm'],
    relatedArguments: ['ARG-025'],
    affectedProcedures: ['suspensao_cnh', 'recurso_jari'],
    evidenceRequired: ['Cópia integral do processo administrativo comprovando a ausência do Anexo II da Res. 432/2013'],
    priority: 88,
    evaluate: (ctx) => {
      const code = ctx.infractionCode || '';
      const isLeiSeca = code === '516-91' || code === '516-92' || code.includes('516');
      // FAIL CLOSED: convicção somente se o dado comprovar ausência do termo.
      if (isLeiSeca && ctx.hasPsychomotorTerm === false) {
        return {
          ruleId: 'RULE_LEI_SECA_TERMO_432',
          title: 'Ausência ou Defeito no Termo de Constatação de Sinais (Res. 432/13)',
          description: 'A autuação por recusa exige o preenchimento simultâneo do Termo do Anexo II com conjunto notório de sinais clínicos observados.',
          severity: 'alta',
          legalArgumentId: 'ARG-025',
          impact: 'Anulação do AIT e cancelamento do processo de suspensão da CNH por 12 meses (R$ 2.934,70).',
          statutoryBasis: 'Artigo 277 do CTB c/c Resolução CONTRAN nº 432/2013, Art. 5º e Anexo II',
        };
      }
      return null;
    },
  },

  // Rule 5: Autuação Sem Abordagem sem Observações Circunstanciadas (MBFT / Res. 985/2022)
  // Fase 2: restrita ao código de celular (736-62) cuja tese é ARG-015.
  // A versão anterior apontava ARG-006 (foto com múltiplos veículos) e concluía
  // sem verificar o dado (observações ausentes).
  {
    id: 'RULE_AUTUACAO_SEM_ABORDAGEM_MBFT',
    name: 'Falta de Descrição Circunstanciada em Autuações sem Abordagem',
    description: 'Valida multas manuais (celular) lavradas sem parada do veículo e sem observações circunstanciadas.',
    category: 'direito_formal',
    validFrom: '2023-01-02',
    validUntil: null,
    version: 2,
    jurisdiction: 'federal',
    requiredData: ['hasAgentDetailedObservations'],
    relatedArguments: ['ARG-015'],
    affectedProcedures: ['defesa_previa', 'recurso_jari'],
    evidenceRequired: ['Espelho do Auto de Infração com o campo de observações vago/genérico'],
    priority: 82,
    evaluate: (ctx) => {
      if (ctx.infractionCode === '736-62' && ctx.hasAgentDetailedObservations === false) {
        return {
          ruleId: 'RULE_AUTUACAO_SEM_ABORDAGEM_MBFT',
          title: 'Ausência de Descrição Circunstanciada no Campo de Observações',
          description: 'A Resolução 985/2022 exige fundamentação detalhada do ângulo de visão e do motivo da não abordagem para flagrantes à distância.',
          severity: 'alta',
          legalArgumentId: 'ARG-015',
          impact: 'Nulidade do auto por vício formal de motivação e falta de prova material.',
          statutoryBasis: 'Resolução CONTRAN nº 985/2022 (Manual Brasileiro de Fiscalização de Trânsito), Ficha 736-62',
        };
      }
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
    version: 2,
    jurisdiction: 'federal',
    requiredData: ['hasR19SignageProof'],
    relatedArguments: ['ARG-002', 'ARG-007'],
    affectedProcedures: ['defesa_previa', 'recurso_jari', 'analise_tecnica'],
    evidenceRequired: ['Fotografias do trecho demonstrado ausência/obstrução da placa R-19'],
    priority: 78,
    evaluate: (ctx) => {
      // FAIL CLOSED: sem o dado (undefined) a regra não dispara — vira DATA_INSUFFICIENT.
      if (ctx.hasR19SignageProof === false) {
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
      return null;
    },
  },

  // Rule 7: Erro na Medida Considerada pelo INMETRO (Res. 798/2020)
  // Fase 2: tese correta é ARG-005 (erro de enquadramento por velocidade
  // considerada). A versão anterior apontava ARG-009 (semáforo — foto de retenção).
  {
    id: 'RULE_INMETRO_CONSIDERED_SPEED_ERROR',
    name: 'Erro na Medida Considerada pelo INMETRO',
    description: 'Verifica se a velocidade considerada foi corretamente calculada subtraindo a margem de erro metrológica da velocidade medida.',
    category: 'metrologia_engenharia',
    validFrom: '2020-11-01', // Same as radar calibration rule
    validUntil: null,
    version: 2,
    jurisdiction: 'federal',
    requiredData: ['measuredSpeed', 'consideredSpeed', 'speedLimit'],
    relatedArguments: ['ARG-005'],
    affectedProcedures: ['defesa_previa', 'recurso_jari', 'recurso_cetran'],
    evidenceRequired: ['Cópia da Notificação com os campos de velocidade medida/considerada preenchidos'],
    priority: 85,
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
              legalArgumentId: 'ARG-005',
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
      aitNumber: infraction.aitNumber,
      hasPreviousInfractionsLast12Months: infraction.hasPreviousInfractionsLast12Months,
      hasPsychomotorTerm: infraction.hasPsychomotorTerm,
      hasAgentDetailedObservations: infraction.hasAgentDetailedObservations,
      hasPhotoProof: infraction.hasPhotoProof,
      hasR19SignageProof: infraction.hasR19SignageProof,
    };

    const detectedInconsistencies: CaseAnalysis['detectedInconsistencies'] = [];
    const recommendedArgs: LegalArgumentDomain[] = [];
    const dataGaps: NonNullable<CaseAnalysis['dataGaps']> = [];

    // 1. Run all deterministic rules that are active on the effective date.
    //    FAIL CLOSED (Fase 2): regra com requiredData ausente => DATA_INSUFFICIENT,
    //    nunca vira vício detectado.
    const activeRules = this.getActiveRules(effectiveDate);
    for (const rule of activeRules) {
      const missingData = (rule.requiredData || []).filter((key) => {
        const value = (context as unknown as Record<string, unknown>)[key];
        return value === undefined || value === null || value === '';
      });
      if (missingData.length > 0) {
        dataGaps.push({
          ruleId: rule.id,
          missingData,
          reason: `Não há dados suficientes para avaliar a hipótese "${rule.name}". Sem ${missingData.join(', ')}, a regra não pode concluir pela existência do vício (FAIL CLOSED).`,
        });
        continue;
      }
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
    } else if (detectedInconsistencies.some((i) => i.legalArgumentId === 'ARG-005')) {
      baseScore = 85; // Considered speed after INMETRO tolerance breaks the framing
    } else if (detectedInconsistencies.some((i) => i.legalArgumentId === 'ARG-015')) {
      baseScore = 82; // Manual citation without stop and without required MBFT remarks
    } else if (detectedInconsistencies.some((i) => i.legalArgumentId === 'ARG-002')) {
      baseScore = 78; // Lack of R-19 speed regulation signage
    } else if (detectedInconsistencies.length > 0) {
      baseScore = Math.min(90, 50 + detectedInconsistencies.length * 15);
    }

    const overallSuccessRate = Math.min(99, Math.max(25, baseScore));

    // 5. Prazo: somente o prazo real da notificação. Nenhum prazo inventado
    //    (Fase 2: não usar prazo de outro estado/órgão ou regra como fallback).
    const gapSummary = dataGaps.length > 0
      ? ` Não foi possível avaliar ${dataGaps.length} hipótese(s) por insuficiência de dados (${dataGaps.map((g) => g.missingData.join('+')).join('; ')}).`
      : '';

    return {
      id: `anl_${Date.now()}`,
      caseId,
      overallSuccessRate,
      detectedInconsistencies,
      recommendedArguments: recommendedArgs,
      recommendedProcedure: procedure,
      competentBody: infraction.autuadorBody,
      procedureDeadline: infraction.defenseDeadline,
      dataGaps: dataGaps.length > 0 ? dataGaps : undefined,
      summaryReasoning: `O Motor de Regras identificou ${detectedInconsistencies.length} inconsistências jurídicas no AIT nº ${infraction.aitNumber || 'SN'}. Há fundamentação legal e técnica para protocolo perante a autoridade competente.${gapSummary}`,
      createdAt: new Date().toISOString(),
    };
  }
}