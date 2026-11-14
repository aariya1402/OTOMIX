// OTOMIX §5.2 · Mother §1 · GAP-007 · GAP-014
// Local wrapper. Uses WarnSink instead of Logger.
import { extractTags } from '@otomix/core';
import type { DetectedFormat, TagsResult } from '@otomix/core';

export type TagsWarnSink = (record: {
  event: string;
  outcome: string;
  durationMs: number;
  format: string;
  hasPii: boolean;
}) => void;

export type { TagsResult } from '@otomix/core';

export function extractTagsForLocal(
  bytes: Uint8Array,
  format: DetectedFormat,
  warn?: TagsWarnSink,
): TagsResult {
  const result = extractTags(bytes, format);
  if (result.hasPii) {
    const rec = {
      event: 'ingest.tags_stripped',
      outcome: 'partial',
      durationMs: 0,
      format,
      hasPii: true,
    };
    if (warn) warn(rec);
    else if (typeof console !== 'undefined' && console.warn) console.warn(rec);
  }
  return result;
}