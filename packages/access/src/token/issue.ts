import { SignJWT } from 'jose';
import { randomUUID } from 'node:crypto';
import { ACCESS_TTL_MIN } from '../constants';
import {
  AccessTokenClaims,
  AccessTokenIssueInput,
  IssuedAccessToken,
  VaultClient,
  TokenIssuanceError,
} from './types';

const ALGORITHM = 'RS256';

export async function issueAccessToken(
  input: AccessTokenIssueInput,
  vaultClient: VaultClient,
): Promise<IssuedAccessToken> {
  if (!input.sub || input.sub.trim().length === 0) {
    throw new TokenIssuanceError('sub must be a non-empty string');
  }
  if (!input.tenantId || input.tenantId.trim().length === 0) {
    throw new TokenIssuanceError('tenantId must be a non-empty string');
  }

  const kid = await vaultClient.getCurrentKid();
  if (!kid) {
    throw new TokenIssuanceError('vault returned an empty kid');
  }
  const signingKey = await vaultClient.getSigningKey(kid);

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ACCESS_TTL_MIN * 60;
  const jti = randomUUID();

  const claims: AccessTokenClaims = {
    sub: input.sub,
    tenant_id: input.tenantId,
    jti,
    iat,
    exp,
  };

  const token = await new SignJWT({
    tenant_id: claims.tenant_id,
  })
    .setProtectedHeader({ alg: ALGORITHM, kid, typ: 'JWT' })
    .setSubject(claims.sub)
    .setJti(claims.jti)
    .setIssuedAt(claims.iat)
    .setExpirationTime(claims.exp)
    .sign(signingKey as Parameters<SignJWT['sign']>[0]);

  return { token, claims, kid };
}