// P05-T01-S03-M03 — RMS fallback on worker crash / timeout.
// Verifies schema-valid fallback registry + non-stalling recovery.

import { describe, it, expect } from 'vitest';
import { validateRegistry } from '@otomix/contracts';
import { buildRmsFallback, runWithRmsFallback } from '../src/fallback-rms';

const trackId = '550e8400-e29b-41d4-a716-446655440000';
// 1 s of silence; scalar will be 0. See test 1b for a non-silent probe.
const silent = new Float32Array(44100);
// 1 s sine at ~220 Hz with amplitude 0.5 -> RMS ~= 0.3535.
const sine = (() => {
  const a = new Float32Array(44100);
  for (let i = 0; i < a.length; i++) {
    a[i] = 0.5 * Math.sin((2 * Math.PI * 220 * i) / 44100);
  }
  return a;
})();

const isFallback = (v: unknown): v is { used_rms_fallback?: true; mixability: { score: number; class: string } } => {
  return typeof v === 'object' && v !== null && (v as { used_rms_fallback?: boolean }).used_rms_fallback === true;
};

describe('RMS fallback (P05-T01-S03-M03)', () => {
  it('buildRmsFallback yields schema-valid registry with used_rms_fallback=true and unmixable mixability', () => {
    const reg = buildRmsFallback({ trackId, audio: silent });
    const v = validateRegistry(reg);
    expect(v.ok).toBe(true);

    const r = reg as unknown as {
      used_rms_fallback: boolean;
      mixability: { score: number; class: string };
      energy: { scalar: number };
    };
    expect(r.used_rms_fallback).toBe(true);
    expect(r.mixability.score).toBe(0);
    expect(r.mixability.class).toBe('unmixable');
    expect(r.energy.scalar).toBe(0);
  });

  it('buildRmsFallback computes nonzero energy.scalar from non-silent audio', () => {
    const reg = buildRmsFallback({ trackId, audio: sine });
    const r = reg as unknown as { energy: { scalar: number } };
    // RMS of a 0.5-amplitude sine is ~0.3535; assert close.
    expect(r.energy.scalar).toBeGreaterThan(0.3);
    expect(r.energy.scalar).toBeLessThan(0.4);
    expect(validateRegistry(reg).ok).toBe(true);
  });

  it('rejecting worker fn returns fallback (used_rms_fallback=true)', async () => {
    const fn = () => Promise.reject(new Error('worker crash'));
    const result = await runWithRmsFallback(fn, { trackId, audio: silent, timeoutMs: 50 });
    expect(isFallback(result)).toBe(true);
    expect(validateRegistry(result).ok).toBe(true);
  });

  it('hanging worker fn past timeout returns fallback within timeoutMs', async () => {
    const fn = () => new Promise<never>(() => { /* never settles */ });
    const start = Date.now();
    const result = await runWithRmsFallback(fn, { trackId, audio: silent, timeoutMs: 50 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(500);   // generous; must be well under 5000
    expect(isFallback(result)).toBe(true);
    expect(validateRegistry(result).ok).toBe(true);
  });

  it('second job: normal fast fn returns its own result unchanged', async () => {
    const fn = () => Promise.resolve({ engine: 'result' });
    const result = await runWithRmsFallback(fn, { trackId, audio: silent, timeoutMs: 50 });
    expect(result).toEqual({ engine: 'result' });      // exact shape
    expect(isFallback(result)).toBe(false);             // not a fallback
    // Prove no state leakage: a second invocation returns the same shape.
    const result2 = await runWithRmsFallback(fn, { trackId, audio: silent, timeoutMs: 50 });
    expect(result2).toEqual({ engine: 'result' });
  });
});