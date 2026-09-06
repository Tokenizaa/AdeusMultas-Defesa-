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
 *
 * P0-09: assembled == persisted
 * P0-10: read after persistence preserves arguments
 * P0-11: no argument appears post-persistence without being authorized
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { caseRepository } from '../../src/server/db/case-repository';
import { CanonicalMapper } from '../../src/core/mappers/canonical-mapper';
import { RagPipeline } from '../../src/core/rag/rag-pipeline';
import { ARGUMENTS_CATALOG } from '../../src/core/arguments/arguments-catalog';
import type { CaseAnalysis, InfractionData } from '../../src/types';

// ── Helpers ─────────────────────────────────────────────────────────────────

const makeCaseDomain = (analysis: CaseAnalysis) => ({
  id: 'case_persist_test',
  userId: 'user_test',
  status: 'novo' as const,
  serviceType: 'recurso_jari' as const,
  currentStage: 1,
  infraction: {
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
  } as InfractionData,
  vehicle: {
    plate: 'TEST-0001',
    brandModel: 'Test Vehicle',
  },
  applicant: {
    name: 'Test User',
    cpf: '000.000.000-00',
    cnh: '00000000000',
    addressStreet: 'Rua Teste',
    addressNumber: '1',
    addressCityState: 'São Paulo/SP',
    applicantName: 'Test User',
    applicantCpf: '000.000.000-00',
    applicantCnh: '00000000000',
  },
  analysis,
  defenseDraft: undefined as ReturnType<typeof RagPipeline.generateDefenseDraft> | undefined,
  isAnonymous: false,
  isPaid: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const makeAnalysis = (recommendedArgumentIds: string[]): CaseAnalysis => ({
  id: 'anl_persist',
  caseId: 'case_persist_test',
  overallSuccessRate: 88,
  detectedInconsistencies: [],
  recommendedArguments: recommendedArgumentIds
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
  summaryReasoning: 'Test persistence',
  createdAt: new Date().toISOString(),
});

// ── Test suite ──────────────────────────────────────────────────────────────

describe('FASE 3.5 — Persistence → Read integrity (P0-09/10/11)', () => {
  // Prevent actual Supabase calls; allow rows.set() to still execute
  beforeEach(() => {
    vi.spyOn(caseRepository as any, 'persist').mockResolvedValue(undefined);
    // Clear in-memory state between tests
    (caseRepository as any).rows.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── P0-09: assembly == persisted ─────────────────────────────────────────

  it('P0-09: assembled selectedArgumentIds are exactly what gets persisted', async () => {
    // Step 1: analysis → document assembly
    const authorizedIds = ['ARG-001', 'ARG-003'];
    const analysis = makeAnalysis(authorizedIds);

    const draft = RagPipeline.generateDefenseDraft(
      'case_persist_test',
      {
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
      },
      'TEST-0001',
      'Test Vehicle',
      {
        name: 'Test User',
        cpf: '000.000.000-00',
        cnh: '00000000000',
        address: 'Rua Teste, 1',
        cityState: 'São Paulo/SP',
      },
      analysis.recommendedArguments,
      'recurso_jari'
    );

    // Step 2: build domain with the assembled draft
    const domain = makeCaseDomain(analysis);
    domain.defenseDraft = draft;

    // Step 3: serialize → persist → deserialize
    const row = CanonicalMapper.domainToRow(domain);
    await caseRepository.set(row.id, row);

    // Step 4: retrieve from repository
    const retrievedRow = caseRepository.get(row.id);
    expect(retrievedRow).toBeDefined();

    // Step 5: deserialize back to domain
    const retrievedDomain = CanonicalMapper.rowToDomain(retrievedRow!);

    // Assertion: selectedArgumentIds roundtrip is EXACTLY the same
    expect(retrievedDomain.defenseDraft?.selectedArgumentIds).toEqual(
      domain.defenseDraft?.selectedArgumentIds
    );
  });

  // ── P0-10: read after persistence preserves arguments ────────────────────

  it('P0-10: read(selectedArgumentIds) equals authorized set — monotonic property', async () => {
    const authorizedIds = ['ARG-001', 'ARG-003', 'ARG-002'];
    const analysis = makeAnalysis(authorizedIds);

    const draft = RagPipeline.generateDefenseDraft(
      'case_persist_test',
      {
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
      },
      'TEST-0001',
      'Test Vehicle',
      {
        name: 'Test User',
        cpf: '000.000.000-00',
        cnh: '00000000000',
        address: 'Rua Teste, 1',
        cityState: 'São Paulo/SP',
      },
      analysis.recommendedArguments,
      'recurso_jari'
    );

    const domain = makeCaseDomain(analysis);
    domain.defenseDraft = draft;

    const row = CanonicalMapper.domainToRow(domain);
    await caseRepository.set(row.id, row);
    const retrievedRow = caseRepository.get(row.id)!;
    const retrievedDomain = CanonicalMapper.rowToDomain(retrievedRow);

    // P0-10: every ID returned by read() must have been authorized
    for (const id of retrievedDomain.defenseDraft?.selectedArgumentIds ?? []) {
      expect(
        authorizedIds.includes(id),
        `Argument ${id} was read from persistence but was not in authorizedArguments`
      ).toBe(true);
    }

    // Count must match (all authorized IDs were persisted and read)
    expect(retrievedDomain.defenseDraft?.selectedArgumentIds).toHaveLength(
      authorizedIds.length
    );
  });

  // ── P0-11: no argument appears post-persistence without authorization ────

  it('P0-11: unauthorized ID is NOT present in document after roundtrip', async () => {
    // Only ARG-001 is authorized; ARG-DOES-NOT-EXIST is not in the catalog
    const analysis = makeAnalysis(['ARG-001']);

    const draft = RagPipeline.generateDefenseDraft(
      'case_persist_test',
      {
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
      },
      'TEST-0001',
      'Test Vehicle',
      {
        name: 'Test User',
        cpf: '000.000.000-00',
        cnh: '00000000000',
        address: 'Rua Teste, 1',
        cityState: 'São Paulo/SP',
      },
      analysis.recommendedArguments,
      'recurso_jari'
    );

    const domain = makeCaseDomain(analysis);
    domain.defenseDraft = draft;

    const row = CanonicalMapper.domainToRow(domain);
    await caseRepository.set(row.id, row);
    const retrievedRow = caseRepository.get(row.id)!;
    const retrievedDomain = CanonicalMapper.rowToDomain(retrievedRow);

    // P0-11: no unauthorized argument appears after roundtrip
    const readIds = retrievedDomain.defenseDraft?.selectedArgumentIds ?? [];
    const notInCatalog = readIds.filter(
      (id) => !ARGUMENTS_CATALOG.some((a) => a.id === id)
    );
    expect(notInCatalog, 'No unknown IDs should appear after roundtrip').toHaveLength(0);

    // And all read IDs must be a subset of authorized
    for (const id of readIds) {
      expect(
        analysis.recommendedArguments.some((a) => a.id === id),
        `Argument ${id} was read from persistence but was not in recommendedArguments`
      ).toBe(true);
    }
  });

  // ── P0-09 variant: single argument ──────────────────────────────────────

  it('P0-09: single authorized argument survives assembly → persist → read', async () => {
    const analysis = makeAnalysis(['ARG-001']);
    const draft = RagPipeline.generateDefenseDraft(
      'case_persist_test',
      {
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
      },
      'TEST-0001',
      'Test Vehicle',
      {
        name: 'Test User',
        cpf: '000.000.000-00',
        cnh: '00000000000',
        address: 'Rua Teste, 1',
        cityState: 'São Paulo/SP',
      },
      analysis.recommendedArguments,
      'recurso_jari'
    );

    const domain = makeCaseDomain(analysis);
    domain.defenseDraft = draft;
    const row = CanonicalMapper.domainToRow(domain);
    await caseRepository.set(row.id, row);
    const retrievedRow = caseRepository.get(row.id)!;
    const retrievedDomain = CanonicalMapper.rowToDomain(retrievedRow);

    expect(retrievedDomain.defenseDraft?.selectedArgumentIds).toEqual(
      domain.defenseDraft?.selectedArgumentIds
    );
  });

  // ── P0-10 variant: empty authorization survives ────────────────────────

  it('P0-10: empty authorization → empty after persist → read (no leakage)', async () => {
    const analysis = makeAnalysis([]); // empty authorization

    // Build a valid payload even with no authorized arguments
    const draft = RagPipeline.generateDefenseDraft(
      'case_persist_test',
      {
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
      },
      'TEST-0001',
      'Test Vehicle',
      {
        name: 'Test User',
        cpf: '000.000.000-00',
        cnh: '00000000000',
        address: 'Rua Teste, 1',
        cityState: 'São Paulo/SP',
      },
      analysis.recommendedArguments,
      'recurso_jari'
    );

    const domain = makeCaseDomain(analysis);
    domain.defenseDraft = draft;
    const row = CanonicalMapper.domainToRow(domain);
    await caseRepository.set(row.id, row);
    const retrievedRow = caseRepository.get(row.id)!;
    const retrievedDomain = CanonicalMapper.rowToDomain(retrievedRow);

    // Empty authorization must remain empty after roundtrip — no leakage
    expect(retrievedDomain.defenseDraft?.selectedArgumentIds).toEqual([]);
  });
});
