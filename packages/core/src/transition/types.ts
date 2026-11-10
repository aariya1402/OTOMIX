// OTOMIX §3.9 · Mother §2.9
// Mirrors otodsp.core.v1.ExecutionFallback.Rung

export type TransitionRung =
  | 'RUNG_NONE'
  | 'RUNG_GLOBAL_AVG_BPM'
  | 'RUNG_STATIC_120_GRID'
  | 'RUNG_FOUR_BAR_CROSSFADE'
  | 'RUNG_SILENT_LOOP'
  | 'RUNG_STANDARD_CROSSFADE'
  | 'RUNG_WSOLA_LEGACY';

export interface TransitionPlan {
  /** RUNG_NONE is the default/primary path. */
  rung: TransitionRung;
  /** Human-readable reason if a fallback rung was used. Empty for RUNG_NONE. */
  reason: string;
  /** Incoming track anchor: absolute time of its Beat 1 (seconds). */
  tInSeconds: number;
  /** Outgoing track anchor: absolute time of its final 16-beat block start (seconds). */
  tOutSeconds: number;
  /** Beat index of incoming anchor (always 1). */
  inBeatIndex: number;
  /** Beat index of outgoing anchor (totalBeats - 15). */
  outBeatIndex: number;
  /** Absolute timeline position where incoming Beat 1 should be scheduled. */
  alignToSeconds: number;
}