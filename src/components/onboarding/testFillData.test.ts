import { describe, expect, it } from 'vitest';
import type { InfractionData } from '../../types';
import { buildCoherentTestInfraction } from './testFillData';

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

  it('mantém a circunstância de estacionamento coerente com o código do catálogo', () => {
    for (let i = 0; i < 50; i++) {
      const data = buildCoherentTestInfraction('estacionamento', emptyInfraction);
      if (data.notes === 'estacionamento_zona_azul_app') {
        expect(data.infractionCode).toBe('554-12');
      } else {
        expect(data.notes).toBe('estacionamento_passeio_faixa');
        expect(data.infractionCode).toBe('545-21');
      }
    }
  });

  it('preenche os dados obrigatórios do condutor indicado', () => {
    const data = buildCoherentTestInfraction('indicacao_condutor', emptyInfraction);
    expect(data.realDriverName).toBeTruthy();
    expect(data.realDriverCpf).toMatch(/^\d{11}$/);
    expect(data.realDriverCnh).toMatch(/^\d{11}$/);
    expect(data.indicationWithinDeadline).toBe(true);
  });

  it('marca o requisito de advertência e usa infração leve ou média elegível', () => {
    const data = buildCoherentTestInfraction('conversao_advertencia', emptyInfraction);
    expect(data.hasPreviousInfractionsLast12Months).toBe(false);
    expect(['leve', 'media']).toContain(data.severity);
  });
  it('preenche as três datas de notificação em formato ISO e em ordem cronológica para todas as categorias', () => {
    const categories = [
      'excesso_velocidade',
      'lei_seca',
      'celular',
      'vermelho',
      'estacionamento',
      'indicacao_condutor',
      'conversao_advertencia',
    ] as const;

    for (const category of categories) {
      const data = buildCoherentTestInfraction(category, emptyInfraction);
      expect(data.dateTime).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(data.notificationExpeditionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(data.notificationDeliveryDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(data.defenseDeadline).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(data.notificationExpeditionDate! > data.dateTime).toBe(true);
      expect(data.notificationDeliveryDate! > data.notificationExpeditionDate!).toBe(true);
      expect(data.defenseDeadline! > data.notificationDeliveryDate!).toBe(true);
    }
  });

  it('gera velocidade considerada acima do limite para o código 745-50', () => {
    for (let i = 0; i < 100; i++) {
      const data = buildCoherentTestInfraction('excesso_velocidade', emptyInfraction);
      expect(data.consideredSpeed).toBeGreaterThan(data.speedLimit!);
      expect(data.consideredSpeed).toBeLessThanOrEqual(data.speedLimit! * 1.2);
    }
  });

  it('não marca termo de sinais como “sem sinais” quando a situação é recusa', () => {
    // O gerador sorteia entre recusa e teste positivo; testar repetidamente
    // cobre os dois ramos sem depender de Math.random.
    const samples = Array.from({ length: 50 }, () => buildCoherentTestInfraction('lei_seca', emptyInfraction));
    const refusals = samples.filter((data) => data.refusedTest === true);
    expect(refusals.length).toBeGreaterThan(0);
    for (const data of refusals) {
      expect(data.hasPsychomotorTerm).toBeUndefined();
      expect(data.offeredRetest).toBe(false);
    }
  });

});
