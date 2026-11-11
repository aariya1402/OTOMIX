// OTOMIX §3.6 · Mother §2.6
import { QUANTUM_DIVISOR } from '../constants/grid';

/**
 * Computes the phase drift between the real-time rendering context clock
 * and the Absolute Locked Grid position, expressed in QUANTA.
 *
 * @param gridTimeSeconds - Absolute Locked Grid timestamp (seconds, I/O boundary)
 * @param contextTimeSeconds - Real-time rendering context timestamp (seconds, I/O boundary)
 * @param bpm - Current tempo (BPM) for quanta conversion
 * @returns Drift in quanta (1 quantum = 1/24 beat)
 * @throws RangeError if bpm is not a positive finite number
 */
export function computeDrift(
  gridTimeSeconds: number,
  contextTimeSeconds: number,
  bpm: number
): number {
  if (!Number.isFinite(bpm) || bpm <= 0) {
    throw new RangeError('bpm must be a positive finite number');
  }
  const driftSeconds = contextTimeSeconds - gridTimeSeconds;
  const quantumSeconds = (60 / bpm) / QUANTUM_DIVISOR;
  return driftSeconds / quantumSeconds;
}