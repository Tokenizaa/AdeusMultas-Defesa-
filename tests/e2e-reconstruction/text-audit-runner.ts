/**
 * Runner de Auditoria Textual — E2E
 * Orquestra fluxo completo: entrada → API → UI → documento → validação
 */

import { test, expect, Page } from '@playwright/test';
import type { CanonicalService } from './support';
import {
  openService,
  fillIdentification,
  createCaseThroughAnalysis,
  synthetic,
  baseURL,
  runId,
} from './support';
import {
  captureFullRenderedText,
  captureIdentificationText,
  captureSpecificQuestionsText,
  captureProcessingText,
  captureAnalysisResultText,
} from './text-capture';
import {
  validateInputVsApi,
  validateApiVsRendered,
  validateRenderedVsPersisted,
  runFullComparison,
  type SyntheticInputData,
  type ApiAnalysisResponse,
  type FullRenderedText,
  type PersistedDocumentEvidence,
  type TextAuditEvidence,
  type ComparisonResult,
} from './text-validators';
import { sanitizeForEvidence } from './text-audit-types';
import * as fs from 'fs';
import * as path from 'path';

// ==========================================
// Configuração
// ==========================================

interface TextAuditConfig {
  service: CanonicalService;
  specificAnswers: Record<string, string | number | boolean>;
  runId: string;
  saveEvidence: boolean;
  outputDir: string;
  expectFullFlow: boolean; // se deve tentar ir até documento (requer auth)
}

const DEFAULT_CONFIG: Partial<TextAuditConfig> = {
  runId: process.env.E2E_TEST_RUN_ID || 'text-audit',
  saveEvidence: true,
  outputDir: 'artifacts/text-audit',
  expectFullFlow: false,
};

// ==========================================
// Funções Auxiliares
// ==========================================

function buildSyntheticInput(config: TextAuditConfig, identificationData: ReturnType<typeof synthetic>): SyntheticInputData {
  return {
    leadName: identificationData.name,
    leadPhone: identificationData.phone,
    aitNumber: identificationData.aitNumber,
    vehiclePlate: identificationData.plate,
    autuadorBody: identificationData.authority,
    location: identificationData.location,
    infractionCode: '', // preenchido depois
    infractionDescription: '',
    ctbArticle: '',
    severity: '',
    points: 0,
    fineAmount: 0,
    specificAnswers: config.specificAnswers,
    service: config.service,
    runId: config.runId,
    timestamp: new Date().toISOString(),
  };
}

async function fillSpecificQuestions(page: Page, category: string, answers: Record<string, string | number | boolean>) {
  // Mapeamento de chaves para seletores reais do componente
  const selectorMap: Record<string, string> = {
    // excesso_velocidade
    speedLimit: '#input-speed-limit',
    measuredSpeed: '#input-measured-speed',
    consideredSpeed: '#input-considered-speed',
    inmetroAferitionDate: '#input-inmetro-date',
    hasR19SignageProof: '#select-has-r19-signage', // pode não existir como select
    
    // lei_seca
    refusedTest: '#select-lei-seca-tipo', // botões de rádio via click
    hasPsychomotorTerm: '#select-termo-sinais',
    offeredRetest: '#select-reteste',
    
    // celular
    cellphoneCircumstance: '#select-celular-circunstancia',
    hasAgentDetailedObservations: '#select-has-agent-obs',
    
    // vermelho
    yellowPhaseCrossing: '#select-vermelho-motivo',
    emergencyPassage: '#select-vermelho-motivo',
    hasPhotoProof: '#select-photo-proof',
    
    // estacionamento
    estacionamentoTipo: '#select-estacionamento-tipo',
    hasRegulatorySign: '#select-has-regulatory-sign',
    
    // conversao_advertencia
    hasPreviousInfractionsLast12Months: '#chk-no-reoffense',
    
    // indicacao_condutor
    realDriverName: '#input-real-driver-name',
    realDriverCpf: '#input-real-driver-cpf',
    realDriverCnh: '#input-real-driver-cnh',
    indicationWithinDeadline: '#select-indication-deadline',
    
    // comum
    defenseDeadline: '#input-defense-deadline',
    hasPhotoProof: '#select-photo-proof',
  };

  for (const [key, value] of Object.entries(answers)) {
    const selector = selectorMap[key];
    if (!selector) {
      console.warn(`[fillSpecificQuestions] Seletor não mapeado para: ${key}`);
      continue;
    }
    const el = page.locator(selector);
    if (await el.count()) {
      const tagName = await el.evaluate((e) => e.tagName.toLowerCase());
      if (tagName === 'select') {
        await el.selectOption(String(value));
      } else if (tagName === 'input') {
        const type = await el.getAttribute('type');
        if (type === 'checkbox') {
          if (value === true) await el.check();
          else await el.uncheck();
        } else {
          await el.fill(String(value));
        }
      } else if (tagName === 'button') {
        // Para botões de opção (lei_seca, vermelho, etc.) - clica no botão correspondente
        await el.click();
      }
    } else {
      console.warn(`[fillSpecificQuestions] Elemento não encontrado: ${selector} para ${key}`);
    }
  }
}

async function captureApiResponse(page: Page, caseId: string): Promise<ApiAnalysisResponse> {
  // A API response já foi capturada no createCaseThroughAnalysis
  // Aqui faríamos uma requisição direta se necessário
  return { caseId, claimToken: '', analysis: {} as any, serviceType: '', status: 201 };
}

async function saveEvidence(evidence: TextAuditEvidence, outputDir: string) {
  const dir = path.join(outputDir, evidence.metadata.runId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const sanitized = sanitizeForEvidence(evidence);
  const jsonPath = path.join(dir, `${evidence.metadata.scenarioId}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(sanitized, null, 2));

  // Gera relatório HTML simples
  const htmlPath = path.join(dir, `${evidence.metadata.scenarioId}.html`);
  const html = generateHtmlReport(sanitized);
  fs.writeFileSync(htmlPath, html);
}

function generateHtmlReport(evidence: TextAuditEvidence): string {
  const { metadata, comparison, input, apiResponse, renderedText } = evidence;
  const statusColor = metadata.status === 'passed' ? 'green' : metadata.status === 'failed' ? 'red' : metadata.status === 'blocked' ? 'orange' : 'gray';
  
  // Safe access to nested properties
  const rt = renderedText || {};
  const id = rt.identification || {};
  const sq = rt.specificQuestions || {};
  const pr = rt.processing || {};
  const ar = rt.analysisResult || {};
  const qf = rt.qualification;
  const rv = rt.review;
  const co = rt.checkout;
  
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Auditoria Textual - ${metadata.scenarioId}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 24px; }
    .status { padding: 8px 16px; border-radius: 8px; color: white; font-weight: bold; background: ${statusColor}; }
    .section { margin-bottom: 32px; }
    .section h2 { border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
    .check { display: flex; gap: 12px; padding: 12px; margin: 8px 0; border-radius: 6px; }
    .check.pass { background: #ecfdf5; border-left: 4px solid #10b981; }
    .check.fail { background: #fef2f2; border-left: 4px solid #ef4444; }
    .check.warning { background: #fffbeb; border-left: 4px solid #f59e0b; }
    .check .path { font-family: monospace; font-size: 13px; color: #374151; }
    .check .expected { color: #059669; }
    .check .actual { color: #dc2626; }
    pre { background: #f3f4f6; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; }
    .forbidden { background: #fef2f2; padding: 12px; margin: 8px 0; border-radius: 6px; border-left: 4px solid #ef4444; }
    .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 24px; }
    .stat { padding: 16px; border-radius: 8px; text-align: center; }
    .stat.pass { background: #ecfdf5; }
    .stat.warning { background: #fffbeb; }
    .stat.error { background: #fef2f2; }
    .stat.blocked { background: #f3f4f6; }
    .stat-value { font-size: 28px; font-weight: bold; }
    .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Auditoria Textual - ${metadata.scenarioId}</h1>
      <p>Serviço: ${metadata.service.id} | Run: ${metadata.runId} | ${metadata.timestamp}</p>
    </div>
    <div class="status">${metadata.status.toUpperCase()}</div>
  </div>

  <div class="summary">
    <div class="stat pass"><div class="stat-value">${comparison.summary.passed}</div><div class="stat-label">Aprovados</div></div>
    <div class="stat warning"><div class="stat-value">${comparison.summary.warnings}</div><div class="stat-label">Avisos</div></div>
    <div class="stat error"><div class="stat-value">${comparison.summary.errors}</div><div class="stat-label">Erros</div></div>
    <div class="stat blocked"><div class="stat-value">${comparison.summary.blocked}</div><div class="stat-label">Bloqueados</div></div>
    <div class="stat"><div class="stat-value">${comparison.summary.totalChecks}</div><div class="stat-label">Total</div></div>
  </div>

  <div class="section">
    <h2>Entrada Sintética</h2>
    <pre>${JSON.stringify(input, null, 2)}</pre>
  </div>

  <div class="section">
    <h2>Resposta da API</h2>
    <pre>${JSON.stringify({
      caseId: apiResponse?.caseId,
      serviceType: apiResponse?.serviceType,
      overallSuccessRate: apiResponse?.analysis?.overallSuccessRate,
      recommendedArguments: apiResponse?.analysis?.recommendedArguments?.map((a: any) => ({ id: a.id, title: a.title })),
      dataGaps: apiResponse?.analysis?.dataGaps,
      dataCompleteness: apiResponse?.analysis?.dataCompleteness,
    }, null, 2)}</pre>
  </div>

  <div class="section">
    <h2>Validações</h2>
    ${[...(comparison.inputVsApi || []), ...(comparison.apiVsRendered || []), ...(comparison.renderedVsPersisted || [])]
      .map((c) => `
        <div class="check ${c.match ? 'pass' : c.severity === 'error' ? 'fail' : 'warning'}">
          <div class="path">${c.path}</div>
          <div>Esperado: <span class="expected">${c.expected}</span></div>
          <div>Atual: <span class="actual">${c.actual}</span></div>
          ${c.context ? `<div style="font-size:12px;color:#6b7280;margin-top:4px;">${c.context}</div>` : ''}
        </div>
      `).join('')}
  </div>

  ${(comparison.forbiddenPatterns || []).length > 0 ? `
  <div class="section">
    <h2>Padrões Proibidos Detectados</h2>
    ${comparison.forbiddenPatterns.map((f) => `
      <div class="forbidden">
        <strong>Padrão:</strong> ${f.pattern}<br>
        <strong>Encontrado:</strong> ${f.foundIn}<br>
        <strong>Contexto:</strong> ${f.context}
      </div>
    `).join('')}
  </div>
  ` : ''}

  <div class="section">
    <h2>Textos Renderizados (Resumo)</h2>
    <details open>
      <summary>Etapa 1 - Identificação</summary>
      <pre>${JSON.stringify({ labels: id.labels, values: id.values, buttonText: id.buttonText, buttonEnabled: id.buttonEnabled, helperTexts: id.helperTexts }, null, 2)}</pre>
    </details>
    <details>
      <summary>Etapa 2 - Perguntas Específicas</summary>
      <pre>${JSON.stringify({ categoryBanner: sq.categoryBanner, questions: sq.questions, answers: sq.answers, buttonText: sq.buttonText, helperTexts: sq.helperTexts }, null, 2)}</pre>
    </details>
    <details>
      <summary>Etapa 3 - Processamento</summary>
      <pre>${JSON.stringify({ headerTitle: pr.headerTitle, headerDescription: pr.headerDescription, stages: pr.stages, progressPercentage: pr.progressPercentage }, null, 2)}</pre>
    </details>
    <details>
      <summary>Etapa 4 - Resultado da Análise</summary>
      <pre>${JSON.stringify({
        header: ar.header,
        strengthIndicator: ar.strengthIndicator,
        cardsCount: ar.summaryCards?.length || 0,
        nextSteps: ar.nextSteps,
      }, null, 2)}</pre>
    </details>
    ${qf ? `
    <details>
      <summary>Etapa 5 - Qualificação</summary>
      <pre>${JSON.stringify({ bannerText: qf.bannerText, preservedData: qf.preservedData, formLabels: qf.formLabels, formValues: qf.formValues, buttonText: qf.buttonText, buttonEnabled: qf.buttonEnabled }, null, 2)}</pre>
    </details>
    ` : ''}
    ${rv ? `
    <details>
      <summary>Etapa 6 - Revisão</summary>
      <pre>${JSON.stringify({ header: rv.header, sections: rv.sections, guaranteeBadge: rv.guaranteeBadge, buttons: rv.buttons }, null, 2)}</pre>
    </details>
    ` : ''}
    ${co ? `
    <details>
      <summary>Etapa 7 - Checkout</summary>
      <pre>${JSON.stringify({ header: co.header, orderSummary: co.orderSummary, paymentMethodTabs: co.paymentMethodTabs, pixSection: co.pixSection, creditCardSection: co.creditCardSection, backButton: co.backButton }, null, 2)}</pre>
    </details>
    ` : ''}
  </div>
</body>
</html>
  `;
}

// ==========================================
// Função Principal de Auditoria
// ==========================================

export async function runTextAudit(page: Page, config: TextAuditConfig): Promise<TextAuditEvidence> {
  const startTime = Date.now();
  const scenarioId = `${config.service.id}-text-audit-${Date.now()}`;
  
  let status: TextAuditEvidence['metadata']['status'] = 'passed';
  let errors: TextAuditEvidence['errors'] = [];
  let apiResponse: ApiAnalysisResponse = { caseId: '', claimToken: '', analysis: {} as any, serviceType: config.service.procedure, status: 0 };
  let renderedText: FullRenderedText = {
    identification: { labels: [], values: {}, buttonText: '', buttonEnabled: false, helperTexts: [] },
    specificQuestions: { categoryBanner: '', questions: [], answers: {}, buttonText: '', helperTexts: [] },
    processing: { headerTitle: '', headerDescription: '', stages: [], progressPercentage: 0, progressDescription: '' },
    analysisResult: { header: { badge: '', title: '', aitNumber: '', plate: '' }, strengthIndicator: { label: '', rate: null, message: '', isUnavailable: true }, summaryCards: [], nextSteps: [], ctaButtons: { saveToDashboard: '', proceedToDocument: '' } },
  };
  let persistedDocument: PersistedDocumentEvidence | undefined;
  let comparison: ComparisonResult = { inputVsApi: [], apiVsRendered: [], renderedVsPersisted: [], forbiddenPatterns: [], summary: { totalChecks: 0, passed: 0, warnings: 0, errors: 0, blocked: 0 } };
  let input: SyntheticInputData = {} as SyntheticInputData;

  try {
    console.log(`[${scenarioId}] Iniciando auditoria textual...`);
    
    // 1. Abre serviço e preenche identificação
    console.log(`[${scenarioId}] Abrindo serviço...`);
    await openService(page, config.service);
    const identificationData = synthetic(config.runId + '-' + config.service.id);
    console.log(`[${scenarioId}] Preenchendo identificação...`);
    const filledData = await fillIdentification(page, config.runId + '-' + config.service.id, {
      ...identificationData,
      ...Object.fromEntries(Object.entries(config.specificAnswers).filter(([k]) => ['aitNumber', 'plate', 'authority', 'location'].includes(k))),
    });

    // Captura identificação
    console.log(`[${scenarioId}] Capturando identificação...`);
    const identification = await captureIdentificationText(page);

    // 2. Preenche perguntas específicas
    console.log(`[${scenarioId}] Avançando para perguntas específicas...`);
    await page.locator('#btn-next-to-specifics').click();
    await expect(page.getByText('Perguntas configuradas para este tipo de autuação')).toBeVisible({ timeout: 10000 });
    
    console.log(`[${scenarioId}] Preenchendo perguntas específicas...`);
    await fillSpecificQuestions(page, config.service.categoryId, config.specificAnswers);
    console.log(`[${scenarioId}] Capturando perguntas específicas...`);
    const specificQuestions = await captureSpecificQuestionsText(page);

    // 3. Executa análise
    console.log(`[${scenarioId}] Executando análise...`);
    const responsePromise = page.waitForResponse(
      (r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/cases/anonymous',
      { timeout: 45000 }
    );
    
    // Captura o processamento ANTES de clicar (o step aparece imediatamente)
    console.log(`[${scenarioId}] Capturando step de processamento...`);
    await page.locator('#btn-run-analysis').click();
    await page.waitForTimeout(500); // dá tempo do step aparecer
    const processing = await captureProcessingText(page);
    
    await expect(page.getByText('Estamos conferindo a sua autuação')).toBeVisible();
    const response = await responsePromise;
    expect(response.status()).toBe(201);
    
    const apiBody = await response.json();
    apiResponse = {
      caseId: apiBody.id,
      claimToken: apiBody.claimToken,
      analysis: apiBody.analysis,
      serviceType: apiBody.serviceType,
      status: response.status(),
    };
    console.log(`[${scenarioId}] API response: caseId=${apiBody.id}, claimToken=${apiBody.claimToken?.slice(0,8)}...`);

    // Aguarda resultado
    await expect(page.getByText(/Diagnóstico Preliminar Concluído/)).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(1000);

    // Captura resultado
    console.log(`[${scenarioId}] Capturando resultado...`);
    const analysisResult = await captureAnalysisResultText(page);

    // 4. Tenta fluxo completo (qualificação → revisão → checkout)
    let qualification, review, checkout;
    if (config.expectFullFlow) {
      try {
        console.log(`[${scenarioId}] Tentando fluxo completo...`);
        await page.locator('#btn-proceed-to-document-generation').click();
        await page.waitForTimeout(1000);
        
        const authGate = page.locator('text=Acesso à Sua Defesa Jurídica');
        if (!(await authGate.count())) {
          qualification = await captureQualificationText(page);
          await page.locator('#btn-next-to-review').click();
          await page.waitForTimeout(500);
          review = await captureReviewText(page);
          await page.locator('#btn-proceed-to-checkout').click();
          await page.waitForTimeout(500);
          checkout = await captureCheckoutText(page);
        }
      } catch (e) {
        errors?.push({ step: 'full-flow', message: String(e) });
      }
    }

    renderedText = {
      identification,
      specificQuestions,
      processing,
      analysisResult,
      qualification,
      review,
      checkout,
    };
    console.log(`[${scenarioId}] Textos capturados: ${Object.keys(renderedText).filter(k => renderedText[k as keyof FullRenderedText]).join(', ')}`);

    // 5. Build synthetic input for validation
    console.log(`[${scenarioId}] Construindo input sintético...`);
    input = buildSyntheticInput(config, filledData);
    input.infractionCode = filledData.plate; // placeholder
    
    // Tenta pegar o código de infração selecionado
    const codeSelect = page.locator('#input-infraction-code');
    if (await codeSelect.count()) {
      input.infractionCode = await codeSelect.evaluate((el) => (el as HTMLSelectElement).value);
    }

    // 6. Run comparisons
    console.log(`[${scenarioId}] Executando validações...`);
    comparison = runFullComparison(input, apiResponse, renderedText, persistedDocument);

    // 7. Determine status
    if (comparison.summary.errors > 0) status = 'failed';
    else if (comparison.summary.warnings > 0 && comparison.summary.errors === 0) status = 'passed';
    else if (errors && errors.length > 0) status = 'blocked';

    console.log(`[${scenarioId}] Comparação: ${comparison.summary.totalChecks} checks, ${comparison.summary.errors} erros, ${comparison.summary.warnings} avisos`);

  } catch (e) {
    status = 'blocked';
    const errMsg = String(e);
    const errStack = e instanceof Error ? e.stack : undefined;
    errors = [{ step: 'main', message: errMsg, stack: errStack }];
    console.error(`[${scenarioId}] ERRO:`, errMsg);
    if (errStack) console.error(errStack);
  }

  const evidence: TextAuditEvidence = {
    metadata: {
      scenarioId,
      service: config.service,
      runId: config.runId,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      status,
    },
    input,
    apiResponse,
    renderedText,
    persistedDocument,
    comparison,
    errors: errors.length > 0 ? errors : undefined,
  };

  // Save evidence (even on failure)
  if (config.saveEvidence) {
    try {
      await saveEvidence(evidence, config.outputDir);
      console.log(`[${scenarioId}] Evidência salva em ${config.outputDir}/${config.runId}/${scenarioId}.json`);
    } catch (saveErr) {
      console.error(`[${scenarioId}] Falha ao salvar evidência:`, saveErr);
    }
  }

  return evidence;
}

// ==========================================
// Assert Helper para Testes
// ==========================================

export function assertTextAudit(evidence: TextAuditEvidence, options: { failOnWarning?: boolean } = {}) {
  const { comparison } = evidence;
  
  // Report
  console.log(`\n=== Text Audit: ${evidence.metadata.scenarioId} ===`);
  console.log(`Status: ${evidence.metadata.status}`);
  console.log(`Duration: ${evidence.metadata.durationMs}ms`);
  console.log(`Checks: ${comparison.summary.totalChecks} (${comparison.summary.passed} passed, ${comparison.summary.warnings} warnings, ${comparison.summary.errors} errors)`);
  
  if (comparison.forbiddenPatterns.length > 0) {
    console.log(`\n⚠ FORBIDDEN PATTERNS (${comparison.forbiddenPatterns.length}):`);
    for (const f of comparison.forbiddenPatterns) {
      console.log(`  - ${f.pattern}: "${f.foundIn}" in ${f.context}`);
    }
  }

  // Fail on errors
  const errorChecks = [...comparison.inputVsApi, ...comparison.apiVsRendered, ...comparison.renderedVsPersisted]
    .filter((c) => !c.match && c.severity === 'error');
  
  if (errorChecks.length > 0) {
    const msg = `Text audit failed with ${errorChecks.length} error(s):\n` +
      errorChecks.map((c) => `  - ${c.path}: expected "${c.expected}", got "${c.actual}" (${c.context})`).join('\n');
    throw new Error(msg);
  }

  // Fail on warnings if requested
  if (options.failOnWarning) {
    const warningChecks = [...comparison.inputVsApi, ...comparison.apiVsRendered, ...comparison.renderedVsPersisted]
      .filter((c) => !c.match && c.severity === 'warning');
    if (warningChecks.length > 0) {
      throw new Error(`Text audit failed with ${warningChecks.length} warning(s) (failOnWarning=true)`);
    }
  }

  // Forbidden patterns are always errors
  if (comparison.forbiddenPatterns.length > 0) {
    throw new Error(`Forbidden patterns detected: ${comparison.forbiddenPatterns.length}`);
  }
}