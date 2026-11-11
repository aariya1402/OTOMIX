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
  rung: TransitionRung;
  reason: string;
  tInSeconds: number;
  tOutSeconds: number;
  inBeatIndex: number;
  outBeatIndex: number;
  alignToSeconds: number;
  /** BPM to use for scheduling the incoming track's grid. */
  mappedBpm: number;
  windowBeats: number;
  /** For RUNG_SILENT_LOOP: beats of silence padding needed (render-time). */
  paddingBeats?: number;
}