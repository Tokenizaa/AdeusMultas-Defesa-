/**
 * Helpers de Captura de Texto Renderizado — E2E Auditoria Textual
 * Extrai textos do DOM real para validação semântica
 */

import { Page, Locator } from '@playwright/test';
import type {
  IdentificationRenderedText,
  SpecificQuestionsRenderedText,
  ProcessingRenderedText,
  AnalysisResultRenderedText,
  QualificationRenderedText,
  ReviewRenderedText,
  CheckoutRenderedText,
  FullRenderedText,
} from './text-audit-types';

// ==========================================
// Utilitários
// ==========================================

async function getTextSafe(locator: Locator, timeoutMs: number = 3000): Promise<string> {
  try {
    return (await locator.innerText({ timeout: timeoutMs })).trim();
  } catch {
    return '';
  }
}

async function getAllTextsSafe(locator: Locator, timeoutMs: number = 3000): Promise<string[]> {
  try {
    return await locator.allInnerTexts({ timeout: timeoutMs });
  } catch {
    return [];
  }
}

async function getAttributeSafe(locator: Locator, attr: string, timeoutMs: number = 3000): Promise<string> {
  try {
    return (await locator.getAttribute(attr, { timeout: timeoutMs })) || '';
  } catch {
    return '';
  }
}

async function isEnabledSafe(locator: Locator, timeoutMs: number = 3000): Promise<boolean> {
  try {
    return await locator.isEnabled({ timeout: timeoutMs });
  } catch {
    return false;
  }
}

// ==========================================
// Etapa 1 — Identificação
// ==========================================

export async function captureIdentificationText(page: Page): Promise<IdentificationRenderedText> {
  const labels: string[] = [];
  const values: Record<string, string> = {};
  const helperTexts: string[] = [];

  // Labels dos campos - pega o texto completo do label (incluindo spans filhos)
  const labelSelectors = [
    '#input-lead-name',
    '#input-lead-phone',
    '#input-ait-number',
    '#input-vehicle-plate',
    '#input-autuador-body',
    '#input-location',
    '#input-infraction-code',
    '#input-datetime',
    '#input-notification-expedition-date',
    '#input-notification-delivery-date',
    '#input-defense-deadline',
  ];

  for (const sel of labelSelectors) {
    const label = page.locator(`label[for="${sel.replace('#', '')}"]`);
    if (await label.count()) {
      // Pega todo o texto interno do label (inclui spans filhos)
      const text = await getTextSafe(label);
      if (text) labels.push(text);
    }
  }

  // Se labels vazio, tenta pegar dos spans dentro dos labels
  if (labels.length === 0) {
    const labelSpans = page.locator('label span.text-\\[11px\\].font-bold, label span.text-\\[10px\\].font-bold');
    for (const span of await labelSpans.all()) {
      const text = await getTextSafe(span);
      if (text && !labels.includes(text)) labels.push(text);
    }
  }

  // Valores dos campos
  const valueSelectors: Record<string, string> = {
    leadName: '#input-lead-name',
    leadPhone: '#input-lead-phone',
    aitNumber: '#input-ait-number',
    vehiclePlate: '#input-vehicle-plate',
    autuadorBody: '#input-autuador-body',
    location: '#input-location',
    infractionCode: '#input-infraction-code',
    dateTime: '#input-datetime',
    notificationExpeditionDate: '#input-notification-expedition-date',
    notificationDeliveryDate: '#input-notification-delivery-date',
    defenseDeadline: '#input-defense-deadline',
  };

  for (const [key, sel] of Object.entries(valueSelectors)) {
    const el = page.locator(sel);
    if (await el.count()) {
      const tagName = await el.evaluate((el) => el.tagName.toLowerCase());
      if (tagName === 'select') {
        values[key] = await el.evaluate((el) => (el as HTMLSelectElement).value);
      } else {
        values[key] = await el.evaluate((el) => (el as HTMLInputElement).value);
      }
    }
  }

  // Textos auxiliares
  const helperElements = page.locator('span.text-\\[10px\\], span.text-\\[11px\\], p.text-\\[10px\\], p.text-\\[11px\\]');
  for (const h of await helperElements.all()) {
    const text = await getTextSafe(h);
    if (text) helperTexts.push(text);
  }

  // Botão próximo
  const nextBtn = page.locator('#btn-next-to-specifics');
  const buttonText = await getTextSafe(nextBtn);
  const buttonEnabled = await isEnabledSafe(nextBtn);

  return { labels, values, buttonText, buttonEnabled, helperTexts };
}

// ==========================================
// Etapa 2 — Perguntas Específicas
// ==========================================

export async function captureSpecificQuestionsText(page: Page): Promise<SpecificQuestionsRenderedText> {
  const questions: string[] = [];
  const answers: Record<string, string> = {};
  const helperTexts: string[] = [];

  // Banner da categoria
  const categoryBanner = await getTextSafe(page.locator('div.bg-slate-50.border.border-slate-200.rounded-xl').first());

  // Perguntas (labels + inputs/selects dentro do formulário específico)
  const formSection = page.locator('div.space-y-4').first();
  const labels = formSection.locator('label');
  for (const l of await labels.all()) {
    const text = await getTextSafe(l);
    if (text) questions.push(text);
  }

  // Respostas (valores dos inputs/selects)
  const inputs = formSection.locator('input, select');
  for (const inp of await inputs.all()) {
    const id = await inp.getAttribute('id');
    const tagName = await inp.evaluate((el) => el.tagName.toLowerCase());
    let value = '';
    if (tagName === 'select') {
      value = await inp.evaluate((el) => (el as HTMLSelectElement).value);
    } else if (tagName === 'input') {
      const type = await inp.getAttribute('type');
      if (type === 'checkbox' || type === 'radio') {
        value = await inp.evaluate((el) => (el as HTMLInputElement).checked ? 'true' : 'false');
      } else {
        value = await inp.evaluate((el) => (el as HTMLInputElement).value);
      }
    }
    if (id && value) answers[id] = value;
  }

  // Botão executar análise
  const runBtn = page.locator('#btn-run-analysis');
  const buttonText = await getTextSafe(runBtn);

  // Textos auxiliares
  const helpers = formSection.locator('span.text-\\[11px\\], p.text-\\[11px\\], span.text-\\[10px\\]');
  for (const h of await helpers.all()) {
    const text = await getTextSafe(h);
    if (text) helperTexts.push(text);
  }

  return { categoryBanner, questions, answers, buttonText, helperTexts };
}

// ==========================================
// Etapa 3 — Processamento
// ==========================================

export async function captureProcessingText(page: Page): Promise<ProcessingRenderedText> {
  const stages: Array<{ label: string; status: 'done' | 'current' | 'pending' }> = [];

  try {
    // Header
    const headerTitle = await getTextSafe(page.locator('h2.text-xl, h2.text-2xl').first());
    const headerDescription = await getTextSafe(page.locator('p.text-slate-500').first());

    // Estágios (checklist) - seletor com escape para .5
    const stageElements = page.locator('div.bg-slate-50\\.border\\.border-slate-200\\.rounded-xl div.flex.items-center.gap-2\\.5');
    for (const stage of await stageElements.all()) {
      const label = await getTextSafe(stage.locator('span.text-\\[11px\\]'));
      let status: 'done' | 'current' | 'pending' = 'pending';
      
      const classes = await stage.getAttribute('class') || '';
      if (classes.includes('text-emerald-700')) status = 'done';
      else if (classes.includes('text-slate-900')) status = 'current';
      else if (classes.includes('text-slate-400')) status = 'pending';

      if (label) stages.push({ label, status });
    }

    // Progresso
    const progressText = await getTextSafe(page.locator('span.font-bold.text-orange-600'));
    const progressPercentage = parseInt(progressText.replace('%', '')) || 0;
    
    const progressDescription = await getTextSafe(page.locator('span:has-text("Progresso da Análise")').first());

    return {
      headerTitle: headerTitle || 'Processando...',
      headerDescription: headerDescription || '',
      stages,
      progressPercentage,
      progressDescription: progressDescription || '',
    };
  } catch (e) {
    console.warn('[captureProcessingText] Erro:', e);
    return {
      headerTitle: 'Processando...',
      headerDescription: '',
      stages: [],
      progressPercentage: 0,
      progressDescription: '',
    };
  }
}

// ==========================================
// Etapa 4 — Resultado (FreeAnalysisResultStep) — ATUALIZADO PARA DOM REAL
// ==========================================

export async function captureAnalysisResultText(page: Page): Promise<AnalysisResultRenderedText> {
  // Header
  const badge = await getTextSafe(page.locator('div.inline-flex.items-center.gap-2.px-4.py-2.rounded-full.text-\\[12px\\].font-bold.uppercase.tracking-wider.bg-emerald-50.text-emerald-700.border.border-emerald-200.font-mono').first());
  const title = await getTextSafe(page.locator('h1.text-2xl.sm\\:text-3xl.font-bold.text-slate-900.tracking-tight').first());
  const aitNumber = await getTextSafe(page.locator('p.text-base.text-slate-500 span.font-mono.font-bold.text-slate-800').first());
  const plate = await getTextSafe(page.locator('p.text-base.text-slate-500 span.font-mono.font-bold.text-slate-800').nth(1));
  const phone = await getTextSafe(page.locator('p.text-base.text-slate-500 span.ml-2.text-slate-400.font-mono'));

  // Strength Indicator
  const strengthLabel = await getTextSafe(page.locator('span.text-base.font-bold.text-emerald-800.uppercase.font-mono.block').first());
  const rateText = await getTextSafe(page.locator('div.text-4xl.sm\\:text-5xl.font-extrabold.text-emerald-700.font-mono').first());
  const rate = rateText ? parseInt(rateText.replace('%', '')) || null : null;
  const isUnavailable = rate === null;
  const strengthMessage = await getTextSafe(page.locator('span.text-lg.text-emerald-800.font-medium').first());

  // Data Completeness
  let dataCompleteness: AnalysisResultRenderedText['dataCompleteness'];
  const filledText = await getTextSafe(page.locator('span.font-mono:has-text("preencheu"), span.font-mono:has-text("campos preenchidos")').first());
  const ratioText = await getTextSafe(page.locator('span.px-2\\.py-1.bg-emerald-100.rounded-full.font-mono').first());
  if (filledText && ratioText) {
    const filledMatch = filledText.match(/(\d+)\/(\d+)|(\d+) campos? preenchidos?/);
    const ratioMatch = ratioText.match(/(\d+)%/);
    const missingItems = await getAllTextsSafe(page.locator('ul li:has-text("campos"), ul li:has-text("dados")'));
    dataCompleteness = {
      filledFields: filledMatch ? parseInt(filledMatch[1] || filledMatch[3] || '0') : 0,
      totalFields: filledMatch ? parseInt(filledMatch[2] || '0') : 0,
      ratio: ratioMatch ? parseInt(ratioMatch[1]) : 0,
      missingCriticalFields: missingItems,
    };
  }

  // Summary Cards
  const summaryCards: AnalysisResultRenderedText['summaryCards'] = [];
  const cards = page.locator('div.p-6.bg-white.border.border-slate-200.rounded-xl.shadow-2xs.space-y-5');
  for (const card of await cards.all()) {
    const title = await getTextSafe(card.locator('h4.text-xl.font-bold.text-slate-900').first());
    const legalBase = await getTextSafe(card.locator('p.text-base.text-slate-500.font-mono').first());
    
    const sections = card.locator('div.space-y-1\\.5');
    const sectionCount = await sections.count();
    
    let whatWeChecked = '';
    let lawExplanation = '';
    let evidenceResult = '';
    let userImpact = '';
    let confidenceLevel = '';
    let confidenceReason = '';
    
    for (let i = 0; i < sectionCount; i++) {
      const section = sections.nth(i);
      const label = await getTextSafe(section.locator('span.text-sm.font-bold.text-slate-500.uppercase.tracking-wide').first());
      const content = await getTextSafe(section.locator('p.text-base.text-slate-700.leading-relaxed.pl-6').first());
      const confidenceBadge = await getTextSafe(section.locator('span.inline-flex.items-center.gap-1.px-2\\.5.py-1.rounded-md.text-sm.font-bold').first());
      const confidenceReasonText = await getTextSafe(section.locator('span.text-sm.text-slate-500').first());
      
      const labelText = label || '';
      if (labelText.includes('O QUE VERIFICAMOS') || labelText.includes('O que verificamos')) {
        whatWeChecked = content;
      } else if (labelText.includes('O QUE A LEI DIZ') || labelText.includes('O que a lei diz')) {
        lawExplanation = content;
      } else if (labelText.includes('O QUE ENCONTRAMOS') || labelText.includes('O que encontramos')) {
        evidenceResult = content;
      } else if (labelText.includes('O QUE ISSO SIGNIFICA') || labelText.includes('O que isso significa')) {
        userImpact = content;
      } else if (labelText.includes('NÍVEL DE CONFIANÇA') || labelText.includes('Nível de confiança')) {
        confidenceLevel = confidenceBadge || '';
        confidenceReason = confidenceReasonText || '';
      }
    }

    if (title) {
      summaryCards.push({
        title,
        legalBase,
        whatWeChecked,
        lawExplanation,
        evidenceResult,
        userImpact,
        confidenceLevel,
        confidenceReason,
      });
    }
  }

  // Next Steps
  const nextSteps: string[] = [];
  const stepsList = page.locator('ol.space-y-2.text-sm.text-slate-700.list-decimal.list-inside');
  if (await stepsList.count()) {
    for (const step of await stepsList.locator('li').all()) {
      nextSteps.push(await getTextSafe(step));
    }
  }

  // CTA Buttons
  const saveBtn = page.locator('button:has-text("Salvar e Ver no Painel"), button:has-text("Salvar no painel")');
  const proceedBtn = page.locator('#btn-proceed-to-document-generation, button:has-text("Gerar Minha Defesa"), button:has-text("Montar minha defesa")');
  const ctaButtons = {
    saveToDashboard: await getTextSafe(saveBtn),
    proceedToDocument: await getTextSafe(proceedBtn),
  };

  return {
    header: { badge, title, aitNumber, plate, phone: phone || undefined },
    strengthIndicator: {
      label: strengthLabel,
      rate,
      message: strengthMessage,
      isUnavailable,
    },
    summaryCards,
    dataCompleteness,
    nextSteps,
    ctaButtons,
  };
}

// ==========================================
// Etapa 5 — Qualificação (RequiredDataStep)
// ==========================================

export async function captureQualificationText(page: Page): Promise<QualificationRenderedText> {
  const formLabels: string[] = [];
  const formValues: Record<string, string> = {};

  // Banner
  const bannerText = await getTextSafe(page.locator('div.p-4.bg-blue-50.border.border-blue-200.rounded-xl').first());

  // Dados preservados
  const preservedPlate = await getTextSafe(page.locator('span.bg-white.px-2.py-0.5.rounded.border:has-text("Placa:")').first());
  const preservedAit = await getTextSafe(page.locator('span.bg-white.px-2.py-0.5.rounded.border:has-text("AIT:")').first());
  const preservedOrgao = await getTextSafe(page.locator('span.bg-white.px-2.py-0.5.rounded.border:has-text("Órgão:")').first());
  const preservedData = {
    plate: preservedPlate.replace('Placa: ', ''),
    ait: preservedAit.replace('AIT: ', ''),
    orgao: preservedOrgao.replace('Órgão: ', ''),
  };

  // Labels do formulário
  const labels = page.locator('label.text-\\[10px\\].font-bold.text-slate-700.uppercase.font-mono');
  for (const l of await labels.all()) {
    formLabels.push(await getTextSafe(l));
  }

  // Valores dos campos
  const inputSelectors = [
    '#input-applicant-name',
    '#input-applicant-cpf',
    '#input-applicant-rg',
    '#input-applicant-cnh',
    '#input-cnh-category',
    '#input-applicant-email',
    '#input-applicant-phone',
    '#input-address-street',
    '#input-address-number',
    '#input-address-neighborhood',
    '#input-address-zipcode',
    '#input-address-citystate',
    '#input-psdd-number',
    '#input-pcdd-number',
    '#input-suspension-months',
  ];

  for (const sel of inputSelectors) {
    const el = page.locator(sel);
    if (await el.count()) {
      const tagName = await el.evaluate((el) => el.tagName.toLowerCase());
      let value = '';
      if (tagName === 'select') {
        value = await el.evaluate((el) => (el as HTMLSelectElement).value);
      } else {
        value = await el.evaluate((el) => (el as HTMLInputElement).value);
      }
      if (value) formValues[sel] = value;
    }
  }

  // Botão próximo
  const nextBtn = page.locator('#btn-next-to-review');
  const buttonText = await getTextSafe(nextBtn);
  const buttonEnabled = await isEnabledSafe(nextBtn);

  return { bannerText, preservedData, formLabels, formValues, buttonText, buttonEnabled };
}

// ==========================================
// Etapa 6 — Revisão (DocumentReviewStep)
// ==========================================

export async function captureReviewText(page: Page): Promise<ReviewRenderedText> {
  const header = await getTextSafe(page.locator('h1.text-xl, h1.text-2xl').first());

  // Seção 1 - Enquadramento
  const enquadramento: Record<string, string> = {};
  const enqSection = page.locator('div.p-4.bg-slate-50\\/80.border.border-slate-200.rounded-xl').first();
  const enqRows = enqSection.locator('div.flex.justify-between.py-1.border-b.border-slate-100');
  for (const row of await enqRows.all()) {
    const label = await getTextSafe(row.locator('span.text-slate-500').first());
    const value = await getTextSafe(row.locator('span.font-medium.text-slate-900, span.font-mono.font-bold.text-slate-900').first());
    if (label && value) enquadramento[label.replace(':', '')] = value;
  }

  // Teses inclusas
  const tesesInclusas: string[] = [];
  const tesesList = enqSection.locator('ul.space-y-1.text-\\[11px\\].text-slate-600.list-disc.list-inside li');
  for (const t of await tesesList.all()) {
    tesesInclusas.push(await getTextSafe(t));
  }

  // Evidências necessárias
  const evidenciasNecessarias: ReviewRenderedText['sections']['evidenciasNecessarias'] = [];
  const evItems = enqSection.locator('div.flex.items-start.gap-2.text-\\[10px\\]');
  for (const item of await evItems.all()) {
    const requisito = await getTextSafe(item.locator('p.text-slate-700.leading-snug.break-words').first());
    const argIds = await getTextSafe(item.locator('p.text-slate-400.font-mono.text-\\[9px\\]').first());
    
    let status: 'PRESENTE' | 'AUSENTE' | 'PENDENTE' = 'PENDENTE';
    const icon = item.locator('svg');
    const iconClass = await icon.getAttribute('class') || '';
    if (iconClass.includes('text-emerald-500')) status = 'PRESENTE';
    else if (iconClass.includes('text-red-400')) status = 'AUSENTE';
    else if (iconClass.includes('text-amber-400')) status = 'PENDENTE';

    if (requisito) {
      evidenciasNecessarias.push({
        requisito,
        status,
        argIds: argIds.split(', ').filter(Boolean),
      });
    }
  }

  // Seção 2 - Qualificação
  const qualificacao: Record<string, string> = {};
  const qualSection = page.locator('div.p-4.bg-slate-50\\/80.border.border-slate-200.rounded-xl').nth(1);
  const qualRows = qualSection.locator('div.flex.justify-between.py-1.border-b.border-slate-100');
  for (const row of await qualRows.all()) {
    const label = await getTextSafe(row.locator('span.text-slate-500').first());
    const value = await getTextSafe(row.locator('span.font-bold.text-slate-900, span.font-mono.text-slate-900').first());
    if (label && value) qualificacao[label.replace(':', '')] = value;
  }

  // Badge garantia
  const guaranteeBadge = await getTextSafe(page.locator('div.p-4.bg-emerald-50\\/50.border.border-emerald-200.rounded-xl').first());

  // Botões
  const editBtn = page.locator('button:has-text("Alterar")');
  const proceedBtn = page.locator('#btn-proceed-to-checkout');
  const buttons = {
    editQualification: await getTextSafe(editBtn),
    proceedToPayment: await getTextSafe(proceedBtn),
  };

  return {
    header,
    sections: {
      enquadramento,
      tesesInclusas,
      evidenciasNecessarias,
      qualificacao,
    },
    guaranteeBadge,
    buttons,
  };
}

// ==========================================
// Etapa 7 — Checkout (DocumentCheckoutStep)
// ==========================================

export async function captureCheckoutText(page: Page): Promise<CheckoutRenderedText> {
  const header = await getTextSafe(page.locator('h1.text-lg, h1.text-xl').first());

  // Order Summary
  const items: Array<{ label: string; value: string }> = [];
  const priceBreakdown: Array<{ label: string; value: string }> = [];

  const summarySection = page.locator('div.bg-white.border.border-slate-200.rounded-2xl.p-5').first();
  const summaryRows = summarySection.locator('div.flex.justify-between.py-1');
  for (const row of await summaryRows.all()) {
    const label = await getTextSafe(row.locator('span').first());
    const value = await getTextSafe(row.locator('span').last());
    if (label && value) {
      if (label.includes('Preço') || label.includes('Desconto') || label.includes('Investimento')) {
        priceBreakdown.push({ label, value });
      } else {
        items.push({ label, value });
      }
    }
  }

  const finalPrice = await getTextSafe(page.locator('span.text-2xl.font-extrabold.text-slate-900.font-mono').first());
  const guaranteeText = await getTextSafe(page.locator('div.p-4.bg-emerald-50\\/50.border.border-emerald-200.rounded-xl').first());

  // Abas de pagamento
  const paymentMethodTabs: string[] = [];
  const tabButtons = page.locator('button[role="tab"]');
  for (const btn of await tabButtons.all()) {
    paymentMethodTabs.push(await getTextSafe(btn));
  }

  // Seção PIX
  let pixSection: CheckoutRenderedText['pixSection'];
  const pixContainer = page.locator('div.bg-white.border.border-slate-300.rounded-2xl.p-5.shadow-sm');
  if (await pixContainer.count()) {
    const qrCodeAlt = await getAttributeSafe(pixContainer.locator('img'), 'alt') || '';
    const copyPasteLabel = await getTextSafe(pixContainer.locator('label.text-\\[10px\\].font-bold.text-slate-700.uppercase.block.font-mono').first());
    const copyPasteValue = await getAttributeSafe(pixContainer.locator('input[type="text"][readOnly]'), 'value') || '';
    const confirmButtonText = await getTextSafe(pixContainer.locator('#btn-confirm-payment-pix').first());
    const payError = await getTextSafe(pixContainer.locator('div.p-2.5.bg-amber-50.border.border-amber-200.rounded-lg').first());

    pixSection = { qrCodeAlt, copyPasteLabel, copyPasteValue, confirmButtonText, payError: payError || undefined };
  }

  // Seção Cartão
  let creditCardSection: CheckoutRenderedText['creditCardSection'];
  const ccContainer = page.locator('div.bg-white.border.border-slate-300.rounded-2xl.p-5.shadow-sm:has(iframe)');
  if (await ccContainer.count()) {
    const formLabels: string[] = [];
    const ccLabels = ccContainer.locator('label');
    for (const l of await ccLabels.all()) {
      formLabels.push(await getTextSafe(l));
    }
    const confirmButtonText = await getTextSafe(ccContainer.locator('button:has-text("Pagar")').first());
    const error = await getTextSafe(ccContainer.locator('div.mt-4.p-3.bg-rose-50.border.border-rose-200.rounded-lg').first());
    creditCardSection = { formLabels, confirmButtonText, error: error || undefined };
  }

  // Botão voltar
  const backButton = await getTextSafe(page.locator('button:has-text("Voltar à Revisão")').first());

  return {
    header,
    orderSummary: { items, priceBreakdown, finalPrice, guaranteeText },
    paymentMethodTabs,
    pixSection,
    creditCardSection,
    backButton,
  };
}

// ==========================================
// Captura Completa (orquestradora)
// ==========================================

export async function captureFullRenderedText(page: Page): Promise<FullRenderedText> {
  // Navega e captura cada etapa
  const identification = await captureIdentificationText(page);
  
  // Clica próximo para etapa 2
  await page.locator('#btn-next-to-specifics').click();
  await page.waitForTimeout(500);
  const specificQuestions = await captureSpecificQuestionsText(page);
  
  // Clica executar análise
  await page.locator('#btn-run-analysis').click();
  await page.waitForSelector('text=Analisando sua autuação com Inteligência Jurídica', { timeout: 5000 });
  await page.waitForSelector('text=Diagnóstico Preliminar Concluído', { timeout: 45000 });
  await page.waitForTimeout(1000);
  
  // Captura processamento (se ainda visível) e resultado
  const processing = await captureProcessingText(page);
  const analysisResult = await captureAnalysisResultText(page);

  // Tenta ir para qualificação (requer autenticação - pode falhar)
  let qualification: QualificationRenderedText | undefined;
  let review: ReviewRenderedText | undefined;
  let checkout: CheckoutRenderedText | undefined;

  try {
    await page.locator('#btn-proceed-to-document-generation').click();
    await page.waitForTimeout(1000);
    // Se não autenticado, verifica gate de autenticação
    const authGate = page.locator('text=Acesso à Sua Defesa Jurídica');
    if (!(await authGate.count())) {
      qualification = await captureQualificationText(page);
      
      // Próximo para revisão
      await page.locator('#btn-next-to-review').click();
      await page.waitForTimeout(500);
      review = await captureReviewText(page);
      
      // Próximo para checkout
      await page.locator('#btn-proceed-to-checkout').click();
      await page.waitForTimeout(500);
      checkout = await captureCheckoutText(page);
    }
  } catch {
    // Etapas protegidas não acessíveis sem autenticação
  }

  return {
    identification,
    specificQuestions,
    processing,
    analysisResult,
    qualification,
    review,
    checkout,
  };
}