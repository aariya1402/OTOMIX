// OTOMIX §4.9 · Owner decision D5 (2026-11-12)
//
// Pairwise transition score between two tracks. NOT a gate.
// The only hard gate is Camelot (camelot-gate.ts).
//
// Inputs (all in [0,1], caller-supplied):
//   mixabilityA, mixabilityB  → averaged
//   camelotKeyA, camelotKeyB  → derived to proximity (this module computes it)
//   tempo_delta_score         → e.g. 1 - |bpmA-bpmB| / maxDelta
//   energy_smoothness         → e.g. 1 - |energyA-energyB|
//   structural_match          → outro(A) vs intro(B) match score
//   window_cleanliness_A/B    → per-track transition window cleanliness
//   grid_type_match           → 1 if same grid type, 0 if different, 0.5 if unknown
//
// Returns {score: 0} when keys are invalid or Camelot-incompatible (defensive).
// Rule 25: never throws.
// Rule 26: dimensionless score.
// D9: weights from AnalysisConfig; no hardcoded tunables.

import { getAnalysisConfig } from '../config/analysis';
import { CamelotKey } from '../types/camelot';
import { isCamelotCompatible } from './camelot-gate';

export interface CompatibilityInput {
  readonly mixabilityA?: number;
  readonly mixabilityB?: number;
  readonly camelotKeyA?: string;
  readonly camelotKeyB?: string;
  readonly tempo_delta_score?: number;
  readonly energy_smoothness?: number;
  readonly structural_match?: number;
  readonly window_cleanliness_A?: number;
  readonly window_cleanliness_B?: number;
  readonly grid_type_match?: number;
}

export interface CompatibilityResult {
  readonly score: number;
}

function clamp01(v: number | undefined): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

// Proximity for already-compatible pairs (caller gated via isCamelotCompatible).
// 1.0 same, 0.8 adjacent same mode, 0.7 relative major/minor.
function camelotProximity(aStr: string, bStr: string): number {
  if (aStr === bStr) return 1.0;
  const aNum = parseInt(aStr, 10);
  const bNum = parseInt(bStr, 10);
  const aMode = aStr[aStr.length - 1];
  const bMode = bStr[bStr.length - 1];
  if (aNum === bNum && aMode !== bMode) return 0.7;
  const diff = Math.abs(aNum - bNum);
  if ((diff === 1 || diff === 11) && aMode === bMode) return 0.8;
  return 0;
}

export function computeCompatibilityScore(input: CompatibilityInput): CompatibilityResult {
  const w = getAnalysisConfig().compatibility.weights;

  // Defensive: invalid or missing keys → 0
  if (!input.camelotKeyA || !input.camelotKeyB) return { score: 0 };
  const pa = CamelotKey.parse(input.camelotKeyA);
  const pb = CamelotKey.parse(input.camelotKeyB);
  if (!pa.ok || !pb.ok) return { score: 0 };

  // Defensive: gate incompatibility → 0
  if (!isCamelotCompatible(pa.value, pb.value)) return { score: 0 };

  const mixabilityAvg = (clamp01(input.mixabilityA) + clamp01(input.mixabilityB)) / 2;
  const proximity = camelotProximity(pa.value, pb.value);
  const tempoDelta = clamp01(input.tempo_delta_score);
  const energySmooth = clamp01(input.energy_smoothness);
  const structural = clamp01(input.structural_match);
  const windowClean = (clamp01(input.window_cleanliness_A) + clamp01(input.window_cleanliness_B)) / 2;
  const gridMatch = clamp01(input.grid_type_match);

  const score =
    w.mixability         * mixabilityAvg +
    w.camelot_proximity  * proximity +
    w.tempo_delta_score  * tempoDelta +
    w.energy_smoothness  * energySmooth +
    w.structural_match   * structural +
    w.window_cleanliness * windowClean +
    w.grid_type_match    * gridMatch;

  return { score: clamp01(score) };
}