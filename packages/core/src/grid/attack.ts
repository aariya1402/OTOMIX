// OTOMIX §3.2 · Mother §2.2
import { hammingWindow, WINDOW_SIZE } from './hamming';
import { fft } from './fft';
import {
  ATTACK_HOP_SIZE,
  ATTACK_CUTOFF_HZ,
  SAMPLE_RATE,
} from '../constants/grid';

const HOP_SIZE = ATTACK_HOP_SIZE;
const CUTOFF_HZ = ATTACK_CUTOFF_HZ;

export function extractAttackGrid(pcm: Float32Array, sampleRate: number): number[] {
  if (sampleRate !== SAMPLE_RATE) throw new Error(`Only ${SAMPLE_RATE / 1000} kHz supported`);
  if (pcm.length < WINDOW_SIZE) return [];

  const binWidth = sampleRate / WINDOW_SIZE;
  const cutoffBin = Math.floor(CUTOFF_HZ / binWidth);

  const numFrames = Math.floor((pcm.length - WINDOW_SIZE) / HOP_SIZE) + 1;
  const magnitudes = new Array<Float32Array>(numFrames);
  const frameRe = new Float32Array(WINDOW_SIZE);
  const frameIm = new Float32Array(WINDOW_SIZE);

  for (let f = 0; f < numFrames; f++) {
    const offset = f * HOP_SIZE;
    for (let i = 0; i < WINDOW_SIZE; i++) {
      frameRe[i] = pcm[offset + i] * hammingWindow[i];
      frameIm[i] = 0;
    }
    fft(frameRe, frameIm);
    const mag = new Float32Array(WINDOW_SIZE / 2);
    for (let k = 0; k < WINDOW_SIZE / 2; k++) {
      mag[k] = Math.hypot(frameRe[k], frameIm[k]);
    }
    for (let k = 0; k <= cutoffBin; k++) mag[k] = 0;
    magnitudes[f] = mag;
  }

  const flux = new Float32Array(numFrames);
  for (let f = 1; f < numFrames; f++) {
    let sum = 0;
    const prev = magnitudes[f - 1];
    const curr = magnitudes[f];
    for (let k = cutoffBin + 1; k < WINDOW_SIZE / 2; k++) {
      const diff = curr[k] - prev[k];
      if (diff > 0) sum += diff * diff;
    }
    flux[f] = sum;
  }
  flux[0] = 0;

  const sortedFlux = new Float32Array(numFrames);
  sortedFlux.set(flux);
  sortedFlux.sort();

  const median = sortedFlux[Math.floor(numFrames / 2)];
  let madSum = 0;
  for (let i = 0; i < numFrames; i++) {
    madSum += Math.abs(flux[i] - median);
  }
  const mad = madSum / numFrames;
  const threshold = Math.max(median + 1.5 * mad, 2.0);

  const peaks: number[] = [];
  for (let f = 1; f < numFrames - 1; f++) {
    if (flux[f] > flux[f - 1] && flux[f] > flux[f + 1] && flux[f] > threshold) {
      const sampleIndex = f * HOP_SIZE + (WINDOW_SIZE >> 1);
      if (peaks.length === 0 || sampleIndex - peaks[peaks.length - 1] >= HOP_SIZE) {
        peaks.push(sampleIndex);
      }
    }
  }
  return peaks;
}