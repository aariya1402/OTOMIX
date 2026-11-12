// P05-T01-S03-M01 — releaseResult must be invoked exactly once per
// extraction attempt, on both success and throw paths (OTOMIX §4.1; §4.6).

import { describe, it, expect, vi } from 'vitest';
import { extractWithGuarantee } from '../src/extract';

describe('extractWithGuarantee — releaseResult guarantee', () => {
  it('calls engine.releaseResult exactly once on success', () => {
    const releaseResult = vi.fn();
    const engine = { releaseResult };
    const input = { audio: new Float32Array(1024) };
    const run = vi.fn(() => ({ data: { bpm: 120 } }));

    const out = extractWithGuarantee(engine, input, run);

    expect(out).toEqual({ data: { bpm: 120 } });
    expect(run).toHaveBeenCalledTimes(1);
    expect(releaseResult).toHaveBeenCalledTimes(1);
  });

  it('calls engine.releaseResult exactly once on throw and re-throws original error', () => {
    const releaseResult = vi.fn();
    const engine = { releaseResult };
    const input = { audio: new Float32Array(1024) };
    const err = new Error('WASM crash');
    const run = vi.fn(() => {
      throw err;
    });

    expect(() => extractWithGuarantee(engine, input, run)).toThrow(err);

    expect(run).toHaveBeenCalledTimes(1);
    expect(releaseResult).toHaveBeenCalledTimes(1);
  });
});