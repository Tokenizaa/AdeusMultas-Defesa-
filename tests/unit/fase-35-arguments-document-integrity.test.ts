/**
 * FASE 3.5 — Arguments → Document integrity tests.
 *
 * Validates the monotonic authorization chain:
 *   CaseAnalysis.recommendedArguments
 *         ↓
 *   permittedTheses()
 *         ↓
 *   DocumentAssembly
 *         ↓
 *   Persistence
 *         ↓
 *   Read
 *
 * P0-01 through P0-12.
 *
 * Rule: only authorized IDs from the canonical chain can appear in the document.
 * No fallback from selectedArgumentIds, detectedInconsistencies,
 * procedure.applicableGrounds, catalog, or any other downstream source.
 */
import { describe, it, expect } from 'vitest';
import { DocumentAssemblyEngine } from '../../src/core/documents/document-assembly-engine';
import { RagPipeline } from '../../src/core/rag/rag-pipeline';
import { ARGUMENTS_CATALOG } from '../../src/core/arguments/arguments-catalog';
import type { CaseAnalysis, InfractionData } from '../../src/types';

// ── Shared fixtures ──────────────────────────────────────────────────────────

const BASE_PAYLOAD = {
  caseId: 'case_test',
  procedureType: 'recurso_jari' as const,
  infraction: {
    aitNumber: 'AIT-12345',
    autuadorBody: 'DETRAN-SP',
    ctbArticle: '218',
    description: 'Excesso de velocidade',
    location: 'Av. Paulista, 1000',
    dateTime: '2024-01-15T10:30:00Z',
    severity: 'grave' as const,
    speedMeasured: 80,
    speedLimit: 60,
    speedConsidered: 73,
  },
  vehicle: {
    plate: 'ABC-1D23',
    model: 'Honda Civic',
  },
  applicant: {
    name: 'João da Silva',
    cpf: '123.456.789-00',
    cnh: '98765432100',
    address: 'Rua das Flores, 123',
    cityState: 'São Paulo/SP',
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

const makeAnalysis = (
  recommendedArguments: string[],
  detectedInconsistencies: { legalArgumentId: string }[] = []
): CaseAnalysis => ({
  id: 'anl_test',
  caseId: 'case_test',
  overallSuccessRate: 88,
  detectedInconsistencies: detectedInconsistencies.map((i) => ({
    title: 'Test',
    description: 'Test',
    severity: 'alta' as const,
    legalArgumentId: i.legalArgumentId,
    impact: 'Test',
  })),
  recommendedArguments: recommendedArguments
    .map((id) => {
      const arg = ARGUMENTS_CATALOG.find((a) => a.id === id);
      if (!arg) return null;
      return {
        id: arg.id,
        code: arg.code,
        title: arg.title,
        category: arg.category,
        legalBase: arg.legalBase,
        summary: arg.description,
        detailedText: arg.formattedParagraphs.map((p) => `${p.heading}\n${p.text}`).join('\n\n'),
        applicabilityNote: arg.whenToUse.join('; '),
        contranResolution: arg.resolutions.join(', '),
        confidenceScore: arg.confidenceScore,
      };
    })
    .filter(Boolean) as CaseAnalysis['recommendedArguments'],
  recommendedProcedure: 'recurso_jari' as const,
  competentBody: 'DETRAN-SP',
  summaryReasoning: 'Test',
  createdAt: new Date().toISOString(),
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe('FASE 3.5 — Arguments → Document integrity', () => {
  describe('P0-01 — Authorized argument reaches the document', () => {
    it('P0-01: ARG-001 in recommendedArguments → ARG-001 in document', () => {
      const analysis = makeAnalysis(['ARG-001']);
      const result = DocumentAssemblyEngine.assemble({
        ...BASE_PAYLOAD,
        analysis,
      });
      expect(result.selectedArgumentIds).toContain('ARG-001');
    });

    it('P0-01: multiple authorized arguments all appear in document', () => {
      const analysis = makeAnalysis(['ARG-001', 'ARG-003']);
      const result = DocumentAssemblyEngine.assemble({
        ...BASE_PAYLOAD,
        analysis,
      });
      expect(result.selectedArgumentIds).toContain('ARG-001');
      expect(result.selectedArgumentIds).toContain('ARG-003');
    });
  });

  describe('P0-02 — Empty authorization produces zero legal arguments', () => {
    it('P0-02: recommendedArguments = [] → document has zero arguments', () => {
      const analysis = makeAnalysis([]);
      const result = DocumentAssemblyEngine.assemble({
        ...BASE_PAYLOAD,
        analysis,
      });
      expect(result.selectedArgumentIds).toHaveLength(0);
      expect(result.validation.appliedArgumentCount).toBe(0);
    });
  });

  describe('P0-03 — selectedArgumentIds cannot re-authorize when analysis is present', () => {
    it('P0-03: with analysis=[ARG-001], selectedArgumentIds=[ARG-003] → ARG-003 is NOT in document', () => {
      const analysis = makeAnalysis(['ARG-001']);
      const result = DocumentAssemblyEngine.assemble({
        ...BASE_PAYLOAD,
        analysis,
        selectedArgumentIds: ['ARG-003'],
      });
      // ARG-003 is NOT authorized by the analysis, selectedArgumentIds cannot add it
      expect(result.selectedArgumentIds).toContain('ARG-001');
      expect(result.selectedArgumentIds).not.toContain('ARG-003');
    });

    it('P0-03: with analysis=[], selectedArgumentIds=[ARG-001] → ARG-001 is NOT in document (analysis is empty authority)', () => {
      const analysis = makeAnalysis([]);
      const result = DocumentAssemblyEngine.assemble({
        ...BASE_PAYLOAD,
        analysis,
        selectedArgumentIds: ['ARG-001'],
      });
      // Empty analysis = zero authorization; selectedArgumentIds cannot fill the gap
      expect(result.selectedArgumentIds).toHaveLength(0);
    });
  });

  describe('P0-04 — detectedInconsistencies cannot authorize arguments', () => {
    it('P0-04: analysis with detectedInconsistencies but empty recommendedArguments → document has zero arguments', () => {
      // detectedInconsistencies contains ARG-025, but recommendedArguments is empty
      const analysis = makeAnalysis([], [{ legalArgumentId: 'ARG-025' }]);
      const result = DocumentAssemblyEngine.assemble({
        ...BASE_PAYLOAD,
        analysis,
      });
      expect(result.selectedArgumentIds).toHaveLength(0);
    });
  });

  describe('P0-05 — Unknown ID does not authorize catalog content', () => {
    it('P0-05: ARG-DOES-NOT-EXIST in recommendedArguments → filtered out', () => {
      const analysis = makeAnalysis(['ARG-001', 'ARG-DOES-NOT-EXIST']);
      const result = DocumentAssemblyEngine.assemble({
        ...BASE_PAYLOAD,
        analysis,
      });
      expect(result.selectedArgumentIds).toContain('ARG-001');
      expect(result.selectedArgumentIds).not.toContain('ARG-DOES-NOT-EXIST');
    });
  });

  describe('P0-06 — Argument order is preserved', () => {
    it('P0-06: recommendedArguments order is preserved in selectedArgumentIds', () => {
      const analysis = makeAnalysis(['ARG-003', 'ARG-001', 'ARG-002']);
      const result = DocumentAssemblyEngine.assemble({
        ...BASE_PAYLOAD,
        analysis,
      });
      expect(result.selectedArgumentIds).toEqual(['ARG-003', 'ARG-001', 'ARG-002']);
    });
  });

  describe('P0-07 — No legal fallback when authorization is empty', () => {
    it('P0-07: no analysis, no selectedArgumentIds → no legal text invented', () => {
      const result = DocumentAssemblyEngine.assemble({
        ...BASE_PAYLOAD,
        analysis: undefined,
        selectedArgumentIds: [],
      });
      // No argument text should appear
      expect(result.validation.appliedArgumentCount).toBe(0);
    });

    it('P0-07: no analysis, with selectedArgumentIds=valid → selectedArgumentIds used (legacy path)', () => {
      // This test documents the legacy behavior when no analysis is present.
      // With analysis present, selectedArgumentIds is blocked. Without analysis,
      // it falls back to selectedArgumentIds as a legacy compatibility mechanism.
      const result = DocumentAssemblyEngine.assemble({
        ...BASE_PAYLOAD,
        analysis: undefined,
        selectedArgumentIds: ['ARG-001'],
      });
      expect(result.selectedArgumentIds).toContain('ARG-001');
    });
  });

  describe('P0-08 — Real case data continues to interpolate normally', () => {
    it('P0-08: real payload data appears in document even with empty arguments', () => {
      const analysis = makeAnalysis([]);
      const result = DocumentAssemblyEngine.assemble({
        ...BASE_PAYLOAD,
        analysis,
      });
      expect(result.fullDraftText).toContain('AIT-12345');
      expect(result.fullDraftText).toContain('DETRAN-SP');
      expect(result.fullDraftText).toContain('João da Silva');
      expect(result.fullDraftText).toContain('123.456.789-00');
      expect(result.fullDraftText).toContain('ABC-1D23');
      expect(result.fullDraftText).toContain('São Paulo');
    });
  });

  describe('P0-09 — RagPipeline.generateDefenseDraft preserves authorization', () => {
    it('P0-09: generateDefenseDraft produces document matching authorized arguments', () => {
      const infraction: InfractionData = {
        ...BASE_PAYLOAD.infraction,
        code: '745-50',
        dateTime: '2024-01-15T10:30:00Z',
        notificationExpeditionDate: '2024-01-20T00:00:00Z',
      };
      const analysis = RagPipeline.analyzeInfraction('case_test', {
        ...infraction,
        radarCalibrationDate: '2023-01-01T00:00:00Z', // expired
      });

      const draft = RagPipeline.generateDefenseDraft(
        'case_test',
        infraction,
        'ABC-1D23',
        'Honda Civic',
        {
          name: 'João da Silva',
          cpf: '123.456.789-00',
          cnh: '98765432100',
          address: 'Rua das Flores, 123',
          cityState: 'São Paulo/SP',
        },
        analysis.recommendedArguments,
        'recurso_jari'
      );

      // The draft's selectedArgumentIds should be a subset of the analysis authorized IDs
      for (const id of draft.selectedArgumentIds) {
        expect(analysis.recommendedArguments.some((a) => a.id === id)).toBe(true);
      }
    });
  });

  describe('P0-10 — selectedArgumentIds is a subset of authorized IDs', () => {
    it('P0-10: document selectedArgumentIds ⊆ authorizedArguments (monotonic)', () => {
      const analysis = makeAnalysis(['ARG-001', 'ARG-003', 'ARG-002']);
      const result = DocumentAssemblyEngine.assemble({
        ...BASE_PAYLOAD,
        analysis,
      });
      for (const id of result.selectedArgumentIds) {
        expect(analysis.recommendedArguments.some((a) => a.id === id)).toBe(true);
      }
    });

    it('P0-10: empty analysis → empty document (no selectedArgumentIds leakage)', () => {
      const analysis = makeAnalysis([]);
      const result = DocumentAssemblyEngine.assemble({
        ...BASE_PAYLOAD,
        analysis,
        selectedArgumentIds: ['ARG-001'], // should be ignored
      });
      expect(result.selectedArgumentIds).toHaveLength(0);
    });
  });

  describe('P0-11 — No argument appears post-assembly without being authorized', () => {
    it('P0-11: fullDraftText does not contain unauthorized argument content', () => {
      const analysis = makeAnalysis(['ARG-001']); // only ARG-001 authorized
      const result = DocumentAssemblyEngine.assemble({
        ...BASE_PAYLOAD,
        analysis,
        selectedArgumentIds: ['ARG-003'], // not authorized
      });
      // ARG-003 content should NOT appear since it wasn't in recommendedArguments
      // (We check it doesn't appear as an uppercase title in the document)
      const arg003 = ARGUMENTS_CATALOG.find((a) => a.id === 'ARG-003');
      if (arg003) {
        expect(result.fullDraftText).not.toContain(arg003.title.toUpperCase());
      }
    });
  });

  describe('P0-12 — Document without legal arguments is structurally valid', () => {
    it('P0-12: empty authorization → document isValid=true, isReady=true', () => {
      const analysis = makeAnalysis([]);
      const result = DocumentAssemblyEngine.assemble({
        ...BASE_PAYLOAD,
        analysis,
      });
      expect(result.validation.isValid).toBe(true);
      expect(result.isReady).toBe(true);
    });
  });

  describe('P0-EXTRA — generateDefenseDraft via RagPipeline with analysis context', () => {
    it('P0-E1: RagPipeline.generateDefenseDraft called with analysis recommendedArguments', () => {
      // Simulate the flow: analyzeInfraction → recommendedArguments → generateDefenseDraft
      const infraction: InfractionData = {
        ...BASE_PAYLOAD.infraction,
        code: '745-50',
        dateTime: '2024-01-15T10:30:00Z',
        notificationExpeditionDate: '2024-01-20T00:00:00Z',
      };

      const analysis = RagPipeline.analyzeInfraction('case_test', infraction);

      const draft = RagPipeline.generateDefenseDraft(
        'case_test',
        infraction,
        'ABC-1D23',
        'Honda Civic',
        {
          name: 'João da Silva',
          cpf: '123.456.789-00',
          cnh: '98765432100',
          address: 'Rua das Flores, 123',
          cityState: 'São Paulo/SP',
        },
        analysis.recommendedArguments,
        'recurso_jari'
      );

      // All argument IDs in the draft must have been in recommendedArguments
      for (const id of draft.selectedArgumentIds) {
        const wasAuthorized = analysis.recommendedArguments.some((a) => a.id === id);
        expect(wasAuthorized, `Argument ${id} was not in recommendedArguments`).toBe(true);
      }
    });
  });
});
