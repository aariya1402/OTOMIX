// OTOMIX §4.1 · Mother §3.1 — Resample decoded audio to 44.1 kHz mono Float32Array.
//
// Contract:
//   - Pure function: input buffer -> output buffer. No hidden state.
//   - Rule 23 (DSP / RT-safety): Float32Array only; no per-call allocation
//     beyond the output buffer; no exceptions in hot loops.
//   - Rule 25 (Mixability-First): this primitive computes/returns NO feature
//     (BPM, energy, mixability, grid_type). It is a buffer-in/buffer-out map.
//   - Rule 26 (Beat-Index Absolute): `sampleRate` is a Web Audio boundary
//     value (allow-listed). No musical quantities in seconds appear here.
//   - DOM-free: structural input interface works in Web Worker and under
//     Node/Vitest without a jsdom `AudioBuffer` shim.

export interface AudioBufferInput {
  readonly sampleRate: number;
  readonly numberOfChannels: number;
  readonly length: number;
  getChannelData(channel: number): Float32Array;
}

export type NormalizeResult =
  | { readonly ok: true; readonly value: Float32Array }
  | { readonly ok: false; readonly error: 'INVALID_ARGUMENT'; readonly message: string };

// 44.1 kHz is the platform-wide analysis rate (OTOMIX §4.1).
// Note: SAMPLE_RATE = 44100 also exists at packages/core/src/constants/grid.ts:47,
// but it is NOT part of the frozen P01-T02-S01-M02 constant list. We hardcode
// the value here to keep @otomix/adapter dependency-free (Rule 18: no
// cross-package import drift without owner approval).
const TARGET_SAMPLE_RATE = 44100;

export function normalizeInput(input: AudioBufferInput): NormalizeResult {
  if (input === null || input === undefined) {
    return { ok: false, error: 'INVALID_ARGUMENT', message: 'input is null or undefined' };
  }
  const sampleRate = input.sampleRate;
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    return { ok: false, error: 'INVALID_ARGUMENT', message: 'sampleRate must be a positive finite number' };
  }
  const channels = input.numberOfChannels;
  if (!Number.isInteger(channels) || channels <= 0) {
    return { ok: false, error: 'INVALID_ARGUMENT', message: 'numberOfChannels must be a positive integer' };
  }
  const inLen = input.length;
  if (!Number.isInteger(inLen) || inLen < 0) {
    return { ok: false, error: 'INVALID_ARGUMENT', message: 'length must be a non-negative integer' };
  }
  if (inLen === 0) {
    return { ok: true, value: new Float32Array(0) };
  }

  const outLen = Math.round((inLen * TARGET_SAMPLE_RATE) / sampleRate);
  const out = new Float32Array(outLen);

  // Fast path: already at target rate — mono downmix only, fresh buffer.
  if (sampleRate === TARGET_SAMPLE_RATE) {
    if (channels === 1) {
      const ch0 = input.getChannelData(0);
      for (let n = 0; n < outLen; n++) out[n] = ch0[n];
    } else if (channels === 2) {
      const ch0 = input.getChannelData(0);
      const ch1 = input.getChannelData(1);
      for (let n = 0; n < outLen; n++) out[n] = (ch0[n] + ch1[n]) * 0.5;
    } else {
      // >2 channels: zero extra allocation (Review Checkpoint).
      // Iterate channels in the outer loop and accumulate into `out` in place.
      // Mathematically identical to (Σ interp) × invCh; floating-point
      // rounding may differ in the last bit, negligible downstream.
      const invCh = 1 / channels;
      out.fill(0);
      for (let c = 0; c < channels; c++) {
        const ch = input.getChannelData(c);
        for (let n = 0; n < outLen; n++) out[n] += ch[n] * invCh;
      }
    }
    return { ok: true, value: out };
  }

  // Resample + mono downmix fused in a single pass via linear interpolation.
  // The only allocation in this call is `out` (Rule 23).
  const step = sampleRate / TARGET_SAMPLE_RATE;
  const lastIdx = inLen - 1;

  if (channels === 1) {
    const ch0 = input.getChannelData(0);
    for (let n = 0; n < outLen; n++) {
      const pos = n * step;
      let i0 = pos | 0;
      if (i0 > lastIdx) i0 = lastIdx;
      const frac = pos - i0;
      const i1 = i0 < lastIdx ? i0 + 1 : i0;
      const a = ch0[i0];
      const b = ch0[i1];
      out[n] = a + (b - a) * frac;
    }
  } else if (channels === 2) {
    const ch0 = input.getChannelData(0);
    const ch1 = input.getChannelData(1);
    for (let n = 0; n < outLen; n++) {
      const pos = n * step;
      let i0 = pos | 0;
      if (i0 > lastIdx) i0 = lastIdx;
      const frac = pos - i0;
      const i1 = i0 < lastIdx ? i0 + 1 : i0;
      const a0 = ch0[i0];
      const b0 = ch0[i1];
      const a1 = ch1[i0];
      const b1 = ch1[i1];
      const m0 = a0 + (b0 - a0) * frac;
      const m1 = a1 + (b1 - a1) * frac;
      out[n] = (m0 + m1) * 0.5;
    }
  } else {
    // >2 channels: zero extra allocation (Review Checkpoint).
    const invCh = 1 / channels;
    out.fill(0);
    for (let c = 0; c < channels; c++) {
      const ch = input.getChannelData(c);
      for (let n = 0; n < outLen; n++) {
        const pos = n * step;
        let i0 = pos | 0;
        if (i0 > lastIdx) i0 = lastIdx;
        const frac = pos - i0;
        const i1 = i0 < lastIdx ? i0 + 1 : i0;
        const a = ch[i0];
        const b = ch[i1];
        out[n] += (a + (b - a) * frac) * invCh;
      }
    }
  }

  return { ok: true, value: out };
}