// OTOMIX §4.4 · Vocal Median Smoothing (P05-T03-S01-M02)
//
// Applies a 1-second median filter to the binary vocal map to scrub
// isolated false positives/negatives.
//
// Rule 26: t is a file position (BOUNDARY_IO), not musical time.

export interface VocalFrame {
  readonly t: number; // timestamp in seconds (file position)
  readonly v: number; // binary 0 or 1
}

export function medianSmoothVocalMap(
  frames: readonly VocalFrame[],
  window: number = 1 // window size in seconds (BOUNDARY_IO)
): number[] {
  if (!frames || frames.length === 0) return [];

  const result: number[] = [];
  const halfWindow = window / 2;

  for (let i = 0; i < frames.length; i++) {
    const currentT = frames[i].t;
    
    // Collect values within the centered window [t - halfWindow, t + halfWindow]
    const windowValues: number[] = [];
    for (let j = 0; j < frames.length; j++) {
      if (Math.abs(frames[j].t - currentT) <= halfWindow) {
        windowValues.push(frames[j].v);
      }
    }

    // Compute median
    windowValues.sort((a, b) => a - b);
    const mid = Math.floor(windowValues.length / 2);
    let median = 0;
    
    if (windowValues.length % 2 === 1) {
      median = windowValues[mid];
    } else {
      median = (windowValues[mid - 1] + windowValues[mid]) / 2;
    }

    // Binary output based on median
    result.push(median >= 0.5 ? 1 : 0);
  }

  return result;
}