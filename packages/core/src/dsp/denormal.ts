/**
 * Standard threshold for flushing denormals.
 * Values smaller than this in absolute magnitude will be flushed to zero.
 */
export const DENORMAL_THRESHOLD = 1e-15;

/**
 * Flushes a single float value to zero if it is in the denormal range.
 * Prevents CPU spikes (up to 100x slowdown) in feedback loops.
 * 
 * Rule 23: Pure, zero-allocation primitive math.
 */
export function flushDenormal(value: number): number {
  if (Math.abs(value) < DENORMAL_THRESHOLD) {
    return 0;
  }
  return value;
}

/**
 * Flushes all denormal values in a Float32Array buffer to zero in-place.
 * Called at the end of a DSP block processing.
 * 
 * Rule 23: Zero-allocation, modifies buffer in place.
 */
export function flushDenormalBuffer(buffer: Float32Array): void {
  for (let i = 0; i < buffer.length; i++) {
    if (Math.abs(buffer[i]) < DENORMAL_THRESHOLD) {
      buffer[i] = 0;
    }
  }
}