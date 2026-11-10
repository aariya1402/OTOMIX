// OTOMIX §3.1; §3.10 · Cross-Phase P02->P03
import { describe, it, expect, beforeEach } from 'vitest';
import { tOfI } from '../../../packages/core/src/grid/t-of-i';
import { BeatIndex } from '../../../packages/core/src/types/beat-index';
import { BPM } from '../../../packages/core/src/types/bpm';

interface GridAnchor {
  beat_index: number;
  t0_seconds: number;
  drift_seconds: number;
}

class DualGridCombinerStub {
  private accepted: GridAnchor[] = [];
  private rejected: GridAnchor[] = [];

  feed(anchor: GridAnchor): boolean {
    if (anchor.beat_index === 0) {
      this.rejected.push(anchor);
      return false;
    }
    if (
      Number.isInteger(anchor.beat_index) &&
      typeof anchor.t0_seconds === 'number' &&
      typeof anchor.drift_seconds === 'number' &&
      Number.isFinite(anchor.t0_seconds) &&
      Number.isFinite(anchor.drift_seconds)
    ) {
      this.accepted.push(anchor);
      return true;
    }
    this.rejected.push(anchor);
    return false;
  }

  getAccepted(): ReadonlyArray<GridAnchor> { return this.accepted; }
  getRejected(): ReadonlyArray<GridAnchor> { return this.rejected; }
  reset(): void { this.accepted = []; this.rejected = []; }
}

describe('X-P02-P03: Dual-Grid Combiner Boundary (P02->P03)', () => {
  const combiner = new DualGridCombinerStub();
  const bpmSeed = BPM.parse(120)!;
  const T0 = 0.25;
  const delta = 0;

  beforeEach(() => {
    combiner.reset();
  });

  it('accepts beat_index = -3 (pre-kick)', () => {
    const i = BeatIndex.parse(-3)!;
    const anchor: GridAnchor = {
      beat_index: i.value,
      t0_seconds: tOfI(i.value, T0, bpmSeed.value, delta),
      drift_seconds: delta,
    };
    expect(combiner.feed(anchor)).toBe(true);
  });

  it('accepts beat_index = -1 (pre-kick)', () => {
    const i = BeatIndex.parse(-1)!;
    const anchor: GridAnchor = {
      beat_index: i.value,
      t0_seconds: tOfI(i.value, T0, bpmSeed.value, delta),
      drift_seconds: delta,
    };
    expect(combiner.feed(anchor)).toBe(true);
  });

  it('accepts beat_index = 1 (reference downbeat)', () => {
    const i = BeatIndex.parse(1)!;
    const anchor: GridAnchor = {
      beat_index: i.value,
      t0_seconds: tOfI(i.value, T0, bpmSeed.value, delta),
      drift_seconds: delta,
    };
    expect(combiner.feed(anchor)).toBe(true);
  });

  it('accepts beat_index = 17 (first downbeat of bar 5)', () => {
    const i = BeatIndex.parse(17)!;
    const anchor: GridAnchor = {
      beat_index: i.value,
      t0_seconds: tOfI(i.value, T0, bpmSeed.value, delta),
      drift_seconds: delta,
    };
    expect(combiner.feed(anchor)).toBe(true);
  });

  it('rejects beat_index = 0 (invalid per 3.10)', () => {
    const anchor: GridAnchor = {
      beat_index: 0,
      t0_seconds: T0,
      drift_seconds: delta,
    };
    expect(combiner.feed(anchor)).toBe(false);
  });

  it('summary: 4 accepted, 1 rejected', () => {
    const indices = [-3, -1, 1, 17, 0];
    for (const idx of indices) {
      const anchor: GridAnchor = {
        beat_index: idx,
        t0_seconds: idx !== 0 ? tOfI(idx, T0, bpmSeed.value, delta) : T0,
        drift_seconds: delta,
      };
      combiner.feed(anchor);
    }
    expect(combiner.getAccepted()).toHaveLength(4);
    expect(combiner.getRejected()).toHaveLength(1);
    expect(combiner.getRejected()[0].beat_index).toBe(0);
  });
});