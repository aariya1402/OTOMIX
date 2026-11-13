// OTOMIX §7.11; §7.1
import { describe, it, expect } from 'vitest';
import {
  OTOMIX_ISSUABLE_SCOPES,
  isIssuable,
  assertIssuable,
  ScopeNotIssuableError,
} from '../src/scope-allowlist';
import { issueAccessToken } from '../src/token/issue';
import type { VaultClient } from '../src/token/types';
import { generateKeyPair } from 'jose';

const VALID_SUB = '11111111-1111-4111-8111-111111111111';

async function makeVault(): Promise<VaultClient> {
  const { privateKey } = await generateKeyPair('RS256');
  return {
    getCurrentKid: async () => 'kid-test',
    getSigningKey: async () => privateKey,
  };
}

describe('OTOMIX scope allow-list (P06-T02-S01-M02)', () => {
  it('rejects non-issuable scopes for otomix (ddex:*, rights:*, stream:consume)', () => {
    const rejected = ['ddex:*', 'rights:*', 'stream:consume'];
    for (const scope of rejected) {
      expect(isIssuable(scope, 'otomix')).toBe(false);
    }
  });

  it('accepts issuable scopes for otomix (dsp:*, local:process)', () => {
    const accepted = ['dsp:*', 'local:process'];
    for (const scope of accepted) {
      expect(isIssuable(scope, 'otomix')).toBe(true);
    }
  });

  it('isIssuable returns false for non-otomix tenant; assertIssuable no-ops for non-otomix tenant', () => {
    expect(isIssuable('dsp:*', 'otodj')).toBe(false);
    expect(() => assertIssuable(['dsp:*', 'ddex:*'], 'otodj')).not.toThrow();
  });

  it('assertIssuable throws ScopeNotIssuableError for non-issuable scope on otomix', () => {
    try {
      assertIssuable(['ddex:*'], 'otomix');
      throw new Error('expected assertIssuable to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ScopeNotIssuableError);
      expect((err as ScopeNotIssuableError).code).toBe('INVALID_ARGUMENT');
    }
  });

  it('issueAccessToken rejects non-issuable scope for otomix', async () => {
    const vault = await makeVault();
    await expect(
      issueAccessToken(
        { sub: VALID_SUB, tenantId: 'otomix', scopes: ['ddex:*'], tier: 1 },
        vault,
      ),
    ).rejects.toBeInstanceOf(ScopeNotIssuableError);
  });

  it('OTOMIX_ISSUABLE_SCOPES is frozen', () => {
    expect(Object.isFrozen(OTOMIX_ISSUABLE_SCOPES)).toBe(true);
  });
});