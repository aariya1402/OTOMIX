// OTOMIX §3.9 · Mother §2.9
import { computeTransitionAnchors, TrackGridParams } from './anchors';
import { TransitionPlan, TransitionRung } from './types';
import { STATIC_GRID_BPM } from '../constants/grid';

export function planTransition(
  incoming: TrackGridParams,
  outgoing: TrackGridParams
): TransitionPlan {
  const anchors = computeTransitionAnchors(incoming, outgoing);
  const alignToSeconds = anchors.tOutSeconds;

  const isKickLess = incoming.hasKick === false;
  const rung: TransitionRung = isKickLess ? 'RUNG_STATIC_120_GRID' : 'RUNG_NONE';
  const mappedBpm = isKickLess ? STATIC_GRID_BPM : incoming.bpmSeed;
  const reason = isKickLess ? 'Incoming track has no kick; mapped to static 120 BPM grid' : '';

  return {
    rung,
    reason,
    tInSeconds: anchors.tInSeconds,
    tOutSeconds: anchors.tOutSeconds,
    inBeatIndex: anchors.inBeatIndex,
    outBeatIndex: anchors.outBeatIndex,
    alignToSeconds,
    mappedBpm,
  };
}