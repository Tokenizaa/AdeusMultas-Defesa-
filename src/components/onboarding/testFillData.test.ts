import { describe, expect, it } from 'vitest';
import type { InfractionData } from '../../types';
import { buildCoherentTestInfraction, buildCompleteTestIdentificationFixture, resolveTestIdentificationCategory } from './testFillData';
import type { UserProcessStage, UserSituation } from '../../core/onboarding/rules-matrix';

const emptyInfraction = {
  aitNumber: '',
  infractionCode: '',
  description: '',
  ctbArticle: '',
  severity: 'media',
  points: 0,
  fineAmount: 0,
  autuadorBody: '',
  dateTime: '',
  location: '',
  formalFlawsDetected: [],
} as InfractionData;

describe('buildCoherentTestInfraction — preenchimento de campos por categoria', () => {
  it('preenche os campos técnicos de radar', () => {
    const data = buildCoherentTestInfraction('excesso_velocidade', emptyInfraction);
    expect(data.speedLimit).toBeGreaterThan(0);
    expect(data.measuredSpeed).toBeGreaterThan(data.speedLimit!);
    expect(data.consideredSpeed).toBeGreaterThan(0);
    expect(data.inmetroAferitionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(data.radarEquipmentId).toBeTruthy();
  });

  it('preenche os controles de lei seca e não mistura campos de velocidade', () => {
    const data = buildCoherentTestInfraction('lei_seca', emptyInfraction);
    expect(typeof data.hasPsychomotorTerm).toBe('boolean');
    expect(typeof data.offeredRetest).toBe('boolean');
    expect(data.speedLimit).toBeUndefined();
    expect(data.measuredSpeed).toBeUndefined();
  });

  it('preenche a circunstância de uso de celular', () => {
    const data = buildCoherentTestInfraction('celular', emptyInfraction);
    expect(data.cellphoneCircumstance).toBeTruthy();
    expect(data.notes).toContain('celular_');
  });

  it('preenche motivo e prova fotográfica para sinal vermelho', () => {
    const data = buildCoherentTestInfraction('vermelho', emptyInfraction);
    expect(typeof data.yellowPhaseCrossing).toBe('boolean');
    expect(typeof data.emergencyPassage).toBe('boolean');
    expect(data.hasPhotoProof).toBe(true);
  });

  it('mantém o select de estacionamento coerente com o relato preenchido', () => {
    const data = buildCoherentTestInfraction('estacionamento', emptyInfraction);
    expect(data.notes).toBe('estacionamento_embarque_rapido');
  });

  it('preenche os dados obrigatórios do condutor indicado', () => {
    const data = buildCoherentTestInfraction('indicacao_condutor', emptyInfraction);
    expect(data.realDriverName).toBeTruthy();
    expect(data.realDriverCpf).toMatch(/^\d{11}$/);
    expect(data.realDriverCnh).toMatch(/^\d{11}$/);
    expect(data.indicationWithinDeadline).toBe(true);
  });

  it('marca a resposta do requisito de advertência por escrito', () => {
    const data = buildCoherentTestInfraction('conversao_advertencia', emptyInfraction);
    expect(data.hasPreviousInfractionsLast12Months).toBe(false);
  });
});


describe('buildCompleteTestIdentificationFixture — formulário de identificação completo', () => {
  const categories = [
    'excesso_velocidade', 'lei_seca', 'celular', 'vermelho', 'estacionamento',
    'indicacao_condutor', 'conversao_advertencia', 'cnh_geral', 'outro',
  ] as const;

  it.each(categories)('preenche todos os campos necessários para a etapa 4 (%s)', (category) => {
    const fixture = buildCompleteTestIdentificationFixture('multa_transito', 'primeira_notificacao', category, emptyInfraction);
    const { infractionData, vehicleData } = fixture;

    expect(fixture.leadName.trim().length).toBeGreaterThanOrEqual(3);
    expect(fixture.leadPhone.replace(/\D/g, '').length).toBeGreaterThanOrEqual(10);
    expect(vehicleData.plate.trim().length).toBeGreaterThanOrEqual(7);
    expect(infractionData.aitNumber.trim().length).toBeGreaterThanOrEqual(3);
    expect(infractionData.infractionCode.trim().length).toBeGreaterThanOrEqual(3);
    const allowedCodes: Partial<Record<(typeof categories)[number], string[]>> = {
      excesso_velocidade: ['745-50', '746-30', '745-70', '747-10'],
      lei_seca: ['757-90', '516-91'],
      celular: ['736-62'],
      vermelho: ['605-01', '605-02'],
      estacionamento: ['545-21', '554-12'],
      conversao_advertencia: ['745-50', '736-62', '735-80', '685-80'],
    };
    if (allowedCodes[category]?.length) {
      expect(allowedCodes[category]).toContain(infractionData.infractionCode);
    }
    expect(infractionData.location.trim().length).toBeGreaterThanOrEqual(5);
    expect(infractionData.autuadorBody.trim().length).toBeGreaterThanOrEqual(3);
    expect(infractionData.dateTime).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(infractionData.notificationExpeditionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(infractionData.notificationDeliveryDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(infractionData.defenseDeadline).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(infractionData.ctbArticle).toBeTruthy();
    expect(infractionData.description).toBeTruthy();
    expect(infractionData.fineAmount).toBeGreaterThan(0);
  });

  it('substitui dados derivados antigos quando o código vem de outra categoria', () => {
    const stale = {
      ...emptyInfraction,
      infractionCode: '745-50',
      ctbArticle: 'ARTIGO ANTIGO',
      description: 'Descrição antiga',
    } as InfractionData;
    const { infractionData } = buildCompleteTestIdentificationFixture('multa_transito', 'primeira_notificacao', 'lei_seca', stale);
    expect(['757-90', '516-91']).toContain(infractionData.infractionCode);
    expect(infractionData.ctbArticle).not.toBe('ARTIGO ANTIGO');
    expect(infractionData.description).not.toBe('Descrição antiga');
  });
});

describe('coerência entre serviço, fase e categoria do fixture', () => {
  it.each([
    ['indicacao_condutor', 'primeira_notificacao', 'excesso_velocidade', 'indicacao_condutor'],
    ['conversao_advertencia', 'conversao_advertencia', 'lei_seca', 'conversao_advertencia'],
    ['multa_transito', 'conversao_advertencia', 'celular', 'conversao_advertencia'],
    ['cassacao_cnh', 'recurso_jari_negado', 'excesso_velocidade', 'cnh_geral'],
    ['suspensao_cnh', 'primeira_notificacao', 'outro', 'lei_seca'],
    ['suspensao_cnh', 'primeira_notificacao', 'excesso_velocidade', 'excesso_velocidade'],
  ] as Array<[UserSituation, UserProcessStage, 'excesso_velocidade' | 'lei_seca' | 'celular' | 'outro', 'indicacao_condutor' | 'conversao_advertencia' | 'cnh_geral' | 'lei_seca' | 'excesso_velocidade']>)(
    'resolve %s + %s para categoria coerente',
    (situation, stage, selectedCategory, expected) => {
      expect(resolveTestIdentificationCategory(situation, stage, selectedCategory)).toBe(expected);
    },
  );

  it('marca os dados como teste e mantém cronologia sintética dos eventos', () => {
    const fixture = buildCompleteTestIdentificationFixture('multa_transito', 'primeira_notificacao', 'excesso_velocidade', emptyInfraction);
    expect(fixture.leadName).toBe('Condutor de Teste');
    expect(fixture.infractionData.aitNumber).toMatch(/^\d{10}(\d{2})?$/);
    expect(fixture.infractionData.notificationExpeditionDate! > fixture.infractionData.dateTime!).toBe(true);
    expect(fixture.infractionData.notificationDeliveryDate! > fixture.infractionData.notificationExpeditionDate!).toBe(true);
    expect(fixture.infractionData.defenseDeadline! > fixture.infractionData.notificationDeliveryDate!).toBe(true);
  });

  it('gera cenário de excesso superior a 50% para suspensão quando essa categoria é escolhida', () => {
    const fixture = buildCompleteTestIdentificationFixture('suspensao_cnh', 'primeira_notificacao', 'excesso_velocidade', emptyInfraction);
    expect(fixture.category).toBe('excesso_velocidade');
    expect(fixture.infractionData.infractionCode).toBe('747-10');
    expect(fixture.infractionData.speedLimit).toBe(50);
    expect(fixture.infractionData.measuredSpeed).toBe(85);
    expect(fixture.infractionData.consideredSpeed).toBeGreaterThan(75);
  });
});
