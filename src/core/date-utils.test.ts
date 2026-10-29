import { describe, expect, it } from 'vitest';
import { normalizeDateInputValue } from '../lib/date-utils';

describe('normalizeDateInputValue', () => {
  it('converts Brazilian two-digit dates to ISO for native date inputs', () => {
    expect(normalizeDateInputValue('14/10/26')).toBe('2026-10-14');
  });

  it('accepts Brazilian four-digit years', () => {
    expect(normalizeDateInputValue('14/10/2026')).toBe('2026-10-14');
  });

  it('preserves valid ISO dates and ISO timestamps', () => {
    expect(normalizeDateInputValue('2026-10-14')).toBe('2026-10-14');
    expect(normalizeDateInputValue('2026-10-14T12:30:00.000Z')).toBe('2026-10-14');
  });

  it('returns an empty string for invalid or unsupported values', () => {
    expect(normalizeDateInputValue('31/02/26')).toBe('');
    expect(normalizeDateInputValue('not-a-date')).toBe('');
    expect(normalizeDateInputValue('')).toBe('');
    expect(normalizeDateInputValue(undefined)).toBe('');
  });
});
