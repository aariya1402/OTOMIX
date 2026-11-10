// OTOMIX §3.10 · Mother §2.10
import { BeatIndex } from '../types/beat-index';
import { BEAT_EPSILON } from '../constants/grid';

export function getPreKickBeat(t: number, T0: number, bpmSeed: number): BeatIndex {
  const period = 60 / bpmSeed;
  const i = Math.floor((t - T0) / period + BEAT_EPSILON);

  const result = BeatIndex.parse(i);
  if (!result.ok) {
    throw new Error(`Pre-kick mapping produced invalid beat index: ${i}`);
  }
  return result.value;
}