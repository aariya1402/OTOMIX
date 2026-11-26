import {
  computeSliceBoundaries,
  generateGlideAutomation,
  type GlideRampAutomation,
  type DspPort,
  type TransitionPlan,
  type ChopGridDenominator,
} from '@otomix/core';
import type {
  PreviewObserverBridge,
  PreviewObserverState,
  PreviewObserverTarget,
} from './observer-bridge.js';

export interface PreviewTrack {
  readonly id: string;
  readonly bpm: number;
}

export interface CompiledPreviewTransition {
  readonly fromTrackId: string;
  readonly toTrackId: string;
  readonly plan: TransitionPlan;
}

export interface CompiledPreviewPlan {
  readonly tracks: readonly PreviewTrack[];
  readonly transitions: readonly CompiledPreviewTransition[];
  readonly chopGrid: ChopGridDenominator;
}

export interface PreviewSliceEvent {
  readonly trackId: string;
  readonly transitionIndex: number;
  readonly startBeat: number;
  readonly endBeat: number;
}

export interface PreviewChopEngine {
  scheduleSlices(
    trackId: string,
    transitionIndex: number,
    startBeat: number,
    endBeat: number,
    chopGrid: ChopGridDenominator
  ): readonly PreviewSliceEvent[];
}

export interface PreviewDspPort
  extends Pick<DspPort, 'start' | 'stop' | 'scheduleTransition' | 'flush'>, PreviewObserverTarget {
  scheduleSlices(slices: readonly PreviewSliceEvent[]): void;
}

export interface PreviewController {
  play(plan: CompiledPreviewPlan): readonly PreviewSliceEvent[];
  stop(): void;
  reportFrameTime(frameTimeMs: number): void;
  getObserverState(): PreviewObserverState | null;
  subscribeObserver(listener: (state: PreviewObserverState) => void): () => void;
}

function createSliceEvents(
  trackId: string,
  transitionIndex: number,
  startBeat: number,
  endBeat: number,
  chopGrid: ChopGridDenominator
): readonly PreviewSliceEvent[] {
  const capacity = Math.ceil((endBeat - startBeat) * chopGrid) + 2;
  const boundaries = new Float32Array(capacity);
  const count = computeSliceBoundaries(startBeat, endBeat, chopGrid, boundaries);
  const events: PreviewSliceEvent[] = [];

  for (let i = 0; i < count - 1; i++) {
    events.push({
      trackId,
      transitionIndex,
      startBeat: boundaries[i]!,
      endBeat: boundaries[i + 1]!,
    });
  }
  return events;
}

const coreChopEngine: PreviewChopEngine = {
  scheduleSlices: createSliceEvents,
};

function assertPlanIsUsable(plan: CompiledPreviewPlan): void {
  if (plan.chopGrid !== 8 && plan.chopGrid !== 16 && plan.chopGrid !== 32) {
    throw new RangeError('chopGrid must be 8, 16, or 32');
  }

  const tracks = new Map<string, PreviewTrack>();
  for (const track of plan.tracks) {
    if (!track.id || !Number.isFinite(track.bpm) || track.bpm <= 0 || tracks.has(track.id)) {
      throw new TypeError('preview tracks must have unique ids and positive finite BPM');
    }
    tracks.set(track.id, track);
  }

  for (const transition of plan.transitions) {
    const outgoing = tracks.get(transition.fromTrackId);
    const incoming = tracks.get(transition.toTrackId);
    const { plan: transitionPlan } = transition;
    if (
      !outgoing ||
      !incoming ||
      !Number.isFinite(transitionPlan.windowBeats) ||
      transitionPlan.windowBeats <= 0 ||
      !Number.isFinite(transitionPlan.mappedBpm) ||
      transitionPlan.mappedBpm <= 0 ||
      !Number.isFinite(transitionPlan.tInSeconds) ||
      !Number.isFinite(transitionPlan.tOutSeconds) ||
      !Number.isFinite(transitionPlan.outBeatIndex) ||
      !Number.isFinite(transitionPlan.inBeatIndex) ||
      transitionPlan.outBeatIndex < 0 ||
      transitionPlan.inBeatIndex < 0
    ) {
      throw new TypeError('preview transition references valid tracks and timing');
    }
  }
}

function asPortAutomations(
  ramp: GlideRampAutomation,
  paramId: string,
  startBeat: number,
  endBeat: number
) {
  return [
    { paramId, targetValue: ramp.startValue, time: startBeat, curve: 'step' as const },
    { paramId, targetValue: ramp.target, time: endBeat, curve: 'linear' as const },
  ];
}

export function createPreviewController(
  dsp: PreviewDspPort,
  chopEngine: PreviewChopEngine = coreChopEngine,
  observerBridge?: PreviewObserverBridge
): PreviewController {
  return {
    play(compiledPlan) {
      assertPlanIsUsable(compiledPlan);
      const tracks = new Map(compiledPlan.tracks.map((track) => [track.id, track]));
      const allSlices: PreviewSliceEvent[] = [];

      for (let i = 0; i < compiledPlan.transitions.length; i++) {
        const transition = compiledPlan.transitions[i]!;
        const transitionPlan = transition.plan;
        const outgoing = tracks.get(transition.fromTrackId)!;
        const incoming = tracks.get(transition.toTrackId)!;
        const startOut = transitionPlan.outBeatIndex;
        const startIn = transitionPlan.inBeatIndex;
        const endOut = startOut + transitionPlan.windowBeats;
        const endIn = startIn + transitionPlan.windowBeats;
        const windowSeconds = (transitionPlan.windowBeats * 60) / transitionPlan.mappedBpm;
        const outRamp = generateGlideAutomation(
          transitionPlan.tOutSeconds,
          windowSeconds,
          1,
          transitionPlan.mappedBpm / outgoing.bpm,
          1,
          transitionPlan.mappedBpm / incoming.bpm
        ).outTrack[0]!;
        const inRamp = generateGlideAutomation(
          transitionPlan.tInSeconds,
          windowSeconds,
          1,
          transitionPlan.mappedBpm / outgoing.bpm,
          1,
          transitionPlan.mappedBpm / incoming.bpm
        ).inTrack[0]!;
        const outStartBeat =
          startOut +
          ((outRamp.startTime - transitionPlan.tOutSeconds) * transitionPlan.mappedBpm) / 60;
        const outEndBeat =
          startOut +
          ((outRamp.endTime - transitionPlan.tOutSeconds) * transitionPlan.mappedBpm) / 60;
        const inStartBeat =
          startIn +
          ((inRamp.startTime - transitionPlan.tInSeconds) * transitionPlan.mappedBpm) / 60;
        const inEndBeat =
          startIn + ((inRamp.endTime - transitionPlan.tInSeconds) * transitionPlan.mappedBpm) / 60;

        const automations = [
          ...asPortAutomations(
            outRamp,
            `${transition.fromTrackId}.playbackRate`,
            outStartBeat,
            outEndBeat
          ),
          ...asPortAutomations(
            inRamp,
            `${transition.toTrackId}.playbackRate`,
            inStartBeat,
            inEndBeat
          ),
        ];
        const slices = [
          ...chopEngine.scheduleSlices(
            transition.fromTrackId,
            i,
            startOut,
            endOut,
            compiledPlan.chopGrid
          ),
          ...chopEngine.scheduleSlices(
            transition.toTrackId,
            i,
            startIn,
            endIn,
            compiledPlan.chopGrid
          ),
        ];

        dsp.scheduleSlices(slices);
        dsp.scheduleTransition(transitionPlan, automations);
        allSlices.push(...slices);
      }

      dsp.flush();
      dsp.start();
      return allSlices;
    },
    stop() {
      dsp.stop();
    },
    reportFrameTime(frameTimeMs) {
      observerBridge?.reportFrameTime(frameTimeMs);
    },
    getObserverState() {
      return observerBridge?.getState() ?? null;
    },
    subscribeObserver(listener) {
      return observerBridge?.subscribe(listener) ?? (() => undefined);
    },
  };
}
