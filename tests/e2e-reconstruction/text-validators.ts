/**
 * Validadores de Coerência Textual — E2E Auditoria Textual
 * Compara: entrada → API → UI renderizada → documento persistido
 */

import type {
  SyntheticInputData,
  ApiAnalysisResponse,
  FullRenderedText,
  PersistedDocumentEvidence,
  ValidationResult,
  ForbiddenPatternMatch,
  ComparisonResult,
  ForbiddenPatternRule,
} from './text-audit-types';
import { FORBIDDEN_PATTERNS } from './text-audit-types';
import type { CaseAnalysis, LegalArgumentDomain } from './support';

// ==========================================
// 1. Validação Entrada → API
// ==========================================

export function validateInputVsApi(input: SyntheticInputData, api: ApiAnalysisResponse): ValidationResult[] {
  const results: ValidationResult[] = [];
  const analysis = api.analysis;

  // Verifica se serviceType bate
  results.push({
    path: 'serviceType',
    expected: input.service.procedure,
    actual: analysis.recommendedProcedure,
    match: analysis.recommendedProcedure === input.service.procedure,
    severity: 'error',
    context: 'Procedimento recomendado deve corresponder ao serviço selecionado no onboarding',
  });

  // Verifica campos da infração no caseId
  if (analysis.infractionClassification) {
    results.push({
      path: 'infractionClassification.family',
      expected: input.service.categoryId,
      actual: analysis.infractionClassification.family,
      match: analysis.infractionClassification.family.includes(input.service.categoryId.replace('_', '')),
      severity: 'warning',
      context: 'Família da infração classificada deve ser compatível com categoria selecionada',
    });
  }

  // Verifica dataGaps esperados baseados nos campos não preenchidos
  const expectedGaps = getExpectedDataGaps(input);
  for (const gap of expectedGaps) {
    const found = analysis.dataGaps?.some((g) => g.missingData.includes(gap));
    results.push({
      path: `dataGaps[${gap}]`,
      expected: `dataGap para ${gap}`,
      actual: found ? 'presente' : 'ausente',
      match: !!found,
      severity: 'warning',
      context: `Campo ${gap} não preenchido na entrada → deveria gerar dataGap`,
    });
  }

  // Verifica se overallSuccessRate é null quando não há teses
  if (analysis.recommendedArguments.length === 0 && analysis.overallSuccessRate !== null) {
    results.push({
      path: 'overallSuccessRate',
      expected: 'null (sem teses detectadas)',
      actual: String(analysis.overallSuccessRate),
      match: false,
      severity: 'error',
      context: 'Sem teses recomendadas, overallSuccessRate deve ser null',
    });
  }

  // Verifica summaryReasoning condicional
  if (analysis.recommendedArguments.length === 0 && analysis.summaryReasoning) {
    const hasGapMention = analysis.dataGaps && analysis.dataGaps.length > 0;
    results.push({
      path: 'summaryReasoning',
      expected: hasGapMention ? 'mensagem apenas sobre dataGaps' : 'ausente ou apenas dataGaps',
      actual: analysis.summaryReasoning.slice(0, 100),
      match: hasGapMention,
      severity: 'warning',
      context: 'summaryReasoning só deve aparecer se houver teses OU dataGaps',
    });
  }

  return results;
}

function getExpectedDataGaps(input: SyntheticInputData): string[] {
  const gaps: string[] = [];
  const specific = input.specificAnswers;

  // Regras que exigem dados específicos
  if (input.service.categoryId === 'excesso_velocidade') {
    if (!specific.inmetroAferitionDate) gaps.push('inmetroAferitionDate');
    if (!specific.hasR19SignageProof) gaps.push('hasR19SignageProof');
    if (!specific.speedLimit || !specific.measuredSpeed) gaps.push('speedData');
  }
  if (input.service.categoryId === 'lei_seca') {
    if (specific.hasPsychomotorTerm === undefined) gaps.push('hasPsychomotorTerm');
    if (specific.refusedTest && specific.offeredRetest === undefined) gaps.push('offeredRetest');
  }
  if (input.service.categoryId === 'celular') {
    if (specific.hasAgentDetailedObservations === undefined) gaps.push('hasAgentDetailedObservations');
  }
  if (input.service.categoryId === 'vermelho') {
    if (specific.hasPhotoProof === undefined) gaps.push('hasPhotoProof');
    if (specific.yellowPhaseCrossing === undefined) gaps.push('yellowPhaseCrossing');
  }
  if (input.service.categoryId === 'estacionamento') {
    if (specific.hasRegulatorySign === undefined) gaps.push('hasRegulatorySign');
  }
  if (input.service.categoryId === 'conversao_advertencia') {
    if (specific.hasPreviousInfractionsLast12Months === undefined) gaps.push('hasPreviousInfractionsLast12Months');
  }
  if (input.service.categoryId === 'indicacao_condutor') {
    if (!specific.realDriverName) gaps.push('realDriverName');
    if (!specific.realDriverCpf) gaps.push('realDriverCpf');
    if (!specific.realDriverCnh) gaps.push('realDriverCnh');
    if (specific.indicationWithinDeadline === undefined) gaps.push('indicationWithinDeadline');
  }

  // Dados gerais
  if (!input.notificationExpeditionDate) gaps.push('notificationExpeditionDate');
  if (!input.notificationDeliveryDate) gaps.push('notificationDeliveryDate');
  if (!input.defenseDeadline) gaps.push('defenseDeadline');

  return [...new Set(gaps)];
}

// ==========================================
// 2. Validação API → Renderizado
// ==========================================

export function validateApiVsRendered(api: ApiAnalysisResponse, rendered: FullRenderedText): ValidationResult[] {
  const results: ValidationResult[] = [];
  const analysis = api.analysis;

  // 1. Header — AIT e placa
  results.push({
    path: 'rendered.header.aitNumber',
    expected: analysis.caseId ? 'presente' : 'ausente', // caseId não é AIT, mas AIT vem do input
    actual: rendered.analysisResult.header.aitNumber,
    match: rendered.analysisResult.header.aitNumber !== 'N/A' && rendered.analysisResult.header.aitNumber.length > 0,
    severity: 'error',
    context: 'AIT number deve aparecer no header do resultado',
  });

  results.push({
    path: 'rendered.header.plate',
    expected: 'placa do input',
    actual: rendered.analysisResult.header.plate,
    match: rendered.analysisResult.header.plate !== 'N/A' && rendered.analysisResult.header.plate.length >= 7,
    severity: 'error',
    context: 'Placa do veículo deve aparecer no header',
  });

  // 2. Strength Indicator — overallSuccessRate
  const apiRate = analysis.overallSuccessRate;
  const renderedRate = rendered.analysisResult.strengthIndicator.rate;
  results.push({
    path: 'strengthIndicator.rate',
    expected: apiRate === null ? 'null (—)' : `${apiRate}%`,
    actual: renderedRate === null ? 'null (—)' : `${renderedRate}%`,
    match: apiRate === renderedRate,
    severity: 'error',
    context: 'Taxa de sucesso exibida deve ser idêntica à da API',
  });

  // 3. Mensagem de strength — não pode prometer resultado
  const strengthMsg = rendered.analysisResult.strengthIndicator.message;
  const forbiddenInStrength = checkForbiddenPatterns(strengthMsg, 'strengthIndicator.message');
  for (const f of forbiddenInStrength) {
    results.push({
      path: 'strengthIndicator.message',
      expected: 'sem padrões proibidos',
      actual: f.foundIn,
      match: false,
      severity: f.severity,
      context: `Padrão proibido: ${f.pattern} — ${f.context}`,
    });
  }

  // 4. Cards de tese — correspondência com recommendedArguments
  const apiArgs = analysis.recommendedArguments;
  const renderedCards = rendered.analysisResult.summaryCards;

  // Deve haver no máximo 4 cards (top 3 + talvez mais)
  results.push({
    path: 'summaryCards.count',
    expected: `${Math.min(apiArgs.length, 4)} cards`,
    actual: `${renderedCards.length} cards`,
    match: renderedCards.length > 0 && renderedCards.length <= Math.max(apiArgs.length, 4),
    severity: 'error',
    context: 'Número de cards deve corresponder às teses recomendadas (máx 4 exibidos)',
  });

  // Cada card renderizado deve ter título correspondente a uma tese da API
  // A UI usa títulos de exibição (govBrExplanations.title) enquanto a API usa títulos formais
  // Mapeamento conhecido: ARG-005 UI="Conferência da velocidade considerada pelo INMETRO" vs API="Erro de Enquadramento..."
  const UI_TITLE_MAP: Record<string, string> = {
    'Conferência da velocidade considerada pelo INMETRO': 'ARG-005',
    'O radar estava com a medição válida na data da infração?': 'ARG-001',
    'Existia placa de velocidade no local?': 'ARG-002',
    'Dá para trocar esta multa por advertência (sem pagar e sem pontos)?': 'ARG-051',
  };
  
  for (let i = 0; i < renderedCards.length; i++) {
    const card = renderedCards[i];
    // Tenta mapear pelo título UI conhecido, senão pelo legalBase
    const argIdFromUI = UI_TITLE_MAP[card.title];
    const argIdFromLegalBase = card.legalBase.split(' ').pop(); // ex: "Res. CONTRAN 798/2020, Anexo II" -> "II"
    const matchedArg = apiArgs.find((a) => 
      (argIdFromUI && a.id === argIdFromUI) || 
      a.title === card.title ||
      (argIdFromLegalBase && a.legalBase.includes(argIdFromLegalBase))
    );
    
    results.push({
      path: `summaryCards[${i}].title`,
      expected: matchedArg ? matchedArg.title : 'tese da API',
      actual: card.title,
      match: !!matchedArg,
      severity: 'error',
      context: `Card ${i+1} deve corresponder a uma tese em recommendedArguments (UI title: "${card.title}")`,
    });

    if (matchedArg) {
      // legalBase
      results.push({
        path: `summaryCards[${i}].legalBase`,
        expected: matchedArg.legalBase,
        actual: card.legalBase,
        match: card.legalBase.includes(matchedArg.legalBase.split(',')[0]) || card.legalBase.includes(matchedArg.legalBase.split(' ')[0]),
        severity: 'warning',
        context: 'Base legal do card deve conter a referência da tese original',
      });

      // evidenceResult prefixos devem condizer com dataGaps
      const evidencePrefix = getEvidencePrefix(card.evidenceResult);
      const expectedPrefix = inferExpectedPrefix(matchedArg.id, analysis.dataGaps);
      results.push({
        path: `summaryCards[${i}].evidenceResult.prefix`,
        expected: expectedPrefix,
        actual: evidencePrefix,
        match: evidencePrefix === expectedPrefix || expectedPrefix === 'UNKNOWN',
        severity: 'warning',
        context: `Prefixo do evidenceResult (${evidencePrefix}) deve condizer com dataGaps para ${matchedArg.id}`,
      });

      // confidenceLevel derivado corretamente
      const expectedConfidence = deriveConfidenceLevel(evidencePrefix);
      results.push({
        path: `summaryCards[${i}].confidenceLevel`,
        expected: expectedConfidence,
        actual: card.confidenceLevel,
        match: card.confidenceLevel === expectedConfidence,
        severity: 'warning',
        context: 'Nível de confiança deve derivar do prefixo do evidenceResult',
      });
    }
  }

  // 5. nextSteps — deve mencionar defenseDeadline real se conhecido
  if (api.analysis.procedureDeadline) {
    const deadlineStr = api.analysis.procedureDeadline.split('T')[0];
    const mentionsDeadline = rendered.analysisResult.nextSteps.some((s) => s.includes(deadlineStr));
    results.push({
      path: 'nextSteps.deadline',
      expected: `menciona prazo ${deadlineStr}`,
      actual: rendered.analysisResult.nextSteps.join(' | '),
      match: mentionsDeadline,
      severity: 'error',
      context: 'Próximos passos devem citar o prazo real da notificação quando conhecido',
    });
  }

  // 6. dataCompleteness — se presente, deve bater com API
  if (rendered.analysisResult.dataCompleteness && analysis.dataCompleteness) {
    const rdc = rendered.analysisResult.dataCompleteness;
    const adc = analysis.dataCompleteness;
    results.push({
      path: 'dataCompleteness.ratio',
      expected: `${adc.ratio}%`,
      actual: `${rdc.ratio}%`,
      match: rdc.ratio === adc.ratio,
      severity: 'warning',
      context: 'Ratio de completude exibido deve ser idêntico ao da API',
    });
  }

  // 7. Verifica forbidden patterns em todos os textos renderizados
  const allRenderedText = extractAllRenderedText(rendered);
  const forbiddenMatches = checkForbiddenPatterns(allRenderedText, 'full-rendered');
  for (const f of forbiddenMatches) {
    results.push({
      path: 'rendered.forbidden',
      expected: 'sem padrões proibidos',
      actual: f.foundIn,
      match: false,
      severity: f.severity,
      context: f.context,
    });
  }

  return results;
}

function getEvidencePrefix(evidenceResult: string): string {
  if (evidenceResult.startsWith('VENCIDO:')) return 'VENCIDO';
  if (evidenceResult.startsWith('ATENDIDO:')) return 'ATENDIDO';
  if (evidenceResult.startsWith('EM_DIA:') || evidenceResult.startsWith('EM DIA:')) return 'EM_DIA';
  if (evidenceResult.startsWith('PRESENTE:')) return 'PRESENTE';
  if (evidenceResult.startsWith('VALIDADO:')) return 'VALIDADO';
  if (evidenceResult.startsWith('SEM_DADOS:')) return 'SEM_DADOS';
  if (evidenceResult.startsWith('AUSENCIA:')) return 'AUSENCIA';
  if (evidenceResult.startsWith('NAO_APLICA:')) return 'NAO_APLICA';
  if (evidenceResult.startsWith('DIVERGENCIA:')) return 'DIVERGENCIA';
  return 'UNKNOWN';
}

function inferExpectedPrefix(argId: string, dataGaps?: CaseAnalysis['dataGaps']): string {
  const gapForArg = dataGaps?.find((g) => g.ruleId === argId.replace('ARG-', 'RULE_') || g.missingData.some((m) => m.toLowerCase().includes(argId.toLowerCase())));
  if (gapForArg) return 'SEM_DADOS';
  
  // Heurística baseada no ID da tese
  if (argId === 'ARG-001') return 'VENCIDO'; // precisa inmetroAferitionDate
  if (argId === 'ARG-002') return 'AUSENCIA'; // precisa hasR19SignageProof
  if (argId === 'ARG-005') return 'VALIDADO'; // precisa speed data
  if (argId === 'ARG-051') return 'ATENDIDO'; // precisa hasPreviousInfractionsLast12Months
  return 'UNKNOWN';
}

function deriveConfidenceLevel(prefix: string): string {
  if (['VENCIDO', 'ATENDIDO'].includes(prefix)) return 'Muito Alto';
  if (['EM_DIA', 'PRESENTE', 'VALIDADO'].includes(prefix)) return 'Alto';
  if (['SEM_DADOS', 'AUSENCIA'].includes(prefix)) return 'Médio';
  if (['NAO_APLICA', 'DIVERGENCIA'].includes(prefix)) return 'Baixo';
  return 'Baixo';
}

// ==========================================
// 3. Validação Renderizado → Persistido
// ==========================================

export function validateRenderedVsPersisted(
  rendered: FullRenderedText,
  persisted: PersistedDocumentEvidence
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const draft = persisted.defenseDraft;

  // Teses no documento === recommendedArguments da análise
  const docArgIds = draft.selectedArgumentIds || [];
  const renderedTitles = rendered.analysisResult.summaryCards.map((c) => c.title);
  
  // Busca títulos no documento final
  for (const title of renderedTitles) {
    const found = draft.finalDraft?.includes(title) || draft.canonicalDraft?.includes(title);
    results.push({
      path: `persisted.defenseDraft.tese[${title}]`,
      expected: 'presente no documento',
      actual: found ? 'encontrado' : 'NÃO ENCONTRADO',
      match: !!found,
      severity: 'error',
      context: `Tese "${title}" exibida na UI deve aparecer no documento final`,
    });
  }

  // Qualificação do requerente
  if (rendered.qualification?.formValues) {
    const q = rendered.qualification.formValues;
    const checks = [
      { key: '#input-applicant-name', label: 'nome' },
      { key: '#input-applicant-cpf', label: 'CPF' },
      { key: '#input-applicant-cnh', label: 'CNH' },
      { key: '#input-address-street', label: 'endereço' },
    ];
    for (const c of checks) {
      const val = q[c.key];
      const found = draft.finalDraft?.includes(val) || draft.canonicalDraft?.includes(val);
      results.push({
        path: `persisted.defenseDraft.qualificacao.${c.label}`,
        expected: val || 'preenchido',
        actual: found ? 'encontrado' : 'NÃO ENCONTRADO',
        match: !val || !!found,
        severity: 'error',
        context: `Dado de qualificação (${c.label}) deve constar no documento`,
      });
    }
  }

  // Órgão destinatário
  if (rendered.review?.sections.enquadramento['Órgão Destinatário']) {
    const orgao = rendered.review.sections.enquadramento['Órgão Destinatário'];
    const found = draft.finalDraft?.includes(orgao) || draft.canonicalDraft?.includes(orgao);
    results.push({
      path: 'persisted.defenseDraft.orgaoDestinatario',
      expected: orgao,
      actual: found ? 'encontrado' : 'NÃO ENCONTRADO',
      match: !!found,
      severity: 'error',
      context: 'Órgão autuador deve ser o destinatário da peça',
    });
  }

  // Quality Gate passou
  if (draft.qualityGateReport) {
    results.push({
      path: 'persisted.qualityGateReport.overallPass',
      expected: 'true',
      actual: String(draft.qualityGateReport.overallPass),
      match: draft.qualityGateReport.overallPass === true,
      severity: 'error',
      context: 'Documento só deve ser entregue se Quality Gate passar',
    });
  }

  return results;
}

// ==========================================
// 4. Verificação de Padrões Proibidos
// ==========================================

export function checkForbiddenPatterns(text: string, context: string): ForbiddenPatternMatch[] {
  const matches: ForbiddenPatternMatch[] = [];

  for (const rule of FORBIDDEN_PATTERNS) {
    let match: RegExpExecArray | null;
    // Usa o pattern diretamente se já for RegExp, senão cria com flags corretas
    const regex = rule.pattern instanceof RegExp 
      ? new RegExp(rule.pattern.source, rule.pattern.flags + (rule.pattern.flags.includes('g') ? '' : 'g'))
      : new RegExp(rule.pattern, 'gi');
    
    while ((match = regex.exec(text)) !== null) {
      const start = Math.max(0, match.index - 50);
      const end = Math.min(text.length, match.index + match[0].length + 50);
      const surrounding = text.slice(start, end);
      
      // Verifica se está em contexto permitido
      let allowed = false;
      if (rule.allowedContexts) {
        for (const ac of rule.allowedContexts) {
          if (ac.check(surrounding)) {
            allowed = true;
            break;
          }
        }
      }

      if (!allowed) {
        matches.push({
          pattern: rule.pattern instanceof RegExp ? rule.pattern.source : rule.pattern,
          foundIn: match[0],
          context: `${context}: ...${surrounding}...`,
          allowedInContext: false,
        });
      }
    }
  }

  return matches;
}

// ==========================================
// 5. Extração de Texto Completo
// ==========================================

function extractAllRenderedText(rendered: FullRenderedText): string {
  const parts: string[] = [];

  // Identification
  parts.push(...rendered.identification.labels);
  parts.push(...Object.values(rendered.identification.values));
  parts.push(rendered.identification.buttonText);
  parts.push(...rendered.identification.helperTexts);

  // Specific Questions
  parts.push(rendered.specificQuestions.categoryBanner);
  parts.push(...rendered.specificQuestions.questions);
  parts.push(...Object.values(rendered.specificQuestions.answers));
  parts.push(rendered.specificQuestions.buttonText);
  parts.push(...rendered.specificQuestions.helperTexts);

  // Processing
  parts.push(rendered.processing.headerTitle);
  parts.push(rendered.processing.headerDescription);
  parts.push(...rendered.processing.stages.map((s) => s.label));

  // Analysis Result
  parts.push(rendered.analysisResult.header.badge);
  parts.push(rendered.analysisResult.header.title);
  parts.push(rendered.analysisResult.header.aitNumber);
  parts.push(rendered.analysisResult.header.plate);
  if (rendered.analysisResult.header.phone) parts.push(rendered.analysisResult.header.phone);
  parts.push(rendered.analysisResult.strengthIndicator.label);
  parts.push(rendered.analysisResult.strengthIndicator.message);
  for (const card of rendered.analysisResult.summaryCards) {
    parts.push(card.title);
    parts.push(card.legalBase);
    parts.push(card.whatWeChecked);
    parts.push(card.lawExplanation);
    parts.push(card.evidenceResult);
    parts.push(card.userImpact);
    parts.push(card.confidenceLevel);
    parts.push(card.confidenceReason);
  }
  if (rendered.analysisResult.dataCompleteness) {
    parts.push(...rendered.analysisResult.dataCompleteness.missingCriticalFields);
  }
  parts.push(...rendered.analysisResult.nextSteps);
  parts.push(rendered.analysisResult.ctaButtons.saveToDashboard);
  parts.push(rendered.analysisResult.ctaButtons.proceedToDocument);

  // Qualification
  if (rendered.qualification) {
    parts.push(rendered.qualification.bannerText);
    parts.push(rendered.qualification.preservedData.plate);
    parts.push(rendered.qualification.preservedData.ait);
    parts.push(rendered.qualification.preservedData.orgao);
    parts.push(...rendered.qualification.formLabels);
    parts.push(...Object.values(rendered.qualification.formValues));
    parts.push(rendered.qualification.buttonText);
  }

  // Review
  if (rendered.review) {
    parts.push(rendered.review.header);
    parts.push(...Object.values(rendered.review.sections.enquadramento));
    parts.push(...rendered.review.sections.tesesInclusas);
    for (const ev of rendered.review.sections.evidenciasNecessarias) {
      parts.push(ev.requisito);
      parts.push(ev.status);
      parts.push(...ev.argIds);
    }
    parts.push(...Object.values(rendered.review.sections.qualificacao));
    parts.push(rendered.review.guaranteeBadge);
    parts.push(rendered.review.buttons.editQualification);
    parts.push(rendered.review.buttons.proceedToPayment);
  }

  // Checkout
  if (rendered.checkout) {
    parts.push(rendered.checkout.header);
    for (const item of rendered.checkout.orderSummary.items) {
      parts.push(item.label);
      parts.push(item.value);
    }
    for (const pb of rendered.checkout.orderSummary.priceBreakdown) {
      parts.push(pb.label);
      parts.push(pb.value);
    }
    parts.push(rendered.checkout.orderSummary.finalPrice);
    parts.push(rendered.checkout.orderSummary.guaranteeText);
    parts.push(...rendered.checkout.paymentMethodTabs);
    if (rendered.checkout.pixSection) {
      parts.push(rendered.checkout.pixSection.qrCodeAlt);
      parts.push(rendered.checkout.pixSection.copyPasteLabel);
      parts.push(rendered.checkout.pixSection.copyPasteValue);
      parts.push(rendered.checkout.pixSection.confirmButtonText);
      if (rendered.checkout.pixSection.payError) parts.push(rendered.checkout.pixSection.payError);
    }
    if (rendered.checkout.creditCardSection) {
      parts.push(...rendered.checkout.creditCardSection.formLabels);
      parts.push(rendered.checkout.creditCardSection.confirmButtonText);
      if (rendered.checkout.creditCardSection.error) parts.push(rendered.checkout.creditCardSection.error);
    }
    parts.push(rendered.checkout.backButton);
  }

  return parts.join(' ');
}

// ==========================================
// 6. Agregador Principal
// ==========================================

export function runFullComparison(
  input: SyntheticInputData,
  api: ApiAnalysisResponse,
  rendered: FullRenderedText,
  persisted?: PersistedDocumentEvidence
): ComparisonResult {
  const inputVsApi = validateInputVsApi(input, api);
  const apiVsRendered = validateApiVsRendered(api, rendered);
  const renderedVsPersisted = persisted ? validateRenderedVsPersisted(rendered, persisted) : [];
  const allText = extractAllRenderedText(rendered);
  const forbiddenPatterns = checkForbiddenPatterns(allText, 'full-comparison');

  const allChecks = [...inputVsApi, ...apiVsRendered, ...renderedVsPersisted];
  const passed = allChecks.filter((c) => c.match).length;
  const errors = allChecks.filter((c) => !c.match && c.severity === 'error').length;
  const warnings = allChecks.filter((c) => !c.match && c.severity === 'warning').length;
  const blocked = allChecks.filter((c) => !c.match && c.severity === 'info').length;

  return {
    inputVsApi,
    apiVsRendered,
    renderedVsPersisted,
    forbiddenPatterns,
    summary: {
      totalChecks: allChecks.length,
      passed,
      warnings,
      errors,
      blocked,
    },
  };
}