/**
 * Teste de regressão de copy e claims do onboarding.
 *
 * Objetivo: comprovar que textos enganosos identificados nas auditorias
 * docs/auditorias/2026-10-22-onboarding/05-copy.md e 06-claims.md NÃO são
 * mais renderizados ao usuário, e que as correções substanciais estão presentes.
 *
 * Método: renderização real dos componentes (renderToString) com dados de
 * entrada conhecidos, captura do HTML produzido e asserções sobre o texto
 * efetivamente exibido. Não se verifica apenas strings no código-fonte.
 *
 * Execução: npm run test (vitest) — incluido no include do vitest.config.ts.
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { FreeAnalysisResultStep } from './FreeAnalysisResultStep';
import { AnalysisProcessingStep } from './AnalysisProcessingStep';
import { SpecificInfractionDataStep } from './SpecificInfractionDataStep';
import { InfractionCategoryStep } from './InfractionCategoryStep';
import { InfractionIdentificationStep } from './InfractionIdentificationStep';
import { ServiceStep } from './ServiceStep';
import { OnboardingStartScreen } from '../OnboardingStartScreen';

// Shim mínimo de window para componentes que leem window.location em inicializadores lazy.
const originalWindow = (globalThis as any).window;
beforeAll(() => {
  (globalThis as any).window = {
    location: {
      pathname: '/onboarding/resultado',
      search: '',
      hash: '',
      origin: 'http://localhost',
      href: 'http://localhost/onboarding/resultado',
    },
    history: { pushState: () => undefined, replaceState: () => undefined },
    sessionStorage: {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined,
    },
    localStorage: {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined,
    },
    navigator: { clipboard: { writeText: () => Promise.resolve() } },
  } as any;
});
afterAll(() => {
  (globalThis as any).window = originalWindow;
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseInfraction = {
  aitNumber: 'AIT-12345',
  infractionCode: '745-50',
  description: 'Exceder o limite máximo de velocidade da via em até 20%',
  ctbArticle: 'Art. 218, II, CTB',
  severity: 'media' as const,
  points: 4,
  fineAmount: 130.16,
  autuadorBody: 'DETRAN-SP',
  dateTime: '2026-09-10T14:30:00',
  location: 'Av. Paulista, 1000 - São Paulo/SP',
  hasPreviousInfractionsLast12Months: false,
};

const baseVehicle = {
  plate: 'BRA2E19',
  brandModel: 'GOL / VW',
  renavam: '12345678901',
  year: '2022',
  color: 'Prata',
};

const analysisWithArg051 = {
  id: 'an_test_001',
  caseId: 'case_test_001',
  createdAt: new Date().toISOString(),
  overallSuccessRate: 94,
  detectedInconsistencies: [],
  recommendedArguments: [
    {
      id: 'ARG-051',
      title: 'Conversão em Advertência por Escrito (Art. 267 CTB)',
      legalBase: 'Art. 267 do CTB (Lei 14.071/2020)',
      requiredDocuments: ['Extrato de prontuário de CNH'],
    },
  ],
  recommendedProcedure: 'conversao_advertencia',
  competentBody: 'DETRAN-SP',
  summaryReasoning:
    'A infração é de natureza média e o condutor declara não ter reincidência nos últimos 12 meses, preenchendo os requisitos do art. 267 do CTB.',
  dataCompleteness: {
    filledFields: 8,
    totalFields: 12,
    ratio: 67,
    missingCriticalFields: ['notificationExpeditionDate'],
  },
} as any;

const analysisWithNoArguments = {
  id: 'an_test_002',
  caseId: 'case_test_002',
  createdAt: new Date().toISOString(),
  overallSuccessRate: 35,
  detectedInconsistencies: [],
  recommendedArguments: [],
  recommendedProcedure: 'defesa_previa',
  competentBody: 'DETRAN-SP',
  summaryReasoning: '',
  dataCompleteness: {
    filledFields: 4,
    totalFields: 12,
    ratio: 33,
    missingCriticalFields: ['speedLimit', 'measuredSpeed'],
  },
} as any;

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('Onboarding copy regression — FreeAnalysisResultStep', () => {
  it('não renderiza "Probabilidade de Êxito" (score heurístico apresentado como estatística)', () => {
    const html = renderToString(
      <FreeAnalysisResultStep
        analysis={analysisWithArg051}
        infractionData={baseInfraction}
        vehicleData={baseVehicle}
        serviceType='conversao_advertencia'
        onProceedToDocumentGeneration={() => {}}
        onSaveToDashboard={() => {}}
        onBack={() => {}}
      />
    );
    expect(html).not.toContain('Probabilidade de Êxito');
    expect(html).toContain('Força da sua defesa');
    expect(html).toContain(
      'Não é previsão de resultado — a decisão final é do órgão.'
    );
  });

  it('não renderiza "Alto potencial de anulação" (promessa de resultado)', () => {
    const html = renderToString(
      <FreeAnalysisResultStep
        analysis={analysisWithArg051}
        infractionData={baseInfraction}
        vehicleData={baseVehicle}
        serviceType='conversao_advertencia'
        onProceedToDocumentGeneration={() => {}}
        onSaveToDashboard={() => {}}
        onBack={() => {}}
      />
    );
    expect(html).not.toContain('Alto potencial de anulação');
    expect(html).toContain('Vários pontos fortes no seu caso');
  });

  it('não renderiza "DIREITO SUBJETIVO" nem promessa absoluta de "0 pontos" sem condição', () => {
    const html = renderToString(
      <FreeAnalysisResultStep
        analysis={analysisWithArg051}
        infractionData={baseInfraction}
        vehicleData={baseVehicle}
        serviceType='conversao_advertencia'
        onProceedToDocumentGeneration={() => {}}
        onSaveToDashboard={() => {}}
        onBack={() => {}}
      />
    );
    expect(html).not.toContain('DIREITO SUBJETIVO');
    expect(html).not.toContain('não pagará valor e não perderá pontos');
    expect(html).not.toContain('0 pontos na CNH');
    expect(html).toContain('se o órgão confirmar');
  });

  it('não renderiza "Nenhuma tese autorizada com os dados informados" (jargão interno)', () => {
    const html = renderToString(
      <FreeAnalysisResultStep
        analysis={analysisWithNoArguments}
        infractionData={baseInfraction}
        vehicleData={baseVehicle}
        serviceType='defesa_previa'
        onProceedToDocumentGeneration={() => {}}
        onSaveToDashboard={() => {}}
        onBack={() => {}}
      />
    );
    expect(html).not.toContain('Nenhuma tese autorizada com os dados informados');
    expect(html).toContain(
      'Com os dados de hoje, não encontramos ponto forte'
    );
  });

  it('não renderiza "Diagnóstico Jurídico Gratuito Concluído" (rótulo antigo)', () => {
    const html = renderToString(
      <FreeAnalysisResultStep
        analysis={analysisWithArg051}
        infractionData={baseInfraction}
        vehicleData={baseVehicle}
        serviceType='conversao_advertencia'
        onProceedToDocumentGeneration={() => {}}
        onSaveToDashboard={() => {}}
        onBack={() => {}}
      />
    );
    expect(html).not.toContain('Diagnóstico Jurídico Gratuito Concluído');
    expect(html).toContain('Diagnóstico concluído — grátis');
  });

  it('não renderiza "Enquadramento" (jargão) no resumo informativo', () => {
    const html = renderToString(
      <FreeAnalysisResultStep
        analysis={analysisWithArg051}
        infractionData={baseInfraction}
        vehicleData={baseVehicle}
        serviceType='conversao_advertencia'
        onProceedToDocumentGeneration={() => {}}
        onSaveToDashboard={() => {}}
        onBack={() => {}}
      />
    );
    expect(html).not.toContain('Enquadramento');
    expect(html).toContain('Tipo da Infração');
  });

  it('não renderiza "Instância: Defesa Administrativa" sem explicação', () => {
    const html = renderToString(
      <FreeAnalysisResultStep
        analysis={analysisWithArg051}
        infractionData={baseInfraction}
        vehicleData={baseVehicle}
        serviceType='conversao_advertencia'
        onProceedToDocumentGeneration={() => {}}
        onSaveToDashboard={() => {}}
        onBack={() => {}}
      />
    );
    expect(html).not.toContain('Instância: Defesa Administrativa');
    expect(html).toContain('Onde o caso é analisado: defesa administrativa');
  });

  it('adiciona contexto de que valor e pontos dependem da decisão do órgão', () => {
    const html = renderToString(
      <FreeAnalysisResultStep
        analysis={analysisWithArg051}
        infractionData={baseInfraction}
        vehicleData={baseVehicle}
        serviceType='conversao_advertencia'
        onProceedToDocumentGeneration={() => {}}
        onSaveToDashboard={() => {}}
        onBack={() => {}}
      />
    );
    expect(html).toContain(
      'Quanto vale a multa e os pontos dependem da decisão do órgão.'
    );
  });

  it('quando não há teses e taxa indisponível, mostra modo degradado e mensagem de dados faltantes', () => {
    const analysisWithoutRate = { ...analysisWithNoArguments, overallSuccessRate: null };
    const html = renderToString(
      <FreeAnalysisResultStep
        analysis={analysisWithoutRate}
        infractionData={baseInfraction}
        vehicleData={baseVehicle}
        serviceType='defesa_previa'
        onProceedToDocumentGeneration={() => {}}
        onSaveToDashboard={() => {}}
        onBack={() => {}}
      />
    );
    expect(html).toContain('Indicador Indisponível');
    expect(html).toContain('—');
    expect(html).toContain('Análise em modo degradado — base jurídica indisponível');
    expect(html).toContain('Com os dados que você enviou, não encontramos problema na autuação.');
  });
});

describe('Onboarding copy regression — AnalysisProcessingStep', () => {
  it('não renderiza "390 dispositivos do CTB" (número inventado)', () => {
    const html = renderToString(
      <AnalysisProcessingStep
        infractionData={baseInfraction}
        onComplete={() => {}}
        onAnalysisComplete={() => {}}
        onBack={() => {}}
      />
    );
    expect(html).not.toContain('390 dispositivos');
    expect(html).not.toContain('390');
  });

  it('não renderiza "Inteligência Jurídica" (não há LLM na Fase 1)', () => {
    const html = renderToString(
      <AnalysisProcessingStep
        infractionData={baseInfraction}
        onComplete={() => {}}
        onAnalysisComplete={() => {}}
        onBack={() => {}}
      />
    );
    expect(html).not.toContain('Inteligência Jurídica');
    expect(html).toContain('Estamos conferindo a sua autuação');
  });

  it('não renderiza estágios com claims não verificáveis (7 peças-modelo, precedentes STJ em tempo real, calibração de deferimento)', () => {
    const html = renderToString(
      <AnalysisProcessingStep
        infractionData={baseInfraction}
        onComplete={() => {}}
        onAnalysisComplete={() => {}}
        onBack={() => {}}
      />
    );
    expect(html).not.toContain('peças-modelo');
    expect(html).not.toContain('STJ em tempo real');
    expect(html).not.toContain('calibrando');
    expect(html).not.toContain('Art. 281-A');
    expect(html).toContain('Conferindo os dados que você enviou');
    expect(html).toContain('Checando a infração na legislação de trânsito');
  });
});

describe('Onboarding copy regression — SpecificInfractionDataStep', () => {
  it('não promete "anulação imediata" por aferição vencida', () => {
    const html = renderToString(
      <SpecificInfractionDataStep
        category='excesso_velocidade'
        infractionData={baseInfraction}
        onUpdateInfraction={() => {}}
        onNext={() => {}}
        onBack={() => {}}
      />
    );
    expect(html).not.toContain('gera anulação imediata');
    expect(html).toContain(
      'argumento forte para questionar a validade da medição do radar'
    );
  });

  it('não usa "100% de Isenção" nos requisitos do Art. 267', () => {
    const html = renderToString(
      <SpecificInfractionDataStep
        category='conversao_advertencia'
        infractionData={baseInfraction}
        onUpdateInfraction={() => {}}
        onNext={() => {}}
        onBack={() => {}}
      />
    );
    expect(html).not.toContain('100% de Isenção');
    expect(html).not.toContain('Requisitos Legais para 100% de Isenção');
    expect(html).toContain('Requisitos do Art. 267 do CTB');
    expect(html).not.toContain('autoridade de trânsito é obrigada');
    expect(html).toContain(
      'depende da análise do órgão autuador e da comprovação do prontuário'
    );
    expect(html).toContain(
      'o extrato de prontuário será solicitado para comprovação'
    );
  });
});

describe('Onboarding copy regression — InfractionCategoryStep', () => {
  it('não promete "Isenção de 100% do valor da multa" no card de categoria', () => {
    const html = renderToString(
      <InfractionCategoryStep
        selectedCategory='excesso_velocidade'
        onSelectCategory={() => {}}
        onNext={() => {}}
        onBack={() => {}}
      />
    );
    expect(html).not.toContain('Isenção de 100% do valor da multa');
    expect(html).not.toContain('zero pontos na CNH (sem reincidência)');
    expect(html).toContain(
      'Possível conversão em advertência por escrito, sem multa e sem pontos, se a infração for leve ou média e não houver reincidência em 12 meses.'
    );
  });
});

describe('Onboarding copy regression — InfractionIdentificationStep', () => {
  it('não cita "Art. 281-A CTB" para Data da Ocorrência (artigo errado para decadência)', () => {
    const html = renderToString(
      <InfractionIdentificationStep
        infractionData={baseInfraction}
        vehicleData={baseVehicle}
        onUpdateInfraction={() => {}}
        onUpdateVehicle={() => {}}
        onNext={() => {}}
        onBack={() => {}}
      />
    );
    expect(html).not.toContain('Art. 281-A CTB');
    expect(html).toContain('Art. 281, §1º, II CTB');
  });

  it('não afirma que dados devem ser preenchidos manualmente quando OCR preenche automaticamente', () => {
    const html = renderToString(
      <InfractionIdentificationStep
        infractionData={baseInfraction}
        vehicleData={baseVehicle}
        onUpdateInfraction={() => {}}
        onUpdateVehicle={() => {}}
        onNext={() => {}}
        onBack={() => {}}
      />
    );
    expect(html).not.toContain('Os dados abaixo devem ser preenchidos manualmente.');
    expect(html).toContain(
      'O upload faz OCR e preenche os campos automaticamente.'
    );
  });
});

describe('Onboarding copy regression — ServiceStep', () => {
  it('não usa "aplicarmos as defesas adequadas" (jargão) nem "Lei 14.071/20" (ano truncado)', () => {
    const html = renderToString(
      <ServiceStep
        selectedSituation='multa_transito'
        onSelectSituation={() => {}}
      />
    );
    expect(html).not.toContain('aplicarmos as defesas adequadas');
    expect(html).toContain('Escolha a situação que descreve o seu caso');
    expect(html).toContain('Lei 14.071/2020');
  });
});


describe('OnboardingStartScreen — início e retomada explícitos', () => {
  it('oferece início manual quando não existe rascunho', () => {
    const html = renderToString(
      <OnboardingStartScreen
        hasSavedProgress={false}
        onStart={() => {}}
        onContinue={() => {}}
        onStartFresh={() => {}}
      />
    );

    expect(html).toContain('Vamos começar pelo seu caso');
    expect(html).toContain('Começar');
    expect(html).not.toContain('Continuar de onde parei');
    expect(html).not.toContain('Começar do zero');
  });

  it('oferece continuar ou começar do zero quando existe progresso salvo', () => {
    const html = renderToString(
      <OnboardingStartScreen
        hasSavedProgress={true}
        savedStep={5}
        onStart={() => {}}
        onContinue={() => {}}
        onStartFresh={() => {}}
      />
    );

    expect(html).toContain('Você parou na etapa 5');
    expect(html).toContain('Continuar de onde parei');
    expect(html).toContain('Começar do zero');
    expect(html).toContain('Não exclui sua conta nem outros casos salvos');
  });
});
