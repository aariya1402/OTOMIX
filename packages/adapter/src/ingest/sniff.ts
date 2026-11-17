// OTOMIX §5.2 · Mother §1 · GAP-014
// Local (on-device) wrapper around @otomix/core sniffContainer. Adds
// extension-mismatch logging via an injected warn sink (or console.warn).
// GAP-014: the local implementation is independent of the cloud wrapper.

import { sniffContainer } from '@otomix/core';
import type { DetectedFormat } from '@otomix/core';

export interface SniffResult {
  format: DetectedFormat;
  mismatch: boolean;
  expectedExt: string | null;
}

export type WarnSink = (record: {
  event: string;
  outcome: string;
  durationMs: number;
  expectedExt: string | null;
  detectedFormat: DetectedFormat;
  filename: string;
}) => void;

const KNOWN_EXTS: readonly string[] = ['mp3', 'wav', 'flac'];

function extractExtension(filename: string): string | null {
  if (!filename) return null;
  const dot = filename.lastIndexOf('.');
  if (dot < 0 || dot === filename.length - 1) return null;
  return filename.slice(dot + 1).toLowerCase();
}

export function sniffForLocal(
  bytes: Uint8Array,
  filename: string,
  warn?: WarnSink,
): SniffResult {
  const format = sniffContainer(bytes);
  const expectedExt = extractExtension(filename);
  const hasKnownExt = expectedExt !== null && KNOWN_EXTS.includes(expectedExt);
  const mismatch = hasKnownExt && format !== 'unknown' && expectedExt !== format;

  if (mismatch) {
    const record = {
      event: 'ingest.ext_mismatch',
      outcome: 'partial',
      durationMs: 0,
      expectedExt,
      detectedFormat: format,
      filename,
    };
    if (warn) { warn(record); }
    else if (typeof console !== 'undefined' && console.warn) { console.warn(record); }
  }

  return { format, mismatch, expectedExt };
}