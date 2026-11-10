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
  /** Beat index of outgoing anchor (totalBeats - 15) */
  outBeatIndex: number;
}

export interface TrackGridParams {
  T0: number;
  bpmSeed: number;
  duration: number;
  /** Optional pre-kick count (ignored for anchor computation; pre-kick is before Beat 1) */
  preKickBeats?: number;
}

/**
 * Computes the transition anchors for a pair of tracks:
 * - Incoming: anchored at Beat 1 (its initial downbeat)
 * - Outgoing: anchored at the first beat of its final 16-beat block
 *
 * @param incoming - Incoming track grid params
 * @param outgoing - Outgoing track grid params
 * @returns TransitionAnchors with absolute seconds and beat indices
 */
export function computeTransitionAnchors(
  incoming: TrackGridParams,
  outgoing: TrackGridParams
): TransitionAnchors {
  // Incoming: always Beat 1
  const inBeatIndex = 1;
  const tInSeconds = incoming.T0;

  // Outgoing: final 16-beat block
  const beatPeriodOut = 60 / outgoing.bpmSeed;
  const totalBeatsOut = Math.floor(outgoing.duration / beatPeriodOut);

  // Short track fallback (M05 will handle properly)
  if (totalBeatsOut < TRANSITION_WINDOW_BEATS) {
    return {
      tInSeconds,
      tOutSeconds: outgoing.T0,
      inBeatIndex,
      outBeatIndex: 1,
    };
  }

  const outBeatIndex = totalBeatsOut - TRANSITION_WINDOW_BEATS + 1; // -15 for 16 beats
  const beatIndexResult = BeatIndex.parse(outBeatIndex);
  if (!beatIndexResult.ok) {
    throw new Error(`Invalid outgoing beat index: ${outBeatIndex}`);
  }

  const tOutSeconds = tOfI(beatIndexResult.value, outgoing.T0, outgoing.bpmSeed, 0);

  return { tInSeconds, tOutSeconds, inBeatIndex, outBeatIndex };
}