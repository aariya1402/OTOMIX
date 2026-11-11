import { BEAT_EPSILON } from '../constants/grid';
import { quantumSeconds } from '../timing/quantum';

/** 8 = 1/8 beat, 16 = 1/16 beat, 32 = 1/32 beat */
export type ChopGridDenominator = 8 | 16 | 32;

/**
 * Computes slice boundaries in beats (fractional beats) over [startBeat, endBeat)
 * snapped to the chopGrid. Pure, deterministic, zero-allocation: boundary beat
 * positions are written into the caller-supplied `out` buffer and the count is
 * returned. No seconds are produced internally; beats -> seconds happens only at
 * the Web Audio API boundary (tOfI / quantumSeconds / AudioBufferSourceNode.start).
 *
 * @param startBeat - inclusive start boundary in beats
 * @param endBeat   - exclusive end boundary in beats
 * @param chopGrid  - 8 | 16 | 32 (denominator of 1/denominator beat)
 * @param out       - pre-allocated Float32Array; written with boundary beat positions
 * @returns number of boundaries written (valid indices: out[0 .. count-1])
 * @throws RangeError if endBeat < startBeat or chopGrid is not 8/16/32
 */
export function computeSliceBoundaries(
  startBeat: number,
  endBeat: number,
  chopGrid: ChopGridDenominator,
  out: Float32Array
): number {
  if (endBeat < startBeat) {
    throw new RangeError('endBeat must be >= startBeat');
  }
  if (chopGrid !== 8 && chopGrid !== 16 && chopGrid !== 32) {
    throw new RangeError('chopGrid must be 8, 16, or 32');
  }

  const fraction = 1 / chopGrid;
  let count = 0;

  const startIndex = Math.ceil(startBeat / fraction - BEAT_EPSILON);
  const endIndex = Math.floor(endBeat / fraction + BEAT_EPSILON);

  for (let i = startIndex; i <= endIndex; i++) {
    const boundary = i * fraction;
    out[count++] = boundary;
  }

  return count;
}

/**
 * Converts a beat span to an exact number of samples.
 * This is a boundary-layer helper. It is NOT part of the real-time inner loop.
 */
export function beatSpanToSamples(
  startBeat: number,
  endBeat: number,
  bpm: number,
  sampleRate: number
): number {
  const spanBeats = endBeat - startBeat;
  const secPerBeat = quantumSeconds(bpm) * 24;
  return Math.round(spanBeats * secPerBeat * sampleRate);
}