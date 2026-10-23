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
