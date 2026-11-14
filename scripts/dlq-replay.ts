// OTOMIX 8.8 - runbook CLI for DLQ replay.
// Usage: npx tsx scripts/dlq-replay.ts --job-id <id> [--redis-url redis://...]
// Exit codes: 0 success, 1 not_found, 2 conflict/error.

import Redis from 'ioredis';
import { createLogger } from '@otomix/core';
import { createIdempotencyStore } from '../packages/gateway/src/idempotency/store.js';
import { replayDlq } from '../packages/gateway/src/dlq/replay.js';

interface Args {
  jobId: string;
  redisUrl: string;
}

function parseArgs(argv: string[]): Args {
  let jobId = '';
  let redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--job-id' && argv[i + 1]) {
      jobId = argv[++i]!;
    } else if (a === '--redis-url' && argv[i + 1]) {
      redisUrl = argv[++i]!;
    }
  }
  if (!jobId) {
    throw new Error('--job-id is required');
  }
  return { jobId, redisUrl };
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  const logger = createLogger({ service: 'dlq-replay-cli' });
  const redis = new Redis(args.redisUrl);
  const idem = createIdempotencyStore(redis);
  try {
    const result = await replayDlq(
      redis,
      args.jobId,
      async () => {
        // Production handler registry is GAP-026; this CLI only proves the path.
      },
      { logger, idempotencyStore: idem },
    );
    if (result.status === 'fresh' || result.status === 'replay') return 0;
    if (result.status === 'not_found') return 1;
    return 2;
  } catch (err) {
    logger.log({
      level: 'error',
      trace_id: 'dlq-replay',
      span_id: 'cli',
      event: 'dlq.replay_cli_failed',
      outcome: 'failure',
      durationMs: 0,
      error: (err as Error).message,
    });
    return 2;
  } finally {
    await redis.quit();
  }
}

if (require.main === module) {
  main()
    .then((code) => process.exit(code))
    .catch(() => process.exit(2));
}