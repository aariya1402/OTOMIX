// OTOMIX §3.9 · Mother §2.9
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { planTransition } from '../src/transition/planner';
import { TRANSITION_WINDOW_BEATS } from '../src/constants/grid';

const BPM_120 = 120;

describe('planTransition — RUNG_NONE forced alignment (P03-T06-S01-M02)', () => {
  it('produces RUNG_NONE plan for ambient intro with no kick transients', () => {
    const incoming = { T0: 10.0, bpmSeed: BPM_120, duration: 300 };
    const outgoing = { T0: 0.25, bpmSeed: BPM_120, duration: 200 };

    const plan = planTransition(incoming, outgoing);

    expect(plan.rung).toBe('RUNG_NONE');
    expect(plan.reason).toBe('');
    expect(plan.inBeatIndex).toBe(1);
    expect(plan.outBeatIndex).toBe(385);
    expect(plan.tInSeconds).toBeCloseTo(10.0, 9);
    expect(plan.tOutSeconds).toBeCloseTo(192.25, 9);
    expect(plan.alignToSeconds).toBe(plan.tOutSeconds);
    expect(plan.alignToSeconds).not.toBe(plan.tInSeconds);
  });

  it('anchors lie on the grid (integer beat indices)', () => {
    const incoming = { T0: 5.0, bpmSeed: BPM_120, duration: 180 };
    const outgoing = { T0: 0.0, bpmSeed: BPM_120, duration: 100 };

    const plan = planTransition(incoming, outgoing);

    expect(Number.isInteger(plan.inBeatIndex)).toBe(true);
    expect(Number.isInteger(plan.outBeatIndex)).toBe(true);
    expect(plan.inBeatIndex).toBe(1);
    expect(plan.outBeatIndex).toBe(185);
  });

  it('produces a plan for any valid input (guaranteed, no exceptions)', () => {
    const testCases = [
      { incoming: { T0: 0, bpmSeed: 120, duration: 100 }, outgoing: { T0: 0, bpmSeed: 120, duration: 100 } },
      { incoming: { T0: 0, bpmSeed: 80, duration: 100 }, outgoing: { T0: 0, bpmSeed: 140, duration: 100 } },
      { incoming: { T0: -2.5, bpmSeed: 120, duration: 100 }, outgoing: { T0: 0, bpmSeed: 120, duration: 100 } },
      { incoming: { T0: 0, bpmSeed: 120, duration: 100 }, outgoing: { T0: 0, bpmSeed: 120, duration: 5 } },
    ];

    for (const { incoming, outgoing } of testCases) {
      expect(() => planTransition(incoming, outgoing)).not.toThrow();
      const plan = planTransition(incoming, outgoing);
      expect(plan.rung).toBe('RUNG_NONE');
    }
  });

  it('uses TRANSITION_WINDOW_BEATS (16), not derived from bars', () => {
    expect(TRANSITION_WINDOW_BEATS).toBe(16);
    const incoming = { T0: 0, bpmSeed: BPM_120, duration: 100 };
    const outgoing = { T0: 0, bpmSeed: BPM_120, duration: 100 };
    const plan = planTransition(incoming, outgoing);
    expect(plan.outBeatIndex).toBe(185);
  });

  it('REVIEW CHECKPOINT: no kick-check predicate in transition/', () => {
    const dir = path.resolve(__dirname, '../src/transition');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));
    const forbidden = [
      'hasSixteenKickBeats',
      'hasKickBeats',
      'checkKick',
      'detectKick',
      'kickPresent',
      'hasTransients',
      'transientCheck',
    ];

    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      for (const pattern of forbidden) {
        expect(content).not.toMatch(new RegExp(pattern, 'i'));
      }
    }
  });
});