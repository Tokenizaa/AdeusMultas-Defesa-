import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyEvolutionSignature } from './evolution-webhook-auth';

function sign(payload: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
}

describe('Evolution webhook HMAC', () => {
  it('validates correct HMAC signature', () => {
    const payload = JSON.stringify({ test: 'data' });
    const secret = 'test-secret';
    const signature = createHmac('sha256', secret).update(payload).digest('hex');
    expect(verifyEvolutionSignature(payload, `sha256=${signature}`, secret)).toBe(true);
  });

  it('rejects invalid signature', () => {
    expect(verifyEvolutionSignature('payload', 'sha256=wrong', 'secret')).toBe(false);
  });

  it('rejects missing signature', () => {
    expect(verifyEvolutionSignature('payload', undefined, 'secret')).toBe(false);
  });

  it('rejects non-sha256 header format', () => {
    expect(verifyEvolutionSignature('payload', signatureWithoutPrefix('payload', 'secret'), 'secret')).toBe(false);
  });

  it('rejects tampered payload', () => {
    const secret = 'test-secret';
    const good = sign(JSON.stringify({ a: 1 }), secret);
    expect(verifyEvolutionSignature(JSON.stringify({ a: 2 }), good, secret)).toBe(false);
  });

  it('accepts Buffer payload (raw body)', () => {
    const payload = JSON.stringify({ msg: 'hello' });
    const secret = 'test-secret';
    const signature = sign(payload, secret);
    expect(verifyEvolutionSignature(Buffer.from(payload, 'utf8'), signature, secret)).toBe(true);
  });

  it('rejects short signature without throwing (timingSafeEqual length guard)', () => {
    expect(() => verifyEvolutionSignature('payload', 'sha256=abc', 'secret')).not.toThrow();
    expect(verifyEvolutionSignature('payload', 'sha256=abc', 'secret')).toBe(false);
  });
});

function signatureWithoutPrefix(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}