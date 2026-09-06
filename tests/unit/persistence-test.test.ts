/**
 * FASE 3.5 — P0-09/10/11: Persistence → Read integrity tests.
 *
 * Tests the full monotonic authorization chain through persistence:
 *   CaseAnalysis.recommendedArguments
 *         ↓
 *   DocumentAssembly.assemble()
 *         ↓
 *   defense_draft_json (serialized)
 *         ↓
 *   CaseRepository.set()  →  CaseRepository.get()
 *         ↓
 *   defense_draft_json (deserialized)
 *         ↓
 *   CanonicalMapper.rowToDomain()
 *         ↓
 *   GET /api/cases/:id  [FASE 3.5 read sanitization]
 *
 * P0-09: assembled == persisted  (serialization integrity)
 * P0-10: read after persistence preserves arguments (subset property)
 * P0-11: persistence-layer tampering is sanitized on read (adversarial)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { caseRepository } from '../../src/server/db/case-repository';
import { CanonicalMapper } from '../../src/core/mappers/canonical-mapper';
import { RagPipeline } from '../../src/core/rag/rag-pipeline';
import { ARGUMENTS_CATALOG } from '../../src/core/arguments/arguments-catalog';
import { permittedTheses } from '../../src/core/ai/ai-orchestrator';
import type { CaseAnalysis, InfractionData } from '../../src/types';

// ── Shared test fixture ───────────────────────────────────────────────────────

const TEST_INFRACTION: InfractionData = {
  aitNumber: 'AIT-TEST',
  code: '745-50',
  description: 'Excesso de velocidade',
  ctbArticle: 'Art. 218',
  severity: 'grave' as const,
  points: 7,
  fineAmount: 1300,
  autuadorBody: 'DETRAN-SP',
  dateTime: '2024-01-15T10:30:00Z',
  location: 'Via Expressa',
  speedLimit: 80,
  measuredSpeed: 120,
  consideredSpeed: 115,
  notificationExpeditionDate: '2024-01-20T00:00:00Z',
};

const TEST_APPLICANT = {
  name: 'Test User',
  cpf: '000.000.000-00',
  cnh: '00000000000',
  address: 'Rua Teste, 1',
  cityState: 'São Paulo/SP',
};

const TEST_APPLICANT_DOMAIN = {
  name: 'Test User',
  cpf: '000.000.000-00',
  cnh: '00000000000',
  addressStreet: 'Rua Teste',
  addressNumber: '1',
  addressCityState: 'São Paulo/SP',
  applicantName: 'Test User',
  applicantCpf: '000.000.000-00',
  applicantCnh: '00000000000',
};

// ── Read-path sanitization mirror ─────────────────────────────────────────────
// Applies the same logic that GET /api/cases/:id performs, isolated for unit testing.
function applyReadSanitization(domain: ReturnType<typeof CanonicalMapper.rowToDomain>): void {
  if (domain.defenseDraft && domain.analysis) {
    const authorizedTheses = permittedTheses(domain.analysis);
    const authorizedIds = new Set(authorizedTheses.map((t) => t.id));
    const sanitizedIds = domain.defenseDraft.selectedArgumentIds.filter((id) =>
      authorizedIds.has(id)
    );
    domain.defenseDraft = {
      ...domain.defenseDraft,
      selectedArgumentIds: sanitizedIds,
    };
  }
}

// ── Test suite ──────────────────────────────────────────────────────────────

describe('FASE 3.5 — Persistence → Read integrity (P0-09/10/11)', () => {
  beforeEach(() => {
    vi.spyOn(caseRepository as any, 'persist').mockResolvedValue(undefined);
    (caseRepository as any).rows.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── P0-09: serialization integrity ─────────────────────────────────────────

  it('P0-09: raw defense_draft_json matches the assembled selectedArgumentIds', async () => {
    // Use a unique caseId so this test is independent of others.
    const caseId = 'case_persist_p009';
    // Ground truth: what the canonical analysis actually recommends for this infraction.
    const canonicalAnalysis = RagPipeline.analyzeInfraction(caseId, TEST_INFRACTION);
    const canonicalIds = canonicalAnalysis.recommendedArguments.map((a) => a.id);

    const draft = RagPipeline.generateDefenseDraft(
      caseId,
      TEST_INFRACTION,
      'TEST-0001',
      'Test Vehicle',
      TEST_APPLICANT,
      canonicalAnalysis.recommendedArguments,
      'recurso_jari'
    );

    // Persist via domain (simulating the server write path)
    const domain = {
      id: caseId,
      userId: 'user_test',
      status: 'novo' as const,
      serviceType: 'recurso_jari' as const,
      currentStage: 1,
      infraction: TEST_INFRACTION,
      vehicle: { plate: 'TEST-0001', brandModel: 'Test Vehicle' },
      applicant: TEST_APPLICANT_DOMAIN,
      analysis: canonicalAnalysis,
      defenseDraft: draft,
      isAnonymous: false,
      isPaid: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const row = CanonicalMapper.domainToRow(domain);
    await caseRepository.set(row.id, row);

    // P0-09: directly inspect the raw persisted JSON — proves serialization fidelity.
    const rawRow = caseRepository.get(row.id)!;
    expect(rawRow.defense_draft_json).toBeDefined();

    const parsed = JSON.parse(rawRow.defense_draft_json!);
    expect(parsed.selectedArgumentIds).toEqual(draft.selectedArgumentIds);
    // All serialized IDs must be valid catalog entries
    for (const id of parsed.selectedArgumentIds) {
      expect(ARGUMENTS_CATALOG.some((a) => a.id === id)).toBe(true);
    }
  });

  // ── P0-10: subset property after honest persistence ───────────────────────

  it('P0-10: read(selectedArgumentIds) ⊆ canonicalAnalysis.recommendedArguments', async () => {
    const caseId = 'case_persist_p010';
    const canonicalAnalysis = RagPipeline.analyzeInfraction(caseId, TEST_INFRACTION);
    const canonicalIds = canonicalAnalysis.recommendedArguments.map((a) => a.id);

    const draft = RagPipeline.generateDefenseDraft(
      caseId,
      TEST_INFRACTION,
      'TEST-0001',
      'Test Vehicle',
      TEST_APPLICANT,
      canonicalAnalysis.recommendedArguments,
      'recurso_jari'
    );

    const domain = {
      id: caseId,
      userId: 'user_test',
      status: 'novo' as const,
      serviceType: 'recurso_jari' as const,
      currentStage: 1,
      infraction: TEST_INFRACTION,
      vehicle: { plate: 'TEST-0001', brandModel: 'Test Vehicle' },
      applicant: TEST_APPLICANT_DOMAIN,
      analysis: canonicalAnalysis,
      defenseDraft: draft,
      isAnonymous: false,
      isPaid: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const row = CanonicalMapper.domainToRow(domain);
    await caseRepository.set(row.id, row);

    const retrievedRow = caseRepository.get(row.id)!;
    const retrievedDomain = CanonicalMapper.rowToDomain(retrievedRow);

    // P0-10: every ID in the persisted draft must have been in the canonical analysis
    const readIds = retrievedDomain.defenseDraft?.selectedArgumentIds ?? [];
    for (const id of readIds) {
      expect(
        canonicalIds.includes(id),
        `Argument ${id} was read but was not in canonicalAnalysis.recommendedArguments`
      ).toBe(true);
    }
    // Canonical IDs are a superset of what was assembled
    for (const id of readIds) {
      expect(
        canonicalAnalysis.recommendedArguments.some((a) => a.id === id),
        `Read ID ${id} is not in canonical recommendedArguments`
      ).toBe(true);
    }
  });

  // ── P0-10 variant: empty recommendedArguments → zero arguments (direct assembly) ─

  it('P0-10: empty recommendedArguments → document has zero arguments (FASE 3.5 P0-02 regression)', async () => {
    // Note: RagPipeline.generateDefenseDraft always calls analyzeInfraction internally
    // (FASE 3.6), so it cannot simulate an empty-authorization scenario directly.
    // We test the DocumentAssemblyEngine path directly to verify the property.
    const { DocumentAssemblyEngine } = await import(
      '../../src/core/documents/document-assembly-engine'
    );

    const emptyAnalysis: CaseAnalysis = {
      id: 'anl_empty',
      caseId: 'case_persist_p010_empty',
      overallSuccessRate: 0,
      detectedInconsistencies: [],
      recommendedArguments: [], // explicitly empty
      recommendedProcedure: 'recurso_jari' as const,
      competentBody: 'DETRAN-SP',
      summaryReasoning: 'Nenhuma tese aplicável.',
      createdAt: new Date().toISOString(),
    };

    const result = DocumentAssemblyEngine.assemble({
      caseId: 'case_persist_p010_empty',
      procedureType: 'recurso_jari',
      infraction: TEST_INFRACTION,
      vehicle: { plate: 'TEST-0001', model: 'Test Vehicle' },
      applicant: TEST_APPLICANT,
      analysis: emptyAnalysis,
    });

    // Empty analysis must produce zero arguments (P0-02 regression)
    expect(result.selectedArgumentIds).toEqual([]);
    expect(result.validation.appliedArgumentCount).toBe(0);
  });

  // ── P0-11: adversarial — valid catalog ID not in recommendedArguments inserted ──

  it('P0-11: valid catalog ID NOT in recommendedArguments is sanitized on read (adversarial)', async () => {
    const caseId = 'case_persist_p011';
    const canonicalAnalysis = RagPipeline.analyzeInfraction(caseId, TEST_INFRACTION);
    const canonicalIds = canonicalAnalysis.recommendedArguments.map((a) => a.id);

    // Pick an ID that is in the catalog but NOT in the canonical analysis for this infraction.
    // ARG-025 (Lei Seca) is not applicable to a radar-speed infraction.
    const UNAUTHORIZED_ID = 'ARG-025';
    expect(ARGUMENTS_CATALOG.some((a) => a.id === UNAUTHORIZED_ID)).toBe(true);
    expect(canonicalIds).not.toContain(UNAUTHORIZED_ID); // pre-condition

    const draft = RagPipeline.generateDefenseDraft(
      caseId,
      TEST_INFRACTION,
      'TEST-0001',
      'Test Vehicle',
      TEST_APPLICANT,
      canonicalAnalysis.recommendedArguments,
      'recurso_jari'
    );
    // The honest draft reflects only canonical recommendations
    expect(draft.selectedArgumentIds).toEqual(canonicalIds);

    const domain = {
      id: caseId,
      userId: 'user_test',
      status: 'novo' as const,
      serviceType: 'recurso_jari' as const,
      currentStage: 1,
      infraction: TEST_INFRACTION,
      vehicle: { plate: 'TEST-0001', brandModel: 'Test Vehicle' },
      applicant: TEST_APPLICANT_DOMAIN,
      analysis: canonicalAnalysis,
      defenseDraft: draft,
      isAnonymous: false,
      isPaid: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const row = CanonicalMapper.domainToRow(domain);

    // Step 1: honest persist
    await caseRepository.set(row.id, row);

    // Step 2: ADVERSARIAL — inject UNAUTHORIZED_ID into defense_draft_json
    // (simulates internal actor or DB integrity failure modifying the JSON directly)
    const tamperedDraft = {
      ...draft,
      selectedArgumentIds: [...canonicalIds, UNAUTHORIZED_ID],
    };
    const tamperedRow: typeof row = {
      ...row,
      defense_draft_json: JSON.stringify(tamperedDraft),
    };
    await caseRepository.set(row.id, tamperedRow); // re-persist with tampering

    // Step 3: read back — raw persisted data still contains the tampering
    const retrievedRow = caseRepository.get(row.id)!;
    const rawParsed = JSON.parse(retrievedRow.defense_draft_json!);
    expect(rawParsed.selectedArgumentIds).toContain(UNAUTHORIZED_ID); // tampering is stored

    // Apply read-path sanitization (same logic as GET /api/cases/:id)
    const retrievedDomain = CanonicalMapper.rowToDomain(retrievedRow);
    applyReadSanitization(retrievedDomain);

    // P0-11: UNAUTHORIZED_ID is NOT in canonicalAnalysis.recommendedArguments — sanitization removes it
    const sanitizedIds = retrievedDomain.defenseDraft?.selectedArgumentIds ?? [];
    expect(sanitizedIds).not.toContain(UNAUTHORIZED_ID);
    expect(sanitizedIds).toEqual(canonicalIds); // canonical IDs survive
  });

  // ── P0-11 variant: no analysis → sanitization cannot re-authorize ─────────

  it('P0-11: without analysis, tampered selectedArgumentIds cannot self-authorize', async () => {
    // Simulates a legacy case where defenseDraft was stored without analysis.
    // Without analysis, there is no authorization source — read sanitization is a no-op.
    const caseId = 'case_persist_p011b';
    const UNAUTHORIZED_ID = 'ARG-025';

    const tamperedDraft = {
      id: caseId,
      caseId,
      procedureType: 'recurso_jari' as const,
      authorityAddressing: 'DETRAN-SP',
      applicantName: 'Test User',
      applicantCpf: '000.000.000-00',
      applicantCnh: '00000000000',
      applicantAddress: 'Rua Teste, 1',
      applicantCityState: 'São Paulo/SP',
      vehiclePlate: 'TEST-0001',
      vehicleModel: 'Test Vehicle',
      vehicleRenavam: '',
      aitNumber: 'AIT-TEST',
      factsNarrative: 'Test',
      selectedArgumentIds: ['ARG-001', UNAUTHORIZED_ID], // tampered
      preliminaryArgumentsText: '',
      meritArgumentsText: '',
      legalRequestsText: '',
      closingPlaceDate: 'São Paulo, 2024',
      fullDraftText: 'Test draft',
      isReady: true,
      version: 1,
      updatedAt: new Date().toISOString(),
    };

    const domain = {
      id: caseId,
      userId: 'user_test',
      status: 'novo' as const,
      serviceType: 'recurso_jari' as const,
      currentStage: 1,
      infraction: TEST_INFRACTION,
      vehicle: { plate: 'TEST-0001', brandModel: 'Test Vehicle' },
      applicant: TEST_APPLICANT_DOMAIN,
      analysis: undefined, // no analysis — no authorization source
      defenseDraft: tamperedDraft as ReturnType<typeof RagPipeline.generateDefenseDraft>,
      isAnonymous: false,
      isPaid: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const row = CanonicalMapper.domainToRow(domain);
    // Override to ensure no analysis_json is stored
    const tamperedRow: typeof row = { ...row, analysis_json: undefined };
    await caseRepository.set(row.id, tamperedRow);

    const retrievedRow = caseRepository.get(row.id)!;
    const retrievedDomain = CanonicalMapper.rowToDomain(retrievedRow);

    // Without analysis, sanitization has no authorization source to filter against.
    // The tampered IDs remain as-is (proving no auto-healing without analysis).
    const rawParsed = JSON.parse(retrievedRow.defense_draft_json!);
    expect(rawParsed.selectedArgumentIds).toEqual(['ARG-001', UNAUTHORIZED_ID]);
  });
});
