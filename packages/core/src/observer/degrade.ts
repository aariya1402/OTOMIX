// OTOMIX §3.6 · Mother §2.6
import { BUFFER_DEGRADED, STARVATION_FRAME_MS } from '../constants/timing';

/**
 * Computes the next audio buffer size based on frame processing time.
 *
 * @param currentBufferSize - Current buffer size in samples (2048 or 4096)
 * @param frameTimeMs - Measured frame processing time in milliseconds
 * @returns Object with new buffer size and starvation flag
 *
 * Expansion is one-way (no auto-recovery). Caller emits 'system.thread.starvation'
 * when starvation === true.
 */
export function computeBufferSize(
  currentBufferSize: number,
  frameTimeMs: number
): { bufferSize: number; starvation: boolean } {
  if (frameTimeMs > STARVATION_FRAME_MS) {
    return { bufferSize: BUFFER_DEGRADED, starvation: true };
  }
  return { bufferSize: currentBufferSize, starvation: false };
}