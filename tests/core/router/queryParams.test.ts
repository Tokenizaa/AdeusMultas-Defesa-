import { describe, expect, it } from 'vitest';
import { parseQueryParams } from '../../../src/core/router/queryParams';

describe('parseQueryParams', () => {
  it('parses encoded keys and values', () => {
    expect(parseQueryParams('?redirect=%2Fadmin%2Fcases%3Fid%3D123&name=Jo%C3%A3o')).toEqual({
      redirect: '/admin/cases?id=123',
      name: 'João',
    });
  });

  it('preserves values containing equals signs', () => {
    expect(parseQueryParams('?token=a=b=c&redirect=/cases/123')).toEqual({
      token: 'a=b=c',
      redirect: '/cases/123',
    });
  });

  it('handles malformed percent encoding without throwing', () => {
    expect(() => parseQueryParams('?redirect=%E0%A4%A&safe=value')).not.toThrow();
    expect(parseQueryParams('?redirect=%E0%A4%A&safe=value').safe).toBe('value');
  });

  it('supports plus signs and repeated keys consistently', () => {
    expect(parseQueryParams('?q=defesa+de+multa&role=user&role=admin')).toEqual({
      q: 'defesa de multa',
      role: 'admin',
    });
  });

  it('returns an empty object for an empty search string', () => {
    expect(parseQueryParams('')).toEqual({});
    expect(parseQueryParams('?')).toEqual({});
  });
});
