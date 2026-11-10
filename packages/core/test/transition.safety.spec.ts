// OTOMIX §3.9 · Mother §2.9
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { planSafetyNetCrossfade } from '../src/transition/planner';
import { STATIC_GRID_BPM, SAFETY_XFADE_BARS, BEATS_PER_BAR, SAFETY_XFADE_BEATS } from '../src/constants/grid';

describe('planSafetyNetCrossfade — RUNG_FOUR_BAR_CROSSFADE (P03-T06-S01-M04)', () => {
  const validOutgoing = { T0: 0, bpmSeed: 120, duration: 100 };

  it('handles NaN bpmSeed without throwing', () => {
    const incoming = { T0: 0, bpmSeed: NaN, duration: 100 };
    expect(() => planSafetyNetCrossfade(incoming, validOutgoing)).not.toThrow();
    const plan = planSafetyNetCrossfade(incoming, validOutgoing);
    expect(plan.rung).toBe('RUNG_FOUR_BAR_CROSSFADE');
  });

  it('handles negative T0 without throwing', () => {
    const incoming = { T0: -5, bpmSeed: 120, duration: 100 };
    expect(() => planSafetyNetCrossfade(incoming, validOutgoing)).not.toThrow();
    const plan = planSafetyNetCrossfade(incoming, validOutgoing);
    expect(plan.rung).toBe('RUNG_FOUR_BAR_CROSSFADE');
  });

  it('returns exactly 4-bar crossfade (16 beats = 8 seconds at 120 BPM)', () => {
    expect(SAFETY_XFADE_BARS).toBe(4);
    expect(BEATS_PER_BAR).toBe(4);
    expect(SAFETY_XFADE_BEATS).toBe(16);
    const beatPeriod = 60 / STATIC_GRID_BPM;
    const expectedDuration = SAFETY_XFADE_BEATS * beatPeriod;
    expect(expectedDuration).toBe(8);

    const plan = planSafetyNetCrossfade({ T0: 0, bpmSeed: NaN, duration: 100 }, validOutgoing);
    expect(plan.rung).toBe('RUNG_FOUR_BAR_CROSSFADE');
    expect(plan.mappedBpm).toBe(STATIC_GRID_BPM);
    expect(plan.mappedBpm).toBe(120);
  });

  it('returns valid TransitionPlan structure with all required fields', () => {
    const incoming = { T0: -10, bpmSeed: NaN, duration: 50 };
    const plan = planSafetyNetCrossfade(incoming, validOutgoing);

    expect(plan.rung).toBe('RUNG_FOUR_BAR_CROSSFADE');
    expect(typeof plan.reason).toBe('string');
    expect(plan.reason.length).toBeGreaterThan(0);
    expect(typeof plan.tInSeconds).toBe('number');
    expect(typeof plan.tOutSeconds).toBe('number');
    expect(typeof plan.inBeatIndex).toBe('number');
    expect(typeof plan.outBeatIndex).toBe('number');
    expect(typeof plan.alignToSeconds).toBe('number');
    expect(typeof plan.mappedBpm).toBe('number');
    expect(Number.isFinite(plan.mappedBpm)).toBe(true);
  });

  it('ignores all input variations — always returns same structural plan', () => {
    const testCases = [
      { T0: 0, bpmSeed: NaN, duration: 100 },
      { T0: -5, bpmSeed: 120, duration: 100 },
      { T0: 100, bpmSeed: Infinity, duration: -10 },
      { T0: 0, bpmSeed: 0, duration: 0 },
      { T0: 0, bpmSeed: -120, duration: 100 },
    ];
    for (const incoming of testCases) {
      const plan = planSafetyNetCrossfade(incoming, validOutgoing);
      expect(plan.rung).toBe('RUNG_FOUR_BAR_CROSSFADE');
      expect(plan.mappedBpm).toBe(120);
      expect(plan.tInSeconds).toBe(0);
      expect(plan.tOutSeconds).toBe(0);
      expect(plan.alignToSeconds).toBe(0);
      expect(plan.inBeatIndex).toBe(1);
      expect(plan.outBeatIndex).toBe(1);
    }
  });

  it('REVIEW CHECKPOINT: planner.ts documents that this rung is evaluated last', () => {
    const plannerPath = path.resolve(__dirname, '../src/transition/planner.ts');
    const content = fs.readFileSync(plannerPath, 'utf-8');
    expect(content).toMatch(/evaluated last|final fallback|last resort|ultimate safety net/i);
  });
});