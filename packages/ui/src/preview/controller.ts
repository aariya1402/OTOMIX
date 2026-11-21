import type { DspPort, AudioParamAutomation } from '@otomix/core';
import type { TransitionPlan } from '@otomix/core';

export interface PreviewSlice {
  readonly trackId: string;
  readonly startBeat: number;
  readonly endBeat: number;
}

export interface PreviewPlan {
  readonly plan: TransitionPlan;
  readonly fromTrackId: string;
  readonly toTrackId: string;
  readonly slices: readonly PreviewSlice[];
}

export interface PreviewControllerDeps {
  readonly dsp: DspPort;
}

export function createPreviewController(deps: PreviewControllerDeps) {
  const scheduled: PreviewPlan[] = [];

  function compile(plan: PreviewPlan): readonly AudioParamAutomation[] {
    const duration = plan.plan.windowBeats;
    return [
      { paramId: 'incoming.playbackRate', targetValue: 1, time: duration, curve: 'linear' },
      { paramId: 'outgoing.playbackRate', targetValue: 1, time: duration, curve: 'linear' },
    ];
  }

  return {
    play(plan: PreviewPlan): void {
      const automations = compile(plan);
      deps.dsp.start();
      deps.dsp.scheduleTransition(plan.plan, automations);
      deps.dsp.flush();
      scheduled.push(plan);
    },
    stop(): void {
      deps.dsp.stop();
    },
    getScheduled(): readonly PreviewPlan[] {
      return scheduled;
    },
  };
}
