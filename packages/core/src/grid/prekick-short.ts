// OTOMIX §3.10 · Mother §2.10
import { BeatIndex } from '../types/beat-index';

/**
 * Epsilon to compensate for IEEE 754 floating-point rounding when a
 * timestamp falls exactly on a beat boundary. Without this, values
 * like (1.4 - 2.0) / 0.6 can produce -1.0000000000000002, which
 * Math.floor would round down to -2 incorrectly.
 */
const EPSILON = 1e-9;

export function getPreKickBeat(t: number, T0: number, bpmSeed: number): BeatIndex {
  const period = 60 / bpmSeed;
  const i = Math.floor((t - T0) / period + EPSILON);
  
  const result = BeatIndex.parse(i);
  if (!result.ok) {
    throw new Error(`Pre-kick mapping produced invalid beat index: ${i}`);
  }
  return result.value;
}