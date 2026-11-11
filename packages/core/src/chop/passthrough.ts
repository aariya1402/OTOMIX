/**
 * Determines if a beat range is completely outside the transition window.
 * If true, the audio should be passed through without chopping.
 */
export function isOutsideTransitionWindow(
  startBeat: number,
  endBeat: number,
  windowStartBeat: number,
  windowEndBeat: number
): boolean {
  return endBeat <= windowStartBeat || startBeat >= windowEndBeat;
}

/**
 * Returns a zero-copy view of the audio buffer for passthrough.
 * Uses Float32Array.subarray which creates a new view on the same
 * underlying ArrayBuffer without copying the PCM data (Rule 23).
 */
export function getPassthroughAudio(
  buffer: Float32Array,
  startSample: number,
  endSample: number
): Float32Array {
  return buffer.subarray(startSample, endSample);
}