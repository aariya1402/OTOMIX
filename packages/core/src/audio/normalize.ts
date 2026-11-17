// OTOMIX §5.2 · Mother §1 · GAP-014
// Shared pure normalization. Down-mix to mono and resample to 44.1 kHz.
// No platform-specific imports. Used by decode.ts in workers.
export const TARGET_SAMPLE_RATE = 44100;

function downmixToMono(channelData: Float32Array[]): Float32Array {
  if (channelData.length === 0) return new Float32Array(0);
  if (channelData.length === 1) return channelData[0];
  const len = channelData[0].length;
  const out = new Float32Array(len);
  const inv = 1 / channelData.length;
  for (let i = 0; i < len; i++) {
    let sum = 0;
    for (let c = 0; c < channelData.length; c++) sum += channelData[c][i];
    out[i] = sum * inv;
  }
  return out;
}

function resampleLinear(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate || input.length === 0) return input;
  const outLen = Math.round(input.length * toRate / fromRate);
  const out = new Float32Array(outLen);
  const ratio = fromRate / toRate;
  const last = input.length - 1;
  for (let i = 0; i < outLen; i++) {
    const src = i * ratio;
    const lo = Math.floor(src);
    const hi = lo + 1 > last ? last : lo + 1;
    const frac = src - lo;
    out[i] = input[lo] * (1 - frac) + input[hi] * frac;
  }
  return out;
}

export function normalizeChannels(
  channelData: Float32Array[],
  sampleRate: number,
  forceMono: boolean = true,
): Float32Array {
  const mono = forceMono ? downmixToMono(channelData) : channelData[0];
  return resampleLinear(mono, sampleRate, TARGET_SAMPLE_RATE);
}