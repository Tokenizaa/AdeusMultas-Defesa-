/**
 * FASE 3.6 — Defense generation must not re-authorize via selectedArguments.
 *
 * Regression contract:
 *   Infraction -> analyzeInfraction() -> recommendedArguments
 *                         -> DocumentAssembly
 *
 * `selectedArguments` is legacy API input only and must never become an
 * authorization source for legal content.
 */
import { describe, expect, it } from 'vitest';
import { RagPipeline } from '../../src/core/rag/rag-pipeline';
import type { InfractionData } from '../../src/types';

const INFRACTION: InfractionData = {
  aitNumber: 'AIT-36-001',
  autuadorBody: 'DETRAN-SP',
  ctbArticle: '218',
  description: 'Excesso de velocidade',
  location: 'Av. Paulista, 1000',
  dateTime: '2024-01-15T10:30:00Z',
  severity: 'grave',
  speedMeasured: 80,
  speedLimit: 60,
  speedConsidered: 73,
  code: '745-50',
  notificationExpeditionDate: '2024-01-20T00:00:00Z',
};

const APPLICANT = {
  name: 'João da Silva',
  cpf: '123.456.789-00',
  cnh: '98765432100',
  address: 'Rua das Flores, 123',
  cityState: 'São Paulo/SP',
};

describe('FASE 3.6 — RagPipeline defense-generation authorization', () => {
  it('does not allow selectedArguments to inject a valid but unauthorized catalog argument', () => {
    const analysis = RagPipeline.analyzeInfraction('case_fase_36', INFRACTION);
    const authorizedIds = analysis.recommendedArguments.map((argument) => argument.id);

    // ARG-025 is a valid catalog argument but is intentionally not part of the
    // canonical authorization for this infraction.
    expect(authorizedIds).not.toContain('ARG-025');

    const draft = RagPipeline.generateDefenseDraft(
      'case_fase_36',
      INFRACTION,
      'ABC-1D23',
      'Honda Civic',
      APPLICANT,
      [{ id: 'ARG-025' } as any],
      'recurso_jari'
    );

    expect(draft.selectedArgumentIds).not.toContain('ARG-025');
    expect(draft.selectedArgumentIds).toEqual(authorizedIds);
  });

  // ── Adversarial: argument content must not reach fullDraftText ─────────────────

  it('adversarial: selectedArgumentIds ARG-025 content is absent from fullDraftText', () => {
    // ARG-025 (Lei Seca / Recusa ao Etilômetro) is NOT a valid argument for
    // a radar speed infraction (745-50). Its distinctive heading must not appear
    // in the assembled document even if injected via selectedArguments.
    const ARG_025_HEADING = 'Da Obrigatoriedade Formal do Termo de Constatação de Sinais';
    const ARG_025_TITLE = 'INEXISTÊNCIA DE TERMO DE CONSTATÇÃO DE SINAIS PSICOMOTORES';

    const analysis = RagPipeline.analyzeInfraction('case_fase_36_text', INFRACTION);
    const authorizedIds = analysis.recommendedArguments.map((a) => a.id);
    expect(authorizedIds).not.toContain('ARG-025'); // pre-condition: not authorized

    const draft = RagPipeline.generateDefenseDraft(
      'case_fase_36_text',
      INFRACTION,
      'ABC-1D23',
      'Honda Civic',
      APPLICANT,
      [{ id: 'ARG-025' } as any], // adversarial injection
      'recurso_jari'
    );

    // P1: selectedArgumentIds must not contain ARG-025
    expect(draft.selectedArgumentIds).not.toContain('ARG-025');
    expect(draft.selectedArgumentIds).toEqual(authorizedIds);

    // P2: fullDraftText must not contain ARG-025 content (adversarial artifact test)
    // Uses distinctive heading from formattedParagraphs[0].heading
    expect(draft.fullDraftText).not.toContain(ARG_025_HEADING);
    expect(draft.fullDraftText).not.toContain(ARG_025_TITLE);
  });

  // ── Tampering: valid catalog ID not in recommendedArguments cannot self-authorize ─

  it('adversarial: valid catalog ID not in recommendedArguments is blocked at assembly', () => {
    // Use ARG-003 (Radar Estudo Técnico Ausente) — valid catalog ID but not
    // in recommendedArguments for this radar-speed-only analysis.
    // A tampered caller trying to use ARG-003 as self-authorization must be blocked.
    const analysis = RagPipeline.analyzeInfraction('case_fase_36_tamper', INFRACTION);
    const authorizedIds = analysis.recommendedArguments.map((a) => a.id);
    expect(authorizedIds).not.toContain('ARG-003'); // pre-condition: not authorized

    const draft = RagPipeline.generateDefenseDraft(
      'case_fase_36_tamper',
      INFRACTION,
      'ABC-1D23',
      'Honda Civic',
      APPLICANT,
      [{ id: 'ARG-003' } as any], // valid catalog ID but not authorized
      'recurso_jari'
    );

    // ARG-003 is valid in the catalog but was NOT in recommendedArguments
    expect(draft.selectedArgumentIds).not.toContain('ARG-003');
    // The draft must reflect only what the canonical analysis authorized
    expect(draft.selectedArgumentIds).toEqual(authorizedIds);
  });

  it('uses the same canonical authorization when selectedArguments is empty', () => {
    const analysis = RagPipeline.analyzeInfraction('case_fase_36_empty', INFRACTION);
    const draft = RagPipeline.generateDefenseDraft(
      'case_fase_36_empty',
      INFRACTION,
      'ABC-1D23',
      'Honda Civic',
      APPLICANT,
      [],
      'recurso_jari'
    );

    expect(draft.selectedArgumentIds).toEqual(
      analysis.recommendedArguments.map((argument) => argument.id)
    );
  });
});
