import { describe, expect, it } from 'vitest';
import { normalizeManualIntake, validateManualIntake, type ManualIntakeInput } from './manual-intake-validation';

const validInput: ManualIntakeInput = {
  aitNumber: ' A123456 ',
  infractionCode: '745-5',
  autuadorBody: 'DETRAN-RS',
  dateTime: '2026-10-10T14:30',
  location: 'Av. Brasil, Porto Alegre',
  plate: 'abc 1d23',
  brandModel: 'Fiat Argo',
  serviceType: 'defesa_previa',
};

describe('manual intake validation', () => {
  it('normalizes whitespace and plate casing without inventing values', () => {
    const normalized = normalizeManualIntake(validInput);
    expect(normalized.aitNumber).toBe('A123456');
    expect(normalized.plate).toBe('ABC1D23');
    expect(normalized.location).toBe('Av. Brasil, Porto Alegre');
  });

  it('accepts valid manually entered data', () => {
    expect(validateManualIntake(validInput)).toEqual({});
  });

  it('requires the fields needed by anonymous case creation', () => {
    expect(validateManualIntake({ ...validInput, aitNumber: '', infractionCode: '', location: '', plate: '' })).toMatchObject({
      aitNumber: expect.any(String),
      infractionCode: expect.any(String),
      location: expect.any(String),
      plate: expect.any(String),
    });
  });

  it('rejects fields exceeding the backend contract limits', () => {
    expect(validateManualIntake({ ...validInput, aitNumber: 'x'.repeat(81), infractionCode: 'x'.repeat(21) })).toMatchObject({
      aitNumber: expect.any(String),
      infractionCode: expect.any(String),
    });
  });
});
