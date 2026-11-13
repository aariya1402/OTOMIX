import { describe, it, expect } from 'vitest';
import { generateKeyPair, decodeProtectedHeader } from 'jose';
import { issueAccessToken } from '../src/token/issue';
import { TokenIssuanceError, VaultClient } from '../src/token/types';
import { ACCESS_TTL_MIN } from '../src/constants';

const FIXED_KID = 'test-kid-001';
const VALID_SUB = '11111111-1111-4111-8111-111111111111';

async function makeVault(overrides?: { kid?: string }): Promise<VaultClient> {
  const { privateKey } = await generateKeyPair('RS256');
  const kid = overrides?.kid ?? FIXED_KID;
  return { getCurrentKid: async () => kid, getSigningKey: async (_k: string) => privateKey };
}

describe('issueAccessToken', () => {
  it('rejects empty sub', async () => {
    const vault = await makeVault();
    await expect(issueAccessToken({ sub: '', tenantId: 'otomix' }, vault)).rejects.toBeInstanceOf(TokenIssuanceError);
  });
  it('rejects empty tenantId', async () => {
    const vault = await makeVault();
    await expect(issueAccessToken({ sub: VALID_SUB, tenantId: '' }, vault)).rejects.toBeInstanceOf(TokenIssuanceError);
  });
  it('rejects when vault returns empty kid', async () => {
    const vault = await makeVault({ kid: '' });
    await expect(issueAccessToken({ sub: VALID_SUB, tenantId: 'otomix' }, vault)).rejects.toBeInstanceOf(TokenIssuanceError);
  });
  it('exp - iat = ACCESS_TTL_MIN * 60, tenant_id=otomix, identity-only claims', async () => {
    const vault = await makeVault();
    const result = await issueAccessToken({ sub: VALID_SUB, tenantId: 'otomix' }, vault);
    const c = result.claims;
    expect(c.exp - c.iat).toBe(ACCESS_TTL_MIN * 60);
    expect(c.tenant_id).toBe('otomix');
    expect(c.sub).toBe(VALID_SUB);
    expect(typeof c.jti).toBe('string');
    expect(c.jti).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect((c as any).scopes).toBeUndefined();
    expect((c as any).tier).toBeUndefined();
  });
  it('returns kid matching the JWT header and signs with RS256', async () => {
    const vault = await makeVault();
    const result = await issueAccessToken({ sub: VALID_SUB, tenantId: 'otomix' }, vault);
    expect(result.kid).toBe(FIXED_KID);
    const header = decodeProtectedHeader(result.token);
    expect(header.kid).toBe(FIXED_KID);
    expect(header.alg).toBe('RS256');
  });
  it('returns a compact JWT and sets iat close to now', async () => {
    const vault = await makeVault();
    const before = Math.floor(Date.now() / 1000);
    const result = await issueAccessToken({ sub: VALID_SUB, tenantId: 'otomix' }, vault);
    const after = Math.floor(Date.now() / 1000);
    expect(result.token.split('.').length).toBe(3);
    expect(result.claims.iat).toBeGreaterThanOrEqual(before);
    expect(result.claims.iat).toBeLessThanOrEqual(after + 1);
  });
});