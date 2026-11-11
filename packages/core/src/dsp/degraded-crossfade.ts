/**
 * Standard crossfade logic for degraded mode (no micro-chopping).
 */
export function applyDegradedCrossfade(
  input: Float32Array,
  output: Float32Array,
  startGain: number,
  endGain: number
): void {
  const len = input.length;
  for (let i = 0; i < len; i++) {
    const t = i / Math.max(1, len - 1);
    const gain = startGain + (endGain - startGain) * t;
    output[i] = input[i] * gain;
  }
}