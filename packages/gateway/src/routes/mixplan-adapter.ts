import {
  computeTransitionAnchors,
  planTransition,
  type TrackGridParams,
  type TransitionRung,
} from '@otomix/core';
import type { FeatureRow } from '../repository/features-repository.js';
import {
  MixPlanTrackNotFoundError,
  type MixPlanRequest,
  type MixPlanResponse,
} from './mixplan.js';

export interface TrackDurationRow {
  track_id: string;
  duration_ms: number;
}

export interface TrackRepository {
  findByTrackId(
    tenantId: string,
    trackId: string
  ): Promise<TrackDurationRow | null>;
}

export interface FeaturesRepositoryAdapter {
  findAll(tenantId: string): Promise<FeatureRow[]>;
}

export interface MixPlanAdapterDeps {
  featuresRepo: FeaturesRepositoryAdapter;
  trackRepo: TrackRepository;
}

const RUNG_TO_NUMBER: Record<TransitionRung, number> = {
  RUNG_NONE: 0,
  RUNG_SILENT_LOOP: 1,
  RUNG_STATIC_120_GRID: 2,
  RUNG_FOUR_BAR_CROSSFADE: 3,
  RUNG_GLOBAL_AVG_BPM: -1,
  RUNG_STANDARD_CROSSFADE: -1,
  RUNG_WSOLA_LEGACY: -1,
};

function readT0(registryJson: object): { t0: number; missing: boolean } {
  if (!registryJson || Object.keys(registryJson).length === 0) {
    return { t0: 0, missing: true };
  }
  const root = registryJson as Record<string, unknown>;
  const grid = root.grid;
  if (!grid || typeof grid !== 'object') return { t0: 0, missing: true };
  const t0 = (grid as Record<string, unknown>).t0_seconds;
  if (typeof t0 !== 'number' || !Number.isFinite(t0)) {
    return { t0: 0, missing: true };
  }
  return { t0, missing: false };
}

export function createMixPlanAdapter(deps: MixPlanAdapterDeps) {
  return async (request: MixPlanRequest): Promise<MixPlanResponse> => {
    const features = await deps.featuresRepo.findAll(request.tenant_id);
    const outgoingFeature = features.find(
      (row) => row.track_id === request.outgoing_track_id
    );
    const incomingFeature = features.find(
      (row) => row.track_id === request.incoming_track_id
    );
    if (!outgoingFeature || !incomingFeature) {
      throw new MixPlanTrackNotFoundError();
    }

    const outgoingTrack = await deps.trackRepo.findByTrackId(
      request.tenant_id,
      request.outgoing_track_id
    );
    const incomingTrack = await deps.trackRepo.findByTrackId(
      request.tenant_id,
      request.incoming_track_id
    );
    if (!outgoingTrack || !incomingTrack) {
      throw new MixPlanTrackNotFoundError();
    }

    const outgoingT0 = readT0(outgoingFeature.registry_json);
    const incomingT0 = readT0(incomingFeature.registry_json);
    const missingT0 = outgoingT0.missing || incomingT0.missing;

    const incoming: TrackGridParams = {
      T0: incomingT0.t0,
      bpmSeed: incomingFeature.bpm,
      duration: incomingTrack.duration_ms / 1000,
    };
    const outgoing: TrackGridParams = {
      T0: outgoingT0.t0,
      bpmSeed: outgoingFeature.bpm,
      duration: outgoingTrack.duration_ms / 1000,
    };

    const plan = planTransition(incoming, outgoing);
    const transAnchors = computeTransitionAnchors(incoming, outgoing);
    const knownRung = Object.prototype.hasOwnProperty.call(RUNG_TO_NUMBER, plan.rung);
    const rung = knownRung ? RUNG_TO_NUMBER[plan.rung as TransitionRung] : -1;

    let fallbackReason: string | undefined;
    if (missingT0) {
      fallbackReason = 'missing_t0';
    } else if (incoming.hasKick === undefined) {
      fallbackReason = 'kick_status_unknown';
    } else if (rung === -1) {
      fallbackReason = 'unknown_rung';
    } else if (plan.reason) {
      fallbackReason = plan.reason;
    }

    const response: MixPlanResponse = {
      anchors: [
        {
          beat_index: transAnchors.outBeatIndex,
          t0_seconds: transAnchors.tOutSeconds,
          drift_seconds: 0,
        },
        {
          beat_index: transAnchors.inBeatIndex,
          t0_seconds: transAnchors.tInSeconds,
          drift_seconds: 0,
        },
      ],
    };
    if (fallbackReason) {
      return { ...response, fallback: { rung, reason: fallbackReason } };
    }
    return response;
  };
}
