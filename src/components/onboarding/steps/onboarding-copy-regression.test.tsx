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
import { buildCoherentTestInfraction } from '../testFillData';
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
  const renderResult = (analysis: any) => renderToString(
    <FreeAnalysisResultStep
      analysis={analysis}
      infractionData={baseInfraction}
      vehicleData={baseVehicle}
      serviceType='defesa_previa'
      onProceedToDocumentGeneration={() => {}}
      onSaveToDashboard={() => {}}
      onBack={() => {}}
    />
  );

  it('prioriza uma conclusão simples e não mostra percentual de êxito', () => {
    const html = renderResult(analysisWithArg051);
    expect(html).toContain('Veja o que merece atenção na sua multa');
    expect(html).toContain('Principais pontos identificados');
    expect(html).toContain('Continuar para preparar minha defesa');
    expect(html).not.toContain('Probabilidade de Êxito');
    expect(html).not.toContain('Força da sua defesa');
    expect(html).not.toContain('94%');
    expect(html).not.toContain('WhatsApp:');
  });

  it('mantém os detalhes jurídicos acessíveis sem obrigar a leitura inicial', () => {
    const html = renderResult(analysisWithArg051);
    expect(html).toContain('Ver detalhes da autuação e da análise');
    expect(html).toContain('Base legal indicada');
    expect(html).toContain('O que diz a regra');
    expect(html).toContain('Por que isso importa');
  });

  it('quando não há achados, explica a incerteza e mantém a continuidade comercial', () => {
    const html = renderResult(analysisWithNoArguments);
    expect(html).toContain('Ainda não confirmamos um problema na autuação');
    expect(html).toContain('A ausência de um achado não comprova que a autuação esteja correta.');
    expect(html).toContain('Continuar para preparar minha defesa');
  });

  it('mostra quantas verificações foram realmente registradas pela análise', () => {
    const html = renderResult({
      ...analysisWithNoArguments,
      evaluatedRules: [
        { ruleId: 'RULE_A', status: 'PASS', evaluatedAt: '2026-10-29T00:00:00Z', reason: 'Concluída.' },
        { ruleId: 'RULE_B', status: 'DATA_GAP', evaluatedAt: '2026-10-29T00:00:00Z', reason: 'Faltam dados.' },
        { ruleId: 'RULE_C', status: 'NOT_APPLICABLE', evaluatedAt: '2026-10-29T00:00:00Z', reason: 'Não se aplica.' },
      ],
    });
    expect(html).toContain('A análise registrou 3 verificações.');
    expect(html).toContain('1 concluídas sem falha');
    expect(html).toContain('1 pendentes por falta de dados');
    expect(html).toContain('1 não aplicáveis');
  });

  it('apresenta dados ausentes como pendências, não como irregularidades confirmadas', () => {
    const html = renderResult({
      ...analysisWithNoArguments,
      dataGaps: [{
        ruleId: 'RULE_SPEED_DATA',
        missingData: ['speedLimit', 'measuredSpeed'],
        reason: 'Faltam dados de velocidade para concluir a verificação.',
      }],
    });
    expect(html).toContain('O que ainda falta confirmar');
    expect(html).toContain('limite de velocidade da via');
    expect(html).toContain('velocidade medida pelo equipamento');
    expect(html).not.toContain('speedLimit, measuredSpeed');
    expect(html).not.toContain('Identificamos pontos que podem merecer uma análise mais detalhada.');
  });

  it('não promete efeito suspensivo nem encaminha universalmente para o DETRAN', () => {
    const html = renderResult(analysisWithNoArguments);
    expect(html).not.toContain('Protocolar antes garante o efeito suspensivo');
    expect(html).not.toContain('recurso por escrito ao DETRAN');
    expect(html).not.toContain('A defesa é protocolada por escrito no DETRAN');
  });

  it('distingue falha técnica e não oferece continuação como se a análise estivesse concluída', () => {
    const html = renderResult({ ...analysisWithArg051, status: 'failed' });
    expect(html).toContain('Análise não concluída');
    expect(html).toContain('Isso não significa que sua multa esteja correta.');
    expect(html).toContain('Voltar e revisar os dados');
    expect(html).not.toContain('Continuar para preparar minha defesa');
  });

  it('mostra prazo apenas como data informada, sem garantia jurídica genérica', () => {
    const html = renderResult({
      ...analysisWithNoArguments,
      procedureDeadline: '2026-11-11',
    });
    expect(html).toContain('11/11/2026');
    expect(html).toContain('Confirme a data na notificação original');
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
  it('coleta o histórico de infrações de 12 meses no fluxo comum de excesso de velocidade', () => {
    const html = renderToString(
      <SpecificInfractionDataStep category='excesso_velocidade' infractionData={baseInfraction as any} onUpdateInfraction={() => {}} onNext={() => {}} onBack={() => {}} />
    );
    expect(html).toContain('select-previous-infractions-12-months');
    expect(html).toContain('Há infrações registradas nos 12 meses anteriores à data desta multa?');
    expect(html).toContain('Não sei / Não informado');
  });

  it('o preenchimento administrativo de teste define o histórico como dado sintético explícito', () => {
    const infraction = buildCoherentTestInfraction('excesso_velocidade', baseInfraction as any);
    expect(infraction.hasPreviousInfractionsLast12Months).toBe(false);
  });

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
    expect(html).not.toContain(
      'argumento forte para questionar a validade da medição do radar'
    );
    expect(html).toContain('Data da aferição do INMETRO (opcional)');
    expect(html).toContain('Número do equipamento ou laudo do INMETRO (opcional)');
    expect(html).toContain('Se essa data constar na notificação ou em outro documento');
    expect(html).toContain('Informe o limite máximo indicado na notificação de autuação');
    expect(html).toContain('Valor registrado pelo equipamento antes do desconto da margem de tolerância');
    expect(html).toContain('Valor considerado para o enquadramento após a tolerância');
    expect(html).toContain('Deixe esses campos em branco e continue');
    expect(html).toContain('A ausência dessas informações, por si só, não significa que a multa seja inválida');
    expect(html).toContain('id="input-speed-limit"');
    expect(html).toContain('id="input-measured-speed"');
    expect(html).toContain('id="input-considered-speed"');
    expect(html).toContain('id="input-inmetro-date"');
    expect(html).toContain('id="input-radar-equipment-id"');
    expect(html).toContain('id="btn-run-analysis"');
    expect(html).not.toMatch(/id="input-inmetro-date"[^>]*required/);
    expect(html).not.toMatch(/id="input-radar-equipment-id"[^>]*required/);
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
    expect(html).not.toMatch(/<button[^>]*>Começar do zero/);
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
