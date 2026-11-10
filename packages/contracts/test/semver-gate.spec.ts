// OTOMIX §4.1; §4.2 · Mother §3.1; §3.2
import { describe, it, expect } from 'vitest';
import { validateSchemaVersion } from '../src/semver-gate';

describe('SemVer Gate for schema_version', () => {
  // Task-specified inputs
  it('accepts 1.2.7 (patch within accepted 1.2.x)', () => {
    const result = validateSchemaVersion('1.2.7');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.action).toBe('ACCEPT');
  });

  it('rejects 1.3.0 (minor > 2)', () => {
    const result = validateSchemaVersion('1.3.0');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.action).toBe('REJECT');
      expect(result.reason).toBe('UNSUPPORTED_MINOR_3');
    }
  });

  it('flags 2.0.0 as PURGE_AND_REANALYZE (major bump)', () => {
    const result = validateSchemaVersion('2.0.0');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.action).toBe('PURGE_AND_REANALYZE');
      expect(result.reason).toBe('MAJOR_VERSION_BUMP_2');
    }
  });

  // Edge cases per Q4
  it('rejects malformed "1.2" (missing patch)', () => {
    const result = validateSchemaVersion('1.2');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.action).toBe('REJECT');
  });

  it('rejects malformed "abc" (non-numeric)', () => {
    const result = validateSchemaVersion('abc');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.action).toBe('REJECT');
  });

  it('rejects malformed "1.2.0-alpha" (pre-release suffix)', () => {
    const result = validateSchemaVersion('1.2.0-alpha');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.action).toBe('REJECT');
  });

  it('rejects malformed "01.2.0" (leading zero)', () => {
    const result = validateSchemaVersion('01.2.0');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.action).toBe('REJECT');
  });

  // Additional boundary cases
  it('rejects 1.1.0 (minor < 2)', () => {
    const result = validateSchemaVersion('1.1.0');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.action).toBe('REJECT');
      expect(result.reason).toBe('UNSUPPORTED_MINOR_1');
    }
  });

  it('rejects 0.2.0 (major < 1)', () => {
    const result = validateSchemaVersion('0.2.0');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.action).toBe('REJECT');
      expect(result.reason).toBe('UNSUPPORTED_MAJOR_0');
    }
  });

  it('accepts 1.2.0 (minimum accepted patch)', () => {
    const result = validateSchemaVersion('1.2.0');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.action).toBe('ACCEPT');
  });

  it('accepts 1.2.999 (high patch)', () => {
    const result = validateSchemaVersion('1.2.999');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.action).toBe('ACCEPT');
  });
});
