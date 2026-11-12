// OTOMIX §3.9 — Realignment strategy resolution.
// Stub for P05 build unblock; uses AdminConfig-derived defaults.
// TODO(P11): replace with real grid-realignment logic.

import { getAnalysisConfig } from '../config/analysis';

export interface RealignmentStrategyResult {
  windowBars: number;
  windowBeats: number;
}

export function resolveRealignmentStrategy(
  windowBarsOverride?: number,
  _deltaQuanta?: number,
): RealignmentStrategyResult {
  const cfg = getAnalysisConfig();
  const windowBars = windowBarsOverride ?? cfg.transition.defaultWindowBars;
  return { windowBars, windowBeats: windowBars * 4 };
}