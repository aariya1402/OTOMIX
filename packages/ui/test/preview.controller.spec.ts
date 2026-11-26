import { describe, expect, it } from 'vitest';
import { MockDspDriver, type TransitionPlan } from '@otomix/core';
import {
  createPreviewController,
  type CompiledPreviewPlan,
  type PreviewDspPort,
  type PreviewSliceEvent,
} from '../src/preview/controller';

class MockPreviewDriver extends MockDspDriver implements PreviewDspPort {
  public readonly scheduledSlices: PreviewSliceEvent[] = [];
  public bufferSize = 2048;

  scheduleSlices(slices: readonly PreviewSliceEvent[]): void {
    this.scheduledSlices.push(...slices);
  }

  setBufferSize(bufferSize: number): void {
    this.bufferSize = bufferSize;
  }
}

const transitionPlan: TransitionPlan = {
  rung: 'RUNG_NONE',
  reason: '',
  tInSeconds: 4,
  tOutSeconds: 20,
  inBeatIndex: 8,
  outBeatIndex: 40,
  alignToSeconds: 20,
  mappedBpm: 120,
  windowBeats: 8,
};

const compiledPlan: CompiledPreviewPlan = {
  tracks: [
    { id: 'outgoing', bpm: 100 },
    { id: 'incoming', bpm: 120 },
  ],
  transitions: [
    {
      fromTrackId: 'outgoing',
      toTrackId: 'incoming',
      plan: transitionPlan,
    },
  ],
  chopGrid: 16,
};

describe('preview controller', () => {
  it('schedules both playback-rate ramps and chop-grid slices through injected ports', () => {
    const driver = new MockPreviewDriver();
    const controller = createPreviewController(driver);

    const slices = controller.play(compiledPlan);

    expect(driver.isStarted()).toBe(true);
    expect(driver.getScheduledTransitions()).toHaveLength(1);
    const automations = driver.getAutomationLog();
    const rampTargets = automations.filter(
      ({ paramId, curve }) => paramId.endsWith('.playbackRate') && curve === 'linear'
    );
    expect(rampTargets).toHaveLength(2);
    expect(rampTargets.map(({ paramId }) => paramId)).toEqual([
      'outgoing.playbackRate',
      'incoming.playbackRate',
    ]);
    expect(rampTargets[0]!.targetValue).toBeCloseTo(1.2);
    expect(rampTargets[1]!.targetValue).toBeCloseTo(1);
    for (const ramp of rampTargets) {
      const start = automations.find(
        (command) => command.paramId === ramp.paramId && command.curve === 'step'
      );
      expect(start).toBeDefined();
      expect(ramp.time - start!.time).toBe(transitionPlan.windowBeats);
    }

    expect(slices.length).toBeGreaterThan(0);
    expect(driver.scheduledSlices).toEqual(slices);
    expect(new Set(slices.map(({ trackId }) => trackId))).toEqual(
      new Set(['outgoing', 'incoming'])
    );
    for (const slice of slices) {
      expect(slice.endBeat - slice.startBeat).toBeCloseTo(1 / compiledPlan.chopGrid);
      expect(slice.startBeat * compiledPlan.chopGrid).toBeCloseTo(
        Math.round(slice.startBeat * compiledPlan.chopGrid)
      );
      expect(slice.endBeat * compiledPlan.chopGrid).toBeCloseTo(
        Math.round(slice.endBeat * compiledPlan.chopGrid)
      );
    }
  });

  it('rejects invalid compiled plans before starting the DSP port', () => {
    const driver = new MockPreviewDriver();
    const controller = createPreviewController(driver);
    const invalidPlan: CompiledPreviewPlan = {
      ...compiledPlan,
      transitions: [
        {
          ...compiledPlan.transitions[0]!,
          toTrackId: 'missing-track',
        },
      ],
    };

    expect(() => controller.play(invalidPlan)).toThrow(TypeError);
    expect(driver.isStarted()).toBe(false);
    expect(driver.getScheduledTransitions()).toHaveLength(0);
  });

  it('stops the preview through the injected DSP port', () => {
    const driver = new MockPreviewDriver();
    const controller = createPreviewController(driver);

    controller.play(compiledPlan);
    controller.stop();

    expect(driver.isStarted()).toBe(false);
  });
});
