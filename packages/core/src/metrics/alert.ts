// OTOMIX §8.1 · Extraction Duration Alert (P05-T04-S01-M02)
//
// Rule 26: Beat-Index Absolute. No milliseconds in musical logic.
// The alert threshold is derived dynamically from the Phase 1 tOfI formula.

import { getAnalysisConfig } from '../config/analysis';
import { tOfI } from '../grid/t-of-i';
import type { BeatIndex } from '../types/beat-index';
import type { BPM } from '../types/bpm';

export function isExtractionDurationCritical(durationMs: number, bpm: BPM): boolean {
  const cfg = getAnalysisConfig();
  
  // Derive the beat period using the Phase 1 tOfI formula
  const beatPeriod = tOfI(2 as BeatIndex, 0, bpm, 0) - tOfI(1 as BeatIndex, 0, bpm, 0);
  
  const thresholdBeats = (cfg.timeouts.extractionAlertMs / 1000) / beatPeriod;
  const durationBeats = (durationMs / 1000) / beatPeriod;
  
  return durationBeats > thresholdBeats;
}