import { describe, expect, it } from 'vitest';
import { generateKeyPair, decodeProtectedHeader } from 'jose';
import { issueAccessToken } from '../src/token/issue';
import { TokenIssuanceError, VaultClient } from '../src/token/types';
import { ACCESS_TTL_MIN } from '../src/constants';

const FIXED_KID = 'test-kid-001';
const VALID_SUB = '11111111-1111-4111-8111-111111111111';

async function makeVault(overrides?: { kid?: string }): Promise<VaultClient> {
  const { privateKey } = await generateKeyPair('RS256');
  const kid = overrides?.kid ?? FIXED_KID;
  return {
    getCurrentKid: async () => kid,
    getSigningKey: async (_k: string) => privateKey,
  };
}

describe('issueAccessToken', () => {
  it('rejects empty sub', async () => {
    const vault = await makeVault();
    await expect(
      issueAccessToken({ sub: '', tenantId: 'otomix', scopes: ['user:read'], tier: 1 }, vault),
    ).rejects.toBeInstanceOf(TokenIssuanceError);
  });

  it('rejects empty tenantId', async () => {
    const vault = await makeVault();
    await expect(
      issueAccessToken({ sub: VALID_SUB, tenantId: '', scopes: ['user:read'], tier: 1 }, vault),
    ).rejects.toBeInstanceOf(TokenIssuanceError);
  });

  it('rejects empty scopes', async () => {
    const vault = await makeVault();
    await expect(
      issueAccessToken({ sub: VALID_SUB, tenantId: 'otomix', scopes: [], tier: 1 }, vault),
    ).rejects.toBeInstanceOf(TokenIssuanceError);
  });

  it('rejects when vault returns empty kid', async () => {
    const vault = await makeVault({ kid: '' });
    await expect(
      issueAccessToken({ sub: VALID_SUB, tenantId: 'otomix', scopes: ['user:read'], tier: 1 }, vault),
    ).rejects.toBeInstanceOf(TokenIssuanceError);
  });

  it('sets exp - iat = ACCESS_TTL_MIN * 60, tenant_id = otomix, all claims correctly typed', async () => {
    const vault = await makeVault();
    const result = await issueAccessToken(
      { sub: VALID_SUB, tenantId: 'otomix', scopes: ['user:read', 'local:process'], tier: 2 },
      vault,
    );
    const c = result.claims;
    expect(c.exp - c.iat).toBe(ACCESS_TTL_MIN * 60);
    expect(c.tenant_id).toBe('otomix');
    expect(c.sub).toBe(VALID_SUB);
    expect(Array.isArray(c.scopes)).toBe(true);
    expect(c.scopes).toEqual(['user:read', 'local:process']);
    expect(c.tier).toBe(2);
    expect(typeof c.jti).toBe('string');
    expect(c.jti).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(typeof c.iat).toBe('number');
    expect(typeof c.exp).toBe('number');
    expect(c.exp).toBeGreaterThan(c.iat);
  });

  it('returns kid matching the JWT header and signs with RS256', async () => {
    const vault = await makeVault();
    const result = await issueAccessToken(
      { sub: VALID_SUB, tenantId: 'otomix', scopes: ['user:read'], tier: 1 },
      vault,
    );
    expect(result.kid).toBe(FIXED_KID);
    const header = decodeProtectedHeader(result.token);
    expect(header.kid).toBe(FIXED_KID);
    expect(header.alg).toBe('RS256');
  });

  it('returns a compact JWT and sets iat close to now', async () => {
    const vault = await makeVault();
    const before = Math.floor(Date.now() / 1000);
    const result = await issueAccessToken(
      { sub: VALID_SUB, tenantId: 'otomix', scopes: ['user:read'], tier: 1 },
      vault,
    );
    const after = Math.floor(Date.now() / 1000);
    expect(result.token.split('.').length).toBe(3);
    expect(result.claims.iat).toBeGreaterThanOrEqual(before);
    expect(result.claims.iat).toBeLessThanOrEqual(after + 1);
  });
});