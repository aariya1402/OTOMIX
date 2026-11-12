// OTOMIX §3.9 · Mother §2.9
import { computeTransitionAnchors, TrackGridParams } from './anchors';
import { TransitionPlan, TransitionRung } from './types';
import { STATIC_GRID_BPM, TRANSITION_WINDOW_BEATS } from '../constants/grid';

function isOutgoingShort(outgoing: TrackGridParams): boolean {
  const beatPeriod = 60 / outgoing.bpmSeed;
  const totalBeatsOut = Math.floor(outgoing.duration / beatPeriod);
  return totalBeatsOut < TRANSITION_WINDOW_BEATS;
}

function planSilentLoop(
  incoming: TrackGridParams,
  outgoing: TrackGridParams
): TransitionPlan {
  const beatPeriod = 60 / outgoing.bpmSeed;
  const totalBeatsOut = Math.floor(outgoing.duration / beatPeriod);
  const paddingBeats = TRANSITION_WINDOW_BEATS - totalBeatsOut;

  return {
    rung: 'RUNG_SILENT_LOOP',
    reason: `Outgoing track has ${totalBeatsOut} beats (< ${TRANSITION_WINDOW_BEATS}); padded with ${paddingBeats} beats of silence`,
    tInSeconds: incoming.T0,
    tOutSeconds: outgoing.T0,
    inBeatIndex: 1,
    outBeatIndex: 1,
    alignToSeconds: outgoing.T0,
    mappedBpm: incoming.bpmSeed,
    windowBeats: TRANSITION_WINDOW_BEATS,
    paddingBeats,
  };
}

/**
 * Ultimate safety net: 4-bar volume crossfade independent of grid locks.
 *
 * This rung is evaluated LAST in the fallback chain (after RUNG_NONE,
 * RUNG_STATIC_120_GRID, and RUNG_SILENT_LOOP). It MUST NEVER throw and
 * MUST ALWAYS return a valid plan for ANY input, including NaN BPM,
 * negative T0, zero/negative duration, etc.
 */
export function planSafetyNetCrossfade(
  _incoming: TrackGridParams,
  _outgoing: TrackGridParams
): TransitionPlan {
  return {
    rung: 'RUNG_FOUR_BAR_CROSSFADE',
    reason: 'Safety net: grid-independent 4-bar crossfade',
    tInSeconds: 0,
    tOutSeconds: 0,
    inBeatIndex: 1,
    outBeatIndex: 1,
    alignToSeconds: 0,
    mappedBpm: STATIC_GRID_BPM,
    windowBeats: TRANSITION_WINDOW_BEATS,
  };
}

export function planTransition(
  incoming: TrackGridParams,
  outgoing: TrackGridParams
): TransitionPlan {
  let plan: TransitionPlan;
  try {
    if (isOutgoingShort(outgoing)) {
      plan = planSilentLoop(incoming, outgoing);
    } else {
      const anchors = computeTransitionAnchors(incoming, outgoing);
      const alignToSeconds = anchors.tOutSeconds;
      const isKickLess = incoming.hasKick === false;
      const rung: TransitionRung = isKickLess ? 'RUNG_STATIC_120_GRID' : 'RUNG_NONE';
      const mappedBpm = isKickLess ? STATIC_GRID_BPM : incoming.bpmSeed;
      const reason = isKickLess ? 'Incoming track has no kick; mapped to static 120 BPM grid' : '';
      plan = {
        rung,
        reason,
        tInSeconds: anchors.tInSeconds,
        tOutSeconds: anchors.tOutSeconds,
        inBeatIndex: anchors.inBeatIndex,
        outBeatIndex: anchors.outBeatIndex,
        alignToSeconds,
        mappedBpm,
        windowBeats: TRANSITION_WINDOW_BEATS,
      };
    }
  } catch {
    return planSafetyNetCrossfade(incoming, outgoing);
  }

  // Final safety check: if plan fields are unusable, fall back to safety net
  if (!Number.isFinite(plan.alignToSeconds) || !Number.isFinite(plan.mappedBpm)) {
    return planSafetyNetCrossfade(incoming, outgoing);
  }

  return plan;
}