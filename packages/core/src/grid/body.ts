// OTOMIX §3.2 · Mother §2.2
import { CascadedButterworth } from '../dsp/butterworth';
import {
  BODY_CUTOFF_HZ, BODY_FILTER_ORDER,
  BODY_RMS_WINDOW_MS, BODY_SEARCH_WINDOW_MS,
  BODY_GROUP_DELAY_MS,
} from '../constants/grid';

const SR = 44100;
const RMS_WINDOW_SAMPLES = Math.round((BODY_RMS_WINDOW_MS * SR) / 1000);
const SEARCH_WINDOW_SAMPLES = Math.round((BODY_SEARCH_WINDOW_MS * SR) / 1000);
const GROUP_DELAY_SAMPLES = Math.round((BODY_GROUP_DELAY_MS * SR) / 1000);

export function extractBodyGrid(
  pcm: Float32Array,
  sampleRate: number,
  attackOnsetSample = 0
): number | null {
  if (sampleRate !== SR) throw new Error('Only 44.1 kHz supported');
  if (pcm.length < RMS_WINDOW_SAMPLES) return null;

  // All state is local to the function — no module-level mutable state.
  // extractBodyGrid is offline analysis (called once per track), so per-call
  // allocation (~1 KB) is acceptable. Zero-RAM applies to real-time paths only.
  const bodyFilter = new CascadedButterworth(BODY_FILTER_ORDER, BODY_CUTOFF_HZ, SR);
  const rmsBuffer = new Float32Array(RMS_WINDOW_SAMPLES);
  let rmsWriteIdx = 0;
  let rmsSumSq = 0;
  let rmsFilled = false;

  const searchStart = Math.max(attackOnsetSample, RMS_WINDOW_SAMPLES - 1);
  const searchEnd = Math.min(searchStart + SEARCH_WINDOW_SAMPLES, pcm.length);

  let peakIdx = searchStart;
  let peakVal = -Infinity;

  for (let i = 0; i < pcm.length; i++) {
    const filtered = bodyFilter.process(pcm[i]);
    const squared = filtered * filtered;

    if (rmsFilled) {
      rmsSumSq -= rmsBuffer[rmsWriteIdx];
    }
    rmsBuffer[rmsWriteIdx] = squared;
    rmsSumSq += squared;
    rmsWriteIdx++;
    if (rmsWriteIdx >= RMS_WINDOW_SAMPLES) {
      rmsWriteIdx = 0;
      rmsFilled = true;
    }

    if (rmsFilled && i >= searchStart && i < searchEnd) {
      const rms = Math.sqrt(rmsSumSq / RMS_WINDOW_SAMPLES);
      if (rms > peakVal) {
        peakVal = rms;
        peakIdx = i;
      }
    }
  }

  // Compensate for filter group delay
  const correctedPeakIdx = Math.max(0, peakIdx - GROUP_DELAY_SAMPLES);
  return correctedPeakIdx;
}