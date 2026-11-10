// OTOMIX §3.2 · Precomputed 2048-sample Hamming window
export const WINDOW_SIZE = 2048;
export const hammingWindow = new Float32Array(WINDOW_SIZE);
for (let i = 0; i < WINDOW_SIZE; i++) {
  hammingWindow[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (WINDOW_SIZE - 1));
}