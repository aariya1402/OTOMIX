// OTOMIX 5.2 - Mother 1 - GAP-007 - GAP-014
// Pure metadata enrichment under a consent gate.
// Core is pure: no I/O, no logging, no Node.js builtins (GAP-014).

import type { DisplayMetadata } from './tags.js';

/**
 * Metadata fetched from an external source (official API or library).
 * Provenance fields are optional and non-PII; they are pass-through only
 * and are never used in beat/quanta arithmetic.
 */
export interface ExternalMetadata {
  title?: string;
  bpm?: number;
  key?: string;
  artist?: string;
  album?: string;
  comment?: string;
  source?: string;
  confidence?: number;
  /** epoch milliseconds; BOUNDARY_IO only - never used in timing math */
  fetchedAt?: number;
}

/**
 * Input for enrichMetadata.
 *
 * - rawTags: metadata extracted from embedded file tags (see tags.ts).
 *   Ignored when consent === false.
 * - consent: user consent to read embedded tags.
 * - external: metadata already fetched by the caller (gateway/adapter).
 */
export interface MetadataEnrichmentInput {
  rawTags: DisplayMetadata | null;
  consent: boolean;
  external: ExternalMetadata | null;
}

function isPiiField(key: string): boolean {
  return key === 'artist' || key === 'album' || key === 'comment';
}

/**
 * Enrich track metadata from two sources under a consent gate.
 *
 * Rules (from GAP-007 resolution, 2026-11-18):
 *   1. consent === false: embedded tags are never used; result contains
 *      no PII fields (artist/album/comment) even from `external`.
 *   2. consent === true and rawTags present: rawTags is the baseline;
 *      external fills only missing keys (embedded wins on conflict).
 *   3. consent === true and rawTags is null: external provides everything
 *      (including PII if present).
 *   4. All inputs null/empty: return {}.
 *
 * Pure: does not mutate inputs, does not throw on null/empty inputs.
 */
export function enrichMetadata(input: MetadataEnrichmentInput): DisplayMetadata {
  const { rawTags, consent, external } = input;
  const result: DisplayMetadata = {};

  if (consent && rawTags) {
    for (const k of ['title', 'bpm', 'key', 'artist', 'album', 'comment'] as const) {
      const v = rawTags[k];
      if (v !== undefined) {
        (result as Record<string, unknown>)[k] = v;
      }
    }
  }

  if (external) {
    for (const k of ['title', 'bpm', 'key', 'artist', 'album', 'comment'] as const) {
      if (!consent && isPiiField(k)) continue;
      const v = external[k];
      if (v !== undefined && (result as Record<string, unknown>)[k] === undefined) {
        (result as Record<string, unknown>)[k] = v;
      }
    }
  }

  return result;
}