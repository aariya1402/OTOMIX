// OTOMIX §3.9 · Mother §2.9
import { describe, it, expect } from 'vitest';
import { computeTransitionAnchors } from '../src/transition/anchors';
import { TRANSITION_WINDOW_BEATS } from '../src/constants/grid';
import { BPM } from '../src/types/bpm';

const BPM_120 = 120;
const BPM_120_TYPED = BPM.parse(BPM_120).value;

describe('computeTransitionAnchors (P03-T06-S01-M01)', () => {
  it('outgoing 200s @ 120 BPM anchors at beat 337 (400 - 63)', () => {
    const incoming = { T0: 1.0, bpmSeed: BPM_120, duration: 180, preKickBeats: -3 };
    const outgoing = { T0: 0.25, bpmSeed: BPM_120, duration: 200 };
    const anchors = computeTransitionAnchors(incoming, outgoing);

    expect(anchors.inBeatIndex).toBe(1);
    expect(anchors.outBeatIndex).toBe(337);
    expect(anchors.tInSeconds).toBeCloseTo(1.0, 9);
    // tOfI(385, 0.25, 120, 0) = 0.25 + 384 * 0.5 = 192.25
    expect(anchors.tOutSeconds).toBeCloseTo(168.25, 9);
  });

  it('incoming with negative pre-kick still anchors at Beat 1', () => {
    const incoming = { T0: 5.0, bpmSeed: BPM_120, duration: 180, preKickBeats: -3 };
    const outgoing = { T0: 0.0, bpmSeed: BPM_120, duration: 100 };
    const anchors = computeTransitionAnchors(incoming, outgoing);
    expect(anchors.tInSeconds).toBe(5.0);
    expect(anchors.inBeatIndex).toBe(1);
  });

  it('uses TRANSITION_WINDOW_BEATS constant (16), derived from 16 bars × 4 beats/bar', () => {
    expect(TRANSITION_WINDOW_BEATS).toBe(64);
    const incoming = { T0: 0, bpmSeed: BPM_120, duration: 100 };
    const outgoing = { T0: 0, bpmSeed: BPM_120, duration: 100 };
    const anchors = computeTransitionAnchors(incoming, outgoing);
    // totalBeats = 200, outBeatIndex = 200 - 64 + 1 = 137
    expect(anchors.outBeatIndex).toBe(137);
  });

  it('short outgoing track (< 64 beats) falls back to Beat 1', () => {
    const incoming = { T0: 0, bpmSeed: BPM_120, duration: 100 };
    const outgoing = { T0: 0, bpmSeed: BPM_120, duration: 5 }; // 10 beats only
    const anchors = computeTransitionAnchors(incoming, outgoing);
    expect(anchors.outBeatIndex).toBe(1);
    expect(anchors.tOutSeconds).toBe(0);
  });
});