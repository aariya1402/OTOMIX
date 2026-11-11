// OTOMIX §3.9 · Mother §2.9
import { tOfI } from '../grid/t-of-i';
import { BeatIndex } from '../types/beat-index';
import { TRANSITION_WINDOW_BEATS } from '../constants/grid';

export interface TransitionAnchors {
  /** Absolute time (seconds) of incoming track's Beat 1 */
  tInSeconds: number;
  /** Absolute time (seconds) of outgoing track's final 16-beat block start */
  tOutSeconds: number;
  /** Beat index of incoming anchor (always 1) */
  inBeatIndex: number;
  /** Beat index of outgoing anchor (totalBeats - 63) */
  outBeatIndex: number;
}

export interface TrackGridParams {
  T0: number;
  bpmSeed: number;
  duration: number;
  preKickBeats?: number;
  /** If false, incoming track is kick-less; escalate to STATIC_120_GRID. */
  hasKick?: boolean;
}

export function computeTransitionAnchors(
  incoming: TrackGridParams,
  outgoing: TrackGridParams
): TransitionAnchors {
  const inBeatIndex = 1;
  const tInSeconds = incoming.T0;

  const beatPeriodOut = 60 / outgoing.bpmSeed;
  const totalBeatsOut = Math.floor(outgoing.duration / beatPeriodOut);

  if (totalBeatsOut < TRANSITION_WINDOW_BEATS) {
    return {
      tInSeconds,
      tOutSeconds: outgoing.T0,
      inBeatIndex,
      outBeatIndex: 1,
    };
  }

  const outBeatIndex = totalBeatsOut - TRANSITION_WINDOW_BEATS + 1;
  const beatIndexResult = BeatIndex.parse(outBeatIndex);
  if (!beatIndexResult.ok) {
    throw new Error(`Invalid outgoing beat index: ${outBeatIndex}`);
  }

  const tOutSeconds = tOfI(beatIndexResult.value, outgoing.T0, outgoing.bpmSeed, 0);

  return { tInSeconds, tOutSeconds, inBeatIndex, outBeatIndex };
}