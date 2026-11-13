// OTOMIX §4.1 · §4.7 — RMS fallback for WASM crash/timeout.
//
// Trigger (§4.1, §4.7): worker crash OR extraction timeout > 5000 ms.
// Response (§4.7): "RMS analyzer fallback; basic feature set; queue not stalled."
//
// Web Audio API (`AudioContext`, `AnalyserNode`) is DOM-only and unavailable in
// Node/Vitest. We compute RMS in pure JS over the mono Float32Array; the
// semantic is identical ("basic viable feature set without stalling the queue").
//
// Rule 25 (Mixability-First): the fallback registry carries mixability.score=0
// and class='unmixable'. It cannot silently pass the mixability gate.
// Rule 26: no musical quantities in seconds; `timeoutMs` is a boundary value,
// and ANALYSIS_TIMEOUT_MS is an allowlisted constant (imported from @otomix/core).

import { ANALYSIS_TIMEOUT_MS } from '@otomix/core';
import { type FeatureRegistryV1_2 } from '@otomix/contracts';

const UNMIXABLE_CLASS = 'unmixable' as const;
const FALLBACK_SCHEMA_VERSION = '1.2.0';
const FALLBACK_BPM = 60.0;   // schema minimum — sentinel "unknown"
const FALLBACK_KEY = '1A';   // valid Camelot placeholder — sentinel "unknown"

export interface RmsFallbackOptions {
  /** Track identifier supplied by the caller. */
  readonly trackId: string;
  /** Mono PCM samples used for the RMS measurement. */
  readonly audio: Float32Array;
  /** Override the default analysis timeout. Defaults to ANALYSIS_TIMEOUT_MS. */
  readonly timeoutMs?: number;
}

/**
 * Compute RMS over a mono PCM buffer. Returns a value in [0, 1] (clamped).
 * Used by the fallback path only; the real engine produces a full feature set.
 */
function rmsScalar(audio: Float32Array): number {
  const n = audio.length;
  if (n === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    const v = audio[i]!;
    sumSq += v * v;
  }
  const rms = Math.sqrt(sumSq / n);
  if (!Number.isFinite(rms) || rms < 0) return 0;
  return rms > 1 ? 1 : rms;
}

/**
 * Build a schema-valid Feature Registry v1.2 fallback from a mono PCM buffer.
 * Pure function; no timeout logic.
 */
export function buildRmsFallback(options: RmsFallbackOptions): FeatureRegistryV1_2 {
  const scalar = rmsScalar(options.audio);
  const registry = {
    schema_version: FALLBACK_SCHEMA_VERSION,
    track_id: options.trackId,
    bpm: FALLBACK_BPM,
    key: FALLBACK_KEY,
    grid: {
      bpm_seed: FALLBACK_BPM,
      t0_seconds: 0,
      groove_mode: 'straight',
    },
    energy: {
      rhythm: 0,
      dynamics: 0,
      loudness: 0,
      spectral: 0,
      scalar,
      stars: scalar > 0 ? 1 : 0,
    },
    mixability: {
      score: 0,
      e_kick: 0,
      c_bass: 0,
      s_tempo: 0,
      v_tune: 0,
      class: UNMIXABLE_CLASS,
    },
    vocal_map: {
      threshold: 0.65,
      smoothing_ms: 1000,
      frames: [] as Array<{ t: number; p: number; v: number }>,
    },
    used_rms_fallback: true,
    interpolated_fields: ['bpm', 'key', 'grid', 'energy', 'mixability', 'vocal_map'],
  };
  return registry as unknown as FeatureRegistryV1_2;
}

/**
 * Race `fn()` against a timeout. On timeout or rejection, return the RMS
 * fallback. On success, return `fn()`'s result unchanged (no state leaks
 * between calls — each invocation is independent).
 *
 * Note: `Promise.race` cannot cancel a stuck promise; its result is discarded.
 * Documented as technical debt; revisit when the real WASM engine lands.
 */
const TIMEOUT_SENTINEL = Symbol('extract-timeout-sentinel');

export async function runWithRmsFallback<T>(
  fn: () => Promise<T>,
  options: RmsFallbackOptions,
): Promise<T | FeatureRegistryV1_2> {
  const timeoutMs = options.timeoutMs ?? ANALYSIS_TIMEOUT_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<typeof TIMEOUT_SENTINEL>((resolve) => {
    timer = setTimeout(() => resolve(TIMEOUT_SENTINEL), timeoutMs);
  });

  try {
    const raced = await Promise.race([fn(), timeoutPromise]);
    if (raced === TIMEOUT_SENTINEL) {
      return buildRmsFallback(options);
    }
    return raced as T;
  } catch {
    return buildRmsFallback(options);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}