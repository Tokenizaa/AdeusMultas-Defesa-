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
      return null;
    },
  },

  // Rule 2: Aferição de Radar Metrológico Vencida > 12 Meses (Res. CONTRAN 798/2020)
  {
    id: 'RULE_RADAR_CALIBRACAO_12M',
    name: 'Validade Metrológica Anual de Radar Eletrônico',
    description: 'Verifica se o medidor eletrônico de velocidade possui laudo de aferição do INMETRO emitido há mais de 12 meses.',
    category: 'metrologia_engenharia',
    evaluate: (ctx) => {
      const isSpeed = ctx.infractionCode.startsWith('74') || ctx.infractionCode === '745-50' || ctx.infractionCode === '746-30' || ctx.infractionCode === '747-10';
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
        return {
          ruleId: 'RULE_RADAR_CALIBRACAO_12M',
          title: 'Obrigatoriedade de Aferição Periódica Anual pelo INMETRO',
          description: 'A autuação por radar exige comprovação de verificação metrológica periódica nos últimos 12 meses na data do evento.',
          severity: 'alta',
          legalArgumentId: 'ARG-001',
          impact: 'Nulidade absoluta do AIT caso o laudo do INMETRO não esteja válido no dia da infração.',
          statutoryBasis: 'Resolução CONTRAN nº 798/2020, Art. 4º, III e Portaria INMETRO nº 158/2022',
        };
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
    evaluate: (ctx) => {
      const cat = INFRACTION_CATALOG.find((i) => i.code === ctx.infractionCode || i.code.replace('-', '') === ctx.infractionCode.replace('-', ''));
      const isLightOrMedium = cat ? (cat.severity === 'leve' || cat.severity === 'media') : (ctx.infractionCode === '745-50' || ctx.infractionCode === '735-80');
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
      return null;
    },
  },

  // Rule 4: Lei Seca sem Termo de Constatação de Sinais (Res. 432/CONTRAN)
  {
    id: 'RULE_LEI_SECA_TERMO_432',
    name: 'Termo de Sinais Psicomotores da Resolução CONTRAN 432/2013',
    description: 'Valida autuações por recusa ao bafômetro (Art. 165-A) desprovidas do formulário do Anexo II da Resolução 432.',
    category: 'direito_formal',
    evaluate: (ctx) => {
      if (ctx.infractionCode === '516-91' || ctx.infractionCode === '516-92' || ctx.infractionCode.includes('516')) {
        return {
          ruleId: 'RULE_LEI_SECA_TERMO_432',
          title: 'Ausência ou Defeito no Termo de Constatação de Sinais (Res. 432/13)',
          description: 'A autuação por recusa exige o preenchimento simultâneo do Termo do Anexo II com conjunto notório de sinais clínicos observados.',
          severity: 'alta',
          legalArgumentId: 'ARG-025',
          impact: 'Anulação do AIT e cancelamento do processo de suspensão da CNH por 12 meses (R$ 2.934,70).',
          statutoryBasis: 'Artigo 277 do CTB c/c Resolução CONTRAN nº 432/2013',
        };
      }
      return null;
    },
  },

  // Rule 5: Autuação Sem Abordagem sem Observações Circunstanciadas (MBFT / Res. 985/2022)
  {
    id: 'RULE_AUTUACAO_SEM_ABORDAGEM_MBFT',
    name: 'Falta de Descrição Circunstanciada em Autuações sem Abordagem',
    description: 'Valida multas manuais (celular, cinto, semáforo) lavradas sem parada do veículo.',
    category: 'direito_formal',
    evaluate: (ctx) => {
      if (ctx.infractionCode === '736-62' || ctx.infractionCode === '518-51' || ctx.infractionCode === '735-80') {
        return {
          ruleId: 'RULE_AUTUACAO_SEM_ABORDAGEM_MBFT',
          title: 'Ausência de Descrição Circunstanciada no Campo de Observações',
          description: 'A Resolução 985/2022 exige fundamentação detalhada do ângulo de visão e do motivo da não abordagem para flagrantes à distância.',
          severity: 'alta',
          legalArgumentId: 'ARG-015',
          impact: 'Nulidade do auto por vício formal de motivação e falta de prova material.',
          statutoryBasis: 'Resolução CONTRAN nº 985/2022 (Manual Brasileiro de Fiscalização de Trânsito)',
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
      return null;
    },
  },
];

export class ExpertRuleEngine {
  /**
   * Evaluates an infraction against the entire catalog of deterministic rules
   */
  public static evaluate(caseId: string, infraction: InfractionData): CaseAnalysis {
    const context: RuleEvaluationContext = {
      infractionCode: infraction.infractionCode,
      infractionDate: infraction.dateTime,
      notificationExpeditionDate: infraction.notificationExpeditionDate,
      defenseDeadline: infraction.defenseDeadline,
      speedLimit: infraction.speedLimit,
      measuredSpeed: infraction.measuredSpeed,
      consideredSpeed: infraction.consideredSpeed,
      radarEquipmentId: infraction.radarEquipmentId,
      radarCalibrationDate: infraction.inmetroAferitionDate,
      autuadorBody: infraction.autuadorBody,
      hasPreviousInfractionsLast12Months: infraction.hasPreviousInfractionsLast12Months,
      hasR19SignageProof: infraction.hasR19SignageProof,
    };

    const detectedInconsistencies: CaseAnalysis['detectedInconsistencies'] = [];
    const recommendedArgs: LegalArgumentDomain[] = [];

    // 1. Run all deterministic rules
    for (const rule of EXPERT_RULES) {
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
      competentBody: infraction.autuadorBody || 'DETRAN / JARI',
      procedureDeadline: infraction.defenseDeadline || deadlineStr,
      summaryReasoning: `O Motor de Regras identificou ${detectedInconsistencies.length} inconsistências jurídicas no AIT nº ${infraction.aitNumber || 'SN'}. Há fundamentação legal e técnica para protocolo perante a autoridade competente.`,
      createdAt: new Date().toISOString(),
    };
  }
}
