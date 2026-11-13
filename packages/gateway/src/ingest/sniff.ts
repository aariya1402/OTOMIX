// OTOMIX §5.2 · Mother §1 · GAP-014
// Cloud wrapper around @otomix/core sniffContainer. Adds extension-mismatch
// logging. GAP-014: cloud implementation lives here; the local implementation
// lives in packages/adapter/src/ingest/sniff.ts.

import { randomUUID } from 'node:crypto';
import { sniffContainer } from '@otomix/core';
import type { DetectedFormat } from '@otomix/core';
import { createLogger } from '@otomix/core';
import type { Logger } from '@otomix/core';

export interface SniffResult {
  format: DetectedFormat;
  mismatch: boolean;
  expectedExt: string | null;
}

export interface SniffDeps {
  logger?: Logger;
  trace_id?: string;
  span_id?: string;
}

const KNOWN_EXTS: readonly string[] = ['mp3', 'wav', 'flac'];

function extractExtension(filename: string): string | null {
  if (!filename) return null;
  const dot = filename.lastIndexOf('.');
  if (dot < 0 || dot === filename.length - 1) return null;
  return filename.slice(dot + 1).toLowerCase();
}

function buildDefaultLogger(): Logger {
  return createLogger({ service: 'gateway-ingest' });
}

export function sniffForGateway(
  bytes: Uint8Array,
  filename: string,
  deps: SniffDeps = {},
): SniffResult {
  const format = sniffContainer(bytes);
  const expectedExt = extractExtension(filename);
  const hasKnownExt = expectedExt !== null && KNOWN_EXTS.includes(expectedExt);
  const mismatch = hasKnownExt && format !== 'unknown' && expectedExt !== format;

  if (mismatch) {
    const logger = deps.logger ?? buildDefaultLogger();
    logger.log({
      level: 'warn',
      trace_id: deps.trace_id ?? randomUUID(),
      span_id: deps.span_id ?? randomUUID(),
      event: 'ingest.ext_mismatch',
      outcome: 'partial',
      durationMs: 0,
      expectedExt,
      detectedFormat: format,
      filename,
    });
  }

  return { format, mismatch, expectedExt };
}