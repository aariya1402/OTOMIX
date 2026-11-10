// OTOMIX §3.9 · Mother §2.9
import { describe, it, expect } from 'vitest';
import { planTransition } from '../src/transition/planner';
import { STATIC_GRID_BPM } from '../src/constants/grid';

describe('planTransition — RUNG_STATIC_120_GRID (P03-T06-S01-M03)', () => {
  it('escalates to RUNG_STATIC_120_GRID when incoming.hasKick === false', () => {
    const incoming = { T0: 1.0, bpmSeed: 100, duration: 200, hasKick: false };
    const outgoing = { T0: 0.25, bpmSeed: 120, duration: 200 };

    const plan = planTransition(incoming, outgoing);

    expect(plan.rung).toBe('RUNG_STATIC_120_GRID');
    expect(plan.mappedBpm).toBe(STATIC_GRID_BPM);
    expect(plan.mappedBpm).toBe(120);
    expect(plan.reason).toContain('static 120 BPM');
  });

  it('maps incoming grid to 120 BPM regardless of incoming.bpmSeed', () => {
    const incoming = { T0: 5.0, bpmSeed: 80, duration: 180, hasKick: false };
    const outgoing = { T0: 0.0, bpmSeed: 140, duration: 100 };

    const plan = planTransition(incoming, outgoing);

    expect(plan.mappedBpm).toBe(120);
    expect(plan.mappedBpm).not.toBe(incoming.bpmSeed);
  });

  it('preserves RUNG_NONE when incoming.hasKick is undefined (backward compatible)', () => {
    const incoming = { T0: 10.0, bpmSeed: 120, duration: 300 };
    const outgoing = { T0: 0.25, bpmSeed: 120, duration: 200 };

    const plan = planTransition(incoming, outgoing);

    expect(plan.rung).toBe('RUNG_NONE');
    expect(plan.mappedBpm).toBe(incoming.bpmSeed);
  });

  it('preserves RUNG_NONE when incoming.hasKick === true', () => {
    const incoming = { T0: 10.0, bpmSeed: 120, duration: 300, hasKick: true };
    const outgoing = { T0: 0.25, bpmSeed: 120, duration: 200 };

    const plan = planTransition(incoming, outgoing);

    expect(plan.rung).toBe('RUNG_NONE');
    expect(plan.mappedBpm).toBe(incoming.bpmSeed);
  });

  it('tInSeconds and alignToSeconds are unchanged by rung selection', () => {
    const incoming = { T0: 2.5, bpmSeed: 90, duration: 200, hasKick: false };
    const outgoing = { T0: 0.5, bpmSeed: 120, duration: 200 };

    const plan = planTransition(incoming, outgoing);

    expect(plan.tInSeconds).toBe(2.5);
    expect(plan.alignToSeconds).toBe(plan.tOutSeconds);
  });

  it('REVIEW CHECKPOINT: STATIC_GRID_BPM is 120', () => {
    expect(STATIC_GRID_BPM).toBe(120);
  });
});