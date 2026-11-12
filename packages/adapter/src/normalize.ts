import { getAnalysisConfig } from '@otomix/core';

export interface AudioBufferInput {
  readonly sampleRate: number;
  readonly numberOfChannels: number;
  readonly length: number;
  getChannelData(channel: number): Float32Array;
}

export type NormalizeResult =
  | { readonly ok: true; readonly value: Float32Array[] }
  | { readonly ok: false; readonly error: 'INVALID_ARGUMENT'; readonly message: string };

const TARGET_SAMPLE_RATE = 44100;

export function normalizeInput(input: AudioBufferInput, forceMonoOverride?: boolean): NormalizeResult {
  if (input === null || input === undefined) {
    return { ok: false, error: 'INVALID_ARGUMENT', message: 'input is null or undefined' };
  }
  const sampleRate = input.sampleRate;
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    return { ok: false, error: 'INVALID_ARGUMENT', message: 'sampleRate must be positive' };
  }
  const channels = input.numberOfChannels;
  if (!Number.isInteger(channels) || channels <= 0) {
    return { ok: false, error: 'INVALID_ARGUMENT', message: 'numberOfChannels must be a positive integer' };
  }
  const inLen = input.length;
  if (!Number.isInteger(inLen) || inLen < 0) {
    return { ok: false, error: 'INVALID_ARGUMENT', message: 'length must be non-negative' };
  }
  
  if (inLen === 0) {
    return { ok: true, value: [] };
  }

  const config = getAnalysisConfig();
  const forceMono = forceMonoOverride ?? config.normalization.forceMono;
  const outChannelsCount = forceMono ? 1 : Math.min(channels, 2);

  const outLen = Math.round((inLen * TARGET_SAMPLE_RATE) / sampleRate);
  const out: Float32Array[] = [];
  for (let c = 0; c < outChannelsCount; c++) {
    out.push(new Float32Array(outLen));
  }

  const fillMono = (outBuf: Float32Array) => {
    const invCh = 1 / channels;
    for (let c = 0; c < channels; c++) {
      const ch = input.getChannelData(c);
      for (let n = 0; n < outLen; n++) outBuf[n] = outBuf[n]! + ch[n]! * invCh;
    }
  };

  if (sampleRate === TARGET_SAMPLE_RATE) {
    if (outChannelsCount === 1) {
      fillMono(out[0]);
    } else {
      for (let c = 0; c < outChannelsCount; c++) {
        const ch = input.getChannelData(c);
        for (let n = 0; n < outLen; n++) out[c][n] = ch[n]!;
      }
    }
    return { ok: true, value: out };
  }

  const step = sampleRate / TARGET_SAMPLE_RATE;
  const lastIdx = inLen - 1;

  if (outChannelsCount === 1) {
    const invCh = 1 / channels;
    const outBuf = out[0];
    for (let n = 0; n < outLen; n++) {
      const pos = n * step;
      let i0 = pos | 0; if (i0 > lastIdx) i0 = lastIdx;
      const frac = pos - i0; const i1 = i0 < lastIdx ? i0 + 1 : i0;
      let sum = 0;
      for (let c = 0; c < channels; c++) {
        const ch = input.getChannelData(c);
        sum += ch[i0]! + (ch[i1]! - ch[i0]!) * frac;
      }
      outBuf[n] = sum * invCh;
    }
  } else {
    for (let c = 0; c < outChannelsCount; c++) {
      const ch = input.getChannelData(c);
      const outBuf = out[c];
      for (let n = 0; n < outLen; n++) {
        const pos = n * step;
        let i0 = pos | 0; if (i0 > lastIdx) i0 = lastIdx;
        const frac = pos - i0; const i1 = i0 < lastIdx ? i0 + 1 : i0;
        outBuf[n] = ch[i0]! + (ch[i1]! - ch[i0]!) * frac;
      }
    }
  }

  return { ok: true, value: out };
}