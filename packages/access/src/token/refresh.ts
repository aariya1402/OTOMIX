import { randomBytes, randomUUID } from 'node:crypto';
import type Redis from 'ioredis';
import { REFRESH_TTL_DAYS } from '../constants';
import {
  IssuedRefreshToken,
  RefreshTokenClaims,
  RefreshTokenIssueInput,
  RefreshTokenNotFoundError,
  RefreshTokenReuseError,
  RefreshTokenRevokedError,
} from './types';

const KEY_PREFIX = 'otomix:refresh:';
const JTI_PREFIX = KEY_PREFIX + 'jti:';
const REVOKED_PREFIX = KEY_PREFIX + 'revoked:';
const TTL_SECONDS = REFRESH_TTL_DAYS * 86400;

export async function issueRefreshToken(
  input: RefreshTokenIssueInput,
  redis: Redis,
): Promise<IssuedRefreshToken> {
  const familyId = randomUUID();
  const jti = randomBytes(32).toString('hex');
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + TTL_SECONDS;

  const claims: RefreshTokenClaims = {
    sub: input.sub,
    tenant_id: input.tenantId,
    tier: input.tier,
    familyId,
    jti,
    iat,
    exp,
    status: 'active',
  };

  await redis.set(JTI_PREFIX + jti, JSON.stringify(claims), 'EX', TTL_SECONDS);

  return { token: jti, claims };
}

const ROTATE_SCRIPT = `
local old = redis.call('GET', KEYS[1])
if not old then
  return {err='NOT_FOUND'}
end
local oldData = cjson.decode(old)
local revokedKey = ARGV[5] .. oldData.familyId
if redis.call('EXISTS', revokedKey) == 1 then
  return {err='REVOKED'}
end
if oldData.status == 'consumed' then
  redis.call('SET', revokedKey, '1', 'EX', ARGV[4])
  return {err='REUSE'}
end
local newData = {
  sub = oldData.sub,
  tenant_id = oldData.tenant_id,
  tier = oldData.tier,
  familyId = oldData.familyId,
  jti = ARGV[1],
  iat = tonumber(ARGV[2]),
  exp = tonumber(ARGV[3]),
  status = 'active'
}
oldData.status = 'consumed'
redis.call('SET', KEYS[1], cjson.encode(oldData), 'KEEPTTL')
redis.call('SET', KEYS[2], cjson.encode(newData), 'EX', ARGV[4])
return cjson.encode(newData)
`;

export async function rotateRefreshToken(
  token: string,
  redis: Redis,
): Promise<IssuedRefreshToken> {
  const newJti = randomBytes(32).toString('hex');
  const newIat = Math.floor(Date.now() / 1000);
  const newExp = newIat + TTL_SECONDS;

  const oldKey = JTI_PREFIX + token;
  const newKey = JTI_PREFIX + newJti;

  let resultRaw: unknown;
  try {
    resultRaw = await redis.eval(
      ROTATE_SCRIPT,
      2,
      oldKey,
      newKey,
      newJti,
      String(newIat),
      String(newExp),
      String(TTL_SECONDS),
      REVOKED_PREFIX,
    );
  } catch (err: unknown) {
    const msg = String((err as Error)?.message ?? err);
    if (msg.includes('REVOKED')) {
      throw new RefreshTokenRevokedError('refresh token revoked: family is blocked');
    }
    if (msg.includes('NOT_FOUND')) {
      throw new RefreshTokenNotFoundError('refresh token not found: ' + token);
    }
    if (msg.includes('REUSE')) {
      throw new RefreshTokenReuseError('refresh token reuse detected: ' + token);
    }
    throw err;
  }

  const newClaims: RefreshTokenClaims = JSON.parse(String(resultRaw));
  return { token: newJti, claims: newClaims };
}