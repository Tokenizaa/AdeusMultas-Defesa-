import { describe, expect, it } from 'vitest';
import { resolveOnboardingProcedure } from './rules-matrix';

describe('resolveOnboardingProcedure — serviço de multas', () => {
  it('encaminha a primeira notificação para Defesa Prévia', () => {
    expect(resolveOnboardingProcedure('multa_transito', 'primeira_notificacao')).toBe('defesa_previa');
  });

  it('encaminha a notificação de penalidade para recurso à JARI', () => {
    expect(resolveOnboardingProcedure('multa_transito', 'notificacao_penalidade')).toBe('recurso_jari');
  });

  it('encaminha defesa prévia indeferida para a JARI', () => {
    expect(resolveOnboardingProcedure('multa_transito', 'defesa_negada')).toBe('recurso_jari');
  });

  it('encaminha recurso à JARI indeferido para o CETRAN', () => {
    expect(resolveOnboardingProcedure('multa_transito', 'recurso_jari_negado')).toBe('recurso_cetran');
  });

  it('mantém a fase não confirmada como análise técnica, sem presumir JARI', () => {
    expect(resolveOnboardingProcedure('multa_transito', 'nao_tenho_certeza')).toBe('analise_tecnica');
  });

  it('preserva serviços especializados mesmo que outra fase esteja selecionada', () => {
    expect(resolveOnboardingProcedure('suspensao_cnh', 'notificacao_penalidade')).toBe('suspensao_cnh');
    expect(resolveOnboardingProcedure('cassacao_cnh', 'recurso_jari_negado')).toBe('cassacao_cnh');
    expect(resolveOnboardingProcedure('conversao_advertencia', 'notificacao_penalidade')).toBe('conversao_advertencia');
    expect(resolveOnboardingProcedure('indicacao_condutor', 'notificacao_penalidade')).toBe('indicacao_condutor');
  });

  it('respeita as situações que já definem a fase do procedimento', () => {
    expect(resolveOnboardingProcedure('defesa_previa', 'notificacao_penalidade')).toBe('defesa_previa');
    expect(resolveOnboardingProcedure('recurso_cetran', 'primeira_notificacao')).toBe('recurso_cetran');
  });
});
