// @rt-safe
/**
 * P04-T03-S01-M05 - Flush denormals on the audio thread.
 *
 * Denormals (< 1e-37) cause massive CPU spikes on the audio thread.
 * We flush them to exact zero at the feedback/filter boundary.
 * The flush constant is applied via flushDenormal() and flushDenormalArray().
 */

export const FLUSH_THRESHOLD = 1e-37;

export function flushDenormal(x: number): number {
  return Math.abs(x) < FLUSH_THRESHOLD ? 0 : x;
}

export function flushDenormalArray(arr: Float32Array): void {
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i] ?? 0;
    arr[i] = Math.abs(v) < FLUSH_THRESHOLD ? 0 : v;
  }
}
