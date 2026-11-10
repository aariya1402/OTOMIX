// OTOMIX §3.5 · Mother §2.5
import { STRAIGHT_VAR, TRIPLET_VAR, SWING_MIN, SWING_MAX, BEAT_EPSILON } from '../constants/grid';
import { GrooveInput, GrooveResult } from './types';

/** 1/3 - 1/4 = 0.08333... (triplet offset from 16th grid) */
const TRIPLET_OFFSET = 1 / 3 - 0.25;

export function classifyGroove(input: GrooveInput): GrooveResult {
  const dev = input.deviations;
  if (dev.length !== 16) throw new Error('GrooveInput.deviations must have 16 values');

  // 1. Straight: all |dev| < STRAIGHT_VAR
  let allSmall = true;
  for (let i = 0; i < 16; i++) {
    if (Math.abs(dev[i]) >= STRAIGHT_VAR) { allSmall = false; break; }
  }
  if (allSmall) return { mode: 'Straight', confidence: 1.0 };

  // 2. Triplet: odd positions alternate ±TRIPLET_OFFSET; even positions small
  let tripletOk = true;
  for (let i = 0; i < 16; i++) {
    if (i % 2 === 0) {
      if (Math.abs(dev[i]) >= STRAIGHT_VAR) { tripletOk = false; break; }
    } else {
      const expected = (((i - 1) / 2) % 2 === 0) ? TRIPLET_OFFSET : -TRIPLET_OFFSET;
      if (Math.abs(dev[i] - expected) >= TRIPLET_VAR) { tripletOk = false; break; }
    }
  }
  if (tripletOk) return { mode: 'Triplet', confidence: 1.0 };

  // 3. Swing: all odd positions positive and same mean in [SWING_MIN, SWING_MAX];
  //    even positions small
  let oddSum = 0, oddCount = 0, allPositive = true;
  for (let i = 1; i < 16; i += 2) {
    if (dev[i] <= 0) { allPositive = false; break; }
    oddSum += dev[i];
    oddCount++;
  }
  if (allPositive && oddCount > 0) {
    const meanDisp = oddSum / oddCount;
    if (meanDisp >= SWING_MIN - BEAT_EPSILON && meanDisp <= SWING_MAX + BEAT_EPSILON) {
      let evenOk = true;
      for (let i = 0; i < 16; i += 2) {
        if (Math.abs(dev[i]) >= STRAIGHT_VAR) { evenOk = false; break; }
      }
      if (evenOk) return { mode: 'Swing', swingDisplacement: meanDisp, confidence: 1.0 };
    }
  }

  return { mode: 'Irregular', confidence: 1.0 };
}