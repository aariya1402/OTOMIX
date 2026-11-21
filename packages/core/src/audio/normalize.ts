// OTOMIX §5.2 · Mother §1 · GAP-014 · GATE0-DEC-M03
// Shared pure normalization. Resample to 44.1 kHz.
// Stereo preserved for storage; mono downmix for Essentia analysis.
// No platform-specific imports. Used by decode.ts in workers.
export const TARGET_SAMPLE_RATE = 44100;

export interface NormalizeResult {
  /** Stereo/multi-channel audio at target sample rate (for storage) */
  stereo: Float32Array[];
  /** Mono downmix at target sample rate (for Essentia analysis) */
  mono: Float32Array;
}

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

function resampleChannels(channels: Float32Array[], fromRate: number, toRate: number): Float32Array[] {
  return channels.map(ch => resampleLinear(ch, fromRate, toRate));
}

/**
 * Normalize audio channels to target sample rate.
 * Returns BOTH stereo (for storage) and mono (for Essentia analysis).
 * @param channelData - Input channels (stereo = 2, mono = 1)
 * @param sampleRate - Source sample rate
 * @returns { stereo: resampled channels[], mono: downmixed & resampled }
 */
export function normalizeChannels(
  channelData: Float32Array[],
  sampleRate: number,
): NormalizeResult {
  // Resample all channels to target rate (preserve stereo for storage)
  const stereo = resampleChannels(channelData, sampleRate, TARGET_SAMPLE_RATE);
  // Downmix to mono for Essentia analysis
  const mono = resampleLinear(downmixToMono(channelData), sampleRate, TARGET_SAMPLE_RATE);
  return { stereo, mono };
}

/** Legacy: returns mono only (for backward compatibility) */
export function normalizeChannelsMono(
  channelData: Float32Array[],
  sampleRate: number,
  forceMono: boolean = false,
): Float32Array {
  const mono = forceMono ? downmixToMono(channelData) : channelData[0];
  return resampleLinear(mono, sampleRate, TARGET_SAMPLE_RATE);
}