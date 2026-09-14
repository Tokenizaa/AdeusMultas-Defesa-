import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../supabase';

/**
 * Matriz canônica do onboarding (espelhada de src/core/onboarding/rules-matrix.ts).
 * Fonte única é o arquivo TS do monorepo; este espelho mantém o worker autônomo.
 * ponytail: re-sincronizar quando rules-matrix.ts mudar.
 */
const USER_SITUATIONS = [
  { id: 'multa_transito', title: 'Multa de Trânsito', mappedProcedure: 'recurso_jari', inferredStage: undefined },
  { id: 'conversao_advertencia', title: 'Conversão em Advertência', mappedProcedure: 'conversao_advertencia', inferredStage: 'applied' },
  { id: 'indicacao_condutor', title: 'Indicação de Condutor', mappedProcedure: 'indicacao_condutor', inferredStage: 'applied' },
  { id: 'suspensao_cnh', title: 'Suspensão de CNH', mappedProcedure: 'suspensao_cnh', inferredStage: undefined },
  { id: 'cassacao_cnh', title: 'Cassação de CNH', mappedProcedure: 'cassacao_cnh', inferredStage: undefined },
];

const USER_PROCESS_STAGES = [
  { id: 'primeira_notificacao', title: 'Primeira Notificação / Defesa Prévia', mappedProcedure: 'defesa' },
  { id: 'recurso_jari', title: 'Recurso à JARI', mappedProcedure: 'recurso_jari' },
  { id: 'recurso_cetran', title: 'Recurso ao CETRAN', mappedProcedure: 'recurso_cetran' },
  { id: 'defesa_negada', title: 'Defesa Negada', mappedProcedure: 'recurso_jari' },
  { id: 'recurso_jari_negado', title: 'Recurso JARI Negado', mappedProcedure: 'recurso_cetran' },
];

const CATEGORY_REQUIREMENTS: Record<string, { required: string[]; optional: string[]; autoCalculated: string[] }> = {
  excesso_velocidade: {
    required: ['speedLimit', 'measuredSpeed'],
    optional: ['radarEquipmentId', 'inmetroAferitionDate'],
    autoCalculated: ['consideredSpeed'],
  },
  lei_seca: {
    required: ['refusedTest'],
    optional: ['hasPsychomotorTerm', 'offeredRetest'],
    autoCalculated: [],
  },
  celular: {
    required: ['cellphoneCircumstance'],
    optional: [],
    autoCalculated: [],
  },
  vermelho: {
    required: ['yellowPhaseCrossing'],
    optional: ['hasPhotoProof'],
    autoCalculated: [],
  },
  estacionamento: {
    required: [],
    optional: [],
    autoCalculated: [],
  },
  outro: {
    required: [],
    optional: ['notes'],
    autoCalculated: [],
  },
};

export const onboardingRoutes = new Hono<{ Bindings: Env }>();

// GET /api/onboarding/rules — matriz dinâmica do formulário
onboardingRoutes.get('/onboarding/rules', (c) => {
  const baseRules = {
    situations: USER_SITUATIONS.map((s) => ({
      id: s.id,
      title: s.title,
      mappedProcedure: s.mappedProcedure,
      inferredStage: s.inferredStage ?? undefined,
      requiresStageSelection: !s.inferredStage,
    })),
    stages: USER_PROCESS_STAGES.map((s) => ({
      id: s.id,
      title: s.title,
      mappedProcedure: s.mappedProcedure,
    })),
    phase1CoreFields: ['aitNumber', 'plate', 'autuadorBody'],
    phase2QualificationFields: [
      'applicantName', 'applicantCpf', 'applicantCnh', 'applicantEmail', 'applicantPhone',
      'addressStreet', 'addressNumber', 'addressNeighborhood', 'addressZipCode', 'addressCityState',
    ],
    categoryRequirements: CATEGORY_REQUIREMENTS,
  };
  return c.json(baseRules);
});

export default onboardingRoutes;