// OTOMIX §3.9 — Transition constants.
// All values derived from AdminConfig; no hardcoded numbers.

import { getAnalysisConfig } from '../config/analysis';

export function getTransitionWindowBeats(): number {
  return getAnalysisConfig().transition.defaultWindowBars * 4;
}