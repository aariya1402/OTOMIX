// OTOMIX §5.2 · Mother §1 · GAP-014 · GAP-017
// Cloud path confinement. Resolves symlinks with fs.realpathSync, then
// uses the pure isWithinRoot from @otomix/core. Rejects with
// INVALID_ARGUMENT. GAP-014: cloud implementation lives here; the local
// implementation lives in packages/adapter/src/ingest/confine.ts.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { isWithinRoot, createLogger } from '@otomix/core';
import type { Logger } from '@otomix/core';

export type ConfineReason = 'TRAVERSAL' | 'SYMLINK_ESCAPE' | 'NOT_FOUND';

export type ConfineResult =
  | { ok: true; realPath: string }
  | { ok: false; error: 'INVALID_ARGUMENT'; message: string; reason: ConfineReason };

export interface ConfineDeps {
  logger?: Logger;
  grantedRoot?: string;
  trace_id?: string;
  span_id?: string;
}

function buildDefaultLogger(): Logger {
  return createLogger({ service: 'gateway-ingest' });
}

function logReject(
  deps: ConfineDeps,
  reason: ConfineReason,
  attemptedPath: string,
  grantedRoot: string,
  extra: Record<string, unknown> = {},
): void {
  const logger = deps.logger ?? buildDefaultLogger();
  logger.log({
    level: 'warn',
    trace_id: deps.trace_id ?? randomUUID(),
    span_id: deps.span_id ?? randomUUID(),
    event: 'ingest.confine_rejected',
    outcome: 'failure',
    durationMs: 0,
    reason,
    attemptedPath,
    grantedRoot,
    ...extra,
  });
}

export function confineForGateway(userPath: string, deps: ConfineDeps = {}): ConfineResult {
  const grantedRoot = deps.grantedRoot ?? process.env.INGEST_ROOT;
  if (!grantedRoot) {
    return { ok: false, error: 'INVALID_ARGUMENT', message: 'INGEST_ROOT not configured', reason: 'NOT_FOUND' };
  }

  let realRoot: string;
  try {
    realRoot = fs.realpathSync(grantedRoot);
  } catch {
    return { ok: false, error: 'INVALID_ARGUMENT', message: 'granted root does not exist', reason: 'NOT_FOUND' };
  }

  const resolved = path.resolve(realRoot, userPath);
  const resolvedInsideRoot = isWithinRoot(resolved, realRoot);

  let realCandidate: string;
  try {
    realCandidate = fs.realpathSync(resolved);
  } catch {
    logReject(deps, 'NOT_FOUND', userPath, realRoot, { resolvedAttempt: resolved });
    return { ok: false, error: 'INVALID_ARGUMENT', message: `Path does not exist or is not accessible: ${userPath}`, reason: 'NOT_FOUND' };
  }

  if (!isWithinRoot(realCandidate, realRoot)) {
    const reason: ConfineReason = resolvedInsideRoot ? 'SYMLINK_ESCAPE' : 'TRAVERSAL';
    logReject(deps, reason, userPath, realRoot, { resolvedAttempt: resolved, realCandidate });
    return { ok: false, error: 'INVALID_ARGUMENT', message: `Path escapes granted root: ${userPath}`, reason };
  }

  return { ok: true, realPath: realCandidate };
}