// OTOMIX §3.9 · Mother §2.9
import { computeTransitionAnchors, TrackGridParams } from './anchors';
import { TransitionPlan } from './types';

/**
 * Universal Transition Guarantee Planner — RUNG_NONE (default/primary path).
 *
 * Force-aligns the incoming track's Beat 1 to the outgoing track's final
 * 16-beat block start, WITHOUT checking for kick transients. This guarantees
 * a valid plan always exists, even for ambient/kick-less intros.
 *
 * @param incoming - Incoming track grid parameters
 * @param outgoing - Outgoing track grid parameters
 * @returns TransitionPlan with RUNG_NONE and force-aligned anchors
 */
export function planTransition(
  incoming: TrackGridParams,
  outgoing: TrackGridParams
): TransitionPlan {
  const anchors = computeTransitionAnchors(incoming, outgoing);
  const alignToSeconds = anchors.tOutSeconds;

  return {
    rung: 'RUNG_NONE',
    reason: '',
    tInSeconds: anchors.tInSeconds,
    tOutSeconds: anchors.tOutSeconds,
    inBeatIndex: anchors.inBeatIndex,
    outBeatIndex: anchors.outBeatIndex,
    alignToSeconds,
  };
}