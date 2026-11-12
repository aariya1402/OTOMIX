// P05-T01-S01-M01 — unit tests for normalizeInput.
// Spec reference: OTOMIX §4.1 · Mother §3.1.
// Rules honored: 23 (Float32Array, no per-call allocations beyond output),
// 25 (no feature computation), 26 (sampleRate is a Web Audio boundary).

import { describe, it, expect } from 'vitest';
import { normalizeInput, type AudioBufferInput } from '../src/normalize';

// --- Local helpers (packages/testkit does not exist; see technical debt) ---

function makeSine(
  sampleRate: number,
  durationSeconds: number,
  frequencyHz: number,
  amplitude: number,
): Float32Array {
  const length = Math.round(sampleRate * durationSeconds);
  const buf = new Float32Array(length);
  const omega = (2 * Math.PI * frequencyHz) / sampleRate;
  for (let i = 0; i < length; i++) {
    buf[i] = amplitude * Math.sin(omega * i);
  }
  return buf;
}

function makeInput(channels: Float32Array[], sampleRate: number): AudioBufferInput {
  return {
    sampleRate,
    numberOfChannels: channels.length,
    length: channels.length > 0 ? channels[0].length : 0,
    getChannelData: (c: number) => {
      const ch = channels[c];
      if (ch === undefined) throw new Error('channel out of range: ' + c);
      return ch;
    },
  };
}

// Sub-sample accurate frequency estimation via linear interpolation of
// positive-going zero crossings. For a pure 1 kHz sine over 2 s this is
// accurate to well under 0.1 Hz, satisfying the ±0.5 Hz micro-task tolerance.
function estimateFrequencyHz(signal: Float32Array, sampleRate: number): number {
  let firstCrossing = -1;
  let lastCrossing = -1;
  let count = 0;
  for (let i = 1; i < signal.length; i++) {
    const prev = signal[i - 1];
    const cur = signal[i];
    if (prev < 0 && cur >= 0) {
      const t = i - 1 + -prev / (cur - prev);
      if (firstCrossing < 0) firstCrossing = t;
      lastCrossing = t;
      count++;
    }
  }
  if (count < 2) return 0;
  const periods = count - 1;
  const spanSeconds = (lastCrossing - firstCrossing) / sampleRate;
  return periods / spanSeconds;
}

// --- Tests ---

describe('normalizeInput', () => {
  it('T1a: 48 kHz stereo 1 kHz sine, 2 s -> mono length 88200', () => {
    const L = makeSine(48000, 2, 1000, 1.0);
    const R = makeSine(48000, 2, 1000, 0.8);
    const result = normalizeInput(makeInput([L, R], 48000));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.length).toBe(88200);
  });

  it('T1b: 48 kHz stereo 1 kHz sine -> dominant frequency 1000 +/- 0.5 Hz', () => {
    const L = makeSine(48000, 2, 1000, 1.0);
    const R = makeSine(48000, 2, 1000, 0.8);
    const result = normalizeInput(makeInput([L, R], 48000));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const freq = estimateFrequencyHz(result.value, 44100);
    expect(Math.abs(freq - 1000)).toBeLessThanOrEqual(0.5);
  });

  it('T2: 44.1 kHz stereo 1 kHz sine, 1 s -> bypass, length 44100, freq preserved', () => {
    const L = makeSine(44100, 1, 1000, 1.0);
    const R = makeSine(44100, 1, 1000, 0.8);
    const result = normalizeInput(makeInput([L, R], 44100));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.length).toBe(44100);
    const freq = estimateFrequencyHz(result.value, 44100);
    expect(Math.abs(freq - 1000)).toBeLessThanOrEqual(0.5);
  });

  it('T3: 48 kHz mono 1 kHz sine, 2 s -> resample only, length 88200, freq preserved', () => {
    const M = makeSine(48000, 2, 1000, 1.0);
    const result = normalizeInput(makeInput([M], 48000));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.length).toBe(88200);
    const freq = estimateFrequencyHz(result.value, 44100);
    expect(Math.abs(freq - 1000)).toBeLessThanOrEqual(0.5);
  });

  it('T4: numberOfChannels === 0 -> INVALID_ARGUMENT', () => {
    const result = normalizeInput(makeInput([], 44100));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('INVALID_ARGUMENT');
    expect(typeof result.message).toBe('string');
  });

  it('T5: length === 0 (2 channels) -> ok with empty Float32Array', () => {
    const empty = new Float32Array(0);
    const result = normalizeInput(makeInput([empty, empty], 44100));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.length).toBe(0);
  });

  it('T6: fresh output buffer, no aliasing of input channel data', () => {
    const L = makeSine(48000, 2, 1000, 1.0);
    const R = makeSine(48000, 2, 1000, 0.8);
    const input = makeInput([L, R], 48000);
    const first = normalizeInput(input);
    const second = normalizeInput(input);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    // Distinct buffers between two calls
    expect(first.value.buffer).not.toBe(second.value.buffer);
    // Fresh buffer, not aliasing an input channel
    expect(first.value.buffer).not.toBe(L.buffer);
    expect(first.value.buffer).not.toBe(R.buffer);
  });
});