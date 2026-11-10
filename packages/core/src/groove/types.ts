// OTOMIX §3.5 · Mother §2.5

export type GrooveMode = 'Straight' | 'Triplet' | 'Swing' | 'Irregular';

export interface GrooveInput {
  /** Deviation from ideal 16th-note grid position for each of 16 positions (beats). */
  deviations: number[];
}

export interface GrooveResult {
  mode: GrooveMode;
  /** For Swing mode: measured displacement in beats (SWING_MIN..SWING_MAX) */
  swingDisplacement?: number;
  confidence: number;
}