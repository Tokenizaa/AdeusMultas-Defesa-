import { Router } from 'express';
import {
  USER_SITUATIONS,
  USER_PROCESS_STAGES,
  RULES_MATRIX,
} from '../../core/onboarding/rules-matrix';

const router = Router();

/**
 * GET /api/onboarding/rules
 * Source of truth for dynamic onboarding form — situation/stage/category matrix.
 * Dados derivados de src/core/onboarding/rules-matrix.ts (fonte única).
 */
router.get('/onboarding/rules', (_req, res) => {
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
    categoryRequirements: Object.fromEntries(
      Object.entries(RULES_MATRIX).map(([category, entry]) => [
        category,
        {
          required: entry.requiredFreeFields ?? [],
          optional: entry.optionalFreeFields ?? [],
          autoCalculated: entry.inferableFields ?? [],
        },
      ])
    ),
  };

  res.json(baseRules);
});

export default router;
