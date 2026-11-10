// @structural
// OTOMIX §3.3 · Quantum timing arithmetic
// Zero-RAM: pure O(1) arithmetic, zero allocation.

import { QUANTUM_DIVISOR } from '../constants/grid';

/**
 * Duration of one quantum (1/24 beat) in seconds at given BPM.
 * quantumSeconds(120) = (60/120)/24 = 0.0208333...
 * @throws RangeError if bpm is not a positive finite number
 */
export function quantumSeconds(bpm: number): number {
  if (!Number.isFinite(bpm) || bpm <= 0) {
    throw new RangeError('bpm must be a positive finite number');
  }
  return (60 / bpm) / QUANTUM_DIVISOR;
}

/**
 * Quantum index for a fractional beat position.
 * quantumIndex(1.0208) = Math.round(1.0208 * 24) = 24
 * quantumIndex(1.0417) = Math.round(1.0417 * 24) = 25
 * @throws RangeError if beatFloat is not a finite number
 */
export function quantumIndex(beatFloat: number): number {
  if (!Number.isFinite(beatFloat)) {
    throw new RangeError('beatFloat must be a finite number');
  }
  return Math.round(beatFloat * QUANTUM_DIVISOR);
}