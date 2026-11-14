// OTOMIX §5.2 · Mother §1 · GAP-007 · GAP-014 · GAP-017
// Cloud wrapper. Logs `ingest.tags_stripped` at warn when PII is present.
import { randomUUID } from 'node:crypto';
import { extractTags, createLogger } from '@otomix/core';
import type { DetectedFormat, TagsResult, Logger } from '@otomix/core';

export interface TagsDeps {
  logger?: Logger;
  trace_id?: string;
  span_id?: string;
}

export type { TagsResult } from '@otomix/core';

function buildDefaultLogger(): Logger {
  return createLogger({ service: 'gateway-ingest' });
}

export function extractTagsForGateway(
  bytes: Uint8Array,
  format: DetectedFormat,
  deps: TagsDeps = {},
): TagsResult {
  const result = extractTags(bytes, format);
  if (result.hasPii) {
    const logger = deps.logger ?? buildDefaultLogger();
    logger.log({
      level: 'warn',
      trace_id: deps.trace_id ?? randomUUID(),
      span_id: deps.span_id ?? randomUUID(),
      event: 'ingest.tags_stripped',
      outcome: 'partial',
      durationMs: 0,
      format,
      hasPii: true,
    });
  }
  return result;
}