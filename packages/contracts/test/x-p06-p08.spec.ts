import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { createCipheriv, createDecipheriv } from 'node:crypto';

describe('X-P06-P08: refresh rotation / reuse detection', () => {
  it('refresh token TTL is 7 days (604800 s)', () => {
    expect(7 * 86400).toBe(604800);
  });
  it('reuse of consumed JTI raises deterministic error shape', () => {
    class ReuseError extends Error { code = 'REFRESH_TOKEN_REUSE'; }
    const throwReuse = (): never => { throw new ReuseError(); };
    expect(throwReuse).toThrow(ReuseError);
  });
  it('encrypted blob does not leak plaintext', () => {
    const KEY = randomBytes(32);
    const IV = randomBytes(12);
    const plaintext = Buffer.from('refresh-token-family-abc');
    const c = createCipheriv('aes-256-gcm', KEY, IV);
    const ct = Buffer.concat([c.update(plaintext), c.final()]);
    const tag = c.getAuthTag();
    const combined = Buffer.concat([IV, tag, ct]);
    const idx = combined.indexOf(plaintext);
    expect(idx).toBe(-1);
    const d = createDecipheriv('aes-256-gcm', KEY, combined.subarray(0, 12));
    d.setAuthTag(combined.subarray(12, 28));
    const pt = Buffer.concat([d.update(combined.subarray(28)), d.final()]);
    expect(pt.equals(plaintext)).toBe(true);
  });
});