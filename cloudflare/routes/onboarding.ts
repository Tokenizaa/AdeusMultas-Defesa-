import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../supabase';
import {
  USER_SITUATIONS,
  USER_PROCESS_STAGES,
  RULES_MATRIX,
} from '../../src/core/onboarding/rules-matrix';

/**
 * Matriz canônica do onboarding — importada da fonte única em src/core/onboarding/rules-matrix.ts
 */

export const onboardingRoutes = new Hono<{ Bindings: Env }>();

// GET /api/onboarding/rules — matriz dinâmica do formulário
onboardingRoutes.get('/onboarding/rules', (c) => {
  const baseRules = {
    situations: USER_SITUATIONS.map((s) => ({
      id: s.id,
      title: s.title,
      subtitle: s.subtitle,
      badge: s.badge,
      mappedProcedure: s.mappedProcedure,
      inferredStage: s.inferredStage ?? undefined,
      requiresStageSelection: !s.inferredStage,
      defaultInfractionCategory: s.defaultInfractionCategory,
    })),
    stages: USER_PROCESS_STAGES.map((s) => ({
      id: s.id,
      title: s.title,
      subtitle: s.subtitle,
      badge: s.badge,
      mappedProcedure: s.mappedProcedure,
    })),
    phase1CoreFields: ['aitNumber', 'location', 'dateTime'],
    phase2QualificationFields: [
      'applicantName', 'applicantCpf', 'applicantCnh', 'cnhCategory', 'applicantEmail', 'applicantPhone',
      'addressStreet', 'addressNumber', 'addressNeighborhood', 'addressZipCode', 'addressCityState',
    ],
    categoryRequirements: Object.fromEntries(
      Object.entries(RULES_MATRIX).map(([category, rules]) => [
        category,
        {
          required: rules.requiredFreeFields ?? [],
          optional: rules.optionalFreeFields ?? [],
          autoCalculated: rules.inferableFields ?? [],
        },
      ])
    ),
  };
  return c.json(baseRules);
});