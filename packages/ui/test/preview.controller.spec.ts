import { describe, it, expect } from 'vitest';
import { MockDspDriver } from '@otomix/core';
import { createPreviewController } from '../src/preview/controller';

describe('P08-T06-S01-M01 preview controller', () => {
  it('records playback ramps and slices on the mock DSP', () => {
    const dsp = new MockDspDriver();
    const controller = createPreviewController({ dsp });
    const plan = {
      fromTrackId: 'a',
      toTrackId: 'b',
      plan: {
        rung: 'RUNG_NONE' as const,
        reason: '',
        tInSeconds: 1,
        tOutSeconds: 2,
        inBeatIndex: 1,
        outBeatIndex: 1,
        alignToSeconds: 2,
        mappedBpm: 120,
        windowBeats: 64,
      },
      slices: [{ trackId: 'a', startBeat: 0, endBeat: 32 }, { trackId: 'b', startBeat: 32, endBeat: 64 }],
    };

    controller.play(plan);
    expect(dsp.isStarted()).toBe(true);
    expect(dsp.getAutomationLog().length).toBe(2);
    expect(dsp.getAutomationLog().every((automation) => automation.time === 64)).toBe(true);
  });
});
