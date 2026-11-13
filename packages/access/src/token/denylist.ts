import type Redis from 'ioredis';

const PREFIX = 'otomix:deny:';
const JTI_PREFIX = PREFIX + 'jti:';
const FAMILY_PREFIX = PREFIX + 'family:';

function ttlFor(exp: number): number {
  const remaining = Math.floor(exp - Date.now() / 1000);
  return remaining < 1 ? 1 : remaining;
}

export class TokenRevokedError extends Error {
  readonly code = 'UNAUTHENTICATED' as const;
  constructor(message: string) {
    super(message);
    this.name = 'TokenRevokedError';
  }
}

export async function denyJti(jti: string, exp: number, redis: Redis): Promise<void> {
  await redis.set(JTI_PREFIX + jti, '1', 'EX', ttlFor(exp));
}

export async function denyFamily(familyId: string, exp: number, redis: Redis): Promise<void> {
  await redis.set(FAMILY_PREFIX + familyId, '1', 'EX', ttlFor(exp));
}

export async function isDenied(jti: string, redis: Redis): Promise<boolean> {
  const n = await redis.exists(JTI_PREFIX + jti);
  return n === 1;
}

export async function isFamilyDenied(familyId: string, redis: Redis): Promise<boolean> {
  const n = await redis.exists(FAMILY_PREFIX + familyId);
  return n === 1;
}