import type Redis from 'ioredis';
import { denyFamily } from './denylist';
import { REFRESH_TTL_DAYS } from '../constants';
import { USER_FAMILIES_PREFIX } from './refresh';

export async function revokeUser(userId: string, redis: Redis): Promise<void> {
  const indexKey = USER_FAMILIES_PREFIX + userId;
  const familyIds = await redis.smembers(indexKey);
  const nowSec = Math.floor(Date.now() / 1000);
  const maxExp = nowSec + REFRESH_TTL_DAYS * 86400;
  for (const familyId of familyIds) {
    await denyFamily(familyId, maxExp, redis);
  }
  await redis.del(indexKey);
}