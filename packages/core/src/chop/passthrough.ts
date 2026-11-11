/**
 * Determines if a beat range is completely outside the transition window.
 * If true, the audio should be passed through without chopping.
 *
 * @param startBeat - inclusive start boundary in beats
 * @param endBeat   - exclusive end boundary in beats
 * @param windowStartBeat - inclusive start of the transition window
 * @param windowEndBeat   - exclusive end of the transition window
 * @returns true if the range does not intersect the window at all
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
 *
 * @param buffer - the original audio buffer
 * @param startSample - inclusive start sample
 * @param endSample - exclusive end sample
 * @returns A Float32Array view of the passthrough segment
 */
export function getPassthroughAudio(
  buffer: Float32Array,
  startSample: number,
  endSample: number
): Float32Array {
  return buffer.subarray(startSample, endSample);
}