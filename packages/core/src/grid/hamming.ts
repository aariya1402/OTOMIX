// OTOMIX §3.2 · Precomputed Hamming window
import { ATTACK_WINDOW_SIZE } from '../constants/grid';

export const WINDOW_SIZE = ATTACK_WINDOW_SIZE;
export const hammingWindow = new Float32Array(WINDOW_SIZE);
for (let i = 0; i < WINDOW_SIZE; i++) {
  hammingWindow[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (WINDOW_SIZE - 1));
}