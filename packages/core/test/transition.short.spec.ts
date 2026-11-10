// OTOMIX §3.9 · Mother §2.9
import { describe, it, expect } from 'vitest';
import { planTransition } from '../src/transition/planner';
import { TRANSITION_WINDOW_BEATS } from '../src/constants/grid';

const BPM_120 = 120;
const BEAT_PERIOD = 60 / BPM_120; // 0.5s
const VALID_INCOMING = { T0: 10, bpmSeed: 100, duration: 200, hasKick: true };

describe('planTransition — RUNG_SILENT_LOOP (P03-T06-S01-M05)', () => {
  it('6-beat outgoing track → RUNG_SILENT_LOOP with padding=58', () => {
    const outgoing = { T0: 0, bpmSeed: BPM_120, duration: 6 * BEAT_PERIOD };
    const plan = planTransition(VALID_INCOMING, outgoing);
    expect(plan.rung).toBe('RUNG_SILENT_LOOP');
    expect(plan.paddingBeats).toBe(TRANSITION_WINDOW_BEATS - 6);
    expect(plan.paddingBeats).toBe(58);
    expect(plan.outBeatIndex).toBe(1);
    expect(plan.alignToSeconds).toBe(outgoing.T0);
    expect(plan.reason).toContain('silence');
  });

  it('1-beat outgoing track → RUNG_SILENT_LOOP', () => {
    const outgoing = { T0: 0, bpmSeed: BPM_120, duration: 1 * BEAT_PERIOD };
    const plan = planTransition(VALID_INCOMING, outgoing);
    expect(plan.rung).toBe('RUNG_SILENT_LOOP');
    expect(plan.paddingBeats).toBe(63);
  });

  it('8-beat outgoing track → RUNG_SILENT_LOOP', () => {
    const outgoing = { T0: 0, bpmSeed: BPM_120, duration: 8 * BEAT_PERIOD };
    const plan = planTransition(VALID_INCOMING, outgoing);
    expect(plan.rung).toBe('RUNG_SILENT_LOOP');
    expect(plan.paddingBeats).toBe(56);
  });

  it('63-beat outgoing track (just under) → RUNG_SILENT_LOOP', () => {
    const outgoing = { T0: 0, bpmSeed: BPM_120, duration: 63 * BEAT_PERIOD };
    const plan = planTransition(VALID_INCOMING, outgoing);
    expect(plan.rung).toBe('RUNG_SILENT_LOOP');
    expect(plan.paddingBeats).toBe(1);
  });

  it('64-beat outgoing track (exactly boundary) → RUNG_NONE', () => {
    const outgoing = { T0: 0, bpmSeed: BPM_120, duration: 64 * BEAT_PERIOD };
    const plan = planTransition(VALID_INCOMING, outgoing);
    expect(plan.rung).toBe('RUNG_NONE');
  });

  it('65-beat outgoing track (just over) → RUNG_NONE', () => {
    const outgoing = { T0: 0, bpmSeed: BPM_120, duration: 65 * BEAT_PERIOD };
    const plan = planTransition(VALID_INCOMING, outgoing);
    expect(plan.rung).toBe('RUNG_NONE');
  });

  it('short outgoing + kick-less incoming → RUNG_SILENT_LOOP (priority over STATIC_120_GRID)', () => {
    const outgoing = { T0: 0, bpmSeed: BPM_120, duration: 5 * BEAT_PERIOD };
    const incoming = { T0: 5, bpmSeed: 100, duration: 200, hasKick: false };
    const plan = planTransition(incoming, outgoing);
    expect(plan.rung).toBe('RUNG_SILENT_LOOP');
    expect(plan.rung).not.toBe('RUNG_STATIC_120_GRID');
  });

  it('short outgoing + negative T0 → RUNG_SILENT_LOOP (no throw)', () => {
    const outgoing = { T0: -2.5, bpmSeed: BPM_120, duration: 6 * BEAT_PERIOD };
    expect(() => planTransition(VALID_INCOMING, outgoing)).not.toThrow();
    const plan = planTransition(VALID_INCOMING, outgoing);
    expect(plan.rung).toBe('RUNG_SILENT_LOOP');
    expect(plan.tOutSeconds).toBe(-2.5);
  });

  it('REVIEW CHECKPOINT: plan contains only primitives (no audio buffers stored)', () => {
    const outgoing = { T0: 0, bpmSeed: BPM_120, duration: 6 * BEAT_PERIOD };
    const plan = planTransition(VALID_INCOMING, outgoing);
    for (const [, value] of Object.entries(plan)) {
      expect(typeof value === 'object').toBe(false);
      expect(Array.isArray(value)).toBe(false);
    }
  });
});