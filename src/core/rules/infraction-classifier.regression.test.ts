import { describe, expect, it } from 'vitest';
import { classifyInfraction } from './infraction-classifier';

describe('infraction classifier — regression for historical 5xx/FARI report', () => {
  it.each(['502', '502-00', '516-91', '516-92'])(
    'classifies code %s and returns catalog-backed arguments',
    (infractionCode) => {
      const result = classifyInfraction({ infractionCode });

      expect(result.family).toBe('alcoolemia');
      expect(result.eligibleArgumentIds.length).toBeGreaterThan(0);
      expect(result.eligibleArgumentIds).toContain('ARG-025');
      expect(result.basis).not.toBe('UNKNOWN');
    },
  );
});
