// OTOMIX §5.3 · Mother §1 · GAP-014 · GAP-017
// Cloud wrapper around @otomix/core classifyDecodeFailure. Logs
// `ingest.rejected` at warn. GAP-014: cloud-only; the local UI calls
// classifyDecodeFailure directly because it never enters the retry queue.
import { randomUUID } from 'node:crypto';
import { classifyDecodeFailure } from '@otomix/core';
import type { RejectFormat, RejectReason, RejectResult } from '@otomix/core';
import { createLogger } from '@otomix/core';
import type { Logger } from '@otomix/core';

export interface RejectDeps {
  logger?: Logger;
  trace_id?: string;
  span_id?: string;
}

export type { RejectFormat, RejectReason, RejectResult };

function buildDefaultLogger(): Logger {
  return createLogger({ service: 'gateway-ingest' });
}

export function rejectForGateway(
  format: RejectFormat,
  bytes: Uint8Array,
  errorMessage?: string,
  deps: RejectDeps = {},
): RejectResult {
  const result = classifyDecodeFailure(format, bytes, errorMessage);
  if (!result.ok) {
    const logger = deps.logger ?? buildDefaultLogger();
    logger.log({
      level: 'warn',
      trace_id: deps.trace_id ?? randomUUID(),
      span_id: deps.span_id ?? randomUUID(),
      event: 'ingest.rejected',
      outcome: 'failure',
      durationMs: 0,
      reason: result.reason,
      format,
      retryable: false,
    });
  }
  return result;
}